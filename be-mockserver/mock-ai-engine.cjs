const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { buildSchema } = require("graphql");

const SCHEMA_PATH =
  process.env.SCHEMA_PATH || path.join(__dirname, "..", "schema.graphql");
const schemaLoader = require("./schema-loader.cjs");

// --------------- LLM Provider Configuration (runtime-mutable) ---------------
const llmConfig = {
  provider: (process.env.LLM_PROVIDER || "none").toLowerCase(),
  apiKey: process.env.LLM_API_KEY || "",
  model: process.env.LLM_MODEL || "",
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
};

const PROVIDER_CATALOG = {
  none: { label: "Heuristic (no LLM)", model: "", baseUrl: "", needsKey: false },
  gemini: { label: "Google Gemini", model: "gemini-2.0-flash", baseUrl: "https://generativelanguage.googleapis.com", needsKey: true, models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro"] },
  groq: { label: "Groq", model: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com", needsKey: true, models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-4-scout-17b-16e-instruct"] },
  mistral: { label: "Mistral AI", model: "mistral-small-latest", baseUrl: "https://api.mistral.ai", needsKey: true, models: ["mistral-small-latest", "mistral-medium-latest", "open-mistral-nemo"] },
  ollama: { label: "Ollama (local)", model: "llama3", baseUrl: "", needsKey: false, models: ["llama3", "mistral", "qwen2", "codellama"] },
};

function getLlmModel() {
  return llmConfig.model || (PROVIDER_CATALOG[llmConfig.provider] || {}).model || "";
}

function isLlmEnabled() {
  if (llmConfig.provider === "none" || !llmConfig.provider) return false;
  if (llmConfig.provider === "ollama") return true;
  return !!llmConfig.apiKey;
}

function setLlmConfig(updates) {
  if (updates.provider !== undefined) llmConfig.provider = updates.provider.toLowerCase();
  if (updates.apiKey !== undefined) llmConfig.apiKey = updates.apiKey;
  if (updates.model !== undefined) llmConfig.model = updates.model;
  if (updates.ollamaUrl !== undefined) llmConfig.ollamaUrl = updates.ollamaUrl;
  return getLlmStatus();
}

// --------------- HTTP helpers for LLM calls ---------------

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// --------------- LLM API call per provider ---------------

async function callLlm(systemPrompt, userPrompt) {
  if (!isLlmEnabled()) return null;

  try {
    switch (llmConfig.provider) {
      case "gemini":
        return await callGemini(systemPrompt, userPrompt);
      case "groq":
        return await callOpenAICompatible(
          `${PROVIDER_CATALOG.groq.baseUrl}/openai/v1/chat/completions`,
          getLlmModel(), systemPrompt, userPrompt, { Authorization: `Bearer ${llmConfig.apiKey}` }
        );
      case "mistral":
        return await callOpenAICompatible(
          `${PROVIDER_CATALOG.mistral.baseUrl}/v1/chat/completions`,
          getLlmModel(), systemPrompt, userPrompt, { Authorization: `Bearer ${llmConfig.apiKey}` }
        );
      case "ollama":
        return await callOpenAICompatible(
          `${llmConfig.ollamaUrl}/v1/chat/completions`,
          getLlmModel(), systemPrompt, userPrompt, {}
        );
      default:
        return null;
    }
  } catch (err) {
    console.error(`[LLM ${llmConfig.provider}] Error:`, err.message || err);
    return null;
  }
}

