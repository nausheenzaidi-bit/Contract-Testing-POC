# Contract Testing POC - Complete Project Overview

This repository contains a comprehensive Contract Testing implementation for the Sports Platform, combining work from multiple team members.

---

## 📁 Project Structure

```
CT/
├── pact-demo/                          # 🆕 Pact Contract Testing Demo (Interactive Web UI)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContractBuilder.tsx     # GraphQL contract generation
│   │   │   ├── RestContractBuilder.tsx # REST contract generation
│   │   │   ├── KafkaContractBuilder.tsx # Kafka contract generation
│   │   │   ├── PactBrokerSimulator.tsx # Pact Broker UI simulation
│   │   │   ├── ProviderStatesDemo.tsx  # Provider states examples
│   │   │   ├── FailureScenarios.tsx    # Failure scenarios & debugging
│   │   │   └── CICDIntegration.tsx     # CI/CD pipeline examples
│   │   └── utils/
│   │       ├── pactGenerator.ts        # Pact contract generator
│   │       ├── schemaParser.ts         # GraphQL schema parser
│   │       ├── restApiParser.ts        # REST API parser
│   │       └── kafkaParser.ts          # Kafka message parser
│   └── public/
│       ├── schema.graphql              # Federated supergraph schema
│       ├── RUST_PROD_WMSPORTS_APIS.yaml # Hydration Station REST APIs
│       └── hydration-station-kafka-contracts.json # Kafka contracts
│
├── be-mockserver/                      # 🔧 Backend MockServer (Custom Node.js)
│   ├── custom-mock-server.cjs          # Main mock server
│   ├── mock-ai-engine.cjs              # AI-powered mock generation
│   ├── custom-mock-scenarios.json      # Mock scenarios
│   ├── schema-loader.cjs               # GraphQL schema loader
│   └── microcks-client.cjs             # Microcks integration
│
├── frontend-mock/                      # 🎨 Frontend Mock Server (GraphQL)
│   ├── src/
│   │   ├── server.ts                   # Mock GraphQL server
│   │   ├── resolvers.ts                # GraphQL resolvers
│   │   └── graphql/                    # GraphQL schemas
│   └── scripts/
│       └── fetch-schema.ts             # Schema fetching utility
│
├── microcks-server/                    # 🐳 Microcks Setup (Docker)
│   ├── docker-compose.yml              # Full stack (Microcks + Keycloak + MongoDB)
│   ├── docker-compose-devmode.yml      # Lightweight dev mode (no auth)
│   ├── artifacts/                      # GraphQL schemas + Postman collections
│   │   ├── *.graphql                   # Per-subgraph schemas
│   │   └── *.json                      # Mock examples
│   ├── scripts/
│   │   ├── import-artifacts.sh         # Upload to Microcks
│   │   └── smoke-test.sh               # Verify endpoints
│   └── README.md                       # Microcks setup guide
│
├── Documentation/
│   ├── WHATS_NEW.md                    # Latest improvements summary
│   ├── IMPROVEMENTS_SUMMARY.md         # Detailed feature overview
│   ├── NEW_FEATURES_GUIDE.md           # Demo presentation guide
│   ├── DEMO_SUMMARY.md                 # Complete demo documentation
│   ├── PRESENTATION_GUIDE.md           # Step-by-step demo script
│   └── QUICK_START.md                  # Quick start guide
│
└── Data Files/
    ├── schema.graphql                  # Main supergraph schema
    ├── Bolt-Sports-Federated-API2@prod--#@!supergraph!@#.graphql
    ├── RUST_PROD_WMSPORTS_APIS.yaml    # REST API definitions
    └── hydration-station-kafka-contracts.json # Kafka contracts
```

---

## 🎯 Three Approaches to Contract Testing

This project demonstrates **three different approaches** to contract testing and mocking:

### 1. **Pact (Consumer-Driven Contract Testing)** ✅ RECOMMENDED
**Location:** `pact-demo/`

**What it does:**
- Consumer defines expectations → Provider verifies them
- Prevents breaking changes before production
- Tracks version compatibility
- Supports GraphQL, REST, Kafka

**When to use:**
- ✅ For preventing breaking changes
- ✅ For independent service deployments
- ✅ For multi-consumer scenarios
- ✅ For CI/CD integration

