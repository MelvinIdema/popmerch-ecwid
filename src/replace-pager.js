export function initReplacePager() {
  const PAGER_SELECTOR = ".ec-pager";
  const PRODUCTS_SELECTOR = ".ec-filters__products";

  function processPager() {
    const pager = document.querySelector(PAGER_SELECTOR);
    if (!pager) {
      return;
    }

    const products = document.querySelector(PRODUCTS_SELECTOR);
    if (!products) {
      return;
    }

    // Don't inject twice on the same page render
    if (products.lastElementChild?.classList.contains("ec-pager")) {
      return;
    }

    // Clone the pager for visual display — cloneNode does not preserve Vue
    // event listeners, so delegate clicks back to the matching button in the
    // original pager via data-page-number.
    const pagerClone = pager.cloneNode(true);
    pagerClone.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page-number]");
      if (!btn) {
        return;
      }
      e.preventDefault();
      const pageNumber = btn.getAttribute("data-page-number");
      const original = pager.querySelector(`[data-page-number="${pageNumber}"]`);
      original?.click();
    });
    products.appendChild(pagerClone);
  }

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] replace-pager: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CATEGORY") {
      return;
    }

    // Defer one frame to let Vue finish committing the DOM
    window.requestAnimationFrame(processPager);
  });
}