async function callGemini(systemPrompt, userPrompt) {
  const model = getLlmModel();
  const url = `${PROVIDER_CATALOG.gemini.baseUrl}/v1beta/models/${model}:generateContent?key=${llmConfig.apiKey}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  };
  const resp = await httpRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, payload);

  if (resp.status !== 200) {
    console.error("[Gemini] Non-200:", resp.status, JSON.stringify(resp.body).slice(0, 200));
    return null;
  }
  const text = resp.body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function callOpenAICompatible(url, model, systemPrompt, userPrompt, headers) {
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };
  const resp = await httpRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
  }, payload);

  if (resp.status !== 200) {
    console.error(`[LLM] Non-200 from ${url}:`, resp.status, JSON.stringify(resp.body).slice(0, 200));
    return null;
  }
  const text = resp.body?.choices?.[0]?.message?.content;
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// --------------- LLM prompt builders ---------------

function buildSchemaContext(operationName) {
  const schema = getSchemaForOp(operationName);
  if (!schema) return "";
  const opInfo = getOperationField(schema, operationName);
  if (!opInfo) return "";
  const { name, field, kind } = opInfo;
  const { typeName } = unwrapType(field.type);

  const lines = [`${kind} ${name}`];
  const args = field.args || [];
  if (args.length > 0) {
    lines.push("Arguments:");
    for (const a of args) lines.push(`  ${a.name}: ${a.type}`);
  }
  lines.push(`Returns: ${field.type}`);

  const typeObj = schema.getType(typeName);
  if (typeObj && typeof typeObj.getFields === "function") {
    lines.push(`\nType ${typeName} fields:`);
    const fields = typeObj.getFields();
    for (const [fn, fv] of Object.entries(fields)) {
      lines.push(`  ${fn}: ${fv.type}`);
    }
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT_GENERATE = `You are a mock data generator for GraphQL APIs. Given a GraphQL operation and scenario type, produce realistic mock JSON data.
Rules:
- Return ONLY valid JSON with a "data" key (and optionally "errors" for error scenarios).
- Use realistic, non-sensitive dummy values (no real PII).
- For "empty" scenarios, return null or empty arrays as appropriate.
- For error scenarios, include a proper GraphQL errors array.
- Keep responses concise but complete.`;

const SYSTEM_PROMPT_CHAT = `You are an AI assistant for a GraphQL mock server. Help users create mock scenarios.
Given a user's natural-language request and a GraphQL operation schema, produce one or more mock scenarios.
Return JSON with this structure: { "scenarios": [ { "scenarioType": "...", "description": "...", "response": { "data": {...} } } ] }
Each scenario should have a scenarioType (success/empty/error/not-found/etc.), a short description, and a "response" containing the mock GraphQL response.
Use realistic dummy data. Never include real PII.`;

async function llmGenerate(operationName, scenarioType) {
  const ctx = buildSchemaContext(operationName);
  if (!ctx) return null;

  const userPrompt = `Generate a "${scenarioType}" mock response for this GraphQL operation:\n\n${ctx}\n\nReturn JSON with "data" key (and "errors" if applicable).`;
  const result = await callLlm(SYSTEM_PROMPT_GENERATE, userPrompt);
  if (!result || typeof result !== "object") return null;

  if (result.data !== undefined || result.errors !== undefined) return result;
  return null;
}

async function llmChat(message, operationName) {
  const ctx = operationName ? buildSchemaContext(operationName) : "";
  const userPrompt = ctx
    ? `Operation schema:\n${ctx}\n\nUser request: ${message}`
    : `User request: ${message}`;
  const result = await callLlm(SYSTEM_PROMPT_CHAT, userPrompt);
  if (!result) return null;
  return result;
}

function getLlmStatus() {
  const model = getLlmModel();
  return {
    provider: llmConfig.provider,
    enabled: isLlmEnabled(),
    model: model || null,
    hasKey: !!llmConfig.apiKey,
    catalog: Object.entries(PROVIDER_CATALOG).map(([id, p]) => ({
      id,
      label: p.label,
      needsKey: p.needsKey,
      models: p.models || [],
      defaultModel: p.model,
    })),
  };
}

let _schema = null;
function getSchema() {
  if (_schema) return _schema;
  try {
    _schema = buildSchema(fs.readFileSync(SCHEMA_PATH, "utf8"));
    return _schema;
  } catch {
    return null;
  }
}

function getSchemaForOp(operationName) {
  return schemaLoader.getSchemaForOperation(operationName) || getSchema();
}

const FIELD_NAME_HINTS = {
  email: () => "user@example.com",
  phone: () => "+1-555-0100",
  url: () => "https://example.com/resource",
  href: () => "https://example.com/page",
  logo: () => "https://example.com/logo.png",
  image: () => "https://example.com/image.jpg",
  avatar: () => "https://example.com/avatar.png",
  icon: () => "https://example.com/icon.svg",
  name: () => "Jane Doe",
  firstName: () => "Jane",
  lastName: () => "Doe",
  username: () => "janedoe42",
  title: () => "Sample Title",
  description: () => "A sample description for testing purposes.",
  summary: () => "Brief summary text.",
  slug: () => "sample-slug-001",
  permalink: () => "sample-permalink",
  date: () => "2026-03-15",
  createdAt: () => "2026-03-15T10:30:00Z",
  updatedAt: () => "2026-03-15T12:00:00Z",
  startDate: () => "2026-03-01",
  endDate: () => "2026-03-31",
  gameDate: () => "2026-03-15",
  timestamp: () => "2026-03-15T10:30:00Z",
  clock: () => "12:45",
  time: () => "14:30:00",
  score: () => "24",
  mainScore: () => "24",
  record: () => "10-5",
  season: () => 2026,
  year: () => 2026,
  count: () => 15,
  total: () => 100,
  age: () => 28,
  height: () => 180,
  weight: () => 75,
  width: () => 1920,
  price: () => 29.99,
  latitude: () => 40.7128,
  longitude: () => -74.006,
  timezone: () => -5,
  color: () => "#4f6ef7",
  abbrev: () => "SMP",
  shortName: () => "Sample",
  league: () => "NFL",
  sport: () => "Football",
  status: () => "Active",
  type: () => "DEFAULT",
  network: () => "ESPN",
  stadium: () => "Demo Arena",
  location: () => "New York, NY",
  city: () => "New York",
  state: () => "NY",
  country: () => "US",
  message: () => "Operation completed successfully.",
  label: () => "Label Text",
  value: () => "sample-value",
  key: () => "sample-key",
  token: () => "tok_sample_abc123",
  id: () => "id-" + Math.random().toString(36).slice(2, 10),
  uuid: () => "550e8400-e29b-41d4-a716-446655440000",
};

function smartValue(fieldName, typeName) {
  const lower = fieldName.toLowerCase();
  for (const [pattern, gen] of Object.entries(FIELD_NAME_HINTS)) {
    if (lower === pattern.toLowerCase() || lower.endsWith(pattern.toLowerCase())) {
      return gen();
    }
  }
  switch (typeName) {
    case "String": return `mock-${fieldName}`;
    case "Int": return 42;
    case "Float": return 3.14;
    case "Boolean": return true;
    case "ID": return `id-${fieldName}-001`;
    default: return `mock-${typeName}`;
  }
}

function boundaryValue(fieldName, typeName) {
  switch (typeName) {
    case "String": return ["", " ", "a".repeat(500), "<script>alert(1)</script>", "日本語テスト", "null", "undefined"];
    case "Int": return [0, -1, 2147483647, -2147483648, 1];
    case "Float": return [0.0, -0.001, 999999.999, Number.MIN_VALUE];
    case "Boolean": return [true, false];
    case "ID": return ["", "0", "nonexistent-id", "id-with-special-chars!@#"];
    default: return [null];
  }
}

const SCALARS = ["String", "Int", "Float", "Boolean", "ID"];

function unwrapType(gqlType) {
  let t = gqlType;
  let isList = false;
  let isNonNull = false;
  while (t) {
    const str = t.toString();
    if (str.endsWith("!")) isNonNull = true;
    if (str.startsWith("[")) isList = true;
    if (t.ofType) { t = t.ofType; } else break;
  }
  return { namedType: t, isList, isNonNull, typeName: t.toString().replace(/[[\]!]/g, "") };
}

function generateMockForType(schema, gqlType, depth, visited, mode) {
  if (depth <= 0) return null;
  const { namedType, isList, typeName } = unwrapType(gqlType);

  if (SCALARS.includes(typeName)) {
    const val = mode === "boundary"
      ? boundaryValue("field", typeName)[0]
      : smartValue("value", typeName);
    return isList ? [val] : val;
  }

  const typeObj = schema.getType(typeName);
  if (!typeObj) return isList ? [] : null;

  if (typeObj.getValues) {
    const vals = typeObj.getValues();
    const val = vals.length > 0 ? vals[0].value : typeName;
    return isList ? [val] : val;
  }

  if (typeof typeObj.getFields !== "function") return isList ? [] : null;

  if (visited.has(typeName)) return isList ? [] : null;
  visited.add(typeName);

  const obj = {};
  const fields = typeObj.getFields();
  for (const [fn, fv] of Object.entries(fields)) {
    const info = unwrapType(fv.type);
    if (SCALARS.includes(info.typeName)) {
      const v = mode === "boundary" ? boundaryValue(fn, info.typeName)[0] : smartValue(fn, info.typeName);
      obj[fn] = info.isList ? [v] : v;
    } else {
      obj[fn] = generateMockForType(schema, fv.type, depth - 1, new Set(visited), mode);
    }
  }

  return isList ? [obj] : obj;
}

function getOperationField(schema, operationName) {
  const lower = operationName.toLowerCase();
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  if (queryType) {
    const fields = queryType.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (name === operationName || name.toLowerCase() === lower) return { name, field, kind: "query" };
    }
  }
  if (mutationType) {
    const fields = mutationType.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (name === operationName || name.toLowerCase() === lower) return { name, field, kind: "mutation" };
    }
  }
  return null;
}

const ERROR_TEMPLATES = {
  "not-found": (op) => ({
    data: { [op]: null },
    errors: [{ message: `${op} not found`, extensions: { code: "NOT_FOUND" } }],
  }),
  unauthorized: (op) => ({
    data: null,
    errors: [{ message: "Authentication required", extensions: { code: "UNAUTHORIZED" } }],
  }),
  forbidden: (op) => ({
    data: null,
    errors: [{ message: "Insufficient permissions", extensions: { code: "FORBIDDEN" } }],
  }),
  "validation-error": (op) => ({
    data: null,
    errors: [{ message: "Invalid input: check required fields", extensions: { code: "VALIDATION_ERROR" } }],
  }),
  "internal-error": (op) => ({
    data: null,
    errors: [{ message: "Internal server error", extensions: { code: "INTERNAL_ERROR" } }],
    __httpStatus: 500,
  }),
  timeout: (op) => ({
    data: null,
    errors: [{ message: "Request timed out", extensions: { code: "TIMEOUT" } }],
    __delayMs: 5000,
  }),
  "rate-limited": (op) => ({
    data: null,
    errors: [{ message: "Rate limit exceeded. Try again later.", extensions: { code: "RATE_LIMITED" } }],
    __httpStatus: 429,
  }),
};

function buildTestQuery(name, field, kind, scenarioType, schemaOverride) {
  const args = field.args || [];
  const keyword = kind === "mutation" ? "mutation" : "query";
  const opName = name.charAt(0).toUpperCase() + name.slice(1);

  const varDefs = args.map((a) => `$${a.name}: ${a.type}`).join(", ");
  const varPass = args.map((a) => `${a.name}: $${a.name}`).join(", ");
  const opLine = varDefs ? `${keyword} ${opName}(${varDefs})` : `${keyword} ${opName}`;
  const callArgs = varPass ? `${name}(${varPass})` : name;

  const schema = schemaOverride || getSchemaForOp(name);
  const { typeName } = unwrapType(field.type);
  const typeObj = schema.getType(typeName);
  let fieldLines = "    __typename";
  if (typeObj && typeof typeObj.getFields === "function") {
    const fields = Object.entries(typeObj.getFields());
    const scalars = fields
      .filter(([, fv]) => SCALARS.includes(unwrapType(fv.type).typeName))
      .slice(0, 6);
    if (scalars.length > 0) fieldLines = scalars.map(([fn]) => `    ${fn}`).join("\n");
  }

  const query = `${opLine} {\n  ${callArgs} {\n${fieldLines}\n  }\n}`;

  const vars = {};
  for (const a of args) {
    const info = unwrapType(a.type);
    const base = info.typeName;
    switch (scenarioType) {
      case "boundary":
        if (base === "String" || base === "ID") vars[a.name] = "";
        else if (base === "Int") vars[a.name] = -1;
        else if (base === "Float") vars[a.name] = 0.0;
        else if (base === "Boolean") vars[a.name] = false;
        else vars[a.name] = null;
        break;
      case "not-found":
        if (base === "String" || base === "ID") vars[a.name] = "nonexistent-id-999";
        else vars[a.name] = smartValue(a.name, base);
        break;
      case "validation-error":
        vars[a.name] = null;
        break;
      default:
        vars[a.name] = smartValue(a.name, base);
        break;
    }
  }

  return { query, variables: vars };
}

async function generate(operationName, scenarioType, customField) {
  const schema = getSchemaForOp(operationName);
  if (!schema) return { error: "Schema not available" };
  const opInfo = getOperationField(schema, operationName);
  if (!opInfo) return { error: `Operation '${operationName}' not found in schema` };

  const { name, field, kind } = opInfo;
  const testCase = buildTestQuery(name, field, kind, scenarioType, schema);

  // Try LLM-enhanced generation for success/boundary/partial
  if (isLlmEnabled() && ["success", "boundary", "partial"].includes(scenarioType)) {
    const llmResult = await llmGenerate(name, scenarioType);
    if (llmResult) {
      const desc = scenarioType === "success"
        ? `[LLM] Happy-path test: call ${name} with valid args, expect full data`
        : scenarioType === "boundary"
          ? `[LLM] Boundary test: call ${name} with edge-case values`
          : `[LLM] Partial-failure test: ${name} returns data + errors`;
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: llmResult, description: desc, llmGenerated: true };
    }
  }

  switch (scenarioType) {
    case "success": {
      const data = generateMockForType(schema, field.type, 4, new Set(), "smart");
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: { data: { [name]: data } }, description: `Happy-path test: call ${name} with valid args, expect full data` };
    }
    case "empty": {
      const { isList } = unwrapType(field.type);
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: { data: { [name]: isList ? [] : null } }, description: `Empty-state test: call ${name}, expect ${isList ? "empty array" : "null"}` };
    }
    case "error":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES["not-found"](name), description: `Error test: call ${name}, expect NOT_FOUND error` };
    case "not-found":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES["not-found"](name), description: `Not-found test: call ${name} with non-existent ID, expect 404-style error` };
    case "unauthorized":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES.unauthorized(name), description: `Auth test: call ${name} without credentials, expect UNAUTHORIZED` };
    case "forbidden":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES.forbidden(name), description: `Permission test: call ${name} as low-privilege user, expect FORBIDDEN` };
    case "validation-error":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES["validation-error"](name), description: `Validation test: call ${name} with missing/invalid args, expect VALIDATION_ERROR` };
    case "internal-error":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES["internal-error"](name), description: `Server-error test: simulate 500 on ${name}` };
    case "timeout":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES.timeout(name), description: `Timeout test: ${name} delays 5s to simulate slow upstream` };
    case "rate-limited":
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: ERROR_TEMPLATES["rate-limited"](name), description: `Rate-limit test: call ${name}, expect 429` };
    case "boundary": {
      const data = generateMockForType(schema, field.type, 3, new Set(), "boundary");
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: { data: { [name]: data } }, description: `Boundary test: call ${name} with edge-case args (empty strings, -1, etc.), check for graceful handling` };
    }
    case "partial": {
      const data = generateMockForType(schema, field.type, 2, new Set(), "smart");
      return {
        testQuery: testCase.query, testVariables: testCase.variables,
        scenario: {
          data: { [name]: data },
          errors: [{ message: `Partial failure: some fields of ${name} could not be resolved`, extensions: { code: "PARTIAL_ERROR" } }],
        },
        description: `Partial-failure test: ${name} returns data + errors (GraphQL partial response)`,
      };
    }
    case "custom": {
      const fullData = generateMockForType(schema, field.type, 4, new Set(), "smart");
      if (customField && typeof fullData === "object" && fullData !== null) {
        const returnType = unwrapType(field.type);
        const typeObj = schema.getType(returnType.typeName);
        if (typeObj && typeof typeObj.getFields === "function") {
          const fieldDef = typeObj.getFields()[customField];
          if (fieldDef) {
            const info = unwrapType(fieldDef.type);
            fullData[customField] = info.isList ? [] : null;
          }
        }
      } else if (customField === undefined) {
        const returnType = unwrapType(field.type);
        const typeObj = schema.getType(returnType.typeName);
        if (typeObj && typeof typeObj.getFields === "function") {
          const allFields = Object.keys(typeObj.getFields());
          const scalarFields = allFields.slice(0, 2);
          for (const fn of allFields) {
            if (!scalarFields.includes(fn)) fullData[fn] = null;
          }
        }
      }
      const desc = customField
        ? `Custom test: ${name} with ${customField} set to ${Array.isArray(fullData?.[customField]) ? "empty array" : "null"}`
        : `Minimal fields test: ${name} with only first 2 fields populated`;
      return { testQuery: testCase.query, testVariables: testCase.variables, scenario: { data: { [name]: fullData } }, description: desc };
    }
    default:
      return { error: `Unknown scenario type: ${scenarioType}` };
  }
}

function suggest(operationName) {
  const schema = getSchemaForOp(operationName);
  if (!schema) return { error: "Schema not available" };
  const opInfo = getOperationField(schema, operationName);
  if (!opInfo) return { error: `Operation '${operationName}' not found in schema` };

  const { name, field } = opInfo;
  const suggestions = [];
  const { isList, isNonNull, typeName } = unwrapType(field.type);

  suggestions.push({ type: "success", label: "Success", description: `Standard success response with realistic data` });
  suggestions.push({ type: "empty", label: "Empty", description: isList ? "Empty array response" : "Null response" });
  suggestions.push({ type: "not-found", label: "Not Found", description: `${name} returns null with NOT_FOUND error` });
  suggestions.push({ type: "unauthorized", label: "Unauthorized", description: "Authentication required error" });
  suggestions.push({ type: "boundary", label: "Boundary Values", description: "Edge-case values: empty strings, max ints, special chars" });
  suggestions.push({ type: "partial", label: "Partial Failure", description: "Response with both data and errors" });

  const typeObj = schema.getType(typeName);
  if (typeObj && typeof typeObj.getFields === "function") {
    const fields = typeObj.getFields();
    for (const [fn, fv] of Object.entries(fields)) {
      const info = unwrapType(fv.type);
      if (info.isList) {
        suggestions.push({ type: "custom", label: `Empty ${fn}`, description: `Return empty array for '${fn}' field`, customField: fn });
      }
      if (!info.isNonNull && !SCALARS.includes(info.typeName)) {
        suggestions.push({ type: "custom", label: `Null ${fn}`, description: `Return null for optional '${fn}' field`, customField: fn });
      }
    }
    if (Object.keys(fields).length > 5) {
      suggestions.push({ type: "custom", label: "Minimal Fields", description: "Only first 2 scalar fields populated, rest null" });
    }
  }

  const args = field.args || [];
  for (const arg of args) {
    const info = unwrapType(arg.type);
    if (info.isNonNull) {
      suggestions.push({ type: "validation-error", label: `Missing ${arg.name}`, description: `Error when required arg '${arg.name}' is missing` });
    }
  }

  suggestions.push({ type: "timeout", label: "Timeout", description: "5 second delay simulating timeout" });
  suggestions.push({ type: "rate-limited", label: "Rate Limited", description: "429 rate limit error" });
  suggestions.push({ type: "internal-error", label: "Server Error", description: "500 internal server error" });

  return { operationName: name, suggestions };
}

const CHAT_PATTERNS = [
  { pattern: /\b(not\s*found|404|missing|doesn.?t?\s*exist)\b/i, type: "not-found" },
  { pattern: /\b(unauthori[sz]ed|auth|login|401|unauthenticated)\b/i, type: "unauthorized" },
  { pattern: /\b(forbidden|permission|403|denied|no\s*access)\b/i, type: "forbidden" },
  { pattern: /\b(timeout|slow|delay|hang|timed?\s*out)\b/i, type: "timeout" },
  { pattern: /\b(rate\s*limit|throttl|429|too\s*many)\b/i, type: "rate-limited" },
  { pattern: /\b(server\s*error|500|internal|crash|broke)\b/i, type: "internal-error" },
  { pattern: /\b(invalid|validation|bad\s*input|wrong\s*format)\b/i, type: "validation-error" },
  { pattern: /\b(empty|no\s*data|no\s*results|zero|nothing|blank)\b/i, type: "empty" },
  { pattern: /\b(partial|some\s*fail|mixed|half)\b/i, type: "partial" },
  { pattern: /\b(boundary|edge\s*case|extreme|limit|overflow|special\s*char)\b/i, type: "boundary" },
  { pattern: /\b(success|happy\s*path|normal|default|working)\b/i, type: "success" },
];

function extractOperationFromMessage(message, fallbackOp) {
  const allNames = [];
  const schemas = schemaLoader.loadAllSchemas();
  for (const { schema } of schemas) {
    const qt = schema.getQueryType();
    const mt = schema.getMutationType();
    if (qt) allNames.push(...Object.keys(qt.getFields()));
    if (mt) allNames.push(...Object.keys(mt.getFields()));
  }
  // fallback to main schema if no multi-schema loaded
  if (allNames.length === 0) {
    const schema = getSchema();
    if (schema) {
      const qt = schema.getQueryType();
      const mt = schema.getMutationType();
      if (qt) allNames.push(...Object.keys(qt.getFields()));
      if (mt) allNames.push(...Object.keys(mt.getFields()));
    }
  }

  const lower = message.toLowerCase();
  for (const n of allNames) {
    if (lower.includes(n.toLowerCase())) return n;
  }
  return fallbackOp;
}

async function chat(message, operationName) {
  const resolvedOp = operationName || extractOperationFromMessage(message, null);

  if (!resolvedOp) {
    return {
      reply: "I need an operation name to generate scenarios. Please select an operation in the sidebar or mention one in your message (e.g., 'generate error for getUser').",
      scenarios: [],
    };
  }

  // Try LLM-powered chat first
  if (isLlmEnabled()) {
    const llmResult = await llmChat(message, resolvedOp);
    if (llmResult && llmResult.scenarios && Array.isArray(llmResult.scenarios) && llmResult.scenarios.length > 0) {
      const schema = getSchemaForOp(resolvedOp);
      const opInfo = schema ? getOperationField(schema, resolvedOp) : null;
      const scenarios = llmResult.scenarios.map((s) => {
        const scenarioType = s.scenarioType || "success";
        let testQuery = null, testVariables = null;
        if (opInfo) {
          const tc = buildTestQuery(opInfo.name, opInfo.field, opInfo.kind, scenarioType);
          testQuery = tc.query;
          testVariables = tc.variables;
        }
        return {
          scenarioType,
          description: s.description || `[LLM] ${scenarioType} scenario`,
          scenario: s.response || s.scenario || {},
          testQuery,
          testVariables,
          llmGenerated: true,
        };
      });
      const names = scenarios.map((s) => s.scenarioType).join(", ");
      return {
        reply: `[LLM] Generated ${scenarios.length} scenario(s) for **${resolvedOp}**: ${names}. Click "Save" to add any of them to your mock server.`,
        scenarios,
        operationName: resolvedOp,
      };
    }
  }

  // Fallback: heuristic-based chat
  const matched = [];
  for (const { pattern, type } of CHAT_PATTERNS) {
    if (pattern.test(message)) matched.push(type);
  }

  if (matched.length === 0) {
    matched.push("success", "empty", "not-found");
  }

  const unique = [...new Set(matched)];
  const scenarios = [];
  for (const type of unique) {
    const result = await generate(resolvedOp, type);
    if (!result.error) {
      scenarios.push({ scenarioType: type, ...result });
    }
  }

  const names = unique.join(", ");
  const reply = scenarios.length > 0
    ? `Generated ${scenarios.length} scenario(s) for **${resolvedOp}**: ${names}. Click "Save" to add any of them to your mock server.`
    : `Could not generate scenarios for '${resolvedOp}'. Check the operation name exists in the schema.`;

  return { reply, scenarios, operationName: resolvedOp };
}

module.exports = { generate, suggest, chat, getLlmStatus, setLlmConfig };
