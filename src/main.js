import { initUrlLocalization } from "./url-localization.js";
import { initAddressValidation } from "./address-validation.js";
import { initMobileFilterTileStacking } from "./mobile-filter-tile-stacking.js";
import { initCurrencySwitcher } from "./currency-switcher.js";

// Replace with your Geoapify API key (https://myprojects.geoapify.com)
const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
const BUNDLE_VERSION = "2026-03-21-inline-checkout-5";
const ENABLE_ADDRESS_VALIDATION = true;
const ENABLE_CURRENCY_SWITCHER = localStorage.getItem("ENABLE_CURRENCY_SWITCHER") === "true" || false;

function safeInit(name, init) {
  try {
    init();
  } catch (err) {
    console.error(`[Popmerch] Failed to initialize ${name}`, err);
  }
}

window.POPMERCH_BUNDLE_VERSION = BUNDLE_VERSION;
console.info(`[Popmerch] Bundle ${BUNDLE_VERSION} loaded`);

safeInit("URL localization", () => {
  initUrlLocalization();
});

if (ENABLE_ADDRESS_VALIDATION) {
  safeInit("address validation", () => {
    initAddressValidation({ apiKey: GEOAPIFY_API_KEY });
  });
} else {
  console.info("[Popmerch] Address validation disabled in this build");
}

safeInit("mobile filter tile stacking", () => {
  initMobileFilterTileStacking();
});

if (ENABLE_CURRENCY_SWITCHER) {
  safeInit("currency switcher", () => {
    initCurrencySwitcher();
  });
} else {
  console.info("[Popmerch] Currency switcher disabled in this build");
}
