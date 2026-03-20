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
      if (!document.body) {
        logWarn("document.body not ready yet, retrying click handler setup");
        window.addEventListener("DOMContentLoaded", setupClickHandler, { once: true });
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
  function initAddressValidation() {
    const MODULE_MODE = "passive-probe";
    const POLL_INTERVAL = 50;
    const POLL_TIMEOUT = 1e4;
    function isDebug() {
      try {
        return localStorage.getItem("ADDR_DEBUG") === "true";
      } catch {
        return false;
      }
    }
    function isModuleDisabled() {
      try {
        return localStorage.getItem("ADDR_DISABLED") === "true";
      } catch {
        return false;
      }
    }
    function log(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.log(`%c[AddrVal]%c ${msg}`, style, "", data) : console.log(`%c[AddrVal]%c ${msg}`, style, "");
    }
    function logError(msg, err) {
      const style = "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      console.error(`%c[AddrVal]%c ${msg}`, style, "", err);
    }
    async function waitForEcwid() {
      var _a, _b, _c, _d;
      const start = Date.now();
      while (Date.now() - start < POLL_TIMEOUT) {
        if (((_b = (_a = window.Ecwid) == null ? void 0 : _a.OnAPILoaded) == null ? void 0 : _b.add) && ((_d = (_c = window.Ecwid) == null ? void 0 : _c.OnPageLoaded) == null ? void 0 : _d.add)) return true;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
      logError("Ecwid not available within timeout", new Error("timeout"));
      return false;
    }
    function updateStatus(patch) {
      window.POPMERCH_ADDR_VALIDATION_STATUS = {
        ...window.POPMERCH_ADDR_VALIDATION_STATUS || {},
        mode: MODULE_MODE,
        ...patch
      };
    }
    function onPageLoaded(page) {
      const pageType = (page == null ? void 0 : page.type) || null;
      updateStatus({
        initialized: true,
        lastPageType: pageType,
        lastEventAt: (/* @__PURE__ */ new Date()).toISOString(),
        onCheckoutAddressPage: pageType === "CHECKOUT_ADDRESS"
      });
      log("Ecwid page loaded", { type: pageType });
      if (pageType === "CHECKOUT_ADDRESS") {
        console.info("[Popmerch] Address probe reached CHECKOUT_ADDRESS");
      }
    }
    if (isModuleDisabled()) {
      console.info("[Popmerch] Address validation disabled via localStorage");
      updateStatus({
        initialized: false,
        disabled: true
      });
      return;
    }
    updateStatus({
      initialized: false,
      disabled: false,
      waitingForEcwid: true
    });
    log("Initializing Address Validation Probe");
    (async () => {
      const ready = await waitForEcwid();
      if (!ready) {
        updateStatus({
          waitingForEcwid: false,
          initialized: false,
          failed: true
        });
        return;
      }
      window.Ecwid.OnAPILoaded.add(() => {
        updateStatus({
          waitingForEcwid: false,
          apiLoaded: true
        });
        window.Ecwid.OnPageLoaded.add(onPageLoaded);
        updateStatus({
          initialized: true
        });
        console.info("[Popmerch] Address validation probe initialized");
        log("Address Validation Probe initialized");
      });
    })();
  }
  const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
  const BUNDLE_VERSION = "2026-03-20-address-probe-1";
  function safeInit(name, init) {
    try {
      init();
    } catch (err) {
      console.error(`[Popmerch] Failed to initialize ${name}`, err);
    }
  }
  window.POPMERCH_BUNDLE_VERSION = BUNDLE_VERSION;
  console.info(`[Popmerch] Bundle ${BUNDLE_VERSION} loaded`);
  safeInit("URL localization", () => {
    initUrlLocalization();
  });
  {
    safeInit("address validation", () => {
      initAddressValidation({ apiKey: GEOAPIFY_API_KEY });
    });
  }
})();