**How to run:**
```bash
cd pact-demo
npm install
npm run dev
# Open http://localhost:3000
```

**Features:**
- 8 interactive tabs (GraphQL, REST, Kafka, Schema Explorer, Pact Broker, Provider States, Failure Scenarios, CI/CD)
- Real-time contract generation
- Workflow visualization
- Ready-to-use CI/CD configs

---

### 2. **MockServer (Custom Node.js Backend)**
**Location:** `be-mockserver/`

**What it does:**
- Creates mock HTTP endpoints
- AI-powered mock data generation
- Scenario-based responses
- GraphQL schema-aware

**When to use:**
- ✅ For local development (frontend without backend)
- ✅ For unit/integration testing
- ✅ For demo environments
- ❌ NOT for contract testing (use Pact for that)

**How to run:**
```bash
cd be-mockserver
node custom-mock-server.cjs
# Mock server runs on http://localhost:4010
```

**Features:**
- Custom scenarios (success, error, edge cases)
- AI-powered mock generation
- GraphQL operation matching
- Microcks integration

---

### 3. **Microcks (All-in-One Platform)**
**Location:** `microcks-server/`

**What it does:**
- Mocking + Contract Testing in one platform
- Supports OpenAPI, AsyncAPI, Postman, GraphQL
- Has a UI similar to Pact Broker
- Docker-based deployment

**When to use:**
- ✅ For teams wanting all-in-one solution
- ✅ For teams with OpenAPI specs
- ✅ For mocking + contract validation together
- ⚠️ Less mature than Pact for pure CDC

**How to run:**
```bash
cd microcks-server
docker compose -f docker-compose-devmode.yml up -d
./scripts/import-artifacts.sh
# UI: http://localhost:8585
```

**Features:**
- Web UI for managing mocks
- Import GraphQL schemas + Postman collections
- Mock endpoints for all subgraphs
- Contract validation

---

## 🏆 Comparison Table

| Feature | **Pact** | **MockServer** | **Microcks** |
|---------|----------|----------------|--------------|
| **Primary Purpose** | Contract Testing | Mocking | Mocking + Contract Testing |
| **Approach** | Consumer-Driven | N/A | Provider or Consumer-Driven |
| **Has Broker?** | ✅ Yes | ❌ No | ✅ Yes |
| **Protocols** | GraphQL, REST, Kafka | HTTP, GraphQL | GraphQL, REST, gRPC, Kafka |
| **Best For** | Preventing breaking changes | Local dev | All-in-one solution |
| **Maturity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Our Recommendation** | ✅ Use for CDC | ✅ Use for local dev | ⚠️ Optional alternative |

---

## 🚀 Recommended Workflow

### **For Contract Testing (Production):**
1. **Use Pact** (`pact-demo/`)
   - Consumers generate contracts
   - Providers verify contracts
   - Pact Broker tracks compatibility
   - Can-I-Deploy gates deployments

### **For Local Development:**
2. **Use MockServer** (`be-mockserver/`)
   - Frontend developers work without backend
   - Mock server serves responses from Pact contracts
   - Fast iteration without dependencies

### **For Demos/Prototyping:**
3. **Use Microcks** (`microcks-server/`)
   - Quick mock endpoints for demos
   - Import OpenAPI/Postman collections
   - Show stakeholders working APIs

---

## 📊 Our Services Architecture

Based on the GraphQL supergraph schema:

### **15 Subgraphs:**
1. **ads-api** - Advertising service
2. **cms-api** - Content management
3. **content-modules-api** - Content modules
4. **data-services-api** - Data aggregation
5. **episode-api** - Episode information
6. **event-api** - Sports events
7. **hydration-station-api** - Data hydration
8. **livelike-api** - Live engagement
9. **push-notifications-api** - Push notifications
10. **reference-stream-api** - Reference streams
11. **social-processor-api** - Social media processing
12. **sports-search-api** - Search functionality
13. **stats-api** - Sports statistics (Sportradar integration?)
14. **tag-api** - Tagging system
15. **user-api** - User management

### **Consumers:**
- Mobile App (iOS/Android)
- Web App
- Admin Portal

### **External Dependencies:**
- Sportradar (sports stats)
- Kafka (message queues)
- Third-party APIs

