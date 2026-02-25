# Setup Instructions

## Prerequisites

Make sure you have Node.js 18+ installed. Check with:

```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

## Installation

1. Navigate to the demo directory:
```bash
cd /Users/kmudaliar/CT/pact-demo
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to: **http://localhost:3000**

## What You'll See

The demo includes:

1. **Pact Workflow Visualizer** - Interactive 5-step CDC workflow
2. **Schema Explorer** - Browse your 15 subgraphs, 100+ queries, 50+ mutations
3. **Contract Builder** - Generate Pact contracts from sample queries
4. **Provider Verification** - Simulate contract verification
5. **Can-I-Deploy Checker** - Test deployment safety checks

## Troubleshooting

### Port 3000 Already in Use?

Edit `vite.config.ts` and change the port:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001  // Change to any available port
  }
})
```

### Schema Not Loading?

Verify the schema file exists:
```bash
ls -lh public/schema.graphql
```

Should show ~700KB file.

### Build Issues?

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Demo Features

### Sample Queries Included

- **getArticleBySlug** (CMS_API)
- **getAllVideos** (CMS_API)
- **searchContent** (SPORTS_SEARCH_API)
- **getContentModule** (CONTENT_MODULES_API)
- **getLiveLikeProfile** (LIVELIKE_API)
- **getEventById** (EVENT_API)
- **getPlayerStats** (STATS_API)

### Interactive Elements

1. **Generate Contracts**: Select a query, customize consumer/provider names, generate JSON
2. **Download Contracts**: Export as `Consumer-Provider.json` files
3. **Simulate Verification**: See how providers verify contracts
4. **Check Deployments**: Test can-i-deploy safety checks
5. **Explore Schema**: Search and filter your GraphQL operations

## Presenting to Your Team

### Suggested Flow

1. **Start with "Why Pact?"** (5 min)
   - Show the educational info card
   - Explain CDC vs traditional integration testing

2. **Show Your Schema** (5 min)
   - Switch to Schema Explorer tab
   - Filter by different subgraphs
   - Show the scale: 15 services, 100+ operations

3. **Live Demo: Generate a Contract** (10 min)
   - Select `getArticleBySlug` query
   - Walk through the contract structure
   - Show provider state
   - Generate and download the contract

4. **Explain Provider Verification** (5 min)
   - Run the verification simulator
   - Explain how provider replays requests
   - Show success/failure scenarios

5. **Show Can-I-Deploy** (5 min)
   - Run the deployment checker
   - Explain how it prevents breaking changes
   - Show the verification matrix

6. **Discuss Implementation** (10 min)
   - Show the README implementation guide
   - Discuss rollout plan
   - Answer questions

### Key Points to Emphasize

✅ **Fast Feedback**: No need for full integration environments  
✅ **Independent Deployments**: Services can deploy without coordinating  
✅ **Catch Breaking Changes Early**: Before production  
✅ **Living Documentation**: Contracts document service interactions  
✅ **Polyglot**: Works across all your languages  

## Next Steps

After the demo, share:

1. **This demo**: Team members can run it locally
2. **Pact docs**: https://docs.pact.io
3. **Implementation plan**: From README.md
4. **Pilot services**: Identify 1-2 services to start with

## Questions?

Refer to:
- README.md for detailed implementation guide
- https://docs.pact.io for official documentation
- https://pactflow.io for managed broker option
