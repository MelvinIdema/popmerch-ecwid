export function initReplacePager() {
  const PRODUCTS_SELECTOR = ".ec-filters__products";
  const CLONE_ATTR = "data-pager-clone";

  let observer = null;
  let syncScheduled = false;

  function getRealPager() {
    // Select the real pager — never our clone.
    return document.querySelector(`.ec-pager:not([${CLONE_ATTR}])`);
  }

  function getClone() {
    return document.querySelector(`[${CLONE_ATTR}]`);
  }

  function buildClone(realPager) {
    const clone = realPager.cloneNode(true);
    clone.setAttribute(CLONE_ATTR, "");

    // Delegate clicks back to the corresponding button in the real pager.
    // cloneNode does not copy Vue event listeners, so we re-wire manually.
    clone.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page-number]");
      if (!btn) return;
      e.preventDefault();
      realPager.querySelector(`[data-page-number="${btn.getAttribute("data-page-number")}"]`)?.click();
    });

    return clone;
  }

  function syncClone() {
    syncScheduled = false;
    const realPager = getRealPager();
    const existingClone = getClone();
    if (!realPager || !existingClone) return;
    existingClone.replaceWith(buildClone(realPager));
  }

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(syncClone);
  }

  function attach() {
    // Tear down any previous observer and clone before re-attaching.
    observer?.disconnect();
    observer = null;
    getClone()?.remove();

    const realPager = getRealPager();
    if (!realPager) return;

    const products = document.querySelector(PRODUCTS_SELECTOR);
    if (!products) return;

    products.appendChild(buildClone(realPager));

    // Watch the real pager for any DOM change and keep the clone in sync.
    // Debounced to one rAF to avoid rebuilding for every mutation in a batch.
    observer = new MutationObserver(scheduleSync);
    observer.observe(realPager, { childList: true, subtree: true, attributes: true });
  }

  function cleanup() {
    observer?.disconnect();
    observer = null;
    syncScheduled = false;
    getClone()?.remove();
  }

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] replace-pager: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CATEGORY") {
      cleanup();
      return;
    }

    // Defer one frame to let Vue finish committing the DOM.
    window.requestAnimationFrame(attach);
  });
}
