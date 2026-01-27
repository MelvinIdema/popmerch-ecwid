(function() {
  "use strict";
  const CONSTANTS = {
    STORE_ID: 111654255,
    PUBLIC_TOKEN: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
    // Note: Ensure this token is safe to expose client-side or consider proxying if needed, though Ecwid public tokens are generally safe for READ operations.
    DISABLED_CLASS: "ecwid-oos",
    DEBUG_KEY: "POPMERCH_DEBUG"
  };
  class Logger {
    static get isEnabled() {
      try {
        return localStorage.getItem(CONSTANTS.DEBUG_KEY) === "true";
      } catch (e) {
        return false;
      }
    }
    static log(message, data = null) {
      if (!this.isEnabled) return;
      const styles = "background: #2e7d32; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;";
      if (data) {
        console.log(
          `%cStockManager%c ${message}`,
          styles,
          "color: inherit;",
          data
        );
      } else {
        console.log(`%cStockManager%c ${message}`, styles, "color: inherit;");
      }
    }
    static error(message, error) {
      const styles = "background: #c62828; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;";
      console.error(
        `%cStockManager%c ${message}`,
        styles,
        "color: inherit;",
        error
      );
    }
  }
  class StockManager {
    constructor() {
      this.processedProductId = null;
      this.observer = null;
    }
    /**
     * Initialize the Stock Manager
     * Sets up global Ecwid event listeners.
     */
    init() {
      Logger.log("Initializing...");
      if (typeof Ecwid === "undefined") {
        Logger.error("Ecwid global object not found. Retrying in 500ms...");
        setTimeout(() => this.init(), 500);
        return;
      }
      Ecwid.OnPageLoaded.add((page) => {
        this.handlePageLoad(page);
      });
      Logger.log("Ready and listening for pages.");
    }
    /**
     * Handle Ecwid OnPageLoaded event
     * @param {Object} page Ecwid page object
     */
    handlePageLoad(page) {
      Logger.log("Page loaded:", page);
      this.disconnectObserver();
      if (page.type === "PRODUCT") {
        this.processedProductId = page.productId;
        this.checkStock(page.productId);
      } else {
        this.processedProductId = null;
      }
    }
    /**
     * Fetch stock data for a product and apply to DOM
     * @param {number} productId
     */
    async checkStock(productId) {
      Logger.log(`Checking stock for product ${productId}...`);
      const combinations = await this.fetchCombinations(productId);
      if (!combinations || combinations.length === 0) {
        Logger.log("No combinations found. Skipping.");
        return;
      }
      const availabilityMap = this.buildAvailabilityMap(combinations);
      if (availabilityMap.size === 0) {
        Logger.log("Availability map empty.");
        return;
      }
      this.applyStockToDom(availabilityMap);
      this.setupObserver(availabilityMap);
    }
    /**
     * Fetch product combinations from Ecwid REST API
     * @param {number} productId
     * @returns {Promise<Array>} List of combinations
     */
    async fetchCombinations(productId) {
      const url = `https://app.ecwid.com/api/v3/${CONSTANTS.STORE_ID}/products/${productId}/combinations`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${CONSTANTS.PUBLIC_TOKEN}`,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : data.items || [];
      } catch (error) {
        Logger.error("Fetch failed:", error);
        return [];
      }
    }
    /**
     * Transform combinations into a lookup map
     * Map structure: OptionName -> Map(OptionValue -> Boolean(InStock))
     */
    buildAvailabilityMap(combinations) {
      const map = /* @__PURE__ */ new Map();
      for (const combo of combinations) {
        const inStock = combo.unlimited === true || combo.quantity > 0 || combo.inStock === true;
        const options = combo.options || [];
        for (const opt of options) {
          const { name, value } = opt;
          if (!name || !value) continue;
          if (!map.has(name)) {
            map.set(name, /* @__PURE__ */ new Map());
          }
          const optionMap = map.get(name);
          const currentStatus = optionMap.get(value) || false;
          optionMap.set(value, currentStatus || inStock);
        }
      }
      return map;
    }
    /**
     * Apply disabled state to DOM elements
     * @param {Map} availabilityMap
     */
    applyStockToDom(availabilityMap) {
      const container = document.querySelector(
        ".product-details__product-options"
      );
      if (!container) {
        Logger.log("Product options container not found (yet).");
        return;
      }
      Logger.log("Applying stock rules to DOM...");
      for (const [optionName, valuesMap] of availabilityMap.entries()) {
        const safeName = CSS.escape(optionName);
        const inputs = container.querySelectorAll(`input[name="${safeName}"]`);
        if (inputs.length === 0) {
          continue;
        }
        inputs.forEach((input) => {
          const val = input.value;
          if (valuesMap.has(val)) {
            const isAvailable = valuesMap.get(val);
            if (!isAvailable) {
              this.disableInput(input);
            } else {
              this.enableInput(input);
            }
          }
        });
      }
    }
    disableInput(input) {
      if (input.disabled) return;
      input.disabled = true;
      const wrapper = input.closest(".form-control__check") || input.closest(".form-control--checkbox-button") || input.closest("label");
      if (wrapper) {
        wrapper.classList.add(CONSTANTS.DISABLED_CLASS);
        wrapper.title = "Out of stock";
      }
    }
    enableInput(input) {
      if (!input.disabled) return;
      input.disabled = false;
      const wrapper = input.closest(".form-control__check") || input.closest(".form-control--checkbox-button") || input.closest("label");
      if (wrapper) {
        wrapper.classList.remove(CONSTANTS.DISABLED_CLASS);
        wrapper.removeAttribute("title");
      }
    }
    setupObserver(availabilityMap) {
      const container = document.querySelector(".ec-store__product-page") || document.body;
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            const optionsContainer = document.querySelector(
              ".product-details__product-options"
            );
            if (optionsContainer) {
              this.applyStockToDom(availabilityMap);
              break;
            }
          }
        }
      });
      this.observer.observe(container, {
        childList: true,
        subtree: true
      });
      Logger.log("Observer started.");
    }
    disconnectObserver() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
  console.log("Initializing Popmerch Ecwid Extensions...");
  const stockManager = new StockManager();
  stockManager.init();
})();
