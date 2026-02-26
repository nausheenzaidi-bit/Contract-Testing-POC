/**
 * Universal HTTP client for CLI — works with GraphQL, REST, and raw HTTP.
 * Returns structured results suitable for assertions and reporting.
 */

const http = require("http");
const https = require("https");

function request(method, url, { headers = {}, body, timeout = 10000 } = {}) {
  const parsed = new URL(url);
  const mod = parsed.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    let payload = null;
    const reqHeaders = { ...headers };

    if (body) {
      payload = typeof body === "string" ? body : JSON.stringify(body);
      if (!reqHeaders["content-type"]) reqHeaders["content-type"] = "application/json";
      reqHeaders["content-length"] = Buffer.byteLength(payload);
    }

    const start = Date.now();
    const req = mod.request(url, { method, headers: reqHeaders, timeout }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const elapsed = Date.now() - start;
        const raw = Buffer.concat(chunks).toString();
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          raw,
          elapsed,
        });
      });
    });

    req.on("timeout", () => { req.destroy(); reject(new Error(`Request timeout after ${timeout}ms`)); });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function graphqlRequest(url, query, variables = {}, headers = {}) {
  return request("POST", url, {
    headers: { "content-type": "application/json", ...headers },
    body: { query, variables },
  });
}

async function restRequest(method, url, { headers = {}, body, queryParams } = {}) {
  const parsed = new URL(url);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      parsed.searchParams.set(k, v);
    }
  }
  return request(method, parsed.toString(), { headers, body });
}

module.exports = { request, graphqlRequest, restRequest };
