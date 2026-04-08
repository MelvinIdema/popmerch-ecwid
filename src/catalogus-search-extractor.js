export function initCatalogusSearchExtractor() {
  const MOBILE_BREAKPOINT = 768;
  const SEARCH_FILTER_SELECTOR = ".ec-filter.ec-filter--search";
  const PAGE_TITLE_SELECTOR = ".ec-page-title";
  const SHORT_DESCRIPTION_SELECTOR = ".ec-page-short_description";
  const EXTRACTED_CLASS = "ec-filter--extracted-search";
  const STYLES_ID = "popmerch-search-extractor-styles";

  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      .ec-filter--extracted-search {
        width: 100%;
        margin: 12px 0 20px;
        box-sizing: border-box;
      }

      /* Remove the sidebar toggle header — not needed on the page */
      .ec-filter--extracted-search .ec-filter__head {
        display: none;
      }

      /* Remove inner top bar (title + close button + wissen link) */
      .ec-filter--extracted-search .ec-filter__top {
        display: none;
      }

      /* Force the body open — undo any Ecwid animation/transition state */
      .ec-filter--extracted-search .ec-openable-block,
      .ec-filter--extracted-search .ec-openable-block__wrap {
        display: block !important;
        max-height: none !important;
        overflow: visible !important;
        opacity: 1 !important;
      }

      /* Remove wrapper padding added by the sidebar layout */
      .ec-filter--extracted-search .ec-openable-block__wrap-inner {
        padding: 0 !important;
      }

      /* Input border to match the page's button style */
      .ec-filter--extracted-search .ec-filter__keyword-wrap .form-control {
        border: 2px solid #1a1a1a;
        border-radius: 0;
        background: #fff;
      }

      .ec-filter--extracted-search .form-control__text {
        padding: 12px 16px;
        font-size: 15px;
        color: #1a1a1a;
      }

      /* "Toepassen" button styled to match VERFIJNEN OP / SORTEER OP */
      .ec-filter--extracted-search .filter-section-button-container {
        margin-top: 10px;
      }

      .ec-filter--extracted-search .filter-section-button-container .form-control__button {
        width: 100%;
        border: 2px solid #1a1a1a;
        border-radius: 0;
        background: transparent;
        color: #1a1a1a;
        padding: 14px 16px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .ec-filter--extracted-search .filter-section-button-container .form-control__button:hover {
        background: #1a1a1a;
        color: #fff;
      }

      /* Hide the sticky-bar duplicate of the apply button */
      .ec-filter--extracted-search .filter-section-sticky-bar {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function processSearchExtraction() {
    if (!isMobile()) return;

    // Guard: already extracted on this page render
    if (document.querySelector(`.${EXTRACTED_CLASS}`)) return;

    const searchFilter = document.querySelector(SEARCH_FILTER_SELECTOR);
    if (!searchFilter) return;

    // Insert after short description if present, otherwise after the page title
    const anchor =
      document.querySelector(SHORT_DESCRIPTION_SELECTOR) ||
      document.querySelector(PAGE_TITLE_SELECTOR);
    if (!anchor) return;

    searchFilter.classList.add(EXTRACTED_CLASS);
    anchor.parentNode.insertBefore(searchFilter, anchor.nextSibling);

    injectStyles();
  }

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] catalogus-search-extractor: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CATEGORY") return;

    // Defer one frame so catalogus-short-description runs first
    // (it's registered before us, but we both use rAF — a second defer
    // ensures the short description div is in the DOM when we look for it)
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(processSearchExtraction);
    });
  });
}
