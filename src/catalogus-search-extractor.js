export function initCatalogusSearchExtractor() {
  const GRID_SORT_SELECTOR = ".grid__sort.ec-text-muted";
  // Cast a wide net — on mobile the input may not carry type="text" explicitly,
  // and the class structure can differ. We'll verify it's an <input> in findRealInput.
  const REAL_INPUT_SELECTOR =
    ".ec-filter--search input, .ec-filters input";
  // Covers both the main apply button and the mobile sticky-bar variant
  const APPLY_BTN_SELECTOR =
    ".filter-section-button-container .form-control__button, .filter-section-sticky-bar .form-control__button";
  const FILTER_TOGGLE_SELECTOR = ".grid-sort__item--filter";
  const FILTER_POPUP_SELECTOR = ".ec-filters--popup";
  const GHOST_STYLE_ID = "pm-search-ghost-style";
  const STYLES_ID = "popmerch-search-proxy-styles";
  const PROXY_ID = "pm-search-proxy";
  const BUTTONS_WRAPPER_CLASS = "pm-sort-buttons";

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function findRealInput() {
    for (const el of document.querySelectorAll(REAL_INPUT_SELECTOR)) {
      if (el instanceof HTMLInputElement) return el;
    }
    return null;
  }

  function setNativeValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter ? setter.call(input, value) : (input.value = value);
  }

  // ─── Search trigger ──────────────────────────────────────────────────────────

  // Resolves with the first matching HTMLInputElement once it appears in the DOM.
  function waitForRealInput(timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
      // Already there? (desktop sidebar case)
      const existing = findRealInput();
      if (existing) return resolve(existing);

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("timeout waiting for filter input"));
      }, timeoutMs);

      const observer = new MutationObserver(() => {
        const el = findRealInput();
        if (el) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Clamp the filter popup to invisible + no transitions so we can open/apply
  // programmatically without the user seeing any drawer flash.
  function ghostOn() {
    if (document.getElementById(GHOST_STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = GHOST_STYLE_ID;
    s.textContent = `
      ${FILTER_POPUP_SELECTOR} {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(s);
  }

  function ghostOff() {
    document.getElementById(GHOST_STYLE_ID)?.remove();
  }

  function applyValue(realInput, value) {
    setNativeValue(realInput, value);
    realInput.dispatchEvent(new Event("input", { bubbles: true }));
    realInput.dispatchEvent(new Event("change", { bubbles: true }));

    const applyBtn = document.querySelector(APPLY_BTN_SELECTOR);
    if (applyBtn) {
      applyBtn.click(); // works on hidden elements; Ecwid closes the popup itself
    } else {
      realInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })
      );
    }
  }

  function triggerSearch(value) {
    const realInput = findRealInput();

    if (realInput) {
      // Input already in the DOM (desktop sidebar is always rendered)
      applyValue(realInput, value);
      return;
    }

    // Mobile v-if: popup content doesn't exist until opened.
    // Open it invisibly, wait for the input to render, apply, done.
    const toggle = document.querySelector(FILTER_TOGGLE_SELECTOR);
    if (!toggle) {
      console.warn("[Popmerch] proxy search: filter toggle not found");
      return;
    }

    ghostOn();
    toggle.click(); // triggers Ecwid to v-if render the popup content

    waitForRealInput()
      .then((input) => {
        // One extra frame — Vue's Suspense resolves before the full subtree is patched
        requestAnimationFrame(() => {
          applyValue(input, value);
          requestAnimationFrame(ghostOff);
        });
      })
      .catch((err) => {
        console.warn("[Popmerch] proxy search:", err.message);
        ghostOff();
      });
  }

  // ─── Proxy element ───────────────────────────────────────────────────────────

  function createProxy() {
    const wrapper = document.createElement("div");
    wrapper.id = PROXY_ID;
    wrapper.setAttribute("role", "search");

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Zoeken in producten…";
    input.setAttribute("aria-label", "Zoeken in producten");

    // Pre-fill if the real input already has a value (e.g. after page restore)
    const realInput = findRealInput();
    if (realInput?.value) input.value = realInput.value;

    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Zoeken");
    btn.type = "button";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.5"/>
      <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        triggerSearch(input.value);
      }
    });

    btn.addEventListener("click", () => triggerSearch(input.value));

    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    return wrapper;
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      /* Toolbar: search left, buttons right on desktop */
      .grid__sort.ec-text-muted {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 16px;
        margin-bottom: 16px;
      }

      /* Proxy search bar */
      #${PROXY_ID} {
        display: flex;
        align-items: center;
        background-color: #f5f5f5;
        border: 1px solid #8faec6;
        border-radius: 3px;
        box-shadow: 0 0 0 rgba(0,0,0,0) inset;
        flex: 1 1 200px;
        max-width: 340px;
        box-sizing: border-box;
        transition: background-color 0.15s ease-out;
      }

      #${PROXY_ID}:focus-within {
        background-color: #eef2f6;
      }

      #${PROXY_ID} input {
        flex: 1;
        border: none;
        outline: none;
        padding: 8px 12px;
        font-size: inherit;
        font-family: inherit;
        line-height: calc(8px + 1.15em);
        background: transparent;
        color: #686868;
        min-width: 0;
      }

      #${PROXY_ID} input::placeholder {
        color: #aaa;
      }

      #${PROXY_ID} button {
        flex-shrink: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        color: #8faec6;
        transition: color 0.15s;
      }

      #${PROXY_ID} button:hover {
        color: #686868;
      }

      /* Keep sort/filter buttons together */
      .${BUTTONS_WRAPPER_CLASS} {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      /* Mobile: stack — buttons on top, search below */
      @media (max-width: 768px) {
        .grid__sort.ec-text-muted {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }

        .${BUTTONS_WRAPPER_CLASS} {
          width: 100%;
          order: 0;
        }

        /* Make the two sort/filter buttons fill the row equally */
        .${BUTTONS_WRAPPER_CLASS} .form-control {
          flex: 1;
        }

        #${PROXY_ID} {
          max-width: 100%;
          width: 100%;
          flex: none;
          order: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Injection ───────────────────────────────────────────────────────────────

  function inject() {
    if (document.getElementById(PROXY_ID)) return;

    const gridSort = document.querySelector(GRID_SORT_SELECTOR);
    if (!gridSort) return;

    injectStyles();

    // Wrap the existing Ecwid buttons so they stay grouped as one flex row
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = BUTTONS_WRAPPER_CLASS;
    while (gridSort.firstChild) {
      buttonsWrapper.appendChild(gridSort.firstChild);
    }

    // DOM order: proxy (left on desktop) → buttons (right on desktop)
    // Mobile CSS flips via `order`: buttons first, search below
    gridSort.appendChild(createProxy());
    gridSort.appendChild(buttonsWrapper);
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] catalogus-search-extractor: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CATEGORY") return;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(inject);
    });
  });
}
