import { initUrlLocalization } from "./url-localization.js";
import { initAddressValidation } from "./address-validation.js";

// Replace with your Geoapify API key (https://myprojects.geoapify.com)
const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
const BUNDLE_VERSION = "2026-03-20-address-debug-1";
const ENABLE_ADDRESS_VALIDATION = false;

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
