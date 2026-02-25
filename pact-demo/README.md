# Pact GraphQL Demo - Contract Testing for Microservices

An interactive demo showcasing **Pact Consumer-Driven Contract (CDC) Testing** for GraphQL microservices using your actual federated Apollo supergraph schema.

![Pact CDC Workflow](https://img.shields.io/badge/Pact-CDC%20Testing-00d9c0?style=for-the-badge)
![GraphQL](https://img.shields.io/badge/GraphQL-Federated-E10098?style=for-the-badge&logo=graphql)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation & Run

```bash
cd pact-demo
npm install
npm run dev
```

The demo will open at **http://localhost:3000**

## 🎯 What This Demo Shows

### Core Features

#### 1. **GraphQL Contracts**
- Select from real GraphQL queries from your supergraph (15 subgraphs)
- Generate Pact contracts with expected responses
- Interactive workflow visualization
- Provider verification simulation
- Can-I-Deploy safety checks

#### 2. **REST API Contracts**
- Hydration Station REST endpoints (6 endpoints)
- Request/response contract generation
- HTTP method and status code validation
- Query parameter and header testing

#### 3. **Kafka Message Contracts**
- Hydration Station Kafka messages (4 message types)
- Producer/consumer contract testing
- Message schema validation
- Topic and partition handling

#### 4. **Schema Explorer**
- Browse all queries, mutations, and types
- Filter by subgraph (ADS_API, CMS_API, etc.)
- Search operations by name
- View arguments and return types

### Advanced Features (NEW!)

#### 5. **Pact Broker Simulator** 🆕
- **Published Contracts**: View all consumer-provider contracts
- **Verification Matrix**: See which versions are compatible
- **Service Network**: Visualize microservice dependencies
- Multi-consumer scenarios (mobile-app, web-app, admin-portal)

#### 6. **Provider States Demo** 🆕
- 4 interactive provider state examples
- Complete setup/teardown code examples
- Best practices and common mistakes
- Visual workflow diagram

#### 7. **Failure Scenarios & Debugging** 🆕
- 6 real-world contract failure scenarios
- Actual Pact error messages
- Step-by-step fixes for each scenario
- Breaking vs non-breaking changes
- Debugging tips and prevention strategies

#### 8. **CI/CD Integration** 🆕
- GitHub Actions pipeline examples (consumer + provider)
- GitLab CI pipeline examples
- Webhook configuration for auto-triggering
- Complete automation workflow
- Environment variable setup
- NPM scripts and package.json configs

## 📊 Your Schema Stats

Your supergraph includes:
- **15+ Subgraphs** (ADS_API, CMS_API, CONTENT_MODULES_API, DATA_SERVICES_API, EPISODE_API, EVENT_API, HYDRATION_STATION_API, LIVELIKE_API, PUSH_NOTIFICATIONS_API, REFERENCE_STREAM_API, SOCIAL_PROCESSOR_API, SPORTS_SEARCH_API, STATS_API, TAG_API, USER_API)
- **100+ Queries** across all services
- **50+ Mutations** for data modification
- **700+ Types** in the complete schema

## 🎓 Learn About Pact

### What is Pact?
Pact is a **Consumer-Driven Contract (CDC) testing** framework that ensures microservices can communicate correctly without requiring full integration environments.

### How It Works

1. **Consumer Defines Contract**
   - Consumer writes tests with expected GraphQL responses
   - Pact generates a contract (JSON file) from these tests

2. **Publish to Broker**
   - Contract is uploaded to Pact Broker
   - Versioned and tracked across environments

3. **Provider Verification**
   - Provider fetches contracts from broker
   - Replays consumer requests against real provider
   - Validates responses match expectations

4. **Can-I-Deploy Check**
   - Before deployment, check if all contracts are verified
   - Prevents breaking changes from reaching production

### Benefits

✅ **Catch Breaking Changes Early** - Before they hit production  
✅ **Fast Feedback** - No need for full integration environments  
✅ **Independent Deployments** - Services can deploy independently  
✅ **Living Documentation** - Contracts document service interactions  
✅ **Polyglot Support** - Works across languages and frameworks  

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **GraphQL**: graphql-js for schema parsing
- **Icons**: Lucide React

## 📁 Project Structure

```
pact-demo/
├── src/
│   ├── components/
│   │   ├── Header.tsx                   # App header
│   │   ├── WorkflowVisualizer.tsx       # CDC workflow steps
│   │   ├── SchemaExplorer.tsx           # GraphQL schema browser
│   │   ├── ContractBuilder.tsx          # GraphQL contract generation
│   │   ├── RestContractBuilder.tsx      # REST contract generation
│   │   ├── KafkaContractBuilder.tsx     # Kafka contract generation
│   │   ├── ContractViewer.tsx           # Contract display & download
│   │   ├── ProviderVerification.tsx     # Verification simulator
│   │   ├── CanIDeployChecker.tsx        # Deployment safety checker
│   │   ├── PactBrokerSimulator.tsx      # 🆕 Pact Broker UI
│   │   ├── ProviderStatesDemo.tsx       # 🆕 Provider states examples
│   │   ├── FailureScenarios.tsx         # 🆕 Failure scenarios & debugging
│   │   └── CICDIntegration.tsx          # 🆕 CI/CD pipeline examples
│   ├── utils/
│   │   ├── schemaParser.ts              # GraphQL schema parser
│   │   ├── pactGenerator.ts             # Pact contract generator
│   │   ├── restApiParser.ts             # REST API parser
│   │   ├── kafkaParser.ts               # Kafka message parser
│   │   └── sampleQueries.ts             # Sample GraphQL queries
│   ├── App.tsx                          # Main app component
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Global styles
├── public/
│   ├── schema.graphql                   # Your supergraph schema
│   ├── RUST_PROD_WMSPORTS_APIS.yaml     # REST API definitions
│   └── hydration-station-kafka-contracts.json  # Kafka contracts
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🎬 Demo Features

### Sample Queries Included

The demo includes real-world examples from your schema:

1. **getArticleBySlug** (CMS_API) - Fetch articles by slug
2. **getAllVideos** (CMS_API) - List videos with pagination
3. **searchContent** (SPORTS_SEARCH_API) - Search across content
4. **getContentModule** (CONTENT_MODULES_API) - Fetch content modules
5. **getLiveLikeProfile** (LIVELIKE_API) - User profile data
6. **getEventById** (EVENT_API) - Sports event details
7. **getPlayerStats** (STATS_API) - Player statistics

### Interactive Elements

- ✨ **Live Schema Exploration** - Browse your actual GraphQL schema
- 🎨 **Visual Workflow** - See the CDC process in action
- 📝 **Contract Generation** - Create real Pact contracts (GraphQL, REST, Kafka)
- ⚡ **Instant Feedback** - Simulated verification results
- 💾 **Download Contracts** - Export as JSON files
- 🗄️ **Pact Broker UI** - Visualize contract sharing and verification matrix
- 🔧 **Provider States** - Learn how to set up test data
- ❌ **Failure Scenarios** - See real errors and how to fix them
- 🔄 **CI/CD Pipelines** - Ready-to-use GitHub Actions & GitLab CI configs

## 🚀 Next Steps: Implementing Pact in Your Team

### 1. Set Up Pact Broker

**Option A: Self-Hosted (Docker)**
```bash
docker-compose up -d
```

**Option B: PactFlow (Managed SaaS)**
- Sign up at https://pactflow.io
- Get your broker URL and token

### 2. Consumer Side (e.g., Mobile App)

```typescript
// Install Pact
npm install --save-dev @pact-foundation/pact

// Write consumer test
import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'MobileApp',
  provider: 'GraphQLGateway'
});

