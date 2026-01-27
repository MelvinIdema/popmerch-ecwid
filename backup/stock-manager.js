/**
 * Ecwid Custom Stock Manager V2
 * Handles product option availability based on real stock levels.
 */

// Configuration
const CONSTANTS = {
  STORE_ID: 111654255,
  PUBLIC_TOKEN: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf", // Note: Ensure this token is safe to expose client-side or consider proxying if needed, though Ecwid public tokens are generally safe for READ operations.
  DISABLED_CLASS: "ecwid-oos",
  DEBUG_KEY: "POPMERCH_DEBUG",
};

/**
 * Lightweight Logger utility
 * Enables colored logs only if localStorage key is set.
 */
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
    const styles =
      "background: #2e7d32; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;";
    if (data) {
      console.log(
        `%cStockManager%c ${message}`,
        styles,
        "color: inherit;",
        data,
      );
    } else {
      console.log(`%cStockManager%c ${message}`, styles, "color: inherit;");
    }
  }

  static error(message, error) {
    const styles =
      "background: #c62828; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;";
    console.error(
      `%cStockManager%c ${message}`,
      styles,
      "color: inherit;",
      error,
    );
  }
}

export class StockManager {
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

    // Listen for page loads
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

    // Clean up previous observer if any
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

    // Attempt to apply immediately
    this.applyStockToDom(availabilityMap);

    // Set up observer to re-apply if DOM changes (e.g. dynamic rendering)
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
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Ecwid API returns either array directly or object with items
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

        // If multiple combinations share this option value,
        // effectively OR the availability (if it works in ANY combo, it's enabled here).
        // *Logic Refined*: Actually, Ecwid options are dependent.
        // However, standard stock logic usually disables an option if ALL variations using it are OOS
        // OR checks valid paths.
        // Simplification for V2: If a specific option value exists in ANY 'inStock' combination, we consider it selectable.
        // (A more advanced version would handle dependent options, but that requires complex tree traversal not requested yet).

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
      ".product-details__product-options",
    );

    if (!container) {
      Logger.log("Product options container not found (yet).");
      return;
    }

    Logger.log("Applying stock rules to DOM...");

    for (const [optionName, valuesMap] of availabilityMap.entries()) {
      // Escape option name for selector (handles spaces, symbols)
      const safeName = CSS.escape(optionName);

      // Find inputs for this option name
      // Ecwid usually uses name="Attribute Name"
      const inputs = container.querySelectorAll(`input[name="${safeName}"]`);

      if (inputs.length === 0) {
        // Try finding by label if name attribute doesn't match directly?
        // Stick to name attribute as per V1 for now.
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
    if (input.disabled) return; // Already disabled

    input.disabled = true;

    // Visual styling for wrapper
    const wrapper =
      input.closest(".form-control__check") ||
      input.closest(".form-control--checkbox-button") ||
      input.closest("label"); // Fallback

    if (wrapper) {
      wrapper.classList.add(CONSTANTS.DISABLED_CLASS);
      wrapper.title = "Out of stock";
    }
  }

  enableInput(input) {
    if (!input.disabled) return;

    input.disabled = false;

    const wrapper =
      input.closest(".form-control__check") ||
      input.closest(".form-control--checkbox-button") ||
      input.closest("label");

    if (wrapper) {
      wrapper.classList.remove(CONSTANTS.DISABLED_CLASS);
      wrapper.removeAttribute("title");
    }
  }

  setupObserver(availabilityMap) {
    const container =
      document.querySelector(".ec-store__product-page") || document.body;

    this.observer = new MutationObserver((mutations) => {
      // Debounce could be added if performance issues arise
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // efficient check: see if product options container was added or touched
          const optionsContainer = document.querySelector(
            ".product-details__product-options",
          );
          if (optionsContainer) {
            this.applyStockToDom(availabilityMap);
            break; // Once applied, stop checking this batch
          }
        }
      }
    });

    this.observer.observe(container, {
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
  }
}
