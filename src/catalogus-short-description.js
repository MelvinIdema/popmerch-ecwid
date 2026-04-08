export function initCatalogusShortDescription() {
  const GRID_DESCRIPTION_SELECTOR = ".grid__description-inner";
  const PAGE_TITLE_SELECTOR = ".ec-page-title";
  const SHORT_DESCRIPTION_CLASS = "ec-page-short_description";

  function cleanup() {
    document.querySelector(`.${SHORT_DESCRIPTION_CLASS}`)?.remove();
  }

  function processShortDescription() {
    // Always remove a stale short description first — Vue does not clean up
    // elements we injected outside its virtual DOM when navigating between pages.
    cleanup();

    const descriptionInner = document.querySelector(GRID_DESCRIPTION_SELECTOR);
    if (!descriptionInner) return;

    // Only act when the first direct child is a blockquote
    const blockquote = descriptionInner.firstElementChild;
    if (!blockquote || blockquote.tagName !== "BLOCKQUOTE") return;

    const pageTitle = document.querySelector(PAGE_TITLE_SELECTOR);
    if (!pageTitle) return;

    // Capture inner HTML before removing (preserves inline formatting)
    const blockquoteHTML = blockquote.innerHTML;
    blockquote.remove();

    // Build div.ec-page-short_description > p and insert after ec-page-title
    const p = document.createElement("p");
    p.innerHTML = blockquoteHTML;

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
      // Navigating away from a category — clean up in case Vue left our div behind.
      window.requestAnimationFrame(cleanup);
      return;
    }

    // Defer one frame to let Vue finish committing the DOM
    window.requestAnimationFrame(processShortDescription);
  });
}
