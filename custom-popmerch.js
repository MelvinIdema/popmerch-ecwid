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
      try {
        return localStorage.getItem(`URL_STEP_${step}`) === "true";
      } catch {
        return false;
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
    log("=== URL Localization V3 (Click Interception) ===");
    log("Debug flags:", {
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
  initUrlLocalization();
})();
