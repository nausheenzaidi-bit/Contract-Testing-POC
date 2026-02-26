const http = require("http");
const fs = require("fs");
const url = require("url");
const { parse, buildSchema } = require("graphql");

const path = require("path");

const schemaLoader = require("./schema-loader.cjs");

const PORT = process.env.PORT || 4010;
const SCENARIOS_PATH =
  process.env.MOCK_SCENARIOS_PATH ||
  path.join(__dirname, "custom-mock-scenarios.json");
const SCHEMA_PATH =
  process.env.SCHEMA_PATH ||
  path.join(__dirname, "..", "schema.graphql");
const DEFAULT_SCENARIO = process.env.MOCK_DEFAULT_SCENARIO || "success";
const REQUIRE_OPERATION_NAME =
  (process.env.MOCK_REQUIRE_OPERATION_NAME || "true").toLowerCase() === "true";

let cachedSchemaDocs = null;
let cachedSchema = null;

function getSchema() {
  if (cachedSchema) return cachedSchema;
  try {
    const sdl = fs.readFileSync(SCHEMA_PATH, "utf8");
    cachedSchema = buildSchema(sdl);
    return cachedSchema;
  } catch {
    return null;
  }
}

function getSchemaForOp(operationName) {
  return schemaLoader.getSchemaForOperation(operationName) || getSchema();
}

function formatGqlType(type) {
  if (type.kind === "NonNullType") return formatGqlType(type.type) + "!";
  if (type.kind === "ListType") return "[" + formatGqlType(type.type) + "]";
  return type.name?.value || "Unknown";
}

function unwrapType(gqlType) {
  let t = gqlType;
  let isList = false;
  while (t) {
    if (typeof t.ofType === "object" && t.ofType !== null) {
      const str = t.toString();
      if (str.startsWith("[")) isList = true;
      t = t.ofType;
    } else break;
  }
  return { namedType: t, isList };
}

function mockScalarValue(typeName, fieldName) {
  switch (typeName) {
    case "String": return `mock-${fieldName}`;
    case "Int": return 42;
    case "Float": return 3.14;
    case "Boolean": return true;
    case "ID": return `id-${fieldName}-001`;
    default: return `mock-${typeName}`;
  }
}

function autoMockType(schema, gqlType, depth, visited) {
  if (depth <= 0) return null;
  const { namedType, isList } = unwrapType(gqlType);
  const typeName = namedType.toString().replace(/[[\]!]/g, "");

  const scalars = ["String", "Int", "Float", "Boolean", "ID"];
  if (scalars.includes(typeName)) {
    const val = mockScalarValue(typeName, "value");
    return isList ? [val] : val;
  }

  const typeObj = schema.getType(typeName);
  if (!typeObj) return isList ? [] : null;

  if (typeObj.getValues) {
    const vals = typeObj.getValues();
    const val = vals.length > 0 ? vals[0].value : typeName;
    return isList ? [val] : val;
  }

  if (typeof typeObj.getFields !== "function") {
    return isList ? [] : null;
  }

  const visitKey = typeName;
  if (visited.has(visitKey)) return isList ? [] : null;
  visited.add(visitKey);

  const obj = {};
  const fields = typeObj.getFields();
  const entries = Object.entries(fields);
  const limit = Math.min(entries.length, 12);
  for (let i = 0; i < limit; i++) {
    const [fn, fv] = entries[i];
    const { namedType: ft, isList: ftList } = unwrapType(fv.type);
    const ftName = ft.toString().replace(/[[\]!]/g, "");
    if (scalars.includes(ftName)) {
      const v = mockScalarValue(ftName, fn);
      obj[fn] = ftList ? [v] : v;
    } else {
      const nested = autoMockType(schema, fv.type, depth - 1, new Set(visited));
      obj[fn] = nested;
    }
  }
  if (entries.length > limit) {
    for (let i = limit; i < entries.length; i++) {
      const [fn, fv] = entries[i];
      const { namedType: ft, isList: ftList } = unwrapType(fv.type);
      const ftName = ft.toString().replace(/[[\]!]/g, "");
      if (scalars.includes(ftName)) {
        const v = mockScalarValue(ftName, fn);
        obj[fn] = ftList ? [v] : v;
      } else {
        obj[fn] = ftList ? [] : null;
      }
    }
  }

  return isList ? [obj] : obj;
}

