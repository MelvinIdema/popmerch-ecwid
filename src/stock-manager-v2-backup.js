/**
 * Ecwid Custom Stock Manager V2 (Refactored)
 * Handles product option availability based on real stock levels.
 */

const CONFIG = {
  STORE_ID: 111654255,
  PUBLIC_TOKEN: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
  DEBUG_KEY: "POPMERCH_STOCK_DEBUG",
  DISABLED_OPTION_CLASS: "popmerch-option--disabled",
  SELECTORS: {
    OPTIONS_CONTAINER: ".product-details__product-options",
    PRODUCT_PAGE: ".ec-store__product-page",
    OPTION_WRAPPER: [
      ".form-control__check",
      ".form-control--checkbox-button",
      "label",
    ],
  },
  DEBOUNCE_MS: 50,
  API_TIMEOUT_MS: 5000,
};

/**
 * Lightweight Logger utility
 * Enables colored logs only if localStorage key is set.
 */
class Logger {
  static get isEnabled() {
    try {
      return localStorage.getItem(CONFIG.DEBUG_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  static _print(type, message, data = null) {
    if (!this.isEnabled) return;

    const styles = {
      log: "background: #2e7d32; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;",
      warn: "background: #f57f17; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;",
      error:
        "background: #c62828; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;",
    };

    const prefix = `%cStockManager%c ${message}`;
    const style = styles[type] || styles.log;
    const args = [prefix, style, "color: inherit;"];

    if (data) {
      args.push(data);
    }

    console[type](...args);
  }

  static log(message, data = null) {
    this._print("log", message, data);
  }

  static warn(message, data = null) {
    this._print("warn", message, data);
  }

  static error(message, error) {
    this._print("error", message, error);
  }
}

/**
 * Main Stock Manager Logic
 */
export class StockManager {
  constructor() {
    this.currentProductId = null;
    this.observer = null;
    this.debounceTimer = null;
    this.stockMap = new Map(); // Cache for current product
  }

  /**
   * Initialize the Stock Manager
   * Sets up global Ecwid event listeners.
   */
  init() {
    Logger.log("✓ Initialized, listening for product pages");

    if (typeof Ecwid === "undefined") {
      Logger.error("Ecwid global object not found. Retrying in 500ms...");
      setTimeout(() => this.init(), 500);
      return;
    }

    Ecwid.OnPageLoaded.add((page) => {
      this.handlePageLoad(page);
    });
  }

  /**
   * Handle Ecwid OnPageLoaded event
   * @param {Object} page Ecwid page object
   */
  handlePageLoad(page) {
    // 1. Clean up previous state
    this.cleanup();

    // 2. Check if we are on a PRODUCT page
    if (page.type === "PRODUCT") {
      Logger.log(`Product page detected: id=${page.productId}`, page);
      this.currentProductId = page.productId;
      this.checkStock(page.productId);
    } else {
      Logger.log("Not a product page, idle.");
    }
  }

  /**
   * Cleanup observers and state when leaving a product page
   */
  cleanup() {
    if (this.currentProductId) {
      Logger.log("Left product page, cleaning up");
    }
    this.disconnectObserver();
    this.currentProductId = null;
    this.stockMap.clear();
  }

  /**
   * Fetch stock data for a product and apply to DOM
   * @param {number} productId
   */
  async checkStock(productId) {
    Logger.log(`Fetching combinations for product ${productId}...`);

    try {
      const combinations = await this.fetchCombinations(productId);

      if (!combinations || combinations.length === 0) {
        Logger.log("No combinations found. Skipping.");
        return;
      }

      Logger.log(`Found ${combinations.length} combinations`);

      this.stockMap = this.buildAvailabilityMap(combinations);

      if (this.stockMap.size === 0) {
        Logger.log("Availability map empty.");
        return;
      }

      // Apply immediately
      this.applyStockToDom();

      // Watch for dynamic DOM changes (e.g. rendering delays)
      this.setupObserver();
    } catch (error) {
      Logger.error("Failed to check stock", error);
    }
  }

  /**
   * Fetch product combinations from Ecwid REST API
   *With timeout and error handling.
   * @param {number} productId
   * @returns {Promise<Array>} List of combinations
   */
  async fetchCombinations(productId) {
    const url = `https://app.ecwid.com/api/v3/${CONFIG.STORE_ID}/products/${productId}/combinations`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CONFIG.PUBLIC_TOKEN}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.items || [];
    } catch (error) {
      clearTimeout(id);
      Logger.error("API fetch failed:", error);
      return [];
    }
  }

  /**
   * Transform combinations into a lookup map
   * Map structure: OptionName -> Map(OptionValue -> Boolean(InStock))
   */
  buildAvailabilityMap(combinations) {
    const map = new Map();

    for (const combo of combinations) {
      const inStock =
        combo.unlimited === true ||
        combo.quantity > 0 ||
        combo.inStock === true;

      const options = combo.options || [];

      for (const opt of options) {
        const { name, value } = opt;
        if (!name || !value) continue;

        if (!map.has(name)) {
          map.set(name, new Map());
        }

        const optionMap = map.get(name);

        // Logic: If a specific option value exists in ANY 'inStock' combination, considered selectable.
        const currentStatus = optionMap.get(value) || false;
        optionMap.set(value, currentStatus || inStock);
      }
    }

    return map;
  }

  /**
   * Apply disabled state to DOM elements
   * Uses the cached this.stockMap
   */
  applyStockToDom() {
    const container = document.querySelector(
      CONFIG.SELECTORS.OPTIONS_CONTAINER,
    );

    if (!container) {
      // Container might not be rendered yet
      return;
    }

    // Iterate over our map and update specific inputs
    let disabledCount = 0;

    for (const [optionName, valuesMap] of this.stockMap.entries()) {
      const safeName = CSS.escape(optionName);
      // Find all inputs for this option
      const inputs = container.querySelectorAll(`input[name="${safeName}"]`);

      inputs.forEach((input) => {
        const val = input.value;
        if (valuesMap.has(val)) {
          const isAvailable = valuesMap.get(val);

          if (!isAvailable) {
            this.disableInput(input);
            disabledCount++;
          } else {
            this.enableInput(input);
          }
        }
      });
    }

    if (disabledCount > 0) {
      Logger.log(`Disabled ${disabledCount} out-of-stock options`);
    }
  }

  disableInput(input) {
    if (input.disabled) return;

    input.disabled = true;

    // Add class to wrapper for styling
    const wrapper = this.findWrapper(input);
    if (wrapper) {
      wrapper.classList.add(CONFIG.DISABLED_OPTION_CLASS);
      wrapper.title = "Out of stock";
    }
  }

  enableInput(input) {
    if (!input.disabled) return;

    input.disabled = false;

    const wrapper = this.findWrapper(input);
    if (wrapper) {
      wrapper.classList.remove(CONFIG.DISABLED_OPTION_CLASS);
      wrapper.removeAttribute("title");
    }
  }

  findWrapper(input) {
    for (const selector of CONFIG.SELECTORS.OPTION_WRAPPER) {
      const el = input.closest(selector);
      if (el) return el;
    }
    return null;
  }

  setupObserver() {
    // If observer already exists, don't recreate it
    if (this.observer) return;

    const targetNode =
      document.querySelector(CONFIG.SELECTORS.PRODUCT_PAGE) || document.body;

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // Verify if relevant nodes were touched?
          // For safety, we just debounce the update if any childList changed in the product area
          shouldUpdate = true;
          break;
        }
      }

      if (shouldUpdate) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.applyStockToDom();
        }, CONFIG.DEBOUNCE_MS);
      }
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });

    Logger.log("Observer started.");
  }

  disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Convenience export for main
export function initStockManager() {
  const manager = new StockManager();
  manager.init();

  // Inject CSS for disabled state
  const styleId = "popmerch-stock-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .${CONFIG.DISABLED_OPTION_CLASS} {
        opacity: 0.5;
        cursor: not-allowed;
        text-decoration: line-through;
      }
      .${CONFIG.DISABLED_OPTION_CLASS} input {
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  return manager;
}
