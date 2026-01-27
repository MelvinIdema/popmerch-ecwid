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

export function initStockManager() {
  Logger.log("✓ Initialized, listening for product pages");
}
