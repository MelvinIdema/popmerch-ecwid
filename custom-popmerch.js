(function() {
  "use strict";
  function initUrlLocalization() {
    function isDebug() {
      try {
        return localStorage.getItem("URL_DEBUG") === "true";
      } catch {
        return false;
      }
    }
    function isStepEnabled(step) {
      if (!isDebug()) return true;
      try {
        return localStorage.getItem(`URL_STEP_${step}`) !== "false";
      } catch {
        return true;
      }
    }
    function log(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#1976d2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.log(`%c[URLLocal]%c ${msg}`, style, "", data) : console.log(`%c[URLLocal]%c ${msg}`, style, "");
    }
    function logWarn(msg, data = null) {
      if (!isDebug()) return;
      const style = "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data ? console.warn(`%c[URLLocal]%c ${msg}`, style, "", data) : console.warn(`%c[URLLocal]%c ${msg}`, style, "");
    }
    const CONFIG = {
      // Regex to match locale at start of path: /de, /fr, /de/, /fr/
      localeRegex: /^\/([a-z]{2})(\/|$)/,
      // Links to ignore (protocols, anchors, files)
      ignoreRegex: /^(?:javascript:|mailto:|tel:|#|http|file:|\/.*\.([a-z0-9]{2,4})$)/i,
      // Domains to treat as internal (besides relative paths)
      internalDomains: [
        location.hostname,
        "popmerch.com",
        "webshop.popmerch.com"
      ]
    };
    log("=== URL Localization V3 (Production Ready) ===");
    log("Step Configuration (Default: Enabled):", {
      URL_DEBUG: isDebug(),
      URL_STEP_DETECT_LOCALE: isStepEnabled("DETECT_LOCALE"),
      URL_STEP_CLICK_HANDLER: isStepEnabled("CLICK_HANDLER")
    });
    function getCurrentLocale() {
      if (!isStepEnabled("DETECT_LOCALE")) {
        logWarn("DETECT_LOCALE step disabled");
        return null;
      }
      const pathname = window.location.pathname;
      log(`Detecting locale from pathname: ${pathname}`);
      const match = pathname.match(CONFIG.localeRegex);
      const locale = match ? match[1] : null;
      log(`Detected locale: ${locale || "(default)"}`);
      return locale;
    }
    function shouldLocalizeLink(link) {
      const href = link.getAttribute("href");
      if (!href) {
        log("Link has no href, skipping", link);
        return false;
      }
      log(`Analyzing link: ${href}`);
      const isInternal = link.hostname === window.location.hostname || CONFIG.internalDomains.includes(link.hostname) || !link.hostname;
      if (!isInternal) {
        log(`Link is external, skipping: ${href}`);
        return false;
      }
      if (CONFIG.ignoreRegex.test(href)) {
        log(`Link matches ignore pattern, skipping: ${href}`);
        return false;
      }
      const currentLocale = getCurrentLocale();
      if (!currentLocale) {
        log("No locale detected, won't localize");
        return false;
      }
      if (href.startsWith(`/${currentLocale}/`) || href === `/${currentLocale}`) {
        log(`Link already localized, skipping: ${href}`);
        return false;
      }
      log(`Link should be localized: ${href}`);
      return true;
    }
    function buildLocalizedUrl(originalHref, locale) {
      if (originalHref === "/" || originalHref === "") {
        return `/${locale}`;
      }
      const path = originalHref.startsWith("/") ? originalHref : `/${originalHref}`;
      return `/${locale}${path}`;
    }
    function handleLinkClick(event) {
      if (!isStepEnabled("CLICK_HANDLER")) {
        logWarn("CLICK_HANDLER step disabled");
        return;
      }
      const link = event.target.closest("a");
      if (!link) {
        log("Click not on anchor element");
        return;
      }
      if (link.dataset.noLocalize) {
        log("Link has data-no-localize attribute, skipping", link);
        return;
      }
      if (!shouldLocalizeLink(link)) {
        return;
      }
      const originalHref = link.getAttribute("href");
      const locale = getCurrentLocale();
      if (!locale) {
        log("No locale, allowing default behavior");
        return;
      }
      const localizedUrl = buildLocalizedUrl(originalHref, locale);
      log(`Intercepting click: ${originalHref} → ${localizedUrl}`);
      event.preventDefault();
      window.location.href = localizedUrl;
    }
    function setupClickHandler() {
      if (!isStepEnabled("CLICK_HANDLER")) {
        logWarn("CLICK_HANDLER step disabled");
        return;
      }
      if (!document.body) {
        logWarn("document.body not ready yet, retrying click handler setup");
        window.addEventListener("DOMContentLoaded", setupClickHandler, { once: true });
        return;
      }
      log("Setting up click handler on document.body...");
      document.body.addEventListener("click", handleLinkClick, true);
      log("Click handler active ✓");
    }
    log("Initializing URL Localization Module");
    setupClickHandler();
    log("URL Localization Module initialized ✓");
  }
  function initAddressValidation(config = {}) {
    const FIELD_SELECTORS = {
      country: ["#ec-country", 'select[name="country-list"]'],
      fullName: ["#ec-full-name", 'input[name="name"]'],
      phone: ["#ec-phone", 'input[name="phone"]'],
      company: ["#ec-organization-name", 'input[name="organization"]'],
      street: ["#ec-address-line1", 'input[name="address-line1"]'],
      city: ["#ec-city-list", 'input[name="city"]'],
      postalCode: ["#ec-postal-code", 'input[name="zip"]']
    };
    const CONFIG = {
      apiKey: config.apiKey || "",
      pollInterval: 50,
      pollTimeout: 1e4,
      debounceMs: 500,
      confidenceWarning: 0.4,
      confidenceClean: 0.75
    };
    const state = {
      onCheckoutAddressPage: false,
      listenersAttached: false,
      debounceTimer: null,
      validationToken: 0,
      uiState: "idle",
      pendingSuggestion: null,
      acceptedFingerprint: "",
      originalAddress: null,
      userDecided: false
    };
    function isDebug() {
      try {
        return localStorage.getItem("ADDR_DEBUG") === "true";
      } catch {
        return false;
      }
    }
    function isStepEnabled(step) {
      if (!isDebug()) return true;
      try {
        return localStorage.getItem(`ADDR_STEP_${step}`) !== "false";
      } catch {
        return true;
      }
    }
    function log(message, data = null) {
      if (!isDebug()) return;
      const style = "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      if (data != null) {
        console.log(`%c[AddrVal]%c ${message}`, style, "", data);
        return;
      }
      console.log(`%c[AddrVal]%c ${message}`, style, "");
    }
    function logError(message, error) {
      const style = "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      console.error(`%c[AddrVal]%c ${message}`, style, "", error);
    }
    const STRINGS = {
      nl: {
        validatingTitle: "Adres wordt gecontroleerd",
        validatingBody: "Een ogenblik geduld. We controleren of dit adres bezorgd kan worden.",
        warningTitle: "Adres controleren",
        warningBody: "Dit adres lijkt niet helemaal te kloppen. Controleer het adres of kies hieronder hoe je verder wilt gaan.",
        successTitle: "Adres gevalideerd",
        successBody: "Dit adres is gecontroleerd. Je kunt doorgaan naar de verzendmethodes.",
        useSuggested: "Gebruik dit adres",
        useOriginal: "Gebruik mijn adres toch",
        editAddress: "Adres aanpassen",
        suggestedAddress: "Voorgesteld adres"
      },
      en: {
        validatingTitle: "Validating address",
        validatingBody: "One moment please. We are checking whether this address can be delivered.",
        warningTitle: "Check your address",
        warningBody: "This address does not look quite right. Please review it or choose how you want to continue below.",
        successTitle: "Address validated",
        successBody: "This address has been checked. You can continue to shipping methods.",
        useSuggested: "Use this address",
        useOriginal: "Use my address anyway",
        editAddress: "Edit address",
        suggestedAddress: "Suggested address"
      },
      de: {
        validatingTitle: "Adresse wird geprueft",
        validatingBody: "Einen Moment bitte. Wir pruefen, ob an diese Adresse geliefert werden kann.",
        warningTitle: "Adresse pruefen",
        warningBody: "Diese Adresse sieht nicht ganz richtig aus. Bitte pruefe sie oder waehle unten, wie du fortfahren moechtest.",
        successTitle: "Adresse validiert",
        successBody: "Diese Adresse wurde geprueft. Du kannst mit den Versandarten fortfahren.",
        useSuggested: "Diese Adresse verwenden",
        useOriginal: "Meine Adresse trotzdem verwenden",
        editAddress: "Adresse bearbeiten",
        suggestedAddress: "Vorgeschlagene Adresse"
      }
    };
    function getStorefrontLang() {
      var _a, _b;
      const lang = ((_b = (_a = window.Ecwid) == null ? void 0 : _a.getStorefrontLang) == null ? void 0 : _b.call(_a)) || document.documentElement.lang || "nl";
      return String(lang).slice(0, 2).toLowerCase();
    }
    function t(key) {
      var _a;
      const lang = getStorefrontLang();
      return ((_a = STRINGS[lang]) == null ? void 0 : _a[key]) || STRINGS.nl[key] || key;
    }
    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async function waitForEcwid() {
      var _a, _b;
      const startedAt = Date.now();
      while (Date.now() - startedAt < CONFIG.pollTimeout) {
        if ((_b = (_a = window.Ecwid) == null ? void 0 : _a.OnPageLoaded) == null ? void 0 : _b.add) return;
        await wait(CONFIG.pollInterval);
      }
      throw new Error("Ecwid JS API did not initialize within timeout.");
    }
    function normalizeWhitespace(value) {
      return String(value || "").trim().replace(/\s+/g, " ");
    }
    function normalizeStreet(value) {
      let street = normalizeWhitespace(value);
      street = street.replace(/([A-Za-z])(\d)/g, "$1 $2");
      street = street.replace(/(\d+)\s+([A-Za-z])\s*$/, "$1$2");
      return street;
    }
    function normalizeAddress(address) {
      return {
        ...address,
        fullName: normalizeWhitespace(address.fullName),
        phone: normalizeWhitespace(address.phone),
        company: normalizeWhitespace(address.company),
        street: isStepEnabled("NORMALIZE") ? normalizeStreet(address.street) : normalizeWhitespace(address.street),
        city: normalizeWhitespace(address.city),
        postalCode: normalizeWhitespace(address.postalCode).toUpperCase(),
        countryName: normalizeWhitespace(address.countryName)
      };
    }
    function fingerprintAddress(address) {
      return [
        address.street,
        address.postalCode,
        address.city,
        address.countryName
      ].map((part) => normalizeWhitespace(part).toLowerCase()).join("|");
    }
    function queryFirst(selectors) {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    }
    function getFields() {
      return {
        country: queryFirst(FIELD_SELECTORS.country),
        fullName: queryFirst(FIELD_SELECTORS.fullName),
        phone: queryFirst(FIELD_SELECTORS.phone),
        company: queryFirst(FIELD_SELECTORS.company),
        street: queryFirst(FIELD_SELECTORS.street),
        city: queryFirst(FIELD_SELECTORS.city),
        postalCode: queryFirst(FIELD_SELECTORS.postalCode)
      };
    }
    function getCountryName(countryEl) {
      var _a, _b, _c, _d, _e;
      if (!countryEl) return "";
      if (countryEl instanceof HTMLSelectElement) {
        return ((_c = (_b = (_a = countryEl.selectedOptions) == null ? void 0 : _a[0]) == null ? void 0 : _b.text) == null ? void 0 : _c.trim()) || ((_d = countryEl.value) == null ? void 0 : _d.trim()) || "";
      }
      return ((_e = countryEl.value) == null ? void 0 : _e.trim()) || "";
    }
    function readAddressFromDom() {
      var _a, _b, _c;
      const fields = getFields();
      if (!fields.street || !fields.city || !fields.postalCode) return null;
      return {
        fullName: ((_a = fields.fullName) == null ? void 0 : _a.value) || "",
        phone: ((_b = fields.phone) == null ? void 0 : _b.value) || "",
        company: ((_c = fields.company) == null ? void 0 : _c.value) || "",
        street: fields.street.value || "",
        city: fields.city.value || "",
        postalCode: fields.postalCode.value || "",
        countryName: getCountryName(fields.country)
      };
    }
    function isAddressComplete(address) {
      return Boolean(
        normalizeWhitespace(address.street) && normalizeWhitespace(address.city) && normalizeWhitespace(address.postalCode) && normalizeWhitespace(address.countryName)
      );
    }
    function getContinueRow() {
      return document.querySelector(".ec-form__row--continue");
    }
    function getInlineBox() {
      return document.getElementById("pm-addr-inline-box");
    }
    function ensureInlineBox() {
      const existing = getInlineBox();
      if (existing) return existing;
      const continueRow = getContinueRow();
      if (!(continueRow == null ? void 0 : continueRow.parentNode)) return null;
      const box = document.createElement("div");
      box.id = "pm-addr-inline-box";
      continueRow.parentNode.insertBefore(box, continueRow);
      return box;
    }
    function getFormControl(el) {
      return (el == null ? void 0 : el.closest(".form-control")) || el;
    }
    function injectStyles() {
      if (document.getElementById("pm-addr-inline-styles")) return;
      const style = document.createElement("style");
      style.id = "pm-addr-inline-styles";
      style.textContent = `
      #pm-addr-inline-box {
        margin: 0 0 18px;
      }

      .pm-addr-card {
        border: 2px solid #111111;
        border-radius: 10px;
        background: #ffffff;
        padding: 16px 18px;
        color: #191919;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .pm-addr-card--warning {
        background: #fff8f1;
      }

      .pm-addr-card--success {
        background: #f4fbf5;
      }

      .pm-addr-card--loading {
        background: #f7f7f7;
      }

      .pm-addr-card__title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.3;
      }

      .pm-addr-card__body {
        margin: 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.5;
      }

      .pm-addr-card__suggestion {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 6px;
        background: #ffffff;
        border: 1px solid #d9d9d9;
      }

      .pm-addr-card__suggestion-label {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6b7280;
      }

      .pm-addr-card__suggestion-lines {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #191919;
      }

      .pm-addr-card__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
        align-items: center;
      }

      .pm-addr-card__button {
        appearance: none;
        border-radius: 4px;
        min-height: 48px;
        padding: 0 18px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
        font-family: inherit;
      }

      .pm-addr-card__button--primary {
        background: #191919;
        color: #ffffff;
        border: 1px solid #191919;
      }

      .pm-addr-card__button--ghost {
        background: #ffffff;
        color: #191919;
        border: 1px solid #191919;
      }

      .pm-addr-card__button--primary:hover {
        background: #000000;
        border-color: #000000;
      }

      .pm-addr-card__button--ghost:hover {
        background: #f5f5f5;
      }

      .pm-addr-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        vertical-align: -3px;
        border-radius: 999px;
        border: 2px solid #c8d2dc;
        border-top-color: #191919;
        animation: pm-addr-spin 0.8s linear infinite;
      }

      @keyframes pm-addr-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .pm-addr-valid .form-control__text,
      .pm-addr-valid.form-control__text,
      .pm-addr-valid .form-control__select,
      .pm-addr-valid.form-control__select {
        border-color: #4aa564 !important;
        box-shadow: 0 0 0 1px #4aa564 inset;
      }

      .pm-addr-disabled {
        opacity: 0.72;
      }
    `;
      document.head.appendChild(style);
    }
    function renderIdle() {
      const box = ensureInlineBox();
      if (box) box.innerHTML = "";
    }
    function renderValidating() {
      const box = ensureInlineBox();
      if (!box) return;
      box.innerHTML = `
      <div class="pm-addr-card pm-addr-card--loading">
        <div class="pm-addr-card__title"><span class="pm-addr-spinner"></span>${escapeHtml(
        t("validatingTitle")
      )}</div>
        <p class="pm-addr-card__body">${escapeHtml(t("validatingBody"))}</p>
      </div>
    `;
    }
    function renderWarning(address, suggestion) {
      const box = ensureInlineBox();
      if (!box) return;
      const suggestionHtml = suggestion ? `
        <div class="pm-addr-card__suggestion">
          <div class="pm-addr-card__suggestion-label">${escapeHtml(
        t("suggestedAddress")
      )}</div>
          <p class="pm-addr-card__suggestion-lines">
            ${escapeHtml(suggestion.street)}<br>
            ${escapeHtml(`${suggestion.postalCode} ${suggestion.city}`)}<br>
            ${escapeHtml(suggestion.countryName)}
          </p>
        </div>
      ` : "";
      box.innerHTML = `
      <div class="pm-addr-card pm-addr-card--warning">
        <div class="pm-addr-card__title">${escapeHtml(t("warningTitle"))}</div>
        <p class="pm-addr-card__body">${escapeHtml(t("warningBody"))}</p>
        ${suggestionHtml}
        <div class="pm-addr-card__actions">
          ${suggestion ? `<button type="button" class="pm-addr-card__button pm-addr-card__button--primary" style="${getInlineButtonStyle(
        "primary"
      )}" data-pm-addr-action="use-suggested">${escapeHtml(
        t("useSuggested")
      )}</button>` : ""}
          <button type="button" class="pm-addr-card__button pm-addr-card__button--ghost" style="${getInlineButtonStyle(
        "ghost"
      )}" data-pm-addr-action="use-original">${escapeHtml(
        t("useOriginal")
      )}</button>
          <button type="button" class="pm-addr-card__button pm-addr-card__button--ghost" style="${getInlineButtonStyle(
        "ghost"
      )}" data-pm-addr-action="edit">${escapeHtml(
        t("editAddress")
      )}</button>
        </div>
      </div>
    `;
    }
    function renderSuccess() {
      const box = ensureInlineBox();
      if (!box) return;
      box.innerHTML = `
      <div class="pm-addr-card pm-addr-card--success">
        <div class="pm-addr-card__title">${escapeHtml(t("successTitle"))}</div>
        <p class="pm-addr-card__body">${escapeHtml(t("successBody"))}</p>
      </div>
    `;
    }
    function escapeHtml(value) {
      return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }
    function getInlineButtonStyle(kind) {
      const base = [
        "appearance:none",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "min-height:48px",
        "padding:0 18px",
        "border-radius:0",
        "font:inherit",
        "font-weight:600",
        "line-height:normal",
        "text-decoration:none",
        "cursor:pointer",
        "box-sizing:border-box",
        "white-space:nowrap",
        "transition:none",
        "box-shadow:none"
      ];
      if (kind === "primary") {
        return [
          ...base,
          "background-color:#191919",
          "color:#ffffff",
          "border:1px solid #191919"
        ].join(";");
      }
      return [
        ...base,
        "background-color:#ffffff",
        "color:#191919",
        "border:1px solid #191919"
      ].join(";");
    }
    function setFieldDisabled(disabled) {
      const fields = getFields();
      Object.values(fields).forEach((field) => {
        var _a;
        if (!field) return;
        field.disabled = disabled;
        (_a = getFormControl(field)) == null ? void 0 : _a.classList.toggle("pm-addr-disabled", disabled);
      });
    }
    function setFieldValid(valid) {
      const fields = getFields();
      Object.values(fields).forEach((field) => {
        var _a;
        if (!field) return;
        (_a = getFormControl(field)) == null ? void 0 : _a.classList.toggle("pm-addr-valid", valid);
      });
    }
    function setUiState(nextState) {
      state.uiState = nextState;
      if (nextState === "idle") {
        setFieldDisabled(false);
        setFieldValid(false);
        renderIdle();
        return;
      }
      if (nextState === "validating") {
        setFieldDisabled(true);
        setFieldValid(false);
        renderValidating();
        return;
      }
      if (nextState === "warning") {
        setFieldDisabled(false);
        setFieldValid(false);
        renderWarning(state.originalAddress, state.pendingSuggestion);
        return;
      }
      if (nextState === "valid") {
        setFieldDisabled(false);
        setFieldValid(true);
        renderSuccess();
      }
    }
    function setInputValue(input, value) {
      if (!input) return;
      const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor == null ? void 0 : descriptor.set) {
        descriptor.set.call(input, value);
      } else {
        input.value = value;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function applySuggestionToDom(suggestion) {
      const fields = getFields();
      setInputValue(fields.street, suggestion.street);
      setInputValue(fields.postalCode, suggestion.postalCode);
      setInputValue(fields.city, suggestion.city);
      if (fields.country instanceof HTMLSelectElement) {
        const option = Array.from(fields.country.options).find((candidate) => {
          return normalizeWhitespace(candidate.text).toLowerCase() === normalizeWhitespace(suggestion.countryName).toLowerCase() || normalizeWhitespace(candidate.value).toLowerCase() === normalizeWhitespace(suggestion.countryName).toLowerCase();
        });
        if (option) {
          setInputValue(fields.country, option.value);
        }
      }
    }
    function getSuggestedAddress(geoapifyResult, originalAddress) {
      var _a, _b;
      const feature = (_a = geoapifyResult == null ? void 0 : geoapifyResult.features) == null ? void 0 : _a[0];
      if (!feature) return null;
      const props = feature.properties || {};
      const street = props.housenumber ? `${props.street || ""} ${props.housenumber}`.trim() : props.street || "";
      return {
        street: street || originalAddress.street,
        city: props.city || props.town || props.village || props.municipality || originalAddress.city,
        postalCode: props.postcode || originalAddress.postalCode,
        countryName: props.country || originalAddress.countryName,
        confidence: ((_b = props.rank) == null ? void 0 : _b.confidence) ?? 0
      };
    }
    function hasMeaningfulDifference(left, right) {
      const keys = ["street", "city", "postalCode", "countryName"];
      return keys.some((key) => {
        return normalizeWhitespace(left[key]).toLowerCase() !== normalizeWhitespace(right[key]).toLowerCase();
      });
    }
    async function validateWithGeoapify(address) {
      if (!CONFIG.apiKey || !isStepEnabled("GEOAPIFY")) {
        return null;
      }
      const params = new URLSearchParams({
        text: [
          address.street,
          address.postalCode,
          address.city,
          address.countryName
        ].filter(Boolean).join(", "),
        limit: "1",
        apiKey: CONFIG.apiKey
      });
      log("Calling Geoapify", {
        text: params.get("text"),
        url: `https://api.geoapify.com/v1/geocode/search?${params}`
      });
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?${params}`
      );
      if (!response.ok) {
        throw new Error(`Geoapify HTTP ${response.status}`);
      }
      return response.json();
    }
    async function runValidationNow() {
      const rawAddress = readAddressFromDom();
      if (!rawAddress || !isAddressComplete(rawAddress)) {
        state.acceptedFingerprint = "";
        state.pendingSuggestion = null;
        state.originalAddress = null;
        setUiState("idle");
        return false;
      }
      const normalizedAddress = normalizeAddress(rawAddress);
      const fingerprint = fingerprintAddress(normalizedAddress);
      if (state.acceptedFingerprint && state.acceptedFingerprint === fingerprint) {
        setUiState("valid");
        return true;
      }
      const token = ++state.validationToken;
      state.originalAddress = normalizedAddress;
      state.pendingSuggestion = null;
      setUiState("validating");
      try {
        const geoapifyResult = await validateWithGeoapify(normalizedAddress);
        if (token !== state.validationToken) return false;
        if (!geoapifyResult) {
          state.acceptedFingerprint = fingerprint;
          setUiState("valid");
          return true;
        }
        const suggestion = getSuggestedAddress(geoapifyResult, normalizedAddress);
        const confidence = (suggestion == null ? void 0 : suggestion.confidence) ?? 0;
        const hasSuggestion = suggestion && hasMeaningfulDifference(normalizedAddress, suggestion);
        log("Validation result", {
          address: normalizedAddress,
          confidence,
          suggestion
        });
        if (confidence >= CONFIG.confidenceClean) {
          const acceptedAddress = hasSuggestion ? normalizeAddress({
            ...normalizedAddress,
            ...suggestion
          }) : normalizedAddress;
          if (hasSuggestion) {
            applySuggestionToDom(acceptedAddress);
          }
          state.originalAddress = acceptedAddress;
          state.acceptedFingerprint = fingerprintAddress(acceptedAddress);
          state.pendingSuggestion = null;
          setUiState("valid");
          return true;
        }
        if (hasSuggestion) {
          state.pendingSuggestion = suggestion;
          setUiState("warning");
          return false;
        }
        if (confidence < CONFIG.confidenceClean) {
          state.pendingSuggestion = null;
          setUiState("warning");
          return false;
        }
        state.acceptedFingerprint = fingerprint;
        setUiState("valid");
        return true;
      } catch (error) {
        if (token !== state.validationToken) return false;
        logError("Address validation failed", error);
        state.acceptedFingerprint = "";
        state.pendingSuggestion = null;
        setUiState("warning");
        return false;
      }
    }
    function scheduleValidation() {
      if (!state.onCheckoutAddressPage) return;
      if (state.userDecided) return;
      clearTimeout(state.debounceTimer);
      state.acceptedFingerprint = "";
      state.pendingSuggestion = null;
      setUiState("idle");
      state.debounceTimer = setTimeout(() => {
        runValidationNow().catch((error) => {
          logError("Debounced validation failed", error);
        });
      }, CONFIG.debounceMs);
    }
    function onDocumentInput(event) {
      if (!state.onCheckoutAddressPage) return;
      if (!event.isTrusted) return;
      if (!(event.target instanceof Element)) return;
      const watched = Object.values(FIELD_SELECTORS).some(
        (selectors) => selectors.some((selector) => event.target.matches(selector))
      );
      if (!watched) return;
      state.userDecided = false;
      scheduleValidation();
    }
    function onDocumentChange(event) {
      onDocumentInput(event);
    }
    function onInlineActionClick(event) {
      var _a, _b, _c;
      const action = (_b = (_a = event.target) == null ? void 0 : _a.closest) == null ? void 0 : _b.call(_a, "[data-pm-addr-action]");
      if (!action) return;
      const actionName = action.getAttribute("data-pm-addr-action");
      if (actionName === "use-suggested" && state.pendingSuggestion) {
        state.userDecided = true;
        applySuggestionToDom(state.pendingSuggestion);
        state.acceptedFingerprint = fingerprintAddress(
          normalizeAddress({
            ...state.originalAddress,
            ...state.pendingSuggestion
          })
        );
        state.pendingSuggestion = null;
        setUiState("valid");
        return;
      }
      if (actionName === "use-original" && state.originalAddress) {
        state.userDecided = true;
        state.acceptedFingerprint = fingerprintAddress(state.originalAddress);
        state.pendingSuggestion = null;
        setUiState("valid");
        return;
      }
      if (actionName === "edit") {
        state.userDecided = true;
        state.acceptedFingerprint = "";
        state.pendingSuggestion = null;
        setUiState("idle");
        (_c = getFields().street) == null ? void 0 : _c.focus();
      }
    }
    function onPageLoaded(page) {
      log("Ecwid page loaded", { type: page == null ? void 0 : page.type });
      const isCheckoutAddressPage = (page == null ? void 0 : page.type) === "CHECKOUT_ADDRESS" || (page == null ? void 0 : page.type) === "CHECKOUT";
      state.onCheckoutAddressPage = isCheckoutAddressPage;
      if (!isCheckoutAddressPage) {
        clearTimeout(state.debounceTimer);
        state.acceptedFingerprint = "";
        state.pendingSuggestion = null;
        state.originalAddress = null;
        state.userDecided = false;
        setUiState("idle");
        return;
      }
      injectStyles();
      ensureInlineBox();
      const previousFingerprint = state.acceptedFingerprint;
      state.acceptedFingerprint = "";
      state.pendingSuggestion = null;
      state.originalAddress = null;
      setUiState("idle");
      const currentAddress = readAddressFromDom();
      if (previousFingerprint && currentAddress && isAddressComplete(currentAddress) && fingerprintAddress(normalizeAddress(currentAddress)) === previousFingerprint) {
        state.acceptedFingerprint = previousFingerprint;
        setUiState("valid");
        return;
      }
      if (!state.userDecided && currentAddress && isAddressComplete(currentAddress)) {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
          runValidationNow().catch((error) => {
            logError("Initial validation failed", error);
          });
        }, 150);
      }
    }
    function ensureListeners() {
      if (state.listenersAttached) return;
      document.addEventListener("input", onDocumentInput, true);
      document.addEventListener("change", onDocumentChange, true);
      document.addEventListener("click", onInlineActionClick, true);
      state.listenersAttached = true;
      log("Checkout address listeners attached");
    }
    log("=== Address Validation V3: Inline checkout ===");
    log("Config", {
      apiKey: CONFIG.apiKey ? "***set***" : "(not set)",
      ADDR_DEBUG: isDebug(),
      ADDR_STEP_NORMALIZE: isStepEnabled("NORMALIZE"),
      ADDR_STEP_GEOAPIFY: isStepEnabled("GEOAPIFY")
    });
    (async () => {
      try {
        await waitForEcwid();
        ensureListeners();
        window.Ecwid.OnPageLoaded.add(onPageLoaded);
        log("Inline checkout address module initialized");
      } catch (error) {
        logError("Failed to initialize inline checkout address module", error);
      }
    })();
  }
  function initMobileFilterTileStacking() {
    const FILTER_SELECTOR = ".ec-filters.ec-filters--popup.ec-filters--left";
    const TILE_SELECTOR = "#tile-product-details";
    const OPEN_CLASS = "ec-filters--opened";
    const OPEN_ANIMATION_CLASS = "ec-filters--animation-opened";
    const MOBILE_BREAKPOINT = 768;
    const OPEN_Z_INDEX = "9999";
    const CLOSED_Z_INDEX = "3";
    let observer = null;
    let scheduledSync = false;
    function isMobileViewport() {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    function getFilterElement() {
      return document.querySelector(FILTER_SELECTOR);
    }
    function getTileElement() {
      return document.querySelector(TILE_SELECTOR);
    }
    function isFilterOpen(filterElement) {
      if (!filterElement) {
        return false;
      }
      return filterElement.classList.contains(OPEN_CLASS) || filterElement.classList.contains(OPEN_ANIMATION_CLASS);
    }
    function syncTileZIndex() {
      scheduledSync = false;
      const tileElement = getTileElement();
      if (!tileElement) {
        return;
      }
      const filterElement = getFilterElement();
      const nextZIndex = isMobileViewport() && isFilterOpen(filterElement) ? OPEN_Z_INDEX : CLOSED_Z_INDEX;
      if (tileElement.style.zIndex !== nextZIndex) {
        tileElement.style.zIndex = nextZIndex;
      }
    }
    function scheduleSync() {
      if (scheduledSync) {
        return;
      }
      scheduledSync = true;
      window.requestAnimationFrame(syncTileZIndex);
    }
    function startObserver() {
      if (!document.body || observer) {
        return;
      }
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.attributeName !== "class") {
            continue;
          }
          scheduleSync();
          return;
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true
      });
    }
    if (!document.body) {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          startObserver();
          syncTileZIndex();
        },
        { once: true }
      );
      return;
    }
    startObserver();
    syncTileZIndex();
    window.addEventListener("resize", scheduleSync, { passive: true });
  }
  function initCurrencySwitcher(config = {}) {
    var _a, _b;
    const BASE_CURRENCY = config.baseCurrency || "EUR";
    const CACHE_KEY = "popmerch_fx_rates";
    const CACHE_TTL = 12 * 60 * 60 * 1e3;
    const PREF_KEY = "popmerch_currency";
    const INLINE_ID = "pm-currency-switcher";
    const STYLES_ID = "pm-currency-styles";
    const POLL_INTERVAL = 50;
    const POLL_MAX_ATTEMPTS = 80;
    const CURRENCIES = {
      EUR: { name: "Euro", symbol: "€" },
      USD: { name: "US Dollar", symbol: "$" },
      GBP: { name: "British Pound", symbol: "£" },
      CHF: { name: "Swiss Franc", symbol: "Fr." },
      SEK: { name: "Swedish Krona", symbol: "kr" },
      NOK: { name: "Norwegian Krone", symbol: "kr" },
      DKK: { name: "Danish Krone", symbol: "kr" },
      PLN: { name: "Polish Złoty", symbol: "zł" },
      CZK: { name: "Czech Koruna", symbol: "Kč" },
      HUF: { name: "Hungarian Forint", symbol: "Ft" },
      JPY: { name: "Japanese Yen", symbol: "¥" },
      CAD: { name: "Canadian Dollar", symbol: "C$" },
      AUD: { name: "Australian Dollar", symbol: "A$" }
    };
    const LOCALE_CURRENCY_MAP = {
      "nl": "EUR",
      "de": "EUR",
      "fr": "EUR",
      "es": "EUR",
      "it": "EUR",
      "pt": "EUR",
      "fi": "EUR",
      "el": "EUR",
      "en-GB": "GBP",
      "en-IE": "EUR",
      "en-US": "USD",
      "en-CA": "CAD",
      "en-AU": "AUD",
      "sv": "SEK",
      "no": "NOK",
      "nb": "NOK",
      "nn": "NOK",
      "da": "DKK",
      "pl": "PLN",
      "cs": "CZK",
      "hu": "HUF",
      "ja": "JPY",
      "fr-CH": "CHF",
      "de-CH": "CHF",
      "it-CH": "CHF"
    };
    const ZERO_DECIMAL = /* @__PURE__ */ new Set(["JPY", "HUF"]);
    let cachedRates = null;
    let currentBarSelect = null;
    let inlineSyncFn = null;
    const syncListeners = /* @__PURE__ */ new Set();
    function log(msg, data = null) {
      if (localStorage.getItem("CURRENCY_DEBUG") !== "true") return;
      const s = "background:#7b1fa2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      data != null ? console.log(`%c[Currency]%c ${msg}`, s, "", data) : console.log(`%c[Currency]%c ${msg}`, s, "");
    }
    function detectBrowserCurrency() {
      const lang = navigator.language || "en";
      if (LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];
      return LOCALE_CURRENCY_MAP[lang.split("-")[0]] || BASE_CURRENCY;
    }
    function getSelectedCurrency() {
      try {
        const saved = localStorage.getItem(PREF_KEY);
        if (saved && CURRENCIES[saved]) return saved;
      } catch {
      }
      return detectBrowserCurrency();
    }
    function saveSelectedCurrency(currency) {
      try {
        localStorage.setItem(PREF_KEY, currency);
      } catch {
      }
    }
    function getCachedRates() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { rates, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) return rates;
      } catch {
      }
      return null;
    }
    function setCachedRates(rates) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
      } catch {
      }
    }
    async function fetchRates() {
      const cached = getCachedRates();
      if (cached) {
        log("Using cached rates");
        return cached;
      }
      log("Fetching rates…");
      try {
        const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { rates } = await res.json();
        const all = { ...rates, [BASE_CURRENCY]: 1 };
        setCachedRates(all);
        return all;
      } catch {
        try {
          const key = BASE_CURRENCY.toLowerCase();
          const res = await fetch(
            `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const all = { [BASE_CURRENCY]: 1 };
          for (const [c, r] of Object.entries(data[key] || {})) all[c.toUpperCase()] = r;
          setCachedRates(all);
          return all;
        } catch (err) {
          console.error("[Currency] Both rate sources failed", err);
          return null;
        }
      }
    }
    function formatPrice(amount, currency) {
      var _a2;
      try {
        return new Intl.NumberFormat(navigator.language || "en", {
          style: "currency",
          currency,
          minimumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
          maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2
        }).format(amount);
      } catch {
        return `${((_a2 = CURRENCIES[currency]) == null ? void 0 : _a2.symbol) ?? currency} ${amount.toFixed(ZERO_DECIMAL.has(currency) ? 0 : 2)}`;
      }
    }
    function setPriceText(el, text) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => /\d/.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      });
      const node = walker.nextNode();
      if (node) {
        node.textContent = text;
      } else {
        el.textContent = text;
      }
    }
    function convertAllPrices(currency, rates) {
      const els = document.querySelectorAll("[itemprop='price'][content]");
      log(`Converting ${els.length} price(s) → ${currency}`);
      for (const el of els) {
        const base = parseFloat(el.getAttribute("content"));
        if (!base || base <= 0) continue;
        const rate = rates[currency];
        if (rate == null) continue;
        setPriceText(el, formatPrice(base * rate, currency));
      }
    }
    function watchForNewPrices() {
      const observer = new MutationObserver((mutations) => {
        if (!cachedRates) return;
        const currency = getSelectedCurrency();
        if (currency === BASE_CURRENCY) return;
        const rate = cachedRates[currency];
        if (rate == null) return;
        for (const { addedNodes } of mutations) {
          for (const node of addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const candidates = node.matches("[itemprop='price'][content]") ? [node] : [...node.querySelectorAll("[itemprop='price'][content]")];
            for (const el of candidates) {
              const base = parseFloat(el.getAttribute("content"));
              if (base > 0) setPriceText(el, formatPrice(base * rate, currency));
            }
          }
        }
      });
      const attach = () => observer.observe(document.body, { childList: true, subtree: true });
      document.body ? attach() : document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
    function onCurrencyChange(currency, sourceFn) {
      saveSelectedCurrency(currency);
      for (const fn of syncListeners) {
        if (fn !== sourceFn) fn(currency);
      }
      if (cachedRates) convertAllPrices(currency, cachedRates);
    }
    function injectStyles() {
      if (document.getElementById(STYLES_ID)) return;
      const style = document.createElement("style");
      style.id = STYLES_ID;
      style.textContent = `
      /* ── Inline product-page switcher ── */
      #pm-currency-switcher {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-family: inherit;
        flex-wrap: wrap;
      }
      #pm-currency-switcher .pm-currency__label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #888;
      }
      .pm-currency__select-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .pm-currency__select {
        appearance: none;
        -webkit-appearance: none;
        background: #f5f5f5;
        border: 1.5px solid #e0e0e0;
        border-radius: 6px;
        padding: 5px 30px 5px 10px;
        font-size: 13px;
        font-weight: 500;
        color: #222;
        cursor: pointer;
        outline: none;
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit;
        line-height: 1.4;
      }
      .pm-currency__select:hover { background: #efefef; border-color: #bbb; }
      .pm-currency__select:focus { border-color: #555; background: #fff; }
      .pm-currency__arrow {
        position: absolute;
        right: 9px;
        pointer-events: none;
        color: #888;
        font-size: 9px;
        line-height: 1;
      }

      /* ── Announcement bar selector ── */
      .announcement-bar__currency .pm-currency__bar-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .announcement-bar__currency .pm-currency__bar-select {
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.6);
        padding: 0 14px 0 0;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        color: inherit;
        cursor: pointer;
        outline: none;
        line-height: inherit;
      }
      .announcement-bar__currency .pm-currency__bar-select option {
        color: #222;
        background: #fff;
      }
      .announcement-bar__currency .pm-currency__bar-arrow {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 8px;
        opacity: 0.8;
      }
    `;
      document.head.appendChild(style);
    }
    function buildSelectOptions(select, selectedCurrency) {
      select.innerHTML = "";
      for (const [code, { name }] of Object.entries(CURRENCIES)) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} — ${name}`;
        if (code === selectedCurrency) opt.selected = true;
        select.appendChild(opt);
      }
    }
    function hookVueUpdated(el, callback) {
      var _a2;
      for (const node of [el, el.parentElement, (_a2 = el.parentElement) == null ? void 0 : _a2.parentElement]) {
        if (!node) continue;
        const inst3 = node.__vueParentComponent ?? node._vueParentComponent;
        if (inst3) {
          if (!Array.isArray(inst3.u)) inst3.u = [];
          inst3.u.push(callback);
          log("Hooked into Vue 3 onUpdated");
          return true;
        }
        const inst2 = node.__vue__;
        if (inst2 == null ? void 0 : inst2.$on) {
          inst2.$on("hook:updated", callback);
          log("Hooked into Vue 2 $on hook:updated");
          return true;
        }
      }
      return false;
    }
    function mountBarSwitcher() {
      const barSyncFn = (currency) => {
        if (currentBarSelect) currentBarSelect.value = currency;
      };
      syncListeners.add(barSyncFn);
      function doBarInject(currencyEl) {
        if (currencyEl.querySelector(".pm-currency__bar-wrap")) return;
        injectStyles();
        currencyEl.textContent = "";
        const wrap = document.createElement("span");
        wrap.className = "pm-currency__bar-wrap";
        const select = document.createElement("select");
        select.className = "pm-currency__bar-select";
        select.setAttribute("aria-label", "Select display currency");
        buildSelectOptions(select, getSelectedCurrency());
        currentBarSelect = select;
        const arrow = document.createElement("span");
        arrow.className = "pm-currency__bar-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "▼";
        wrap.appendChild(select);
        wrap.appendChild(arrow);
        currencyEl.appendChild(wrap);
        select.addEventListener("change", () => onCurrencyChange(select.value, barSyncFn));
        log("Bar switcher injected");
      }
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const currencyEl = document.querySelector(".announcement-bar__currency");
        if (currencyEl) {
          clearInterval(poll);
          doBarInject(currencyEl);
          const hooked = hookVueUpdated(currencyEl, () => doBarInject(currencyEl));
          if (!hooked) {
            log("Vue not accessible — falling back to targeted MutationObserver");
            const obs = new MutationObserver(() => doBarInject(currencyEl));
            obs.observe(currencyEl.parentElement ?? currencyEl, { childList: true });
          }
          return;
        }
        if (attempts >= 60) {
          clearInterval(poll);
          log("Announcement bar not found after polling");
        }
      }, POLL_INTERVAL);
    }
    function mountInlineSwitcher(insertBeforeEl) {
      if (document.getElementById(INLINE_ID)) return;
      injectStyles();
      const wrapper = document.createElement("div");
      wrapper.id = INLINE_ID;
      const label = document.createElement("span");
      label.className = "pm-currency__label";
      label.textContent = "Currency";
      const selectWrap = document.createElement("div");
      selectWrap.className = "pm-currency__select-wrap";
      const select = document.createElement("select");
      select.className = "pm-currency__select";
      select.setAttribute("aria-label", "Select display currency");
      buildSelectOptions(select, getSelectedCurrency());
      const arrow = document.createElement("span");
      arrow.className = "pm-currency__arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "▼";
      selectWrap.appendChild(select);
      selectWrap.appendChild(arrow);
      wrapper.appendChild(label);
      wrapper.appendChild(selectWrap);
      insertBeforeEl.parentNode.insertBefore(wrapper, insertBeforeEl);
      const syncFn = (currency) => {
        select.value = currency;
      };
      inlineSyncFn = syncFn;
      syncListeners.add(syncFn);
      select.addEventListener("change", () => onCurrencyChange(select.value, syncFn));
      log("Inline switcher mounted");
    }
    function handleProductPage() {
      var _a2;
      (_a2 = document.getElementById(INLINE_ID)) == null ? void 0 : _a2.remove();
      if (inlineSyncFn) {
        syncListeners.delete(inlineSyncFn);
        inlineSyncFn = null;
      }
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const priceRow = document.querySelector(".product-details__product-price-row");
        if (priceRow) {
          clearInterval(poll);
          mountInlineSwitcher(priceRow);
          if (cachedRates) convertAllPrices(getSelectedCurrency(), cachedRates);
          return;
        }
        if (attempts >= POLL_MAX_ATTEMPTS) {
          clearInterval(poll);
          log("Price row not found after polling");
        }
      }, POLL_INTERVAL);
    }
    mountBarSwitcher();
    watchForNewPrices();
    fetchRates().then((rates) => {
      if (!rates) return;
      cachedRates = rates;
      convertAllPrices(getSelectedCurrency(), rates);
    });
    (_b = (_a = window.Ecwid) == null ? void 0 : _a.OnPageLoaded) == null ? void 0 : _b.add((page) => {
      log("OnPageLoaded", page.type);
      if (page.type === "PRODUCT") {
        handleProductPage();
      } else if (cachedRates) {
        setTimeout(() => convertAllPrices(getSelectedCurrency(), cachedRates), 150);
      }
    });
    log("Currency switcher initialised");
  }
  const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
  const BUNDLE_VERSION = "2026-03-21-inline-checkout-5";
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
  {
    safeInit("address validation", () => {
      initAddressValidation({ apiKey: GEOAPIFY_API_KEY });
    });
  }
  safeInit("mobile filter tile stacking", () => {
    initMobileFilterTileStacking();
  });
  {
    safeInit("currency switcher", () => {
      initCurrencySwitcher();
    });
  }
})();
