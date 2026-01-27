/**
 * Ecwid Stock Manager V2 - Debug Version
 *
 * Each feature can be toggled independently via localStorage:
 *
 * Enable all logging:
 *   localStorage.setItem('SM_DEBUG', 'true')
 *
 * Enable features step-by-step:
 *   localStorage.setItem('SM_STEP_LISTEN', 'true')     // Step 1: Listen to OnPageLoaded
 *   localStorage.setItem('SM_STEP_FETCH', 'true')      // Step 2: Fetch combinations from API
 *   localStorage.setItem('SM_STEP_DOM', 'true')        // Step 3: Apply disabled state to DOM
 *   localStorage.setItem('SM_STEP_OBSERVER', 'true')   // Step 4: Setup MutationObserver
 *
 * Reload after each change to test.
 */

const CONFIG = {
  STORE_ID: 111654255,
  PUBLIC_TOKEN: "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf",
  DISABLED_CLASS: "popmerch-option--disabled",
  SELECTORS: {
    OPTIONS_CONTAINER: ".product-details__product-options",
    PRODUCT_PAGE: ".ec-store__product-page",
  },
  DEBOUNCE_MS: 100,
  API_TIMEOUT_MS: 5000,
};

// ============ DEBUG UTILITIES ============

function isDebug() {
  try {
    return localStorage.getItem("SM_DEBUG") === "true";
  } catch {
    return false;
  }
}

function isStepEnabled(step) {
  try {
    return localStorage.getItem(`SM_STEP_${step}`) === "true";
  } catch {
    return false;
  }
}

function log(msg, data = null) {
  if (!isDebug()) return;
  const style =
    "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
  data
    ? console.log(`%c[StockMgr]%c ${msg}`, style, "", data)
    : console.log(`%c[StockMgr]%c ${msg}`, style, "");
}

function logWarn(msg, data = null) {
  if (!isDebug()) return;
  const style =
    "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
  data
    ? console.warn(`%c[StockMgr]%c ${msg}`, style, "", data)
    : console.warn(`%c[StockMgr]%c ${msg}`, style, "");
}

function logError(msg, err) {
  // Always log errors
  const style =
    "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
  console.error(`%c[StockMgr]%c ${msg}`, style, "", err);
}

// ============ STATE ============

let currentProductId = null;
let observer = null;
let debounceTimer = null;
let stockMap = new Map();

// ============ CORE FUNCTIONS ============

function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
    log("Observer disconnected");
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  currentProductId = null;
  stockMap.clear();
}

