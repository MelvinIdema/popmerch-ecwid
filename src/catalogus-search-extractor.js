export function initCatalogusSearchExtractor() {
  const GRID_SORT_SELECTOR = ".grid__sort.ec-text-muted";
  const REAL_INPUT_SELECTOR = ".ec-filter--search input[type='text'], .ec-filter--search .form-control__text";
  const APPLY_BTN_SELECTOR = ".filter-section-button-container .form-control__button";
  const STYLES_ID = "popmerch-search-proxy-styles";
  const PROXY_ID = "pm-search-proxy";
  const BUTTONS_WRAPPER_CLASS = "pm-sort-buttons";

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
      }

      /* Proxy search bar */
      #${PROXY_ID} {
        display: flex;
        align-items: center;
        border: 2px solid #1a1a1a;
        flex: 1 1 200px;
        max-width: 340px;
        box-sizing: border-box;
      }

      #${PROXY_ID} input {
        flex: 1;
        border: none;
        outline: none;
        padding: 10px 14px;
        font-size: 14px;
        font-family: inherit;
        background: transparent;
        color: #1a1a1a;
        min-width: 0;
      }

      #${PROXY_ID} input::placeholder {
        color: #999;
      }

      #${PROXY_ID} button {
        flex-shrink: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        color: #1a1a1a;
        transition: background 0.15s, color 0.15s;
      }

      #${PROXY_ID} button:hover {
        background: #1a1a1a;
        color: #fff;
      }

      /* Keep sort buttons together */
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
        }

        /* Make the two sort/filter buttons fill the row equally */
        .${BUTTONS_WRAPPER_CLASS} .form-control {
          flex: 1;
        }

        #${PROXY_ID} {
          max-width: 100%;
          width: 100%;
          flex: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findRealInput() {
    const candidates = document.querySelectorAll(REAL_INPUT_SELECTOR);
    // Prefer the first visible one
    for (const el of candidates) {
      if (el instanceof HTMLInputElement) return el;
    }
    return null;
  }

  function triggerSearch(value) {
    const realInput = findRealInput();
    if (!realInput) {
      console.warn("[Popmerch] proxy search: real input not found");
      return;
    }

    // Use native setter so Vue's v-model reactive getter/setter picks it up
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(realInput, value);
    } else {
      realInput.value = value;
    }

    realInput.dispatchEvent(new Event("input", { bubbles: true }));
    realInput.dispatchEvent(new Event("change", { bubbles: true }));

    // Click the Ecwid "Toepassen" apply button if present
    const applyBtn = document.querySelector(APPLY_BTN_SELECTOR);
    if (applyBtn) {
      applyBtn.click();
    } else {
      // Fallback: submit via Enter keypress on the real input
      realInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })
      );
    }
  }

  function createProxy() {
    const wrapper = document.createElement("div");
    wrapper.id = PROXY_ID;
    wrapper.setAttribute("role", "search");

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Zoeken in producten…";
    input.setAttribute("aria-label", "Zoeken in producten");

    // Pre-fill with whatever the real input already has (e.g. after page restore)
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

  function inject() {
    // Guard: already injected
    if (document.getElementById(PROXY_ID)) return;

    const gridSort = document.querySelector(GRID_SORT_SELECTOR);
    if (!gridSort) return;

    injectStyles();

    // Wrap existing button children so they stay grouped as a flex row
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = BUTTONS_WRAPPER_CLASS;
    while (gridSort.firstChild) {
      buttonsWrapper.appendChild(gridSort.firstChild);
    }

    // On desktop: proxy first (left), buttons second (right) via justify-between
    // On mobile: CSS reverses order visually by using column direction (buttons on top)
    gridSort.appendChild(createProxy());
    gridSort.appendChild(buttonsWrapper);
  }

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
