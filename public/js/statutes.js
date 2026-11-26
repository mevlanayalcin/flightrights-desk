import { AIRPORTS, CARRIERS, DISRUPTION_CAUSES } from "./airports.js";

export const DESK_TODAY = "2026-11-26";
export const MONTREAL_SDR_LIMIT = 1519; // Updated ICAO Montreal Convention Art. 22(2) limit effective Dec 28, 2024
export const EUR_PER_GBP = 1.18;
export const EUR_PER_USD = 0.92;

const EU_EEA_CH = new Set(["EU", "EEA", "CH"]);

export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371.0088;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function sha256HexSync(input) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  const str = String(input);
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
    h3 = Math.imul(h3 ^ (c * 31), 0xc2b2ae35) >>> 0;
    h4 = Math.imul(h4 ^ (c ^ 0xa5), 0x27d4eb2d) >>> 0;
  }
  const hex = (n) => n.toString(16).padStart(8, "0");
  return `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}${hex(h1 ^ h3)}${hex(h2 ^ h4)}${hex(h1 ^ h4)}${hex(h2 ^ h3)}`;
}

export async function computeDossierHash(payload) {
  if (globalThis.crypto?.subtle && typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256HexSync(payload);
}

export class StatuteEngine {
  static validateInput(raw) {
    const origin = String(raw?.origin || "").trim().toUpperCase();
    const destination = String(raw?.destination || "").trim().toUpperCase();
    const carrier = String(raw?.carrier || "").trim().toUpperCase();
    const disruptionType = String(raw?.disruptionType || "delay").trim().toLowerCase();
    const cause = String(raw?.cause || "technical_fault").trim().toLowerCase();
    const delayHours = Number(raw?.delayHours ?? 0);
    const noticeDays = Number(raw?.noticeDays ?? 0);
    const passengers = Number(raw?.passengers ?? 1);
    const rerouteDelayHours = Number(raw?.rerouteDelayHours ?? 0);
    const ticketFareUsd = Number(raw?.ticketFareUsd ?? 450);

    if (!AIRPORTS[origin]) {
      return { ok: false, field: "origin", reason: `Unknown origin airport "${raw?.origin || ""}". Use a supported 3-letter IATA code (e.g. FRA, ZRH, LHR, IST, JFK, CDG, AMS).` };
    }
    if (!AIRPORTS[destination]) {
      return { ok: false, field: "destination", reason: `Unknown destination airport "${raw?.destination || ""}". Use a supported 3-letter IATA code.` };
    }
    if (origin === destination) {
      return { ok: false, field: "destination", reason: "Origin and destination airports must be different." };
    }
    if (!CARRIERS[carrier]) {
      return { ok: false, field: "carrier", reason: `Unknown airline IATA code "${raw?.carrier || ""}". Supported carriers include LH, LX, BA, AF, KL, TK, UA, DL, AA, IB, VY, FR, W6, EK, QR, SQ.` };
    }
    if (!["delay", "cancellation", "denied_boarding"].includes(disruptionType)) {
      return { ok: false, field: "disruptionType", reason: "Disruption type must be delay, cancellation, or denied_boarding." };
    }
    if (!DISRUPTION_CAUSES[cause]) {
      return { ok: false, field: "cause", reason: `Unknown cause "${raw?.cause || ""}". Choose one of: ${Object.keys(DISRUPTION_CAUSES).join(", ")}.` };
    }
    if (!Number.isFinite(delayHours) || delayHours < 0 || delayHours > 72) {
      return { ok: false, field: "delayHours", reason: "Arrival delay hours must be between 0 and 72." };
    }
    if (!Number.isFinite(noticeDays) || noticeDays < 0 || noticeDays > 365) {
      return { ok: false, field: "noticeDays", reason: "Cancellation notice days must be between 0 and 365." };
    }
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
      return { ok: false, field: "passengers", reason: "Passenger count must be an integer between 1 and 9." };
    }
    if (!Number.isFinite(rerouteDelayHours) || rerouteDelayHours < 0 || rerouteDelayHours > 72) {
      return { ok: false, field: "rerouteDelayHours", reason: "Reroute arrival delta hours must be between 0 and 72." };
    }
    if (!Number.isFinite(ticketFareUsd) || ticketFareUsd < 0 || ticketFareUsd > 25000) {
      return { ok: false, field: "ticketFareUsd", reason: "Ticket fare must be between 0 and 25,000 USD." };
    }

    return {
      ok: true,
      normalized: {
        origin,
        destination,
        carrier,
        disruptionType,
        cause,
        delayHours,
        noticeDays,
        passengers,
        rerouteDelayHours,
        ticketFareUsd,
      },
    };
  }

  static evaluate(raw) {
    const check = StatuteEngine.validateInput(raw);
    if (!check.ok) return check;

    const inp = check.normalized;
    const orig = AIRPORTS[inp.origin];
    const dest = AIRPORTS[inp.destination];
    const carrier = CARRIERS[inp.carrier];
    const causeInfo = DISRUPTION_CAUSES[inp.cause];
    const distanceKm = haversineKm(orig, dest);
    const distanceMiles = Math.round(distanceKm * 0.621371);
    const isIntraEu = EU_EEA_CH.has(orig.region) && EU_EEA_CH.has(dest.region);
    const isDomesticTr = orig.country === "TR" && dest.country === "TR";
    const isDomesticUs = orig.country === "US" && dest.country === "US";

    const careThresholdHours = distanceKm <= 1500 ? 2 : distanceKm <= 3500 ? 3 : 4;
    const careEligible = inp.delayHours >= careThresholdHours || inp.disruptionType === "cancellation" || inp.disruptionType === "denied_boarding";

    const regimes = [];

    // 1. EU Regulation (EC) No 261/2004 (and CH-EU bilateral agreement)
    const euScope = EU_EEA_CH.has(orig.region) || (EU_EEA_CH.has(dest.region) && EU_EEA_CH.has(carrier.region));
    if (euScope) {
      const bandEur = distanceKm <= 1500 ? 250 : (isIntraEu || distanceKm <= 3500) ? 400 : 600;
      const rerouteCutoff = distanceKm <= 1500 ? 2 : distanceKm <= 3500 ? 3 : 4;
      let perPassengerEur = 0;
      let status = "ineligible";
      let rationale = "";

      if (inp.disruptionType === "denied_boarding") {
        perPassengerEur = bandEur;
        if (inp.rerouteDelayHours > 0 && inp.rerouteDelayHours <= rerouteCutoff) {
          perPassengerEur = Math.round(bandEur * 0.5);
          rationale = `EU261 Art. 4(3) & Art. 7(2): involuntary denied boarding with reroute arriving <=${rerouteCutoff}h triggers 50% reduced cash payout (EUR ${perPassengerEur}/pax).`;
        } else {
          rationale = `EU261 Art. 4(3): involuntary denied boarding triggers immediate cash payout of EUR ${perPassengerEur}/pax (${distanceKm} km great-circle band).`;
        }
        status = "eligible";
      } else if (causeInfo.extraordinary) {
        status = "care_only_extraordinary";
        rationale = `Art. 5(3) extraordinary defense applies for verified ${causeInfo.label} (cash EUR 0), but Art. 9 Right to Care (meals, hotel, transfers) & Art. 8 refund/reroute ALWAYS remain mandatory.`;
      } else if (inp.disruptionType === "cancellation") {
        if (inp.noticeDays >= 14) {
          status = "ineligible_notice";
          rationale = `Cancelled >=14 days ahead (${inp.noticeDays} days): EU261 Art. 5(1)(c) exempts fixed cash compensation, though full Art. 8 refund or rerouting still applies.`;
        } else {
          const effDelay = inp.rerouteDelayHours > 0 ? inp.rerouteDelayHours : inp.delayHours;
          const halved = effDelay > 0 && effDelay <= rerouteCutoff;
          perPassengerEur = halved ? Math.round(bandEur * 0.5) : bandEur;
          status = "eligible";
          rationale = halved
            ? `EU261 Art. 5 & Art. 7(2): cancelled with ${inp.noticeDays}d notice; reroute within ${rerouteCutoff}h reduces payout by 50% to EUR ${perPassengerEur}/pax.`
            : `EU261 Art. 5(1)(c): cancelled with ${inp.noticeDays}d notice (<14d) for non-extraordinary cause -> EUR ${perPassengerEur}/pax.`;
        }
      } else {
        // Delay (Sturgeon C-402/07: >= 3h arrival delay)
        if (inp.delayHours >= 3) {
          const halved = distanceKm > 3500 && !isIntraEu && inp.delayHours < 4;
          perPassengerEur = halved ? Math.round(bandEur * 0.5) : bandEur;
          status = "eligible";
          rationale = halved
            ? `CJEU Sturgeon (C-402/07) & Art. 7(2)(c): arrival delay ${inp.delayHours}h on >3500 km flight (between 3h and 4h) -> 50% reduced payout EUR ${perPassengerEur}/pax.`
            : `CJEU Sturgeon (C-402/07): arrival delay ${inp.delayHours}h (>=3h) for ${causeInfo.label} -> EUR ${perPassengerEur}/pax (${distanceKm} km).`;
        } else {
          status = "below_threshold";
          rationale = `Arrival delay ${inp.delayHours}h is under the 3-hour EU261 cash threshold. Art. 9 care triggers at ${careThresholdHours}h.`;
        }
      }

      regimes.push({
        code: "EU261",
        name: orig.region === "CH" || dest.region === "CH" ? "EU261 / Swiss Air Transport Agreement" : "EU Regulation (EC) 261/2004",
        currency: "EUR",
        perPassengerAmount: perPassengerEur,
        totalAmount: perPassengerEur * inp.passengers,
        totalEurEquivalent: perPassengerEur * inp.passengers,
        status,
        careEligible,
        refundRight: inp.delayHours >= 5 || inp.disruptionType !== "delay",
        rationale,
      });
    }

    // 2. UK261 (SI 2019/278)
    const ukScope = orig.region === "UK" || (dest.region === "UK" && (carrier.region === "UK" || EU_EEA_CH.has(carrier.region)));
    if (ukScope) {
      const bandGbp = distanceKm <= 1500 ? 220 : distanceKm <= 3500 ? 350 : 520;
      const rerouteCutoff = distanceKm <= 1500 ? 2 : distanceKm <= 3500 ? 3 : 4;
      let perPassengerGbp = 0;
      let status = "ineligible";
      let rationale = "";

      if (inp.disruptionType === "denied_boarding") {
        perPassengerGbp = (inp.rerouteDelayHours > 0 && inp.rerouteDelayHours <= rerouteCutoff) ? Math.round(bandGbp * 0.5) : bandGbp;
        status = "eligible";
        rationale = `UK261 Art. 4(3): involuntary denied boarding -> GBP ${perPassengerGbp}/pax.`;
      } else if (causeInfo.extraordinary) {
        status = "care_only_extraordinary";
        rationale = `UK261 extraordinary defense applies for verified ${causeInfo.label} (cash GBP 0), while care & rerouting remain mandatory.`;
      } else if (inp.disruptionType === "cancellation") {
        if (inp.noticeDays >= 14) {
          status = "ineligible_notice";
          rationale = `Cancelled >=14 days before departure: cash exempt under UK261, full refund/reroute applies.`;
        } else {
          const effDelay = inp.rerouteDelayHours > 0 ? inp.rerouteDelayHours : inp.delayHours;
          const halved = effDelay > 0 && effDelay <= rerouteCutoff;
          perPassengerGbp = halved ? Math.round(bandGbp * 0.5) : bandGbp;
          status = "eligible";
          rationale = `UK261 Art. 5: cancelled with ${inp.noticeDays}d notice -> GBP ${perPassengerGbp}/pax (${distanceKm} km).`;
        }
      } else if (inp.delayHours >= 3) {
        const halved = distanceKm > 3500 && inp.delayHours < 4;
        perPassengerGbp = halved ? Math.round(bandGbp * 0.5) : bandGbp;
        status = "eligible";
        rationale = `UK261: arrival delay ${inp.delayHours}h (>=3h) for ${causeInfo.label} -> GBP ${perPassengerGbp}/pax.`;
      } else {
        status = "below_threshold";
        rationale = `Arrival delay ${inp.delayHours}h is under the 3-hour UK261 cash threshold.`;
      }

      regimes.push({
        code: "UK261",
        name: "UK261 (Retained Regulation SI 2019/278)",
        currency: "GBP",
        perPassengerAmount: perPassengerGbp,
        totalAmount: perPassengerGbp * inp.passengers,
        totalEurEquivalent: Math.round(perPassengerGbp * inp.passengers * EUR_PER_GBP),
        status,
        careEligible,
        refundRight: inp.delayHours >= 5 || inp.disruptionType !== "delay",
        rationale,
      });
    }

    // 3. Turkish SHY-PASSENGER (SHY-YOLCU)
    const trScope = orig.region === "TR" || (dest.region === "TR" && carrier.region === "TR");
    if (trScope) {
      const bandEur = isDomesticTr ? 100 : distanceKm <= 1500 ? 250 : distanceKm <= 3500 ? 400 : 600;
      const rerouteCutoff = distanceKm <= 1500 ? 2 : distanceKm <= 3500 ? 3 : 4;
      let perPassengerEur = 0;
      let status = "ineligible";
      let rationale = "";

      if (inp.disruptionType === "denied_boarding") {
        perPassengerEur = (inp.rerouteDelayHours > 0 && inp.rerouteDelayHours <= rerouteCutoff) ? Math.round(bandEur * 0.5) : bandEur;
        status = "eligible";
        rationale = `SHY-PASSENGER Art. 5 & Art. 8: involuntary denied boarding (${isDomesticTr ? "domestic EUR 100 band" : `${distanceKm} km international band`}) -> EUR ${perPassengerEur}/pax (paid in TRY at CBRT rate).`;
      } else if (causeInfo.extraordinary) {
        status = "care_only_extraordinary";
        rationale = `SHY-PASSENGER force majeure applies for verified ${causeInfo.label}; food, hotel & communication assistance remain mandatory.`;
      } else if (inp.disruptionType === "cancellation") {
        if (inp.noticeDays >= 14) {
          status = "ineligible_notice";
          rationale = `Cancelled >=14 days prior: SHY-PASSENGER fixed cash exempt, ticket refund/reroute applies.`;
        } else {
          const effDelay = inp.rerouteDelayHours > 0 ? inp.rerouteDelayHours : inp.delayHours;
          const halved = !isDomesticTr && effDelay > 0 && effDelay <= rerouteCutoff;
          perPassengerEur = halved ? Math.round(bandEur * 0.5) : bandEur;
          status = "eligible";
          rationale = `SHY-PASSENGER Art. 6 & Art. 8: cancellation (<14d notice) -> EUR ${perPassengerEur}/pax (TRY equivalent at CBRT selling rate).`;
        }
      } else if (inp.delayHours >= 3) {
        perPassengerEur = bandEur;
        status = "eligible";
        rationale = `SHY-PASSENGER (2024+ SHGM delay amendment): >=3h delay (${inp.delayHours}h) for ${causeInfo.label} -> EUR ${perPassengerEur}/pax.`;
      } else {
        status = "below_threshold";
        rationale = `Delay ${inp.delayHours}h is under the 3-hour SHY-PASSENGER compensation threshold.`;
      }

      regimes.push({
        code: "SHY_PASSENGER",
        name: "Turkish SHY-PASSENGER (SHY-YOLCU / SHGM)",
        currency: "EUR",
        perPassengerAmount: perPassengerEur,
        totalAmount: perPassengerEur * inp.passengers,
        totalEurEquivalent: perPassengerEur * inp.passengers,
        status,
        careEligible,
        refundRight: inp.delayHours >= 5 || inp.disruptionType !== "delay",
        rationale,
      });
    }

    // 4. US DOT Automatic Cash Refund (14 CFR Part 259) & Denied Boarding (14 CFR Part 250)
    const usScope = orig.region === "US" || dest.region === "US";
    if (usScope) {
      const sigDelayThreshold = isDomesticUs ? 3 : 6;
      let perPassengerUsd = 0;
      let status = "ineligible";
      let rationale = "";

      if (inp.disruptionType === "denied_boarding") {
        const effDelay = inp.rerouteDelayHours > 0 ? inp.rerouteDelayHours : inp.delayHours;
        const highCutoff = isDomesticUs ? 2 : 4;
        if (effDelay < 1) {
          perPassengerUsd = 0;
          status = "below_threshold";
          rationale = "US DOT 14 CFR Part 250: no cash IDB penalty when alternate transport arrives within 1 hour.";
        } else if (effDelay <= highCutoff) {
          perPassengerUsd = Math.min(Math.round(inp.ticketFareUsd * 2), 775);
          status = "eligible";
          rationale = `US DOT 14 CFR Part 250: involuntary denied boarding (1-${highCutoff}h delay) -> 200% of one-way fare capped at USD 775 (USD ${perPassengerUsd}/pax).`;
        } else {
          perPassengerUsd = Math.min(Math.round(inp.ticketFareUsd * 4), 1550);
          status = "eligible";
          rationale = `US DOT 14 CFR Part 250: involuntary denied boarding (>${highCutoff}h delay) -> 400% of one-way fare capped at USD 1,550 (USD ${perPassengerUsd}/pax).`;
        }
      } else if (inp.disruptionType === "cancellation" || inp.delayHours >= sigDelayThreshold) {
        status = "cash_refund_eligible";
        perPassengerUsd = Math.round(inp.ticketFareUsd);
        rationale = `US DOT 14 CFR Part 259 (Automatic Cash Refund Rule): ${inp.disruptionType === "cancellation" ? "cancellation" : `significant delay >=${sigDelayThreshold}h (${inp.delayHours}h)`} entitles passenger who declines rebooking to automatic prompt cash refund of USD ${perPassengerUsd}/pax (7 business days for credit card). No separate statutory delay penalty.`;
      } else {
        status = "below_threshold";
        rationale = `US DOT automatic cash refund threshold is >=${sigDelayThreshold}h for ${isDomesticUs ? "domestic" : "international"} flights (current delay: ${inp.delayHours}h).`;
      }

      regimes.push({
        code: "US_DOT",
        name: "US DOT (14 CFR Parts 250 & 259)",
        currency: "USD",
        perPassengerAmount: perPassengerUsd,
        totalAmount: perPassengerUsd * inp.passengers,
        totalEurEquivalent: Math.round(perPassengerUsd * inp.passengers * EUR_PER_USD),
        status,
        careEligible: false,
        refundRight: status === "cash_refund_eligible",
        rationale,
      });
    }

    // Pick highest statutory compensation regime (excluding refund-only US DOT unless it is the only applicable regime)
    const cashRegimes = regimes.filter((r) => r.status === "eligible");
    const bestRegime = cashRegimes.length > 0
      ? cashRegimes.slice().sort((a, b) => b.totalEurEquivalent - a.totalEurEquivalent)[0]
      : (regimes[0] || null);

    return {
      ok: true,
      input: inp,
      originAirport: orig,
      destinationAirport: dest,
      carrierInfo: carrier,
      causeInfo,
      distanceKm,
      distanceMiles,
      careThresholdHours,
      careEligible,
      montrealBaggageLimitSdr: MONTREAL_SDR_LIMIT,
      applicableRegimes: regimes,
      recommendedRegime: bestRegime,
      primaryCompensationEur: bestRegime && bestRegime.status === "eligible" ? bestRegime.totalEurEquivalent : 0,
      hasDualRegimeChoice: cashRegimes.length >= 2,
      dualRegimeNote: cashRegimes.length >= 2
        ? `Multiple statutory regimes apply (${cashRegimes.map((r) => r.code).join(" and ")}). Passengers may claim under ONE regime only (no double recovery); ${bestRegime.code} yields the highest EUR-equivalent payout.`
        : null,
    };
  }
}
