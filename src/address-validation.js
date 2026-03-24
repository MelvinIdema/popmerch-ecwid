export function initAddressValidation(config = {}) {
  const FIELD_SELECTORS = {
    country: ["#ec-country", 'select[name="country-list"]'],
    fullName: ["#ec-full-name", 'input[name="name"]'],
    phone: ["#ec-phone", 'input[name="phone"]'],
    company: ["#ec-organization-name", 'input[name="organization"]'],
    street: ["#ec-address-line1", 'input[name="address-line1"]'],
    city: ["#ec-city-list", 'input[name="city"]'],
    postalCode: ["#ec-postal-code", 'input[name="zip"]'],
  };

  const CONFIG = {
    apiKey: config.apiKey || "",
    pollInterval: 50,
    pollTimeout: 10_000,
    debounceMs: 1500,
    confidenceWarning: 0.4,
    confidenceClean: 0.85,
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
    userDecided: false,
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
    const style =
      "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    if (data != null) {
      console.log(`%c[AddrVal]%c ${message}`, style, "", data);
      return;
    }
    console.log(`%c[AddrVal]%c ${message}`, style, "");
  }

  function logWarn(message, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    if (data != null) {
      console.warn(`%c[AddrVal]%c ${message}`, style, "", data);
      return;
    }
    console.warn(`%c[AddrVal]%c ${message}`, style, "");
  }

  function logError(message, error) {
    const style =
      "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    console.error(`%c[AddrVal]%c ${message}`, style, "", error);
  }

  const STRINGS = {
    nl: {
      validatingTitle: "Adres wordt gecontroleerd",
      validatingBody:
        "Een ogenblik geduld. We controleren of dit adres bezorgd kan worden.",
      warningTitle: "Adres controleren",
      warningBody:
        "Dit adres lijkt niet helemaal te kloppen. Controleer het adres of kies hieronder hoe je verder wilt gaan.",
      successTitle: "Adres gevalideerd",
      successBody:
        "Dit adres is gecontroleerd. Je kunt doorgaan naar de verzendmethodes.",
      useSuggested: "Gebruik dit adres",
      useOriginal: "Gebruik mijn adres toch",
      suggestedAddress: "Voorgesteld adres",
    },
    en: {
      validatingTitle: "Validating address",
      validatingBody:
        "One moment please. We are checking whether this address can be delivered.",
      warningTitle: "Check your address",
      warningBody:
        "This address does not look quite right. Please review it or choose how you want to continue below.",
      successTitle: "Address validated",
      successBody:
        "This address has been checked. You can continue to shipping methods.",
      useSuggested: "Use this address",
      useOriginal: "Use my address anyway",
      suggestedAddress: "Suggested address",
    },
    de: {
      validatingTitle: "Adresse wird geprueft",
      validatingBody:
        "Einen Moment bitte. Wir pruefen, ob an diese Adresse geliefert werden kann.",
      warningTitle: "Adresse pruefen",
      warningBody:
        "Diese Adresse sieht nicht ganz richtig aus. Bitte pruefe sie oder waehle unten, wie du fortfahren moechtest.",
      successTitle: "Adresse validiert",
      successBody:
        "Diese Adresse wurde geprueft. Du kannst mit den Versandarten fortfahren.",
      useSuggested: "Diese Adresse verwenden",
      useOriginal: "Meine Adresse trotzdem verwenden",
      suggestedAddress: "Vorgeschlagene Adresse",
    },
  };

  function getStorefrontLang() {
    const lang =
      window.Ecwid?.getStorefrontLang?.() ||
      document.documentElement.lang ||
      "nl";
    return String(lang).slice(0, 2).toLowerCase();
  }

  function t(key) {
    const lang = getStorefrontLang();
    return STRINGS[lang]?.[key] || STRINGS.nl[key] || key;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForEcwid() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < CONFIG.pollTimeout) {
      if (window.Ecwid?.OnPageLoaded?.add) return;
      await wait(CONFIG.pollInterval);
    }
    throw new Error("Ecwid JS API did not initialize within timeout.");
  }

  function normalizeWhitespace(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ");
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
      street: isStepEnabled("NORMALIZE")
        ? normalizeStreet(address.street)
        : normalizeWhitespace(address.street),
      city: normalizeWhitespace(address.city),
      postalCode: normalizeWhitespace(address.postalCode).toUpperCase(),
      countryName: normalizeWhitespace(address.countryName),
    };
  }

  function fingerprintAddress(address) {
    return [
      address.street,
      address.postalCode,
      address.city,
      address.countryName,
    ]
      .map((part) => normalizeWhitespace(part).toLowerCase())
      .join("|");
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
      postalCode: queryFirst(FIELD_SELECTORS.postalCode),
    };
  }

  function getCountryName(countryEl) {
    if (!countryEl) return "";
    if (countryEl instanceof HTMLSelectElement) {
      return (
        countryEl.selectedOptions?.[0]?.text?.trim() ||
        countryEl.value?.trim() ||
        ""
      );
    }
    return countryEl.value?.trim() || "";
  }

  function readAddressFromDom() {
    const fields = getFields();
    if (!fields.street || !fields.city || !fields.postalCode) return null;

    return {
      fullName: fields.fullName?.value || "",
      phone: fields.phone?.value || "",
      company: fields.company?.value || "",
      street: fields.street.value || "",
      city: fields.city.value || "",
      postalCode: fields.postalCode.value || "",
      countryName: getCountryName(fields.country),
    };
  }

  function isAddressComplete(address) {
    return Boolean(
      normalizeWhitespace(address.street) &&
      normalizeWhitespace(address.city) &&
      normalizeWhitespace(address.postalCode) &&
      normalizeWhitespace(address.countryName),
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
    if (!continueRow?.parentNode) return null;

    const box = document.createElement("div");
    box.id = "pm-addr-inline-box";
    continueRow.parentNode.insertBefore(box, continueRow);
    return box;
  }

  function getFormControl(el) {
    return el?.closest(".form-control") || el;
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
          t("validatingTitle"),
        )}</div>
        <p class="pm-addr-card__body">${escapeHtml(t("validatingBody"))}</p>
      </div>
    `;
  }

  function renderWarning(address, suggestion) {
    const box = ensureInlineBox();
    if (!box) return;

    const suggestionHtml = suggestion
      ? `
        <div class="pm-addr-card__suggestion">
          <div class="pm-addr-card__suggestion-label">${escapeHtml(
            t("suggestedAddress"),
          )}</div>
          <p class="pm-addr-card__suggestion-lines">
            ${escapeHtml(suggestion.street)}<br>
            ${escapeHtml(`${suggestion.postalCode} ${suggestion.city}`)}<br>
            ${escapeHtml(suggestion.countryName)}
          </p>
        </div>
      `
      : "";

    box.innerHTML = `
      <div class="pm-addr-card pm-addr-card--warning">
        <div class="pm-addr-card__title">${escapeHtml(t("warningTitle"))}</div>
        <p class="pm-addr-card__body">${escapeHtml(t("warningBody"))}</p>
        ${suggestionHtml}
        <div class="pm-addr-card__actions">
          ${
            suggestion
              ? `<button type="button" class="pm-addr-card__button pm-addr-card__button--primary" style="${getInlineButtonStyle(
                  "primary",
                )}" data-pm-addr-action="use-suggested">${escapeHtml(
                  t("useSuggested"),
                )}</button>`
              : ""
          }
          <button type="button" class="pm-addr-card__button pm-addr-card__button--ghost" style="${getInlineButtonStyle(
            "ghost",
          )}" data-pm-addr-action="use-original">${escapeHtml(
            t("useOriginal"),
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
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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
      "box-shadow:none",
    ];

    if (kind === "primary") {
      return [
        ...base,
        "background-color:#191919",
        "color:#ffffff",
        "border:1px solid #191919",
      ].join(";");
    }

    return [
      ...base,
      "background-color:#ffffff",
      "color:#191919",
      "border:1px solid #191919",
    ].join(";");
  }

  function setFieldDisabled(disabled) {
    const fields = getFields();
    Object.values(fields).forEach((field) => {
      if (!field) return;
      field.disabled = disabled;
      getFormControl(field)?.classList.toggle("pm-addr-disabled", disabled);
    });
  }

  function setFieldValid(valid) {
    const fields = getFields();
    Object.values(fields).forEach((field) => {
      if (!field) return;
      getFormControl(field)?.classList.toggle("pm-addr-valid", valid);
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

    const prototype =
      input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) {
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
        return (
          normalizeWhitespace(candidate.text).toLowerCase() ===
            normalizeWhitespace(suggestion.countryName).toLowerCase() ||
          normalizeWhitespace(candidate.value).toLowerCase() ===
            normalizeWhitespace(suggestion.countryName).toLowerCase()
        );
      });
      if (option) {
        setInputValue(fields.country, option.value);
      }
    }
  }

  function getSuggestedAddress(geoapifyResult, originalAddress) {
    const feature = geoapifyResult?.features?.[0];
    if (!feature) return null;

    const props = feature.properties || {};
    const street = props.housenumber
      ? `${props.street || ""} ${props.housenumber}`.trim()
      : props.street || "";

    return {
      street: street || originalAddress.street,
      city:
        props.city ||
        props.town ||
        props.village ||
        props.municipality ||
        originalAddress.city,
      postalCode: props.postcode || originalAddress.postalCode,
      countryName: props.country || originalAddress.countryName,
      confidence: props.rank?.confidence ?? 0,
    };
  }

  function hasMeaningfulDifference(left, right) {
    const keys = ["street", "city", "postalCode", "countryName"];
    return keys.some((key) => {
      return (
        normalizeWhitespace(left[key]).toLowerCase() !==
        normalizeWhitespace(right[key]).toLowerCase()
      );
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
        address.countryName,
      ]
        .filter(Boolean)
        .join(", "),
      limit: "1",
      apiKey: CONFIG.apiKey,
    });

    log("Calling Geoapify", {
      text: params.get("text"),
      url: `https://api.geoapify.com/v1/geocode/search?${params}`,
    });

    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?${params}`,
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

    if (
      state.acceptedFingerprint &&
      state.acceptedFingerprint === fingerprint
    ) {
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
      const confidence = suggestion?.confidence ?? 0;
      const hasSuggestion =
        suggestion && hasMeaningfulDifference(normalizedAddress, suggestion);

      log("Validation result", {
        address: normalizedAddress,
        confidence,
        suggestion,
      });

      if (confidence >= CONFIG.confidenceClean) {
        state.originalAddress = normalizedAddress;
        state.acceptedFingerprint = fingerprintAddress(normalizedAddress);
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
    // Ignore events dispatched programmatically (e.g. by applySuggestionToDom).
    // Only real user interactions (isTrusted) should trigger re-validation.
    if (!event.isTrusted) return;
    if (!(event.target instanceof Element)) return;
    const watched = Object.values(FIELD_SELECTORS).some((selectors) =>
      selectors.some((selector) => event.target.matches(selector)),
    );
    if (!watched) return;

    state.userDecided = false;
    scheduleValidation();
  }

  function onDocumentChange(event) {
    onDocumentInput(event);
  }

  function onInlineActionClick(event) {
    const action = event.target?.closest?.("[data-pm-addr-action]");
    if (!action) return;

    const actionName = action.getAttribute("data-pm-addr-action");
    if (actionName === "use-suggested" && state.pendingSuggestion) {
      state.userDecided = true;
      applySuggestionToDom(state.pendingSuggestion);
      state.acceptedFingerprint = fingerprintAddress(
        normalizeAddress({
          ...state.originalAddress,
          ...state.pendingSuggestion,
        }),
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
  }

  function onPageLoaded(page) {
    log("Ecwid page loaded", { type: page?.type });

    const isCheckoutAddressPage =
      page?.type === "CHECKOUT_ADDRESS" || page?.type === "CHECKOUT";

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
    state.userDecided = false;
    setUiState("idle");

    const currentAddress = readAddressFromDom();

    // Ecwid can re-fire OnPageLoaded after a country-select change while we are
    // applying a suggestion.  If the DOM still matches what was just accepted,
    // restore the valid state immediately instead of kicking off another round-trip.
    if (
      previousFingerprint &&
      currentAddress &&
      isAddressComplete(currentAddress) &&
      fingerprintAddress(normalizeAddress(currentAddress)) ===
        previousFingerprint
    ) {
      state.acceptedFingerprint = previousFingerprint;
      setUiState("valid");
      return;
    }

    if (
      !state.userDecided &&
      currentAddress &&
      isAddressComplete(currentAddress)
    ) {
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
    ADDR_STEP_GEOAPIFY: isStepEnabled("GEOAPIFY"),
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
