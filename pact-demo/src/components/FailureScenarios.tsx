import React, { useState } from 'react';
import { XCircle, AlertTriangle, Code, Wrench } from 'lucide-react';

interface FailureScenario {
  title: string;
  description: string;
  consumerExpectation: string;
  providerResponse: string;
  error: string;
  fix: string;
  severity: 'breaking' | 'warning';
}

export const FailureScenarios: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);

  const scenarios: FailureScenario[] = [
    {
      title: 'Field Removed (Breaking Change)',
      description: 'Provider removed a field that consumer depends on',
      severity: 'breaking',
      consumerExpectation: `// Consumer expects this response:
{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1-555-0123"  // 👈 Consumer needs this
}`,
      providerResponse: `// Provider now returns:
{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com"
  // ❌ phoneNumber field removed!
}`,
      error: `❌ Verification Failed

Failures:

  1) Verifying a pact between mobile-app and user-api
     - GET /users/12345
       Actual response does not match expected response

     Diff:
     {
       "id": "12345",
       "name": "John Doe",
       "email": "john@example.com",
     - "phoneNumber": "+1-555-0123"  // Expected but missing
     }

     Missing required field: phoneNumber`,
      fix: `// Option 1: Provider adds field back
{
  "phoneNumber": user.phoneNumber || null
}

// Option 2: Consumer updates contract (if field no longer needed)
// Remove phoneNumber from expected response

// Option 3: Deprecation strategy
// 1. Provider marks field as deprecated
// 2. Consumer updates to not require it
// 3. Provider removes field in next version`
    },
    {
      title: 'Type Changed (Breaking Change)',
      description: 'Provider changed the data type of a field',
      severity: 'breaking',
      consumerExpectation: `// Consumer expects:
{
  "orderId": "ABC123",        // 👈 String
  "total": 49.99,
  "quantity": 2
}`,
      providerResponse: `// Provider now returns:
{
  "orderId": 12345,           // ❌ Changed to number!
  "total": 49.99,
  "quantity": 2
}`,
      error: `❌ Verification Failed

Failures:

  1) Verifying a pact between web-app and order-api
     - POST /orders
       Type mismatch at $.orderId

     Expected: String
     Actual:   Number

     This is a BREAKING CHANGE that will cause runtime errors!`,
      fix: `// Option 1: Provider reverts to string
{
  "orderId": order.id.toString()
}

// Option 2: Create new field, deprecate old one
{
  "orderId": "ABC123",      // Keep for backwards compatibility
  "orderIdNumeric": 12345,  // New field
  "total": 49.99
}

// Option 3: Version the API
// v1: orderId as string
// v2: orderId as number`
    },
    {
      title: 'Required Field Made Optional',
      description: 'Provider made a required field optional (can return null)',
      severity: 'warning',
      consumerExpectation: `// Consumer expects:
{
  "userId": "12345",
  "username": "johndoe",      // 👈 Always present
  "email": "john@example.com"
}`,
      providerResponse: `// Provider now returns:
{
  "userId": "12345",
  "username": null,           // ❌ Can be null now!
  "email": "john@example.com"
}`,
      error: `⚠️ Verification Warning

Potential Issues:

  1) Verifying a pact between admin-portal and user-api
     - GET /users/12345
       Field 'username' is now nullable

     Consumer code may not handle null values:
     
     // This will crash:
     const displayName = user.username.toUpperCase();
     // TypeError: Cannot read property 'toUpperCase' of null`,
      fix: `// Consumer must handle null:
const displayName = user.username?.toUpperCase() || 'N/A';

// Or update contract to allow null:
.willRespondWith({
  status: 200,
  body: {
    userId: like('12345'),
    username: like('johndoe').or(null),  // 👈 Allow null
    email: like('john@example.com')
  }
})`
    },
    {
      title: 'New Required Field Added',
      description: 'Provider added a new required field that consumer doesn\'t expect',
      severity: 'warning',
      consumerExpectation: `// Consumer expects:
{
  "productId": "PROD-001",
  "name": "Widget",
  "price": 29.99
}`,
      providerResponse: `// Provider now returns:
{
  "productId": "PROD-001",
  "name": "Widget",
  "price": 29.99,
  "taxRate": 0.08           // ❌ New required field
}`,
      error: `⚠️ Verification Passed (with warning)

Note: Provider is returning additional fields not in contract.

This is usually SAFE because:
- Consumer ignores unknown fields
- Contract only specifies minimum requirements

However, be aware:
- Response payload is larger
- May indicate API drift from documentation`,
      fix: `// Usually no fix needed! Pact allows extra fields.

// But you should:
// 1. Update consumer contract to include new field
.willRespondWith({
  body: {
    productId: like('PROD-001'),
    name: like('Widget'),
    price: like(29.99),
    taxRate: like(0.08)  // 👈 Add to contract
  }
})

// 2. Update API documentation
// 3. Notify consumer teams of new field`
    },
    {
      title: 'Status Code Changed',
      description: 'Provider changed the HTTP status code for an endpoint',
      severity: 'breaking',
      consumerExpectation: `// Consumer expects:
POST /orders
Status: 201 Created

{
  "orderId": "ABC123",
  "status": "pending"
}`,
      providerResponse: `// Provider now returns:
POST /orders
Status: 200 OK           // ❌ Changed from 201 to 200

{
  "orderId": "ABC123",
  "status": "pending"
}`,
      error: `❌ Verification Failed

Failures:

  1) Verifying a pact between mobile-app and order-api
     - POST /orders
       Status code mismatch

     Expected: 201
     Actual:   200

     Consumer may have logic based on status codes:
     
     if (response.status === 201) {
       // Show success message
     } else {
       // Show error - WRONG!
     }`,
      fix: `// Option 1: Provider reverts to 201
return res.status(201).json(order);

// Option 2: Consumer updates contract
.willRespondWith({
  status: 200,  // 👈 Update expectation
  body: { ... }
})

// Option 3: Provider supports both (transition period)
// Accept 200 or 201 as valid`
    },
    {
      title: 'Response Structure Changed',
      description: 'Provider changed the nesting structure of the response',
      severity: 'breaking',
      consumerExpectation: `// Consumer expects flat structure:
{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com",
  "city": "New York"
}`,
      providerResponse: `// Provider now returns nested structure:
{
  "id": "12345",
  "name": "John Doe",
  "email": "john@example.com",
  "address": {              // ❌ Nested now!
    "city": "New York",
    "state": "NY"
  }
}`,
      error: `❌ Verification Failed

Failures:

  1) Verifying a pact between web-app and user-api
     - GET /users/12345
       Structure mismatch

     Expected: $.city (string)
     Actual:   $.city (undefined)
     Found:    $.address.city (string)

     Consumer code will break:
     const city = user.city;  // undefined!`,
      fix: `// Option 1: Provider keeps flat structure
{
  "id": "12345",
  "name": "John Doe",
  "city": "New York"  // Keep flat
}

// Option 2: Provider returns both (transition)
{
  "id": "12345",
  "name": "John Doe",
  "city": "New York",        // Deprecated but kept
  "address": {
    "city": "New York",      // New structure
    "state": "NY"
  }
}

// Option 3: Consumer updates to use nested structure
const city = user.address?.city;`
    }
  ];

  const scenario = scenarios[selectedScenario];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <XCircle className="w-8 h-8 text-red-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Failure Scenarios & Debugging</h2>
          <p className="text-sm text-gray-600">Common contract failures and how to fix them</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 <strong>Why Contracts Fail:</strong> Contract tests fail when the provider's actual behavior 
          doesn't match what the consumer expects. This catches breaking changes BEFORE they reach production!
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select a Failure Scenario:
        </label>
        <div className="grid grid-cols-2 gap-3">
          {scenarios.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedScenario(idx)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedScenario === idx
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {s.severity === 'breaking' ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="font-medium text-sm text-gray-900">{s.title}</span>
              </div>
              <div className="text-xs text-gray-600">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Badge */}
      <div className="mb-4">
        {scenario.severity === 'breaking' ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Breaking Change
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Warning
          </span>
        )}
      </div>

      {/* Scenario Details */}
      <div className="space-y-4">
        {/* Consumer Expectation */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Consumer Expectation</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{scenario.consumerExpectation}</code>
            </pre>
          </div>
        </div>

        {/* Provider Response */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Provider Actual Response</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{scenario.providerResponse}</code>
            </pre>
          </div>
        </div>

        {/* Error Message */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Verification Error</h3>
          </div>
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <pre className="text-sm text-red-900 whitespace-pre-wrap font-mono">
              {scenario.error}
            </pre>
          </div>
        </div>

        {/* Fix */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">How to Fix</h3>
          </div>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <pre className="text-sm text-green-900 whitespace-pre-wrap font-mono">
              {scenario.fix}
            </pre>
          </div>
        </div>
      </div>

      {/* Debugging Tips */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">🔍 Debugging Tips</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">1. Check the Diff</h4>
            <p className="text-xs text-gray-700">
              Pact shows exactly what's different between expected and actual. Look for the "-" (missing) and "+" (extra) markers.
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">2. Run Provider Locally</h4>
            <p className="text-xs text-gray-700">
              Start the provider service locally and manually test the endpoint to see what it actually returns.
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">3. Check Provider States</h4>
            <p className="text-xs text-gray-700">
              Ensure provider states are set up correctly. Missing test data is a common cause of failures.
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">4. Use Pact Broker Logs</h4>
            <p className="text-xs text-gray-700">
              Check the Pact Broker for verification history. See when the failure started and what changed.
            </p>
          </div>
        </div>
      </div>

      {/* Prevention Tips */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Prevention Strategies</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Run provider verification in CI/CD</li>
            <li>• Use can-i-deploy before releasing</li>
            <li>• Version your APIs properly</li>
            <li>• Communicate changes to consumers</li>
            <li>• Use deprecation periods for breaking changes</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">🔄 Safe Change Process</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Provider adds new field (non-breaking)</li>
            <li>2. Consumers update to use new field</li>
            <li>3. Wait for all consumers to migrate</li>
            <li>4. Provider removes old field (breaking)</li>
            <li>5. All changes verified by Pact!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
