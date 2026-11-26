import { AIRPORTS, CARRIERS, DISRUPTION_CAUSES, PRESET_SCENARIOS } from "./airports.js";
import { DESK_TODAY, StatuteEngine, computeDossierHash } from "./statutes.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, text = "", className = "") {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}

export class FlightRightsPage {
  constructor(doc = document) {
    this.doc = doc;
    this.dossierVersion = 1;
    this.careExpenses = [];
    this.nextExpenseId = 1;
    this.filedClaims = [];
    this.activePresetId = PRESET_SCENARIOS[0].id;
    this.presetButtons = [];
    this.currentEvaluation = StatuteEngine.evaluate(PRESET_SCENARIOS[0]);
    this.initControls();
    this.renderAll();
  }

  static factsIn(doc) {
    const partnerLink = doc.querySelector("#fact-partner-link")?.href
      || doc.querySelector("#partner-ledger-link")?.href
      || "https://disruption-ledger.bedir-ai.workers.dev/";
    return {
      eu261Summary: doc.querySelector("#guide-eu261")?.textContent?.trim() || "",
      ukTrSummary: doc.querySelector("#guide-uk-tr")?.textContent?.trim() || "",
      usMontrealSummary: doc.querySelector("#guide-us-montreal")?.textContent?.trim() || "",
      cannotDo: doc.querySelector("#fact-cannot-do")?.textContent?.trim() || "",
      disruptionLedgerUrl: partnerLink,
    };
  }

  static siteState() {
    const eval0 = StatuteEngine.evaluate(PRESET_SCENARIOS[0]);
    return {
      today: DESK_TODAY,
      supportedAirportCount: Object.keys(AIRPORTS).length,
      supportedAirportsSample: ["FRA", "ZRH", "GVA", "LHR", "CDG", "AMS", "IST", "AYT", "JFK", "LAX", "ORD", "MAD", "BCN", "FCO", "VIE", "DUB", "LIS", "CPH", "ARN", "DXB", "SIN", "HND"],
      supportedCarrierCount: Object.keys(CARRIERS).length,
      supportedCauses: Object.keys(DISRUPTION_CAUSES),
      presetScenarios: PRESET_SCENARIOS.map((s) => ({ id: s.id, title: s.title, origin: s.origin, destination: s.destination, carrier: s.carrier })),
      defaultEvaluation: eval0,
    };
  }

