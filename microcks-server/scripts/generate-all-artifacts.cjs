#!/usr/bin/env node
/**
 * Generates Microcks-compatible artifacts for ALL service schemas.
 * For each *-api file, creates:
 *   1. A trimmed GraphQL schema with microcksId header
 *   2. A Postman collection with mock examples
 *
 * Usage: node generate-all-artifacts.cjs
 */

const fs = require("fs");
const path = require("path");
const { buildSchema, isObjectType, isListType, isNonNullType, isEnumType, isScalarType } = require("graphql");

const WORKSPACE = path.resolve(__dirname, "../..");
const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts");

// ──── Service name mapping ────
function toServiceName(apiFileName) {
  return apiFileName
    .replace(/-api$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("") + "API";
}

// ──── Federation directive stripping (from schema-loader.cjs) ────
function stripFederationDirectives(sdl) {
  let cleaned = sdl;

  cleaned = cleaned.replace(/extend\s+schema[\s\S]*?\{[^}]*\}/g, "");
  cleaned = cleaned.replace(/extend\s+schema\s*\n\s*@link\([\s\S]*?\)\s*/g, "");

  const dirLines = cleaned.split("\n");
  const dirResult = [];
  let inDirective = false;
  for (const line of dirLines) {
    if (/^\s*directive\s+@/.test(line)) inDirective = true;
    if (inDirective) {
      if (/\b(FIELD_DEFINITION|OBJECT|INTERFACE|UNION|ENUM|INPUT_OBJECT|SCALAR|SCHEMA|ENUM_VALUE|INPUT_FIELD_DEFINITION|ARGUMENT_DEFINITION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|MUTATION|QUERY|SUBSCRIPTION)\b/.test(line))
        inDirective = false;
      continue;
    }
    dirResult.push(line);
  }
  cleaned = dirResult.join("\n");

  function stripDirectiveUsages(s) {
    let result = "", i = 0;
    while (i < s.length) {
      if (s[i] === "@" && /[a-zA-Z]/.test(s[i + 1] || "")) {
        let j = i + 1;
        while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
        while (j < s.length && /\s/.test(s[j])) j++;
        if (s[j] === "(") {
          let depth = 1; j++;
          while (j < s.length && depth > 0) {
            if (s[j] === '"') { j++; while (j < s.length && s[j] !== '"') { if (s[j] === "\\") j++; j++; } }
            if (s[j] === "(") depth++;
            if (s[j] === ")") depth--;
            j++;
          }
        }
        i = j;
      } else {
        result += s[i]; i++;
      }
    }
    return result;
  }
  cleaned = stripDirectiveUsages(cleaned);

  cleaned = cleaned.replace(/extend\s+type\s+/g, "type ");

  cleaned = cleaned.replace(/scalar\s+_FieldSet\b/g, "");
  cleaned = cleaned.replace(/scalar\s+_Any\b/g, "");
  cleaned = cleaned.replace(/scalar\s+link__Import\b/g, "");
  cleaned = cleaned.replace(/scalar\s+link__Purpose\b/g, "");
  cleaned = cleaned.replace(/\s*_entities\([^)]*\):\s*\[[^\]]*\]!?/g, "");
  cleaned = cleaned.replace(/\s*_service:\s*_Service!?/g, "");
  cleaned = cleaned.replace(/type\s+_Service\s*\{[^}]*\}/gs, "");
  cleaned = cleaned.replace(/union\s+_Entity\s*=[^\n]*/g, "");
  cleaned = cleaned.replace(/enum\s+CacheControlScope\s*\{[^}]*\}/gs, "");
  cleaned = cleaned.replace(/"""[\s\S]*?"""\s*/g, "");

  const commonScalars = [
    "Date","DateTime","DateTimeISO","JSON","JSONObject","Upload","Time",
    "BigInt","Long","Void","UUID","URL","PositiveInt","NonNegativeInt",
    "NonNegativeFloat","NonEmptyString","EmailAddress","PhoneNumber","USCurrency",
    "JWT","Duration","Locale",
  ];
  for (const s of commonScalars) {
    if (cleaned.includes(s) && !new RegExp(`scalar\\s+${s}\\b`).test(cleaned))
      cleaned = `scalar ${s}\n` + cleaned;
  }

  cleaned = cleaned.replace(/type\s+\w+\s*\{\s*\}/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function deduplicateSchema(sdl) {
  const seen = { type: new Set(), enum: new Set(), scalar: new Set(), input: new Set(), union: new Set(), interface: new Set() };
  const lines = sdl.split("\n");
  const result = [];
  let skip = false, braceDepth = 0;

  for (const line of lines) {
    const typeMatch = line.match(/^(type|input|interface)\s+(\w+)/);
    const enumMatch = line.match(/^enum\s+(\w+)/);
    const scalarMatch = line.match(/^scalar\s+(\w+)/);
    const unionMatch = line.match(/^union\s+(\w+)/);

    if (typeMatch && !skip) {
      const [, kind, name] = typeMatch;
      if (name === "Query" || name === "Mutation") { result.push(line); continue; }
      if (seen[kind].has(name)) { skip = true; braceDepth = 0; }
      else { seen[kind].add(name); result.push(line); }
      continue;
    }
    if (enumMatch && !skip) {
      const name = enumMatch[1];
      if (seen.enum.has(name)) { skip = true; braceDepth = 0; }
      else { seen.enum.add(name); result.push(line); }
      continue;
    }
    if (scalarMatch && !skip) {
      const name = scalarMatch[1];
      if (seen.scalar.has(name)) continue;
      seen.scalar.add(name); result.push(line); continue;
    }
    if (unionMatch && !skip) {
      const name = unionMatch[1];
      if (seen.union.has(name)) { skip = true; braceDepth = 0; }
      else { seen.union.add(name); result.push(line); }
      continue;
    }
    if (skip) {
      for (const ch of line) { if (ch === "{") braceDepth++; if (ch === "}") braceDepth--; }
      if (braceDepth <= 0 && line.includes("}")) { skip = false; }
      continue;
    }
    result.push(line);
  }
  return result.join("\n");
}

// ──── Mock data generation ────
const MOCK_STRINGS = {
  slug: "demo-slug-001", name: "Demo Name", title: "Demo Title",
  description: "A sample description for demo purposes",
  email: "user@example.com", displayName: "Jane Doe",
  url: "https://example.com/demo", uri: "/demo/path",
  id: "id-12345", cmsId: "cms-67890", uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  permalink: "demo-permalink", sport: "Football", league: "NFL",
  status: "Active", type: "DEFAULT", body: "Sample body text for demo",
  image: "https://example.com/image.jpg", abbrev: "DMO",
  date: "2026-02-20", gameDate: "2026-02-20", startDate: "2026-02-20",
  endDate: "2026-03-20", clock: "12:00", playPeriod: "Q1",
  season: "2026", score: "21", record: "10-2",
  text: "Sample text content", label: "Demo Label",
  source: "demo-source", client: "demo-client",
  tenant: "demo-tenant", foreignId: "foreign-123",
  term: "search-term", input: "demo-input",
  clientId: "client-abc-123",
  profileId: "profile-xyz-789",
  searchTerms: "football highlights",
  provider: "demo-provider", providerName: "DemoProvider",
  created: "2026-02-20T10:00:00Z",
};

function mockValueForField(fieldName, typeName, schema, depth) {
  const fnLower = fieldName.toLowerCase();

  if (typeName === "String" || typeName === "String!" || typeName === "NonEmptyString" || typeName === "NonEmptyString!") {
    for (const [key, val] of Object.entries(MOCK_STRINGS)) {
      if (fnLower.includes(key.toLowerCase())) return val;
    }
    return `demo-${fieldName}`;
  }
  if (typeName === "Int" || typeName === "Int!" || typeName === "PositiveInt" || typeName === "NonNegativeInt") {
    if (fnLower.includes("score")) return 21;
    if (fnLower.includes("count")) return 5;
    if (fnLower.includes("season")) return 2026;
    if (fnLower.includes("timezone")) return -5;
    if (fnLower.includes("limit")) return 10;
    return 1;
  }
  if (typeName === "Float" || typeName === "Float!" || typeName === "NonNegativeFloat") return 3.14;
  if (typeName === "Boolean" || typeName === "Boolean!") return true;
  if (typeName === "ID" || typeName === "ID!") return `id-${fieldName}-001`;
  if (typeName.includes("Date") || typeName.includes("DateTime")) return "2026-02-20T10:00:00Z";
  if (typeName === "UUID" || typeName === "UUID!") return "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  if (typeName === "URL" || typeName === "URL!") return "https://example.com/demo";
  if (typeName === "JSON" || typeName === "JSONObject") return {};
  if (typeName === "JWT" || typeName === "JWT!") return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo";

  return null;
}

function generateMockObject(graphqlType, schema, depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return null;
  if (!graphqlType || typeof graphqlType.getFields !== "function") return null;

  const fields = graphqlType.getFields();
  const obj = {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    let type = fieldDef.type;
    let isList = false;

    // Unwrap NonNull
    if (isNonNullType(type)) type = type.ofType;
    // Check list
    if (isListType(type)) { isList = true; type = type.ofType; }
    if (isNonNullType(type)) type = type.ofType;

    if (isScalarType(type)) {
      const val = mockValueForField(fieldName, type.name, schema, depth);
      obj[fieldName] = isList ? [val] : val;
    } else if (isEnumType(type)) {
      const values = type.getValues();
      obj[fieldName] = isList ? [values[0]?.value || "UNKNOWN"] : (values[0]?.value || "UNKNOWN");
    } else if (isObjectType(type)) {
      const nested = generateMockObject(type, schema, depth + 1, maxDepth);
      obj[fieldName] = isList ? (nested ? [nested] : []) : nested;
    } else {
      obj[fieldName] = isList ? [] : null;
    }
  }
  return obj;
}

function getReturnType(fieldType) {
  let type = fieldType;
  if (isNonNullType(type)) type = type.ofType;
  if (isListType(type)) type = type.ofType;
  if (isNonNullType(type)) type = type.ofType;
  return type;
}

function buildQueryString(opName, fieldDef, schema) {
  const args = fieldDef.args || [];
  const returnType = getReturnType(fieldDef.type);

  let argsDef = "";
  let argsUsage = "";
  const variables = {};

  if (args.length > 0) {
    const varParts = [];
    const usageParts = [];
    for (const arg of args) {
      const typeName = arg.type.toString();
      varParts.push(`$${arg.name}: ${typeName}`);
      usageParts.push(`${arg.name}: $${arg.name}`);

      let baseType = typeName.replace(/[!\[\]]/g, "");
      const mockVal = mockValueForField(arg.name, baseType, schema, 0);
      if (mockVal !== null && mockVal !== undefined) {
        variables[arg.name] = mockVal;
      } else if (baseType === "String" || baseType === "NonEmptyString") {
        variables[arg.name] = `demo-${arg.name}`;
      } else if (baseType === "Int" || baseType === "PositiveInt" || baseType === "NonNegativeInt") {
        variables[arg.name] = 1;
      } else if (baseType === "Float" || baseType === "NonNegativeFloat") {
        variables[arg.name] = 1.0;
      } else if (baseType === "Boolean") {
        variables[arg.name] = true;
      } else if (baseType === "ID" || baseType === "UUID") {
        variables[arg.name] = "id-demo-001";
      } else {
        const enumType = schema.getType(baseType);
        if (isEnumType(enumType)) {
          variables[arg.name] = enumType.getValues()[0]?.value || "DEFAULT";
        } else {
          variables[arg.name] = {};
        }
      }
    }
    argsDef = `(${varParts.join(", ")})`;
    argsUsage = `(${usageParts.join(", ")})`;
  }

  // Build selection set (top 2 levels of scalar fields)
  let selection = "";
  if (isObjectType(returnType) && typeof returnType.getFields === "function") {
    const topFields = Object.entries(returnType.getFields()).slice(0, 8);
    const fieldStrs = [];
    for (const [fn, fv] of topFields) {
      let ft = fv.type;
      if (isNonNullType(ft)) ft = ft.ofType;
      if (isListType(ft)) ft = ft.ofType;
      if (isNonNullType(ft)) ft = ft.ofType;

      if (isScalarType(ft) || isEnumType(ft)) {
        fieldStrs.push(fn);
      } else if (isObjectType(ft)) {
        const subFields = Object.entries(ft.getFields()).slice(0, 4);
        const subStrs = subFields
          .filter(([, sfv]) => {
            let sft = sfv.type;
            if (isNonNullType(sft)) sft = sft.ofType;
            if (isListType(sft)) sft = sft.ofType;
            if (isNonNullType(sft)) sft = sft.ofType;
            return isScalarType(sft) || isEnumType(sft);
          })
          .map(([sfn]) => sfn);
        if (subStrs.length > 0) {
          fieldStrs.push(`${fn} { ${subStrs.join(" ")} }`);
        }
      }
    }
    if (fieldStrs.length > 0) selection = ` { ${fieldStrs.join(" ")} }`;
  }

  const queryStr = `query ${opName}${argsDef} { ${opName}${argsUsage}${selection} }`;
  return { queryStr, variables };
}

function generateMockResponse(opName, fieldDef, schema) {
  const returnType = getReturnType(fieldDef.type);

  let isList = false;
  let type = fieldDef.type;
  if (isNonNullType(type)) type = type.ofType;
  if (isListType(type)) isList = true;

  let mockData;
  if (isObjectType(returnType)) {
    const obj = generateMockObject(returnType, schema, 0, 3);
    mockData = isList ? [obj] : obj;
  } else if (isScalarType(returnType)) {
    const val = mockValueForField(opName, returnType.name, schema, 0);
    mockData = isList ? [val] : val;
  } else if (isEnumType(returnType)) {
    const val = returnType.getValues()[0]?.value || "UNKNOWN";
    mockData = isList ? [val] : val;
  } else {
    mockData = isList ? [] : null;
  }

  return { data: { [opName]: mockData } };
}

// ──── Build Postman collection ────
function buildPostmanCollection(serviceName, operations) {
  const items = [];

  for (const op of operations) {
    const { queryStr, variables } = op.queryInfo;
    const mockResponse = op.mockResponse;

    const bodyRaw = JSON.stringify({
      query: queryStr,
      ...(Object.keys(variables).length > 0 ? { variables } : {}),
    });

    const responseBody = JSON.stringify(mockResponse);

    items.push({
      name: op.name,
      request: {
        method: "POST",
        url: `http://${op.name}`,
        header: [{ key: "Content-Type", value: "application/json" }],
        body: { mode: "raw", raw: bodyRaw },
      },
      response: [
        {
          name: op.exampleName,
          originalRequest: {
            method: "POST",
            url: `http://${op.name}`,
            body: { mode: "raw", raw: bodyRaw },
          },
          code: 200,
          header: [{ key: "Content-Type", value: "application/json" }],
          body: responseBody,
        },
      ],
    });
  }

  return {
    info: {
      _postman_id: `${serviceName.toLowerCase()}-mocks-001`,
      name: serviceName,
      description: `version=1.0 - Mock examples for ${serviceName} GraphQL service`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
  };
}

// ──── Main ────
function main() {
  const apiFiles = fs.readdirSync(WORKSPACE).filter(
    (f) => f.endsWith("-api") && fs.statSync(path.join(WORKSPACE, f)).isFile()
  );

  console.log(`Found ${apiFiles.length} service schema files.\n`);

  const summary = [];

  for (const apiFile of apiFiles) {
    const serviceName = toServiceName(apiFile);
    const filePath = path.join(WORKSPACE, apiFile);
    const raw = fs.readFileSync(filePath, "utf8");

    console.log(`Processing ${apiFile} → ${serviceName}...`);

    // Step 1: Clean schema
    let cleaned = stripFederationDirectives(raw);

    // Ensure schema block
    if (!/schema\s*\{/.test(cleaned)) {
      const hasQuery = /type\s+Query\s*\{/.test(cleaned);
      const hasMutation = /type\s+Mutation\s*\{/.test(cleaned);
      if (hasQuery || hasMutation) {
        const parts = [];
        if (hasQuery) parts.push("  query: Query");
        if (hasMutation) parts.push("  mutation: Mutation");
        cleaned += `\n\nschema {\n${parts.join("\n")}\n}`;
      }
    }

    cleaned = deduplicateSchema(cleaned);

    // Try building, auto-add unknown types as scalars
    let schema, sdl = cleaned;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        schema = buildSchema(sdl);
        break;
      } catch (err) {
        const unknowns = [...(err.message || "").matchAll(/Unknown type "(\w+)"/g)].map((m) => m[1]);
        const unique = [...new Set(unknowns)];
        if (unique.length === 0) {
          console.error(`  ERROR building schema: ${err.message.split("\n")[0]}`);
          break;
        }
        sdl = unique.map((t) => `scalar ${t}`).join("\n") + "\n" + sdl;
      }
    }

    if (!schema) {
      console.error(`  SKIPPED ${apiFile} — could not build schema.\n`);
      continue;
    }

    // Add microcksId header
    const microcksSchema = `# microcksId: ${serviceName} : 1.0\n\n${sdl}`;

    // Step 2: Extract operations and generate mocks
    const operations = [];
    const queryType = schema.getQueryType();
    if (queryType) {
      for (const [opName, fieldDef] of Object.entries(queryType.getFields())) {
        if (opName.startsWith("_")) continue;
        try {
          const queryInfo = buildQueryString(opName, fieldDef, schema);
          const mockResponse = generateMockResponse(opName, fieldDef, schema);
          const argValues = Object.values(queryInfo.variables);
          const exampleName = argValues.length > 0
            ? String(argValues[0]).replace(/[^a-zA-Z0-9-_]/g, "").substring(0, 30) || "default"
            : "default";
          operations.push({ name: opName, queryInfo, mockResponse, exampleName });
        } catch (e) {
          console.warn(`  Warning: could not generate mock for query ${opName}: ${e.message}`);
        }
      }
    }

    const mutationType = schema.getMutationType();
    if (mutationType) {
      for (const [opName, fieldDef] of Object.entries(mutationType.getFields())) {
        if (opName.startsWith("_")) continue;
        try {
          const queryInfo = buildQueryString(opName, fieldDef, schema);
          queryInfo.queryStr = queryInfo.queryStr.replace(/^query /, "mutation ");
          const mockResponse = generateMockResponse(opName, fieldDef, schema);
          operations.push({ name: opName, queryInfo, mockResponse, exampleName: "default" });
        } catch (e) {
          console.warn(`  Warning: could not generate mock for mutation ${opName}: ${e.message}`);
        }
      }
    }

    if (operations.length === 0) {
      console.warn(`  SKIPPED ${apiFile} — no operations found.\n`);
      continue;
    }

    // Step 3: Write schema file
    const schemaFile = path.join(ARTIFACTS_DIR, `${apiFile}-schema.graphql`);
    fs.writeFileSync(schemaFile, microcksSchema, "utf8");

    // Step 4: Write Postman collection
    const postmanCollection = buildPostmanCollection(serviceName, operations);
    const postmanFile = path.join(ARTIFACTS_DIR, `${apiFile}-examples.postman.json`);
    fs.writeFileSync(postmanFile, JSON.stringify(postmanCollection, null, 2), "utf8");

    const queryCount = queryType ? Object.keys(queryType.getFields()).filter((n) => !n.startsWith("_")).length : 0;
    const mutationCount = mutationType ? Object.keys(mutationType.getFields()).filter((n) => !n.startsWith("_")).length : 0;

    console.log(`  ✓ Schema: ${schemaFile}`);
    console.log(`  ✓ Postman: ${postmanFile}`);
    console.log(`  ✓ Operations: ${queryCount} queries, ${mutationCount} mutations (${operations.length} examples)\n`);

    summary.push({ service: serviceName, file: apiFile, queries: queryCount, mutations: mutationCount, examples: operations.length });
  }

  console.log("\n═══ SUMMARY ═══");
  console.log(`Services processed: ${summary.length}`);
  let totalOps = 0;
  for (const s of summary) {
    const ops = s.queries + s.mutations;
    totalOps += ops;
    console.log(`  ${s.service.padEnd(28)} ${ops} ops (${s.queries}Q + ${s.mutations}M) → ${s.examples} examples`);
  }
  console.log(`Total operations: ${totalOps}`);
  console.log(`\nArtifacts written to: ${ARTIFACTS_DIR}`);
}

main();
