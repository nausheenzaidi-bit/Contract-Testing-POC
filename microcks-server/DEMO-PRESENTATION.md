# Mock Server POC — Director Demo

## Slide 1: The Problem

**Today's testing workflow:**
- Developers manually test against dev/int environments
- Dependent services must be running and healthy
- Can't test edge cases (timeouts, errors, missing data) without modifying real services
- No way to validate contract changes before deployment
- Teams blocked on each other during integration testing

**Cost:**
- Slow feedback loops (wait for env deployments)
- Production incidents from untested edge cases
- Cross-team coordination overhead

---

## Slide 2: The Solution — Mock Server Platform

A **shared, internal-only mock server** that:
1. **Replaces manual testing** — test against mocks instead of live environments
2. **Enables multi-team independence** — each team mocks their own service
3. **Auto-detects breaking changes** — schema diffs catch contract violations

**Tech stack:** Microcks (open-source) + Docker + GraphQL schemas we already have

---

## Slide 3: What We Built (Live Demo)

### Microcks Dashboard — http://localhost:8585

| Service              | Operations | Type                |
|---------------------|-----------|---------------------|
| StatsAPI            | 8         | Queries             |
| CmsAPI              | 39        | Queries             |
| ContentModulesAPI   | 23        | Queries + Mutations |
| DataServiceAPI      | 10        | Queries             |
| LivelikeAPI         | 184       | Queries + Mutations |
| PushNotificationAPI | 8         | Queries + Mutations |
| SportsSearchAPI     | 3         | Queries             |
| SocialProcessorAPI  | 8         | Queries + Mutations |
| HydrationStationAPI | 2         | Query + Mutation    |
| ReferenceStreamAPI  | 2         | Queries             |
| EpisodeAPI          | 1         | Query               |
| AdsAPI              | 2         | Mutations           |
| TagAPI              | 5         | Queries             |
| UserAPI             | 5         | Queries             |
| **TOTAL**           | **300**   |                     |

---

## Slide 4: Live Demo Flow

### Demo 1 — "No Test Writing" Mock Server (2 min)

1. Open Microcks UI → Show all 14 services loaded
2. Click **StatsAPI** → Show 8 operations with mock examples
3. Copy the GraphQL endpoint: `http://localhost:8585/graphql/StatsAPI/1.0`
4. Send a query via curl or browser:

```bash
curl -X POST http://localhost:8585/graphql/StatsAPI/1.0 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getGamecastBySlug(slug: \"demo-game-001\") { slug status sport } }"}'
```

5. Show the response with realistic mock data
6. **Key point:** "No test code written — just uploaded our existing schema"

### Demo 2 — Multi-Service Independence (2 min)

1. Show CmsAPI endpoint working: `http://localhost:8585/graphql/CmsAPI/1.0`
2. Show LivelikeAPI endpoint working: `http://localhost:8585/graphql/LivelikeAPI/1.0`
3. **Key point:** "Each team gets their own isolated mock endpoint. Teams don't need to coordinate."

### Demo 3 — Edge Case Testing (2 min)

1. Show that different query parameters return different mock scenarios
2. Show how adding a new Postman example creates a new scenario (error, timeout, etc.)
3. **Key point:** "Teams can test error handling, missing data, edge cases without touching real services"

### Demo 4 — Automatic Change Detection (1 min)

1. Show how schema-diff works:
```bash
# Detects breaking changes between versions
npx graphql-inspector diff old-schema.graphql new-schema.graphql
```
2. **Key point:** "When a team changes their schema, we automatically detect if it breaks consumers"

---

## Slide 5: Architecture for Production

```
┌─────────────────────────────────────┐
│          AWS ECS Fargate            │
│                                     │
│  ┌──────────┐   ┌───────────────┐  │
│  │ Microcks │   │  MongoDB      │  │
│  │ (Docker) │──▶│  (persistent) │  │
│  └────┬─────┘   └───────────────┘  │
│       │                             │
│  ┌────┴─────┐                       │
│  │ Postman  │                       │
│  │ Runtime  │                       │
│  └──────────┘                       │
│                                     │
└────────────┬────────────────────────┘
             │
     ┌───────┴───────┐
     │  ALB + Okta   │
     │  (SSO Auth)   │
     └───────┬───────┘
             │
    ┌────────┼────────┐
    │        │        │
 Team A   Team B   Team C
 (Stats)  (CMS)   (LiveLike)
```

**Deployment plan:**
- Docker Compose → already working locally
- AWS ECS Fargate → same Docker images, just push to ECR
- Okta SSO → Microcks supports OIDC out of the box
- Estimated: 3-5 days for cloud deployment

---

## Slide 6: ROI & Next Steps

### Immediate Value
- **Zero test code** to start mocking any service
- **14 services ready** with 300 operations mocked today
- **< 1 week** to deploy to cloud for all teams

### Next Steps (Phased)
1. **Week 1:** Deploy Microcks to AWS ECS with Okta SSO
2. **Week 2:** Onboard 2-3 teams, add their custom scenarios
3. **Week 3:** Integrate schema-diff into CI/CD pipeline
4. **Month 2:** Full adoption — all teams using shared mock platform

### Ask
- Approval to deploy to AWS ECS (minimal infra cost — single Fargate task)
- 1-2 sprints for team onboarding and CI/CD integration

---

## Quick Reference — Demo Commands

```bash
# Start Microcks locally
cd microcks-server
docker compose -f docker-compose-devmode.yml up -d

# Import all services
bash scripts/import-all.sh

# Run smoke tests (validates all 14 services)
bash scripts/smoke-test-all.sh

# Query any service
curl -X POST http://localhost:8585/graphql/StatsAPI/1.0 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getGamecastBySlug(slug: \"demo-game-001\") { slug status sport } }"}'

curl -X POST http://localhost:8585/graphql/CmsAPI/1.0 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getArticleBySlug(slug: \"demo-slug-001\") { slug title } }"}'

curl -X POST http://localhost:8585/graphql/LivelikeAPI/1.0 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ liveLikeMe { id nickname } }"}'
```

---

## Backup: Objection Handling

**"Why not just use dev/int environments?"**
→ Mock server is available 24/7, no dependencies on other teams, and supports edge cases that dev/int can't simulate.

**"Is Microcks production-ready?"**
→ Yes — open-source CNCF Sandbox project, used by Red Hat, Société Générale, and many enterprises. Supports GraphQL, REST, gRPC, AsyncAPI.

**"What about data security?"**
→ Internal-only deployment behind Okta SSO. Mock data is synthetic — no real customer data ever touches the system.

**"How much infrastructure cost?"**
→ Single Fargate task with MongoDB. Estimated ~$50-100/month for the team's usage pattern.
