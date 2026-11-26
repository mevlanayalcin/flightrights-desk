import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ActionRegistry } from "../public/runtime/actions.js";
import { AgentNetwork, validateNetwork } from "../public/runtime/kernel.js";
import { buildToolTable, dispatchToolCall, runAgent } from "../public/runtime/runner.js";
import { TraceBus } from "../public/runtime/trace.js";
import { StubDocument } from "./stub_document.mjs";
import { StubElement } from "./stub_element.mjs";
import { StubOption } from "./stub_option.mjs";
import { ScriptedModel } from "./scripted_model.mjs";

const NETWORK_NAME = "flightrights_desk";
const BASE = "https://flightrights-desk.bedir-ai.workers.dev";
const CALL_BUDGET = 16000;

globalThis.document = StubDocument.fromHtml(
  await readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  `${BASE}/`
);
globalThis.Option = StubOption;
const nsInputStub = new StubElement("textarea");
nsInputStub.id = "ns-input";
document.provide("#ns-input", [nsInputStub]);

const { registerActions } = await import("../public/site-actions.js");
const { registerActions: registerBridgeActions } = await import("../public/bridge/bridge-actions.js");
const { AssistantMount } = await import("../public/site.js");
const { App } = await import("../public/js/app.js");
const { StatuteEngine, haversineKm } = await import("../public/js/statutes.js");
const { AIRPORTS } = await import("../public/js/airports.js");

async function loadBundle() {
  const config = JSON.parse(await readFile(new URL(`../public/${NETWORK_NAME}.network.json`, import.meta.url), "utf8"));
  const manifest = JSON.parse(await readFile(new URL("../public/agent-manifest.json", import.meta.url), "utf8"));
  return { config, manifest, network: new AgentNetwork(config, NETWORK_NAME) };
}

async function buildRegistry() {
  const registry = new ActionRegistry();
  const scope = { base: BASE, network: NETWORK_NAME };
  await registerActions({ register: registry.register.bind(registry, scope) });
  return { registry, scope };
}

function makeCtx(loaded, registry, model, confirm) {
  return {
    network: loaded.network,
    manifest: loaded.manifest,
    actions: registry,
    baseOrigin: BASE,
    displayOrigin: new URL(BASE).host,
    trace: new TraceBus(),
    isTop: true,
    frontMan: loaded.network.findFrontMan(),
    history: [],
    llm: model,
    confirmWebsiteActions: confirm,
  };
}

test("FlightRights Desk network is valid, 2-agent, partner-linked, zero demo mode, publisher-funded + BYOK", async () => {
  const { config, manifest, network } = await loadBundle();
  const v = validateNetwork(network);
  assert.deepEqual(v.errors, []);
  assert.equal(config.demo_mode, undefined);
  assert.equal(network.findFrontMan(), "passenger_advocate");
  assert.equal(config.tools.length, 2);
  assert.ok(config.tools[0].tools.includes("statute_specialist"));
  assert.ok(config.tools[0].tools.includes("https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier"));
  assert.equal(manifest.peer_policy.mode, "closed");
  assert.deepEqual(manifest.allowed_peers, ["https://disruption-ledger.bedir-ai.workers.dev"]);
  assert.equal(manifest.llm_router.publisher_funded, true);
  assert.notEqual(manifest.llm_router.base_url, manifest.llm_router.byok_router);
});

