import { App } from "./js/app.js";

function routeProperties() {
  return {
    origin: { type: "string", minLength: 3, maxLength: 3, description: "3-letter IATA origin airport code, e.g. FRA, JFK, IST, LHR, CDG." },
    destination: { type: "string", minLength: 3, maxLength: 3, description: "3-letter IATA destination airport code, e.g. ZRH, LHR, JFK, BCN, AYT." },
    carrier: { type: "string", minLength: 2, maxLength: 2, description: "2-letter IATA airline code, e.g. LH, LX, BA, AF, KL, TK, UA, DL." },
    disruptionType: { type: "string", enum: ["delay", "cancellation", "denied_boarding"], description: "Type of flight disruption." },
    cause: { type: "string", enum: ["technical_fault", "crew_shortage", "airline_strike", "denied_boarding_overbooked", "atc_restriction", "severe_weather"], description: "Reported cause of disruption." },
    delayHours: { type: "number", minimum: 0, maximum: 72, description: "Final arrival delay in hours." },
    noticeDays: { type: "integer", minimum: 0, maximum: 365, description: "Days of advance notice for cancellations (0 for delays)." },
    rerouteDelayHours: { type: "number", minimum: 0, maximum: 72, description: "Arrival delta in hours on airline-offered reroute (0 if not rerouted)." },
    passengers: { type: "integer", minimum: 1, maximum: 9, description: "Number of affected passengers." },
    ticketFareUsd: { type: "number", minimum: 0, maximum: 25000, description: "One-way ticket fare in USD (used for US DOT refund and IDB caps)." },
  };
}

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.calculateEntitlementAction());
    actions.register(SiteActions.statuteGuideAction());
    actions.register(SiteActions.evaluateFlightAction());
    actions.register(SiteActions.addCareExpenseAction());
    actions.register(SiteActions.removeCareExpenseAction());
    actions.register(SiteActions.fileClaimAction());
  }

  static readStateAction() {
    return {
      name: "get_desk_state",
      description: "Read the FlightRights Desk state: today, dossierVersion, active flight evaluation across EU261/UK261/SHY-PASSENGER/US DOT, care expenses, latest filed claim, supported airports/carriers, and page facts including the Disruption Ledger link. Changes nothing. Call it before answering about the current dossier, and again in each turn that needs it.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getState(),
    };
  }

  static calculateEntitlementAction() {
    return {
      name: "calculate_route_entitlement",
      description: "Deterministically calculate Haversine great-circle distance and statutory entitlements across EU261, UK261, Turkish SHY-PASSENGER, US DOT, and Montreal Convention without changing the page. Changes nothing.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["origin", "destination", "carrier", "disruptionType", "delayHours"],
        properties: routeProperties(),
      },
      execute: (args) => App.page.calculateRouteEntitlement(args),
    };
  }

  static statuteGuideAction() {
    return {
      name: "get_statute_guide",
      description: "Read the statutory compensation bands, CJEU extraordinary-circumstances precedents, and site limits. Changes nothing.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getStatuteGuide(),
    };
  }

  static evaluateFlightAction() {
    return {
      name: "evaluate_flight_claim",
      description: "Update the interactive calculator, SVG great-circle map, and regime cards on this page for a specific flight and increment dossierVersion. Call it only when the visitor asks to load or evaluate a flight in the workbench.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["origin", "destination", "carrier", "disruptionType", "delayHours"],
        properties: routeProperties(),
      },
      execute: (args) => App.page.evaluateFlightClaim(args),
    };
  }

  static addCareExpenseAction() {
    return {
      name: "add_care_expense",
      description: "Add an Art. 9 care receipt (meals, hotel, transfer, or communications) in EUR to the claim dossier and increment dossierVersion. Call it only when the visitor asks to add an expense.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["category", "amountEur"],
        properties: {
          category: { type: "string", enum: ["meals", "hotel", "transfer", "communications"], description: "Expense category." },
          amountEur: { type: "number", minimum: 1, maximum: 2000, description: "Receipt amount in EUR." },
          note: { type: "string", maxLength: 100, description: "Optional short receipt description." },
        },
      },
      execute: (args) => App.page.addCareExpense(args),
    };
  }

  static removeCareExpenseAction() {
    return {
      name: "remove_care_expense",
      description: "Remove a care expense from the claim dossier by its CARE-N id. Call it only when the visitor asks to remove an expense.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["expenseId"],
        properties: {
          expenseId: { type: "string", minLength: 5, maxLength: 12, description: "Expense ID such as CARE-1." },
        },
      },
      execute: (args) => App.page.removeCareExpense(args),
    };
  }

  static fileClaimAction() {
    return {
      name: "file_statutory_claim",
      description: "Generate an irreversible SHA-256 statutory claim dossier and formal airline demand letter for the currently evaluated flight and care expenses. Ask the visitor for passengerName, email, flightNumber, flightDate, and bookingRef first. Call website_get_desk_state in the same turn and pass its dossierVersion as expectedVersion and evaluation.primaryCompensationEur as expectedCompensationEur.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["passengerName", "email", "flightNumber", "flightDate", "bookingRef", "expectedVersion", "expectedCompensationEur"],
        properties: {
          passengerName: { type: "string", minLength: 2, maxLength: 80, description: "Passenger full name." },
          email: { type: "string", minLength: 5, maxLength: 120, description: "Passenger email address." },
          flightNumber: { type: "string", minLength: 3, maxLength: 8, description: "Flight number such as LH1186." },
          flightDate: { type: "string", format: "date", description: "Flight date YYYY-MM-DD." },
          bookingRef: { type: "string", minLength: 5, maxLength: 8, description: "5-8 character alphanumeric PNR." },
          expectedVersion: { type: "integer", minimum: 1, description: "Latest dossierVersion from website_get_desk_state in this turn." },
          expectedCompensationEur: { type: "number", minimum: 0, description: "Latest evaluation.primaryCompensationEur from website_get_desk_state in this turn." },
        },
      },
      execute: (args) => App.page.fileStatutoryClaim(args),
    };
  }
}

export const registerActions = SiteActions.registerActions;
