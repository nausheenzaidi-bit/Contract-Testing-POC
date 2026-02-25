import React, { useState } from 'react';
import { Database, Code, CheckCircle, AlertCircle } from 'lucide-react';

interface ProviderState {
  name: string;
  description: string;
  setupCode: string;
  teardownCode: string;
}

export const ProviderStatesDemo: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('user-exists');

  const providerStates: Record<string, ProviderState> = {
    'user-exists': {
      name: 'user with id 12345 exists',
      description: 'Sets up a user in the database so the provider can return it when requested',
      setupCode: `// Provider State Setup (runs BEFORE verification)
async function setupUserExists() {
  await db.users.create({
    id: '12345',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active'
  });
  console.log('✅ User 12345 created');
}`,
      teardownCode: `// Provider State Teardown (runs AFTER verification)
async function teardownUserExists() {
  await db.users.delete({ id: '12345' });
  console.log('🧹 User 12345 cleaned up');
}`
    },
    'user-not-found': {
      name: 'user with id 99999 does not exist',
      description: 'Ensures the user does NOT exist so provider returns 404',
      setupCode: `// Provider State Setup
async function setupUserNotFound() {
  // Ensure user doesn't exist
  await db.users.delete({ id: '99999' });
  console.log('✅ User 99999 removed (if existed)');
}`,
      teardownCode: `// Provider State Teardown
async function teardownUserNotFound() {
  // No cleanup needed
  console.log('🧹 No cleanup required');
}`
    },
    'order-pending': {
      name: 'order with id ABC123 is pending',
      description: 'Creates an order in pending status for testing order workflows',
      setupCode: `// Provider State Setup
async function setupOrderPending() {
  await db.orders.create({
    id: 'ABC123',
    userId: '12345',
    status: 'pending',
    items: [
      { productId: 'PROD-001', quantity: 2 }
    ],
    total: 49.99,
    createdAt: new Date()
  });
  console.log('✅ Order ABC123 created as pending');
}`,
      teardownCode: `// Provider State Teardown
async function teardownOrderPending() {
  await db.orders.delete({ id: 'ABC123' });
  console.log('🧹 Order ABC123 cleaned up');
}`
    },
    'empty-cart': {
      name: 'user cart is empty',
      description: 'Ensures the shopping cart is empty for testing empty state',
      setupCode: `// Provider State Setup
async function setupEmptyCart() {
  await db.carts.deleteMany({ userId: '12345' });
  console.log('✅ Cart emptied for user 12345');
}`,
      teardownCode: `// Provider State Teardown
async function teardownEmptyCart() {
  // No cleanup needed
  console.log('🧹 No cleanup required');
}`
    }
  };

  const state = providerStates[selectedState];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provider States</h2>
          <p className="text-sm text-gray-600">How providers set up test data before verification</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-900 mb-2">🤔 What are Provider States?</h3>
        <p className="text-sm text-purple-800 mb-3">
          Provider states describe the <strong>preconditions</strong> that must be true before the provider can 
          respond to a request. They allow you to test different scenarios (success, error, edge cases) without 
          maintaining a full test database.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white p-3 rounded border border-purple-200">
            <h4 className="font-semibold text-purple-900 text-sm mb-1">Consumer Side:</h4>
            <code className="text-xs text-purple-700">
              .given("user with id 12345 exists")
            </code>
          </div>
          <div className="bg-white p-3 rounded border border-purple-200">
            <h4 className="font-semibold text-purple-900 text-sm mb-1">Provider Side:</h4>
            <code className="text-xs text-purple-700">
              stateHandlers["user..."] = setup()
            </code>
          </div>
        </div>
      </div>

      {/* State Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a Provider State:
        </label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(providerStates).map(([key, state]) => (
            <button
              key={key}
              onClick={() => setSelectedState(key)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedState === key
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{state.name}</div>
              <div className="text-xs text-gray-600 mt-1">{state.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Examples */}
      <div className="space-y-4">
        {/* Consumer Test Code */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">1. Consumer Test (Defines State)</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{`// Consumer test file (e.g., mobile-app/tests/user.pact.test.js)

describe('GET /users/:id', () => {
  it('returns user when user exists', async () => {
    await provider
      .given('${state.name}')  // 👈 Define the state
      .uponReceiving('a request for user 12345')
      .withRequest({
        method: 'GET',
        path: '/users/12345'
      })
      .willRespondWith({
        status: 200,
        body: {
          id: '12345',
          name: like('John Doe'),
          email: like('john@example.com')
        }
      });

    // Run the test
    const response = await api.getUser('12345');
    expect(response.id).toBe('12345');
  });
});`}</code>
            </pre>
          </div>
        </div>

        {/* Provider Setup Code */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">2. Provider Setup (Implements State)</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{state.setupCode}</code>
            </pre>
          </div>
        </div>

        {/* Provider Verification Code */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">3. Provider Verification (Uses State)</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{`// Provider verification file (e.g., graphql-gateway/tests/pact.verify.js)

const { Verifier } = require('@pact-foundation/pact');

new Verifier({
  provider: 'graphql-gateway',
  providerBaseUrl: 'http://localhost:4000',
  pactUrls: ['./pacts/mobile-app-graphql-gateway.json'],
  
  // 👇 Register state handlers
  stateHandlers: {
    '${state.name}': setupUserExists,
    'user with id 99999 does not exist': setupUserNotFound,
    'order with id ABC123 is pending': setupOrderPending,
    'user cart is empty': setupEmptyCart
  },
  
  // Optional: Teardown after each test
  requestFilter: (req, res, next) => {
    // Add auth headers, etc.
    next();
  }
}).verifyProvider();`}</code>
            </pre>
          </div>
        </div>

        {/* Teardown Code */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">4. Provider Teardown (Cleanup)</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{state.teardownCode}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Workflow Diagram */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">🔄 Provider State Workflow</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
            <div className="flex-1 bg-white p-3 rounded shadow-sm">
              <div className="font-medium text-sm">Consumer publishes Pact with state</div>
              <code className="text-xs text-gray-600">.given("user with id 12345 exists")</code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
            <div className="flex-1 bg-white p-3 rounded shadow-sm">
              <div className="font-medium text-sm">Provider runs setup handler</div>
              <code className="text-xs text-gray-600">await setupUserExists()</code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
            <div className="flex-1 bg-white p-3 rounded shadow-sm">
              <div className="font-medium text-sm">Provider replays request</div>
              <code className="text-xs text-gray-600">GET /users/12345</code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
            <div className="flex-1 bg-white p-3 rounded shadow-sm">
              <div className="font-medium text-sm">Provider runs teardown handler</div>
              <code className="text-xs text-gray-600">await teardownUserExists()</code>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Best Practices</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Use descriptive state names</li>
            <li>• Keep states independent</li>
            <li>• Always clean up in teardown</li>
            <li>• Use test databases, not production</li>
            <li>• Make states idempotent</li>
          </ul>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">❌ Common Mistakes</h3>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• Forgetting to clean up data</li>
            <li>• States depending on each other</li>
            <li>• Using production databases</li>
            <li>• Hardcoding IDs without cleanup</li>
            <li>• Not handling async properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