describe('GraphQL Contract', () => {
  it('fetches article by slug', () => {
    provider
      .given('article with slug breaking-news exists')
      .uponReceiving('a request for article by slug')
      .withRequest({
        method: 'POST',
        path: '/graphql',
        headers: { 'Content-Type': 'application/json' },
        body: {
          query: 'query { getArticleBySlug(slug: "breaking-news") { title } }'
        }
      })
      .willRespondWith({
        status: 200,
        body: { data: { getArticleBySlug: { title: 'Breaking News' } } }
      });

    return provider.executeTest(async (mockServer) => {
      // Your actual consumer code runs here
      const result = await fetchArticle('breaking-news');
      expect(result.title).toBe('Breaking News');
    });
  });
});

// Publish contract
pact-broker publish ./pacts --consumer-app-version=1.0.0
```

### 3. Provider Side (GraphQL Gateway)

```typescript
// Install Pact
npm install --save-dev @pact-foundation/pact

// Verify contracts
import { Verifier } from '@pact-foundation/pact';

new Verifier({
  provider: 'GraphQLGateway',
  providerBaseUrl: 'http://localhost:4000',
  pactBrokerUrl: 'https://your-broker.pactflow.io',
  pactBrokerToken: 'YOUR_TOKEN',
  publishVerificationResult: true,
  providerVersion: '2.1.0',
  stateHandlers: {
    'article with slug breaking-news exists': async () => {
      // Set up test data
      await db.articles.create({ slug: 'breaking-news', title: 'Breaking News' });
    }
  }
}).verifyProvider();
```

### 4. CI/CD Integration

```yaml
# .github/workflows/consumer.yml
- name: Run Pact Tests
  run: npm test

