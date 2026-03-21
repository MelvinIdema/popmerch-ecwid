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
    "nl": "EUR", "de": "EUR", "fr": "EUR", "es": "EUR", "it": "EUR",
    "pt": "EUR", "fi": "EUR", "el": "EUR",
    "en-GB": "GBP", "en-IE": "EUR", "en-US": "USD", "en-CA": "CAD", "en-AU": "AUD",
    "sv": "SEK", "no": "NOK", "nb": "NOK", "nn": "NOK", "da": "DKK",
    "pl": "PLN", "cs": "CZK", "hu": "HUF", "ja": "JPY",
    "fr-CH": "CHF", "de-CH": "CHF", "it-CH": "CHF",
  };

  const ZERO_DECIMAL = new Set(["JPY", "HUF"]);

  // ─── Module-level mutable state ───────────────────────────────────────────
  let cachedRates = null;
  let currentBarSelect = null; // always points to the live bar <select>
  let inlineSyncFn = null;     // product-page listener, replaced on each SPA nav

  // The bar's syncFn is added once and never removed.
  // The inline syncFn is removed on nav and re-added on mount.
  const syncListeners = new Set();

  // ─── Debug ────────────────────────────────────────────────────────────────

  function log(msg, data = null) {
    if (localStorage.getItem("CURRENCY_DEBUG") !== "true") return;
    const s = "background:#7b1fa2;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data != null
      ? console.log(`%c[Currency]%c ${msg}`, s, "", data)
      : console.log(`%c[Currency]%c ${msg}`, s, "");
  }

  // ─── Preferences ─────────────────────────────────────────────────────────

  function detectBrowserCurrency() {
    const lang = navigator.language || "en";
    if (LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];
    return LOCALE_CURRENCY_MAP[lang.split("-")[0]] || BASE_CURRENCY;
  }

  function getSelectedCurrency() {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch {}
    return detectBrowserCurrency();
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

  // ─── Price conversion ─────────────────────────────────────────────────────

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

  // Reconvert every schema.org price element on the page.
  // `content` attribute always holds the authoritative EUR price set by Ecwid.
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

  // Convert prices in elements newly added by Ecwid's SPA navigation.
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
          const candidates = node.matches("[itemprop='price'][content]")
            ? [node]
            : [...node.querySelectorAll("[itemprop='price'][content]")];
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

  // ─── Currency change handler ──────────────────────────────────────────────

  function onCurrencyChange(currency, sourceFn) {
    saveSelectedCurrency(currency);
    for (const fn of syncListeners) {
      if (fn !== sourceFn) fn(currency);
    }
    if (cachedRates) convertAllPrices(currency, cachedRates);
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

  // ─── Shared select builder ────────────────────────────────────────────────

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
  //
  // Instead of fighting Vue with a MutationObserver, we hook directly into the
  // Vue component's updated() lifecycle so we re-inject only when Vue itself has
  // finished a render pass — eliminating the flash.
  //
  // Vue 3  stores onUpdated hooks in instance.u  (array of functions)
  // Vue 2  exposes $on("hook:updated", fn) on the component proxy
  //
  // Returns true if the hook was successfully registered, false if Vue is not
  // accessible (in which case the caller should use a MutationObserver fallback).

  function hookVueUpdated(el, callback) {
    // Walk up a couple of levels to find the owning component instance
    for (const node of [el, el.parentElement, el.parentElement?.parentElement]) {
      if (!node) continue;

      // Vue 3 — internal instance
      const inst3 = node.__vueParentComponent ?? node._vueParentComponent;
      if (inst3) {
        if (!Array.isArray(inst3.u)) inst3.u = [];
        inst3.u.push(callback);
        log("Hooked into Vue 3 onUpdated");
        return true;
      }

      // Vue 2 — public proxy
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
  //
  // Strategy
  // ────────
  // 1. Poll until Vue has hydrated the announcement bar element.
  // 2. Inject our <select> into the currency element.
  // 3. Register an onUpdated hook on the Vue component that owns the bar.
  //    After every Vue re-render we check whether our select survived; if not
  //    we re-inject.  This is the Vue-native approach — no MutationObserver needed.
  // 4. If Vue internals are not accessible (unlikely but safe), fall back to a
  //    targeted MutationObserver on the currency element's parent.
  //
  // The persistent barSyncFn closes over `currentBarSelect` (a mutable ref),
  // so it stays valid across re-injections without ever leaving syncListeners.

  function mountBarSwitcher() {
    const barSyncFn = (currency) => {
      if (currentBarSelect) currentBarSelect.value = currency;
    };
    syncListeners.add(barSyncFn);

    function doBarInject(currencyEl) {
      if (currencyEl.querySelector(".pm-currency__bar-wrap")) return; // already present

      injectStyles();
      currencyEl.textContent = ""; // clear Vue's "EUR" text node

      const wrap = document.createElement("span");
      wrap.className = "pm-currency__bar-wrap";

      const select = document.createElement("select");
      select.className = "pm-currency__bar-select";
      select.setAttribute("aria-label", "Select display currency");
      buildSelectOptions(select, getSelectedCurrency());
      currentBarSelect = select; // update the module-level mutable ref

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

        // Primary: hook into Vue's updated() lifecycle — re-inject after each render
        const hooked = hookVueUpdated(currencyEl, () => doBarInject(currencyEl));

        if (!hooked) {
          // Fallback: watch only the currency element's immediate parent, not all of body
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

  // ─── Inline product-page switcher ────────────────────────────────────────

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

    const syncFn = (currency) => { select.value = currency; };
    inlineSyncFn = syncFn;
    syncListeners.add(syncFn);

    select.addEventListener("change", () => onCurrencyChange(select.value, syncFn));
    log("Inline switcher mounted");
  }

  // ─── Product page handler ─────────────────────────────────────────────────

  function handleProductPage() {
    document.getElementById(INLINE_ID)?.remove();

    // Remove only the inline listener — the persistent bar listener must stay
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

  // ─── Boot ─────────────────────────────────────────────────────────────────

  mountBarSwitcher();   // Vue-lifecycle-aware bar select
  watchForNewPrices();  // MutationObserver for SPA-added price elements

  fetchRates().then((rates) => {
    if (!rates) return;
    cachedRates = rates;
    convertAllPrices(getSelectedCurrency(), rates);
  });

  window.Ecwid?.OnPageLoaded?.add((page) => {
    log("OnPageLoaded", page.type);
    if (page.type === "PRODUCT") {
      handleProductPage();
    } else if (cachedRates) {
      setTimeout(() => convertAllPrices(getSelectedCurrency(), cachedRates), 150);
    }
  });

  log("Currency switcher initialised");
}