function autoGenerateResponse(queryFieldName) {
  const schema = getSchema();
  if (!schema) return null;

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  let field = queryType?.getFields()[queryFieldName];
  if (!field && mutationType) field = mutationType.getFields()[queryFieldName];
  if (!field) return null;

  const mockData = autoMockType(schema, field.type, 4, new Set());
  return { data: { [queryFieldName]: mockData } };
}

function autoGenerateEmptyResponse(queryFieldName) {
  const schema = getSchema();
  if (!schema) return null;
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  let field = queryType?.getFields()[queryFieldName];
  if (!field && mutationType) field = mutationType.getFields()[queryFieldName];
  if (!field) return null;
  const { isList } = unwrapType(field.type);
  return { data: { [queryFieldName]: isList ? [] : null } };
}

function buildSchemaDocs() {
  if (cachedSchemaDocs) return cachedSchemaDocs;
  try {
    cachedSchemaDocs = schemaLoader.getAllSchemaDocs();
    return cachedSchemaDocs;
  } catch (err) {
    console.error("[buildSchemaDocs] Error:", err.message);
    return { queries: [], mutations: [] };
  }
}

function readScenarios() {
  const raw = fs.readFileSync(SCENARIOS_PATH, "utf8");
  return JSON.parse(raw);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(html),
  });
  res.end(html);
}

function getScenarioName(reqUrl, headers) {
  const parsed = url.parse(reqUrl, true);
  return (
    headers["x-mock-scenario"] ||
    parsed.query.scenario ||
    parsed.query.env ||
    DEFAULT_SCENARIO
  );
}

function getOperationNameFromQuery(parsedUrl) {
  return parsedUrl.query.operationName || parsedUrl.query.op || null;
}

function pickDefaultOperationName(operations) {
  const keys = Object.keys(operations || {}).filter((key) => key !== "*");
  return keys.length > 0 ? keys[0] : "*";
}

function checkVariableMismatch(operations, operationName, vars) {
  if (!vars || Object.keys(vars).length === 0) return false;

  const opBlock = operations[operationName] || operations[Object.keys(operations).find(
    (k) => k.toLowerCase() === (operationName || "").toLowerCase()
  )];
  if (!opBlock) return false;

  const successData = opBlock.success?.data || opBlock[DEFAULT_SCENARIO]?.data;
  if (!successData) return false;

  const rootData = Object.values(successData)[0];
  if (!rootData || typeof rootData !== "object") return false;

  for (const [varName, varValue] of Object.entries(vars)) {
    if (varValue === null || varValue === undefined || varValue === "") continue;
    const mockValue = rootData[varName];
    if (mockValue !== undefined && String(mockValue) !== String(varValue)) {
      return true;
    }
  }
  return false;
}

function pickResponse(operations, operationName, scenarioName) {
  const opBlock = operations[operationName] || operations["*"];
  if (!opBlock) {
    if (scenarioName === "error") {
      return {
        status: 200,
        delayMs: 0,
        body: { data: null, errors: [{ message: `Mock error for ${operationName}` }] },
      };
    }
    if (scenarioName === "empty") {
      const emptyResp = autoGenerateEmptyResponse(operationName);
      if (emptyResp) return { status: 200, delayMs: 0, body: emptyResp };
    }
    const autoResp = autoGenerateResponse(operationName);
    if (autoResp) return { status: 200, delayMs: 0, body: autoResp };
    return { status: 404, body: { errors: [{ message: "Unknown operation" }] } };
  }

  const response =
    opBlock[scenarioName] ||
    opBlock[DEFAULT_SCENARIO] ||
    opBlock["success"];
  if (!response) {
    return {
      status: 404,
      body: { errors: [{ message: "Scenario not found" }] },
    };
  }

  const status = response.__httpStatus || 200;
  const delayMs = response.__delayMs || 0;
  const body = { ...response };
  delete body.__httpStatus;
  delete body.__delayMs;

  return { status, delayMs, body };
}

