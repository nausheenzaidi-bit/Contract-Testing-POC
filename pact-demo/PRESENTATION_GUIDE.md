# Pact Demo - Presentation Guide

## 📋 Pre-Demo Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Demo running at http://localhost:3000
- [ ] Browser window ready
- [ ] This guide open for reference

## 🎯 Demo Objectives

By the end of this demo, your team should understand:
1. What contract testing is and why it matters
2. How Pact's CDC workflow works
3. How it applies to your GraphQL federated architecture
4. Next steps for implementation

## 📊 Opening (2 minutes)

### The Problem

**Say:** "We have 15 microservices in our federated GraphQL architecture. How do we ensure they can communicate correctly without breaking changes?"

**Show:** Stats cards on the demo homepage
- 15 Subgraphs
- 100+ Queries
- 50+ Mutations
- 700+ Types

**Say:** "Traditional approaches:"
- ❌ Manual testing: Slow, incomplete
- ❌ Integration tests: Brittle, require full environments
- ❌ Hope for the best: Breaking changes in production

**Say:** "Pact offers a better way: Consumer-Driven Contract Testing"

## 🔄 The Pact Workflow (5 minutes)

### Show: Workflow Visualizer

**Walk through each step:**

1. **Consumer Defines Contract**
   - **Say:** "The consumer (mobile app, web app) writes tests defining what they expect from the API"
   - **Key point:** Consumer drives the contract, not the provider

2. **Generate Pact File**
   - **Say:** "Pact automatically generates a JSON contract from these tests"
   - **Key point:** Contract is versioned and tracked

3. **Publish to Broker**
   - **Say:** "Contract is uploaded to Pact Broker - a central registry"
   - **Key point:** Single source of truth for all contracts

4. **Provider Verification**
   - **Say:** "Provider fetches contracts and verifies it can satisfy them"
   - **Key point:** Provider runs real code against consumer expectations

5. **Can-I-Deploy?**
   - **Say:** "Before deploying, check if all contracts are verified"
   - **Key point:** Prevents breaking changes from reaching production

## 🔍 Schema Explorer (3 minutes)

### Switch to "Schema Explorer" tab

**Say:** "This is our actual federated GraphQL supergraph"

**Demo actions:**
1. Search for "article" - show multiple results
2. Filter by "CMS_API" - show CMS-specific operations
3. Click on `getArticleBySlug` - expand to show args and return type
4. Filter by "LIVELIKE_API" - show LiveLike operations

**Key points:**
- Real schema from production
- 15 different services
- Each service can have contracts
- Pact works across all of them

## 🛠️ Contract Builder (8 minutes)

### Switch back to "Pact Workflow Demo" tab

**Say:** "Let's create a contract for a mobile app consuming our GraphQL API"

**Demo actions:**

1. **Set Consumer/Provider names**
   - Consumer: "MobileApp"
   - Provider: "GraphQLGateway"
   - **Say:** "These names identify the services in Pact Broker"

2. **Select a query**
   - Choose: `getArticleBySlug`
   - **Say:** "This is a real query from our CMS API"
   - **Point out:** Description, subgraph badge

3. **Review the query**
   - **Say:** "This is the actual GraphQL query the mobile app will send"
   - **Point out:** Variables (slug, tenant)

4. **Review expected response**
   - **Say:** "This is what the mobile app expects to receive"
   - **Point out:** Structure, field names, types

5. **Provider State**
   - **Say:** "Provider states let us set up test data"
   - **Read:** "article with slug breaking-news-story exists"
   - **Explain:** Provider will seed this data before verification

6. **Generate Contract**
   - Click "Generate Pact Contract"
   - **Watch:** Workflow visualizer animate through steps

### Show: Generated Contract

**Say:** "This is the Pact contract - a JSON file"

**Point out key sections:**
```json
{
  "consumer": { "name": "MobileApp" },
  "provider": { "name": "GraphQLGateway" },
  "interactions": [...]
}
```

**Demo actions:**
1. Click "Copy" - show it's copied
2. Click "Download" - show file downloads
3. **Say:** "In real workflow, this gets published to Pact Broker"

**Read the "Next Steps" box:**
- Save to consumer repo
- Publish to broker
- Provider verifies
- Can-I-Deploy check

## ✅ Provider Verification (5 minutes)

### Scroll to "Provider Verification" section

**Say:** "Now the provider (GraphQL Gateway) needs to verify it can satisfy this contract"

**Point out:**
- Interaction to verify
- Provider state
- Request to replay

**Demo actions:**
1. Click "Run Provider Verification"
2. **Watch:** Loading animation
3. **Wait:** For result (2 seconds)

### If Success (90% chance)

**Say:** "✅ Verification passed! The provider can satisfy the contract"

**Explain:**
- Provider set up the provider state (seeded test data)
- Replayed the exact request from the contract
- Response matched expected structure
- Result published back to broker

### If Failure (10% chance - for demo variety)

**Say:** "❌ Verification failed - this is actually good!"

**Explain:**
- Caught a breaking change before production
- Provider needs to fix the issue
- Or consumer needs to adjust expectations
- This is the safety net in action

**Read the "How Provider Verification Works" box**

## 🚀 Can-I-Deploy (5 minutes)

