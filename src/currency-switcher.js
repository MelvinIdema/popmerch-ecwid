export function initCurrencySwitcher(config = {}) {
  const BASE_CURRENCY = config.baseCurrency || "EUR";
  const CACHE_KEY = "popmerch_fx_rates";
  const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
  const PREF_KEY = "popmerch_currency";
  const INLINE_ID = "pm-currency-switcher";
  const STYLES_ID = "pm-currency-styles";
  const POLL_INTERVAL = 50;
  const POLL_MAX_ATTEMPTS = 80; // 4 seconds

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
    AUD: { name: "Australian Dollar", symbol: "A$" },
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
    "it-CH": "CHF",
  };

  const ZERO_DECIMAL = new Set(["JPY", "HUF"]);

  // ─── Debug ────────────────────────────────────────────────────────────────

  function isDebug() {
    try {
      return localStorage.getItem("CURRENCY_DEBUG") === "true";
    } catch {
      return false;
    }
  }

  function log(message, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#7b1fa2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data != null
      ? console.log(`%c[Currency]%c ${message}`, style, "", data)
      : console.log(`%c[Currency]%c ${message}`, style, "");
  }

  function logError(message, error) {
    const style =
      "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    console.error(`%c[Currency]%c ${message}`, style, "", error);
  }

  // ─── Preferences ─────────────────────────────────────────────────────────

  function detectBrowserCurrency() {
    const lang = navigator.language || "en";
    if (LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];
    const base = lang.split("-")[0];
    return LOCALE_CURRENCY_MAP[base] || BASE_CURRENCY;
  }

  function getSelectedCurrency() {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch {}
    return detectBrowserCurrency();
  }

  function saveSelectedCurrency(currency) {
    try {
      localStorage.setItem(PREF_KEY, currency);
    } catch {}
  }

  // ─── Exchange rates ───────────────────────────────────────────────────────

  function getCachedRates() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rates;
    } catch {}
    return null;
  }

  function setCachedRates(rates) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
    } catch {}
  }

  async function fetchRates() {
    const cached = getCachedRates();
    if (cached) {
      log("Using cached rates", cached);
      return cached;
    }

    log("Fetching rates from Frankfurter");
    try {
      const resp = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}`,
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rates = { ...data.rates, [BASE_CURRENCY]: 1 };
      setCachedRates(rates);
      log("Rates fetched", rates);
      return rates;
    } catch (err) {
      log("Frankfurter failed, trying fallback", err);
      try {
        const key = BASE_CURRENCY.toLowerCase();
        const resp = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`,
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const rates = {};
        for (const [code, rate] of Object.entries(data[key] || {})) {
          rates[code.toUpperCase()] = rate;
        }
        rates[BASE_CURRENCY] = 1;
        setCachedRates(rates);
        log("Rates fetched from fallback", rates);
        return rates;
      } catch (err2) {
        logError("Both rate sources failed", err2);
        return null;
      }
    }
  }

  // ─── Price conversion ─────────────────────────────────────────────────────

  function convertPrice(basePrice, targetCurrency, rates) {
    if (targetCurrency === BASE_CURRENCY) return basePrice;
    const rate = rates[targetCurrency];
    if (rate == null) return null;
    return basePrice * rate;
  }

  function formatPrice(amount, currency) {
    try {
      return new Intl.NumberFormat(navigator.language || "en", {
        style: "currency",
        currency,
        minimumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
        maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
      }).format(amount);
    } catch {
      const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
      return `${CURRENCIES[currency]?.symbol || currency} ${amount.toFixed(decimals)}`;
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

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

      .pm-currency__select:hover {
        background: #efefef;
        border-color: #bbb;
      }

      .pm-currency__select:focus {
        border-color: #555;
        background: #fff;
      }

      .pm-currency__arrow {
        position: absolute;
        right: 9px;
        pointer-events: none;
        color: #888;
        font-size: 9px;
        line-height: 1;
      }

      #pm-currency-switcher .pm-currency__converted {
        font-size: 13px;
        color: #666;
        font-style: italic;
        white-space: nowrap;
      }

      #pm-currency-switcher .pm-currency__converted:empty {
        display: none;
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
    log("Styles injected");
  }

  // ─── Shared select builder ────────────────────────────────────────────────

  function buildSelectOptions(select, selectedCurrency) {
    select.innerHTML = "";
    for (const [code, info] of Object.entries(CURRENCIES)) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${code} — ${info.name}`;
      if (code === selectedCurrency) option.selected = true;
      select.appendChild(option);
    }
  }

  // ─── Sync helpers ─────────────────────────────────────────────────────────

  // Notify all other selects when one changes, without causing loops.
  const syncListeners = new Set();

  function onCurrencyChange(currency, source) {
    saveSelectedCurrency(currency);
    for (const fn of syncListeners) {
      if (fn !== source) fn(currency);
    }
  }

  // ─── Inline product-page switcher ────────────────────────────────────────

  async function mountInlineSwitcher(basePrice, insertBeforeEl) {
    if (document.getElementById(INLINE_ID)) return;

    const selectedCurrency = getSelectedCurrency();
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
    buildSelectOptions(select, selectedCurrency);

    const arrow = document.createElement("span");
    arrow.className = "pm-currency__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "▼";

    const converted = document.createElement("span");
    converted.className = "pm-currency__converted";

    selectWrap.appendChild(select);
    selectWrap.appendChild(arrow);
    wrapper.appendChild(label);
    wrapper.appendChild(selectWrap);
    wrapper.appendChild(converted);

    insertBeforeEl.parentNode.insertBefore(wrapper, insertBeforeEl);
    log("Inline switcher mounted", { basePrice, selectedCurrency });

    const rates = await fetchRates();

    function updateDisplay(currency) {
      if (!rates || currency === BASE_CURRENCY) {
        converted.textContent = "";
        return;
      }
      const amount = convertPrice(basePrice, currency, rates);
      if (amount === null) {
        converted.textContent = "";
        return;
      }
      converted.textContent = `≈ ${formatPrice(amount, currency)}`;
    }

    // Register as sync listener so bar changes update this too
    const syncFn = (currency) => {
      select.value = currency;
      updateDisplay(currency);
    };
    syncListeners.add(syncFn);

    updateDisplay(selectedCurrency);

    select.addEventListener("change", () => {
      onCurrencyChange(select.value, syncFn);
      updateDisplay(select.value);
    });
  }

  // ─── Announcement bar switcher ────────────────────────────────────────────

  function mountBarSwitcher() {
    // The announcement bar renders as a Vue component; try with polling
    let attempts = 0;
    const MAX = 60; // 3 seconds

    const poll = setInterval(() => {
      attempts++;

      const currencyEl = document.querySelector(".announcement-bar__currency");

      if (currencyEl && !currencyEl.querySelector(".pm-currency__bar-wrap")) {
        clearInterval(poll);
        injectStyles();

        const selectedCurrency = getSelectedCurrency();

        // Clear the existing "EUR" text
        currencyEl.textContent = "";

        const wrap = document.createElement("span");
        wrap.className = "pm-currency__bar-wrap";

        const select = document.createElement("select");
        select.className = "pm-currency__bar-select";
        select.setAttribute("aria-label", "Select display currency");
        buildSelectOptions(select, selectedCurrency);

        const arrow = document.createElement("span");
        arrow.className = "pm-currency__bar-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "▼";

        wrap.appendChild(select);
        wrap.appendChild(arrow);
        currencyEl.appendChild(wrap);

        log("Bar switcher mounted", selectedCurrency);

        // Register as sync listener
        const syncFn = (currency) => {
          select.value = currency;
        };
        syncListeners.add(syncFn);

        select.addEventListener("change", () => {
          onCurrencyChange(select.value, syncFn);
          // Also trigger the inline switcher's change if it exists
          const inlineSelect = document.querySelector(
            "#pm-currency-switcher .pm-currency__select",
          );
          if (inlineSelect && inlineSelect.value !== select.value) {
            inlineSelect.value = select.value;
            inlineSelect.dispatchEvent(new Event("change"));
          }
        });
        return;
      }

      if (attempts >= MAX) {
        clearInterval(poll);
        log("Announcement bar not found after polling");
      }
    }, POLL_INTERVAL);
  }

  // ─── Product page handler ─────────────────────────────────────────────────

  function handleProductPage() {
    // Remove stale switcher from previous SPA navigation
    const existing = document.getElementById(INLINE_ID);
    if (existing) existing.remove();
    // Clear inline sync listener by rebuilding from scratch on each product page
    syncListeners.clear();
    // Re-add bar sync listener if bar select already exists
    const barSelect = document.querySelector(".pm-currency__bar-select");
    if (barSelect) {
      const syncFn = (currency) => {
        barSelect.value = currency;
      };
      syncListeners.add(syncFn);
    }

    let attempts = 0;

    const poll = setInterval(() => {
      attempts++;

      // Primary: use the itemprop="price" with content attribute — exact numeric value
      const priceEl = document.querySelector(
        '.product-details__product-price[itemprop="price"][content]',
      );
      const priceRow = document.querySelector(".product-details__product-price-row");

      if (priceEl && priceRow) {
        clearInterval(poll);
        const basePrice = parseFloat(priceEl.getAttribute("content"));
        if (isNaN(basePrice) || basePrice <= 0) {
          log("Invalid price content attribute", priceEl.getAttribute("content"));
          return;
        }
        log("Price found", { basePrice, priceRow });
        mountInlineSwitcher(basePrice, priceRow).catch((err) => {
          logError("Failed to mount inline switcher", err);
        });
        return;
      }

      if (attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(poll);
        log("Price element not found after polling");
      }
    }, POLL_INTERVAL);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  // Announcement bar is persistent across pages — mount once
  mountBarSwitcher();

  // Product page inline switcher — mount on each product page load
  window.Ecwid?.OnPageLoaded?.add(function (page) {
    log("Page loaded", page.type);
    if (page.type === "PRODUCT") {
      handleProductPage();
    }
  });

  log("Currency switcher initialised");
}
