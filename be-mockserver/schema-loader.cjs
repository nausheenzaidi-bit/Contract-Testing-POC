const fs = require("fs");
const path = require("path");
const { buildSchema } = require("graphql");

const WORKSPACE = path.join(__dirname, "..");

function discoverSchemaFiles() {
  const files = [];
  // Load individual service schemas first so they get proper service attribution
  for (const entry of fs.readdirSync(WORKSPACE)) {
    if (entry.endsWith("-api")) {
      const fp = path.join(WORKSPACE, entry);
      if (fs.statSync(fp).isFile()) {
        files.push({ service: entry.replace(/-api$/, ""), file: fp });
      }
    }
  }
  // Main schema last — fills in any gaps
  const mainSchema = path.join(WORKSPACE, "schema.graphql");
  if (fs.existsSync(mainSchema)) {
    files.push({ service: "main", file: mainSchema });
  }
  return files;
}

function stripFederationDirectives(sdl) {
  let cleaned = sdl;

  // Remove `extend schema` blocks (with or without @link, with or without body braces)
  // First handle ones with body: extend schema @link(...) { query: Query }
  cleaned = cleaned.replace(/extend\s+schema[\s\S]*?\{[^}]*\}/g, "");
  // Then handle ones without body: extend schema @link(...)
  cleaned = cleaned.replace(/extend\s+schema\s*\n\s*@link\([\s\S]*?\)\s*/g, "");

  // Remove ALL directive declarations (potentially multiline)
  // Process line by line to avoid greedy cross-line matching
  const dirLines = cleaned.split("\n");
  const dirResult = [];
  let inDirective = false;
  for (const line of dirLines) {
    if (/^\s*directive\s+@/.test(line)) {
      inDirective = true;
    }
    if (inDirective) {
      if (/\b(FIELD_DEFINITION|OBJECT|INTERFACE|UNION|ENUM|INPUT_OBJECT|SCALAR|SCHEMA|ENUM_VALUE|INPUT_FIELD_DEFINITION|ARGUMENT_DEFINITION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|MUTATION|QUERY|SUBSCRIPTION)\b/.test(line)) {
        inDirective = false;
      }
      continue;
    }
    dirResult.push(line);
  }
  cleaned = dirResult.join("\n");

  // Remove directive usages — handle quoted strings inside parens (e.g. @requires(fields: "complex { ... }"))
  function stripDirectiveUsages(s) {
    let result = "";
    let i = 0;
    while (i < s.length) {
      if (s[i] === "@" && /[a-zA-Z]/.test(s[i + 1] || "")) {
        let j = i + 1;
        while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
        // Skip whitespace
        while (j < s.length && /\s/.test(s[j])) j++;
        if (s[j] === "(") {
          let depth = 1;
          j++;
          while (j < s.length && depth > 0) {
            if (s[j] === '"') {
              j++;
              while (j < s.length && s[j] !== '"') {
                if (s[j] === "\\") j++;
                j++;
              }
            }
            if (s[j] === "(") depth++;
            if (s[j] === ")") depth--;
            j++;
          }
        }
        i = j;
      } else {
        result += s[i];
        i++;
      }
    }
    return result;
  }
  cleaned = stripDirectiveUsages(cleaned);

  // Convert `extend type Foo { ... }` into `type Foo { ... }`
  cleaned = cleaned.replace(/extend\s+type\s+/g, "type ");

  // Remove federation scalars
  cleaned = cleaned.replace(/scalar\s+_FieldSet\b/g, "");
  cleaned = cleaned.replace(/scalar\s+_Any\b/g, "");
  cleaned = cleaned.replace(/scalar\s+link__Import\b/g, "");
  cleaned = cleaned.replace(/scalar\s+link__Purpose\b/g, "");

  // Remove _entities and _service query fields
  cleaned = cleaned.replace(/\s*_entities\([^)]*\):\s*\[[^\]]*\]!?/g, "");
  cleaned = cleaned.replace(/\s*_service:\s*_Service!?/g, "");

  // Remove _Service type and _Entity union
  cleaned = cleaned.replace(/type\s+_Service\s*\{[^}]*\}/gs, "");
  cleaned = cleaned.replace(/union\s+_Entity\s*=[^\n]*/g, "");

  // Remove CacheControlScope enum
  cleaned = cleaned.replace(/enum\s+CacheControlScope\s*\{[^}]*\}/gs, "");

  // Remove block string descriptions (triple-quoted) before any definition
  cleaned = cleaned.replace(/"""[\s\S]*?"""\s*/g, "");

  // Ensure common custom scalars are declared (if types reference them)
  const commonScalars = [
    "Date", "DateTime", "DateTimeISO", "JSON", "JSONObject", "Upload", "Time",
    "BigInt", "Long", "Void", "UUID", "URL", "PositiveInt", "NonNegativeInt",
    "NonNegativeFloat", "NonEmptyString", "EmailAddress", "PhoneNumber", "USCurrency",
    "JWT", "Duration", "Locale",
  ];
  for (const s of commonScalars) {
    if (cleaned.includes(s) && !new RegExp(`scalar\\s+${s}\\b`).test(cleaned)) {
      cleaned = `scalar ${s}\n` + cleaned;
    }
  }

  // Remove empty type blocks
  cleaned = cleaned.replace(/type\s+\w+\s*\{\s*\}/g, "");

  // Remove duplicate blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