- name: Publish Contracts
  run: |
    pact-broker publish ./pacts \
      --consumer-app-version=${{ github.sha }} \
      --tag=${{ github.ref_name }}

# .github/workflows/provider.yml
- name: Verify Contracts
  run: npm run pact:verify

- name: Can I Deploy?
  run: |
    pact-broker can-i-deploy \
      --pacticipant=GraphQLGateway \
      --version=${{ github.sha }} \
      --to-environment=production
```

## 📚 Resources

### Official Pact Documentation
- **Docs**: https://docs.pact.io
- **5-Minute Guide**: https://docs.pact.io/5-minute-getting-started-guide
- **GraphQL Guide**: https://docs.pact.io/implementation_guides/graphql
- **Workshops**: https://docs.pact.io/implementation_guides/workshops

### Your Schema
- **Subgraphs**: 15 federated services
- **Federation**: Apollo Federation v2
- **Gateway**: Likely using Apollo Gateway or Router

### Pact Tools
- **Pact Broker**: https://github.com/pact-foundation/pact_broker
- **PactFlow**: https://pactflow.io (managed broker)
- **Pact JS**: https://github.com/pact-foundation/pact-js

## 🤝 Contributing to Your Pact Implementation

### Recommended Rollout Plan

1. **Week 1-2**: Set up Pact Broker (Docker or PactFlow)
2. **Week 3-4**: Pilot with 1-2 critical consumer-provider pairs
3. **Week 5-6**: Add provider state handlers
4. **Week 7-8**: Integrate can-i-deploy into CI/CD
5. **Week 9+**: Expand to all services

### Best Practices

✅ Start with your most critical/frequently changing APIs  
✅ Keep contracts focused (one interaction per test)  
✅ Use provider states to set up test data  
✅ Run can-i-deploy before every deployment  
✅ Version your contracts with Git SHAs  
✅ Tag contracts by environment (dev/staging/prod)  

## 🐛 Troubleshooting

### Schema Not Loading?
- Ensure `public/schema.graphql` exists
- Check browser console for errors
- Verify the schema is valid GraphQL

### Styling Issues?
- Run `npm install` to ensure Tailwind is installed
- Check that `tailwind.config.js` is present

### Build Errors?
- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm install` again

## 📝 License

This demo is for educational purposes. Pact is open source (MIT License).

---

**Built for your team's microservices architecture** 🚀

For questions or feedback, refer to the [Pact documentation](https://docs.pact.io) or your team's internal wiki.
