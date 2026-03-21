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
      originalAddress: null
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
    function logWarn(message, data = null) {
      if (!isDebug()) return;
      const style = "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
      if (data != null) {
        console.warn(`%c[AddrVal]%c ${message}`, style, "", data);
        return;
      }
      console.warn(`%c[AddrVal]%c ${message}`, style, "");
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
        continueBlocked: "Controleer eerst het adres voordat je doorgaat.",
        suggestedAddress: "Voorgesteld adres",
        continueLabel: "Doorgaan"
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
        continueBlocked: "Please resolve the address before continuing.",
        suggestedAddress: "Suggested address",
        continueLabel: "Continue"
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
        continueBlocked: "Bitte loese zuerst das Adressproblem.",
        suggestedAddress: "Vorgeschlagene Adresse",
        continueLabel: "Weiter"
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
    function getContinueButton() {
      return document.querySelector(
        ".ec-form__row--continue .form-control__button, .ec-form__row--continue button"
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
        border: 1px solid #d7dde3;
        border-radius: 8px;
        background: #f8fafc;
        padding: 16px 18px;
        color: #191919;
      }

      .pm-addr-card--warning {
        background: #fff7ed;
        border-color: #f2c48d;
      }

      .pm-addr-card--success {
        background: #edf9f0;
        border-color: #8bc89a;
      }

      .pm-addr-card--loading {
        background: #f5f7fa;
        border-color: #d7dde3;
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
        background: rgba(255, 255, 255, 0.75);
        border: 1px solid rgba(0, 0, 0, 0.06);
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
      }

      .pm-addr-card__button {
        appearance: none;
        border: none;
        border-radius: 6px;
        min-height: 40px;
        padding: 0 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      .pm-addr-card__button--primary {
        background: #191919;
        color: #ffffff;
      }

      .pm-addr-card__button--ghost {
        background: #ffffff;
        color: #191919;
        border: 1px solid #d1d5db;
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
          ${suggestion ? `<button type="button" class="pm-addr-card__button pm-addr-card__button--primary" data-pm-addr-action="use-suggested">${escapeHtml(
        t("useSuggested")
      )}</button>` : ""}
          <button type="button" class="pm-addr-card__button pm-addr-card__button--ghost" data-pm-addr-action="use-original">${escapeHtml(
        t("useOriginal")
      )}</button>
          <button type="button" class="pm-addr-card__button pm-addr-card__button--ghost" data-pm-addr-action="edit">${escapeHtml(
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
    function setContinueEnabled(enabled) {
      const button = getContinueButton();
      if (!button) return;
      button.disabled = !enabled;
      button.setAttribute("aria-disabled", String(!enabled));
      button.style.opacity = enabled ? "" : "0.65";
      button.style.cursor = enabled ? "" : "not-allowed";
    }
    function setUiState(nextState) {
      state.uiState = nextState;
      if (nextState === "idle") {
        setFieldDisabled(false);
        setFieldValid(false);
        setContinueEnabled(false);
        renderIdle();
        return;
      }
      if (nextState === "validating") {
        setFieldDisabled(true);
        setFieldValid(false);
        setContinueEnabled(false);
        renderValidating();
        return;
      }
      if (nextState === "warning") {
        setFieldDisabled(false);
        setFieldValid(false);
        setContinueEnabled(false);
        renderWarning(state.originalAddress, state.pendingSuggestion);
        return;
      }
      if (nextState === "valid") {
        setFieldDisabled(false);
        setFieldValid(true);
        setContinueEnabled(true);
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
        if (confidence >= CONFIG.confidenceClean && !hasSuggestion) {
          state.acceptedFingerprint = fingerprint;
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
      if (!(event.target instanceof Element)) return;
      const watched = Object.values(FIELD_SELECTORS).some(
        (selectors) => selectors.some((selector) => event.target.matches(selector))
      );
      if (!watched) return;
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
        state.acceptedFingerprint = fingerprintAddress(state.originalAddress);
        state.pendingSuggestion = null;
        setUiState("valid");
        return;
      }
      if (actionName === "edit") {
        state.acceptedFingerprint = "";
        state.pendingSuggestion = null;
        setUiState("idle");
        (_c = getFields().street) == null ? void 0 : _c.focus();
      }
    }
    function onContinueClickCapture(event) {
      if (!state.onCheckoutAddressPage) return;
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(
        ".ec-form__row--continue .form-control__button, .ec-form__row--continue button"
      );
      if (!button) return;
      if (state.uiState === "valid") return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      const box = ensureInlineBox();
      if (box && !box.innerHTML) {
        scheduleValidation();
      } else if (state.uiState === "idle") {
        runValidationNow().catch((error) => {
          logError("Continue-click validation failed", error);
        });
      }
      logWarn(t("continueBlocked"), { uiState: state.uiState });
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
        setUiState("idle");
        return;
      }
      injectStyles();
      ensureInlineBox();
      state.acceptedFingerprint = "";
      state.pendingSuggestion = null;
      state.originalAddress = null;
      setUiState("idle");
      const currentAddress = readAddressFromDom();
      if (currentAddress && isAddressComplete(currentAddress)) {
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
      document.addEventListener("click", onContinueClickCapture, true);
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
  const GEOAPIFY_API_KEY = "c70aedc3c26e44238b962936e3757ec4";
  const BUNDLE_VERSION = "2026-03-21-inline-checkout-2";
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
})();