async function fetchCombinations(productId) {
  const url = `https://app.ecwid.com/api/v3/${CONFIG.STORE_ID}/products/${productId}/combinations`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

  try {
    log(`Fetching: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CONFIG.PUBLIC_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || [];
    log(`Fetched ${items.length} combinations`);
    return items;
  } catch (err) {
    clearTimeout(timeoutId);
    logError("Fetch failed", err);
    return [];
  }
}

function buildAvailabilityMap(combinations) {
  const map = new Map();

  for (const combo of combinations) {
    const inStock =
      combo.unlimited === true || combo.quantity > 0 || combo.inStock === true;
    const options = combo.options || [];

    for (const opt of options) {
      const { name, value } = opt;
      if (!name || !value) continue;

      if (!map.has(name)) map.set(name, new Map());

      const optionMap = map.get(name);
      // OR logic: if ANY combo with this option is in stock, it's available
      optionMap.set(value, optionMap.get(value) || inStock);
    }
  }

  log(
    "Built availability map",
    Object.fromEntries([...map].map(([k, v]) => [k, Object.fromEntries(v)])),
  );
  return map;
}

function applyStockToDom() {
  const container = document.querySelector(CONFIG.SELECTORS.OPTIONS_CONTAINER);
  if (!container) {
    log("Options container not found yet");
    return;
  }

  let disabledCount = 0;
  let enabledCount = 0;

  for (const [optionName, valuesMap] of stockMap.entries()) {
    const safeName = CSS.escape(optionName);
    const inputs = container.querySelectorAll(`input[name="${safeName}"]`);

    inputs.forEach((input) => {
      const val = input.value;
      if (!valuesMap.has(val)) return;

      const isAvailable = valuesMap.get(val);
      const wrapper =
        input.closest(".form-control__check") ||
        input.closest(".form-control--checkbox-button") ||
        input.closest("label");

      if (!isAvailable && !input.disabled) {
        input.disabled = true;
        if (wrapper) {
          wrapper.classList.add(CONFIG.DISABLED_CLASS);
          wrapper.title = "Out of stock";
        }
        disabledCount++;
      } else if (isAvailable && input.disabled) {
        input.disabled = false;
        if (wrapper) {
          wrapper.classList.remove(CONFIG.DISABLED_CLASS);
          wrapper.removeAttribute("title");
        }
        enabledCount++;
      }
    });
  }

  if (disabledCount > 0 || enabledCount > 0) {
    log(`DOM updated: disabled=${disabledCount}, enabled=${enabledCount}`);
  }
}

function setupObserver() {
  if (observer) return; // Already observing

  const targetNode =
    document.querySelector(CONFIG.SELECTORS.PRODUCT_PAGE) || document.body;

  observer = new MutationObserver(() => {
    // Debounce to avoid rapid-fire updates
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      log("Observer triggered, re-applying DOM");
      applyStockToDom();
    }, CONFIG.DEBOUNCE_MS);
  });

  observer.observe(targetNode, { childList: true, subtree: true });
  log("Observer set up on", targetNode.className || "document.body");
}

async function handleProductPage(productId) {
  log(`Product page: ${productId}`);
  currentProductId = productId;

  // Step 2: Fetch
  if (!isStepEnabled("FETCH")) {
    logWarn("FETCH step disabled - stopping here");
    return;
  }

  const combinations = await fetchCombinations(productId);
  if (!combinations.length) {
    log("No combinations, nothing to do");
    return;
  }

  stockMap = buildAvailabilityMap(combinations);
  if (stockMap.size === 0) {
    log("Empty availability map");
    return;
  }

  // Step 3: Apply to DOM
  if (!isStepEnabled("DOM")) {
    logWarn("DOM step disabled - stopping here");
    return;
  }

  applyStockToDom();

  // Step 4: Observer
  if (!isStepEnabled("OBSERVER")) {
    logWarn("OBSERVER step disabled - stopping here");
    return;
  }

  setupObserver();
}

function handlePageLoad(page) {
  log("Page loaded", page);

  // Always cleanup first
  cleanup();

  if (page.type !== "PRODUCT") {
    log("Not a product page, idle");
    return;
  }

  handleProductPage(page.productId);
}

// ============ INITIALIZATION ============

function injectStyles() {
  const styleId = "popmerch-stock-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .${CONFIG.DISABLED_CLASS} {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .${CONFIG.DISABLED_CLASS} input {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
  log("Styles injected");
}

export function initStockManager() {
  log("=== Stock Manager V2 Debug ===");
  log("Debug flags:", {
    SM_DEBUG: isDebug(),
    SM_STEP_LISTEN: isStepEnabled("LISTEN"),
    SM_STEP_FETCH: isStepEnabled("FETCH"),
    SM_STEP_DOM: isStepEnabled("DOM"),
    SM_STEP_OBSERVER: isStepEnabled("OBSERVER"),
  });

  injectStyles();

  // Step 1: Listen to Ecwid
  if (!isStepEnabled("LISTEN")) {
    logWarn("LISTEN step disabled - Stock Manager inactive");
    return;
  }

  if (typeof Ecwid === "undefined") {
    logWarn("Ecwid not ready, retrying in 500ms...");
    setTimeout(initStockManager, 500);
    return;
  }

  Ecwid.OnPageLoaded.add(handlePageLoad);
  log("Listening to Ecwid.OnPageLoaded ✓");
}