test("Deterministic statutory engine computes exact Haversine distances and multi-jurisdiction payouts", () => {
  // FRA -> ZRH ~285 km (<=1500 km EU261 EUR 250)
  const kmFraZrh = haversineKm(AIRPORTS.FRA, AIRPORTS.ZRH);
  assert.ok(kmFraZrh >= 275 && kmFraZrh <= 295, `FRA-ZRH distance was ${kmFraZrh}`);
  const euShort = StatuteEngine.evaluate({
    origin: "FRA", destination: "ZRH", carrier: "LH",
    disruptionType: "delay", cause: "technical_fault", delayHours: 4.2, passengers: 1,
  });
  assert.equal(euShort.ok, true);
  assert.equal(euShort.primaryCompensationEur, 250);

  // JFK -> ZRH (>3500 km) on LX (CH carrier) delayed 5.5h for 2 passengers -> EUR 1,200
  const transatlantic = StatuteEngine.evaluate({
    origin: "JFK", destination: "ZRH", carrier: "LX",
    disruptionType: "delay", cause: "crew_shortage", delayHours: 5.5, passengers: 2,
  });
  assert.equal(transatlantic.primaryCompensationEur, 1200);
  assert.equal(transatlantic.applicableRegimes.some((r) => r.code === "EU261"), true);
  assert.equal(transatlantic.applicableRegimes.some((r) => r.code === "US_DOT"), true);

  // IST -> LHR on TK cancelled with 2 days notice -> SHY-PASSENGER EUR 400
  const istLhr = StatuteEngine.evaluate({
    origin: "IST", destination: "LHR", carrier: "TK",
    disruptionType: "cancellation", cause: "technical_fault", delayHours: 4.8, noticeDays: 2, passengers: 1,
  });
  assert.equal(istLhr.primaryCompensationEur, 400);
  assert.equal(istLhr.recommendedRegime.code, "SHY_PASSENGER");

  // IST -> AYT domestic Turkey denied boarding -> SHY-PASSENGER EUR 100
  const domesticTr = StatuteEngine.evaluate({
    origin: "IST", destination: "AYT", carrier: "TK",
    disruptionType: "denied_boarding", cause: "denied_boarding_overbooked", delayHours: 3.5, passengers: 1,
  });
  assert.equal(domesticTr.primaryCompensationEur, 100);

  // LHR -> JFK on BA (airline staff strike = NOT extraordinary) -> UK261 GBP 520 + US DOT cash refund
  const lhrJfk = StatuteEngine.evaluate({
    origin: "LHR", destination: "JFK", carrier: "BA",
    disruptionType: "delay", cause: "airline_strike", delayHours: 6.5, passengers: 1, ticketFareUsd: 920,
  });
  assert.equal(lhrJfk.recommendedRegime.code, "UK261");
  assert.equal(lhrJfk.recommendedRegime.totalAmount, 520);
  assert.equal(lhrJfk.applicableRegimes.find((r) => r.code === "US_DOT").status, "cash_refund_eligible");

  // CDG -> BCN ATC strike -> extraordinary cash EUR 0, Art. 9 care mandatory
  const atc = StatuteEngine.evaluate({
    origin: "CDG", destination: "BCN", carrier: "AF",
    disruptionType: "cancellation", cause: "atc_restriction", delayHours: 4.0, noticeDays: 0, passengers: 1,
  });
  assert.equal(atc.primaryCompensationEur, 0);
  assert.equal(atc.careEligible, true);
  assert.equal(atc.recommendedRegime.status, "care_only_extraordinary");

  // Bad airport refuses cleanly without throwing
  const bad = StatuteEngine.evaluate({ origin: "ZZZ", destination: "ZRH", carrier: "LH", disruptionType: "delay", delayHours: 4 });
  assert.equal(bad.ok, false);
  assert.equal(bad.field, "origin");
});

test("Page actions and bridge actions match manifest, write descriptions require visitor ask, and bridge is read-only", async () => {
  const { manifest } = await loadBundle();
  const pageDefs = new Map();
  await registerActions({ register: (d) => pageDefs.set(d.name, d) });
  const bridgeDefs = new Map();
  await registerBridgeActions({ register: (d) => bridgeDefs.set(d.name, d) });

  for (const name of manifest.actions.agentTools) {
    assert.ok(pageDefs.has(name), `Missing page action: ${name}`);
    const def = pageDefs.get(name);
    if (def.effect === "write") {
      assert.ok(def.description.includes("only when the visitor asks"), `${name} missing 'only when the visitor asks'`);
    }
    if (def.effect === "irreversible") {
      assert.ok(def.description.includes("website_get_desk_state"), `${name} must instruct reading state in same turn`);
    }
  }
  assert.equal(bridgeDefs.size, 3);
  for (const [, def] of bridgeDefs) {
    assert.equal(def.effect, "read");
    assert.equal(def.availability, "bridge");
    assert.deepEqual(def.callerOrigins, ["*"]);
  }
});

test("Front agent calls website_get_desk_state within 16000-char budget", async () => {
  const loaded = await loadBundle();
  const { registry } = await buildRegistry();
  const model = new ScriptedModel([
    { tool: "website_get_desk_state", arguments: {} },
    { text: "Your FRA to ZRH Lufthansa flight is eligible for EUR 250 under EU261." },
  ]);
  const ctx = makeCtx(loaded, registry, model, async () => true);
  const res = await runAgent(ctx, ctx.frontMan, "Check my current dossier", null, []);
  assert.equal(model.toolResults(1)[0].status, "succeeded");
  assert.match(res.text, /EUR 250/);
  const sent = model.calls[0];
  const totalChars = sent.messages[0].content.length + JSON.stringify(sent.tools).length;
  assert.ok(totalChars <= CALL_BUDGET, `Call budget exceeded: ${totalChars} > ${CALL_BUDGET}`);
});

test("Care expense writes update dossierVersion and refuse invalid inputs cleanly", async () => {
  const before = App.page.getState();
  const added = App.page.addCareExpense({ category: "meals", amountEur: 48, note: "Airport dinner" });
  assert.equal(added.ok, true);
  assert.equal(added.dossierVersion, before.dossierVersion + 1);
  assert.equal(added.careTotalEur, before.careTotalEur + 48);

  const badAmt = App.page.addCareExpense({ category: "meals", amountEur: 99999 });
  assert.equal(badAmt.ok, false);
  const badRemove = App.page.removeCareExpense({ expenseId: "CARE-999" });
  assert.equal(badRemove.ok, false);
});

