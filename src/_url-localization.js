/**
 * Popmerch URL Localization Module
 *
 * Ensures internal links maintain the correct locale prefix (e.g. /de/, /fr/)
 * when the user is browsing a localized version of the store.
 */

export function initUrlLocalization() {
  console.log("Initializing URL Localization Module");

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

  /**
   * Get the current locale from the URL
   * @returns {string|null} e.g. "de", "fr" or null if default
   */
  function getCurrentLocale() {
    const match = window.location.pathname.match(CONFIG.localeRegex);
    return match ? match[1] : null;
  }

  /**
   * Check if a link should be localized
   * @param {HTMLAnchorElement} link
   * @returns {boolean}
   */
  function shouldLocalize(link) {
    const href = link.getAttribute("href");
    if (!href) return false;

    // Ignore if it already starts with http/https/mailto etc (unless it's our domain, handled below)
    // But for simplicity, let's look at the parsed properties

    // Check if it's an internal link
    const isInternal =
      link.hostname === window.location.hostname ||
      CONFIG.internalDomains.includes(link.hostname) ||
      !link.hostname; // Relative links have empty hostname in some parsers, or match window

    if (!isInternal) return false;

    // Exclude special links or files
    if (CONFIG.ignoreRegex.test(href)) return false;

    // Exclude if already localized
    if (
      href.startsWith(`/${getCurrentLocale()}/`) ||
      href === `/${getCurrentLocale()}`
    ) {
      return false;
    }

    // Exclude root link if we assume the logo/home should go to localized root,
    // but usually /de is the root for de.
    // If href is "/" it should become "/de"

    return true;
  }

  /**
   * Rewrite a link to include the locale
   * @param {HTMLAnchorElement} link
   * @param {string} locale
   */
  function localizeLink(link, locale) {
    const originalHref = link.getAttribute("href");

    // Handle root link "/"
    if (originalHref === "/" || originalHref === "") {
      link.setAttribute("href", `/${locale}`);
      return;
    }

    // Ensure we don't double slash
    const path = originalHref.startsWith("/")
      ? originalHref
      : `/${originalHref}`;
    link.setAttribute("href", `/${locale}${path}`);
  }

  /**
   * Main processing function
   */
  function processLinks() {
    const locale = getCurrentLocale();
    if (!locale) return; // Default locale, no rewriting needed

    const links = document.querySelectorAll("a[href]");
    let count = 0;

    links.forEach((link) => {
      // Skip if marked to ignore (optional data attribute for manual override)
      if (link.dataset.noLocalize) return;

      if (shouldLocalize(link)) {
        localizeLink(link, locale);
        count++;
      }
    });

    if (count > 0) {
      console.log(`Localized ${count} links for locale: ${locale}`);
    }
  }

  // ===== Observers & Triggers =====

  // 1. Initial Load
  processLinks();

  // 2. Observer for dynamic content (SPA navigation, popups)
  const observer = new MutationObserver((mutations) => {
    // Debounce could be added if performance is an issue,
    // but for link rewriting it's usually fast enough.
    let shouldProcess = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      } else if (
        mutation.type === "attributes" &&
        mutation.attributeName === "href"
      ) {
        // Also catch if hrefs are changed dynamically
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

  // 3. Listen for Ecwid page changes (if Ecwid API is available)
  if (typeof Ecwid !== "undefined" && Ecwid.OnPageLoaded) {
    Ecwid.OnPageLoaded.add(function (page) {
      console.log("Ecwid page loaded, reprocessing links");
      // Small delay to let Ecwid render
      setTimeout(processLinks, 100);
    });
  }
}
