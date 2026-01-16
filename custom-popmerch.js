/**
 * Popmerch Product Variation Stock Manager
 *
 * Production-ready script for managing product variation stock availability in Ecwid storefronts.
 * Disables variation select buttons when stock is unavailable.
 *
 * @version 2.0.0
 * @author Popmerch
 * @license MIT
 */

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  // Ecwid API Configuration
  api: {
    publicToken: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
    baseUrl: "https://app.ecwid.com/api/v3",
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second initial delay, will use exponential backoff
  },

  // Product Options Configuration
  options: {
    targetOptionName: "Size", // The product option to manage (e.g., "Size", "Color")
    // Add more option names here if you want to manage multiple options:
    // targetOptionNames: ["Size", "Color"]
  },

  // Cache Configuration
  cache: {
    enabled: true,
    ttl: 60000, // 60 seconds
    version: "1.0",
    keyPrefix: "popmerch:stock",
  },

  // DOM Configuration
  dom: {
    pollInterval: 50, // ms between polls while waiting for Ecwid
    pollTimeout: 10000, // max wait time for Ecwid to be ready
    debounceDelay: 100, // ms to debounce DOM mutations
    observerConfig: {
      childList: true,
      subtree: true,
    },
  },

  // UI Configuration
  ui: {
    disabledClass: "ecwid-oos", // Out of stock class
    loadingClass: "ecwid-stock-loading",
    ariaDisabled: true,
  },

  // Logging Configuration
  logging: {
    enabled: true,
    level: "DEBUG", // ERROR, WARN, INFO, DEBUG
    prefix: "[Popmerch Stock]",
  },

  // Debug Configuration
  debug: {
    enableViaUrl: true, // Allow ?debug=true in URL
    exposeGlobalAPI: true, // Expose window.PopmerchStockManager
  },
};

// ==========================================
// LOGGER
// ==========================================

/**
 * Production-ready logging utility with log levels
 */
class Logger {
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  constructor(config) {
    this.config = config;
    this.level = Logger.LEVELS[config.level] ?? Logger.LEVELS.INFO;
    this.prefix = config.prefix;
    this.enabled = config.enabled;

    // Check for debug mode in URL
    if (CONFIG.debug.enableViaUrl && this.isDebugMode()) {
      this.level = Logger.LEVELS.DEBUG;
      this.enabled = true;
    }
  }