### Scroll to "Can-I-Deploy Checker" section

**Say:** "Before deploying, we check if it's safe"

**Demo actions:**
1. Service: "MobileApp"
2. Version: "1.2.3"
3. Environment: "production"
4. Click "Check if Safe to Deploy"
5. **Watch:** Loading animation
6. **Wait:** For result

### Show Result

**Say:** "✅ Safe to deploy! All contracts are verified"

**Point out:**
- GraphQLGateway v2.1.0 - verified
- CMS-API v1.8.2 - verified
- LiveLike-API v1.5.0 - verified

**Say:** "If any contract was unverified, deployment would be blocked"

**Show the command:**
```bash
pact-broker can-i-deploy \
  --pacticipant=MobileApp \
  --version=1.2.3 \
  --to-environment=production
```

**Say:** "This runs in CI/CD before every deployment"

## 🎓 Benefits & Use Cases (3 minutes)

### Scroll to "Why Use Pact for GraphQL?" section

**Read through benefits:**
- ✅ Catch breaking changes before production
- ✅ Fast feedback without full environments
- ✅ Independent service deployments
- ✅ Living documentation
- ✅ Prevents "works on my machine" issues

**Read through "Best For":**
- Microservices architectures ← **We have this**
- Multiple consumer applications ← **We have this**
- Federated GraphQL ← **We have this**
- Independent deployment cycles ← **We want this**
- Polyglot environments ← **We have this**

**Say:** "Pact is perfect for our architecture"

## 🛣️ Implementation Roadmap (5 minutes)

### Open README.md (or reference it)

**Say:** "Here's how we'd roll this out"

### Phase 1: Setup (Week 1-2)
- Set up Pact Broker (Docker or PactFlow)
- Choose: Self-hosted vs managed

### Phase 2: Pilot (Week 3-4)
- Pick 1-2 critical consumer-provider pairs
- Example: MobileApp ↔ GraphQLGateway
- Write first contracts

### Phase 3: Provider States (Week 5-6)
- Implement state handlers
- Set up test data management

### Phase 4: CI/CD Integration (Week 7-8)
- Add contract tests to CI
- Add can-i-deploy gates
- Block deployments on failures

### Phase 5: Expansion (Week 9+)
- Roll out to all services
- Train all teams
- Establish best practices

**Say:** "This is a gradual rollout, not big bang"

## 💡 Recommended Starting Point

**Say:** "I recommend we start with:"

1. **Consumer:** MobileApp (or WebApp)
2. **Provider:** GraphQLGateway
3. **Operations:** 3-5 most critical queries
   - `getArticleBySlug`
   - `getAllVideos`
   - `getLiveLikeProfile`
   - `getEventById`

**Why these?**
- High traffic
- Frequently changing
- Multiple consumers
- Critical user flows

## ❓ Q&A Preparation

### Common Questions

**Q: How is this different from integration tests?**
**A:** Integration tests require full environments and test implementation. Pact tests the contract (interface) only, runs fast, and doesn't need infrastructure.

**Q: Do we need to write tests for every field?**
**A:** No, only fields the consumer actually uses. If mobile app only needs `title` and `slug`, contract only includes those.

**Q: What about breaking changes we want to make?**
**A:** Pact shows you who will break. You can coordinate with consumers, or version your API.

**Q: How much effort is this?**
**A:** Initial setup: 1-2 weeks. Per service: 1-2 days. Maintenance: minimal (tests run automatically).

**Q: What if provider can't satisfy contract?**
**A:** Two options: (1) Provider fixes to satisfy, or (2) Consumer adjusts expectations. Either way, you know before production.

**Q: Do we need Pact Broker?**
**A:** For real usage, yes. You can self-host (free, Docker) or use PactFlow (managed, paid).

**Q: What about our existing tests?**
**A:** Pact complements, doesn't replace. Keep unit tests, E2E tests. Pact fills the contract testing gap.

**Q: Does this work with our Apollo Federation?**
**A:** Yes! Consumers test against the gateway. Gateway tests against subgraphs. Perfect fit.

## 🎬 Closing (2 minutes)

**Say:** "To summarize:"

1. ✅ Pact prevents breaking changes through contract testing
2. ✅ Perfect fit for our federated GraphQL architecture
3. ✅ Fast feedback without full environments
4. ✅ Enables independent deployments
5. ✅ Gradual rollout starting with 1-2 services

**Next steps:**
1. Team reviews this demo
2. Discuss in next architecture meeting
3. Get buy-in from leadership
4. Start pilot with MobileApp ↔ GraphQLGateway
5. Evaluate after 1 month

**Say:** "Questions?"

## 📚 Resources to Share

After the demo, share:

1. **This demo repo** - Team can run locally
2. **README.md** - Implementation guide
3. **SETUP.md** - How to run the demo
4. **Pact docs** - https://docs.pact.io
5. **PactFlow** - https://pactflow.io (if considering managed option)

## 🎯 Success Metrics

After implementation, measure:
- Number of breaking changes caught pre-production
- Deployment frequency increase
- Integration test suite reduction
- Time to deploy decrease
- Developer satisfaction

---

**Good luck with your presentation! 🚀**

Remember: Be enthusiastic, show real examples, and emphasize how Pact solves real problems your team faces today.
