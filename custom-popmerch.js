(function() {
  "use strict";
  function initUrlLocalization() {
    console.log("Initializing URL Localization Module");
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
    function getCurrentLocale() {
      const match = window.location.pathname.match(CONFIG.localeRegex);
      return match ? match[1] : null;
    }
    function shouldLocalize(link) {
      const href = link.getAttribute("href");
      if (!href) return false;
      const isInternal = link.hostname === window.location.hostname || CONFIG.internalDomains.includes(link.hostname) || !link.hostname;
      if (!isInternal) return false;
      if (CONFIG.ignoreRegex.test(href)) return false;
      if (href.startsWith(`/${getCurrentLocale()}/`) || href === `/${getCurrentLocale()}`) {
        return false;
      }
      return true;
    }
    function localizeLink(link, locale) {
      const originalHref = link.getAttribute("href");
      if (originalHref === "/" || originalHref === "") {
        link.setAttribute("href", `/${locale}`);
        return;
      }
      const path = originalHref.startsWith("/") ? originalHref : `/${originalHref}`;
      link.setAttribute("href", `/${locale}${path}`);
    }
    function processLinks() {
      const locale = getCurrentLocale();
      if (!locale) return;
      const links = document.querySelectorAll("a[href]");
      let count = 0;
      links.forEach((link) => {
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
    processLinks();
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
        } else if (mutation.type === "attributes" && mutation.attributeName === "href") {
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
      attributeFilter: ["href"]
    });
    if (typeof Ecwid !== "undefined" && Ecwid.OnPageLoaded) {
      Ecwid.OnPageLoaded.add(function(page) {
        console.log("Ecwid page loaded, reprocessing links");
        setTimeout(processLinks, 100);
      });
    }
  }
  initUrlLocalization();
})();
