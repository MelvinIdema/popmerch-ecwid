import { initUrlLocalization } from "./url-localization.js";
import { initAddressValidation } from "./address-validation.js";

// Replace with your Geoapify API key (https://myprojects.geoapify.com)
const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";

initUrlLocalization();
initAddressValidation({ apiKey: GEOAPIFY_API_KEY });
