/**
 * Popmerch URL Localization Module V2
 *
 * Ensures internal links maintain the correct locale prefix (e.g. /de/, /fr/)
 * when the user is browsing a localized version of the store.
 *
 * Debug flags (set in localStorage):
 * - URL_DEBUG = "true" - Enable all debug logging
 * - URL_STEP_DETECT_LOCALE = "true" - Enable locale detection step
 * - URL_STEP_PROCESS_LINKS = "true" - Enable link processing step
 * - URL_STEP_LOCALIZE = "true" - Enable link localization step
 * - URL_STEP_OBSERVER = "true" - Enable MutationObserver step
 * - URL_STEP_ECWID_LISTENER = "true" - Enable Ecwid page load listener step
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
   * Debug log with green styling
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

  log("=== URL Localization V2 Debug ===");
  log("Debug flags:", {
    URL_DEBUG: isDebug(),
    URL_STEP_DETECT_LOCALE: isStepEnabled("DETECT_LOCALE"),
    URL_STEP_PROCESS_LINKS: isStepEnabled("PROCESS_LINKS"),
    URL_STEP_LOCALIZE: isStepEnabled("LOCALIZE"),
    URL_STEP_OBSERVER: isStepEnabled("OBSERVER"),
    URL_STEP_ECWID_LISTENER: isStepEnabled("ECWID_LISTENER"),
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
  function shouldLocalize(link) {
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
    if (href.startsWith(`/${currentLocale}/`) || href === `/${currentLocale}`) {
      log(`Link already localized, skipping: ${href}`);
      return false;
    }

    log(`Link should be localized: ${href}`);
    return true;
  }

  // ===== Step 3: Link Localization =====

  /**
   * Rewrite a link to include the locale
   * @param {HTMLAnchorElement} link
   * @param {string} locale
   */
  function localizeLink(link, locale) {
    if (!isStepEnabled("LOCALIZE")) {
      logWarn("LOCALIZE step disabled - skipping actual rewrite");
      return;
    }

    const originalHref = link.getAttribute("href");
    log(`Localizing link: ${originalHref}`);

    let newHref;

    // Handle root link "/"
    if (originalHref === "/" || originalHref === "") {
      newHref = `/${locale}`;
    } else {
      // Ensure we don't double slash
      const path = originalHref.startsWith("/")
        ? originalHref
        : `/${originalHref}`;
      newHref = `/${locale}${path}`;
    }

    link.setAttribute("href", newHref);
    log(`Localized: ${originalHref} → ${newHref}`);
  }

  // ===== Step 4: Link Processing =====

  /**
   * Main processing function
   */
  function processLinks() {
    if (!isStepEnabled("PROCESS_LINKS")) {
      logWarn("PROCESS_LINKS step disabled");
      return;
    }

    log("Processing links...");

    const locale = getCurrentLocale();
    if (!locale) {
      log("No locale detected, skipping processing");
      return;
    }

    const links = document.querySelectorAll("a[href]");
    log(`Found ${links.length} total links in DOM`);

    let count = 0;
    let skipped = 0;

    links.forEach((link) => {
      // Skip if marked to ignore (optional data attribute for manual override)
      if (link.dataset.noLocalize) {
        log("Link has data-no-localize attribute, skipping", link);
        skipped++;
        return;
      }

      if (shouldLocalize(link)) {
        localizeLink(link, locale);
        count++;
      } else {
        skipped++;
      }
    });

    log(
      `Processed ${links.length} links: ${count} localized, ${skipped} skipped`,
    );
  }

  // ===== Step 5: MutationObserver =====

  /**
   * Set up observer for dynamic content
   */
  function setupObserver() {
    if (!isStepEnabled("OBSERVER")) {
      logWarn("OBSERVER step disabled");
      return;
    }

    log("Setting up MutationObserver...");

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          log("DOM nodes added, will reprocess links");
          shouldProcess = true;
        } else if (
          mutation.type === "attributes" &&
          mutation.attributeName === "href"
        ) {
          log("href attribute changed, will reprocess links");
          shouldProcess = true;
        }
      });

      if (shouldProcess) {
        processLinks();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    log("MutationObserver active on document.body");
  }

  // ===== Step 6: Ecwid Listener =====

  /**
   * Set up Ecwid page load listener
   */
  function setupEcwidListener() {
    if (!isStepEnabled("ECWID_LISTENER")) {
      logWarn("ECWID_LISTENER step disabled");
      return;
    }

    if (typeof Ecwid === "undefined" || !Ecwid.OnPageLoaded) {
      logWarn("Ecwid not available, skipping listener setup");
      return;
    }

    log("Setting up Ecwid.OnPageLoaded listener...");

    Ecwid.OnPageLoaded.add(function (page) {
      log("Ecwid page loaded, reprocessing links", page);
      // Small delay to let Ecwid render
      setTimeout(() => {
        log("Delayed processing after Ecwid page load");
        processLinks();
      }, 100);
    });

    log("Ecwid listener active");
  }

  // ===== Initialization =====

  log("Initializing URL Localization Module");

  // Initial processing
  processLinks();

  // Set up observers and listeners
  setupObserver();
  setupEcwidListener();

  log("URL Localization Module initialized ✓");
}