---

## 🎯 Quick Start Guide

### **1. Run Pact Demo (Recommended First Step)**
```bash
cd pact-demo
npm install
npm run dev
# Open http://localhost:3000
# Click through all 8 tabs to explore
```

### **2. Run MockServer (Optional)**
```bash
cd be-mockserver
node custom-mock-server.cjs
# Mock server on http://localhost:4010
```

### **3. Run Microcks (Optional)**
```bash
cd microcks-server
docker compose -f docker-compose-devmode.yml up -d
./scripts/import-artifacts.sh
# UI: http://localhost:8585
```

---

## 📚 Documentation

### **For Pact Demo:**
- `WHATS_NEW.md` - What's new in the demo
- `NEW_FEATURES_GUIDE.md` - Tab-by-tab walkthrough
- `IMPROVEMENTS_SUMMARY.md` - Technical details
- `PRESENTATION_GUIDE.md` - Demo script

### **For Microcks:**
- `microcks-server/README.md` - Setup guide
- `microcks-server/DEMO-PRESENTATION.md` - Presentation guide

### **For MockServer:**
- `be-mockserver/README.md` - (create if needed)

---

## 🤝 Team Collaboration

### **Your Work:**
- ✅ Pact demo with 8 interactive tabs
- ✅ GraphQL, REST, Kafka contract examples
- ✅ Provider states, failure scenarios, CI/CD integration
- ✅ Comprehensive documentation

### **Teammate's Work (Nausheen):**
- ✅ MockServer setup with AI-powered mocking
- ✅ Frontend mock server
- ✅ Microcks Docker setup
- ✅ Per-subgraph schema artifacts

### **Combined Value:**
- ✅ Complete contract testing solution
- ✅ Multiple approaches for different use cases
- ✅ Production-ready + development tools
- ✅ Comprehensive examples and documentation

---

## 🎬 Demo Flow for Management

1. **Start with Pact Demo** (30 min)
   - Show GraphQL, REST, Kafka contracts
   - Show Pact Broker simulation
   - Show Provider States
   - Show Failure Scenarios
   - Show CI/CD Integration

2. **Show MockServer** (5 min)
   - "This is for local development"
   - Show AI-powered mock generation

3. **Show Microcks** (5 min)
   - "This is an alternative all-in-one platform"
   - Show the UI

4. **Recommendation** (5 min)
   - "Use Pact for contract testing"
   - "Use MockServer for local dev"
   - "Microcks is optional"

---

## 🔥 Next Steps

### **Week 1-2: Setup**
- [ ] Set up Pact Broker (Docker or PactFlow)
- [ ] Set up CI/CD secrets (PACT_BROKER_URL, tokens)

### **Week 3-4: Pilot**
- [ ] Pick 1 consumer-provider pair (e.g., MobileApp ↔ GraphQL Gateway)
- [ ] Write first consumer test
- [ ] Implement provider verification

### **Week 5-6: Provider States**
- [ ] Implement provider state handlers
- [ ] Set up test database
- [ ] Add teardown logic

### **Week 7-8: CI/CD**
- [ ] Add consumer pipeline (GitHub Actions)
- [ ] Add provider pipeline
- [ ] Set up webhooks
- [ ] Add can-i-deploy gates

### **Week 9+: Expand**
- [ ] Add more consumer-provider pairs
- [ ] Add REST API contracts
- [ ] Add Kafka message contracts
- [ ] Train all teams

---

## 🙋 Questions?

Refer to:
- `WHATS_NEW.md` - High-level summary
- `NEW_FEATURES_GUIDE.md` - Demo walkthrough
- `IMPROVEMENTS_SUMMARY.md` - Technical details
- `microcks-server/README.md` - Microcks setup

---

## 🎉 Summary

This repository provides **three complete approaches** to contract testing and mocking:

1. **Pact** - Industry-standard CDC testing ✅ RECOMMENDED
2. **MockServer** - Custom backend mocking ✅ FOR LOCAL DEV
3. **Microcks** - All-in-one platform ⚠️ OPTIONAL

**Total Lines of Code:** ~3,000+  
**Total Components:** 20+  
**Total Documentation:** 10+ files  
**Demo Quality:** Production-ready ✅

**Ready to present to management and start implementation!** 🚀
