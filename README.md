# FlightRights Desk — Open Agentic Air Passenger Rights Workbench

> **Open Agentic Web Challenge Submission (MVP Profile 0.3)**
>
> - **Live Primary Origin (Origin A):** https://flightrights-desk.bedir-ai.workers.dev/
> - **Portable Agent Network URL:** https://flightrights-desk.bedir-ai.workers.dev/flightrights_desk
> - **Agent Manifest:** https://flightrights-desk.bedir-ai.workers.dev/agent-manifest.json
> - **Public Read-Only MCP Endpoint:** https://flightrights-desk.bedir-ai.workers.dev/mcp
> - **A2A Agent Card:** https://flightrights-desk.bedir-ai.workers.dev/.well-known/agent-card.json
> - **Live Cross-Origin Peer (Origin B — Disruption Ledger):** https://disruption-ledger.bedir-ai.workers.dev/ (`https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier`)

## What It Does

**FlightRights Desk** is a deterministic, browser-native Open Agentic Website that evaluates air passenger statutory compensation across **EU Regulation (EC) 261/2004** (and Swiss bilateral), **UK261 (SI 2019/278)**, **Turkish SHY-PASSENGER (SHY-YOLCU)**, **US DOT (14 CFR Parts 250 & 259)**, and **Montreal Convention Art. 22 (1,519 SDR)** directly in the visitor's browser.

- **Works 100% standalone without AI** (72 real IATA airports with exact WGS-84 coordinates, Haversine great-circle distance & SVG corridor visualizer, 32 airlines, CJEU extraordinary-circumstances precedent engine, Art. 9 care expense ledger, and SHA-256 formal statutory demand dossier generator).
- **Two-Agent Neuro SAN HOCON Network (`flightrights_desk.hocon`):** `passenger_advocate` (front agent) + `statute_specialist` (dual-jurisdiction & CJEU precedent specialist), compiled cleanly via `build_network.mjs` with zero errors and zero warnings.
- **Zero-Key Publisher-Funded AI + Full BYOK:** Runs immediately with zero API key via our publisher-funded OpenAI-compatible Cloudflare Workers AI router (`publisher_funded: true`), while preserving full visitor sovereignty via **Connect with Otari**, **Connect with OpenRouter**, or any OpenAI/Anthropic key (`byok_router: "https://api.otari.ai/api/v1"`). Visitor keys stay strictly in the browser and are never sent to the publisher router or any peer site.
- **Safety & Confirmation Boundaries:** `file_statutory_claim` is marked `irreversible`, validates both `expectedVersion` and `expectedCompensationEur` to block stale-state confirmation, and opens a custom human-readable confirmation dialog before creating a SHA-256 dossier (`FRD-XXXXXX`).
- **Callable by Peers:** Exposes 3 read-only bridge actions (`get_desk_state`, `calculate_route_entitlement`, `get_statute_guide`) with `callerOrigins: ["*"]` via `bridge/bridge-actions.js`, plus a public read-only JSON-RPC 2.0 MCP endpoint at `/mcp`.

## Linked Site (Cross-Origin Peer Composition)

FlightRights Desk links to an independently hosted second-origin Open Agentic Website:

- **Partner Network URL:** `https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier`
- **Consent Card:** Before any network contact, the browser runtime displays a consent card naming **Disruption Ledger** (`disruption-ledger.bedir-ai.workers.dev`) and the first 140 characters of the request (`Allow`, `Always allow`, or `Decline`). Choosing **Always allow** skips the card for that host until the page is reloaded.
- **Privacy Boundary:** The assistant is instructed never to put passenger names, emails, phone numbers, or booking codes (PNRs) into a partner request (and the visitor verifies the request on the consent card). Disruption Ledger runs inside the visitor's browser on FlightRights Desk's active router (never receiving any visitor BYOK key).
- **Shared Cross-Origin Reads (`bridge/bridge-actions.js`):** `lookup_airport_disruptions`, `find_comparable_reroutes`, and `get_enforcement_body` run inside an isolated hidden frame on Disruption Ledger's origin.
- **Shared Cross-Origin Write Window (`bridge/evidence-window.js`):** When the visitor asks to anchor a SHA-256 evidence seal (`issue_evidence_stamp`), Disruption Ledger opens its **own origin window** where the visitor enters their PNR and email directly on Disruption Ledger; only the anonymous `EVID-XXXXXX` reference and SHA-256 hash return to FlightRights Desk's chat.

## Data & Privacy Notice

When you use the assistant, your chat messages and the page state read by `website_*` tools are sent to the active LLM router (the site's free publisher-funded Cloudflare Workers AI endpoint by default, or the provider you configure in **⚙ AI model settings**). If you test with your own BYOK API key locally, select **Delete setup** under **Advanced settings (optional)** and close the tab when finished.

## Running Locally & Testing

```bash
# 1. Validate network & manifest (zero errors, zero warnings)
node ../ref-agentic-web/skills/agentify-website/scripts/build_network.mjs \
  public/flightrights_desk.hocon --manifest public/agent-manifest.json --check

# 2. Run official Node integration & statutory boundary tests
node --test "tests/*.test.mjs"

# 3. Serve locally with CORS headers
node ../ref-agentic-web/skills/agentify-website/scripts/serve_site.mjs public --port 8080 --open-as 127.0.0.1

# 4. Verify external peer compatibility
node ../ref-agentic-web/skills/agentify-website/scripts/check_partner.mjs \
  https://flightrights-desk.bedir-ai.workers.dev/flightrights_desk
```

## Bundle Layout

```text
public/
  index.html                     Standalone workbench + assistant mount
  styles.css                     Executive aviation-law UI + official runtime overrides
  js/airports.js                 72 IATA airports (WGS-84), 32 carriers, CJEU causes, 6 presets
  js/statutes.js                 Deterministic Haversine + EU261/UK261/SHY/US DOT/Montreal engine
  js/app.js                      Shared page controller (App.page) & SVG route visualizer
  site.js                        Assistant mount, custom confirmation dialog & consent focus
  site-actions.js                7 registered website_* actions
  flightrights_desk.hocon        Portable 2-agent Neuro SAN network source of truth
  flightrights_desk.network.json Generated browser network artifact
  agent-manifest.json            MVP Profile 0.3 manifest (publisher_funded + BYOK + closed peer policy)
  links.json                     Peer-network link map
  agent-mcp.json                 Generated MCP discovery metadata
  .well-known/                   nsdeploy.json, nsdeploy-agent.json (+ worker-served agent-card.json)
  bridge/                        action-bridge.html, agent-manifest.json, bridge-actions.js
  runtime/                       Official agentify-website browser runtime (copied unchanged)
worker/index.js                  Cloudflare Worker: static assets + strict CSP/CORS + Workers AI /v1 + /mcp
tests/                           Official Node test suite
```