test("Irreversible file_statutory_claim enforces confirmation, rejects stale version/payout, isolates partner dialogs, and generates SHA-256 dossier", async () => {
  const loaded = await loadBundle();
  const { registry } = await buildRegistry();
  const ctx = makeCtx(loaded, registry, new ScriptedModel([]), async () => false);
  const spec = loaded.network.getAgentSpec("passenger_advocate");
  const table = await buildToolTable(ctx, spec, [], null);
  const fileTool = table.toolByName.get("website_file_statutory_claim");
  assert.ok(fileTool);

  const state = App.page.getState();
  const validArgs = {
    passengerName: "Ada Lovelace",
    email: "ada@example.com",
    flightNumber: "LH1186",
    flightDate: "2026-11-24",
    bookingRef: "X7K9P2",
    expectedVersion: state.dossierVersion,
    expectedCompensationEur: state.evaluation.primaryCompensationEur,
  };

  // Stale version rejected before dialog
  const staleVer = App.page.checkFileStatutoryClaim({ ...validArgs, expectedVersion: state.dossierVersion - 1 });
  assert.equal(staleVer.ok, false);
  assert.equal(staleVer.field, "expectedVersion");

  // Stale compensation rejected before dialog
  const stalePay = App.page.checkFileStatutoryClaim({ ...validArgs, expectedCompensationEur: 600 });
  assert.equal(stalePay.ok, false);
  assert.equal(stalePay.field, "expectedCompensationEur");

  // Partner action with same name gets runtime default dialog, never host dialog
  let runtimeCalled = false;
  AssistantMount.defaultReview = async () => { runtimeCalled = true; return false; };
  const partnerRes = await AssistantMount.review([{
    action: "file_statutory_claim",
    origin: "https://other.example",
    effect: "irreversible",
    arguments: validArgs,
  }]);
  assert.equal(partnerRes, false);
  assert.equal(runtimeCalled, true);

  // Bundled form with irreversible action throws refusal without executing
  await assert.rejects(
    AssistantMount.review([
      { action: "file_statutory_claim", origin: BASE, effect: "irreversible", arguments: validArgs },
      { action: "add_care_expense", origin: BASE, effect: "write", arguments: { category: "meals", amountEur: 20 } },
    ]),
    /confirmed on its own/
  );

  // Decline changes nothing
  const declined = await dispatchToolCall(ctx, fileTool, validArgs, null, []);
  assert.equal(declined.status, "cancelled");
  assert.equal(App.page.getState().filedClaimCount, state.filedClaimCount);

  // Approve generates SHA-256 dossier and demand letter
  ctx.confirmWebsiteActions = async () => true;
  const approved = await dispatchToolCall(ctx, fileTool, validArgs, null, []);
  assert.equal(approved.status, "succeeded");
  assert.equal(approved.result.ok, true);
  assert.match(approved.result.claimId, /^FRD-[A-F0-9]{6}$/);
  assert.equal(approved.result.dossierHash.length, 64);
  assert.equal(App.page.getState().filedClaimCount, state.filedClaimCount + 1);
  assert.equal(AssistantMount.DIALOGS.file_statutory_claim.confirm, "Generate statutory claim");
});

test("Consent card focus management respects page forms", async () => {
  const app = document.querySelector("#agent-app");
  const chatInput = new StubElement("textarea");
  chatInput.id = "ns-input";
  app.append(chatInput);
  document.provide("#ns-input", [chatInput]);

  const cards = [];
  let resolver;
  AssistantMount.defaultConsent = () => {
    const card = new StubElement("div");
    card.className = "ns-consent";
    const title = new StubElement("div");
    title.className = "ns-consent-title";
    card.append(title);
    card.querySelector = (sel) => (sel === ".ns-consent-title" ? title : null);
    cards.push(card);
    document.provide("#ns-msgs .ns-consent", cards);
    return new Promise((r) => { resolver = r; });
  };

  document.activeElement = chatInput;
  const p1 = AssistantMount.consent({ kind: "network", peerLabel: "Disruption Ledger", peerOrigin: "disruption-ledger.bedir-ai.workers.dev", requestText: "Check FRA" });
  const card1 = cards[cards.length - 1];
  assert.equal(card1.getAttribute("role"), "group");
  assert.equal(card1.children[0].focused, true);
  resolver("allow");
  assert.equal(await p1, "allow");

  const externalInput = document.querySelector("#claim-name");
  document.activeElement = externalInput;
  const p2 = AssistantMount.consent({ kind: "network", peerLabel: "Disruption Ledger", peerOrigin: "disruption-ledger.bedir-ai.workers.dev", requestText: "Check FRA" });
  const card2 = cards[cards.length - 1];
  assert.notEqual(card2.children[0].focused, true);
  resolver("decline");
  assert.equal(await p2, "decline");
  document.activeElement = null;
});
