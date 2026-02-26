/**
 * Assertion engine for contract testing.
 * Validates responses against expected schemas and contracts.
 */

function assertStatus(actual, expected) {
  const pass = actual === expected;
  return { pass, message: pass ? `Status ${actual} OK` : `Expected status ${expected}, got ${actual}` };
}

function assertHasFields(data, fields) {
  const results = [];
  for (const field of fields) {
    const parts = field.split(".");
    let current = data;
    let found = true;
    for (const part of parts) {
      if (current == null || typeof current !== "object") { found = false; break; }
      if (Array.isArray(current)) current = current[0];
      if (!(part in current)) { found = false; break; }
      current = current[part];
    }
    results.push({
      pass: found,
      field,
      message: found ? `Field "${field}" present` : `Field "${field}" missing`,
    });
  }
  return results;
}

function assertFieldTypes(data, fieldTypeMap) {
  const results = [];
  for (const [field, expectedType] of Object.entries(fieldTypeMap)) {
    const value = getNestedValue(data, field);
    const actualType = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    let pass = false;

    if (expectedType === "string") pass = actualType === "string";
    else if (expectedType === "number" || expectedType === "int" || expectedType === "float") pass = actualType === "number";
    else if (expectedType === "boolean") pass = actualType === "boolean";
    else if (expectedType === "array") pass = actualType === "array";
    else if (expectedType === "object") pass = actualType === "object";
    else if (expectedType === "null") pass = actualType === "null";
    else if (expectedType === "nullable") pass = true;
    else pass = actualType === expectedType;

    results.push({
      pass,
      field,
      expectedType,
      actualType,
      message: pass ? `"${field}" is ${expectedType}` : `"${field}" expected ${expectedType}, got ${actualType}`,
    });
  }
  return results;
}

function assertNoErrors(response) {
  if (response.data && response.data.errors) {
    return { pass: false, message: `GraphQL errors: ${JSON.stringify(response.data.errors)}` };
  }
  return { pass: true, message: "No GraphQL errors" };
}

function assertMatchesContract(response, contract) {
  const results = [];

  if (contract.status) {
    results.push(assertStatus(response.status, contract.status));
  }

  if (contract.fields) {
    const dataRoot = response.data?.data || response.data;
    results.push(...assertHasFields(dataRoot, contract.fields));
  }

  if (contract.fieldTypes) {
    const dataRoot = response.data?.data || response.data;
    results.push(...assertFieldTypes(dataRoot, contract.fieldTypes));
  }

  if (contract.noErrors) {
    results.push(assertNoErrors(response));
  }

  if (contract.headers) {
    for (const [key, expected] of Object.entries(contract.headers)) {
      const actual = response.headers[key.toLowerCase()];
      const pass = actual === expected;
      results.push({ pass, message: pass ? `Header "${key}" = "${expected}"` : `Header "${key}": expected "${expected}", got "${actual}"` });
    }
  }

  if (contract.maxResponseTime) {
    const pass = response.elapsed <= contract.maxResponseTime;
    results.push({ pass, message: pass ? `Response time ${response.elapsed}ms <= ${contract.maxResponseTime}ms` : `Response time ${response.elapsed}ms > ${contract.maxResponseTime}ms` });
  }

  return results;
}

function getNestedValue(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    if (Array.isArray(current)) current = current[0];
    current = current[part];
  }
  return current;
}

module.exports = {
  assertStatus,
  assertHasFields,
  assertFieldTypes,
  assertNoErrors,
  assertMatchesContract,
};
