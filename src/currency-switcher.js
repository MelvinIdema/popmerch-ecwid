export function initCurrencySwitcher(config = {}) {
  const BASE_CURRENCY = config.baseCurrency || "EUR";
  const CACHE_KEY = "popmerch_fx_rates";
  const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
  const PREF_KEY = "popmerch_currency";
  const SWITCHER_ID = "pm-currency-switcher";
  const STYLES_ID = "pm-currency-styles";
  const POLL_INTERVAL = 50;
  const POLL_MAX_ATTEMPTS = 60; // 3 seconds

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

  // Maps navigator.language values to a preferred currency code.
  // Full locale takes precedence over language-only.
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

  // Currencies with no fractional units
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
    if (data != null) {
      console.log(`%c[Currency]%c ${message}`, style, "", data);
    } else {
      console.log(`%c[Currency]%c ${message}`, style, "");
    }
  }

  function logWarn(message, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#f57c00;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    if (data != null) {
      console.warn(`%c[Currency]%c ${message}`, style, "", data);
    } else {
      console.warn(`%c[Currency]%c ${message}`, style, "");
    }
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
      log("Using cached exchange rates", cached);
      return cached;
    }

    log("Fetching exchange rates from Frankfurter");
    try {
      const resp = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}`,
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      // Include the base currency itself at a 1:1 rate
      const rates = { ...data.rates, [BASE_CURRENCY]: 1 };
      setCachedRates(rates);
      log("Fetched rates from Frankfurter", rates);
      return rates;
    } catch (err) {
      logWarn("Frankfurter unavailable, trying fallback API", err);
      try {
        const key = BASE_CURRENCY.toLowerCase();
        const resp = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`,
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const rawRates = data[key] || {};
        const rates = {};
        for (const [code, rate] of Object.entries(rawRates)) {
          rates[code.toUpperCase()] = rate;
        }
        rates[BASE_CURRENCY] = 1;
        setCachedRates(rates);
        log("Fetched rates from fallback API", rates);
        return rates;
      } catch (err2) {
        logError("Both exchange rate sources failed", err2);
        return null;
      }
    }
  }

  // ─── Price parsing ────────────────────────────────────────────────────────

  // Parses a locale-formatted price string like "€ 11,00" or "$1,234.56"
  // into a plain float.
  function parsePrice(text) {
    const cleaned = text.replace(/[^0-9.,]/g, "").trim();
    if (!cleaned) return null;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    let normalized;
    if (lastComma > lastDot) {
      // European format: "1.234,56" — comma is decimal separator
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (lastDot > lastComma) {
      // US format: "1,234.56" — dot is decimal separator
      normalized = cleaned.replace(/,/g, "");
    } else {
      // No separators or only one type: treat as integer
      normalized = cleaned.replace(/[.,]/g, "");
    }

    const price = parseFloat(normalized);
    return isNaN(price) ? null : price;
  }

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
      const symbol = CURRENCIES[currency]?.symbol || currency;
      return `${symbol} ${amount.toFixed(decimals)}`;
    }
  }

  // ─── DOM helpers ──────────────────────────────────────────────────────────

  // Returns { el, price } for the first matching price element, or null.
  function findPriceElement() {
    const selectors = [
      ".product-details__price .product-price__value",
      ".product-details__price .ec-price-item",
      ".product-details .product-price__value",
      ".product-details .ec-price-item",
      ".product-price__value",
      ".ec-price-item",
      "[itemprop='price']",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = el.getAttribute("content") || el.textContent || "";
      const price = parsePrice(text);
      if (price !== null && price > 0) {
        log(`Found price ${price} via selector "${selector}"`);
        return { el, price };
      }
    }
    return null;
  }

  // Returns the container element to insert the switcher before.
  function findPriceContainer() {
    const selectors = [
      ".product-details__price",
      ".product-details .product-price",
      ".details-product-price",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      #pm-currency-switcher {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-family: inherit;
        flex-wrap: wrap;
      }

      .pm-currency__label {
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

      .pm-currency__converted {
        font-size: 13px;
        color: #666;
        font-style: italic;
        white-space: nowrap;
        transition: opacity 0.15s;
      }

      .pm-currency__converted:empty {
        display: none;
      }
    `;
    document.head.appendChild(style);
    log("Styles injected");
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  function buildSwitcherElement(selectedCurrency) {
    const wrapper = document.createElement("div");
    wrapper.id = SWITCHER_ID;

    const label = document.createElement("span");
    label.className = "pm-currency__label";
    label.textContent = "Currency";

    const selectWrap = document.createElement("div");
    selectWrap.className = "pm-currency__select-wrap";

    const select = document.createElement("select");
    select.className = "pm-currency__select";
    select.setAttribute("aria-label", "Select display currency");

    for (const [code, info] of Object.entries(CURRENCIES)) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${code} — ${info.name}`;
      if (code === selectedCurrency) option.selected = true;
      select.appendChild(option);
    }

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

    return { wrapper, select, converted };
  }

  async function mountSwitcher(basePrice, container) {
    const selectedCurrency = getSelectedCurrency();
    injectStyles();

    const { wrapper, select, converted } = buildSwitcherElement(selectedCurrency);
    container.parentNode.insertBefore(wrapper, container);
    log("Switcher mounted", { basePrice, selectedCurrency });

    const rates = await fetchRates();

    function updateConvertedPrice(currency) {
      if (!rates || currency === BASE_CURRENCY) {
        converted.textContent = "";
        return;
      }
      const amount = convertPrice(basePrice, currency, rates);
      if (amount === null) {
        logWarn(`No rate available for ${currency}`);
        converted.textContent = "";
        return;
      }
      converted.textContent = `≈ ${formatPrice(amount, currency)}`;
      log(`Converted ${basePrice} ${BASE_CURRENCY} → ${formatPrice(amount, currency)}`);
    }

    updateConvertedPrice(selectedCurrency);

    select.addEventListener("change", () => {
      const currency = select.value;
      saveSelectedCurrency(currency);
      updateConvertedPrice(currency);
    });
  }

  // ─── Page handler ─────────────────────────────────────────────────────────

  function handleProductPage() {
    // Remove any leftover switcher from the previous product page (SPA navigation)
    const existing = document.getElementById(SWITCHER_ID);
    if (existing) existing.remove();

    let attempts = 0;

    const poll = setInterval(() => {
      attempts++;

      const found = findPriceElement();
      const container = findPriceContainer();

      if (found && container) {
        clearInterval(poll);
        mountSwitcher(found.price, container).catch((err) => {
          logError("Failed to mount currency switcher", err);
        });
        return;
      }

      if (attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(poll);
        logWarn("Price element not found — currency switcher not injected");
      }
    }, POLL_INTERVAL);
  }

  // ─── Ecwid integration ────────────────────────────────────────────────────

  window.Ecwid?.OnPageLoaded?.add(function (page) {
    if (page.type === "PRODUCT") {
      log("Product page loaded", page);
      handleProductPage();
    }
  });

  log("Currency switcher initialised");
}
