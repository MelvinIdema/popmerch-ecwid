(function() {
  "use strict";
  function initUrlLocalization() {
    function isDebug() {
      try {
        return localStorage.getItem("URL_DEBUG") === "true";
      } catch {
        return false;
      }
    }
    function isStepEnabled(step) {
      if (!isDebug()) return true;
      try {
        return localStorage.getItem(`URL_STEP_${step}`) !== "false";
      } catch {
        return true;
      }
    }
    function log(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#1976d2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.log(`%c[URLLocal]%c ${msg}`, style, "", data) : console.log(`%c[URLLocal]%c ${msg}`, style, "");
    }
    function logWarn(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.warn(`%c[URLLocal]%c ${msg}`, style, "", data) : console.warn(`%c[URLLocal]%c ${msg}`, style, "");
    }
    const CONFIG = {
      // Regex to match locale at start of path: /de, /fr, /de/, /fr/
      localeRegex: /^\/([a-z]{2})(\/|$)/,
      // Links to ignore (protocols, anchors, files)
      ignoreRegex: /^(?:javascript:|mailto:|tel:|#|http|file:|\/.*\.([a-z0-9]{2,4})$)/i,
      // Domains to treat as internal (besides relative paths)
      internalDomains: [
        location.hostname,
        "popmerch.com",
        "webshop.popmerch.com"
      ]
    };
    log("=== URL Localization V3 (Production Ready) ===");
    log("Step Configuration (Default: Enabled):", {
      URL_DEBUG: isDebug(),
      URL_STEP_DETECT_LOCALE: isStepEnabled("DETECT_LOCALE"),
      URL_STEP_CLICK_HANDLER: isStepEnabled("CLICK_HANDLER")
    });
    function getCurrentLocale() {
      if (!isStepEnabled("DETECT_LOCALE")) {
        logWarn("DETECT_LOCALE step disabled");
        return null;
      }
      const pathname = window.location.pathname;
      log(`Detecting locale from pathname: ${pathname}`);
      const match = pathname.match(CONFIG.localeRegex);
      const locale = match ? match[1] : null;
      log(`Detected locale: ${locale || "(default)"}`);
      return locale;
    }
    function shouldLocalizeLink(link) {
      const href = link.getAttribute("href");
      if (!href) {
        log("Link has no href, skipping", link);
        return false;
      }
      log(`Analyzing link: ${href}`);
      const isInternal = link.hostname === window.location.hostname || CONFIG.internalDomains.includes(link.hostname) || !link.hostname;
      if (!isInternal) {
        log(`Link is external, skipping: ${href}`);
        return false;
      }
      if (CONFIG.ignoreRegex.test(href)) {
        log(`Link matches ignore pattern, skipping: ${href}`);
        return false;
      }
      const currentLocale = getCurrentLocale();
      if (!currentLocale) {
        log("No locale detected, won't localize");
        return false;
      }
      if (href.startsWith(`/${currentLocale}/`) || href === `/${currentLocale}`) {
        log(`Link already localized, skipping: ${href}`);
        return false;
      }
      log(`Link should be localized: ${href}`);
      return true;
    }
    function buildLocalizedUrl(originalHref, locale) {
      if (originalHref === "/" || originalHref === "") {
        return `/${locale}`;
      }
      const path = originalHref.startsWith("/") ? originalHref : `/${originalHref}`;
      return `/${locale}${path}`;
    }
    function handleLinkClick(event) {
      if (!isStepEnabled("CLICK_HANDLER")) {
        logWarn("CLICK_HANDLER step disabled");
        return;
      }
      const link = event.target.closest("a");
      if (!link) {
        log("Click not on anchor element");
        return;
      }
      if (link.dataset.noLocalize) {
        log("Link has data-no-localize attribute, skipping", link);
        return;
      }
      if (!shouldLocalizeLink(link)) {
        return;
      }
      const originalHref = link.getAttribute("href");
      const locale = getCurrentLocale();
      if (!locale) {
        log("No locale, allowing default behavior");
        return;
      }
      const localizedUrl = buildLocalizedUrl(originalHref, locale);
      log(`Intercepting click: ${originalHref} → ${localizedUrl}`);
      event.preventDefault();
      window.location.href = localizedUrl;
    }
    function setupClickHandler() {
      if (!isStepEnabled("CLICK_HANDLER")) {
        logWarn("CLICK_HANDLER step disabled");
        return;
      }
      log("Setting up click handler on document.body...");
      document.body.addEventListener("click", handleLinkClick, true);
      log("Click handler active ✓");
    }
    log("Initializing URL Localization Module");
    setupClickHandler();
    log("URL Localization Module initialized ✓");
  }
  function initAddressValidation(config = {}) {
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
      const style = "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.log(`%c[AddrVal]%c ${msg}`, style, "", data) : console.log(`%c[AddrVal]%c ${msg}`, style, "");
    }
    function logWarn(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.warn(`%c[AddrVal]%c ${msg}`, style, "", data) : console.warn(`%c[AddrVal]%c ${msg}`, style, "");
    }
    function logError(msg, err) {
      const style = "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      console.error(`%c[AddrVal]%c ${msg}`, style, "", err);
    }
    const CONFIG = {
      apiKey: config.apiKey || "",
      // Confidence threshold below which we show a warning (address not found / unreliable)
      confidenceWarning: 0.4,
      // Confidence threshold above which the address is considered clean
      confidenceClean: 0.75,
      pollInterval: 50,
      pollTimeout: 1e4
    };
    log("=== Address Validation V1 ===");
    log("Config:", {
      apiKey: CONFIG.apiKey ? "***set***" : "(not set)",
      ADDR_DEBUG: isDebug(),
      ADDR_STEP_NORMALIZE: isStepEnabled("NORMALIZE"),
      ADDR_STEP_GEOAPIFY: isStepEnabled("GEOAPIFY"),
      ADDR_STEP_UI: isStepEnabled("UI")
    });
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
        }
      },
      clearSkipNext() {
        try {
          sessionStorage.removeItem(this.SKIP_KEY);
        } catch {
        }
      }
    };
    let state = "IDLE";
    let onCheckoutAddressPage = false;
    let domObserver = null;
    const attachedInputs = /* @__PURE__ */ new WeakSet();
    let pendingSuggestion = null;
    async function waitForEcwid() {
      var _a, _b, _c, _d;
      const start = Date.now();
      while (Date.now() - start < CONFIG.pollTimeout) {
        if (((_b = (_a = window.Ecwid) == null ? void 0 : _a.OnPageLoaded) == null ? void 0 : _b.add) && ((_d = (_c = window.Ecwid) == null ? void 0 : _c.Cart) == null ? void 0 : _d.get)) return;
        await new Promise((r) => setTimeout(r, CONFIG.pollInterval));
      }
      logError("Ecwid not available within timeout", new Error("timeout"));
    }
    function normalizeStreet(street) {
      if (!street) return street;
      let s = street;
      s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2");
      s = s.replace(/(\d+)\s+([A-Za-z])\s*$/, "$1$2");
      s = s.trim().replace(/\s+/g, " ");
      return s;
    }
    function normalizeAddress(addr) {
      return { ...addr, street: normalizeStreet(addr.street) };
    }
    function isAddressComplete(addr) {
      return !!((addr == null ? void 0 : addr.street) && (addr == null ? void 0 : addr.city) && (addr == null ? void 0 : addr.countryName));
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
      return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function readAddressFromDom() {
      var _a, _b, _c, _d;
      const get = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        return null;
      };
      const streetInput = get([
        'input[autocomplete="address-line1"]',
        'input[name="street"]'
      ]);
      const cityInput = get([
        'input[autocomplete="address-level2"]',
        'input[name="city"]'
      ]);
      const zipInput = get([
        'input[autocomplete="postal-code"]',
        'input[name="postalCode"]'
      ]);
      const countryEl = get([
        'select[autocomplete="country"]',
        'select[name="countryName"]',
        'input[autocomplete="country-name"]',
        'input[name="countryName"]'
      ]);
      if (!streetInput && !cityInput) return null;
      return {
        street: ((_a = streetInput == null ? void 0 : streetInput.value) == null ? void 0 : _a.trim()) || "",
        city: ((_b = cityInput == null ? void 0 : cityInput.value) == null ? void 0 : _b.trim()) || "",
        postalCode: ((_c = zipInput == null ? void 0 : zipInput.value) == null ? void 0 : _c.trim()) || "",
        countryName: ((_d = countryEl == null ? void 0 : countryEl.value) == null ? void 0 : _d.trim()) || ""
      };
    }
    function getCartAddress() {
      return new Promise((resolve) => {
        window.Ecwid.Cart.get((cart) => {
          resolve((cart == null ? void 0 : cart.shippingPerson) || {});
        });
      });
    }
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
        apiKey: CONFIG.apiKey
      });
      log("Calling Geoapify", { text: parts.join(", ") });
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/search?${params}`
      );
      if (!res.ok) throw new Error(`Geoapify HTTP ${res.status}`);
      return await res.json();
    }
    function extractSuggestion(geoapifyResult) {
      var _a, _b;
      const feat = (_a = geoapifyResult == null ? void 0 : geoapifyResult.features) == null ? void 0 : _a[0];
      if (!feat) return null;
      const p = feat.properties;
      const street = p.housenumber ? `${p.street || ""} ${p.housenumber}`.trim() : p.street || "";
      return {
        street: street || null,
        city: p.city || null,
        postalCode: p.postcode || null,
        countryName: p.country || null,
        confidence: ((_b = p.rank) == null ? void 0 : _b.confidence) ?? 0,
        resultType: p.result_type || "unknown"
      };
    }
    function hasMeaningfulCorrection(input, suggestion) {
      const n = (v) => (v || "").toLowerCase().trim().replace(/\s+/g, " ");
      return suggestion.street && n(suggestion.street) !== n(input.street) || suggestion.city && n(suggestion.city) !== n(input.city) || suggestion.postalCode && n(suggestion.postalCode) !== n(input.postalCode);
    }
    async function triggerValidation(domAddr) {
      if (isStepEnabled("NORMALIZE")) {
        const normalized = normalizeAddress(domAddr);
        const normChanged = normalized.street !== domAddr.street;
        if (normChanged) {
          log("Normalization changed street", {
            before: domAddr.street,
            after: normalized.street
          });
          state = "CORRECTION";
          pendingSuggestion = {
            street: normalized.street,
            city: normalized.city,
            postalCode: normalized.postalCode,
            countryName: normalized.countryName,
            confidence: 1,
            resultType: "normalized"
          };
          showCorrectionBanner(domAddr, pendingSuggestion);
          SESSION.setLastValidated(domAddr);
          return;
        }
      }
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
          confidence: suggestion == null ? void 0 : suggestion.confidence,
          resultType: suggestion == null ? void 0 : suggestion.resultType,
          suggestion
        });
        if (!suggestion || suggestion.confidence < CONFIG.confidenceWarning) {
          state = "WARNING";
          pendingSuggestion = null;
          showWarningBanner();
        } else if (suggestion.confidence >= CONFIG.confidenceClean && !hasMeaningfulCorrection(domAddr, suggestion)) {
          state = "CLEAN";
          hideAllUI();
        } else if (hasMeaningfulCorrection(domAddr, suggestion)) {
          state = "CORRECTION";
          pendingSuggestion = suggestion;
          showCorrectionBanner(domAddr, suggestion);
        } else {
          state = "CLEAN";
          hideAllUI();
        }
        SESSION.setLastValidated(domAddr);
      } catch (err) {
        logError("Geoapify API error (failing silently)", err);
        state = "IDLE";
        hideAllUI();
      }
    }
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
      if (state === "WARNING" || state === "CORRECTION") {
        log("Manual edit detected after warning — resetting to IDLE");
        state = "IDLE";
        hideAllUI();
      }
    }
    function attachToAddressInputs() {
      const candidates = [
        document.querySelector('input[autocomplete="address-line1"]'),
        document.querySelector('input[name="street"]'),
        document.querySelector('input[autocomplete="address-level2"]'),
        document.querySelector('input[name="city"]'),
        document.querySelector('input[autocomplete="postal-code"]'),
        document.querySelector('input[name="postalCode"]')
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
      attachToAddressInputs();
      log("DOM observer started");
    }
    function stopDomObserver() {
      if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
        log("DOM observer stopped");
      }
    }
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
      void banner.offsetHeight;
      banner.classList.add("pm-visible");
    }
    function hideAllUI() {
      const banner = document.getElementById(BANNER_ID);
      if (!banner) return;
      banner.classList.remove("pm-visible");
    }
    function showWarningBanner() {
      var _a, _b;
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
      (_a = document.getElementById("pm-addr-confirm")) == null ? void 0 : _a.addEventListener("click", onConfirmAddress);
      (_b = document.querySelector("#pm-addr-banner .pm-close")) == null ? void 0 : _b.addEventListener("click", hideAllUI);
    }
    function showCorrectionBanner(inputAddr, suggestion) {
      var _a, _b, _c;
      const n = (v) => (v || "").trim();
      const diffFields = [
        {
          label: "Straat",
          input: inputAddr.street,
          suggested: suggestion.street
        },
        {
          label: "Postcode",
          input: inputAddr.postalCode,
          suggested: suggestion.postalCode
        },
        { label: "Stad", input: inputAddr.city, suggested: suggestion.city }
      ].filter(
        (f) => f.suggested && n(f.suggested).toLowerCase() !== n(f.input).toLowerCase()
      );
      if (diffFields.length === 0) {
        hideAllUI();
        return;
      }
      const diffHtml = diffFields.map(
        (f) => `
      <div class="pm-diff-row">
        <span class="pm-diff-label">${f.label}</span>
        <span class="pm-diff-value">${escapeHtml(f.suggested)}</span>
      </div>`
      ).join("");
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
      (_a = document.getElementById("pm-addr-apply")) == null ? void 0 : _a.addEventListener("click", () => onApplyCorrection(suggestion));
      (_b = document.getElementById("pm-addr-confirm")) == null ? void 0 : _b.addEventListener("click", onConfirmAddress);
      (_c = document.querySelector("#pm-addr-banner .pm-close")) == null ? void 0 : _c.addEventListener("click", hideAllUI);
    }
    function onConfirmAddress() {
      log("User confirmed address as correct — disabling checks for session");
      SESSION.disable();
      state = "IDLE";
      hideAllUI();
    }
    async function onApplyCorrection(suggestion) {
      log("Applying correction", suggestion);
      const currentAddr = await getCartAddress();
      const merged = { ...currentAddr };
      if (suggestion.street) merged.street = suggestion.street;
      if (suggestion.city) merged.city = suggestion.city;
      if (suggestion.postalCode) merged.postalCode = suggestion.postalCode;
      if (suggestion.countryName) merged.countryName = suggestion.countryName;
      SESSION.setSkipNext();
      state = "IDLE";
      hideAllUI();
      window.Ecwid.Cart.setAddress(
        merged,
        () => log("Correction applied successfully"),
        (err) => logError("Failed to apply correction", err)
      );
    }
    function onPageLoaded(page) {
      log("Page loaded", { type: page == null ? void 0 : page.type });
      const isCheckoutAddress = (page == null ? void 0 : page.type) === "CHECKOUT_ADDRESS" || (page == null ? void 0 : page.type) === "CHECKOUT";
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
    log("Initializing Address Validation Module");
    (async () => {
      await waitForEcwid();
      window.Ecwid.OnPageLoaded.add(onPageLoaded);
      log("Address Validation Module initialized ✓");
    })();
  }
  const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
  initUrlLocalization();
  initAddressValidation({ apiKey: GEOAPIFY_API_KEY });
})();
