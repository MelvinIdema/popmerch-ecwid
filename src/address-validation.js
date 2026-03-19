/**
 * Popmerch Address Validation Module V1
 *
 * Validates shipping addresses entered in the Ecwid checkout using:
 * 1. Local normalization rules (no API call needed)
 *    e.g. "Kerkstraat12" → "Kerkstraat 12", "Wijkermeerweg 40 L" → "Wijkermeerweg 40L"
 * 2. Geoapify Geocoding API for unknown / questionable addresses
 *
 * UX principles:
 * - Non-blocking: user can always continue even with a warning
 * - Friendly: soft suggestions, never hard blocks
 * - Smart: avoids duplicate API calls, respects user's explicit confirmation
 *
 * Debug flags (set in localStorage):
 * - ADDR_DEBUG = "true"           — Enable debug logging
 * - ADDR_STEP_NORMALIZE = "false" — Disable local normalization step
 * - ADDR_STEP_GEOAPIFY = "false"  — Disable Geoapify validation step
 * - ADDR_STEP_UI = "false"        — Disable UI rendering (validation still runs)
 */

export function initAddressValidation(config = {}) {
  // ===== Debug Infrastructure =====

  function isDebug() {
    try {
      return localStorage.getItem("ADDR_DEBUG") === "true";
    } catch {
      return false;
    }
  }

  function isStepEnabled(step) {
    if (!isDebug()) return true;
    try {
      return localStorage.getItem(`ADDR_STEP_${step}`) !== "false";
    } catch {
      return true;
    }
  }

  function log(msg, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data
      ? console.log(`%c[AddrVal]%c ${msg}`, style, "", data)
      : console.log(`%c[AddrVal]%c ${msg}`, style, "");
  }

  function logWarn(msg, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data
      ? console.warn(`%c[AddrVal]%c ${msg}`, style, "", data)
      : console.warn(`%c[AddrVal]%c ${msg}`, style, "");
  }

  function logError(msg, err) {
    const style =
      "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    console.error(`%c[AddrVal]%c ${msg}`, style, "", err);
  }

  // ===== Config =====

  const CONFIG = {
    apiKey: config.apiKey || "",
    // Confidence threshold below which we show a warning (address not found / unreliable)
    confidenceWarning: 0.4,
    // Confidence threshold above which the address is considered clean
    confidenceClean: 0.75,
    pollInterval: 50,
    pollTimeout: 10_000,
  };

  log("=== Address Validation V1 ===");
  log("Config:", {
    apiKey: CONFIG.apiKey ? "***set***" : "(not set)",
    ADDR_DEBUG: isDebug(),
    ADDR_STEP_NORMALIZE: isStepEnabled("NORMALIZE"),
    ADDR_STEP_GEOAPIFY: isStepEnabled("GEOAPIFY"),
    ADDR_STEP_UI: isStepEnabled("UI"),
  });

  // ===== Session State =====

  const SESSION = {
    DISABLED_KEY: "pm_addr_disabled",
    LAST_KEY: "pm_addr_last",
    SKIP_KEY: "pm_addr_skip_next",

    isDisabled() {
      try {
        return sessionStorage.getItem(this.DISABLED_KEY) === "1";
      } catch {
        return false;
      }
    },
    disable() {
      try {
        sessionStorage.setItem(this.DISABLED_KEY, "1");
      } catch {
        /* noop */
      }
    },
    getLastValidated() {
      try {
        return JSON.parse(sessionStorage.getItem(this.LAST_KEY));
      } catch {
        return null;
      }
    },
    setLastValidated(addr) {
      try {
        sessionStorage.setItem(this.LAST_KEY, JSON.stringify(addr));
      } catch {
        /* noop */
      }
    },
    shouldSkipNext() {
      try {
        return sessionStorage.getItem(this.SKIP_KEY) === "1";
      } catch {
        return false;
      }
    },
    setSkipNext() {
      try {
        sessionStorage.setItem(this.SKIP_KEY, "1");
      } catch {
        /* noop */
      }
    },
    clearSkipNext() {
      try {
        sessionStorage.removeItem(this.SKIP_KEY);
      } catch {
        /* noop */
      }
    },
  };

  // ===== Module State =====

  // IDLE | VALIDATING | WARNING | CORRECTION | CLEAN
  let state = "IDLE";
  let onCheckoutAddressPage = false;
  let domObserver = null;
  const attachedInputs = new WeakSet();
  let pendingSuggestion = null;

  // ===== Wait for Ecwid =====

  async function waitForEcwid() {
    const start = Date.now();
    while (Date.now() - start < CONFIG.pollTimeout) {
      if (window.Ecwid?.OnPageLoaded?.add && window.Ecwid?.Cart?.get) return;
      await new Promise((r) => setTimeout(r, CONFIG.pollInterval));
    }
    logError("Ecwid not available within timeout", new Error("timeout"));
  }

  // ===== Street Normalization =====

  /**
   * Fix common address input mistakes without needing an API call.
   *
   * Rule 1: letter directly followed by digit → insert space
   *   "Kerkstraat12"      → "Kerkstraat 12"
   *   "Wijkermeerweg40L"  → "Wijkermeerweg 40L"  (rule 1 fires on 'g4', then rule 2 merges '0 L')
   *
   * Rule 2: digit(s) + space + single letter at end of string → merge
   *   "Wijkermeerweg 40 L" → "Wijkermeerweg 40L"
   *   "Kerkstraat 12 A"    → "Kerkstraat 12A"
   *   "Kerkstraat 12 Noord" → unchanged (multi-letter word, not a suffix)
   */
  function normalizeStreet(street) {
    if (!street) return street;
    let s = street;

    // Rule 1: letter + digit without space → add space
    s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2");

    // Rule 2: digit(s) + space + single letter at end → remove space
    s = s.replace(/(\d+)\s+([A-Za-z])\s*$/, "$1$2");

    // Normalize whitespace
    s = s.trim().replace(/\s+/g, " ");
    return s;
  }

  function normalizeAddress(addr) {
    return { ...addr, street: normalizeStreet(addr.street) };
  }

  // ===== Address Utilities =====

  function isAddressComplete(addr) {
    return !!(addr?.street && addr?.city && addr?.countryName);
  }

  function addressKey(addr) {
    const n = (v) => (v || "").toLowerCase().trim().replace(/\s+/g, " ");
    return `${n(addr.street)}|${n(addr.city)}|${n(addr.postalCode)}|${n(addr.countryName)}`;
  }

  function isSameAddress(a, b) {
    if (!a || !b) return false;
    return addressKey(a) === addressKey(b);
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ===== Read Address from DOM =====

  /**
   * Read current address values directly from the checkout form inputs.
   * More up-to-date than Ecwid.Cart.get() while the user is still typing.
   */
  function readAddressFromDom() {
    const get = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
    };

    const streetInput = get([
      'input[autocomplete="address-line1"]',
      'input[name="street"]',
    ]);
    const cityInput = get([
      'input[autocomplete="address-level2"]',
      'input[name="city"]',
    ]);
    const zipInput = get([
      'input[autocomplete="postal-code"]',
      'input[name="postalCode"]',
    ]);
    const countryEl = get([
      'select[autocomplete="country"]',
      'select[name="countryName"]',
      'input[autocomplete="country-name"]',
      'input[name="countryName"]',
    ]);

    if (!streetInput && !cityInput) return null;

    return {
      street: streetInput?.value?.trim() || "",
      city: cityInput?.value?.trim() || "",
      postalCode: zipInput?.value?.trim() || "",
      countryName: countryEl?.value?.trim() || "",
    };
  }

  /**
   * Read the full current address from Ecwid.Cart (for the setAddress merge).
   * We need ALL fields so setAddress() doesn't wipe name, phone, etc.
   */
  function getCartAddress() {
    return new Promise((resolve) => {
      window.Ecwid.Cart.get((cart) => {
        resolve(cart?.shippingPerson || {});
      });
    });
  }

  // ===== Geoapify API =====

  async function validateWithGeoapify(addr) {
    if (!CONFIG.apiKey) {
      logWarn("No Geoapify API key configured — skipping API validation");
      return null;
    }

    const parts = [addr.street, addr.city, addr.postalCode, addr.countryName].filter(Boolean);
    if (parts.length < 2) return null;

    const params = new URLSearchParams({
      text: parts.join(", "),
      limit: "1",
      apiKey: CONFIG.apiKey,
    });

    log("Calling Geoapify", { text: parts.join(", ") });

    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?${params}`
    );
    if (!res.ok) throw new Error(`Geoapify HTTP ${res.status}`);
    return await res.json();
  }

  function extractSuggestion(geoapifyResult) {
    const feat = geoapifyResult?.features?.[0];
    if (!feat) return null;
    const p = feat.properties;
    // Recombine street name + house number into a single street string
    const street = p.housenumber
      ? `${p.street || ""} ${p.housenumber}`.trim()
      : p.street || "";
    return {
      street: street || null,
      city: p.city || null,
      postalCode: p.postcode || null,
      countryName: p.country || null,
      confidence: p.rank?.confidence ?? 0,
      resultType: p.result_type || "unknown",
    };
  }

  function hasMeaningfulCorrection(input, suggestion) {
    const n = (v) => (v || "").toLowerCase().trim().replace(/\s+/g, " ");
    return (
      (suggestion.street && n(suggestion.street) !== n(input.street)) ||
      (suggestion.city && n(suggestion.city) !== n(input.city)) ||
      (suggestion.postalCode && n(suggestion.postalCode) !== n(input.postalCode))
    );
  }

  // ===== Main Validation Flow =====

  async function triggerValidation(domAddr) {
    // Step 1: Local normalization (no API call)
    if (isStepEnabled("NORMALIZE")) {
      const normalized = normalizeAddress(domAddr);
      const normChanged = normalized.street !== domAddr.street;

      if (normChanged) {
        log("Normalization changed street", {
          before: domAddr.street,
          after: normalized.street,
        });
        state = "CORRECTION";
        pendingSuggestion = {
          street: normalized.street,
          city: normalized.city,
          postalCode: normalized.postalCode,
          countryName: normalized.countryName,
          confidence: 1,
          resultType: "normalized",
        };
        showCorrectionBanner(domAddr, pendingSuggestion);
        SESSION.setLastValidated(domAddr);
        return;
      }
    }

    // Step 2: Geoapify API validation
    if (!isStepEnabled("GEOAPIFY") || !CONFIG.apiKey) {
      log("Geoapify step skipped");
      return;
    }

    state = "VALIDATING";
    log("Validating with Geoapify...");

    try {
      const result = await validateWithGeoapify(domAddr);
      const suggestion = extractSuggestion(result);

      log("Geoapify result", {
        confidence: suggestion?.confidence,
        resultType: suggestion?.resultType,
        suggestion,
      });

      if (!suggestion || suggestion.confidence < CONFIG.confidenceWarning) {
        // Address not found or very low confidence
        state = "WARNING";
        pendingSuggestion = null;
        showWarningBanner();
      } else if (
        suggestion.confidence >= CONFIG.confidenceClean &&
        !hasMeaningfulCorrection(domAddr, suggestion)
      ) {
        // Address looks correct — no action needed
        state = "CLEAN";
        hideAllUI();
      } else if (hasMeaningfulCorrection(domAddr, suggestion)) {
        // Geoapify suggests a different (likely better) address
        state = "CORRECTION";
        pendingSuggestion = suggestion;
        showCorrectionBanner(domAddr, suggestion);
      } else {
        // Mid-range confidence, no clear correction — accept silently
        state = "CLEAN";
        hideAllUI();
      }

      SESSION.setLastValidated(domAddr);
    } catch (err) {
      // API errors should never block the user — fail silently
      logError("Geoapify API error (failing silently)", err);
      state = "IDLE";
      hideAllUI();
    }
  }

  // ===== Input Event Handlers =====

  function onAddressFieldBlur() {
    if (!onCheckoutAddressPage) return;
    if (SESSION.isDisabled()) {
      log("Validation disabled for this session");
      return;
    }
    if (SESSION.shouldSkipNext()) {
      log("Skipping validation (programmatic setAddress just ran)");
      SESSION.clearSkipNext();
      return;
    }

    // Small delay so React can flush its state update before we read the DOM
    setTimeout(() => {
      const addr = readAddressFromDom();
      if (!addr) {
        log("Could not read address from DOM");
        return;
      }
      if (!isAddressComplete(addr)) {
        log("Address not complete yet — skipping", addr);
        return;
      }
      if (isSameAddress(addr, SESSION.getLastValidated())) {
        log("Same as last validated address — skipping");
        return;
      }

      log("Address complete and changed — triggering validation", addr);
      triggerValidation(addr);
    }, 150);
  }

  function onAddressFieldInput() {
    // User is manually editing a field after a warning/correction → reset so
    // the next blur triggers a fresh validation pass
    if (state === "WARNING" || state === "CORRECTION") {
      log("Manual edit detected after warning — resetting to IDLE");
      state = "IDLE";
      hideAllUI();
    }
  }

  // ===== DOM: Find and attach listeners to address inputs =====

  function attachToAddressInputs() {
    const candidates = [
      document.querySelector('input[autocomplete="address-line1"]'),
      document.querySelector('input[name="street"]'),
      document.querySelector('input[autocomplete="address-level2"]'),
      document.querySelector('input[name="city"]'),
      document.querySelector('input[autocomplete="postal-code"]'),
      document.querySelector('input[name="postalCode"]'),
    ].filter(Boolean);

    let attached = 0;
    for (const input of candidates) {
      if (attachedInputs.has(input)) continue;
      input.addEventListener("blur", onAddressFieldBlur);
      input.addEventListener("input", onAddressFieldInput);
      attachedInputs.add(input);
      attached++;
    }

    if (attached > 0) log(`Attached listeners to ${attached} address input(s)`);
    return candidates.length > 0;
  }

  // ===== DOM Observer =====

  function startDomObserver() {
    if (domObserver) domObserver.disconnect();

    let scheduled = false;
    domObserver = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        attachToAddressInputs();
      });
    });

    domObserver.observe(document.body, { subtree: true, childList: true });
    attachToAddressInputs(); // also try immediately
    log("DOM observer started");
  }

  function stopDomObserver() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
      log("DOM observer stopped");
    }
  }

  // ===== UI =====

  const BANNER_ID = "pm-addr-banner";

  function injectStyles() {
    if (document.getElementById("pm-addr-styles")) return;
    const style = document.createElement("style");
    style.id = "pm-addr-styles";
    style.textContent = `
      #pm-addr-banner {
        position: fixed;
        bottom: 24px;
        right: 24px;
        max-width: 360px;
        width: calc(100vw - 48px);
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
        padding: 18px 20px 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1a1a1a;
        transform: translateY(calc(100% + 32px));
        opacity: 0;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
        box-sizing: border-box;
      }
      #pm-addr-banner.pm-visible {
        transform: translateY(0);
        opacity: 1;
      }
      #pm-addr-banner .pm-title {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 6px;
        padding-right: 24px;
      }
      #pm-addr-banner .pm-body {
        color: #555;
        margin-bottom: 14px;
        font-size: 13.5px;
      }
      #pm-addr-banner .pm-diff {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 14px;
        font-size: 13px;
      }
      #pm-addr-banner .pm-diff-row {
        display: flex;
        gap: 10px;
        margin-bottom: 4px;
      }
      #pm-addr-banner .pm-diff-row:last-child { margin-bottom: 0; }
      #pm-addr-banner .pm-diff-label {
        color: #999;
        min-width: 72px;
        flex-shrink: 0;
      }
      #pm-addr-banner .pm-diff-value {
        font-weight: 600;
        color: #1a1a1a;
      }
      #pm-addr-banner .pm-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      #pm-addr-banner .pm-btn {
        padding: 8px 14px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: opacity 0.15s, transform 0.1s;
        line-height: 1;
      }
      #pm-addr-banner .pm-btn:hover { opacity: 0.80; }
      #pm-addr-banner .pm-btn:active { transform: scale(0.97); }
      #pm-addr-banner .pm-btn-primary {
        background: #111;
        color: #fff;
      }
      #pm-addr-banner .pm-btn-ghost {
        background: #efefef;
        color: #444;
      }
      #pm-addr-banner .pm-close {
        position: absolute;
        top: 12px;
        right: 14px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        color: #bbb;
        line-height: 1;
        padding: 2px 4px;
        border-radius: 4px;
        transition: color 0.15s;
      }
      #pm-addr-banner .pm-close:hover { color: #555; }
    `;
    document.head.appendChild(style);
  }

  function getOrCreateBanner() {
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = BANNER_ID;
      document.body.appendChild(banner);
    }
    return banner;
  }

  function showBanner(html) {
    if (!isStepEnabled("UI")) {
      logWarn("UI step disabled — skipping banner render");
      return;
    }
    injectStyles();
    const banner = getOrCreateBanner();
    banner.innerHTML = html;
    // Force reflow before adding the class so the CSS transition fires
    void banner.offsetHeight;
    banner.classList.add("pm-visible");
  }

  function hideAllUI() {
    const banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    banner.classList.remove("pm-visible");
  }

  function showWarningBanner() {
    showBanner(`
      <button class="pm-close" aria-label="Sluiten">&times;</button>
      <div class="pm-title">&#9888;&#65039; Adres controleren</div>
      <div class="pm-body">
        Dit adres lijkt niet te kloppen&hellip; Weet je zeker dat je het juiste adres hebt ingevuld?
      </div>
      <div class="pm-actions">
        <button class="pm-btn pm-btn-ghost" id="pm-addr-confirm">Dit adres klopt zeker</button>
      </div>
    `);
    document
      .getElementById("pm-addr-confirm")
      ?.addEventListener("click", onConfirmAddress);
    document
      .querySelector("#pm-addr-banner .pm-close")
      ?.addEventListener("click", hideAllUI);
  }

  function showCorrectionBanner(inputAddr, suggestion) {
    const n = (v) => (v || "").trim();

    const diffFields = [
      {
        label: "Straat",
        input: inputAddr.street,
        suggested: suggestion.street,
      },
      {
        label: "Postcode",
        input: inputAddr.postalCode,
        suggested: suggestion.postalCode,
      },
      { label: "Stad", input: inputAddr.city, suggested: suggestion.city },
    ].filter(
      (f) =>
        f.suggested &&
        n(f.suggested).toLowerCase() !== n(f.input).toLowerCase()
    );

    if (diffFields.length === 0) {
      // Nothing actually differs after all — no banner needed
      hideAllUI();
      return;
    }

    const diffHtml = diffFields
      .map(
        (f) => `
      <div class="pm-diff-row">
        <span class="pm-diff-label">${f.label}</span>
        <span class="pm-diff-value">${escapeHtml(f.suggested)}</span>
      </div>`
      )
      .join("");

    showBanner(`
      <button class="pm-close" aria-label="Sluiten">&times;</button>
      <div class="pm-title">&#9999;&#65039; Adres gecorrigeerd</div>
      <div class="pm-body">We hebben je adres gecorrigeerd. Klopt dit?</div>
      <div class="pm-diff">${diffHtml}</div>
      <div class="pm-actions">
        <button class="pm-btn pm-btn-primary" id="pm-addr-apply">Ja, pas toe</button>
        <button class="pm-btn pm-btn-ghost" id="pm-addr-confirm">Dit adres klopt zeker</button>
      </div>
    `);

    document
      .getElementById("pm-addr-apply")
      ?.addEventListener("click", () => onApplyCorrection(suggestion));
    document
      .getElementById("pm-addr-confirm")
      ?.addEventListener("click", onConfirmAddress);
    document
      .querySelector("#pm-addr-banner .pm-close")
      ?.addEventListener("click", hideAllUI);
  }

  // ===== Button Handlers =====

  function onConfirmAddress() {
    log("User confirmed address as correct — disabling checks for session");
    SESSION.disable();
    state = "IDLE";
    hideAllUI();
  }

  async function onApplyCorrection(suggestion) {
    log("Applying correction", suggestion);

    // Fetch the full current address so we don't accidentally clear name, phone, etc.
    const currentAddr = await getCartAddress();

    const merged = { ...currentAddr };
    if (suggestion.street) merged.street = suggestion.street;
    if (suggestion.city) merged.city = suggestion.city;
    if (suggestion.postalCode) merged.postalCode = suggestion.postalCode;
    if (suggestion.countryName) merged.countryName = suggestion.countryName;

    // Prevent the programmatic setAddress from triggering another validation run
    SESSION.setSkipNext();
    state = "IDLE";
    hideAllUI();

    window.Ecwid.Cart.setAddress(
      merged,
      () => log("Correction applied successfully"),
      (err) => logError("Failed to apply correction", err)
    );
  }

  // ===== Page Event Handlers =====

  function onPageLoaded(page) {
    log("Page loaded", { type: page?.type });

    const isCheckoutAddress =
      page?.type === "CHECKOUT_ADDRESS" || page?.type === "CHECKOUT";

    if (isCheckoutAddress) {
      onCheckoutAddressPage = true;
      if (!SESSION.isDisabled()) {
        startDomObserver();
      } else {
        log("Validation disabled for session — not starting observer");
      }
    } else {
      onCheckoutAddressPage = false;
      stopDomObserver();
      hideAllUI();
    }
  }

  // ===== Init =====

  log("Initializing Address Validation Module");

  (async () => {
    await waitForEcwid();
    window.Ecwid.OnPageLoaded.add(onPageLoaded);
    log("Address Validation Module initialized ✓");
  })();
}
