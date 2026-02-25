# REST API Contract Testing Demo

## 🎉 What's New

I've added a **REST API Contracts** tab to your demo showcasing contract testing for your **Hydration Station** service!

## 📁 What Was Added

### 1. REST API Parser (`src/utils/restApiParser.ts`)
- Parses your Insomnia REST API collection
- Defines 6 REST endpoints from Hydration Station
- Creates sample contracts with expected responses

### 2. REST Contract Builder Component (`src/components/RestContractBuilder.tsx`)
- Interactive UI for building REST contracts
- Shows HTTP methods, paths, parameters
- Displays request/response bodies
- Generates Pact contracts for REST APIs

### 3. Updated App (`src/App.tsx`)
- Added "REST API Contracts" tab
- Shows REST-specific workflow
- Demonstrates REST contract generation
- Explains provider verification for REST

## 🔍 Hydration Station Endpoints Included

### 1. **Health Check**
```
GET /up/elb
Response: { status: "ok", service: "hydration-station", ... }
```

### 2. **Get Stream Configuration**
```
GET /client/stream_config/{teamSlug}
Example: /client/stream_config/los-angeles-lakers
Response: { teamSlug, streamEnabled, sources, ... }
```

### 3. **Get Tweets**
```
GET /client/tweets?ids=123,456
Response: { tweets: [{ id, text, author, ... }] }
```

### 4. **Hydrate Tweet from URL**
```
GET /client/hydrate?url=https://x.com/NBA/status/...
Response: { id, text, author, media, hydrated: true, ... }
```

### 5. **Toggle RSS Output**
```
POST /client/stream_config/{teamSlug}
Body: { rss_output_toggle: true, programmer_override: true }
Response: { success: true, ... }
```

### 6. **Create Tweet**
```
POST /client/tweets
Body: { id: "2013869140264554876" }
Response: { success: true, tweetId, status: "created", ... }
```

## 🎯 How to Use

### 1. Start the Demo
```bash
cd /Users/kmudaliar/CT/pact-demo
npm run dev
```

### 2. Navigate to REST Tab
- Open http://localhost:3000
- Click on **"REST API Contracts"** tab

### 3. Generate a Contract
- Select an endpoint (e.g., "GET - Get Tweets")
- Review the HTTP method, path, parameters
- See the expected response
- Click **"Generate REST Pact Contract"**
- Download the contract JSON

### 4. Show Your Team
- Demonstrate how REST contracts work
- Compare with GraphQL contracts
- Show the same Pact workflow applies

## 📊 Demo Flow

### Tab 1: GraphQL Contracts
- Your federated GraphQL schema
- 15 subgraphs, 100+ queries
- GraphQL contract generation

### Tab 2: REST API Contracts (NEW!)
- Hydration Station REST APIs
- 6 endpoints
- REST contract generation
- Same Pact workflow

### Tab 3: Schema Explorer
- Browse your GraphQL schema
- Filter by subgraph
- Search operations

## 🎓 Key Points to Emphasize

### Same Pact Workflow
```
1. Consumer defines expected REST response
2. Pact generates contract (JSON)
3. Publish to Pact Broker
4. Provider verifies it can satisfy
5. Can-I-Deploy check before deployment
```

### REST vs GraphQL in Pact

**GraphQL:**
```typescript
POST /graphql
Body: { query: "{ getArticle { title } }" }
Response: { data: { getArticle: { title: "..." } } }
```

**REST:**
```typescript
GET /client/tweets?ids=123
Response: { tweets: [{ id: "123", text: "..." }] }
```

**Same Pact concepts, different protocols!**

## 🔄 Contract Examples

### GraphQL Contract
```json
{
  "consumer": { "name": "MobileApp" },
  "provider": { "name": "GraphQLGateway" },
  "interactions": [{
    "description": "Request for getArticleBySlug",
    "request": {
      "method": "POST",
      "path": "/graphql",
      "body": { "query": "..." }
    },
    "response": {
      "status": 200,
      "body": { "data": { ... } }
    }
  }]
}
```

### REST Contract
```json
{
  "consumer": { "name": "MobileApp" },
  "provider": { "name": "HydrationStation" },
  "interactions": [{
    "description": "Get Tweets by IDs",
    "request": {
      "method": "GET",
      "path": "/client/tweets?ids=123,456"
    },
    "response": {
      "status": 200,
      "body": { "tweets": [...] }
    }
  }]
}
```

## 🎬 Presentation Tips

### When Showing REST Tab

**Say:** "We also have REST APIs in our architecture. Let me show you how Pact handles those."

**Demo:**
1. Click "REST API Contracts" tab
2. Say: "This is our Hydration Station service - it exposes REST endpoints"
3. Select "Get Tweets" endpoint
4. Say: "Same workflow: consumer defines expectations"
5. Show the HTTP method, path, query parameters
6. Show expected response structure
7. Generate contract
8. Say: "Same Pact contract format, just different protocol"

**Key Message:** "Pact works for ANY API - REST, GraphQL, gRPC, whatever you have!"

## 📚 Files Reference

### Source Files
- `src/utils/restApiParser.ts` - REST endpoint definitions
- `src/components/RestContractBuilder.tsx` - REST contract UI
- `src/App.tsx` - Updated with REST tab
- `public/RUST_PROD_WMSPORTS_APIS.yaml` - Original Insomnia collection

### Documentation
- `README.md` - Main implementation guide
- `PRESENTATION_GUIDE.md` - Presentation script
- `REST_API_DEMO.md` - This file

## 🚀 Next Steps

### For Your Team

**After showing both tabs:**
1. ✅ GraphQL contracts - Gateway and federated services
2. ✅ REST contracts - Microservice-to-microservice communication
3. ⏭️ Message Queue contracts - Async events (if you add those later)

**Implementation Priority:**
1. Start with **critical REST APIs** (like Hydration Station)
2. Add **GraphQL contracts** for gateway
3. Expand to **other services**

### Adding More REST APIs

If you want to add more REST services:

1. Provide Insomnia/Postman collection or endpoint list
2. I'll add them to `restApiParser.ts`
3. They'll appear in the dropdown automatically

**Format needed:**
```
Service: ServiceName
Endpoint: GET /api/resource/{id}
Parameters: { id: "123" }
Response: { ... }
```

## 💡 Benefits Shown

### Multi-Protocol Support
- ✅ GraphQL (15 subgraphs)
- ✅ REST (Hydration Station)
- ✅ Same Pact workflow for both
- ✅ One tool for all your APIs

### Real Examples
- ✅ Your actual GraphQL schema
- ✅ Your actual REST endpoints
- ✅ Real service (Hydration Station)
- ✅ Concrete, not theoretical

## 🎯 Summary

**You now have:**
- ✅ GraphQL contract demo (federated schema)
- ✅ REST API contract demo (Hydration Station)
- ✅ Side-by-side comparison
- ✅ Same Pact workflow for both
- ✅ Complete presentation package

**Your team will see:**
- Pact works for ALL your APIs
- REST and GraphQL use same concepts
- One tool, multiple protocols
- Real examples from your architecture

---

**Ready to demo! 🚀**

Refresh your browser (if demo is running) or restart with `npm run dev` to see the new REST API tab!
