import React, { useState } from 'react';
import { GitBranch, Play, CheckCircle, XCircle, Code } from 'lucide-react';

interface PipelineExample {
  name: string;
  platform: string;
  description: string;
  code: string;
}

export const CICDIntegration: React.FC = () => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>('consumer-github');

  const pipelines: Record<string, PipelineExample> = {
    'consumer-github': {
      name: 'Consumer Pipeline (GitHub Actions)',
      platform: 'GitHub Actions',
      description: 'Consumer runs tests, generates Pact, and publishes to broker',
      code: `# .github/workflows/consumer-tests.yml
name: Consumer Contract Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run Pact tests
        run: npm run test:pact
        # This generates pact files in ./pacts/

      - name: Publish Pacts to Broker
        if: success()
        run: |
          npm run pact:publish
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT: \${{ github.sha }}
          GIT_BRANCH: \${{ github.ref_name }}

      - name: Can I Deploy?
        if: github.ref == 'refs/heads/main'
        run: |
          npx pact-broker can-i-deploy \\
            --pacticipant mobile-app \\
            --version \${{ github.sha }} \\
            --to-environment production
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}

      - name: Deploy to Production
        if: success() && github.ref == 'refs/heads/main'
        run: npm run deploy:production`
    },
    'provider-github': {
      name: 'Provider Pipeline (GitHub Actions)',
      platform: 'GitHub Actions',
      description: 'Provider verifies contracts and publishes results to broker',
      code: `# .github/workflows/provider-verification.yml
name: Provider Contract Verification

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  # Webhook trigger from Pact Broker when new contracts published
  repository_dispatch:
    types: [pact-changed]

jobs:
  verify-contracts:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start provider service
        run: |
          npm run start:test &
          sleep 10  # Wait for service to be ready

      - name: Verify Pacts
        run: npm run pact:verify
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT: \${{ github.sha }}
          GIT_BRANCH: \${{ github.ref_name }}
          PROVIDER_BASE_URL: http://localhost:4000

      - name: Publish Verification Results
        if: always()  # Publish even if verification fails
        run: |
          # Results are automatically published by @pact-foundation/pact
          echo "Verification results published to broker"

      - name: Can I Deploy Provider?
        if: github.ref == 'refs/heads/main'
        run: |
          npx pact-broker can-i-deploy \\
            --pacticipant graphql-gateway \\
            --version \${{ github.sha }} \\
            --to-environment production
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}`
    },
    'consumer-gitlab': {
      name: 'Consumer Pipeline (GitLab CI)',
      platform: 'GitLab CI',
      description: 'Consumer pipeline for GitLab',
      code: `# .gitlab-ci.yml
stages:
  - test
  - publish
  - deploy

variables:
  PACT_BROKER_BASE_URL: $PACT_BROKER_URL
  PACT_BROKER_TOKEN: $PACT_BROKER_TOKEN

contract-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:pact
  artifacts:
    paths:
      - pacts/
    expire_in: 1 day

publish-pacts:
  stage: publish
  image: node:18
  dependencies:
    - contract-tests
  script:
    - npm ci
    - |
      npx pact-broker publish pacts/ \\
        --consumer-app-version $CI_COMMIT_SHA \\
        --branch $CI_COMMIT_REF_NAME \\
        --tag $CI_COMMIT_REF_NAME
  only:
    - main
    - develop

can-i-deploy:
  stage: deploy
  image: node:18
  script:
    - |
      npx pact-broker can-i-deploy \\
        --pacticipant mobile-app \\
        --version $CI_COMMIT_SHA \\
        --to-environment production
  only:
    - main

deploy-production:
  stage: deploy
  script:
    - npm run deploy:production
  dependencies:
    - can-i-deploy
  only:
    - main
  when: on_success`
    },
    'provider-gitlab': {
      name: 'Provider Pipeline (GitLab CI)',
      platform: 'GitLab CI',
      description: 'Provider verification for GitLab',
      code: `# .gitlab-ci.yml
stages:
  - verify
  - deploy

variables:
  PACT_BROKER_BASE_URL: $PACT_BROKER_URL
  PACT_BROKER_TOKEN: $PACT_BROKER_TOKEN

verify-contracts:
  stage: verify
  image: node:18
  services:
    - postgres:14  # If your provider needs a database
  script:
    - npm ci
    - npm run start:test &
    - sleep 10
    - |
      npm run pact:verify -- \\
        --provider-version=$CI_COMMIT_SHA \\
        --provider-version-branch=$CI_COMMIT_REF_NAME
  artifacts:
    when: always
    reports:
      junit: pact-verification-results.xml

can-i-deploy-provider:
  stage: deploy
  image: node:18
  script:
    - |
      npx pact-broker can-i-deploy \\
        --pacticipant graphql-gateway \\
        --version $CI_COMMIT_SHA \\
        --to-environment production
  only:
    - main`
    },
    'webhook': {
      name: 'Pact Broker Webhook Configuration',
      platform: 'Pact Broker',
      description: 'Trigger provider verification when contracts change',
      code: `# Create webhook via Pact Broker API or UI

# Webhook Configuration:
{
  "consumer": "mobile-app",
  "provider": "graphql-gateway",
  "description": "Trigger provider build when mobile-app contract changes",
  "events": [
    {
      "name": "contract_content_changed"
    }
  ],
  "request": {
    "method": "POST",
    "url": "https://api.github.com/repos/your-org/graphql-gateway/dispatches",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
      "Authorization": "Bearer \${user.githubToken}"
    },
    "body": {
      "event_type": "pact-changed",
      "client_payload": {
        "pact_url": "\${pactbroker.pactUrl}",
        "consumer": "\${pactbroker.consumerName}",
        "provider": "\${pactbroker.providerName}"
      }
    }
  }
}

# Or use CLI:
pact-broker create-webhook \\
  "https://api.github.com/repos/your-org/graphql-gateway/dispatches" \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --header "Authorization: Bearer \${user.githubToken}" \\
  --data '{"event_type": "pact-changed"}' \\
  --consumer mobile-app \\
  --provider graphql-gateway \\
  --contract-content-changed`
    },
    'package-json': {
      name: 'Package.json Scripts',
      platform: 'npm',
      description: 'NPM scripts for Pact commands',
      code: `// package.json
{
  "name": "mobile-app",
  "version": "1.2.3",
  "scripts": {
    // Consumer scripts
    "test": "jest",
    "test:pact": "jest --testMatch='**/*.pact.test.js'",
    "pact:publish": "pact-broker publish pacts/ --consumer-app-version=$GIT_COMMIT --branch=$GIT_BRANCH",
    
    // Provider scripts
    "start:test": "NODE_ENV=test node server.js",
    "pact:verify": "node tests/pact.verify.js",
    
    // Can-I-Deploy
    "can-i-deploy": "pact-broker can-i-deploy --pacticipant mobile-app --version=$GIT_COMMIT --to-environment production",
    
    // Deployment
    "deploy:production": "echo 'Deploying to production...'"
  },
  "devDependencies": {
    "@pact-foundation/pact": "^12.0.0",
    "@pact-foundation/pact-node": "^10.17.0"
  }
}`
    }
  };

  const pipeline = pipelines[selectedPipeline];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CI/CD Integration</h2>
          <p className="text-sm text-gray-600">Automate contract testing in your pipelines</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          🚀 <strong>CI/CD Integration:</strong> Automate contract testing in your build pipelines. 
          Consumers publish contracts, providers verify them, and can-i-deploy checks prevent breaking changes 
          from reaching production.
        </p>
      </div>

      {/* Pipeline Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Pipeline Example:
        </label>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(pipelines).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setSelectedPipeline(key)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedPipeline === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 mb-1">{p.name}</div>
              <div className="text-xs text-gray-600">{p.platform}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Description */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">{pipeline.description}</p>
      </div>

      {/* Code */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Code className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{pipeline.name}</h3>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
            <code>{pipeline.code}</code>
          </pre>
        </div>
      </div>

      {/* Workflow Diagram */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">🔄 Complete CI/CD Workflow</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">1</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Consumer: Run Tests</div>
                <code className="text-xs text-gray-600">npm run test:pact</code>
                <div className="text-xs text-gray-500 mt-1">Generates pact files locally</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">2</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Consumer: Publish to Broker</div>
                <code className="text-xs text-gray-600">pact-broker publish pacts/</code>
                <div className="text-xs text-gray-500 mt-1">Uploads contracts to central broker</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">3</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Broker: Trigger Webhook</div>
                <code className="text-xs text-gray-600">POST /repos/.../dispatches</code>
                <div className="text-xs text-gray-500 mt-1">Notifies provider of contract change</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">4</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Provider: Verify Contracts</div>
                <code className="text-xs text-gray-600">npm run pact:verify</code>
                <div className="text-xs text-gray-500 mt-1">Fetches contracts and verifies against provider</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">5</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Provider: Publish Results</div>
                <code className="text-xs text-gray-600">Verification results → Broker</code>
                <div className="text-xs text-gray-500 mt-1">Updates verification matrix</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">6</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Can-I-Deploy Check</div>
                <code className="text-xs text-gray-600">pact-broker can-i-deploy</code>
                <div className="text-xs text-gray-500 mt-1">Checks if all contracts verified before deploy</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">7</div>
            <div className="flex-1">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-medium text-sm mb-1">Deploy to Production</div>
                <code className="text-xs text-gray-600">npm run deploy:production</code>
                <div className="text-xs text-gray-500 mt-1">✅ Safe to deploy!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-900 mb-3">🔐 Required Environment Variables</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <code className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono">PACT_BROKER_BASE_URL</code>
            <span className="text-yellow-800">URL of your Pact Broker (e.g., https://pact-broker.yourcompany.com)</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono">PACT_BROKER_TOKEN</code>
            <span className="text-yellow-800">Authentication token for Pact Broker API</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono">GIT_COMMIT</code>
            <span className="text-yellow-800">Git commit SHA for versioning</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono">GIT_BRANCH</code>
            <span className="text-yellow-800">Git branch name for tagging</span>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Best Practices</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Run contract tests on every commit</li>
            <li>• Use webhooks to trigger provider builds</li>
            <li>• Always check can-i-deploy before deploying</li>
            <li>• Tag contracts with branch names</li>
            <li>• Publish verification results even on failure</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use separate Pact Broker for staging/prod</li>
            <li>• Cache node_modules for faster builds</li>
            <li>• Run provider verification on schedule (nightly)</li>
            <li>• Send Slack notifications on failures</li>
            <li>• Use matrix builds for multiple consumers</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
