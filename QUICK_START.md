# 🚀 Pact Demo - Quick Start Guide

## ⚡ 30-Second Start

```bash
cd /Users/kmudaliar/CT/pact-demo
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## 📁 What You Have

```
/Users/kmudaliar/CT/
├── pact-demo/                          # 👈 The demo website
│   ├── src/                            # React app source
│   ├── public/schema.graphql           # Your actual GraphQL schema
│   ├── README.md                       # Full documentation
│   ├── SETUP.md                        # Setup instructions
│   ├── PRESENTATION_GUIDE.md           # 30-min presentation script
│   ├── PACT_VS_ALTERNATIVES.md         # Tool comparison
│   ├── CHECKLIST.md                    # Implementation checklist
│   └── start-demo.sh                   # Convenience script
├── DEMO_SUMMARY.md                     # 👈 Overview of everything
└── QUICK_START.md                      # 👈 You are here
```

---

## 🎯 What The Demo Shows

1. **Pact Workflow Visualizer** - 5-step CDC process
2. **Schema Explorer** - Your 15 subgraphs, 100+ queries
3. **Contract Builder** - Generate real Pact contracts
4. **Provider Verification** - Simulate verification
5. **Can-I-Deploy Checker** - Deployment safety

---

## 📖 Read This First

1. **DEMO_SUMMARY.md** - Overview of everything built
2. **pact-demo/README.md** - Full implementation guide
3. **pact-demo/PRESENTATION_GUIDE.md** - How to present

---

## 🎬 Presenting to Your Team?

**Follow this order:**

1. Read: `PRESENTATION_GUIDE.md` (30-min script)
2. Run: `cd pact-demo && npm run dev`
3. Open: http://localhost:3000
4. Present: Follow the guide
5. Share: Give team access to `pact-demo/` folder

---

## 🛠️ Key Files Explained

| File | What It Is | When To Use |
|------|-----------|-------------|
| **DEMO_SUMMARY.md** | Complete overview | Read first |
| **README.md** | Implementation guide | After demo, for implementation |
| **SETUP.md** | How to run demo | Before presenting |
| **PRESENTATION_GUIDE.md** | 30-min script | During presentation |
| **PACT_VS_ALTERNATIVES.md** | Tool comparison | When evaluating options |
| **CHECKLIST.md** | Implementation steps | During rollout |

---

## ✅ Pre-Demo Checklist

- [ ] Node.js 18+ installed
- [ ] Run `cd /Users/kmudaliar/CT/pact-demo`
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Test all features work
- [ ] Read `PRESENTATION_GUIDE.md`

---

## 🎓 What Is Pact?

**Consumer-Driven Contract Testing** for microservices.

**Problem:** 15 services, how to prevent breaking changes?

**Solution:** Pact
1. Consumer defines expected responses
2. Generates contract (JSON)
3. Provider verifies it can satisfy
4. Can-I-Deploy checks before deployment

**Result:** Catch breaking changes before production

---

## 🏆 Why Pact For Your Team?

Your architecture:
- ✅ 15 microservices (federated GraphQL)
- ✅ Multiple consumers (mobile, web)
- ✅ Independent deployments needed
- ✅ Polyglot environment

Pact is **perfect** for this.

---

## 📊 Your Schema Stats

- **15 Subgraphs**: ADS_API, CMS_API, CONTENT_MODULES_API, DATA_SERVICES_API, EPISODE_API, EVENT_API, HYDRATION_STATION_API, LIVELIKE_API, PUSH_NOTIFICATIONS_API, REFERENCE_STREAM_API, SOCIAL_PROCESSOR_API, SPORTS_SEARCH_API, STATS_API, TAG_API, USER_API
- **100+ Queries**
- **50+ Mutations**
- **700+ Types**

---

## 🛣️ Implementation Timeline

| Week | Phase | Activities |
|------|-------|-----------|
| 1-2 | Setup | Install Pact Broker |
| 3-4 | Pilot | First consumer-provider pair |
| 5-6 | States | Provider state handlers |
| 7-8 | CI/CD | Can-i-deploy integration |
| 9+ | Expand | Roll out to all services |

---

## 💡 Recommended Starting Point

**Consumer:** MobileApp  
**Provider:** GraphQLGateway  
**Operations:** 
- getArticleBySlug
- getAllVideos
- getLiveLikeProfile

**Why?** High traffic, critical, frequently changing

---

## 📚 Resources

**Demo:**
- Run: `cd pact-demo && npm run dev`
- Docs: `pact-demo/README.md`

**Pact:**
- Docs: https://docs.pact.io
- 5-min guide: https://docs.pact.io/5-minute-getting-started-guide
- GraphQL: https://docs.pact.io/implementation_guides/graphql

**Broker:**
- Self-hosted: https://github.com/pact-foundation/pact_broker
- Managed: https://pactflow.io

---

## 🐛 Troubleshooting

**Demo won't start?**
```bash
# Check Node.js
node --version  # Should be 18+

# Reinstall
cd /Users/kmudaliar/CT/pact-demo
rm -rf node_modules
npm install
npm run dev
```

**Port 3000 in use?**
- Edit `vite.config.ts`, change port to 3001

**Schema not loading?**
```bash
ls -lh public/schema.graphql  # Should be ~700KB
```

---

## 🎯 Next Steps

1. ✅ Run the demo
2. ✅ Read PRESENTATION_GUIDE.md
3. ✅ Present to your team
4. ✅ Get buy-in
5. ✅ Start pilot (Week 1-2)

---

## 💬 Questions?

- **Pact Slack**: https://slack.pact.io
- **Stack Overflow**: Tag `pact`
- **GitHub**: https://github.com/pact-foundation

---

## 🎉 You're Ready!

Everything you need to demo Pact to your team and implement it successfully.

**Good luck! 🚀**

---

## 📞 Quick Commands

```bash
# Start demo
cd /Users/kmudaliar/CT/pact-demo && npm run dev

# Or use script
./start-demo.sh

# Install dependencies
npm install

# Build for production
npm run build

# Preview production build
npm run preview
```

---

**Last updated:** 2026-02-24  
**Demo location:** `/Users/kmudaliar/CT/pact-demo/`  
**Your schema:** 15 subgraphs, 100+ queries, 50+ mutations
