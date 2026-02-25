/**
 * Loki-inspired dynamic expectations engine — variable-aware.
 *
 * Multiple expectations can exist for the same operation, each matched
 * by the request variables. This mirrors real API behavior:
 *   slug: "game-001"         → success response
 *   slug: "nonexistent-999"  → not-found error
 *   slug: ""                 → validation error
 *
 * When no variables match, falls through to Microcks.
 *
 * Inspired by: https://engineering.grab.com/loki-dynamic-mock-server-http-tcp-testing
 */

// Each operation can have multiple expectations, each keyed by variable fingerprint.
// Structure: Map<"Service::operation", ExpectationEntry[]>
const expectationStore = new Map();

/**
 * Set a mock expectation for a specific combination of operation + variables.
 *
 * @param {Object} opts
 * @param {string} opts.serviceName
 * @param {string} opts.operationName
 * @param {Object} opts.response           - Response to serve
 * @param {Object} [opts.matchVariables]   - Variables that trigger this response (empty = catch-all)
 * @param {string} [opts.scenarioName]
 * @param {number} [opts.times]            - 0 = unlimited
 * @param {number} [opts.ttlMs]            - 0 = no expiry
 * @param {string} [opts.description]
 */
function setExpectation(opts) {
  const {
    serviceName,
    operationName,
    response,
    matchVariables = null,
    scenarioName = "custom",
    times = 0,
    ttlMs = 0,
    description = "",
  } = opts;

  const opKey = buildOpKey(serviceName, operationName);

  if (!expectationStore.has(opKey)) {
    expectationStore.set(opKey, []);
  }

  const entry = {
    serviceName,
    operationName,
    scenarioName,
    matchVariables,
    response,
    timesServed: 0,
    timesLimit: times,
    createdAt: Date.now(),
    ttlMs,
    description,
  };

  const entries = expectationStore.get(opKey);

  // Replace existing entry with same variable fingerprint, or append
  const fp = variableFingerprint(matchVariables);
  const existingIdx = entries.findIndex((e) => variableFingerprint(e.matchVariables) === fp);
  if (existingIdx >= 0) {
    entries[existingIdx] = entry;
  } else {
    entries.push(entry);
  }

  return {
    opKey,
    scenarioName,
    matchVariables: matchVariables || "catch-all",
    totalExpectations: entries.length,
  };
}

/**
 * Set a response sequence for an operation.
 * Each call with matching variables progresses to the next step.
 */
function setSequence(opts) {
  const { serviceName, operationName, sequence, matchVariables = null, description = "" } = opts;

  const expanded = [];
  for (const step of sequence) {
    const count = step.times || 1;
    for (let i = 0; i < count; i++) {
      expanded.push(step.response);
    }
  }

  const opKey = buildOpKey(serviceName, operationName);
  if (!expectationStore.has(opKey)) {
    expectationStore.set(opKey, []);
  }

  const entry = {
    serviceName,
    operationName,
    scenarioName: `sequence(${sequence.length} steps)`,
    matchVariables,
    responses: expanded,
    currentIndex: 0,
    isSequence: true,
    timesServed: 0,
    timesLimit: 0,
    createdAt: Date.now(),
    ttlMs: 0,
    description,
  };

  const entries = expectationStore.get(opKey);
  const fp = variableFingerprint(matchVariables);
  const existingIdx = entries.findIndex((e) => variableFingerprint(e.matchVariables) === fp);
  if (existingIdx >= 0) {
    entries[existingIdx] = entry;
  } else {
    entries.push(entry);
  }

  return {
    opKey,
    scenarioName: entry.scenarioName,
    matchVariables: matchVariables || "catch-all",
    responseCount: expanded.length,
  };
}

/**
 * Match a request against expectations.
 * Tries specific variable matches first, then catch-all, then returns null.
 */
