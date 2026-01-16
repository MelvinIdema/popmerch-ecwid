function whenEcwidReady(cb, { step = 50, timeout = 10000 } = {}) {
  const start = Date.now();

  (function tick() {
    const ok =
      window.Ecwid &&
      Ecwid.OnAPILoaded &&
      typeof Ecwid.OnAPILoaded.add === "function";

    if (ok) return cb();

    if (Date.now() - start > timeout) {
      console.warn("Ecwid niet beschikbaar binnen timeout");
      return;
    }

    setTimeout(tick, step);
  })();
}

whenEcwidReady(() => {
  console.log("Ecwid ready!");
  Ecwid.OnAPILoaded.add(() => {
    console.log("API loaded!");
    Ecwid.OnPageLoaded.add((page) => {
      console.log("Page loaded!", page);
      if (page.type === "PRODUCT") {
        console.log("page type is PRODUCT!");
        // --- Config ---
        const ECWID_PUBLIC_TOKEN = "public_UX3rrCEkswfuu838NrnC8yWWebi1GmWf";
        const OPTION_NAME = "Size"; // komt overeen met name="Size" in jouw HTML

        (async function disableOutOfStockSizes(page) {
          const productId = page?.productId;
          const storeId =
            (window.Ecwid?.getOwnerId?.() ?? null) ||
            (window.instantsite?.getSiteId?.() ?? null);

          if (!storeId || !productId) {
            console.log("No storeId or productId found, skipping...");
            return;
          }

          console.log("storeId", storeId);
          console.log("productId", productId);

          // Kleine cache (1 minuut) om API calls te beperken bij re-renders
          const cacheKey = `ecwid-combos:${storeId}:${productId}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            try {
              const { t, items } = JSON.parse(cached);
              if (Date.now() - t < 60_000 && Array.isArray(items)) {
                applyDisabledMap(buildAvailabilityMap(items));
                observeAndReapply(() =>
                  applyDisabledMap(buildAvailabilityMap(items))
                );
                return;
              }
            } catch (_) {}
          }

          const url =
            `https://app.ecwid.com/api/v3/${storeId}/products/${productId}/combinations` +
            `?responseFields=items(options,inStock,quantity,unlimited)`;

          let items;
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${ECWID_PUBLIC_TOKEN}` },
            });
            if (!res.ok) return; // fail silently: shop UX > console drama
            const data = await res.json();
            items = Array.isArray(data?.items) ? data.items : [];
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ t: Date.now(), items })
            );
          } catch (_) {
            return;
          }

          // Geen variaties/combinations? Dan is er (nog) geen per-variatie voorraad om op te disablen.
          if (!items.length) {
            console.log("No items found... skipping...");
            return;
          }

          const availability = buildAvailabilityMap(items);
          applyDisabledMap(availability);
          observeAndReapply(() => applyDisabledMap(availability));

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
            // Jouw inputs: <input class="form-control__radio" name="Size" value="M" ...>
            const inputs = document.querySelectorAll(
              `input.form-control__radio[name="${CSS.escape(OPTION_NAME)}"]`
            );

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
                wrapper.setAttribute(
                  "aria-disabled",
                  disabled ? "true" : "false"
                );
              }
            });

            // Als de huidige selectie out-of-stock is geworden: selecteer de eerste beschikbare
            const checked = document.querySelector(
              `input.form-control__radio[name="${CSS.escape(
                OPTION_NAME
              )}"]:checked`
            );
            if (checked && checked.disabled) {
              const firstEnabled = Array.from(inputs).find((i) => !i.disabled);
              if (firstEnabled) firstEnabled.click();
            }
          }

          function observeAndReapply(reapply) {
            // Ecwid kan opties her-renderen; observer zorgt dat disabled state teruggezet wordt
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
              document.querySelector(".product-details-size__sizes") ||
              document.body;

            const obs = new MutationObserver(schedule);
            obs.observe(root, { subtree: true, childList: true });
          }
        })(page);
      }
    });
  });
});
