// ecwid-loader.js
//
// Configure THIS file's URL in Ecwid as customJsUrl.
// This file is the stable entry point — it should rarely if ever need to change.
//
// On every deploy, only two files are updated:
//   - manifest.json       (points to the new runtime bundle)
//   - runtime.[hash].js   (the versioned app bundle)
//
// This loader fetches manifest.json, reads the current runtimeUrl, and injects
// the runtime bundle as a script tag. The manifest is always fetched fresh
// (cache: "no-store") while the runtime bundle is safe to cache indefinitely
// because its URL changes with every deploy.
(function () {
  "use strict";

  // Prevent duplicate injection if Ecwid somehow loads this script twice.
  if (window.__popmerchLoaded) return;
  window.__popmerchLoaded = true;

  // Capture the base URL synchronously — document.currentScript is only valid
  // during the initial synchronous execution of this script, not in callbacks.
  var base = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.slice(0, s.src.lastIndexOf("/") + 1);
    console.warn("[Popmerch] Could not determine loader base URL from currentScript.");
    return "";
  }());

  function injectRuntime(runtimeUrl) {
    // Support both absolute URLs (starts with http/https) and relative filenames.
    var url = /^https?:\/\//.test(runtimeUrl) ? runtimeUrl : base + runtimeUrl;
    var el = document.createElement("script");
    el.src = url;
    el.onerror = function () {
      console.error("[Popmerch] Failed to load runtime bundle:", url);
    };
    document.head.appendChild(el);
  }

  fetch(base + "manifest.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (manifest) {
      if (!manifest || !manifest.runtimeUrl) {
        throw new Error("manifest.json is missing runtimeUrl");
      }
      injectRuntime(manifest.runtimeUrl);
    })
    .catch(function (err) {
      console.error("[Popmerch] Loader failed to bootstrap runtime:", err);
    });
}());