  /**
   * Check if debug mode is enabled via URL parameter
   */
  isDebugMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("debug") === "true";
    } catch {
      return false;
    }
  }

  /**
   * Log error message
   */
  error(message, ...args) {
    if (this.enabled && this.level >= Logger.LEVELS.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message, ...args) {
    if (this.enabled && this.level >= Logger.LEVELS.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  /**
   * Log info message
   */
  info(message, ...args) {
    if (this.enabled && this.level >= Logger.LEVELS.INFO) {
      console.info(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  /**
   * Log debug message
   */
  debug(message, ...args) {
    if (this.enabled && this.level >= Logger.LEVELS.DEBUG) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  /**
   * Log performance timing
   */
  time(label) {
    if (this.enabled && this.level >= Logger.LEVELS.DEBUG) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label) {
    if (this.enabled && this.level >= Logger.LEVELS.DEBUG) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Sleep utility for async code
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Debounce function to limit execution rate
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Safely get Ecwid store ID
 */
function getStoreIdSafe() {
  try {
    const id = window.Ecwid?.getOwnerId?.();
    return typeof id === "number" && id > 0 ? id : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract product ID from URL
 */
function getProductIdFromUrl() {
  try {
    const path = window.location.pathname || "";
    // Match patterns like "...-p800716701" or "/p800716701"
    const match = path.match(/-p(\d+)\b/i) || path.match(/\/p(\d+)\b/i);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Wait for Ecwid to be ready
 */
async function waitForEcwidReady(config, logger) {
  const startTime = Date.now();
  logger.debug("Waiting for Ecwid to be ready...");

  while (Date.now() - startTime < config.pollTimeout) {
    const isReady =
      window.Ecwid &&
      typeof window.Ecwid.OnPageLoaded?.add === "function" &&
      typeof window.Ecwid.getOwnerId === "function" &&
      getStoreIdSafe();

    if (isReady) {
      logger.debug("Ecwid is ready");
      return true;
    }

    await sleep(config.pollInterval);
  }

  logger.warn(`Ecwid not ready within ${config.pollTimeout}ms timeout`);
  return false;
}

// ==========================================
// ECWID API CLIENT
// ==========================================

/**
 * Client for interacting with Ecwid REST API
 */
class EcwidAPIClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Fetch product combinations from Ecwid API with retry logic
   */
  async fetchCombinations(storeId, productId) {
    const url =
      `${this.config.api.baseUrl}/${storeId}/products/${productId}/combinations` +
      `?responseFields=items(id,options,inStock,quantity,unlimited)`;

    this.logger.debug(`Fetching combinations for product ${productId}`, {
      url,
    });

    let lastError;
    for (let attempt = 1; attempt <= this.config.api.retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          headers: {
            Authorization: `Bearer ${this.config.api.publicToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        this.logger.info(
          `Successfully fetched ${items.length} combinations for product ${productId}`
        );
        return items;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${this.config.api.retryAttempts} failed:`,
          error.message
        );

        // Don't retry on 4xx errors (client errors)
        if (error.message.includes("HTTP 4")) {
          break;
        }

        // Exponential backoff: wait before retrying
        if (attempt < this.config.api.retryAttempts) {
          const delay = this.config.api.retryDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    this.logger.error(
      "Failed to fetch combinations after all retry attempts",
      lastError
    );
    throw lastError;
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.api.timeout
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.config.api.timeout}ms`);
      }
      throw error;
    }
  }
}

// ==========================================
// STOCK MANAGER
// ==========================================

/**
 * Manages product stock availability logic
 */
class StockManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.cache = new Map();
  }

  /**
   * Get cache key for a product
   */
  getCacheKey(storeId, productId) {
    return `${this.config.cache.keyPrefix}:v${this.config.cache.version}:${storeId}:${productId}`;
  }

  /**
   * Get cached combinations if available and valid
   */
  getCachedCombinations(storeId, productId) {
    if (!this.config.cache.enabled) {
      return null;
    }

    const cacheKey = this.getCacheKey(storeId, productId);

    // Try session storage first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, items, version } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (
          age < this.config.cache.ttl &&
          version === this.config.cache.version
        ) {
          this.logger.debug(
            `Cache hit for product ${productId} (age: ${age}ms)`
          );
          return Array.isArray(items) ? items : null;
        }

        this.logger.debug(
          `Cache expired for product ${productId} (age: ${age}ms)`
        );
      }
    } catch (error) {
      this.logger.warn("Failed to read cache from sessionStorage", error);
    }

    // Try memory cache
    const memCached = this.cache.get(cacheKey);
    if (memCached) {
      const age = Date.now() - memCached.timestamp;
      if (age < this.config.cache.ttl) {
        this.logger.debug(
          `Memory cache hit for product ${productId} (age: ${age}ms)`
        );
        return memCached.items;
      }
    }

    return null;
  }

  /**
   * Cache combinations
   */
  cacheCombinations(storeId, productId, items) {
    if (!this.config.cache.enabled) {
      return;
    }

    const cacheKey = this.getCacheKey(storeId, productId);
    const cacheData = {
      timestamp: Date.now(),
      items,
      version: this.config.cache.version,
    };

    // Store in session storage
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this.logger.debug(
        `Cached ${items.length} combinations for product ${productId}`
      );
    } catch (error) {
      this.logger.warn("Failed to write cache to sessionStorage", error);
    }

    // Store in memory cache as fallback
    this.cache.set(cacheKey, cacheData);
  }

  /**
   * Build availability map from combinations
   * Maps option value -> boolean (in stock or not)
   */
  buildAvailabilityMap(combinations, optionName) {
    const availabilityMap = new Map();

    this.logger.debug(
      `Building availability map for ${combinations.length} combinations, option: ${optionName}`
    );

    for (const combination of combinations) {
      // Find the option that matches our target option name
      const option = combination?.options?.find(
        (opt) => opt?.name === optionName
      );

      if (!option?.value) {
        continue;
      }

      const optionValue = option.value;

      // Determine if this combination is in stock
      const inStock = this.isInStock(combination);

      // If we already have this option value and it was in stock, keep it as in stock
      // This handles cases where multiple combinations exist for the same option value
      if (availabilityMap.has(optionValue)) {
        const currentStock = availabilityMap.get(optionValue);
        availabilityMap.set(optionValue, currentStock || inStock);
      } else {
        availabilityMap.set(optionValue, inStock);
      }

      this.logger.debug(
        `Option "${optionValue}": ${inStock ? "IN STOCK" : "OUT OF STOCK"}`,
        {
          unlimited: combination.unlimited,
          quantity: combination.quantity,
          inStock: combination.inStock,
        }
      );
    }

    this.logger.info(
      `Availability map built: ${availabilityMap.size} options, ` +
        `${
          Array.from(availabilityMap.values()).filter(Boolean).length
        } in stock`
    );

    return availabilityMap;
  }

  /**
   * Determine if a combination is in stock
   */
  isInStock(combination) {
    // Check unlimited flag first
    if (combination.unlimited === true) {
      return true;
    }

    // Check quantity
    if (typeof combination.quantity === "number" && combination.quantity > 0) {
      return true;
    }

    // Check inStock flag as fallback
    if (combination.inStock === true) {
      return true;
    }

    return false;
  }
}

// ==========================================
// DOM MANAGER
// ==========================================

/**
 * Manages DOM manipulation and observation
 */
class DOMManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.observer = null;
    this.currentAvailabilityMap = null;
    this.currentOptionName = null;
  }

  /**
   * Find all variation input elements for a given option name
   */
  findVariationInputs(optionName) {
    const escapedName = CSS.escape(optionName);
    const selector = `input.form-control__radio[name="${escapedName}"]`;
    const inputs = document.querySelectorAll(selector);

    this.logger.debug(
      `Found ${inputs.length} variation inputs for option "${optionName}"`,
      { selector }
    );

    return inputs;
  }

  /**
   * Apply stock-based disabled states to variation inputs
   */
  applyStockStatus(availabilityMap, optionName) {
    this.logger.time("Apply stock status");

    const inputs = this.findVariationInputs(optionName);

    if (!inputs.length) {
      this.logger.warn(`No variation inputs found for option "${optionName}"`);
      this.logger.timeEnd("Apply stock status");
      return;
    }

    let disabledCount = 0;
    let enabledCount = 0;

    inputs.forEach((input) => {
      const value = input.value;

      // If we don't have stock info for this value, leave it as-is
      if (!availabilityMap.has(value)) {
        this.logger.debug(`No stock info for "${value}", leaving unchanged`);
        return;
      }

      const inStock = availabilityMap.get(value);
      const shouldDisable = !inStock;

      // Update input disabled state
      input.disabled = shouldDisable;

      // Update wrapper element classes and ARIA attributes
      const wrapper =
        input.closest(".form-control--checkbox-button") ||
        input.closest(".form-control");

      if (wrapper) {
        wrapper.classList.toggle(this.config.ui.disabledClass, shouldDisable);

        if (this.config.ui.ariaDisabled) {
          wrapper.setAttribute(
            "aria-disabled",
            shouldDisable ? "true" : "false"
          );
        }
      }

      if (shouldDisable) {
        disabledCount++;
      } else {
        enabledCount++;
      }
    });

    this.logger.info(
      `Applied stock status: ${enabledCount} enabled, ${disabledCount} disabled`
    );

    // Auto-select first available option if current selection is disabled
    this.autoSelectAvailableOption(inputs);

    this.logger.timeEnd("Apply stock status");
  }

  /**
   * Auto-select first available option if current selection is disabled
   */
  autoSelectAvailableOption(inputs) {
    const checkedInput = Array.from(inputs).find((input) => input.checked);

    if (checkedInput && checkedInput.disabled) {
      this.logger.info(
        `Current selection "${checkedInput.value}" is disabled, auto-selecting first available`
      );

      const firstEnabled = Array.from(inputs).find((input) => !input.disabled);

      if (firstEnabled) {
        firstEnabled.click();
        this.logger.info(`Auto-selected "${firstEnabled.value}"`);
      } else {
        this.logger.warn("No available options to auto-select");
      }
    }
  }

  /**
   * Start observing DOM changes and reapply stock status when needed
   */
  startObserving(availabilityMap, optionName) {
    // Store current map and option for reapplication
    this.currentAvailabilityMap = availabilityMap;
    this.currentOptionName = optionName;

    // Disconnect existing observer if any
    this.stopObserving();

    // Create debounced reapply function
    const debouncedReapply = debounce(() => {
      if (this.currentAvailabilityMap && this.currentOptionName) {
        this.logger.debug("DOM changed, reapplying stock status");
        this.applyStockStatus(
          this.currentAvailabilityMap,
          this.currentOptionName
        );
      }
    }, this.config.dom.debounceDelay);

    // Find the container to observe
    const container =
      document.querySelector(".product-details-size__sizes") ||
      document.querySelector(".ec-store") ||
      document.body;

    this.logger.debug("Starting DOM observation", {
      container: container.className || "body",
    });

    // Create and start observer
    this.observer = new MutationObserver(() => {
      debouncedReapply();
    });

    this.observer.observe(container, this.config.dom.observerConfig);
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.debug("Stopped DOM observation");
    }
  }
}

// ==========================================
// MAIN APPLICATION
// ==========================================

/**
 * Main application controller
 */
class PopmerchStockManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.apiClient = new EcwidAPIClient(config, this.logger);
    this.stockManager = new StockManager(config, this.logger);
    this.domManager = new DOMManager(config, this.logger);
    this.initialized = false;
  }

  /**
   * Initialize the stock manager
   */
  async initialize() {
    this.logger.info("Initializing Popmerch Stock Manager v2.0.0");

    // Wait for Ecwid to be ready
    const ecwidReady = await waitForEcwidReady(this.config.dom, this.logger);
    if (!ecwidReady) {
      this.logger.error("Failed to initialize: Ecwid not ready");
      return false;
    }

    // Listen for page changes FIRST (most important - this will always work)
    window.Ecwid.OnPageLoaded.add((page) => {
      this.handlePageLoaded(page);
    });

    this.logger.debug("Registered OnPageLoaded event handler");

    // Try immediate detection in case we're already on a product page
    const productId = this.detectCurrentProduct();
    if (productId) {
      this.logger.info(`Initial product page detected: ${productId}`);
      await this.processProduct(productId);
    } else {
      // If immediate detection failed, try again after a delay
      // This gives Ecwid more time to fully initialize its API
      this.logger.debug(
        "No product detected immediately, will retry after delay"
      );
      setTimeout(async () => {
        const retryProductId = this.detectCurrentProduct();
        if (retryProductId) {
          this.logger.info(`Product detected on retry: ${retryProductId}`);
          await this.processProduct(retryProductId);
        } else {
          this.logger.debug(
            "No product detected after retry - waiting for OnPageLoaded event"
          );
        }
      }, 500); // Wait 500ms for Ecwid API to fully initialize
    }

    this.initialized = true;
    this.logger.info("Initialization complete");

    // Expose global API if configured
    if (this.config.debug.exposeGlobalAPI) {
      window.PopmerchStockManager = this;
      this.logger.debug("Exposed global API: window.PopmerchStockManager");
    }

    return true;
  }

  /**
   * Detect current product using multiple strategies
   * This is important because OnPageLoaded might have already fired before our script loaded
   */
  detectCurrentProduct() {
    // Strategy 1: Try URL-based detection
    const productIdFromUrl = getProductIdFromUrl();
    if (productIdFromUrl) {
      this.logger.debug(`Product detected from URL: ${productIdFromUrl}`);
      return productIdFromUrl;
    }

    // Strategy 2: Check Ecwid's internal page state
    try {
      if (
        window.Ecwid &&
        typeof window.Ecwid.getAppPublicConfig === "function"
      ) {
        const config = window.Ecwid.getAppPublicConfig();
        if (config?.page?.type === "PRODUCT" && config?.page?.productId) {
          this.logger.debug(
            `Product detected from Ecwid config: ${config.page.productId}`
          );
          return config.page.productId;
        }
      }
    } catch (error) {
      this.logger.debug("Could not get Ecwid app config", error);
    }

    // Strategy 3: Parse from DOM (Ecwid adds data attributes to product elements)
    try {
      const productElement = document.querySelector("[data-product-id]");
      if (productElement) {
        const productId = parseInt(
          productElement.getAttribute("data-product-id"),
          10
        );
        if (productId) {
          this.logger.debug(`Product detected from DOM: ${productId}`);
          return productId;
        }
      }
    } catch (error) {
      this.logger.debug("Could not get product from DOM", error);
    }

    // Strategy 4: Check if we're on a product details page by looking for specific elements
    try {
      const productDetails = document.querySelector(
        ".ec-store__product-details, .product-details"
      );
      if (productDetails) {
        // Try to extract from URL hash which Ecwid uses for navigation
        const hash = window.location.hash;
        const hashMatch = hash.match(/\/p\/(\d+)/i);
        if (hashMatch) {
          const productId = parseInt(hashMatch[1], 10);
          this.logger.debug(`Product detected from URL hash: ${productId}`);
          return productId;
        }
      }
    } catch (error) {
      this.logger.debug("Could not parse URL hash", error);
    }

    this.logger.debug("No product detected using any strategy");
    return null;
  }

  /**
   * Handle Ecwid page loaded event
   */
  async handlePageLoaded(page) {
    this.logger.info("🔔 OnPageLoaded event fired!");
    this.logger.debug("Page data received:", page);
    this.logger.debug("Page type:", page?.type);
    this.logger.debug("Page productId:", page?.productId);
    this.logger.debug("Full page object:", JSON.stringify(page, null, 2));

    if (page?.type === "PRODUCT" && page?.productId) {
      this.logger.info(`✅ Product page detected via event: ${page.productId}`);
      await this.processProduct(page.productId);
    } else {
      this.logger.warn(
        `❌ Page type is "${page?.type}", not PRODUCT. ProductId: ${page?.productId}`
      );
    }
  }

  /**
   * Process a product page
   */
  async processProduct(productId) {
    this.logger.info(`Processing product ${productId}`);
    this.logger.time(`Process product ${productId}`);

    try {
      // Get store ID
      const storeId = getStoreIdSafe();
      if (!storeId) {
        this.logger.error("Store ID not available");
        return;
      }

      // Check cache first
      let combinations = this.stockManager.getCachedCombinations(
        storeId,
        productId
      );

      // Fetch from API if not cached
      if (!combinations) {
        try {
          combinations = await this.apiClient.fetchCombinations(
            storeId,
            productId
          );
          this.stockManager.cacheCombinations(storeId, productId, combinations);
        } catch (error) {
          this.logger.error(
            "Failed to fetch combinations, failing silently",
            error
          );
          return; // Fail gracefully, don't break the page
        }
      }

      // If no combinations, nothing to disable
      if (!combinations || combinations.length === 0) {
        this.logger.info("No combinations found, nothing to disable");
        return;
      }

      // Build availability map and apply to DOM
      const optionName = this.config.options.targetOptionName;
      const availabilityMap = this.stockManager.buildAvailabilityMap(
        combinations,
        optionName
      );

      // Apply stock status
      this.domManager.applyStockStatus(availabilityMap, optionName);

      // Start observing for DOM changes
      this.domManager.startObserving(availabilityMap, optionName);

      this.logger.timeEnd(`Process product ${productId}`);
    } catch (error) {
      this.logger.error(`Error processing product ${productId}`, error);
      this.logger.timeEnd(`Process product ${productId}`);
    }
  }

  /**
   * Manually refresh stock status for current product
   * Useful for debugging or forced refresh
   */
  async refresh() {
    this.logger.info("Manual refresh triggered");
    const productId = getProductIdFromUrl();
    if (productId) {
      // Clear cache for this product
      const storeId = getStoreIdSafe();
      if (storeId) {
        const cacheKey = this.stockManager.getCacheKey(storeId, productId);
        sessionStorage.removeItem(cacheKey);
        this.stockManager.cache.delete(cacheKey);
      }
      // Reprocess
      await this.processProduct(productId);
    }
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      initialized: this.initialized,
      storeId: getStoreIdSafe(),
      productId: getProductIdFromUrl(),
      cacheSize: this.stockManager.cache.size,
      observing: this.domManager.observer !== null,
      config: this.config,
    };
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

(async function init() {
  try {
    const manager = new PopmerchStockManager(CONFIG);
    await manager.initialize();
  } catch (error) {
    console.error("[Popmerch Stock] Fatal initialization error:", error);
  }
})();
