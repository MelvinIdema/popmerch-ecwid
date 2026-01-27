// ===== Config =====
const PUBLIC_TOKEN = "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf";
const OPTION_NAME = "Size"; // matcht name="Size" in je HTML
const CACHE_TTL_MS = 60_000;

const POLL_STEP_MS = 50;
const POLL_TIMEOUT_MS = 10_000;

// ===== Utils =====
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getStoreIdSafe() {
  try {
    const id = window.Ecwid?.getOwnerId?.();
    return typeof id === "number" && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function getProductIdFromUrl() {
  // Ecwid product urls bevatten vaak "...-p800716701"
  const path = window.location.pathname || "";
  const m = path.match(/-p(\d+)\b/i) || path.match(/\/p(\d+)\b/i);
  return m ? Number(m[1]) : null;
}

async function waitForEcwidReady() {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const ok =
      window.Ecwid &&
      typeof window.Ecwid.OnPageLoaded?.add === "function" &&
      typeof window.Ecwid.getOwnerId === "function" &&
      getStoreIdSafe();

    if (ok) return;
    await sleep(POLL_STEP_MS);
  }
  console.warn("[popmerch] Ecwid niet beschikbaar binnen timeout");
}

async function fetchCombinations(storeId, productId) {
  const url =
    `https://app.ecwid.com/api/v3/${storeId}/products/${productId}/combinations` +
    `?responseFields=items(options,inStock,quantity,unlimited)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PUBLIC_TOKEN}` },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

function buildAvailabilityMap(combinations) {
  // Map: "S" -> true/false (in stock)
  const map = new Map();
  for (const comb of combinations) {
    const opt = comb?.options?.find((o) => o?.name === OPTION_NAME);
    if (!opt?.value) continue;

    const inStock =
      comb?.unlimited === true ||
      comb?.inStock === true ||
      (typeof comb?.quantity === "number" && comb.quantity > 0);

    map.set(opt.value, !!inStock);
  }
  return map;
}

function applyDisabledMap(map) {
  const selector = `input.form-control__radio[name="${CSS.escape(
    OPTION_NAME
  )}"]`;

  const inputs = document.querySelectorAll(selector);
  if (!inputs.length) return;

  inputs.forEach((input) => {
    const val = input.value;
    if (!map.has(val)) return; // onbekend = laat zoals het is

    const disabled = map.get(val) === false;
    input.disabled = disabled;

    const wrapper =
      input.closest(".form-control--checkbox-button") ||
      input.closest(".form-control");

    if (wrapper) {
      wrapper.classList.toggle("ecwid-oos", disabled);
      wrapper.setAttribute("aria-disabled", disabled ? "true" : "false");
    }
  });

  // Als huidige selectie nu disabled is: kies eerste beschikbare
  const checked = document.querySelector(`${selector}:checked`);
  if (checked && checked.disabled) {
    const firstEnabled = Array.from(inputs).find((i) => !i.disabled);
    if (firstEnabled) firstEnabled.click();
  }
}

let observer = null;
function observeAndReapply(reapply) {
  if (observer) observer.disconnect();

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      reapply();
    });
  };

  const root =
    document.querySelector(".product-details-size__sizes") || document.body;

  observer = new MutationObserver(schedule);
  observer.observe(root, { subtree: true, childList: true });
}

async function runForProduct(productId) {
  const storeId = getStoreIdSafe();
  if (!storeId || !productId) return;

  const cacheKey = `ecwid-combos:${storeId}:${productId}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { t, items } = JSON.parse(cached);
      if (Date.now() - t < CACHE_TTL_MS && Array.isArray(items)) {
        const map = buildAvailabilityMap(items);
        applyDisabledMap(map);
        observeAndReapply(() => applyDisabledMap(map));
        return;
      }
    } catch {
      // ignore cache parse errors
    }
  }

  let items = [];
  try {
    items = await fetchCombinations(storeId, productId);
    sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), items }));
  } catch {
    return; // fail silently: UX > console drama
  }

  // Geen combinations? Dan is er (nog) geen per-variatie voorraad om op te disablen.
  if (!items.length) return;

  const map = buildAvailabilityMap(items);
  applyDisabledMap(map);
  observeAndReapply(() => applyDisabledMap(map));
}

// ===== Init =====
(async function init() {
  await waitForEcwidReady();

  // 1) Als je direct op product-URL binnenkomt, fix meteen (ook als events al geweest zijn)
  const pidFromUrl = getProductIdFromUrl();
  if (pidFromUrl) runForProduct(pidFromUrl);

  // 2) En bij elke product page load
  window.Ecwid.OnPageLoaded.add((page) => {
    if (page?.type === "PRODUCT" && page?.productId) {
      runForProduct(page.productId);
    }
  });
})();
