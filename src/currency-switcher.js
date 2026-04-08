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
      currentBarSelect = select;

      const arrow = document.createElement("span");
      arrow.className = "pm-currency__bar-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "▼";

      wrap.appendChild(select);
      wrap.appendChild(arrow);
      currencyEl.appendChild(wrap);

      select.addEventListener("change", () => {
        saveSelectedCurrency(select.value);
        if (cachedRates) convertAllPrices(select.value, cachedRates);
        log(`Currency changed to ${select.value}`);
      });

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

  // ─── Boot ─────────────────────────────────────────────────────────────────

  mountBarSwitcher();
  watchForNewPrices();

  fetchRates().then((rates) => {
    if (!rates) return;
    cachedRates = rates;
    convertAllPrices(getSelectedCurrency(), rates);
  });

  window.Ecwid?.OnPageLoaded?.add((page) => {
    log("OnPageLoaded", page.type);
    if (cachedRates) {
      setTimeout(() => convertAllPrices(getSelectedCurrency(), cachedRates), 150);
    }
  });

  log("Currency switcher initialised");
}
