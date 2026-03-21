export function initAddressValidation(config = {}) {
  const CHECKOUT_TRIGGER_SELECTORS = [
    ".ec-cart__button--checkout .form-control__button",
    ".ec-cart__button--checkout button",
    ".ec-cart__button--checkout a",
    ".ec-cart__button--checkout",
    ".ec-minicart__button--checkout",
    '[data-ecwid-action="goto-checkout"]',
  ];

  const SESSION = {
    DRAFT_KEY: "pm_precheckout_draft_v1",

    getDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(this.DRAFT_KEY));
      } catch {
        return null;
      }
    },

    setDraft(value) {
      try {
        sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(value));
      } catch {
        /* noop */
      }
    },
  };

  const CONFIG = {
    apiKey: config.apiKey || "",
    pollInterval: 50,
    pollTimeout: 10_000,
    confidenceWarning: 0.4,
    confidenceClean: 0.75,
  };

  const state = {
    onCartPage: false,
    documentListenersAttached: false,
    modalOpen: false,
    mode: "form",
    error: "",
    loadingMessage: "",
    formData: null,
    originalAddress: null,
    normalizedAddress: null,
    suggestedAddress: null,
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

  function getStorefrontLang() {
    const lang =
      window.Ecwid?.getStorefrontLang?.() ||
      document.documentElement.lang ||
      "nl";
    return String(lang).slice(0, 2).toLowerCase();
  }

  const STRINGS = {
    nl: {
      title: "Controleer je bezorgadres",
      description:
        "Voer alvast je e-mailadres en bezorgadres in. We controleren het adres voordat we je naar de checkout sturen.",
      email: "E-mailadres",
      name: "Voor- en achternaam",
      phone: "Telefoon (optioneel)",
      companyName: "Bedrijfsnaam (optioneel)",
      street: "Adres",
      postalCode: "Postcode",
      city: "Stad",
      countryName: "Land",
      cancel: "Annuleren",
      continue: "Controleer en ga door",
      loadingValidate: "Adres wordt gecontroleerd...",
      loadingSave: "Gegevens worden opgeslagen...",
      correctionTitle: "Adres automatisch gecorrigeerd",
      correctionBody:
        "We hebben de adresnotatie verbeterd op basis van een bekende locatie. Je kunt dit nog ongedaan maken voordat je doorgaat.",
      warningTitle: "We konden dit adres niet verifieren",
      warningBody:
        "Dit adres lijkt niet te bestaan of is te onzeker. Pas het adres aan voordat je verdergaat naar de verzendmethodes.",
      continueCorrected: "Doorgaan met gecorrigeerd adres",
      undoCorrection: "Correctie ongedaan maken",
      edit: "Adres aanpassen",
      backToCart: "Terug naar winkelwagen",
      genericError: "Er ging iets mis. Probeer het opnieuw.",
      saveError:
        "Het adres kon niet in Ecwid worden opgeslagen. Probeer het opnieuw.",
      requiredField: "Vul alle verplichte velden in.",
      invalidEmail: "Vul een geldig e-mailadres in.",
      closeLabel: "Sluiten",
      note: "Je kunt deze gegevens in Ecwid later nog aanpassen.",
    },
    en: {
      title: "Check your delivery address",
      description:
        "Enter your email and delivery address first. We will validate the address before sending you to checkout.",
      email: "Email",
      name: "Full name",
      phone: "Phone (optional)",
      companyName: "Company name (optional)",
      street: "Address",
      postalCode: "Postal code",
      city: "City",
      countryName: "Country",
      cancel: "Cancel",
      continue: "Validate and continue",
      loadingValidate: "Validating address...",
      loadingSave: "Saving details...",
      correctionTitle: "Address corrected automatically",
      correctionBody:
        "We improved the address format based on a known location. You can still undo this before continuing.",
      warningTitle: "We could not confidently verify this address",
      warningBody:
        "This address appears invalid or too uncertain. Please fix the address before continuing to shipping methods.",
      continueCorrected: "Continue with corrected address",
      undoCorrection: "Undo correction",
      edit: "Edit address",
      backToCart: "Back to cart",
      genericError: "Something went wrong. Please try again.",
      saveError: "We could not save the address in Ecwid. Please try again.",
      requiredField: "Please fill in all required fields.",
      invalidEmail: "Please enter a valid email address.",
      closeLabel: "Close",
      note: "You can still adjust these details later in Ecwid.",
    },
    de: {
      title: "Lieferadresse pruefen",
      description:
        "Gib zuerst deine E-Mail-Adresse und Lieferadresse ein. Wir pruefen die Adresse, bevor wir dich zur Kasse schicken.",
      email: "E-Mail-Adresse",
      name: "Vor- und Nachname",
      phone: "Telefon (optional)",
      companyName: "Firmenname (optional)",
      street: "Adresse",
      postalCode: "Postleitzahl",
      city: "Stadt",
      countryName: "Land",
      cancel: "Abbrechen",
      continue: "Pruefen und weiter",
      loadingValidate: "Adresse wird geprueft...",
      loadingSave: "Daten werden gespeichert...",
      correctionTitle: "Adresse automatisch korrigiert",
      correctionBody:
        "Wir haben die Adressnotation anhand einer bekannten Adresse verbessert. Du kannst das vor dem Weitergehen noch rueckgaengig machen.",
      warningTitle: "Wir konnten diese Adresse nicht sicher pruefen",
      warningBody:
        "Diese Adresse scheint ungueltig oder zu unsicher zu sein. Bitte korrigiere sie, bevor du zu den Versandarten weitergehst.",
      continueCorrected: "Mit korrigierter Adresse weiter",
      undoCorrection: "Korrektur rueckgaengig machen",
      edit: "Adresse bearbeiten",
      backToCart: "Zurueck zum Warenkorb",
      genericError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      saveError:
        "Die Adresse konnte nicht in Ecwid gespeichert werden. Bitte versuche es erneut.",
      requiredField: "Bitte fuelle alle Pflichtfelder aus.",
      invalidEmail: "Bitte gib eine gueltige E-Mail-Adresse ein.",
      closeLabel: "Schliessen",
      note: "Du kannst diese Daten spaeter in Ecwid noch anpassen.",
    },
  };

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
      if (window.Ecwid?.OnAPILoaded?.add && window.Ecwid?.OnPageLoaded?.add) {
        return;
      }
      await wait(CONFIG.pollInterval);
    }
    throw new Error("Ecwid JS API did not initialize within the timeout.");
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

  function normalizePostalCode(value) {
    return normalizeWhitespace(value).toUpperCase();
  }

  function normalizeFormData(data) {
    return {
      email: normalizeWhitespace(data.email).toLowerCase(),
      name: normalizeWhitespace(data.name),
      phone: normalizeWhitespace(data.phone),
      companyName: normalizeWhitespace(data.companyName),
      street: isStepEnabled("NORMALIZE")
        ? normalizeStreet(data.street)
        : normalizeWhitespace(data.street),
      postalCode: normalizePostalCode(data.postalCode),
      city: normalizeWhitespace(data.city),
      countryName: normalizeWhitespace(data.countryName),
    };
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getEmptyFormData() {
    return {
      email: "",
      name: "",
      phone: "",
      companyName: "",
      street: "",
      postalCode: "",
      city: "",
      countryName: getDefaultCountryName(),
    };
  }

  function getDefaultCountryName() {
    try {
      const countryCode = window.Ecwid?.getVisitorLocation?.()?.countryCode;
      if (!countryCode) return "";
      const displayNames = new Intl.DisplayNames([getStorefrontLang(), "en"], {
        type: "region",
      });
      return displayNames.of(countryCode.toUpperCase()) || "";
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function diffRows(currentAddress, suggestedAddress) {
    const fields = [
      { key: "street", label: t("street") },
      { key: "postalCode", label: t("postalCode") },
      { key: "city", label: t("city") },
      { key: "countryName", label: t("countryName") },
    ];

    return fields
      .filter((field) => {
        const currentValue = normalizeWhitespace(currentAddress[field.key]).toLowerCase();
        const suggestedValue = normalizeWhitespace(
          suggestedAddress[field.key]
        ).toLowerCase();
        return suggestedValue && currentValue !== suggestedValue;
      })
      .map((field) => {
        return `
          <div class="pm-addr-diff-row">
            <div class="pm-addr-diff-label">${escapeHtml(field.label)}</div>
            <div class="pm-addr-diff-value">${escapeHtml(
              suggestedAddress[field.key]
            )}</div>
          </div>
        `;
      })
      .join("");
  }

  function getModalRoot() {
    return document.getElementById("pm-precheckout-modal");
  }

  function injectStyles() {
    if (document.getElementById("pm-precheckout-styles")) return;

    const style = document.createElement("style");
    style.id = "pm-precheckout-styles";
    style.textContent = `
      body.pm-precheckout-open {
        overflow: hidden;
      }

      #pm-precheckout-modal {
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: none;
      }

      #pm-precheckout-modal.pm-visible {
        display: block;
      }

      #pm-precheckout-modal .pm-addr-overlay {
        position: absolute;
        inset: 0;
        background: rgba(17, 17, 17, 0.6);
      }

      #pm-precheckout-modal .pm-addr-dialog {
        position: relative;
        z-index: 1;
        width: min(680px, calc(100vw - 32px));
        margin: 32px auto;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #pm-precheckout-modal .pm-addr-header {
        padding: 24px 24px 8px;
        border-bottom: 1px solid #ececec;
      }

      #pm-precheckout-modal .pm-addr-title {
        margin: 0;
        font-size: 24px;
        line-height: 1.2;
        color: #111111;
      }

      #pm-precheckout-modal .pm-addr-description {
        margin: 10px 0 0;
        font-size: 14px;
        line-height: 1.5;
        color: #5f5f5f;
      }

      #pm-precheckout-modal .pm-addr-close {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 999px;
        background: #f2f2f2;
        color: #111111;
        cursor: pointer;
        font-size: 18px;
      }

      #pm-precheckout-modal .pm-addr-body {
        padding: 24px;
      }

      #pm-precheckout-modal .pm-addr-note,
      #pm-precheckout-modal .pm-addr-error {
        margin: 0 0 18px;
        padding: 12px 14px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.45;
      }

      #pm-precheckout-modal .pm-addr-note {
        background: #f5f5f5;
        color: #4a4a4a;
      }

      #pm-precheckout-modal .pm-addr-error {
        background: #fff1f0;
        color: #9b2c2c;
        border: 1px solid #ffd6d2;
      }

      #pm-precheckout-modal .pm-addr-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      #pm-precheckout-modal .pm-addr-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      #pm-precheckout-modal .pm-addr-field--full {
        grid-column: 1 / -1;
      }

      #pm-precheckout-modal .pm-addr-label {
        font-size: 13px;
        font-weight: 600;
        color: #1f1f1f;
      }

      #pm-precheckout-modal .pm-addr-input {
        width: 100%;
        min-height: 48px;
        box-sizing: border-box;
        border: 1px solid #d9d9d9;
        border-radius: 12px;
        padding: 0 14px;
        font-size: 15px;
        color: #111111;
        background: #ffffff;
      }

      #pm-precheckout-modal .pm-addr-input:focus {
        outline: none;
        border-color: #111111;
        box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
      }

      #pm-precheckout-modal .pm-addr-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
        flex-wrap: wrap;
      }

      #pm-precheckout-modal .pm-addr-button {
        min-height: 46px;
        padding: 0 18px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      }

      #pm-precheckout-modal .pm-addr-button--ghost {
        background: #f2f2f2;
        color: #232323;
      }

      #pm-precheckout-modal .pm-addr-button--primary {
        background: #111111;
        color: #ffffff;
      }

      #pm-precheckout-modal .pm-addr-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 220px;
        text-align: center;
        color: #444444;
        font-size: 15px;
      }

      #pm-precheckout-modal .pm-addr-card-title {
        margin: 0 0 8px;
        font-size: 20px;
        color: #111111;
      }

      #pm-precheckout-modal .pm-addr-card-body {
        margin: 0 0 18px;
        color: #5d5d5d;
        line-height: 1.5;
        font-size: 14px;
      }

      #pm-precheckout-modal .pm-addr-diff {
        background: #f5f5f5;
        border-radius: 14px;
        padding: 14px;
      }

      #pm-precheckout-modal .pm-addr-diff-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 12px;
        font-size: 14px;
        line-height: 1.45;
      }

      #pm-precheckout-modal .pm-addr-diff-row + .pm-addr-diff-row {
        margin-top: 8px;
      }

      #pm-precheckout-modal .pm-addr-diff-label {
        color: #666666;
      }

      #pm-precheckout-modal .pm-addr-diff-value {
        font-weight: 600;
        color: #111111;
      }

      @media (max-width: 640px) {
        #pm-precheckout-modal .pm-addr-dialog {
          width: calc(100vw - 20px);
          margin: 10px auto;
        }

        #pm-precheckout-modal .pm-addr-header,
        #pm-precheckout-modal .pm-addr-body {
          padding: 20px;
        }

        #pm-precheckout-modal .pm-addr-form {
          grid-template-columns: 1fr;
        }

        #pm-precheckout-modal .pm-addr-diff-row {
          grid-template-columns: 1fr;
          gap: 2px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureModal() {
    injectStyles();

    if (getModalRoot()) return getModalRoot();

    const root = document.createElement("div");
    root.id = "pm-precheckout-modal";
    root.innerHTML = `
      <div class="pm-addr-overlay" data-action="close"></div>
      <div class="pm-addr-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-addr-title"></div>
    `;

    root.addEventListener("click", onModalClick);
    root.addEventListener("submit", onModalSubmit);
    document.body.appendChild(root);
    return root;
  }

  function renderModal() {
    const root = ensureModal();
    const dialog = root.querySelector(".pm-addr-dialog");

    if (!dialog) return;

    if (state.mode === "loading") {
      dialog.innerHTML = `
        <div class="pm-addr-header">
          <h2 class="pm-addr-title" id="pm-addr-title">${escapeHtml(
            t("title")
          )}</h2>
        </div>
        <div class="pm-addr-body">
          <div class="pm-addr-loading">${escapeHtml(state.loadingMessage)}</div>
        </div>
      `;
      return;
    }

    if (state.mode === "corrected") {
      dialog.innerHTML = `
        <button type="button" class="pm-addr-close" data-action="close" aria-label="${escapeHtml(
          t("closeLabel")
        )}">x</button>
        <div class="pm-addr-header">
          <h2 class="pm-addr-title" id="pm-addr-title">${escapeHtml(
            t("correctionTitle")
          )}</h2>
          <p class="pm-addr-description">${escapeHtml(
            t("correctionBody")
          )}</p>
        </div>
        <div class="pm-addr-body">
          <div class="pm-addr-diff">
            ${diffRows(state.normalizedAddress, state.suggestedAddress)}
          </div>
          <div class="pm-addr-actions">
            <button type="button" class="pm-addr-button pm-addr-button--ghost" data-action="edit-address">${escapeHtml(
              t("edit")
            )}</button>
            <button type="button" class="pm-addr-button pm-addr-button--ghost" data-action="undo-correction">${escapeHtml(
              t("undoCorrection")
            )}</button>
            <button type="button" class="pm-addr-button pm-addr-button--primary" data-action="continue-corrected">${escapeHtml(
              t("continueCorrected")
            )}</button>
          </div>
        </div>
      `;
      return;
    }

    if (state.mode === "warning") {
      dialog.innerHTML = `
        <button type="button" class="pm-addr-close" data-action="close" aria-label="${escapeHtml(
          t("closeLabel")
        )}">x</button>
        <div class="pm-addr-header">
          <h2 class="pm-addr-title" id="pm-addr-title">${escapeHtml(
            t("warningTitle")
          )}</h2>
          <p class="pm-addr-description">${escapeHtml(
            t("warningBody")
          )}</p>
        </div>
        <div class="pm-addr-body">
          <div class="pm-addr-actions">
            <button type="button" class="pm-addr-button pm-addr-button--ghost" data-action="close">${escapeHtml(
              t("backToCart")
            )}</button>
            <button type="button" class="pm-addr-button pm-addr-button--ghost" data-action="edit-address">${escapeHtml(
              t("edit")
            )}</button>
          </div>
        </div>
      `;
      return;
    }

    const formData = state.formData || getEmptyFormData();
    dialog.innerHTML = `
      <button type="button" class="pm-addr-close" data-action="close" aria-label="${escapeHtml(
        t("closeLabel")
      )}">x</button>
      <div class="pm-addr-header">
        <h2 class="pm-addr-title" id="pm-addr-title">${escapeHtml(
          t("title")
        )}</h2>
        <p class="pm-addr-description">${escapeHtml(t("description"))}</p>
      </div>
      <div class="pm-addr-body">
        <p class="pm-addr-note">${escapeHtml(t("note"))}</p>
        ${
          state.error
            ? `<p class="pm-addr-error">${escapeHtml(state.error)}</p>`
            : ""
        }
        <form class="pm-addr-form" novalidate>
          ${renderField("email", t("email"), formData.email, true, "email")}
          ${renderField("name", t("name"), formData.name, true)}
          ${renderField("phone", t("phone"), formData.phone, false, "tel")}
          ${renderField(
            "companyName",
            t("companyName"),
            formData.companyName,
            false
          )}
          ${renderField("street", t("street"), formData.street, true, "text", true)}
          ${renderField(
            "postalCode",
            t("postalCode"),
            formData.postalCode,
            true
          )}
          ${renderField("city", t("city"), formData.city, true)}
          ${renderField(
            "countryName",
            t("countryName"),
            formData.countryName,
            true
          )}
          <div class="pm-addr-field pm-addr-field--full">
            <div class="pm-addr-actions">
              <button type="button" class="pm-addr-button pm-addr-button--ghost" data-action="close">${escapeHtml(
                t("cancel")
              )}</button>
              <button type="submit" class="pm-addr-button pm-addr-button--primary">${escapeHtml(
                t("continue")
              )}</button>
            </div>
          </div>
        </form>
      </div>
    `;

    queueMicrotask(() => {
      const firstEmptyField = dialog.querySelector(
        '.pm-addr-input[value=""], .pm-addr-input:not([value])'
      );
      const fallbackField = dialog.querySelector(".pm-addr-input");
      (firstEmptyField || fallbackField)?.focus();
    });
  }

  function renderField(name, label, value, required, type = "text", full = false) {
    return `
      <label class="pm-addr-field ${full ? "pm-addr-field--full" : ""}">
        <span class="pm-addr-label">${escapeHtml(label)}</span>
        <input
          class="pm-addr-input"
          name="${escapeHtml(name)}"
          type="${escapeHtml(type)}"
          value="${escapeHtml(value || "")}"
          ${required ? "required" : ""}
          autocomplete="${escapeHtml(getAutocomplete(name))}"
        />
      </label>
    `;
  }

  function getAutocomplete(fieldName) {
    const map = {
      email: "email",
      name: "shipping name",
      phone: "shipping tel",
      companyName: "shipping organization",
      street: "shipping street-address",
      postalCode: "shipping postal-code",
      city: "shipping address-level2",
      countryName: "shipping country",
    };
    return map[fieldName] || "off";
  }

  function openModal() {
    state.modalOpen = true;
    state.mode = "loading";
    state.error = "";
    state.loadingMessage = t("loadingValidate");
    document.body.classList.add("pm-precheckout-open");
    ensureModal().classList.add("pm-visible");
    renderModal();

    loadPrefill()
      .then((prefill) => {
        state.formData = prefill;
        state.mode = "form";
        state.error = "";
        renderModal();
        log("Pre-checkout modal opened", prefill);
      })
      .catch((error) => {
        logError("Failed to load modal prefill", error);
        state.formData = getEmptyFormData();
        state.mode = "form";
        state.error = "";
        renderModal();
      });
  }

  function closeModal() {
    const root = getModalRoot();
    if (!root) return;
    root.classList.remove("pm-visible");
    document.body.classList.remove("pm-precheckout-open");
    state.modalOpen = false;
    state.mode = "form";
    state.error = "";
    state.loadingMessage = "";
    state.originalAddress = null;
  }

  async function loadPrefill() {
    const cart = await getCart();
    const shippingPerson = cart?.shippingPerson || {};
    const draft = SESSION.getDraft() || {};
    const formData = {
      ...getEmptyFormData(),
      ...draft,
      name: draft.name || shippingPerson.name || "",
      phone: draft.phone || shippingPerson.phone || "",
      companyName: draft.companyName || shippingPerson.companyName || "",
      street: draft.street || shippingPerson.street || "",
      postalCode: draft.postalCode || shippingPerson.postalCode || "",
      city: draft.city || shippingPerson.city || "",
      countryName:
        draft.countryName ||
        shippingPerson.countryName ||
        getDefaultCountryName() ||
        "",
    };

    return formData;
  }

  function readFormData(form) {
    const get = (name) =>
      form.querySelector(`[name="${name}"]`)?.value?.trim() || "";

    return {
      email: get("email"),
      name: get("name"),
      phone: get("phone"),
      companyName: get("companyName"),
      street: get("street"),
      postalCode: get("postalCode"),
      city: get("city"),
      countryName: get("countryName"),
    };
  }

  function validateFormData(formData) {
    if (
      !formData.email ||
      !formData.name ||
      !formData.street ||
      !formData.postalCode ||
      !formData.city ||
      !formData.countryName
    ) {
      return t("requiredField");
    }

    if (!isValidEmail(formData.email)) {
      return t("invalidEmail");
    }

    return "";
  }

  function mergeSuggestedAddress(baseAddress, suggestion) {
    return {
      ...baseAddress,
      street: suggestion.street || baseAddress.street,
      postalCode: suggestion.postalCode || baseAddress.postalCode,
      city: suggestion.city || baseAddress.city,
      countryName: suggestion.countryName || baseAddress.countryName,
    };
  }

  function hasMeaningfulCorrection(inputAddress, suggestedAddress) {
    const keys = ["street", "postalCode", "city", "countryName"];
    return keys.some((key) => {
      return (
        normalizeWhitespace(inputAddress[key]).toLowerCase() !==
        normalizeWhitespace(suggestedAddress[key]).toLowerCase()
      );
    });
  }

  async function onModalSubmit(event) {
    if (!state.modalOpen) return;
    const form = event.target.closest(".pm-addr-form");
    if (!form) return;

    event.preventDefault();

    const rawFormData = readFormData(form);
    const validationError = validateFormData(rawFormData);
    if (validationError) {
      state.formData = rawFormData;
      state.mode = "form";
      state.error = validationError;
      renderModal();
      return;
    }

    const normalizedAddress = normalizeFormData(rawFormData);
    SESSION.setDraft(normalizedAddress);
    state.formData = normalizedAddress;
    state.normalizedAddress = normalizedAddress;
    state.error = "";
    state.mode = "loading";
    state.loadingMessage = t("loadingValidate");
    renderModal();

    try {
      if (!isStepEnabled("GEOAPIFY") || !CONFIG.apiKey) {
        await commitPrecheckoutData(normalizedAddress, { allowFallback: true });
        return;
      }

      const geoapifyResult = await validateWithGeoapify(normalizedAddress);

      const suggestion = extractSuggestion(geoapifyResult);
      const mergedSuggestion = suggestion
        ? mergeSuggestedAddress(normalizedAddress, suggestion)
        : null;

      log("Validation result", {
        input: normalizedAddress,
        suggestion: mergedSuggestion,
      });

      if (
        mergedSuggestion &&
        suggestion.rankConfidence >= CONFIG.confidenceClean &&
        hasMeaningfulCorrection(normalizedAddress, mergedSuggestion)
      ) {
        state.originalAddress = normalizedAddress;
        state.formData = mergedSuggestion;
        state.suggestedAddress = mergedSuggestion;
        state.normalizedAddress = normalizedAddress;
        state.mode = "corrected";
        renderModal();
        return;
      }

      if (
        mergedSuggestion &&
        suggestion.rankConfidence >= CONFIG.confidenceWarning
      ) {
        await commitPrecheckoutData(mergedSuggestion, { allowFallback: true });
        return;
      }

      if (!suggestion) {
        state.mode = "warning";
        renderModal();
        return;
      }

      if (suggestion.rankConfidence < CONFIG.confidenceWarning) {
        state.suggestedAddress = mergedSuggestion;
        state.mode = "warning";
        renderModal();
        return;
      }

      await commitPrecheckoutData(normalizedAddress, { allowFallback: true });
    } catch (error) {
      logError("Validation flow failed", error);
      await commitPrecheckoutData(normalizedAddress, { allowFallback: true });
    }
  }

  function onModalClick(event) {
    if (!state.modalOpen) return;
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.getAttribute("data-action");
    if (!action) return;

    if (action === "close") {
      closeModal();
      return;
    }

    if (action === "edit-address") {
      state.mode = "form";
      state.error = "";
      renderModal();
      return;
    }

    if (action === "continue-corrected" && state.suggestedAddress) {
      commitPrecheckoutData(state.suggestedAddress, { allowFallback: true }).catch((error) => {
        logError("Failed to commit corrected address", error);
      });
      return;
    }

    if (action === "undo-correction" && state.originalAddress) {
      state.formData = state.originalAddress;
      state.normalizedAddress = state.originalAddress;
      state.suggestedAddress = null;
      state.mode = "form";
      state.error = "";
      renderModal();
      return;
    }

    if (action === "use-original" && state.normalizedAddress) {
      commitPrecheckoutData(state.normalizedAddress, { allowFallback: true }).catch(
        (error) => {
          logError("Failed to commit original address", error);
        }
      );
    }
  }

  async function commitPrecheckoutData(address, options = {}) {
    state.mode = "loading";
    state.loadingMessage = t("loadingSave");
    renderModal();

    try {
      await setCustomerEmail(address.email);
      await setShippingAddress(address);
      SESSION.setDraft(address);
      closeModal();
      log("Pre-checkout data stored in Ecwid", address);
      window.Ecwid?.Cart?.gotoCheckout?.();
    } catch (error) {
      if (!options.allowFallback) {
        throw error;
      }

      logError("Saving pre-checkout data failed", error);
      state.mode = "form";
      state.error = t("saveError");
      renderModal();
    }
  }

  function validateWithGeoapify(address) {
    if (!CONFIG.apiKey) {
      logWarn("No Geoapify API key configured. Skipping API validation.");
      return Promise.resolve(null);
    }

    const parts = [
      address.street,
      address.postalCode,
      address.city,
      address.countryName,
    ].filter(Boolean);

    if (parts.length < 3) {
      return Promise.resolve(null);
    }

    const params = new URLSearchParams({
      text: parts.join(", "),
      limit: "1",
      apiKey: CONFIG.apiKey,
    });

    log("Calling Geoapify", {
      text: parts.join(", "),
      url: `https://api.geoapify.com/v1/geocode/search?${params}`,
    });

    return fetch(`https://api.geoapify.com/v1/geocode/search?${params}`).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(`Geoapify HTTP ${response.status}`);
        }
        return response.json();
      }
    );
  }

  function extractSuggestion(result) {
    const feature = result?.features?.[0];
    if (!feature) return null;

    const props = feature.properties || {};
    const street = props.housenumber
      ? `${props.street || ""} ${props.housenumber}`.trim()
      : props.street || "";

    return {
      street: street || "",
      postalCode: props.postcode || "",
      city:
        props.city || props.town || props.village || props.municipality || "",
      countryName: props.country || "",
      rankConfidence: props.rank?.confidence ?? 0,
    };
  }

  function getCart() {
    return new Promise((resolve) => {
      window.Ecwid.Cart.get((cart) => resolve(cart || null));
    });
  }

  function setCustomerEmail(email) {
    return new Promise((resolve, reject) => {
      window.Ecwid.Cart.setCustomerEmail(
        email,
        () => resolve(true),
        (error) => reject(error || new Error("setCustomerEmail failed"))
      );
    });
  }

  function setShippingAddress(address) {
    return new Promise((resolve, reject) => {
      window.Ecwid.Cart.setAddress(
        {
          name: address.name,
          companyName: address.companyName,
          street: address.street,
          city: address.city,
          countryName: address.countryName,
          postalCode: address.postalCode,
          phone: address.phone,
        },
        () => resolve(true),
        (error) => reject(error || new Error("setAddress failed"))
      );
    });
  }

  function isCheckoutTrigger(target) {
    if (!target?.closest) return false;
    return CHECKOUT_TRIGGER_SELECTORS.some((selector) =>
      target.closest(selector)
    );
  }

  function onDocumentClick(event) {
    if (!state.onCartPage) return;
    if (state.modalOpen) return;
    if (!isStepEnabled("INTERCEPT")) return;
    if (!isCheckoutTrigger(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    log("Intercepted Ecwid checkout click on cart page");
    openModal();
  }

  function onDocumentKeydown(event) {
    if (event.key !== "Escape" || !state.modalOpen) return;
    closeModal();
  }

  function ensureDocumentListeners() {
    if (state.documentListenersAttached) return;
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onDocumentKeydown, true);
    state.documentListenersAttached = true;
    log("Document-level pre-checkout listeners attached");
  }

  function onPageLoaded(page) {
    log("Ecwid page loaded", { type: page?.type });
    state.onCartPage = page?.type === "CART";

    if (!state.onCartPage && state.modalOpen) {
      closeModal();
    }
  }

  log("=== Address Validation V2: Pre-checkout flow ===");
  log("Config", {
    apiKey: CONFIG.apiKey ? "***set***" : "(not set)",
    ADDR_DEBUG: isDebug(),
    ADDR_STEP_INTERCEPT: isStepEnabled("INTERCEPT"),
    ADDR_STEP_NORMALIZE: isStepEnabled("NORMALIZE"),
    ADDR_STEP_GEOAPIFY: isStepEnabled("GEOAPIFY"),
  });

  function initializeModule() {
    ensureDocumentListeners();
    window.Ecwid.OnPageLoaded.add(onPageLoaded);

    const onCartDom =
      document.querySelector(".ec-cart") ||
      document.querySelector(".ecwid-productBrowser-Page-cart") ||
      window.location.pathname.includes("/cart");

    if (onCartDom) {
      state.onCartPage = true;
      log("Detected cart page from current DOM");
    }

    log("Pre-checkout address module initialized");
  }

  (async () => {
    try {
      await waitForEcwid();
      initializeModule();
    } catch (error) {
      logError("Failed to initialize pre-checkout address module", error);
    }
  })();
}
