/**
 * Microcks REST API client.
 * Wraps the Microcks API at the configured base URL for programmatic access
 * to services, operations, artifacts, and metadata.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const MICROCKS_URL = process.env.MICROCKS_URL || "http://localhost:8585";

function request(method, urlPath, { body, formData } = {}) {
  const fullUrl = `${MICROCKS_URL}${urlPath}`;
  const parsed = new URL(fullUrl);
  const mod = parsed.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const headers = {};
    let payload = null;

    if (formData) {
      const boundary = `----MicrocksUpload${Date.now()}`;
      headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
      const parts = [];
      for (const [key, val] of Object.entries(formData)) {
        if (val && val.filePath) {
          const fileContent = fs.readFileSync(val.filePath);
          const fileName = path.basename(val.filePath);
          parts.push(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
          );
          parts.push(fileContent);
          parts.push("\r\n");
        } else {
          parts.push(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
          );
        }
      }
      parts.push(`--${boundary}--\r\n`);
      payload = Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p) : p)));
      headers["Content-Length"] = payload.length;
    } else if (body) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const opts = { method, headers };
    const req = mod.request(fullUrl, opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function listServices() {
  const { data } = await request("GET", "/api/services?page=0&size=200");
  if (!Array.isArray(data)) return [];
  return data.map((svc) => ({
    id: svc.id,
    name: svc.name,
    version: svc.version,
    type: svc.type,
    operationCount: svc.operations?.length || 0,
    operations: (svc.operations || []).map((op) => ({
      name: op.name,
      method: op.method,
      dispatcher: op.dispatcher,
    })),
    labels: svc.metadata?.labels || {},
  }));
}

async function getService(serviceId, withMessages = false) {
  const qs = withMessages ? "?messages=true" : "";
  const { data } = await request("GET", `/api/services/${serviceId}${qs}`);
  return data;
}

async function getServiceMessages(serviceId) {
  const svc = await getService(serviceId, true);
  if (!svc || !svc.operations) return { service: svc, examples: {} };

  const examples = {};
  for (const op of svc.operations) {
    examples[op.name] = [];
    if (op.resourcePaths) {
      for (const rp of op.resourcePaths) {
        try {
          const { data } = await request(
            "GET",
            `/api/responses/${serviceId}/${encodeURIComponent(op.name)}`
          );
          if (Array.isArray(data)) {
            examples[op.name].push(...data.map((r) => ({
              name: r.name,
              content: r.content,
            })));
          }
        } catch { /* skip */ }
      }
    }
  }
  return { service: svc, examples };
}

async function uploadArtifact(filePath, isMain = true) {
  const formFields = {
    file: { filePath },
  };
  if (!isMain) {
    formFields.mainArtifact = "false";
  }
  return request("POST", "/api/artifact/upload", { formData: formFields });
}

async function uploadArtifactFromBuffer(fileName, content, isMain = true) {
  const tmpDir = path.join(require("os").tmpdir(), "microcks-uploads");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, fileName);
  fs.writeFileSync(tmpFile, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  const result = await uploadArtifact(tmpFile, isMain);
  try { fs.unlinkSync(tmpFile); } catch { /* ok */ }
  return result;
}

async function updateOperation(serviceId, operationName, dispatcher, dispatcherRules) {
  const rules = typeof dispatcherRules === "string" ? dispatcherRules : JSON.stringify(dispatcherRules);
  return request("PUT", `/api/services/${serviceId}/operation?operationName=${encodeURIComponent(operationName)}`, {
    body: { dispatcher, dispatcherRules: rules },
  });
}

async function updateMetadata(serviceId, labels) {
  return request("PUT", `/api/services/${serviceId}/metadata`, {
    body: { labels },
  });
}

async function searchServices(queryMap) {
  const params = Object.entries(queryMap)
    .map(([k, v]) => `queryMap[${k}]=${encodeURIComponent(v)}`)
    .join("&");
  const { data } = await request("GET", `/api/services/search?${params}`);
  return Array.isArray(data) ? data : [];
}

function getGraphqlEndpoint(serviceName, version = "1.0") {
  return `${MICROCKS_URL}/graphql/${encodeURIComponent(serviceName)}/${encodeURIComponent(version)}`;
}

async function queryGraphql(serviceName, version, query, variables) {
  const endpoint = `/graphql/${encodeURIComponent(serviceName)}/${encodeURIComponent(version)}`;
  return request("POST", endpoint, {
    body: { query, variables },
  });
}

const { execSync } = require("child_process");

/**
 * Directly updates the mock response for an operation in Microcks' MongoDB.
 * Uses a temp JS file to avoid shell escaping issues with complex JSON.
 */
async function updateMockResponse(serviceName, version, operationName, responseContent) {
  const services = await listServices();
  const svc = services.find((s) => s.name === serviceName && s.version === (version || "1.0"));
  if (!svc) throw new Error(`Service ${serviceName} v${version} not found in Microcks`);

  const content = typeof responseContent === "string"
    ? responseContent
    : JSON.stringify(responseContent);

  const operationId = `${svc.id}-${operationName}`;

  const scriptContent = `
    var newContent = ${JSON.stringify(content)};
    var result = db.response.updateOne(
      { operationId: ${JSON.stringify(operationId)} },
      { $set: { content: newContent } }
    );
    print(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount }));
  `;

  const tmpFile = path.join(require("os").tmpdir(), `microcks-update-${Date.now()}.js`);
  fs.writeFileSync(tmpFile, scriptContent);

  try {
    execSync(`docker cp "${tmpFile}" microcks-db:/tmp/update.js`, { timeout: 5000 });
    const output = execSync(
      `docker exec microcks-db mongo microcks --quiet /tmp/update.js`,
      { encoding: "utf-8", timeout: 10000 }
    );

    let result;
    try { result = JSON.parse(output.trim()); } catch { result = { matched: 0, modified: 0 }; }

    return {
      success: result.matched > 0,
      matched: result.matched,
      modified: result.modified,
    };
  } catch (e) {
    throw new Error(`MongoDB update failed: ${e.message}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

module.exports = {
  listServices,
  getService,
  getServiceMessages,
  uploadArtifact,
  uploadArtifactFromBuffer,
  updateOperation,
  updateMetadata,
  searchServices,
  getGraphqlEndpoint,
  queryGraphql,
  updateMockResponse,
  MICROCKS_URL,
};
