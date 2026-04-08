export function initCurrencySwitcher(config = {}) {
  const BASE_CURRENCY = config.baseCurrency || "EUR";
  const CACHE_KEY = "popmerch_fx_rates";
  const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
  const PREF_KEY = "popmerch_currency";
  const STYLES_ID = "pm-currency-styles";
  const POLL_INTERVAL = 50;

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

  const ZERO_DECIMAL = new Set(["JPY", "HUF"]);

  // Selectors for standalone price elements without a schema.org `content` attribute.
  // The EUR amount will be parsed from their text on first encounter and cached in
  // the element's `data-pm-eur` attribute for subsequent currency switches.
  const DISPLAY_PRICE_SELECTORS = [
    ".grid-product__price-value",
    ".details-product-price-compare__container s",
    ".details-product-price-tax__value",
    ".ec-range__limit",
  ].join(",");

  // Class added to our proxy inputs so they can be identified for teardown.
  const PROXY_CLASS = "pm-price-proxy";

  // Prototype value descriptor used when patching / restoring real input setters.
  const INPUT_VALUE_DESCRIPTOR = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

  // Selectors for elements that mix prose text with embedded price(s).
  // The original text is stored in `data-pm-original-text` and prices within are
  // replaced via regex so the surrounding sentence is preserved.
  const TEXT_PRICE_SELECTORS = [
    ".ec-text-muted.ec-text-initial-size[store-profile]",
  ].join(",");

  let cachedRates = null;
  let currentBarSelect = null;

  // ─── Debug ────────────────────────────────────────────────────────────────

  function log(msg, data = null) {
    if (localStorage.getItem("CURRENCY_DEBUG") !== "true") return;
    const s = "background:#7b1fa2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data != null
      ? console.log(`%c[Currency]%c ${msg}`, s, "", data)
      : console.log(`%c[Currency]%c ${msg}`, s, "");
  }

  // ─── Preferences ─────────────────────────────────────────────────────────

  function getSelectedCurrency() {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch {}
    return BASE_CURRENCY;
  }

  function saveSelectedCurrency(currency) {
    try { localStorage.setItem(PREF_KEY, currency); } catch {}
  }

  // ─── Exchange rates ───────────────────────────────────────────────────────

  function getCachedRates() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { rates, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return rates;
    } catch {}
    return null;
  }

  function setCachedRates(rates) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() })); } catch {}
  }

  async function fetchRates() {
    const cached = getCachedRates();
    if (cached) { log("Using cached rates"); return cached; }

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

  // ─── Price parsing ────────────────────────────────────────────────────────

  // Parse a EUR price from a Dutch/European formatted string.
  // Handles: "€ 19,95", "€19,95", "€ 1.234,56"
  // Dot = thousands separator, comma = decimal separator.
  function parseEurAmount(text) {
    const cleaned = text.replace(/[€$£¥\s\u00a0]/g, "");
    if (!cleaned || !/\d/.test(cleaned)) return null;
    // European format: comma is decimal separator, dot is thousands separator
    const normalised = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/[^\d.]/g, "");
    const amount = parseFloat(normalised);
    return isNaN(amount) || amount <= 0 ? null : amount;
  }

  // ─── Price formatting ─────────────────────────────────────────────────────

  function formatPrice(amount, currency) {
    try {
      return new Intl.NumberFormat(navigator.language || "en", {
        style: "currency",
        currency,
        minimumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
        maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
      }).format(amount);
    } catch {
      return `${CURRENCIES[currency]?.symbol ?? currency} ${amount.toFixed(ZERO_DECIMAL.has(currency) ? 0 : 2)}`;
    }
  }

  // Replace the visible price text inside an element while preserving child structure.
  // Targeting the text node emits only characterData mutations, not childList, so our
  // MutationObserver (which watches childList) cannot be triggered by this call.
  function setPriceText(el, text) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (/\d/.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const node = walker.nextNode();
    if (node) { node.textContent = text; }
    else { el.textContent = text; }
  }

  // ─── Price conversion ─────────────────────────────────────────────────────

  // Schema.org elements: authoritative EUR price lives in the `content` attribute.
  function convertSchemaPrices(currency, rates) {
    const rate = rates[currency];
    if (rate == null) return;
    const els = document.querySelectorAll("[itemprop='price'][content]");
    log(`Schema: converting ${els.length} price(s) → ${currency}`);
    for (const el of els) {
      const base = parseFloat(el.getAttribute("content"));
      if (!base || base <= 0) continue;
      setPriceText(el, formatPrice(base * rate, currency));
    }
  }

  // Display-only price elements: parse EUR from text once, cache in data-pm-eur.
  function convertDisplayPrices(currency, rates) {
    const rate = rates[currency];
    if (rate == null) return;
    const els = document.querySelectorAll(DISPLAY_PRICE_SELECTORS);
    log(`Display: converting ${els.length} price(s) → ${currency}`);
    for (const el of els) {
      if (!el.dataset.pmEur) {
        const amount = parseEurAmount(el.textContent);
        if (amount == null) continue;
        el.dataset.pmEur = String(amount);
      }
      const base = parseFloat(el.dataset.pmEur);
      if (isNaN(base)) continue;
      setPriceText(el, formatPrice(base * rate, currency));
    }
  }

  // Mixed text+price elements: replace all €-prices in a sentence via regex.
  // Original text is stored in data-pm-original-text on first encounter so that
  // switching currencies multiple times always converts from the EUR source.
  function convertTextPrices(currency, rates) {
    const rate = rates[currency];
    if (rate == null) return;
    const els = document.querySelectorAll(TEXT_PRICE_SELECTORS);
    log(`Text: converting ${els.length} element(s) → ${currency}`);
    for (const el of els) {
      if (!el.dataset.pmOriginalText) {
        el.dataset.pmOriginalText = el.textContent;
      }
      if (currency === BASE_CURRENCY) {
        el.textContent = el.dataset.pmOriginalText;
        continue;
      }
      el.textContent = el.dataset.pmOriginalText.replace(
        /€\s*([\d.,]+)/g,
        (_match, priceStr) => {
          const normalised = priceStr.replace(/\./g, "").replace(",", ".");
          const amount = parseFloat(normalised);
          if (isNaN(amount) || amount <= 0) return _match;
          return formatPrice(amount * rate, currency);
        }
      );
    }
  }

  function convertAllPrices(currency, rates) {
    convertSchemaPrices(currency, rates);
    convertDisplayPrices(currency, rates);
    convertTextPrices(currency, rates);
  }

  // ─── MutationObserver for SPA-added price elements ────────────────────────

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

          // Schema.org prices
          const schemaCandidates = node.matches("[itemprop='price'][content]")
            ? [node]
            : [...node.querySelectorAll("[itemprop='price'][content]")];
          for (const el of schemaCandidates) {
            const base = parseFloat(el.getAttribute("content"));
            if (base > 0) setPriceText(el, formatPrice(base * rate, currency));
          }

          // Display-only prices
          const displayCandidates = node.matches(DISPLAY_PRICE_SELECTORS)
            ? [node]
            : [...node.querySelectorAll(DISPLAY_PRICE_SELECTORS)];
          for (const el of displayCandidates) {
            const amount = parseEurAmount(el.textContent);
            if (amount == null) continue;
            el.dataset.pmEur = String(amount);
            setPriceText(el, formatPrice(amount * rate, currency));
          }

          // Text+price elements
          const textCandidates = node.matches(TEXT_PRICE_SELECTORS)
            ? [node]
            : [...node.querySelectorAll(TEXT_PRICE_SELECTORS)];
          for (const el of textCandidates) {
            el.dataset.pmOriginalText = el.textContent;
            el.textContent = el.textContent.replace(
              /€\s*([\d.,]+)/g,
              (_match, priceStr) => {
                const normalised = priceStr.replace(/\./g, "").replace(",", ".");
                const amount = parseFloat(normalised);
                if (isNaN(amount) || amount <= 0) return _match;
                return formatPrice(amount * rate, currency);
              }
            );
          }

          // Price filter inputs — mount proxy if the filter just appeared in the DOM.
          if (
            node.matches(".ec-filter__price-from, .ec-filter__price-to") ||
            node.querySelector(".ec-filter__price-from, .ec-filter__price-to")
          ) {
            mountPriceFilterProxy();
          }
        }
      }
    });

    const attach = () => observer.observe(document.body, { childList: true, subtree: true });
    document.body ? attach() : document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
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

  // ─── Select builder ───────────────────────────────────────────────────────

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

  // ─── Vue lifecycle hook helper ────────────────────────────────────────────

  function hookVueUpdated(el, callback) {
    for (const node of [el, el.parentElement, el.parentElement?.parentElement]) {
      if (!node) continue;

      const inst3 = node.__vueParentComponent ?? node._vueParentComponent;
      if (inst3) {
        if (!Array.isArray(inst3.u)) inst3.u = [];
        inst3.u.push(callback);
        log("Hooked into Vue 3 onUpdated");
        return true;
      }

      const inst2 = node.__vue__;
      if (inst2?.$on) {
        inst2.$on("hook:updated", callback);
        log("Hooked into Vue 2 $on hook:updated");
        return true;
      }
    }
    return false;
  }

  // ─── Announcement bar switcher ────────────────────────────────────────────

  function mountBarSwitcher() {
    function doBarInject(el) {
      // Dropdown already present — nothing to do.
      if (el.querySelector(".pm-currency__bar-wrap")) return;

      injectStyles();
      el.textContent = ""; // clear Vue's rendered currency text

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
      el.appendChild(wrap);

      select.addEventListener("change", () => {
        saveSelectedCurrency(select.value);
        if (cachedRates) convertAllPrices(select.value, cachedRates);
        teardownPriceFilterProxy();
        mountPriceFilterProxy();
        log(`Currency changed to ${select.value}`);
      });

      log("Bar switcher injected");
    }

    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const el = document.querySelector(".announcement-bar__currency");

      if (el) {
        clearInterval(poll);

        // Observe el itself: Vue re-renders by replacing children of el
        // (our span → text node), which is a childList mutation on el, not its parent.
        const obs = new MutationObserver(() => doBarInject(el));
        obs.observe(el, { childList: true });

        // Belt-and-suspenders: also hook Vue's updated() lifecycle if accessible.
        hookVueUpdated(el, () => doBarInject(el));

        doBarInject(el);
        return;
      }

      if (attempts >= 60) {
        clearInterval(poll);
        log("Announcement bar not found after polling");
      }
    }, POLL_INTERVAL);
  }

  // ─── Price filter proxy ───────────────────────────────────────────────────
  //
  // Ecwid's price filter only works in EUR. To let users type in their chosen
  // currency we:
  //   1. Hide the real Ecwid inputs (they stay in the DOM, Ecwid reads them in EUR).
  //   2. Insert visible proxy inputs that display / accept values in the selected currency.
  //   3. Proxy → real: on user input, divide by rate and write to real input, then
  //      fire input + change events so Ecwid picks up the update.
  //   4. Real → proxy: intercept programmatic `.value` sets (slider drag) and mirror
  //      the converted value to the proxy.
  //   5. On currency change or teardown: remove proxies, restore real inputs.

  function teardownPriceFilterProxy() {
    document.querySelectorAll(`.${PROXY_CLASS}`).forEach(proxy => proxy.remove());
    document.querySelectorAll(".ec-filter__price-from input, .ec-filter__price-to input").forEach(input => {
      input.style.display = "";
      // Remove the instance-level value property we patched, restoring prototype behaviour.
      try { delete input.value; } catch {}
    });
  }

  function mountPriceFilterProxy() {
    if (!cachedRates) return;

    const currency = getSelectedCurrency();

    // If EUR is selected the proxy is unnecessary — real inputs already use EUR.
    if (currency === BASE_CURRENCY) {
      teardownPriceFilterProxy();
      return;
    }

    const rate = cachedRates[currency];
    if (rate == null) return;

    const fromWrapper = document.querySelector(".ec-filter__price-from");
    const toWrapper   = document.querySelector(".ec-filter__price-to");
    if (!fromWrapper || !toWrapper) return;
    if (fromWrapper.querySelector(`.${PROXY_CLASS}`)) return; // already mounted

    const fromInput = fromWrapper.querySelector("input");
    const toInput   = toWrapper.querySelector("input");
    if (!fromInput || !toInput) return;

    function eurToDisplay(v) {
      const n = parseFloat(v);
      if (isNaN(n) || n <= 0) return "";
      return String(Math.round(n * rate * 100) / 100);
    }

    function displayToEur(v) {
      const n = parseFloat(v);
      if (isNaN(n) || n <= 0) return "";
      return String(Math.round((n / rate) * 100) / 100);
    }

    // Guard: prevents our patched setter from updating the proxy while we ourselves
    // are writing to the real input (and firing events that make Ecwid echo the value back).
    let proxyIsSyncing = false;

    function createProxy(realInput) {
      const proxy = document.createElement("input");
      proxy.className = realInput.className + ` ${PROXY_CLASS}`;
      proxy.type = "number";
      proxy.setAttribute("aria-label", realInput.getAttribute("aria-label") ?? "");
      proxy.autocomplete = "off";
      // Hide the real input — keep it in the DOM so Ecwid can submit its EUR value.
      realInput.style.display = "none";
      realInput.parentNode.insertBefore(proxy, realInput);
      return proxy;
    }

    const fromProxy = createProxy(fromInput);
    const toProxy   = createProxy(toInput);

    // Intercept slider / programmatic updates to real inputs → mirror to proxy.
    // The proxyIsSyncing guard prevents re-entrancy: when we fire input/change events
    // after writing to the real input, Ecwid may echo the value back through this setter.
    // Without the guard that would reconvert EUR → display currency, overwriting the user's input.
    function patchValueSetter(realInput, proxyInput) {
      Object.defineProperty(realInput, "value", {
        configurable: true,
        set(v) {
          INPUT_VALUE_DESCRIPTOR.set.call(this, v);
          if (!proxyIsSyncing) proxyInput.value = eurToDisplay(v);
        },
        get() {
          return INPUT_VALUE_DESCRIPTOR.get.call(this);
        },
      });
    }

    patchValueSetter(fromInput, fromProxy);
    patchValueSetter(toInput,   toProxy);

    // User types in proxy → convert to EUR → write to real input → notify Ecwid.
    function syncProxyToReal(proxyInput, realInput) {
      proxyIsSyncing = true;
      INPUT_VALUE_DESCRIPTOR.set.call(realInput, displayToEur(proxyInput.value));
      realInput.dispatchEvent(new Event("input",  { bubbles: true }));
      realInput.dispatchEvent(new Event("change", { bubbles: true }));
      proxyIsSyncing = false;
    }

    fromProxy.addEventListener("input", () => syncProxyToReal(fromProxy, fromInput));
    toProxy.addEventListener("input",   () => syncProxyToReal(toProxy,   toInput));

    // Populate proxy with any value the real input already has.
    if (fromInput.value) fromProxy.value = eurToDisplay(fromInput.value);
    if (toInput.value)   toProxy.value   = eurToDisplay(toInput.value);

    log("Price filter proxy mounted");
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  mountBarSwitcher();
  watchForNewPrices();

  fetchRates().then((rates) => {
    if (!rates) return;
    cachedRates = rates;
    convertAllPrices(getSelectedCurrency(), rates);
    mountPriceFilterProxy();
  });

  window.Ecwid?.OnPageLoaded?.add((page) => {
    log("OnPageLoaded", page.type);
    if (cachedRates) {
      setTimeout(() => {
        convertAllPrices(getSelectedCurrency(), cachedRates);
        mountPriceFilterProxy();
      }, 150);
    }
  });

  log("Currency switcher initialised");
}
