/**
 * Popmerch Product Variation Stock Manager v3.0
 *
 * Simple, reliable approach using DOM observation and Storefront API.
 * No dependency on Ecwid JS API.
 */

// ===== Configuration =====
const CONFIG = {
  storeId: 111654255,
  publicToken: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
  optionName: "Size",
  disabledClass: "ecwid-oos",
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

// ===== REST API Client (for combinations with stock data) =====
async function fetchProductCombinations(productId) {
  log("Fetching combinations for product:", productId);

  // Use REST API which returns variations with stock info
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
    // Find the Size option in this combination
    const options = combo.options || [];
    const sizeOption = options.find((opt) => opt.name === CONFIG.optionName);

    if (!sizeOption?.value) continue;

    const sizeValue = sizeOption.value;

    // Determine if in stock
    const inStock =
      combo.unlimited === true || combo.quantity > 0 || combo.inStock === true;

    // If already marked as in stock, keep it (any combination in stock = size available)
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

  // Fetch combinations (variations with stock data)
  const combinations = await fetchProductCombinations(currentProductId);

  if (!combinations || combinations.length === 0) {
    log("No combinations received");
    return;
  }

  // Build availability map
  const availabilityMap = buildAvailabilityMap(combinations);

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

  // Method 1: Look for productBrowser class with product ID (most reliable for SPA navigation)
  const productBrowser = document.querySelector(
    '[class*="ecwid-productBrowser-ProductPage-"]'
  );
  if (productBrowser) {
    const match = productBrowser.className.match(
      /ecwid-productBrowser-ProductPage-(\d+)/
    );
    if (match) {
      const id = parseInt(match[1], 10);
      if (id) {
        log("Found product ID from productBrowser class:", id);
        return id;
      }
    }
  }

  // Method 2: Look for ec-store__product-page-- class
  const storePage = document.querySelector(
    '[class*="ec-store__product-page--c"]'
  );
  if (storePage) {
    // Extract from class like "ec-store__product-page--800716701"
    const match = storePage.className.match(/ec-store__product-page--(\d{5,})/);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id) {
        log("Found product ID from ec-store class:", id);
        return id;
      }
    }
  }

  // Method 3: Look for data-product-id attribute
  const productElement = document.querySelector("[data-product-id]");
  if (productElement) {
    const id = parseInt(productElement.getAttribute("data-product-id"), 10);
    if (id) {
      log("Found product ID from data attribute:", id);
      return id;
    }
  }

  // Method 4: Look in page scripts for product ID
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

  // Method 5: Try window object
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