function extractSelections(selectionSet) {
  if (!selectionSet || !selectionSet.selections) return null;
  const fields = {};
  for (const sel of selectionSet.selections) {
    if (sel.kind === "Field") {
      const name = sel.name.value;
      fields[name] = sel.selectionSet
        ? extractSelections(sel.selectionSet)
        : true;
    }
  }
  return fields;
}

function filterBySelections(data, selections) {
  if (selections === true || !selections || data == null) return data;
  if (Array.isArray(data))
    return data.map((item) => filterBySelections(item, selections));
  if (typeof data !== "object") return data;
  const result = {};
  for (const key of Object.keys(selections)) {
    if (key in data) {
      result[key] = filterBySelections(data[key], selections[key]);
    }
  }
  return result;
}

function filterResponse(responseBody, queryString) {
  if (!queryString || !responseBody || !responseBody.data) return responseBody;
  try {
    const doc = parse(queryString);
    const opDef = doc.definitions.find(
      (d) => d.kind === "OperationDefinition",
    );
    if (!opDef) return responseBody;
    const selections = extractSelections(opDef.selectionSet);
    if (!selections) return responseBody;
    return { ...responseBody, data: filterBySelections(responseBody.data, selections) };
  } catch {
    return responseBody;
  }
}

function validateRequiredVariables(queryString, variables) {
  if (!queryString) return [];
  try {
    const doc = parse(queryString);
    const opDef = doc.definitions.find((d) => d.kind === "OperationDefinition");
    if (!opDef || !opDef.variableDefinitions) return [];
    const missing = [];
    for (const vd of opDef.variableDefinitions) {
      const name = vd.variable.name.value;
      const isRequired = vd.type.kind === "NonNullType";
      if (!isRequired) continue;
      const val = variables[name];
      if (val === undefined || val === null || val === "") {
        missing.push(`$${name}`);
      }
    }
    return missing;
  } catch {
    return [];
  }
}

function extractFieldTree(obj) {
  if (obj == null) return "null";
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return [extractFieldTree(obj[0])];
  }
  if (typeof obj === "object") {
    const tree = {};
    for (const [key, val] of Object.entries(obj)) {
      tree[key] = extractFieldTree(val);
    }
    return tree;
  }
  if (typeof obj === "number") return "Number";
  if (typeof obj === "boolean") return "Boolean";
  return "String";
}

