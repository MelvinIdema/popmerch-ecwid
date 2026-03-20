/**
 * Popmerch Address Validation Probe V1
 *
 * Phase 1: passive logging only.
 * - No DOM writes
 * - No observers
 * - No input listeners
 * - No API calls
 *
 * Goal:
 * Verify that merely attaching to the Ecwid checkout lifecycle does not
 * break the checkout address page render.
 */

export function initAddressValidation() {
  const MODULE_MODE = "passive-probe";
  const POLL_INTERVAL = 50;
  const POLL_TIMEOUT = 10_000;

  function isDebug() {
    try {
      return localStorage.getItem("ADDR_DEBUG") === "true";
    } catch {
      return false;
    }
  }

  function isModuleDisabled() {
    try {
      return localStorage.getItem("ADDR_DISABLED") === "true";
    } catch {
      return false;
    }
  }

  function log(msg, data = null) {
    if (!isDebug()) return;
    const style =
      "background:#2e7d32;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    data
      ? console.log(`%c[AddrVal]%c ${msg}`, style, "", data)
      : console.log(`%c[AddrVal]%c ${msg}`, style, "");
  }

  function logError(msg, err) {
    const style =
      "background:#c62828;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;";
    console.error(`%c[AddrVal]%c ${msg}`, style, "", err);
  }

  async function waitForEcwid() {
    const start = Date.now();

    while (Date.now() - start < POLL_TIMEOUT) {
      if (window.Ecwid?.OnAPILoaded?.add && window.Ecwid?.OnPageLoaded?.add) return true;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    logError("Ecwid not available within timeout", new Error("timeout"));
    return false;
  }

  function updateStatus(patch) {
    window.POPMERCH_ADDR_VALIDATION_STATUS = {
      ...(window.POPMERCH_ADDR_VALIDATION_STATUS || {}),
      mode: MODULE_MODE,
      ...patch,
    };
  }

  function onPageLoaded(page) {
    const pageType = page?.type || null;

    updateStatus({
      initialized: true,
      lastPageType: pageType,
      lastEventAt: new Date().toISOString(),
      onCheckoutAddressPage: pageType === "CHECKOUT_ADDRESS",
    });

    log("Ecwid page loaded", { type: pageType });

    if (pageType === "CHECKOUT_ADDRESS") {
      console.info("[Popmerch] Address probe reached CHECKOUT_ADDRESS");
    }
  }

  if (isModuleDisabled()) {
    console.info("[Popmerch] Address validation disabled via localStorage");
    updateStatus({
      initialized: false,
      disabled: true,
    });
    return;
  }

  updateStatus({
    initialized: false,
    disabled: false,
    waitingForEcwid: true,
  });

  log("Initializing Address Validation Probe");

  (async () => {
    const ready = await waitForEcwid();
    if (!ready) {
      updateStatus({
        waitingForEcwid: false,
        initialized: false,
        failed: true,
      });
      return;
    }

    window.Ecwid.OnAPILoaded.add(() => {
      updateStatus({
        waitingForEcwid: false,
        apiLoaded: true,
      });

      window.Ecwid.OnPageLoaded.add(onPageLoaded);

      updateStatus({
        initialized: true,
      });

      console.info("[Popmerch] Address validation probe initialized");
      log("Address Validation Probe initialized");
    });
  })();
}
