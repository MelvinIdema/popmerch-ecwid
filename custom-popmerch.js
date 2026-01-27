(function() {
  "use strict";
  function initStockManager() {
    console.log("Initializing Stock Manager Module");
    const CONFIG = {
      storeId: 111654255,
      publicToken: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
      disabledClass: "ecwid-oos",
      debug: false
      // Set to false in production
    };
    let currentProductId = null;
    let processedContainers = /* @__PURE__ */ new WeakSet();
    function log(...args) {
    }
    function logError(...args) {
      console.error("[Popmerch Stock]", ...args);
    }
    function setupFetchInterceptor() {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        var _a;
        const [url, options] = args;
        if (typeof url === "string" && url.includes("/catalog/product")) {
          try {
            const body = JSON.parse((options == null ? void 0 : options.body) || "{}");
            if ((_a = body.productIdentifier) == null ? void 0 : _a.productId) {
              currentProductId = body.productIdentifier.productId;
              log("Captured product ID from fetch:", currentProductId);
            }
          } catch (e) {
          }
        }
        return originalFetch.apply(this, args);
      };
    }
    async function fetchProductCombinations(productId) {
      const url = `https://app.ecwid.com/api/v3/${CONFIG.storeId}/products/${productId}/combinations`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${CONFIG.publicToken}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        log("Combinations received:", data);
        return Array.isArray(data) ? data : data.items || [];
      } catch (error) {
        logError("Failed to fetch combinations:", error);
        return [];
      }
    }
    function buildAvailabilityMap(combinations) {
      const map = /* @__PURE__ */ new Map();
      if (!combinations || combinations.length === 0) {
        return map;
      }
      log("Processing", combinations.length, "combinations");
      for (const combo of combinations) {
        const options = combo.options || [];
        const inStock = combo.unlimited === true || combo.quantity > 0 || combo.inStock === true;
        for (const opt of options) {
          const optionName = opt.name;
          const optionValue = opt.value;
          if (!optionName || !optionValue) continue;
          if (!map.has(optionName)) {
            map.set(optionName, /* @__PURE__ */ new Map());
          }
          const optionMap = map.get(optionName);
          if (optionMap.has(optionValue)) {
            optionMap.set(optionValue, optionMap.get(optionValue) || inStock);
          } else {
            optionMap.set(optionValue, inStock);
          }
        }
      }
      return map;
    }
    function applyStockStatus(availabilityMap) {
      for (const [optionName, valuesMap] of availabilityMap.entries()) {
        const selector = `input.form-control__radio[name="${CSS.escape(
          optionName
        )}"]`;
        const inputs = document.querySelectorAll(selector);
        if (!inputs.length) {
          continue;
        }
        inputs.forEach((input) => {
          const value = input.value;
          if (!valuesMap.has(value)) {
            return;
          }
          const inStock = valuesMap.get(value);
          const shouldDisable = !inStock;
          input.disabled = shouldDisable;
          const wrapper = input.closest(".form-control--checkbox-button") || input.closest(".form-control");
          if (wrapper) {
            wrapper.classList.toggle(CONFIG.disabledClass, shouldDisable);
            wrapper.setAttribute(
              "aria-disabled",
              shouldDisable ? "true" : "false"
            );
          }
        });
        autoSelectFirstAvailable(inputs);
      }
    }
    function autoSelectFirstAvailable(inputs, optionName) {
      const checked = Array.from(inputs).find((i) => i.checked);
      if (!checked || checked && checked.disabled) {
        const firstEnabled = Array.from(inputs).find((i) => !i.disabled);
        if (firstEnabled) {
          firstEnabled.click();
        }
      }
    }
    async function processProductOptions(container) {
      if (!currentProductId) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!currentProductId) {
        currentProductId = extractProductIdFromPage();
      }
      if (!currentProductId) {
        return;
      }
      const combinations = await fetchProductCombinations(currentProductId);
      if (!combinations || combinations.length === 0) {
        return;
      }
      const availabilityMap = buildAvailabilityMap(combinations);
      if (availabilityMap.size === 0) {
        return;
      }
      applyStockStatus(availabilityMap);
    }
    function extractProductIdFromPage() {
      var _a, _b, _c, _d;
      const productBrowser = document.querySelector(
        '[class*="ecwid-productBrowser-ProductPage-"]'
      );
      if (productBrowser) {
        const match = productBrowser.className.match(
          /ecwid-productBrowser-ProductPage-(\d+)/
        );
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      const storePage = document.querySelector(
        '[class*="ec-store__product-page--c"]'
      );
      if (storePage) {
        const match = storePage.className.match(
          /ec-store__product-page--(\d{5,})/
        );
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      const productElement = document.querySelector("[data-product-id]");
      if (productElement) {
        const id = parseInt(productElement.getAttribute("data-product-id"), 10);
        if (id) {
          return id;
        }
      }
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const match = (_a = script.textContent) == null ? void 0 : _a.match(/productId['":\s]+(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      if ((_d = (_c = (_b = window.ec) == null ? void 0 : _b.config) == null ? void 0 : _c.product) == null ? void 0 : _d.productId) {
        return window.ec.config.product.productId;
      }
      return null;
    }
    function setupDOMObserver() {
      const observer = new MutationObserver(() => {
        const container = document.querySelector(
          ".product-details__product-options"
        );
        if (container && !processedContainers.has(container)) {
          processedContainers.add(container);
          setTimeout(() => {
            processProductOptions();
          }, 100);
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      const existingContainer = document.querySelector(
        ".product-details__product-options"
      );
      if (existingContainer && !processedContainers.has(existingContainer)) {
        processedContainers.add(existingContainer);
        setTimeout(() => {
          processProductOptions();
        }, 100);
      }
    }
    setupFetchInterceptor();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupDOMObserver);
    } else {
      setupDOMObserver();
    }
  }
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
  initStockManager();
  initUrlLocalization();
})();
