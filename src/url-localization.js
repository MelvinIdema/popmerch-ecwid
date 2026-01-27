/**
 * Popmerch URL Localization Module V3
 *
 * Ensures internal links maintain the correct locale prefix (e.g. /de/, /fr/)
 * by intercepting click events instead of rewriting the DOM.
 *
 * This approach avoids triggering Ecwid's internal listeners that cause unwanted popups.
 *
 * Debug flags (set in localStorage):
 * - URL_DEBUG = "true" - Enable all debug logging
 * - URL_STEP_DETECT_LOCALE = "true" - Enable locale detection step
 * - URL_STEP_CLICK_HANDLER = "true" - Enable click interception
 */

export function initUrlLocalization() {
  // ===== Debug Infrastructure =====

  /**
   * Check if debug mode is enabled
   */
  function isDebug() {
    try {
      return localStorage.getItem("URL_DEBUG") === "true";
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific step is enabled
   */
  function isStepEnabled(step) {
    try {
      return localStorage.getItem(`URL_STEP_${step}`) === "true";
    } catch {
      return false;
    }
  }

  /**
   * Debug log with blue styling
   */
  function log(msg, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#1976d2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data
      ? console.log(`%c[URLLocal]%c ${msg}`, style, "", data)
      : console.log(`%c[URLLocal]%c ${msg}`, style, "");
  }

  /**
   * Warning log with orange styling
   */
  function logWarn(msg, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data
      ? console.warn(`%c[URLLocal]%c ${msg}`, style, "", data)
      : console.warn(`%c[URLLocal]%c ${msg}`, style, "");
  }

  /**
   * Error log with red styling
   */
  function logError(msg, err) {
    const style =
      "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    console.error(`%c[URLLocal]%c ${msg}`, style, "", err);
  }

  // ===== Config =====

  const CONFIG = {
    // Regex to match locale at start of path: /de, /fr, /de/, /fr/
    localeRegex: /^\/([a-z]{2})(\/|$)/,
    // Links to ignore (protocols, anchors, files)
    ignoreRegex:
      /^(?:javascript:|mailto:|tel:|#|http|file:|\/.*\.([a-z0-9]{2,4})$)/i,
    // Domains to treat as internal (besides relative paths)
    internalDomains: [
      location.hostname,
      "popmerch.com",
      "webshop.popmerch.com",
    ],
  };

  log("=== URL Localization V3 (Click Interception) ===");
  log("Debug flags:", {
    URL_DEBUG: isDebug(),
    URL_STEP_DETECT_LOCALE: isStepEnabled("DETECT_LOCALE"),
    URL_STEP_CLICK_HANDLER: isStepEnabled("CLICK_HANDLER"),
  });

  // ===== Step 1: Locale Detection =====

  /**
   * Get the current locale from the URL
   * @returns {string|null} e.g. "de", "fr" or null if default
   */
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

  // ===== Step 2: Link Analysis =====

  /**
   * Check if a link should be localized
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function shouldLocalizeLink(link) {
    const href = link.getAttribute("href");
    if (!href) {
      log("Link has no href, skipping", link);
      return false;
    }

    log(`Analyzing link: ${href}`);

    // Check if it's an internal link
    const isInternal =
      link.hostname === window.location.hostname ||
      CONFIG.internalDomains.includes(link.hostname) ||
      !link.hostname;

    if (!isInternal) {
      log(`Link is external, skipping: ${href}`);
      return false;
    }

    // Exclude special links or files
    if (CONFIG.ignoreRegex.test(href)) {
      log(`Link matches ignore pattern, skipping: ${href}`);
      return false;
    }

    // Exclude if already localized
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

  /**
   * Build localized URL
   * @param {string} originalHref
   * @param {string} locale
   * @returns {string}
   */
  function buildLocalizedUrl(originalHref, locale) {
    // Handle root link "/"
    if (originalHref === "/" || originalHref === "") {
      return `/${locale}`;
    }

    // Ensure we don't double slash
    const path = originalHref.startsWith("/")
      ? originalHref
      : `/${originalHref}`;
    return `/${locale}${path}`;
  }

  // ===== Step 3: Click Interception =====

  /**
   * Handle click on anchor elements
   * @param {Event} event
   */
  function handleLinkClick(event) {
    if (!isStepEnabled("CLICK_HANDLER")) {
      logWarn("CLICK_HANDLER step disabled");
      return;
    }

    // Find the closest anchor element
    const link = event.target.closest("a");
    if (!link) {
      log("Click not on anchor element");
      return;
    }

    // Skip if marked to ignore
    if (link.dataset.noLocalize) {
      log("Link has data-no-localize attribute, skipping", link);
      return;
    }

    // Check if we should localize this link
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

    // Prevent default navigation
    event.preventDefault();

    // Navigate to localized URL
    window.location.href = localizedUrl;
  }

  /**
   * Set up click handler
   */
  function setupClickHandler() {
    if (!isStepEnabled("CLICK_HANDLER")) {
      logWarn("CLICK_HANDLER step disabled");
      return;
    }

    log("Setting up click handler on document.body...");

    // Use capture phase to intercept before other handlers
    document.body.addEventListener("click", handleLinkClick, true);

    log("Click handler active ✓");
  }

  // ===== Initialization =====

  log("Initializing URL Localization Module");

  // Set up click interception
  setupClickHandler();

  log("URL Localization Module initialized ✓");
}
