export function initMobileFilterTileStacking() {
  const FILTER_SELECTOR = ".ec-filters.ec-filters--popup.ec-filters--left";
  const TILE_SELECTOR = "#tile-product-details";
  const OPEN_CLASS = "ec-filters--opened";
  const OPEN_ANIMATION_CLASS = "ec-filters--animation-opened";
  const MOBILE_BREAKPOINT = 768;
  const OPEN_Z_INDEX = "9999";
  const CLOSED_Z_INDEX = "3";

  let observer = null;
  let scheduledSync = false;

  function isMobileViewport() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function getFilterElement() {
    return document.querySelector(FILTER_SELECTOR);
  }

  function getTileElement() {
    return document.querySelector(TILE_SELECTOR);
  }

  function isFilterOpen(filterElement) {
    if (!filterElement) {
      return false;
    }

    return (
      filterElement.classList.contains(OPEN_CLASS) ||
      filterElement.classList.contains(OPEN_ANIMATION_CLASS)
    );
  }

  function syncTileZIndex() {
    scheduledSync = false;

    const tileElement = getTileElement();
    if (!tileElement) {
      return;
    }

    const filterElement = getFilterElement();
    const nextZIndex =
      isMobileViewport() && isFilterOpen(filterElement) ? OPEN_Z_INDEX : CLOSED_Z_INDEX;

    if (tileElement.style.zIndex !== nextZIndex) {
      tileElement.style.zIndex = nextZIndex;
    }
  }

  function scheduleSync() {
    if (scheduledSync) {
      return;
    }

    scheduledSync = true;
    window.requestAnimationFrame(syncTileZIndex);
  }

  function startObserver() {
    if (!document.body || observer) {
      return;
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName !== "class") {
          continue;
        }

        scheduleSync();
        return;
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  if (!document.body) {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        startObserver();
        syncTileZIndex();
      },
      { once: true },
    );

    return;
  }

  startObserver();
  syncTileZIndex();
  window.addEventListener("resize", scheduleSync, { passive: true });
}