function matchExpectation(serviceName, operationName, variables) {
  const opKey = buildOpKey(serviceName, operationName);
  const entries = expectationStore.get(opKey);
  if (!entries || entries.length === 0) return null;

  // Sort: specific matches before catch-alls
  const sorted = [...entries].sort((a, b) => {
    const aSpecific = a.matchVariables && Object.keys(a.matchVariables).length > 0;
    const bSpecific = b.matchVariables && Object.keys(b.matchVariables).length > 0;
    if (aSpecific && !bSpecific) return -1;
    if (!aSpecific && bSpecific) return 1;
    return 0;
  });

  for (const entry of sorted) {
    if (isExpired(entry)) {
      removeEntry(opKey, entry);
      continue;
    }

    if (variablesMatch(entry.matchVariables, variables)) {
      entry.timesServed++;

      if (entry.isSequence) {
        const resp = entry.responses[entry.currentIndex] || entry.responses[entry.responses.length - 1];
        if (entry.currentIndex < entry.responses.length - 1) {
          entry.currentIndex++;
        }
        return resp;
      }

      return entry.response;
    }
  }

  return null;
}

/**
 * Clear a specific expectation (by variables) or all for an operation.
 */
function clearExpectation(serviceName, operationName, matchVariables) {
  const opKey = buildOpKey(serviceName, operationName);
  if (!matchVariables) {
    expectationStore.delete(opKey);
    return true;
  }
  const entries = expectationStore.get(opKey);
  if (!entries) return false;
  const fp = variableFingerprint(matchVariables);
  const idx = entries.findIndex((e) => variableFingerprint(e.matchVariables) === fp);
  if (idx >= 0) {
    entries.splice(idx, 1);
    if (entries.length === 0) expectationStore.delete(opKey);
    return true;
  }
  return false;
}

function clearAll(serviceName) {
  if (!serviceName) {
    expectationStore.clear();
    return;
  }
  for (const [key] of expectationStore) {
    if (key.startsWith(`${serviceName}::`)) {
      expectationStore.delete(key);
    }
  }
}

function listExpectations(serviceName) {
  const result = [];
  for (const [opKey, entries] of expectationStore) {
    if (serviceName && !opKey.startsWith(`${serviceName}::`)) continue;

    for (const entry of entries) {
      if (isExpired(entry)) {
        removeEntry(opKey, entry);
        continue;
      }

      result.push({
        opKey,
        serviceName: entry.serviceName,
        operationName: entry.operationName,
        scenarioName: entry.scenarioName,
        matchVariables: entry.matchVariables || "catch-all",
        isSequence: !!entry.isSequence,
        timesServed: entry.timesServed,
        timesLimit: entry.timesLimit || "unlimited",
        ageMs: Date.now() - entry.createdAt,
        description: entry.description,
      });
    }
  }
  return result;
}

// ── Helpers ──

function buildOpKey(serviceName, operationName) {
  return `${serviceName}::${operationName}`;
}

/**
 * Check if request variables match an expectation's matchVariables.
 * null/empty matchVariables = catch-all (matches everything).
 * Otherwise, every key in matchVariables must match the request.
 */
function variablesMatch(matchVars, requestVars) {
  if (!matchVars || Object.keys(matchVars).length === 0) return true;
  if (!requestVars) return false;

  for (const [key, val] of Object.entries(matchVars)) {
    const reqVal = requestVars[key];
    if (typeof val === "object" && val !== null) {
      if (JSON.stringify(val) !== JSON.stringify(reqVal)) return false;
    } else {
      if (String(reqVal) !== String(val)) return false;
    }
  }
  return true;
}

function variableFingerprint(vars) {
  if (!vars || Object.keys(vars).length === 0) return "__catch_all__";
  return JSON.stringify(vars, Object.keys(vars).sort());
}

function isExpired(entry) {
  if (entry.ttlMs > 0 && Date.now() - entry.createdAt > entry.ttlMs) return true;
  if (entry.timesLimit > 0 && entry.timesServed >= entry.timesLimit) return true;
  return false;
}

function removeEntry(opKey, entry) {
  const entries = expectationStore.get(opKey);
  if (!entries) return;
  const idx = entries.indexOf(entry);
  if (idx >= 0) entries.splice(idx, 1);
  if (entries.length === 0) expectationStore.delete(opKey);
}

module.exports = {
  setExpectation,
  setSequence,
  matchExpectation,
  clearExpectation,
  clearAll,
  listExpectations,
};
