import { FlightRightsPage } from "../js/app.js";
import { StatuteEngine } from "../js/statutes.js";
import { DISRUPTION_CAUSES } from "../js/airports.js";
import { trustedHtml } from "../runtime/trusted-types.js";

class BridgeActions {
  static CALLERS = ["*"];
  static PAGE = new URL("../index.html", import.meta.url).href;

  static registerActions(actions) {
    actions.register(BridgeActions.readStateAction());
    actions.register(BridgeActions.calculateEntitlementAction());
    actions.register(BridgeActions.statuteGuideAction());
  }

  static readStateAction() {
    return {
      name: "get_desk_state",
      description: "Read FlightRights Desk public airport/carrier coverage, presets, default evaluation, and page facts. Changes nothing.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: BridgeActions.readState,
    };
  }

  static async readState() {
    const page = await BridgeActions.readPage(BridgeActions.PAGE);
    return Object.assign(FlightRightsPage.siteState(), {
      pageFacts: FlightRightsPage.factsIn(page),
    });
  }

  static calculateEntitlementAction() {
    return {
      name: "calculate_route_entitlement",
      description: "Deterministically calculate Haversine great-circle distance and statutory entitlements across EU261, UK261, Turkish SHY-PASSENGER, US DOT, and Montreal Convention. Changes nothing.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["origin", "destination", "carrier", "disruptionType", "delayHours"],
        properties: {
          origin: { type: "string", minLength: 3, maxLength: 3 },
          destination: { type: "string", minLength: 3, maxLength: 3 },
          carrier: { type: "string", minLength: 2, maxLength: 2 },
          disruptionType: { type: "string", enum: ["delay", "cancellation", "denied_boarding"] },
          cause: { type: "string", enum: ["technical_fault", "crew_shortage", "airline_strike", "denied_boarding_overbooked", "atc_restriction", "severe_weather"] },
          delayHours: { type: "number", minimum: 0, maximum: 72 },
          noticeDays: { type: "integer", minimum: 0, maximum: 365 },
          rerouteDelayHours: { type: "number", minimum: 0, maximum: 72 },
          passengers: { type: "integer", minimum: 1, maximum: 9 },
          ticketFareUsd: { type: "number", minimum: 0, maximum: 25000 },
        },
      },
      execute: (args) => StatuteEngine.evaluate(args),
    };
  }

  static statuteGuideAction() {
    return {
      name: "get_statute_guide",
      description: "Read the statutory compensation bands, CJEU extraordinary-circumstances precedents, and site limits. Changes nothing.",
      effect: "read",
      availability: "bridge",
      callerOrigins: BridgeActions.CALLERS,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const page = await BridgeActions.readPage(BridgeActions.PAGE);
        return {
          ok: true,
          causes: Object.values(DISRUPTION_CAUSES),
          pageFacts: FlightRightsPage.factsIn(page),
        };
      },
    };
  }

  static async readPage(url) {
    if (typeof DOMParser === "undefined") {
      throw new Error("Reading the site page needs a browser.");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The site page answered ${response.status}.`);
    }
    const page = new DOMParser().parseFromString(trustedHtml(await response.text()), "text/html");
    const base = page.createElement("base");
    base.href = url;
    page.head.prepend(base);
    return page;
  }
}

export const registerActions = BridgeActions.registerActions;
