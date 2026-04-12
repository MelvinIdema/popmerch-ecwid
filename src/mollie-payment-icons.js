export function initMolliePaymentIcons() {
  // Targets the Mollie payment option by its app_id class — stable regardless of label text or list order.
  const MOLLIE_SELECTOR = ".ec-radiogroup__item--app_id-mollie-pg";
  const INJECTED_ATTR = "data-pm-mollie-icons";

  // SVG data URI for the "and more" badge (three dots on a light card).
  const MORE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 34" width="54" height="34">
    <rect width="54" height="34" rx="4" fill="#f2f2f2" stroke="#e0e0e0" stroke-width="1"/>
    <circle cx="18" cy="17" r="3.5" fill="#999"/>
    <circle cx="27" cy="17" r="3.5" fill="#999"/>
    <circle cx="36" cy="17" r="3.5" fill="#999"/>
  </svg>`;
  const MORE_ICON_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MORE_ICON_SVG)}`;

  const ICONS = [
    { src: "https://www.mollie.com/external/icons/payment-methods/ideal.svg", alt: "iDEAL" },
    { src: "https://cdn.jsdelivr.net/npm/@wp-pay/logos@2.3.2/dist/other/wero/wero-640x360.svg", alt: "Wero" },
    { src: "https://www.mollie.com/external/icons/payment-methods/bancontact.svg", alt: "Bancontact" },
    { src: "https://www.mollie.com/external/icons/payment-methods/przelewy24.svg", alt: "Przelewy24" },
    { src: "https://www.mollie.com/external/icons/payment-methods/kbc.svg", alt: "KBC" },
    { src: "https://www.mollie.com/external/icons/payment-methods/belfius.svg", alt: "Belfius" },
    { src: MORE_ICON_URI, alt: "and more" },
  ];

  function injectIcons() {
    const mollieItem = document.querySelector(MOLLIE_SELECTOR);
    if (!mollieItem || mollieItem.hasAttribute(INJECTED_ATTR)) return false;

    const infoEl = mollieItem.querySelector(".ec-radiogroup__info");
    if (!infoEl) return false;

    const imgs = ICONS.map(
      ({ src, alt }) =>
        `<img class="ecwid-PaymentMethodsBlockSvg" src="${src}" width="54" height="34" alt="${alt}">`
    ).join("");

    infoEl.innerHTML = `<div class="ec-cart__accept ec-cart-accept"><div class="ec-cart-accept__icons"><div>${imgs}</div></div></div>`;
    mollieItem.setAttribute(INJECTED_ATTR, "");
    return true;
  }

  function observeAndInject() {
    if (injectIcons()) return;

    const observer = new MutationObserver(() => {
      if (injectIcons()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop watching after 10 s to avoid leaking the observer.
    setTimeout(() => observer.disconnect(), 10_000);
  }

  if (!window.Ecwid?.OnPageLoaded) {
    console.warn("[Popmerch] mollie-payment-icons: Ecwid API not available");
    return;
  }

  window.Ecwid.OnPageLoaded.add(function (page) {
    if (page.type !== "CHECKOUT") return;
    requestAnimationFrame(observeAndInject);
  });
}
