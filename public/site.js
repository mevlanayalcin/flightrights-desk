import { App } from "./js/app.js";

export class AssistantMount {
  static GREETING = "I can calculate your exact air passenger rights under EU261, UK261, Turkish SHY-PASSENGER, and US DOT, track Art. 9 care expenses, generate a confirmed statutory claim dossier, and ask Disruption Ledger (second origin) to verify airport ATC/weather logs, reroute thresholds, National Enforcement Bodies, or issue a zero-PII SHA-256 evidence seal.";

  static DIALOGS = {
    file_statutory_claim: {
      title: "Generate this formal statutory claim dossier?",
      sentence: "We will generate a permanent SHA-256 verified statutory claim dossier and formal airline demand notice for the flight and passenger details below.",
      confirm: "Generate statutory claim",
      decline: "Keep editing",
    },
  };

  static async start() {
    const status = document.querySelector("#assistant-status");
    const siteBase = new URL("./", import.meta.url).href;
    try {
      const { boot } = await import("./runtime/index.js");
      const booted = await boot("#agent-app", {
        originUrl: siteBase,
        sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
      });
      AssistantMount.engine = booted.engine;
      AssistantMount.defaultReview = booted.engine.onActionConfirm;
      booted.engine.onActionConfirm = AssistantMount.review;
      AssistantMount.defaultConsent = booted.engine.onConsent;
      booted.engine.onConsent = AssistantMount.consent;
      const needsKey = !booted.engine.mockLLM
        && !booted.engine.publisherFundedLLM
        && (!booted.engine.byokKey || booted.engine.byokKey === "demo");
      status.textContent = needsKey
        ? "Assistant needs your AI provider key. Add it in AI model settings below."
        : booted.engine.publisherFundedLLM
          ? "Assistant ready (free publisher-funded AI active — or connect Otari/OpenRouter in AI model settings)."
          : "Assistant connected to this page.";
      if (!needsKey) {
        AssistantMount.greet();
      }
      return booted.engine;
    } catch (error) {
      status.textContent = "The assistant could not load. You can still use the page directly.";
      console.error("Assistant startup failed", error);
      return null;
    }
  }

  static greet() {
    const first = document.querySelector("#ns-msgs .ns-msg.bot");
    if (first) {
      first.textContent = AssistantMount.GREETING;
    }
  }

  static async review(items) {
    let confirmed = false;
    const pageOrigin = new URL(document.URL).origin;
    const isThisPagesDialog = (item) => Boolean(AssistantMount.DIALOGS[item.action]) && item.origin === pageOrigin;
    if (items.length === 1 && isThisPagesDialog(items[0])) {
      const content = AssistantMount.dialogContent(items[0]);
      if (content.refusal) {
        throw new Error(content.refusal);
      }
      confirmed = await new Promise(AssistantMount.openDialog.bind(null, content));
    } else if (items.some(isThisPagesDialog)) {
      throw new Error("This action must be confirmed on its own, not bundled with other actions.");
    } else {
      confirmed = await AssistantMount.defaultReview(items);
    }
    AssistantMount.keepFocusInChat();
    return confirmed;
  }

  static async consent(request) {
    const active = document.activeElement;
    const app = document.querySelector("#agent-app");
    const inPageForm = Boolean(active && active !== document.body && app && !app.contains(active));
    const pending = AssistantMount.defaultConsent(request);
    if (!inPageForm) {
      AssistantMount.focusConsentCard();
    }
    const answer = await pending;
    if (!inPageForm) {
      AssistantMount.keepFocusInChat();
    }
    return answer;
  }

  static focusConsentCard() {
    const cards = document.querySelectorAll("#ns-msgs .ns-consent");
    const card = cards[cards.length - 1];
    if (!card) return;
    card.setAttribute("role", "group");
    const title = card.querySelector(".ns-consent-title");
    if (title) {
      title.id = title.id || "assistant-consent-title";
      card.setAttribute("aria-labelledby", title.id);
      title.tabIndex = -1;
      title.focus();
    }
  }

  static dialogContent(item) {
    const details = AssistantMount.reviewDetails(item.action, item.arguments);
    return {
      ...AssistantMount.DIALOGS[item.action],
      details,
      refusal: details.refusal,
      exact: `${item.action} on ${item.origin} (${item.effect})\n${JSON.stringify(item.arguments, null, 2)}`,
    };
  }

  static reviewDetails(action, args) {
    if (action === "file_statutory_claim") {
      const check = App.page.checkFileStatutoryClaim(args);
      if (!check.ok) return { refusal: check.reason };
      return check.details;
    }
    return {};
  }

  static openDialog(content, resolve) {
    const dialog = document.createElement("dialog");
    dialog.className = "assistant-review";
    dialog.setAttribute("aria-labelledby", "assistant-review-title");
    const heading = document.createElement("h2");
    heading.id = "assistant-review-title";
    heading.textContent = content.title;
    heading.tabIndex = -1;
    heading.autofocus = true;
    const sentence = document.createElement("p");
    sentence.textContent = content.sentence;
    dialog.append(heading, sentence);
    const exact = document.createElement("details");
    const exactLabel = document.createElement("summary");
    exactLabel.textContent = "Technical details";
    const exactText = document.createElement("pre");
    exactText.textContent = content.exact;
    exact.append(exactLabel, exactText);
    const entries = Object.entries(content.details);
    if (entries.length) {
      const list = document.createElement("dl");
      for (const [label, value] of entries) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = String(value);
        list.append(term, description);
      }
      dialog.append(list);
    } else {
      exact.open = true;
    }
    const confirmButton = document.createElement("button");
    confirmButton.textContent = content.confirm;
    confirmButton.addEventListener("click", dialog.close.bind(dialog, "confirm"));
    const declineButton = document.createElement("button");
    declineButton.className = "assistant-decline";
    declineButton.textContent = content.decline;
    declineButton.addEventListener("click", dialog.close.bind(dialog, "decline"));
    dialog.addEventListener("close", AssistantMount.finishDialog.bind(null, dialog, resolve));
    dialog.append(exact, confirmButton, declineButton);
    document.body.append(dialog);
    dialog.showModal();
  }

  static finishDialog(dialog, resolve) {
    dialog.remove();
    resolve(dialog.returnValue === "confirm");
  }

  static keepFocusInChat() {
    if (document.activeElement === document.body || document.activeElement === null) {
      document.querySelector("#ns-input")?.focus();
    }
  }
}

if (typeof window !== "undefined") {
  await AssistantMount.start();
}