function deduplicateSchema(sdl) {
  const typeNames = new Set();
  const enumNames = new Set();
  const scalarNames = new Set();
  const inputNames = new Set();
  const unionNames = new Set();
  const interfaceNames = new Set();

  const lines = sdl.split("\n");
  const result = [];
  let skip = false;
  let braceDepth = 0;
  let currentBlock = null;

  for (const line of lines) {
    const typeMatch = line.match(/^(type|input|interface)\s+(\w+)/);
    const enumMatch = line.match(/^enum\s+(\w+)/);
    const scalarMatch = line.match(/^scalar\s+(\w+)/);
    const unionMatch = line.match(/^union\s+(\w+)/);

    if (typeMatch && !skip) {
      const [, kind, name] = typeMatch;
      const sets = { type: typeNames, input: inputNames, interface: interfaceNames };
      const set = sets[kind];
      if (name === "Query" || name === "Mutation") {
        // Always keep Query/Mutation — they get merged later
        result.push(line);
        continue;
      }
      if (set.has(name)) {
        skip = true;
        braceDepth = 0;
        currentBlock = kind;
      } else {
        set.add(name);
        result.push(line);
      }
      continue;
    }

    if (enumMatch && !skip) {
      const name = enumMatch[1];
      if (enumNames.has(name)) {
        skip = true;
        braceDepth = 0;
      } else {
        enumNames.add(name);
        result.push(line);
      }
      continue;
    }

    if (scalarMatch && !skip) {
      const name = scalarMatch[1];
      if (scalarNames.has(name)) continue;
      scalarNames.add(name);
      result.push(line);
      continue;
    }

    if (unionMatch && !skip) {
      const name = unionMatch[1];
      if (unionNames.has(name)) {
        skip = true;
        braceDepth = 0;
      } else {
        unionNames.add(name);
        result.push(line);
      }
      continue;
    }

    if (skip) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0 && line.includes("}")) {
        skip = false;
        currentBlock = null;
      }
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

let _allSchemas = null;

function loadAllSchemas() {
  if (_allSchemas) return _allSchemas;

  const files = discoverSchemaFiles();
  const schemas = [];

  for (const { service, file } of files) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      let cleaned = stripFederationDirectives(raw);

      // Ensure schema block exists
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

      // Deduplicate types within the single file
      cleaned = deduplicateSchema(cleaned);

      // Try building; if unknown types, add them as scalars and retry
      let schema;
      let attempts = 0;
      let sdl = cleaned;
      while (attempts < 5) {
        try {
          schema = buildSchema(sdl);
          break;
        } catch (err) {
          const unknowns = [...(err.message || "").matchAll(/Unknown type "(\w+)"/g)].map(m => m[1]);
          const unique = [...new Set(unknowns)];
          if (unique.length === 0) throw err;
          sdl = unique.map(t => `scalar ${t}`).join("\n") + "\n" + sdl;
          attempts++;
        }
      }
      if (!schema) schema = buildSchema(sdl);
      schemas.push({ service, schema, sdl });
      console.log(`[schema-loader] Loaded ${service} (${file})`);
    } catch (err) {
      console.warn(`[schema-loader] Failed to load ${service}: ${err.message.split("\n")[0]}`);
    }
  }

  _allSchemas = schemas;
  return schemas;
}

function getAllSchemaDocs() {
  const schemas = loadAllSchemas();
  const result = { queries: [], mutations: [] };
  const seenQueries = new Set();
  const seenMutations = new Set();

  for (const { service, schema } of schemas) {
    const queryType = schema.getQueryType();
    if (queryType) {
      for (const [name, field] of Object.entries(queryType.getFields())) {
        if (seenQueries.has(name)) continue;
        seenQueries.add(name);
        const args = (field.args || []).map((a) => ({ name: a.name, type: a.type.toString() }));
        const returnType = field.type.toString();
        const returnTypeName = returnType.replace(/[\[\]!]/g, "");
        const returnTypeObj = schema.getType(returnTypeName);
        let returnFields = null;
        if (returnTypeObj && typeof returnTypeObj.getFields === "function") {
          returnFields = Object.entries(returnTypeObj.getFields()).map(
            ([fn, fv]) => ({ name: fn, type: fv.type.toString() }),
          );
        }
        result.queries.push({ name, args, returnType, returnFields, service });
      }
    }

    const mutationType = schema.getMutationType();
    if (mutationType) {
      for (const [name, field] of Object.entries(mutationType.getFields())) {
        if (seenMutations.has(name)) continue;
        seenMutations.add(name);
        const args = (field.args || []).map((a) => ({ name: a.name, type: a.type.toString() }));
        const returnType = field.type.toString();
        const returnTypeName = returnType.replace(/[\[\]!]/g, "");
        const returnTypeObj = schema.getType(returnTypeName);
        let returnFields = null;
        if (returnTypeObj && typeof returnTypeObj.getFields === "function") {
          returnFields = Object.entries(returnTypeObj.getFields()).map(
            ([fn, fv]) => ({ name: fn, type: fv.type.toString() }),
          );
        }
        result.mutations.push({ name, args, returnType, returnFields, service });
      }
    }
  }

  return result;
}

function getSchemaForOperation(operationName) {
  const schemas = loadAllSchemas();
  const opLower = (operationName || "").toLowerCase();
  for (const { schema } of schemas) {
    const qt = schema.getQueryType();
    if (qt) {
      const fields = qt.getFields();
      for (const fn of Object.keys(fields)) {
        if (fn.toLowerCase() === opLower) return schema;
      }
    }
    const mt = schema.getMutationType();
    if (mt) {
      const fields = mt.getFields();
      for (const fn of Object.keys(fields)) {
        if (fn.toLowerCase() === opLower) return schema;
      }
    }
  }
  return null;
}

function clearCache() {
  _allSchemas = null;
}

module.exports = {
  loadAllSchemas,
  getAllSchemaDocs,
  getSchemaForOperation,
  clearCache,
  discoverSchemaFiles,
};
