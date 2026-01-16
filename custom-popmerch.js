/**
 * Popmerch Product Variation Stock Manager v3.0
 *
 * Simple, reliable approach using DOM observation and Storefront API.
 * No dependency on Ecwid JS API.
 */

// ===== Configuration =====
const CONFIG = {
  storeId: 111654255,
  storefrontApiBase:
    "https://eu-fra2-storefront-api.ecwid.com/storefront/api/v1",
  optionName: "Size",
  disabledClass: "ecwid-oos",
  lang: "nl",
  debug: true, // Set to false in production
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
// Intercept fetch calls to capture product ID from Ecwid's own API calls
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

// ===== Storefront API Client =====
async function fetchProductData(productId) {
  log("Fetching product data for:", productId);

  const url = `${CONFIG.storefrontApiBase}/${CONFIG.storeId}/catalog/product`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lang: CONFIG.lang,
        productIdentifier: {
          type: "PUBLISHED",
          productId: productId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    log("Product data received:", data);
    return data;
  } catch (error) {
    logError("Failed to fetch product data:", error);
    return null;
  }
}

// ===== Build Availability Map =====
function buildAvailabilityMap(productData) {
  const map = new Map();

  if (!productData) {
    log("No product data to build map from");
    return map;
  }

  // Check if product has variations
  const variations = productData.variations || productData.combinations || [];

  if (variations.length === 0) {
    log("No variations found in product data");
    // Try to find variation data in different structure
    if (productData.product?.variations) {
      variations.push(...productData.product.variations);
    }
  }

  log("Processing", variations.length, "variations");

  for (const variation of variations) {
    // Find the Size option in this variation
    const options = variation.options || [];
    const sizeOption = options.find((opt) => opt.name === CONFIG.optionName);

    if (!sizeOption?.value) continue;

    const sizeValue = sizeOption.value;

    // Determine if in stock
    const inStock =
      variation.unlimited === true ||
      variation.quantity > 0 ||
      variation.inStock === true;

    // If already marked as in stock, keep it (any variation in stock = size available)
    if (map.has(sizeValue)) {
      map.set(sizeValue, map.get(sizeValue) || inStock);
    } else {
      map.set(sizeValue, inStock);
    }

    log(`Size "${sizeValue}": ${inStock ? "IN STOCK" : "OUT OF STOCK"}`);
  }

  log("Availability map:", Object.fromEntries(map));
  return map;
}

// ===== Apply Stock Status to DOM =====
function applyStockStatus(availabilityMap) {
  const selector = `input.form-control__radio[name="${CSS.escape(
    CONFIG.optionName
  )}"]`;
  const inputs = document.querySelectorAll(selector);

  if (!inputs.length) {
    log("No option inputs found");
    return;
  }

  log("Applying stock status to", inputs.length, "inputs");

  let disabledCount = 0;

  inputs.forEach((input) => {
    const value = input.value;

    if (!availabilityMap.has(value)) {
      log(`No stock info for "${value}", leaving as-is`);
      return;
    }

    const inStock = availabilityMap.get(value);
    const shouldDisable = !inStock;

    // Apply disabled state
    input.disabled = shouldDisable;

    // Find wrapper and apply class
    const wrapper =
      input.closest(".form-control--checkbox-button") ||
      input.closest(".form-control");

    if (wrapper) {
      wrapper.classList.toggle(CONFIG.disabledClass, shouldDisable);
      wrapper.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
    }

    if (shouldDisable) {
      disabledCount++;
      log(`Disabled: ${value}`);
    }
  });

  log(
    `Applied: ${disabledCount} disabled, ${
      inputs.length - disabledCount
    } enabled`
  );

  // Auto-select first available if current is disabled
  autoSelectFirstAvailable(inputs);
}

// ===== Auto-select First Available =====
function autoSelectFirstAvailable(inputs) {
  const checked = Array.from(inputs).find((i) => i.checked);

  if (checked && checked.disabled) {
    const firstEnabled = Array.from(inputs).find((i) => !i.disabled);
    if (firstEnabled) {
      log("Auto-selecting:", firstEnabled.value);
      firstEnabled.click();
    }
  }
}

// ===== Process Product Options =====
async function processProductOptions(container) {
  log("Processing product options container");

  // Wait a bit for product ID to be captured from fetch
  if (!currentProductId) {
    log("No product ID yet, waiting...");
    await new Promise((r) => setTimeout(r, 500));
  }

  // If still no product ID, try to extract from page
  if (!currentProductId) {
    currentProductId = extractProductIdFromPage();
  }

  if (!currentProductId) {
    log("Could not determine product ID");
    return;
  }

  log("Processing product:", currentProductId);

  // Fetch product data
  const productData = await fetchProductData(currentProductId);

  if (!productData) {
    log("No product data received");
    return;
  }

  // Build availability map
  const availabilityMap = buildAvailabilityMap(productData);

  if (availabilityMap.size === 0) {
    log("No availability data found");
    return;
  }

  // Apply to DOM
  applyStockStatus(availabilityMap);

  log("Processing complete!");
}

// ===== Extract Product ID from Page =====
function extractProductIdFromPage() {
  // Try various methods to get product ID

  // Method 1: Look for data-product-id attribute
  const productElement = document.querySelector("[data-product-id]");
  if (productElement) {
    const id = parseInt(productElement.getAttribute("data-product-id"), 10);
    if (id) {
      log("Found product ID from data attribute:", id);
      return id;
    }
  }

  // Method 2: Look in page scripts for product ID
  const scripts = document.querySelectorAll("script");
  for (const script of scripts) {
    const match = script.textContent?.match(/productId['":\s]+(\d+)/);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id) {
        log("Found product ID from script:", id);
        return id;
      }
    }
  }

  // Method 3: Try window object
  if (window.ec?.config?.product?.productId) {
    log("Found product ID from window.ec:", window.ec.config.product.productId);
    return window.ec.config.product.productId;
  }

  log("Could not extract product ID from page");
  return null;
}

// ===== DOM Observer =====
function setupDOMObserver() {
  const observer = new MutationObserver(() => {
    // Look for product options container
    const container = document.querySelector(
      ".product-details__product-options"
    );

    if (container && !processedContainers.has(container)) {
      log("Product options container found!");
      processedContainers.add(container);

      // Small delay to ensure DOM is fully ready
      setTimeout(() => {
        processProductOptions(container);
      }, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  log("DOM observer ready");

  // Also check immediately in case container already exists
  const existingContainer = document.querySelector(
    ".product-details__product-options"
  );
  if (existingContainer && !processedContainers.has(existingContainer)) {
    log("Found existing product options container");
    processedContainers.add(existingContainer);
    setTimeout(() => {
      processProductOptions(existingContainer);
    }, 100);
  }
}

// ===== Initialize =====
(function init() {
  log("Initializing v3.0 (DOM-based)");

  // Setup fetch interceptor first to catch product ID
  setupFetchInterceptor();

  // Then setup DOM observer
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDOMObserver);
  } else {
    setupDOMObserver();
  }

  log("Initialization complete");
})();
