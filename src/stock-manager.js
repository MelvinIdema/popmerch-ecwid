/**
 * Popmerch Product Variation Stock Manager v3.0
 * Refactored for Vite module system
 */

export function initStockManager() {
  console.log("Initializing Stock Manager Module");

  // ===== Configuration =====
  const CONFIG = {
    storeId: 111654255,
    publicToken: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
    disabledClass: "ecwid-oos",
    debug: false, // Set to false in production
    autoSelect: false, // Usage: set to true to enable auto-selection of first available option
  };

  // ===== State =====
  let currentProductId = null;
  let processedContainers = new WeakSet();

  // ===== Logging =====
  function log(...args) {
    if (CONFIG.debug) {
      console.log("[Popmerch Stock]", ...args);
    }
  }

  function logError(...args) {
    console.error("[Popmerch Stock]", ...args);
  }

  // ===== Fetch Interceptor =====
  function setupFetchInterceptor() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const [url, options] = args;

      // Try to extract product ID from catalog/product calls
      if (typeof url === "string" && url.includes("/catalog/product")) {
        try {
          const body = JSON.parse(options?.body || "{}");
          if (body.productIdentifier?.productId) {
            currentProductId = body.productIdentifier.productId;
            log("Captured product ID from fetch:", currentProductId);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      return originalFetch.apply(this, args);
    };

    log("Fetch interceptor ready");
  }

  // ===== REST API Client =====
  async function fetchProductCombinations(productId) {
    log("Fetching combinations for product:", productId);

    const url = `https://app.ecwid.com/api/v3/${CONFIG.storeId}/products/${productId}/combinations`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CONFIG.publicToken}`,
        },
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

  // ===== Build Availability Map =====
  function buildAvailabilityMap(combinations) {
    const map = new Map();

    if (!combinations || combinations.length === 0) {
      log("No combinations to build map from");
      return map;
    }

    log("Processing", combinations.length, "combinations");

    for (const combo of combinations) {
      const options = combo.options || [];
      const inStock =
        combo.unlimited === true ||
        combo.quantity > 0 ||
        combo.inStock === true;

      for (const opt of options) {
        const optionName = opt.name;
        const optionValue = opt.value;

        if (!optionName || !optionValue) continue;

        if (!map.has(optionName)) {
          map.set(optionName, new Map());
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

  // ===== Apply Stock Status to DOM =====
  function applyStockStatus(availabilityMap, container) {
    log("Applying stock status to DOM");

    if (!container) {
      logError("No container provided to applyStockStatus");
      return;
    }

    for (const [optionName, valuesMap] of availabilityMap.entries()) {
      const selector = `input.form-control__radio[name="${CSS.escape(
        optionName,
      )}"]`;
      // SCOPED QUERY: Only look within the specific product container
      const inputs = container.querySelectorAll(selector);

      if (!inputs.length) {
        log(`No inputs found for option "${optionName}"`);
        continue;
      }

      let disabledCount = 0;

      inputs.forEach((input) => {
        const value = input.value;

        if (!valuesMap.has(value)) {
          return;
        }

        const inStock = valuesMap.get(value);
        const shouldDisable = !inStock;

        input.disabled = shouldDisable;

        const wrapper =
          input.closest(".form-control--checkbox-button") ||
          input.closest(".form-control");

        if (wrapper) {
          wrapper.classList.toggle(CONFIG.disabledClass, shouldDisable);
          wrapper.setAttribute(
            "aria-disabled",
            shouldDisable ? "true" : "false",
          );
        }

        if (shouldDisable) {
          disabledCount++;
        }
      });

      autoSelectFirstAvailable(inputs, optionName);
    }
  }

  // ===== Auto-select First Available =====
  function autoSelectFirstAvailable(inputs, optionName) {
    if (!CONFIG.autoSelect) return;

    const checked = Array.from(inputs).find((i) => i.checked);

    if (!checked || (checked && checked.disabled)) {
      const firstEnabled = Array.from(inputs).find((i) => !i.disabled);
      if (firstEnabled) {
        // Consider dispatching change event instead of click if popup persists,
        // but scoping usually fixes the "wrong widget" click.
        firstEnabled.click();
      }
    }
  }

  // ===== Process Product Options =====
  async function processProductOptions(container) {
    log("Processing product options container");

    if (!currentProductId) {
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!currentProductId) {
      currentProductId = extractProductIdFromPage();
    }

    if (!currentProductId) {
      log("Could not determine product ID");
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

    applyStockStatus(availabilityMap, container);
  }

  // ===== Extract Product ID from Page =====
  function extractProductIdFromPage() {
    const productBrowser = document.querySelector(
      '[class*="ecwid-productBrowser-ProductPage-"]',
    );
    if (productBrowser) {
      const match = productBrowser.className.match(
        /ecwid-productBrowser-ProductPage-(\d+)/,
      );
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    const storePage = document.querySelector(
      '[class*="ec-store__product-page--c"]',
    );
    if (storePage) {
      const match = storePage.className.match(
        /ec-store__product-page--(\d{5,})/,
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
      const match = script.textContent?.match(/productId['":\s]+(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    if (window.ec?.config?.product?.productId) {
      return window.ec.config.product.productId;
    }

    return null;
  }

  // ===== DOM Observer =====
  function setupDOMObserver() {
    const observer = new MutationObserver(() => {
      const container = document.querySelector(
        ".product-details__product-options",
      );

      if (container && !processedContainers.has(container)) {
        processedContainers.add(container);
        setTimeout(() => {
          processProductOptions(container);
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const existingContainer = document.querySelector(
      ".product-details__product-options",
    );
    if (existingContainer && !processedContainers.has(existingContainer)) {
      processedContainers.add(existingContainer);
      setTimeout(() => {
        processProductOptions(existingContainer);
      }, 100);
    }
  }

  // Initialize
  setupFetchInterceptor();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDOMObserver);
  } else {
    setupDOMObserver();
  }
}