function buildIndexHtml(operations) {
  const opNames = Object.keys(operations || {}).filter((key) => key !== "*");
  const scenarioNames = new Set();

  for (const opName of opNames) {
    const scenarios = operations[opName] || {};
    Object.keys(scenarios).forEach((name) => scenarioNames.add(name));
  }

  const scenarioList =
    scenarioNames.size > 0
      ? Array.from(scenarioNames)
      : [DEFAULT_SCENARIO];

  const opLinks = opNames
    .map((opName) => {
      const links = scenarioList
        .map(
          (scenario) =>
            `<a href="/graphql?operationName=${encodeURIComponent(
              opName,
            )}&scenario=${encodeURIComponent(scenario)}">${scenario}</a>`,
        )
        .join(" | ");
      return `<li><strong>${opName}</strong>: ${links}</li>`;
    })
    .join("");

  const defaultOp = opNames[0] || "GetGamecastBySlug";
  const defaultScenario = scenarioList[0] || DEFAULT_SCENARIO;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Custom Mock Server</title>
    <style>
      body { background-color:rgb(189, 153, 153); font-family: Arial, sans-serif; margin: 32px; }
      h1 { color: rgb(175, 46, 46); }
      code { background: rgb(175, 46, 46); color: #fff; padding: 2px 6px; border-radius: 4px; }
      ul { line-height: 1.8; }
      a { text-decoration: none; }
      textarea { width: 100%; min-height: 160px; font-family: monospace; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .col { flex: 1; min-width: 220px; }
      .btn { padding: 8px 12px; cursor: pointer; }
      .card { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
      .muted { color: #666; }
    </style>
  </head>
  <body>
    <h1>Fed Serv Mock Server</h1>
    <p>Use <code>/graphql</code> with a scenario query param for quick checks.</p>
    <p>Example: <code>/graphql?operationName=GetGamecastBySlug&amp;scenario=success</code></p>
    <h2>Quick Test UI</h2>
    <div class="card">
      <div class="row">
        <div class="col">
          <label>Operation</label><br />
          <input id="opName" value="${defaultOp}" />
        </div>
        <div class="col">
          <label>Scenario</label><br />
          <input id="scenario" value="${defaultScenario}" />
        </div>
        <div class="col">
          <label>Method</label><br />
          <select id="method">
            <option value="GET">GET</option>
            <option value="POST" selected>POST</option>
          </select>
        </div>
      </div>
      <p class="muted">Tip: change scenario to <code>success</code>, <code>empty</code>, or <code>error</code>.</p>
      <label>Query</label>
      <textarea id="query">query ${defaultOp}($slug: String!) {
  getGamecastBySlug(slug: $slug) {
    slug
    status
  }
}</textarea>
      <label>Variables</label>
      <textarea id="variables">{
  "slug": "demo-game-001"
}</textarea>
      <button class="btn" onclick="runTest()">Run</button>
      <h3>Response</h3>
      <pre id="response"></pre>
    </div>
    <h2>Operations</h2>
    <ul>${opLinks || "<li>No operations configured</li>"}</ul>
    <script>
      async function runTest() {
        const opName = document.getElementById("opName").value.trim();
        const scenario = document.getElementById("scenario").value.trim();
        const method = document.getElementById("method").value;
        const query = document.getElementById("query").value;
        const variables = document.getElementById("variables").value;
        const responseEl = document.getElementById("response");
        responseEl.textContent = "Loading...";

        try {
          if (method === "GET") {
            const url =
              "/graphql?operationName=" +
              encodeURIComponent(opName) +
              "&scenario=" +
              encodeURIComponent(scenario);
            const res = await fetch(url);
            const json = await res.json();
            responseEl.textContent = JSON.stringify(json, null, 2);
            return;
          }

          const payload = {
            operationName: opName,
            query,
            variables: JSON.parse(variables || "{}")
          };
          const res = await fetch("/graphql", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-mock-scenario": scenario
            },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          responseEl.textContent = JSON.stringify(json, null, 2);
        } catch (err) {
          responseEl.textContent = err.message || String(err);
        }
      }
    </script>
  </body>
</html>`;
}

const microcksClient = require("./microcks-client.cjs");
const mockExpectations = require("./mock-expectations.cjs");

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 5_000_000) reject(new Error("Body too large")); });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === "GET" && parsedUrl.pathname === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  if (req.method === "GET" && parsedUrl.pathname === "/schema-docs") {
    return sendJson(res, 200, buildSchemaDocs());
  }

  // ── Microcks API proxy endpoints ──
  if (req.method === "GET" && parsedUrl.pathname === "/api/microcks/services") {
    try {
      const services = await microcksClient.listServices();
      return sendJson(res, 200, { services });
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  if (req.method === "GET" && parsedUrl.pathname.match(/^\/api\/microcks\/services\/[^/]+$/)) {
    try {
      const id = parsedUrl.pathname.split("/").pop();
      const svc = await microcksClient.getService(id, true);
      return sendJson(res, 200, svc);
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/microcks/query") {
    try {
      const { serviceName, version, query: gqlQuery, variables: gqlVars, operationName: opName } = await readBody(req);
      if (!serviceName) return sendJson(res, 400, { error: "serviceName required" });

      // Loki-style: check expectations layer first
      const expectedResponse = mockExpectations.matchExpectation(serviceName, opName, gqlVars);
      if (expectedResponse) {
        return sendJson(res, 200, expectedResponse);
      }

      // Fall through to Microcks
      const result = await microcksClient.queryGraphql(serviceName, version || "1.0", gqlQuery, gqlVars);
      return sendJson(res, result.status, result.data);
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  // ── Expectations REST API (Loki-style) ──
  if (req.method === "POST" && parsedUrl.pathname === "/api/expectations") {
    try {
      const body = await readBody(req);
      const result = mockExpectations.setExpectation(body);
      return sendJson(res, 200, { success: true, expectation: result });
    } catch (e) { return sendJson(res, 400, { error: e.message }); }
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/expectations/sequence") {
    try {
      const body = await readBody(req);
      const result = mockExpectations.setSequence(body);
      return sendJson(res, 200, { success: true, expectation: result });
    } catch (e) { return sendJson(res, 400, { error: e.message }); }
  }

  if (req.method === "GET" && parsedUrl.pathname === "/api/expectations") {
    const svcFilter = parsedUrl.query?.serviceName || null;
    const list = mockExpectations.listExpectations(svcFilter);
    return sendJson(res, 200, { expectations: list });
  }

  if (req.method === "DELETE" && parsedUrl.pathname === "/api/expectations") {
    try {
      const { serviceName, operationName } = await readBody(req);
      if (operationName) {
        mockExpectations.clearExpectation(serviceName, operationName);
      } else {
        mockExpectations.clearAll(serviceName);
      }
      return sendJson(res, 200, { success: true });
    } catch (e) { return sendJson(res, 400, { error: e.message }); }
  }

  // ── Microcks environment management ──
  if (req.method === "GET" && parsedUrl.pathname === "/api/microcks/envs") {
    try {
      const services = await microcksClient.listServices();
      const envs = {};
      for (const svc of services) {
        const env = svc.labels?.environment || "unassigned";
        if (!envs[env]) envs[env] = [];
        envs[env].push({ id: svc.id, name: svc.name, version: svc.version, operationCount: svc.operationCount });
      }
      return sendJson(res, 200, { environments: envs });
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  if (req.method === "PUT" && parsedUrl.pathname.match(/^\/api\/microcks\/envs\/[^/]+\/services\/[^/]+$/)) {
    try {
      const parts = parsedUrl.pathname.split("/");
      const envName = parts[4];
      const serviceId = parts[6];
      const result = await microcksClient.updateMetadata(serviceId, { environment: envName });
      return sendJson(res, result.status === 200 ? 200 : 500, {
        success: result.status === 200,
        environment: envName,
        serviceId,
      });
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  if (req.method === "POST" && parsedUrl.pathname === "/api/microcks/envs/init") {
    try {
      const { environment } = await readBody(req);
      if (!environment) return sendJson(res, 400, { error: "environment required (dev, int, stage)" });
      const services = await microcksClient.listServices();
      const results = [];
      for (const svc of services) {
        const r = await microcksClient.updateMetadata(svc.id, { environment });
        results.push({ name: svc.name, success: r.status === 200 });
      }
      return sendJson(res, 200, { environment, results });
    } catch (e) { return sendJson(res, 500, { error: e.message }); }
  }

  if (req.method === "GET" && parsedUrl.pathname === "/") {
    try {
      const scenarios = readScenarios();
      return sendHtml(
        res,
        200,
        buildIndexHtml(scenarios.operations || {}),
      );
    } catch (err) {
      return sendHtml(res, 500, "<h1>Failed to load scenarios</h1>");
    }
  }

  if (req.method === "GET" && parsedUrl.pathname === "/meta") {
    try {
      const scenarios = readScenarios();
      const operations = scenarios.operations || {};
      const docs = buildSchemaDocs();
      const handcraftedSet = new Set(
        Object.keys(operations).filter((k) => k !== "*"),
      );

      const meta = [];
      const seen = new Set();

      for (const opName of handcraftedSet) {
        seen.add(opName.toLowerCase());
        const successData =
          operations[opName].success?.data ||
          Object.values(operations[opName]).find((s) => s.data)?.data;
        meta.push({
          operationName: opName,
          scenarios: Object.keys(operations[opName]),
          source: "handcrafted",
          fields: successData ? extractFieldTree(successData) : null,
        });
      }

      for (const q of docs.queries) {
        if (seen.has(q.name.toLowerCase())) continue;
        seen.add(q.name.toLowerCase());
        meta.push({
          operationName: q.name,
          scenarios: ["success", "empty", "error"],
          source: "auto",
          service: q.service || null,
          fields: null,
        });
      }

      for (const m of docs.mutations) {
        if (seen.has(m.name.toLowerCase())) continue;
        seen.add(m.name.toLowerCase());
        meta.push({
          operationName: m.name,
          scenarios: ["success", "empty", "error"],
          source: "auto",
          type: "mutation",
          service: m.service || null,
          fields: null,
        });
      }

      return sendJson(res, 200, { operations: meta });
    } catch (err) {
      return sendJson(res, 500, { error: "Failed to load scenarios file" });
    }
  }

  if (req.method === "GET" && parsedUrl.pathname === "/graphql") {
    let scenarios;
    try {
      scenarios = readScenarios();
    } catch (err) {
      return sendJson(res, 500, { error: "Failed to load scenarios file" });
    }

    const scenarioName = getScenarioName(req.url, req.headers);
    const operationName =
      getOperationNameFromQuery(parsedUrl) ||
      pickDefaultOperationName(scenarios.operations || {});

    const { status, delayMs, body: responseBody } = pickResponse(
      scenarios.operations || {},
      operationName,
      scenarioName,
    );

    if (delayMs > 0) {
      return setTimeout(() => sendJson(res, status, responseBody), delayMs);
    }
    return sendJson(res, status, responseBody);
  }

  if (req.method !== "POST" || parsedUrl.pathname !== "/graphql") {
    return sendJson(res, 404, { error: "Not found" });
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 5_000_000) {
      req.destroy();
    }
  });

  req.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch (err) {
      return sendJson(res, 400, { error: "Invalid JSON body" });
    }

    const operationName = payload.operationName;
    if (REQUIRE_OPERATION_NAME && !operationName) {
      return sendJson(res, 400, {
        error: "operationName is required for scenario matching",
      });
    }

    const vars = payload.variables || {};
    const missingVars = validateRequiredVariables(payload.query, vars);
    if (missingVars.length > 0) {
      return sendJson(res, 400, {
        errors: [{
          message: `Missing required variable(s): ${missingVars.join(", ")}. Please provide values in the Variables panel.`,
          extensions: { code: "MISSING_VARIABLES", missingVariables: missingVars },
        }],
      });
    }

    let scenarios;
    try {
      scenarios = readScenarios();
    } catch (err) {
      return sendJson(res, 500, { error: "Failed to load scenarios file" });
    }

    let scenarioName = getScenarioName(req.url, req.headers);

    if (scenarioName === "success" || scenarioName === DEFAULT_SCENARIO) {
      const mismatch = checkVariableMismatch(scenarios.operations || {}, operationName, vars);
      if (mismatch) {
        scenarioName = "__var_mismatch";
      }
    }

    if (scenarioName === "__var_mismatch") {
      const rootField = operationName.charAt(0).toLowerCase() + operationName.slice(1);
      const filtered = filterResponse(
        { data: { [rootField]: null }, errors: [{ message: `No ${operationName} found matching the provided arguments`, extensions: { code: "NOT_FOUND", variables: vars } }] },
        payload.query
      );
      return sendJson(res, 200, filtered);
    }

    const { status, delayMs, body: responseBody } = pickResponse(
      scenarios.operations || {},
      operationName || "*",
      scenarioName,
    );

    const filtered = filterResponse(responseBody, payload.query);

    if (delayMs > 0) {
      return setTimeout(() => sendJson(res, status, filtered), delayMs);
    }

    return sendJson(res, status, filtered);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Custom mock server listening on http://localhost:${PORT}`);
});
