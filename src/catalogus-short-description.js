export function initCatalogusShortDescription() {
  const GRID_DESCRIPTION_SELECTOR = ".grid__description-inner";
  const PAGE_TITLE_SELECTOR = ".ec-page-title";
  const SHORT_DESCRIPTION_CLASS = "ec-page-short_description";
  const BLOCKQUOTE_HIDDEN_CLASS = "ec-page-short_description__source--hidden";
  const STYLES_ID = "popmerch-short-description-styles";

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = STYLES_ID;
    // Hide the source blockquote in the grid description to avoid showing it twice.
    style.textContent = `.${BLOCKQUOTE_HIDDEN_CLASS} { display: none !important; }`;
    document.head.appendChild(style);
  }

  function cleanup() {
    document.querySelector(`.${SHORT_DESCRIPTION_CLASS}`)?.remove();
    // Un-hide the source blockquote so it is available for the next extraction.
    document.querySelector(`.${BLOCKQUOTE_HIDDEN_CLASS}`)?.classList.remove(BLOCKQUOTE_HIDDEN_CLASS);
  }

  function processShortDescription() {
    // Always clean up first — Vue does not remove elements we injected outside
    // its virtual DOM when navigating or paginating.
    cleanup();

    const descriptionInner = document.querySelector(GRID_DESCRIPTION_SELECTOR);
    if (!descriptionInner) return;

    // Only act when the first direct child is a blockquote.
    const blockquote = descriptionInner.firstElementChild;
    if (!blockquote || blockquote.tagName !== "BLOCKQUOTE") return;

    const pageTitle = document.querySelector(PAGE_TITLE_SELECTOR);
    if (!pageTitle) return;

    // Hide rather than remove — keeps the node in Vue's DOM so it is
    // findable again on the next OnPageLoaded (e.g. pagination within the
    // same category where Vue only re-renders the product grid, not the
    // category description).
    blockquote.classList.add(BLOCKQUOTE_HIDDEN_CLASS);
    injectStyles();

    // Build div.ec-page-short_description > p and insert after ec-page-title.
    const p = document.createElement("p");
    p.innerHTML = blockquote.innerHTML;

    const div = document.createElement("div");
    div.classList.add(SHORT_DESCRIPTION_CLASS);
    div.appendChild(p);

    pageTitle.parentNode.insertBefore(div, pageTitle.nextSibling);
  }

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] catalogus-short-description: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CATEGORY") {
      // Navigating away — clean up in case Vue left our div behind.
      window.requestAnimationFrame(cleanup);
      return;
    }

    // Defer one frame to let Vue finish committing the DOM.
    window.requestAnimationFrame(processShortDescription);
  });
}