  initControls() {
    const originSel = this.doc.querySelector("#origin-input");
    const destSel = this.doc.querySelector("#destination-input");
    if (originSel && destSel) {
      for (const a of Object.values(AIRPORTS)) {
        const label = `${a.code} — ${a.city} (${a.country})`;
        originSel.append(new Option(label, a.code, a.code === "FRA", a.code === "FRA"));
        destSel.append(new Option(label, a.code, a.code === "ZRH", a.code === "ZRH"));
      }
    }

    const carrierSel = this.doc.querySelector("#carrier-input");
    if (carrierSel) {
      for (const c of Object.values(CARRIERS)) {
        carrierSel.append(new Option(`${c.code} — ${c.name} (${c.region})`, c.code, c.code === "LH", c.code === "LH"));
      }
    }

    const causeSel = this.doc.querySelector("#cause-input");
    if (causeSel) {
      for (const cause of Object.values(DISRUPTION_CAUSES)) {
        causeSel.append(new Option(cause.label, cause.id, cause.id === "technical_fault", cause.id === "technical_fault"));
      }
    }

    const presetRow = this.doc.querySelector("#preset-buttons");
    if (presetRow) {
      for (const p of PRESET_SCENARIOS) {
        const btn = el("button", p.title, p.id === this.activePresetId ? "preset-btn active" : "preset-btn");
        btn.type = "button";
        btn.dataset.presetId = p.id;
        btn.addEventListener("click", () => {
          this.activePresetId = p.id;
          this.evaluateFlightClaim(p);
          const flightEl = this.doc.querySelector("#claim-flight");
          const dateEl = this.doc.querySelector("#claim-date");
          if (flightEl) flightEl.value = p.flightNumber;
          if (dateEl) dateEl.value = p.flightDate;
        });
        this.presetButtons.push(btn);
        presetRow.append(btn);
      }
    }

    const flightForm = this.doc.querySelector("#flight-form");
    flightForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.activePresetId = "";
      const res = this.evaluateFlightClaim({
        origin: originSel?.value,
        destination: destSel?.value,
        carrier: carrierSel?.value,
        disruptionType: this.doc.querySelector("#type-input")?.value,
        cause: causeSel?.value,
        delayHours: Number(this.doc.querySelector("#delay-input")?.value || 0),
        noticeDays: Number(this.doc.querySelector("#notice-input")?.value || 0),
        rerouteDelayHours: Number(this.doc.querySelector("#reroute-input")?.value || 0),
        passengers: Number(this.doc.querySelector("#pax-input")?.value || 1),
        ticketFareUsd: Number(this.doc.querySelector("#fare-input")?.value || 0),
      });
      const errEl = this.doc.querySelector("#calc-error");
      if (errEl) {
        errEl.textContent = res.ok ? "" : res.reason;
        errEl.hidden = res.ok;
      }
    });

    const careForm = this.doc.querySelector("#care-form");
    careForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const res = this.addCareExpense({
        category: this.doc.querySelector("#care-category")?.value,
        amountEur: Number(this.doc.querySelector("#care-amount")?.value || 0),
        note: this.doc.querySelector("#care-note")?.value || "",
      });
      const errEl = this.doc.querySelector("#care-error");
      if (errEl) {
        errEl.textContent = res.ok ? "" : res.reason;
        errEl.hidden = res.ok;
      }
      if (res.ok) {
        const noteEl = this.doc.querySelector("#care-note");
        if (noteEl) noteEl.value = "";
      }
    });

    const claimForm = this.doc.querySelector("#claim-form");
    claimForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const res = await this.fileStatutoryClaim({
        passengerName: this.doc.querySelector("#claim-name")?.value,
        email: this.doc.querySelector("#claim-email")?.value,
        flightNumber: this.doc.querySelector("#claim-flight")?.value,
        flightDate: this.doc.querySelector("#claim-date")?.value,
        bookingRef: this.doc.querySelector("#claim-pnr")?.value,
        expectedVersion: this.dossierVersion,
        expectedCompensationEur: this.currentEvaluation.primaryCompensationEur,
      });
      const errEl = this.doc.querySelector("#claim-error");
      if (errEl) {
        errEl.textContent = res.ok ? "" : res.reason;
        errEl.hidden = res.ok;
      }
      if (res.ok) {
        const pnrEl = this.doc.querySelector("#claim-pnr");
        if (pnrEl) pnrEl.value = "";
      }
    });
  }

  careTotalEur() {
    return this.careExpenses.reduce((sum, item) => sum + item.amountEur, 0);
  }

  getState() {
    return {
      today: DESK_TODAY,
      dossierVersion: this.dossierVersion,
      evaluation: this.currentEvaluation,
      careExpenses: this.careExpenses.map((e) => ({ ...e })),
      careTotalEur: this.careTotalEur(),
      filedClaimCount: this.filedClaims.length,
      latestClaim: this.filedClaims[0] ? {
        claimId: this.filedClaims[0].claimId,
        regime: this.filedClaims[0].regime,
        route: this.filedClaims[0].route,
        flightNumber: this.filedClaims[0].flightNumber,
        flightDate: this.filedClaims[0].flightDate,
        compensationEur: this.filedClaims[0].compensationEur,
        careTotalEur: this.filedClaims[0].careTotalEur,
        dossierHash: this.filedClaims[0].dossierHash,
      } : null,
      supportedAirportCount: Object.keys(AIRPORTS).length,
      supportedCarrierCount: Object.keys(CARRIERS).length,
      supportedCauses: Object.keys(DISRUPTION_CAUSES),
      presetScenarios: PRESET_SCENARIOS.map((s) => ({ id: s.id, title: s.title, origin: s.origin, destination: s.destination, carrier: s.carrier })),
      pageFacts: FlightRightsPage.factsIn(this.doc),
    };
  }

  calculateRouteEntitlement(args) {
    return StatuteEngine.evaluate(args);
  }

  getStatuteGuide() {
    return {
      ok: true,
      today: DESK_TODAY,
      regimes: [
        { code: "EU261", bands: "EUR 250 (<=1500 km) / EUR 400 (1500-3500 km or intra-EU >1500 km) / EUR 600 (>3500 km)", threshold: ">=3h arrival delay or <14d cancellation or denied boarding" },
        { code: "UK261", bands: "GBP 220 / GBP 350 / GBP 520", threshold: "UK departures or UK/EU carriers arriving UK; >=3h delay or <14d cancellation" },
        { code: "SHY_PASSENGER", bands: "EUR 100 domestic / EUR 250 / EUR 400 / EUR 600 international (paid in TRY)", threshold: "Turkish departures or Turkish carriers into Turkey" },
        { code: "US_DOT", bands: "14 CFR 259 automatic cash refund (>=3h dom / >=6h intl) & 14 CFR 250 IDB 200%/400% capped at USD 775 / USD 1,550", threshold: "All flights to/from/within US" },
        { code: "MONTREAL", bands: "1,519 SDR baggage liability cap (updated Dec 28, 2024)", threshold: "International checked baggage delay, damage, or loss" }
      ],
      causes: Object.values(DISRUPTION_CAUSES),
      pageFacts: FlightRightsPage.factsIn(this.doc),
    };
  }

  evaluateFlightClaim(args) {
    const res = StatuteEngine.evaluate(args);
    if (!res.ok) return res;
    this.currentEvaluation = res;
    this.dossierVersion += 1;
    this.syncFormToEvaluation();
    const errEl = this.doc.querySelector("#calc-error");
    if (errEl) {
      errEl.textContent = "";
      errEl.hidden = true;
    }
    this.renderAll();
    return {
      ok: true,
      dossierVersion: this.dossierVersion,
      evaluation: res,
    };
  }

  addCareExpense({ category, amountEur, note } = {}) {
    const cleanCat = String(category || "").trim().toLowerCase();
    if (!["meals", "hotel", "transfer", "communications"].includes(cleanCat)) {
      return { ok: false, field: "category", reason: "Care expense category must be meals, hotel, transfer, or communications." };
    }
    const amt = Math.round(Number(amountEur) * 100) / 100;
    if (!Number.isFinite(amt) || amt < 1 || amt > 2000) {
      return { ok: false, field: "amountEur", reason: "Care expense amount must be between EUR 1 and EUR 2,000." };
    }
    const cleanNote = String(note || "").trim().slice(0, 100) || `${cleanCat} receipt`;
    const item = {
      id: `CARE-${this.nextExpenseId++}`,
      category: cleanCat,
      amountEur: amt,
      note: cleanNote,
    };
    this.careExpenses.push(item);
    this.dossierVersion += 1;
    const errEl = this.doc.querySelector("#care-error");
    if (errEl) {
      errEl.textContent = "";
      errEl.hidden = true;
    }
    this.renderCare();
    this.renderHeaderBadges();
    return {
      ok: true,
      dossierVersion: this.dossierVersion,
      added: item,
      careTotalEur: this.careTotalEur(),
    };
  }

  removeCareExpense({ expenseId } = {}) {
    const id = String(expenseId || "").trim().toUpperCase();
    const idx = this.careExpenses.findIndex((e) => e.id === id);
    if (idx < 0) {
      return { ok: false, field: "expenseId", reason: `Care expense "${expenseId || ""}" was not found in the dossier.` };
    }
    const [removed] = this.careExpenses.splice(idx, 1);
    this.dossierVersion += 1;
    this.renderCare();
    this.renderHeaderBadges();
    return {
      ok: true,
      dossierVersion: this.dossierVersion,
      removed,
      careTotalEur: this.careTotalEur(),
    };
  }

  checkFileStatutoryClaim(args) {
    if (typeof args?.expectedVersion !== "number" || args.expectedVersion !== this.dossierVersion) {
      return {
        ok: false,
        field: "expectedVersion",
        reason: `The claim dossier changed (current version ${this.dossierVersion}). Read website_get_desk_state again before filing.`,
      };
    }
    if (typeof args?.expectedCompensationEur !== "number" || args.expectedCompensationEur !== this.currentEvaluation.primaryCompensationEur) {
      return {
        ok: false,
        field: "expectedCompensationEur",
        reason: `Computed compensation changed (current primary payout is EUR ${this.currentEvaluation.primaryCompensationEur}). Read website_get_desk_state again and confirm the updated payout with the visitor.`,
      };
    }
    const passengerName = String(args?.passengerName || "").trim();
    const email = String(args?.email || "").trim();
    const flightNumber = String(args?.flightNumber || "").trim().toUpperCase().replace(/\s+/g, "");
    const flightDate = String(args?.flightDate || "").trim();
    const bookingRef = String(args?.bookingRef || "").trim().toUpperCase();

    if (passengerName.length < 2 || passengerName.length > 80) {
      return { ok: false, field: "passengerName", reason: "Passenger full name must be 2 to 80 characters." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
      return { ok: false, field: "email", reason: "Enter a valid passenger email address (max 120 characters)." };
    }
    if (!/^[A-Z0-9]{2,3}\d{1,4}$/.test(flightNumber)) {
      return { ok: false, field: "flightNumber", reason: "Flight number must look like LH1186, LX17, TK1985, or BA177." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
      return { ok: false, field: "flightDate", reason: "Flight date must be formatted as YYYY-MM-DD." };
    }
    if (!/^[A-Z0-9]{5,8}$/.test(bookingRef)) {
      return { ok: false, field: "bookingRef", reason: "Booking reference (PNR) must be 5 to 8 alphanumeric characters." };
    }
    const regime = this.currentEvaluation.recommendedRegime;
    const totalClaimEur = this.currentEvaluation.primaryCompensationEur + this.careTotalEur();
    if (!regime || (this.currentEvaluation.primaryCompensationEur === 0 && this.careTotalEur() === 0 && !regime.refundRight)) {
      return {
        ok: false,
        field: "evaluation",
        reason: "Current flight evaluation shows no payable statutory cash compensation, refund right, or care expenses to claim.",
      };
    }

    return {
      ok: true,
      normalized: { passengerName, email: email.toLowerCase(), flightNumber, flightDate, bookingRef },
      details: {
        Route: `${this.currentEvaluation.input.origin} -> ${this.currentEvaluation.input.destination} (${this.currentEvaluation.distanceKm} km)`,
        Flight: `${flightNumber} on ${flightDate} (${this.currentEvaluation.carrierInfo.name})`,
        Regime: regime.name,
        "Statutory Cash Payout": `${regime.currency} ${regime.totalAmount} (EUR ${this.currentEvaluation.primaryCompensationEur} eq.)`,
        "Art. 9 Care Expenses": `EUR ${this.careTotalEur()} (${this.careExpenses.length} item(s))`,
        "Combined Dossier Claim": `EUR ${totalClaimEur}`,
        Passenger: `${passengerName} (${email.toLowerCase()})`,
        "Booking Ref (PNR)": bookingRef,
        "Important Note": "Generates a local formal statutory demand notice and SHA-256 dossier receipt; send it to the airline or NEB yourself.",
      },
    };
  }

  async fileStatutoryClaim(args) {
    const check = this.checkFileStatutoryClaim(args);
    if (!check.ok) return check;

    const norm = check.normalized;
    const ev = this.currentEvaluation;
    const regime = ev.recommendedRegime;
    const careTotal = this.careTotalEur();
    const issuedAt = `${DESK_TODAY}T18:30:00Z`;
    const hashPayload = `${norm.flightNumber}|${ev.input.origin}-${ev.input.destination}|${norm.flightDate}|${norm.bookingRef}|${regime.code}|${ev.primaryCompensationEur}|${careTotal}|${issuedAt}`;
    const dossierHash = await computeDossierHash(hashPayload);
    const claimId = `FRD-${dossierHash.slice(0, 6).toUpperCase()}`;

    const demandLetter = [
      `FORMAL STATUTORY PASSENGER COMPENSATION NOTICE — REF ${claimId}`,
      `Date: ${DESK_TODAY}`,
      `To: Customer Relations / Passenger Claims Department, ${ev.carrierInfo.name} (${ev.carrierInfo.code})`,
      `From: ${norm.passengerName} <${norm.email}>`,
      `Flight: ${norm.flightNumber} | Route: ${ev.originAirport.code} (${ev.originAirport.city}) -> ${ev.destinationAirport.code} (${ev.destinationAirport.city})`,
      `Great-Circle Distance: ${ev.distanceKm} km | Flight Date: ${norm.flightDate} | PNR: ${norm.bookingRef}`,
      `Applicable Statute: ${regime.name}`,
      `Disruption: ${ev.input.disruptionType} (${ev.input.delayHours}h arrival delay; cause: ${ev.causeInfo.label})`,
      ``,
      `1. Statutory Entitlement: ${regime.rationale}`,
      `   Fixed Compensation Claimed: ${regime.currency} ${regime.totalAmount} (EUR ${ev.primaryCompensationEur} equivalent for ${ev.input.passengers} passenger(s)).`,
      `2. Right to Care Reimbursement (Art. 9): EUR ${careTotal} across ${this.careExpenses.length} itemized receipt(s).`,
      `3. Legal Basis: ${ev.causeInfo.precedent}`,
      `4. Verification Digest (SHA-256): ${dossierHash}`,
      ``,
      `Please remit payment within 14 days or provide documented proof of statutory exemption.`,
    ].join("\n");

    const record = {
      claimId,
      regime: regime.code,
      regimeName: regime.name,
      route: `${ev.input.origin}-${ev.input.destination}`,
      flightNumber: norm.flightNumber,
      flightDate: norm.flightDate,
      passengerName: norm.passengerName,
      email: norm.email,
      bookingRef: norm.bookingRef,
      compensationCurrency: regime.currency,
      compensationAmount: regime.totalAmount,
      compensationEur: ev.primaryCompensationEur,
      careTotalEur: careTotal,
      dossierHash,
      issuedAt,
      demandLetter,
    };

    this.filedClaims.unshift(record);
    this.dossierVersion += 1;
    const errEl = this.doc.querySelector("#claim-error");
    if (errEl) {
      errEl.textContent = "";
      errEl.hidden = true;
    }
    this.renderFiledClaims();
    this.renderHeaderBadges();

    return {
      ok: true,
      claimId: record.claimId,
      dossierVersion: this.dossierVersion,
      regime: record.regimeName,
      route: record.route,
      flightNumber: record.flightNumber,
      flightDate: record.flightDate,
      compensationCurrency: record.compensationCurrency,
      compensationAmount: record.compensationAmount,
      compensationEur: record.compensationEur,
      careTotalEur: record.careTotalEur,
      dossierHash: record.dossierHash,
      summary: `Filed statutory claim dossier ${record.claimId} for ${record.flightNumber} (${record.route}) under ${record.regimeName}: ${record.compensationCurrency} ${record.compensationAmount} + EUR ${record.careTotalEur} care expenses.`,
    };
  }

  syncFormToEvaluation() {
    const inp = this.currentEvaluation.input;
    const setVal = (sel, val) => {
      const node = this.doc.querySelector(sel);
      if (node) node.value = String(val);
    };
    setVal("#origin-input", inp.origin);
    setVal("#destination-input", inp.destination);
    setVal("#carrier-input", inp.carrier);
    setVal("#type-input", inp.disruptionType);
    setVal("#cause-input", inp.cause);
    setVal("#delay-input", inp.delayHours);
    setVal("#notice-input", inp.noticeDays);
    setVal("#reroute-input", inp.rerouteDelayHours);
    setVal("#pax-input", inp.passengers);
    setVal("#fare-input", inp.ticketFareUsd);

    const btns = this.presetButtons || [];
    for (const b of btns) {
      b.className = b.dataset?.presetId === this.activePresetId ? "preset-btn active" : "preset-btn";
    }
  }

  renderHeaderBadges() {
    const vPill = this.doc.querySelector("#dossier-version-pill");
    if (vPill) vPill.textContent = `Dossier v${this.dossierVersion}`;
    const cBadge = this.doc.querySelector("#care-total-badge");
    if (cBadge) cBadge.textContent = `EUR ${this.careTotalEur()}`;
  }

  renderMap() {
    const ev = this.currentEvaluation;
    const titleEl = this.doc.querySelector("#route-title");
    const distEl = this.doc.querySelector("#distance-pill");
    const precEl = this.doc.querySelector("#precedent-box");
    if (titleEl) titleEl.textContent = `${ev.originAirport.code} (${ev.originAirport.city}) → ${ev.destinationAirport.code} (${ev.destinationAirport.city})`;
    if (distEl) distEl.textContent = `${ev.distanceKm.toLocaleString("en-US")} km · ${ev.distanceMiles.toLocaleString("en-US")} mi`;
    if (precEl) {
      precEl.replaceChildren(
        el("strong", ev.causeInfo.extraordinary ? "Extraordinary Circumstances Trigger: " : "Carrier-Controllable Precedent: "),
        el("span", ev.causeInfo.precedent)
      );
    }

    const svg = this.doc.querySelector("#route-svg");
    if (!svg || typeof this.doc.createElementNS !== "function") return;
    const W = 560;
    const H = 220;
    const project = (lat, lon) => ({
      x: Math.round(((lon + 180) / 360) * (W - 40) + 20),
      y: Math.round(((90 - lat) / 180) * (H - 36) + 18),
    });
    const p1 = project(ev.originAirport.lat, ev.originAirport.lon);
    const p2 = project(ev.destinationAirport.lat, ev.destinationAirport.lon);
    const mx = (p1.x + p2.x) / 2;
    const my = Math.max(16, Math.min(p1.y, p2.y) - Math.min(62, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.32));

    const nodes = [];
    for (let x = 60; x < W; x += 70) {
      nodes.push(svgEl("line", { x1: x, y1: 10, x2: x, y2: H - 10, stroke: "rgba(148,163,184,0.14)", "stroke-width": 1 }));
    }
    for (let y = 40; y < H; y += 45) {
      nodes.push(svgEl("line", { x1: 10, y1: y, x2: W - 10, y2: y, stroke: "rgba(148,163,184,0.14)", "stroke-width": 1 }));
    }
    nodes.push(svgEl("path", {
      d: `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`,
      fill: "none",
      stroke: "#38bdf8",
      "stroke-width": 3,
      "stroke-dasharray": "6 4",
    }));
    nodes.push(svgEl("circle", { cx: p1.x, cy: p1.y, r: 6, fill: "#34d399", stroke: "#0b1e38", "stroke-width": 2 }));
    nodes.push(svgEl("circle", { cx: p2.x, cy: p2.y, r: 6, fill: "#f59e0b", stroke: "#0b1e38", "stroke-width": 2 }));

    const t1 = svgEl("text", { x: p1.x, y: p1.y + 18, fill: "#e2e8f0", "font-size": 12, "font-weight": 700, "text-anchor": "middle" });
    t1.textContent = ev.originAirport.code;
    const t2 = svgEl("text", { x: p2.x, y: p2.y + 18, fill: "#fef3c7", "font-size": 12, "font-weight": 700, "text-anchor": "middle" });
    t2.textContent = ev.destinationAirport.code;
    const midLabel = svgEl("text", { x: mx, y: Math.max(18, my - 6), fill: "#bae6fd", "font-size": 11, "font-weight": 700, "text-anchor": "middle" });
    midLabel.textContent = `${ev.carrierInfo.code} · ${ev.distanceKm} km`;
    nodes.push(t1, t2, midLabel);
    svg.replaceChildren(...nodes);
  }

  renderRegimes() {
    const ev = this.currentEvaluation;
    const dualEl = this.doc.querySelector("#dual-regime-banner");
    if (dualEl) {
      dualEl.textContent = ev.dualRegimeNote || "";
      dualEl.hidden = !ev.hasDualRegimeChoice;
    }

    const grid = this.doc.querySelector("#regimes-grid");
    if (!grid) return;
    if (ev.applicableRegimes.length === 0) {
      grid.replaceChildren(el("p", "No EU261, UK261, SHY-PASSENGER, or US DOT statutory regime applies to this carrier/route pairing. Check Montreal Convention Art. 19/22 (up to 1,519 SDR baggage) or airline contract of carriage.", "muted"));
      return;
    }

    const cards = ev.applicableRegimes.map((r) => {
      const isRec = ev.recommendedRegime && ev.recommendedRegime.code === r.code && r.status === "eligible";
      const card = el("article", "", isRec ? "regime-card recommended" : "regime-card");
      const top = el("div", "", "regime-top");
      top.append(el("strong", r.name));

      let tagText = "INELIGIBLE";
      let tagClass = "regime-tag tag-none";
      if (r.status === "eligible") {
        tagText = isRec ? "HIGHEST CASH PAYOUT" : "ELIGIBLE";
        tagClass = "regime-tag tag-eligible";
      } else if (r.status === "cash_refund_eligible") {
        tagText = "CASH REFUND RIGHT";
        tagClass = "regime-tag tag-refund";
      } else if (r.status === "care_only_extraordinary") {
        tagText = "CARE ONLY (EXEMPT)";
        tagClass = "regime-tag tag-care";
      }
      top.append(el("span", tagText, tagClass));

      const amt = el("div", `${r.currency} ${r.totalAmount.toLocaleString("en-US")}`, "regime-amount");
      const sub = el("div", `${r.currency} ${r.perPassengerAmount}/pax × ${ev.input.passengers} · EUR ${r.totalEurEquivalent} eq. · Care: ${r.careEligible ? "Mandatory" : "Policy"}`, "regime-sub");
      const rat = el("p", r.rationale, "regime-rationale");
      card.append(top, amt, sub, rat);
      return card;
    });
    grid.replaceChildren(...cards);
  }

  renderCare() {
    const list = this.doc.querySelector("#care-list");
    if (!list) return;
    if (this.careExpenses.length === 0) {
      list.replaceChildren(el("p", "No care receipts added yet.", "muted"));
      return;
    }
    const rows = this.careExpenses.map((item) => {
      const row = el("div", "", "care-row");
      const left = el("div");
      left.append(el("strong", `${item.id} · ${item.category.toUpperCase()} — EUR ${item.amountEur}`), el("div", item.note, "muted"));
      const rmBtn = el("button", "Remove", "remove-btn");
      rmBtn.type = "button";
      rmBtn.addEventListener("click", () => this.removeCareExpense({ expenseId: item.id }));
      row.append(left, rmBtn);
      return row;
    });
    list.replaceChildren(...rows);
  }

  renderFiledClaims() {
    const out = this.doc.querySelector("#filed-claims");
    if (!out) return;
    if (this.filedClaims.length === 0) {
      out.replaceChildren(el("p", "No formal statutory claim dossier generated yet.", "muted"));
      return;
    }
    const cards = this.filedClaims.map((c) => {
      const box = el("article", "", "claim-receipt");
      box.append(
        el("strong", `${c.claimId} · ${c.flightNumber} (${c.route}) · ${c.regimeName}`),
        el("div", `Claimed: ${c.compensationCurrency} ${c.compensationAmount} + EUR ${c.careTotalEur} care · SHA-256: ${c.dossierHash.slice(0, 20)}…`, "muted"),
        el("pre", c.demandLetter)
      );
      return box;
    });
    out.replaceChildren(...cards);
  }

  renderAll() {
    this.syncFormToEvaluation();
    this.renderHeaderBadges();
    this.renderMap();
    this.renderRegimes();
    this.renderCare();
    this.renderFiledClaims();
  }
}

export class App {
  static page = null;

  static start() {
    if (!App.page && typeof document !== "undefined") {
      App.page = new FlightRightsPage(document);
    }
    return App.page;
  }
}

App.start();
