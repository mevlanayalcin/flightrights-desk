# Devpost Submission Package — Open Agentic Web Challenge (Cognizant × MIT NANDA × Mozilla)

- **Project Name:** FlightRights Desk (with Live Cross-Origin Peer: Disruption Ledger)
- **Tagline:** Browser-native multi-agent air passenger rights workbench (EU261, UK261, Turkish SHY-PASSENGER, US DOT, Montreal) with live cross-origin disruption verification and zero-PII SHA-256 evidence sealing.
- **Live Website URL (Origin A):** https://flightrights-desk.bedir-ai.workers.dev/
- **Agent Network URL (Origin A):** https://flightrights-desk.bedir-ai.workers.dev/flightrights_desk
- **Agent Manifest JSON:** https://flightrights-desk.bedir-ai.workers.dev/agent-manifest.json
- **Live Cross-Origin Peer (Origin B):** https://disruption-ledger.bedir-ai.workers.dev/ (`https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier`)
- **Public GitHub Repositories:**
  - Origin A: https://github.com/mevlanayalcin/flightrights-desk
  - Origin B: https://github.com/mevlanayalcin/disruption-ledger
- **Demo Video (<2 min, 1080p):** `/home/ubuntu/quick-cash-sprint/flightrights-media/flightrights-desk-demo-1080p.mp4` (ready for YouTube upload)

## `docs/agentic_websites.md` Registry Row (PR-Ready)

```markdown
|https://flightrights-desk.bedir-ai.workers.dev/|FlightRights Desk|Deterministic EU261, UK261, Turkish SHY-PASSENGER, US DOT & Montreal air passenger rights workbench with a 2-agent browser network (`passenger_advocate` + `statute_specialist`), zero-key publisher-funded AI + BYOK Otari, and live cross-origin calls after consent to Disruption Ledger (with hidden-iframe reads and origin-isolated zero-PII SHA-256 evidence sealing). Callable by peers via bridge reads and a public read-only MCP endpoint.|Mevlana Yalcin|[Link](https://flightrights-desk.bedir-ai.workers.dev/flightrights_desk)|
|https://disruption-ledger.bedir-ai.workers.dev/|Disruption Ledger|Independent airport ATC/weather disruption bulletin registry, EU261 Art. 7(2) comparable reroute verifier, National Enforcement Body directory, and zero-PII cross-origin SHA-256 evidence seal vault. Callable by peers via bridge reads, an origin-isolated write window, and a public read-only MCP endpoint.|Mevlana Yalcin|[Link](https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier)|
```

## Judging Checklist (Stage 1 Pass/Fail + Stage 2 Technological Implementation)

1. **Portable Multi-Agent HOCON → JSON:** 2-agent networks on BOTH origins compiled with `build_network.mjs --check` (`0 errors, 0 warnings`).
2. **Browser-Native Execution:** Official `agentify-website` browser runtime copied unchanged; runs 100% in visitor browser with strict CSP + Trusted Types (`require-trusted-types-for 'script'; trusted-types agentify-website`) + isolated sandbox worker CSP.
3. **Dual Pluggable Inference (Zero-Key + BYOK):** `publisher_funded: true` Cloudflare Workers AI OpenAI-compatible router lets judges chat immediately with zero setup, while `byok_router: "https://api.otari.ai/api/v1"` supports Connect with Otari, OpenRouter, OpenAI, and Anthropic without ever sending visitor keys to the site's proxy or peer.
4. **True Cross-Origin Composition:** Origin A (`flightrights-desk.bedir-ai.workers.dev`) calls Origin B (`disruption-ledger.bedir-ai.workers.dev`) after an explicit consent card (`Allow` / `Always allow` / `Decline`); Origin B runs locally on Origin A's router, executes 3 read actions in a hidden iframe (`callerOrigins: ["*"]`), and seals evidence (`issue_evidence_stamp`) inside Origin B's own popup window (`confirmsInWindow: true`) so PNR and email never cross origin boundaries.
5. **Public Interoperability:** Both origins pass `check_partner.mjs` with `OK` and HTTP 200 direct on `bridge/action-bridge.html` (zero redirects, zero warnings), expose read-only JSON-RPC 2.0 `/mcp` servers, and publish `/.well-known/agent-card.json` A2A cards.
