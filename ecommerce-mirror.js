const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./apps-startup-en317txy.js",
      "./vendor-i1h9sw6l.js",
      "./shared-gtyzo6jp.js",
      "./apps-js-api-jaurdaif.js",
      "./apps-tracker-gwmfggji.js",
      "./apps-add-to-bag-horqql2m.js",
      "./apps-categories-v1-e80i7glg.js",
      "./apps-categories-v2-myr23xi4.js",
      "./apps-minicart-v1-c1tl2m3s.js",
      "./apps-minicart-v2-bqgzb73g.js",
      "./apps-product-thumbnail-ol4ge841.js",
      "./apps-product-browser-jsjh8ty1.js",
      "./apps-product-browser-popup-if0cldc8.js",
      "./apps-search-panel-fv6d4grv.js",
      "./apps-search-widget-ni6xqrmj.js",
      "./apps-single-product-brxaz5j9.js",
      "./apps-cp-preview-product-card-bjunxnk3.js",
      "./apps-cp-preview-category-lk8ahaut.js",
    ]),
) => i.map((i) => d[i]);
const We = "modulepreload",
  Be = function (t, e) {
    return new URL(t, e).href;
  },
  ie = {},
  A = function (e, r, n) {
    let o = Promise.resolve();
    if (r && r.length > 0) {
      let s = function (d) {
        return Promise.all(
          d.map((l) =>
            Promise.resolve(l).then(
              (f) => ({
                status: "fulfilled",
                value: f,
              }),
              (f) => ({
                status: "rejected",
                reason: f,
              }),
            ),
          ),
        );
      };
      const c = document.getElementsByTagName("link"),
        u = document.querySelector("meta[property=csp-nonce]"),
        m = u?.nonce || u?.getAttribute("nonce");
      o = s(
        r.map((d) => {
          if (((d = Be(d, n)), d in ie)) return;
          ie[d] = !0;
          const l = d.endsWith(".css"),
            f = l ? '[rel="stylesheet"]' : "";
          if (!!n)
            for (let _ = c.length - 1; _ >= 0; _--) {
              const N = c[_];
              if (N.href === d && (!l || N.rel === "stylesheet")) return;
            }
          else if (document.querySelector(`link[href="${d}"]${f}`)) return;
          const T = document.createElement("link");
          if (
            ((T.rel = l ? "stylesheet" : We),
            l || (T.as = "script"),
            (T.crossOrigin = ""),
            (T.href = d),
            m && T.setAttribute("nonce", m),
            document.head.appendChild(T),
            l)
          )
            return new Promise((_, N) => {
              (T.addEventListener("load", _),
                T.addEventListener("error", () =>
                  N(new Error(`Unable to preload CSS for ${d}`)),
                ));
            });
        }),
      );
    }
    function i(s) {
      const c = new Event("vite:preloadError", {
        cancelable: !0,
      });
      if (((c.payload = s), window.dispatchEvent(c), !c.defaultPrevented))
        throw s;
    }
    return o.then((s) => {
      for (const c of s || []) c.status === "rejected" && i(c.reason);
      return e().catch(i);
    });
  };
var Fe = Object.defineProperty,
  ke = (t, e, r) =>
    e in t
      ? Fe(t, e, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: r,
        })
      : (t[e] = r),
  se = (t, e, r) => ke(t, typeof e != "symbol" ? e + "" : e, r),
  Ge = Object.defineProperty,
  Je = (t, e, r) =>
    e in t
      ? Ge(t, e, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: r,
        })
      : (t[e] = r),
  ae = (t, e, r) => Je(t, typeof e != "symbol" ? e + "" : e, r);
const h = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  LOG: "LOG",
};
class He {
  constructor(e) {
    (ae(this, "eventsLogSettings"),
      ae(this, "allowedEventTypes"),
      (this.eventsLogSettings = e),
      (this.allowedEventTypes = Object.keys(this.eventsLogSettings).sort()));
  }
  info(e, ...r) {
    this.doLog(h.INFO, e, r);
  }
  warn(e, ...r) {
    this.doLog(h.WARNING, e, r);
  }
  error(e, ...r) {
    this.doLog(h.ERROR, e, r);
  }
  log(e, ...r) {
    this.doLog(h.LOG, e, r);
  }
  doLog(e, r, n) {
    this.printGreetingsIfNeeded(this.allowedEventTypes);
    const o = this.eventsLogSettings[r];
    $e(e, r, o, this.getEventTypesToLog()) && this.printLog(e, o, n);
  }
}
function je(t) {
  switch (t) {
    case h.INFO:
      return console.info;
    case h.WARNING:
      return console.warn;
    case h.ERROR:
      return console.error;
    case h.LOG:
      return console.info;
    default:
      throw new Error(`Unknown log level '${t}'`);
  }
}
const y = {
  ALL: "ALL",
  PARTIAL: "PARTIAL",
  DEFAULT: "DEFAULT",
};
function qe(t, e, r) {
  const n = r.type;
  switch (n) {
    case y.ALL:
      return !0;
    case y.PARTIAL:
      return r.events.some((o) => o === t);
    case y.DEFAULT:
      return e.isDefault === !0;
    default:
      throw new Error(`Unknown event types to log '${n}'`);
  }
}
function $e(t, e, r, n) {
  return t === h.WARNING || t === h.ERROR || qe(e, r, n);
}
const G = "ALL";
function Ye(t) {
  return [
    "%c%s",
    `background: ${t.background}; color: ${t.color}; padding: 1px 4px`,
    t.badgeName,
  ];
}
class ze extends He {
  constructor(e, r) {
    (super(e),
      se(this, "localStorageKey"),
      se(this, "isGreetingsPrinted", !1),
      (this.localStorageKey = r));
  }
  createDebugGreetingsData(e) {
    const r = 'font-family: "Monospace"; font-size: 1.1em';
    return [
      `%cTo enable all development logs please run in development console:
%c    localStorage.setItem("${this.localStorageKey}", "${G}")
%cInstead of %c${G} %cyou can use comma separated event types list to partially enable logs.
Available event types are: %O`,
      "",
      r,
      "",
      r,
      "",
      e,
    ];
  }
  printGreetingsIfNeeded(e) {
    this.isGreetingsPrinted ||
      ((this.isGreetingsPrinted = !0),
      console.log(...this.createDebugGreetingsData(e)));
  }
  printLog(e, r, n) {
    const o = Ye(r);
    je(e)(...o, ...n);
  }
  getEventTypesToLog() {
    try {
      const e = window.localStorage.getItem(this.localStorageKey);
      return e === "" || e === null
        ? {
            type: y.DEFAULT,
          }
        : e === G || e === "true"
          ? {
              type: y.ALL,
            }
          : {
              type: y.PARTIAL,
              events: e.split(","),
            };
    } catch {
      return {
        type: y.DEFAULT,
      };
    }
  }
  shutdown() {
    return Promise.resolve();
  }
  flush() {
    return Promise.resolve();
  }
}
function U(t) {
  for (var e = 1; e < arguments.length; e++) {
    var r = arguments[e];
    for (var n in r) t[n] = r[n];
  }
  return t;
}
var Ke = {
  read: function (t) {
    return (
      t[0] === '"' && (t = t.slice(1, -1)),
      t.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
    );
  },
  write: function (t) {
    return encodeURIComponent(t).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent,
    );
  },
};
function J(t, e) {
  function r(o, i, s) {
    if (!(typeof document > "u")) {
      ((s = U({}, e, s)),
        typeof s.expires == "number" &&
          (s.expires = new Date(Date.now() + s.expires * 864e5)),
        s.expires && (s.expires = s.expires.toUTCString()),
        (o = encodeURIComponent(o)
          .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
          .replace(/[()]/g, escape)));
      var c = "";
      for (var u in s)
        s[u] &&
          ((c += "; " + u), s[u] !== !0 && (c += "=" + s[u].split(";")[0]));
      return (document.cookie = o + "=" + t.write(i, o) + c);
    }
  }
  function n(o) {
    if (!(typeof document > "u" || (arguments.length && !o))) {
      for (
        var i = document.cookie ? document.cookie.split("; ") : [],
          s = {},
          c = 0;
        c < i.length;
        c++
      ) {
        var u = i[c].split("="),
          m = u.slice(1).join("=");
        try {
          var d = decodeURIComponent(u[0]);
          if (((s[d] = t.read(m, d)), o === d)) break;
        } catch {}
      }
      return o ? s[o] : s;
    }
  }
  return Object.create(
    {
      set: r,
      get: n,
      remove: function (o, i) {
        r(
          o,
          "",
          U({}, i, {
            expires: -1,
          }),
        );
      },
      withAttributes: function (o) {
        return J(this.converter, U({}, this.attributes, o));
      },
      withConverter: function (o) {
        return J(U({}, this.converter, o), this.attributes);
      },
    },
    {
      attributes: {
        value: Object.freeze(e),
      },
      converter: {
        value: Object.freeze(t),
      },
    },
  );
}
var K = J(Ke, {
  path: "/",
});
class E {
  static entryPointQueryParams;
  static ecommerceJsParams;
  static getEntryPointQueryParams() {
    return E.entryPointQueryParams;
  }
  static setEntryPointQueryParams(e) {
    E.entryPointQueryParams = e;
  }
  static getEcommerceJsParams() {
    return E.ecommerceJsParams;
  }
  static setEcommerceJsParams(e) {
    E.ecommerceJsParams = e;
  }
}
class Xe {
  legacyApiImpl;
  constructor(e) {
    this.legacyApiImpl = e;
  }
  getSessionToken() {
    return this.legacyApiImpl.ensureJsApiSync().interop.getSessionToken();
  }
  onApiLoaded() {
    this.legacyApiImpl.getJsApiAsync().then((e) => {
      e.interop.onApiLoaded();
    });
  }
  onCartChanged(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.interop.onCartChanged(e);
    });
  }
  onCartSyncStarted(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.interop.onCartSyncStarted(e);
    });
  }
  onCartSyncFinished() {
    this.legacyApiImpl.getJsApiAsync().then((e) => {
      e.interop.onCartSyncFinished();
    });
  }
  onCustomerChanged(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.interop.onCustomerChanged(e);
    });
  }
  onOrderPlaced(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.interop.onOrderPlaced(e);
    });
  }
  onPageLoaded(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.interop.onPageLoaded(e);
    });
  }
  onSubscriptionsChanged() {
    this.legacyApiImpl.getJsApiAsync().then((e) => {
      e.interop.onSubscriptionsChanged();
    });
  }
}
const H = {
    HORIZONTAL: "HORIZONTAL",
    VERTICAL: "VERTICAL",
  },
  X = "ec-cart-widget",
  a = {
    ADD_TO_BAG: "AddToBag",
    CATEGORIES_V2: "CategoriesV2",
    HORIZONTAL_CATEGORIES_V1: "Categories",
    MINICART_V1: "Minicart",
    MINICART_V2: "MinicartV2",
    PRODUCT: "Product",
    PRODUCT_BROWSER: "ProductBrowser",
    PRODUCT_THUMBNAIL: "ProductThumbnail",
    SEARCH_PANEL: "SearchPanel",
    SEARCH_WIDGET: "SearchWidget",
    SINGLE_PRODUCT: "SingleProduct",
    VERTICAL_CATEGORIES_V1: "VCategories",
    CP_PREVIEW_PRODUCT_CARD: "CPPreviewProductCard",
    CP_PREVIEW_CATEGORY: "CPPreviewCategory",
  },
  S = {
    UNMOUNTED: "UNMOUNTED",
    MOUNTING: "MOUNTING",
    MOUNTED: "MOUNTED",
  };
function I() {
  return window._xnext_initialization_scripts;
}
function Qe(t) {
  window._xnext_initialization_scripts =
    window._xnext_initialization_scripts.filter((e) => !t(e));
}
function B(t) {
  I().push(t);
}
function Q(t) {
  return I().find((e) => e.element === t);
}
function Te() {
  return I().filter(
    (t) => t.mountState === void 0 || t.mountState === S.UNMOUNTED,
  );
}
function ce() {
  return I().filter((t) => t.mountState === S.MOUNTED);
}
function hn() {
  Qe((t) => t.widgetType === a.PRODUCT_BROWSER);
}
function Ze(t) {
  return I().find((e) => e.widgetType === t);
}
function Se() {
  return I().some((t) => t.widgetType === a.PRODUCT_BROWSER);
}
function et() {
  return I().some(
    (t) => t.widgetType === a.PRODUCT || t.widgetType === a.SINGLE_PRODUCT,
  );
}
function ye() {
  return I().some(
    (t) => t.widgetType === a.MINICART_V1 || t.widgetType === a.MINICART_V2,
  );
}
function Ce() {
  const t = [
    a.PRODUCT_BROWSER,
    a.SINGLE_PRODUCT,
    a.PRODUCT,
    a.MINICART_V1,
    a.CATEGORIES_V2,
    a.VERTICAL_CATEGORIES_V1,
  ];
  for (const r of t) {
    const n = I()
      .filter((o) => o.widgetType === r)
      ?.reverse()?.[0];
    if (n !== void 0) return n.element?.parentNode;
  }
  const e = document.getElementsByClassName(X);
  if (e.length > 0) return e[e.length - 1]?.parentNode;
}
function j(t, e) {
  if (document.defaultView?.getComputedStyle !== void 0)
    return document.defaultView.getComputedStyle(t, null).getPropertyValue(e);
}
function tt() {
  const t = {},
    e = Ce();
  if (e !== void 0) {
    const r = j(e, "font-family");
    r !== void 0 && (t["font-family"] = r);
  }
  return t;
}
function rt(t) {
  const e = document.createElement("a");
  ((e.href = ""), (e.textContent = ""), t.appendChild(e));
  const r = document.defaultView?.getComputedStyle(e, null).color ?? "";
  return (t.removeChild(e), r);
}
function nt(t) {
  let e = t,
    r = j(e, "background-color");
  for (
    ;
    r === void 0 ||
    r === "transparent" ||
    r === "#000000" ||
    r === "rgba(0, 0, 0, 0)";
  )
    e === document.documentElement
      ? (r = "white")
      : ((e = e.parentNode), (r = j(e, "background-color")));
  return r;
}
function ot(t, e) {
  let r;
  if (
    (e?.chameleon?.font !== void 0 && (r = e.chameleon.font),
    ((r === void 0 && t) || r === "auto") && (r = tt()),
    r !== void 0)
  ) {
    const o = r["font-family"];
    if (o !== void 0) {
      const i = o.split(/,\s*/);
      let s = "",
        c = "";
      for (const u of i) {
        if (s.length + u.length + c.length > 150) break;
        ((s += c + u), (c = ","));
      }
      return s;
    }
  }
}
function it(t, e) {
  return t && (e?.chameleon?.gallery?.useExactColors ?? !1);
}
function st() {
  return window.top?.location !== window.location;
}
function at(t, e) {
  let r;
  e?.chameleon?.colors !== void 0 && (r = e?.chameleon?.colors);
  const n = document.styleSheets.length === 0;
  if ((r !== void 0 && r !== "auto") || !t || n) return r !== "auto" ? r : {};
  const o = {},
    i = Ce();
  if (i === void 0) return o;
  const s = getComputedStyle(i, null).color;
  s.replace(/ /g, "") !== "rgba(0,0,0,0)" &&
    s !== "transparent" &&
    ((o["color-foreground"] = s), (o["color-price"] = o["color-foreground"]));
  const c = nt(i);
  c.replace(/ /g, "") !== "rgba(0,0,0,0)" && c !== "transparent"
    ? (o["color-background"] = c)
    : (o["color-background"] = "white");
  const u = rt(i);
  return (
    u.replace(/ /g, "") !== "rgba(0,0,0,0)" &&
      u !== "transparent" &&
      (o["color-link"] = u),
    o
  );
}
function Pe(t, e) {
  const r = t && !st();
  return {
    isEnabled: t,
    colors: at(r, e),
    fontFamily: ot(r, e),
    useExactColors: it(r, e),
  };
}
const ct = "ecwid_body";
function ut() {
  let t;
  const r = document.getElementsByTagName("body")[0];
  return (r !== void 0 && (r.id === "" && (r.id = ct), (t = r.id)), t);
}
const dt = "ecwid_html";
function lt() {
  let t;
  const r = document.getElementsByTagName("html")[0];
  return (r !== void 0 && (r.id === "" && (r.id = dt), (t = r.id)), t);
}
const w = {
    SUCCESS: "success",
    DUPLICATE: "duplicate",
    FAILED: "failed",
  },
  g = {
    APP_LIFECYCLE: "APP_LIFECYCLE",
    DEPRECATION: "DEPRECATION",
    JS_API: "JS_API",
    PERSISTENCE: "PERSISTENCE",
    RESOURCES: "RESOURCES",
    REST: "REST",
    ROUTER: "ROUTER",
    MUTATION: "MUTATION",
    SUSPENSE: "SUSPENSE",
    SSR: "SSR",
    TODO: "TODO",
    TRACKER: "TRACKER",
    CUSTOM_BLOCK: "CUSTOM_BLOCK",
  },
  gt = {
    [g.APP_LIFECYCLE]: {
      badgeName: "app-lifecycle",
      background: "#006400",
      color: "#ffffff",
    },
    [g.DEPRECATION]: {
      badgeName: "deprecation",
      background: "#8b4513",
      color: "#ffffff",
      isDefault: !0,
    },
    [g.JS_API]: {
      badgeName: "js-api",
      background: "#800080",
      color: "#ffffff",
    },
    [g.MUTATION]: {
      badgeName: "mutation",
      background: "#FFFF00",
      color: "#000000",
    },
    [g.PERSISTENCE]: {
      badgeName: "persistence",
      background: "#ff8c00",
      color: "#ffffff",
    },
    [g.RESOURCES]: {
      badgeName: "resources",
      background: "#20b2aa",
      color: "#ffffff",
    },
    [g.REST]: {
      badgeName: "rest",
      background: "#20b2aa",
      color: "#ffffff",
    },
    [g.ROUTER]: {
      badgeName: "router",
      background: "#1e90ff",
      color: "#ffffff",
    },
    [g.SUSPENSE]: {
      badgeName: "suspense",
      background: "#daa520",
      color: "#ffffff",
    },
    [g.SSR]: {
      badgeName: "ssr",
      background: "#191970",
      color: "#ffffff",
      isDefault: !0,
    },
    [g.TODO]: {
      badgeName: "todo",
      background: "#8b0000",
      color: "#ffffff",
      isDefault: !0,
    },
    [g.TRACKER]: {
      badgeName: "tracker",
      background: "#8a2be2",
      color: "#ffffff",
    },
    [g.CUSTOM_BLOCK]: {
      badgeName: "custom-block",
      background: "#4b0082",
      color: "#ffffff",
    },
  };
function Z(t) {
  return t !== void 0 ? [t] : [];
}
function _e(t) {
  return new Date().getTime() - t.getTime();
}
function ee(t) {
  const e = [
    `#${t.resourceLoadIndex}`,
    t.resourceType,
    "⮕",
    t.resourceUrl,
    ...Z(t.attributes),
  ];
  t.logger.info(g.RESOURCES, ...e);
}
function te(t) {
  const e = _e(t.requestStartTime),
    r = [
      `#${t.resourceLoadIndex}`,
      t.resourceType,
      "⬅",
      `[${e} ms]`,
      t.resourceUrl,
      ...Z(t.attributes),
    ];
  t.logger.info(g.RESOURCES, ...r);
}
function D(t) {
  const e = _e(t.requestStartTime),
    r = [
      `#${t.resourceLoadIndex}`,
      t.resourceType,
      "⛌",
      `[${e} ms]`,
      t.resourceUrl,
      ...Z(t.attributes),
      t.errorDetails,
    ];
  t.logger.warn(g.RESOURCES, ...r);
}
function pt(t) {
  return new Promise((e) => {
    setTimeout(() => e(t()));
  });
}
function Re(t, e) {
  if (e === void 0) return t;
  let r;
  const n = Promise.race([
    t,
    new Promise((o, i) => {
      r = setTimeout(() => {
        i(new Error(`Timeout exceeded (${e} ms)`));
      }, e);
    }),
  ]);
  return (n.finally(() => clearTimeout(r)), n);
}
function mt(t) {
  return t.status === "fulfilled";
}
const q = "data-loading";
function ft(t, e, r, n, o) {
  const i = document.head.querySelectorAll(`link[href='${t}']`);
  if (i.length > 0) {
    const d = {
      type: w.DUPLICATE,
      linkElement: i[0],
    };
    return Promise.resolve(d);
  }
  const s = (n.resourceLoadIndex ?? 0) + 1;
  n.resourceLoadIndex = s;
  const c = "🎨 CSS",
    u = new Date();
  ee({
    resourceLoadIndex: s,
    resourceType: c,
    resourceUrl: t,
    attributes: e,
    logger: o,
  });
  const m = new Promise((d) => {
    const l = document.createElement("link");
    ((l.rel = "stylesheet"),
      (l.href = t),
      l.setAttribute(q, ""),
      e !== void 0 &&
        Object.entries(e).forEach(([f, L]) => {
          l.setAttribute(f, L);
        }),
      (l.onerror = () => {
        (D({
          resourceLoadIndex: s,
          resourceType: c,
          requestStartTime: u,
          resourceUrl: t,
          attributes: e,
          errorDetails: void 0,
          logger: o,
        }),
          l.remove());
        const f = {
          type: w.FAILED,
        };
        d(f);
      }),
      (l.onload = () => {
        (l.removeAttribute(q),
          te({
            resourceLoadIndex: s,
            resourceType: c,
            requestStartTime: u,
            resourceUrl: t,
            attributes: e,
            logger: o,
          }));
        const f = {
          type: w.SUCCESS,
          linkElement: l,
        };
        d(f);
      }),
      document.getElementsByTagName("head")[0]?.appendChild(l));
  });
  return Re(m, r).catch(
    (d) => (
      D({
        resourceLoadIndex: s,
        resourceType: c,
        requestStartTime: u,
        resourceUrl: t,
        attributes: void 0,
        errorDetails: d instanceof Error ? d.message : void 0,
        logger: o,
      }),
      Promise.resolve({
        type: w.FAILED,
      })
    ),
  );
}
function At(t) {
  return Object.entries(t)
    .map(
      ([e, r]) =>
        `${encodeURIComponent(e)}=${encodeURIComponent(r.substring(0, 150))}`,
    )
    .join("&");
}
function ht(t, e) {
  const r = {};
  return (
    Object.entries(e.baseQueryParams).forEach(([n, o]) => {
      r[n] = o;
    }),
    (r.ownerid = e.storeId.toString()),
    e.cssSelectorsPrefix !== "" && (r["id-selector"] = e.cssSelectorsPrefix),
    e.isHoverDisabled && (r.hover = "disable"),
    e.chameleonParams.colors !== void 0 &&
      Object.entries(e.chameleonParams.colors).forEach(([n, o]) => {
        r[n] = o;
      }),
    e.chameleonParams.fontFamily !== void 0 &&
      (r["font-family"] = e.chameleonParams.fontFamily),
    e.chameleonParams.useExactColors && (r.useExactGalleryColors = "true"),
    (r.frontendV2 = "true"),
    `${t}?${At(r)}`
  );
}
const Et = 1e4;
function It() {
  return (
    "ontouchstart" in window &&
    typeof window.matchMedia == "function" &&
    !window.matchMedia("(pointer: fine)").matches &&
    window.matchMedia("(hover: none)").matches
  );
}
function Tt(t, e) {
  try {
    const r = new URL(e),
      n = new URL(t);
    return n.origin === r.origin && n.pathname === r.pathname;
  } catch {
    return !1;
  }
}
function St(t) {
  const e = Array.from(document.getElementsByTagName("link"))
      .filter((i) => i.rel === "stylesheet")
      .filter((i) => !i.hasAttribute(q))
      .filter((i) => Tt(i.href, t)),
    r = e.filter((i) => document.head.contains(i)),
    o = [...e.filter((i) => document.body.contains(i))];
  return (r.length > 1 && o.push(...r.slice(0, -1)), o);
}
function yt(t, e, r, n, o) {
  const i = {
      baseQueryParams: t.stylesheetsSettings.baseQueryParams,
      cssSelectorsPrefix: e.stylesheet?.cssSelectorsPrefix ?? "",
      chameleonParams: Pe(t.isChameleonEnabled, e.ecConfig),
      isHoverDisabled: It(),
      storeId: o,
    },
    s = (u) => {
      const m = ht(u, i);
      return ft(
        m,
        {
          "data-ec-stylesheet": "",
        },
        Et,
        r,
        n,
      );
    },
    c = t.stylesheetsSettings.baseUrl;
  return s(c.primaryUrl)
    .then(
      (u) => (
        u.type === w.SUCCESS &&
          St(c.primaryUrl).forEach((d) => {
            (n.warn(
              g.RESOURCES,
              "Removing obsolete stylesheet link element",
              d,
            ),
              d.remove());
          }),
        u
      ),
    )
    .catch(() => s(c.fallbackUrl));
}
function re(t, e) {
  return {
    widgetType: t,
    id: e.id !== "" ? e.id : void 0,
    currentScript: void 0,
    element: e,
    arg: [],
    mountState: S.UNMOUNTED,
    unmountFn: void 0,
  };
}
function Ct(t) {
  ((window.ec.config = window.ec.config ?? {}),
    (window.ec.config.chameleonDefaults =
      window.ec.config.chameleonDefaults ?? {}),
    (window.ec.config.chameleonDefaults.isEnabled = t.isEnabled),
    (window.ec.config.chameleonDefaults.gallery =
      window.ec.config.chameleonDefaults.gallery ?? {}),
    t.colors !== void 0 &&
      (window.ec.config.chameleonDefaults.colors = t.colors),
    t.fontFamily !== void 0 &&
      (window.ec.config.chameleonDefaults.font = {
        "font-family": t.fontFamily,
      }));
}
function Pt(t) {
  window.css_selectors_prefix = t.stylesheet?.cssSelectorsPrefix ?? "";
}
function _t(t) {
  t.then((e) => {
    window.ecwidMessages = {
      ...window.ecwidMessages,
      ...e.translationsSettings.overrides,
    };
  });
}
async function we(t, e, r) {
  const n = new AbortController(),
    o = {
      ...e,
      signal: n.signal,
    },
    i = setTimeout(() => {
      const s = new DOMException("The user aborted a request.", "AbortError");
      n.abort(s);
    }, r);
  try {
    return await fetch(t, o);
  } finally {
    clearTimeout(i);
  }
}
async function ue(t, e, r, n) {
  const o = (e.resourceLoadIndex ?? 0) + 1;
  e.resourceLoadIndex = o;
  const i = "🗂️ JSON",
    s = new Date();
  try {
    ee({
      resourceLoadIndex: e.resourceLoadIndex,
      resourceType: i,
      resourceUrl: t,
      attributes: void 0,
      logger: r,
    });
    const u = await we(t, {}, n);
    if (!u.ok) {
      const d = await u.text();
      throw new Error(d);
    }
    const m = await u.json();
    return (
      te({
        resourceLoadIndex: o,
        resourceType: i,
        requestStartTime: s,
        resourceUrl: t,
        attributes: void 0,
        logger: r,
      }),
      m
    );
  } catch (c) {
    throw (
      D({
        resourceLoadIndex: o,
        resourceType: i,
        requestStartTime: s,
        resourceUrl: t,
        attributes: void 0,
        errorDetails: c.message,
        logger: r,
      }),
      c
    );
  }
}
const v = {
  SUCCESS: "success",
  DUPLICATE: "duplicate",
  FAILED: "failed",
};
function Rt(t) {
  const {
      resourceLoadIndex: e,
      resourceType: r,
      logger: n,
      scriptUrl: o = "",
      timeoutMs: i,
    } = t,
    s = new Date(),
    c = new Promise((u) => {
      const m = document.createElement("script");
      ((m.type = "text/javascript"),
        t.scriptContent !== void 0 &&
          t.scriptContent !== null &&
          (m.textContent = t.scriptContent),
        t.scriptUrl !== void 0 && (m.src = o),
        (m.async = t.isAsync ?? !0),
        (m.onerror = () => {
          (D({
            resourceLoadIndex: e,
            resourceType: r,
            requestStartTime: s,
            resourceUrl: o,
            attributes: void 0,
            errorDetails: void 0,
            logger: n,
          }),
            m.remove());
          const d = {
            type: v.FAILED,
          };
          u(d);
        }),
        (m.onload = () => {
          te({
            resourceLoadIndex: e,
            resourceType: r,
            requestStartTime: s,
            resourceUrl: o,
            attributes: void 0,
            logger: n,
          });
          const d = {
            type: v.SUCCESS,
            scriptElement: m,
          };
          u(d);
        }),
        (t.target ?? document.getElementsByTagName("head")[0])?.appendChild(m));
    });
  return Re(c, i).catch(
    (u) => (
      u instanceof Error &&
        D({
          resourceLoadIndex: e,
          resourceType: r,
          requestStartTime: s,
          resourceUrl: o,
          attributes: void 0,
          errorDetails: u.message,
          logger: n,
        }),
      Promise.resolve({
        type: v.FAILED,
      })
    ),
  );
}
function de(t, e, r, n, o) {
  const i = document.querySelectorAll(`script[src='${t}']`);
  if (i.length > 0) {
    const u = {
      type: v.DUPLICATE,
      scriptElement: i[0],
    };
    return Promise.resolve(u);
  }
  const s = (r.resourceLoadIndex ?? 0) + 1;
  r.resourceLoadIndex = s;
  const c = "🔨 JS";
  return (
    ee({
      resourceLoadIndex: r.resourceLoadIndex,
      resourceType: c,
      resourceUrl: t,
      attributes: void 0,
      logger: n,
    }),
    Rt({
      resourceLoadIndex: s,
      resourceType: c,
      logger: n,
      scriptUrl: t,
      isAsync: e,
      timeoutMs: o,
    })
  );
}
const Oe = "new-frontend",
  ve = "storefront-frontend",
  En = "en";
function wt(t) {
  if (t.cssSelectorsPrefix !== void 0) return t.cssSelectorsPrefix;
  let e = "";
  return (
    t.isCssSelectorsPrefixDisabled !== !0 &&
      (t.htmlTagId !== void 0 || t.bodyTagId !== void 0) &&
      (t.htmlTagId !== void 0 && (e += `html#${t.htmlTagId}`),
      t.htmlTagId !== void 0 && t.bodyTagId !== void 0 && (e += " "),
      t.bodyTagId !== void 0 && (e += `body#${t.bodyTagId}`)),
    e
  );
}
function De(t) {
  return JSON.parse(JSON.stringify(t));
}
function Ot(t) {
  return t.chameleon !== void 0
    ? {
        ...t,
        chameleon: De(t.chameleon),
      }
    : {
        ...t,
      };
}
const vt = "ec-storefront-show-i18n-keys",
  Dt = "ec-storefront-highlight-version",
  le = 5e3;
function Lt(t) {
  const e = {
    ...t,
  };
  let r = {};
  return (
    e.queryState !== void 0 && ((r = e.queryState), delete e.queryState),
    {
      queryState: r,
      piniaState: e,
    }
  );
}
function Nt(t, e, r, n, o) {
  return t.then((i) => {
    Pt(e);
    const s = Pe(i.isChameleonEnabled, e.ecConfig);
    return (Ct(s), yt(i, e, r, n, o));
  });
}
async function Ut(t, e, r) {
  (await de(t.primaryUrl, !0, e, r)).type === v.FAILED &&
    (await de(t.fallbackUrl, !0, e, r));
}
async function bt(t, e, r) {
  try {
    return await ue(t.primaryUrl, e, r, le);
  } catch {
    return ue(t.fallbackUrl, e, r, le);
  }
}
async function Mt(t, e, r) {
  const n = t.map((i) => bt(i, e, r));
  return (await Promise.allSettled(n)).filter(mt).map((i) => i.value);
}
async function Vt(t, e, r) {
  const n = await Mt(t, e, r),
    o = Object.assign({}, ...n);
  return (
    (window.rosettaMessages = window.rosettaMessages ?? {}),
    (window.rosettaMessages[ve] = o),
    (window.rosettaMessages[Oe] = o),
    o
  );
}
async function xt(t, e, r) {
  const n = t.map((o) => Ut(o, e, r));
  return (
    await Promise.allSettled(n),
    window.rosettaMessages[ve] ?? window.rosettaMessages[Oe]
  );
}
async function Wt(t, e, r) {
  const n = t.translationsSettings.urls,
    o = n.filter((s) => s.primaryUrl.endsWith(".json"));
  if (o.length > 0) return Vt(o, e, r);
  const i = n.filter((s) => s.primaryUrl.endsWith(".js"));
  return i.length > 0
    ? xt(i, e, r)
    : Promise.reject(
        new Error("Unsupported `translationsSettings.urls` format"),
      );
}
function Bt(t, e, r) {
  return t.then(async (n) => {
    const o = n.translationsSettings.overrides,
      i = await Wt(n, e, r);
    return [o, i];
  });
}
function Ft(t, e) {
  return Ot({
    ...(t ?? {}),
    ...(e.config ?? {}),
  });
}
function kt(t, e) {
  return De({
    ...(t ?? {}),
    ...(e.order ?? {}),
  });
}
function Gt(t, e) {
  return {
    ...(t ?? {}),
    ...(e.storefront ?? {}),
  };
}
function Jt(t) {
  return {
    containerWidth: t?.containerWidth,
  };
}
function Ht() {
  return K.get(vt)?.toString() === "true" ? !0 : void 0;
}
function jt() {
  return K.get(Dt)?.toString() === "true" ? !0 : void 0;
}
function qt(t) {
  return {
    showI18nKeys: Ht() ?? t?.showI18nKeys,
    shouldHighlightVersion: jt() ?? t?.shouldHighlightVersion,
  };
}
function $t(t, e) {
  return {
    customHistoryStateHandler:
      e?.customHistoryStateHandler ?? t?.customHistoryStateHandler,
  };
}
function Yt(t, e) {
  const r = {
    cssSelectorsPrefix: e?.css_selectors_prefix ?? t?.cssSelectorsPrefix,
    isCssSelectorsPrefixDisabled:
      e?.ecwid_nocssrewrite ?? t?.isCssSelectorsPrefixDisabled,
    htmlTagId: lt() ?? t?.htmlTagId,
    bodyTagId: ut() ?? t?.bodyTagId,
  };
  return {
    ...r,
    cssSelectorsPrefix: wt(r),
  };
}
function zt(t, e) {
  return {
    signInProvider: t?.signInProvider,
    signInUrls: t?.signInUrls,
    ssoProfile: e.ecwid_sso_profile ?? t?.ssoProfile,
  };
}
function Kt(t) {
  const e = t.globalOverrides?.globalOverrides;
  return {
    ecConfig: Ft(e?.ecConfig, window.ec),
    ecOrder: kt(e?.ecOrder, window.ec),
    ecStorefront: Gt(e?.ecStorefront, window.ec),
    browser: Jt(e?.browser),
    debug: qt(e?.debug),
    routing: $t(e?.routing, window.Ecwid),
    stylesheet: Yt(e?.stylesheet, window),
    sso: zt(e?.sso, window),
  };
}
function Xt(t, e) {
  const r = Q(t.containerElement);
  if (r !== void 0) return r;
  const n = re(e, t.containerElement);
  return (B(n), n);
}
function R(t) {
  if (t.containerElement === void 0 || t.containerElement === null)
    throw new Error(
      "Cannot find containerElement, please sure that it is passed to the widget options correctly.",
    );
  const { containerElement: e, rootProps: r, states: n } = t;
  return {
    containerElement: e,
    rootProps: r,
    states: n,
  };
}
function ge() {
  return document.createElement("div");
}
class Qt {
  options;
  widgetData;
  startupApp;
  jsApi;
  constructor(e) {
    this.options = e;
  }
  getBootstrapPromise() {
    return this.options.bootstrapPromise;
  }
  async createWidget(e, r) {
    const n = r.states ?? {},
      { queryState: o, piniaState: i } = Lt(n),
      s = Kt(i),
      c = this.widgetData ?? this.createWidgetData(s, this.options);
    (_t(this.options.bootstrapPromise), (this.widgetData = c));
    const u = {
      containerElement: r.containerElement,
      isHydrateExistingMarkup: Object.keys(n).length > 0,
      queryState: o,
      piniaState: {
        ...i,
        globalOverrides: {
          globalOverrides: s,
        },
      },
      rootProps: r.rootProps ?? {},
      bootstrap: this.options.bootstrapPromise,
      widgetData: c,
      storefrontApiClient: this.options.storefrontApiClient,
      requestContext: this.options.requestContext,
      ecommerce: this.options.ecommerce,
      logger: this.options.logger,
    };
    return await (await e).render(u);
  }
  createWidgetData(e, r) {
    return {
      appMode: r.appMode,
      customizeStorefrontAppsResources: Promise.resolve(void 0),
      stylesheet: Nt(
        this.options.bootstrapPromise,
        e,
        this.options.requestContext,
        this.options.logger,
        this.options.storeId,
      ),
      translations: Bt(
        this.options.bootstrapPromise,
        this.options.requestContext,
        this.options.logger,
      ),
    };
  }
  getOrCreateConfigAndWidget(e, r, n) {
    const o = R(r),
      i = Xt(o, n);
    return (
      (i.ecwidWidget !== void 0 && i.mountState !== S.UNMOUNTED) ||
        ((i.mountState = S.MOUNTING),
        (i.ecwidWidget = this.createWidget(e, o).then(
          (s) => (
            (i.mountState = S.MOUNTED),
            (i.unmountFn = () => {
              ((i.mountState = S.UNMOUNTED),
                (i.unmountFn = void 0),
                (i.element = i.id !== void 0 ? void 0 : i.element),
                s.unmountFn());
            }),
            s
          ),
        ))),
      i.ecwidWidget
    );
  }
  createOrGetStartup(e) {
    if (this.startupApp === void 0) {
      const r = R({
        containerElement: ge(),
        rootProps: {
          storeId: this.options.storeId,
          sessionToken: this.options.sessionToken,
        },
        states: e.states,
      });
      this.startupApp = this.createWidget(
        A(
          () => import("./apps-startup-en317txy.js"),
          __vite__mapDeps([0, 1, 2]),
          import.meta.url,
        ),
        r,
      );
    }
    return this.startupApp;
  }
  createOrGetJsApi() {
    if (this.jsApi === void 0) {
      const e = R({
        containerElement: ge(),
        rootProps: {},
      });
      this.jsApi = this.createOrGetStartup(e).then(() =>
        this.createWidget(
          A(
            () => import("./apps-js-api-jaurdaif.js"),
            __vite__mapDeps([3, 1, 2]),
            import.meta.url,
          ),
          e,
        ),
      );
    }
    return this.jsApi;
  }
  createTracker(e) {
    return this.createOrGetStartup(e).then(() =>
      this.createWidget(
        A(
          () => import("./apps-tracker-gwmfggji.js").then((r) => r.l),
          __vite__mapDeps([4, 1, 2]),
          import.meta.url,
        ),
        R(e),
      ),
    );
  }
  createAddToBag(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-add-to-bag-horqql2m.js"),
          __vite__mapDeps([5, 2, 1]),
          import.meta.url,
        ),
        e,
        a.ADD_TO_BAG,
      ),
    );
  }
  createCategoriesV1(e) {
    const r =
      e.rootProps?.direction === H.VERTICAL
        ? a.VERTICAL_CATEGORIES_V1
        : a.HORIZONTAL_CATEGORIES_V1;
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-categories-v1-e80i7glg.js"),
          __vite__mapDeps([6, 1, 2]),
          import.meta.url,
        ),
        e,
        r,
      ),
    );
  }
  createCategoriesV2(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-categories-v2-myr23xi4.js"),
          __vite__mapDeps([7, 1, 2]),
          import.meta.url,
        ),
        e,
        a.CATEGORIES_V2,
      ),
    );
  }
  createMinicartV1(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-minicart-v1-c1tl2m3s.js"),
          __vite__mapDeps([8, 1, 2]),
          import.meta.url,
        ),
        e,
        a.MINICART_V1,
      ),
    );
  }
  createMinicartV2(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-minicart-v2-bqgzb73g.js"),
          __vite__mapDeps([9, 1, 2]),
          import.meta.url,
        ),
        e,
        a.MINICART_V2,
      ),
    );
  }
  createProductThumbnail(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-product-thumbnail-ol4ge841.js"),
          __vite__mapDeps([10, 2, 1]),
          import.meta.url,
        ),
        e,
        a.PRODUCT_THUMBNAIL,
      ),
    );
  }
  createProductBrowser(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-product-browser-jsjh8ty1.js").then((r) => r.bE),
          __vite__mapDeps([11, 1, 2]),
          import.meta.url,
        ),
        e,
        a.PRODUCT_BROWSER,
      ),
    );
  }
  createProductBrowserPopup(e) {
    return this.createOrGetStartup(e).then(() =>
      this.createWidget(
        A(
          () => import("./apps-product-browser-popup-if0cldc8.js"),
          __vite__mapDeps([12, 1, 2]),
          import.meta.url,
        ),
        R(e),
      ),
    );
  }
  createSearchPanel(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-search-panel-fv6d4grv.js"),
          __vite__mapDeps([13, 1, 2]),
          import.meta.url,
        ),
        e,
        a.SEARCH_PANEL,
      ),
    );
  }
  createSearchWidget(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-search-widget-ni6xqrmj.js"),
          __vite__mapDeps([14, 1, 2]),
          import.meta.url,
        ),
        e,
        a.SEARCH_WIDGET,
      ),
    );
  }
  createSingleProduct(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-single-product-brxaz5j9.js"),
          __vite__mapDeps([15, 2, 1]),
          import.meta.url,
        ),
        e,
        a.SINGLE_PRODUCT,
      ),
    );
  }
  createCpPreviewProductCard(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-cp-preview-product-card-bjunxnk3.js"),
          __vite__mapDeps([16, 2, 1]),
          import.meta.url,
        ),
        e,
        a.CP_PREVIEW_PRODUCT_CARD,
      ),
    );
  }
  createCpPreviewCategory(e) {
    return this.createOrGetStartup(e).then(() =>
      this.getOrCreateConfigAndWidget(
        A(
          () => import("./apps-cp-preview-category-lk8ahaut.js"),
          __vite__mapDeps([17, 2, 1]),
          import.meta.url,
        ),
        e,
        a.CP_PREVIEW_CATEGORY,
      ),
    );
  }
}
class Zt {
  legacyApiImpl;
  constructor(e) {
    this.legacyApiImpl = e;
  }
  setInternalState(e) {
    return this.legacyApiImpl.ensureJsApiSync().setRouterExternalState(e);
  }
  saveUtmDataFromUrl(e) {
    return this.legacyApiImpl.ensureJsApiSync().saveUtmDataFromUrl(e);
  }
}
const Le = {
    TOP_LEFT: "TOP_LEFT",
    TOP_RIGHT: "TOP_RIGHT",
    BOTTOM_LEFT: "BOTTOM_LEFT",
    BOTTOM_RIGHT: "BOTTOM_RIGHT",
  },
  F = {
    RECT: "RECT",
    PILL: "PILL",
    NONE: "NONE",
  },
  Ne = {
    BAG: "BAG",
    CART: "CART",
    BASKET: "BASKET",
  },
  Ue = {
    SMALL_ICON: "SMALL_ICON",
    SMALL_ICON_COUNTER: "SMALL_ICON_COUNTER",
    COUNTER_ONLY: "COUNTER_ONLY",
    TITLE_COUNTER: "TITLE_COUNTER",
    MEDIUM_ICON_COUNTER: "MEDIUM_ICON_COUNTER",
    MEDIUM_ICON_TITLE_COUNTER: "MEDIUM_ICON_TITLE_COUNTER",
    BIG_ICON_TITLE_SUBTOTAL: "BIG_ICON_TITLE_SUBTOTAL",
    BIG_ICON_DETAILS_SUBTOTAL: "BIG_ICON_DETAILS_SUBTOTAL",
  },
  p = {
    DATA_LAYOUT: "data-layout",
    DATA_ICON: "data-icon",
    DATA_FIXED: "data-fixed",
    DATA_FIXED_POSITION: "data-fixed-position",
    DATA_FIXED_SHAPE: "data-fixed-shape",
    DATA_HORIZONTAL_INDENT: "data-horizontal-indent",
    DATA_VERTICAL_INDENT: "data-vertical-indent",
    DATA_RESPONSIVE: "data-responsive",
    DATA_CUSTOM_ICON_URL: "data-custom-icon-url",
    DATA_SHOW_EMPTY_CART: "data-show-empty-cart",
    DATA_SHOW_BUY_ANIMATION: "data-show-buy-animation",
  };
function er() {
  const t = document.createElement("div");
  return (
    t.setAttribute(p.DATA_FIXED, "true"),
    t.setAttribute(p.DATA_FIXED_SHAPE, F.PILL),
    t.setAttribute(p.DATA_SHOW_EMPTY_CART, "false"),
    (t.className = X),
    t
  );
}
function be(t) {
  if (t !== void 0) {
    const e = document.getElementById(t);
    if (e !== null) return e;
  }
}
const pe = "autogenerated";
function tr(t) {
  if (t === void 0) return document.body;
  const e = t.nextElementSibling;
  if (e instanceof HTMLElement && e.dataset[pe] !== void 0) return e;
  const r = document.createElement("div");
  return ((r.dataset[pe] = "true"), t.insertAdjacentElement("afterend", r), r);
}
function $(t) {
  const e = document.createElement("div");
  return (
    (e.id = t.id ?? `${t.widgetType}-${new Date().getTime()}`),
    tr(t.currentScript).appendChild(e),
    e
  );
}
function Y(t) {
  if (t.element !== void 0 && t.element !== null) return t.element;
  const e = be(t.id);
  if (e !== void 0) return e;
}
class rr {
  affiliateId = void 0;
  legacyApiImpl;
  widgetRendererImpl;
  logger;
  OnAPILoaded = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onApiLoaded(e);
      });
    },
  };
  OnCartChanged = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onCartChanged(e);
      });
    },
  };
  customerSignOut(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.customerSignOut(e);
    });
  }
  OnCartSynchronized = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onCartSynchronized(e);
      });
    },
  };
  OnConsentChanged = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onConsentChanged(e);
      });
    },
  };
  OnOrderPlaced = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onOrderPlaced(e);
      });
    },
  };
  OnPageLoad = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onPageLoad(e);
      });
    },
  };
  OnPageLoaded = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onPageLoaded(e);
      });
    },
  };
  OnPageSwitch = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onPageSwitch(e);
      });
    },
  };
  OnProductOptionsChanged = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onProductOptionsChanged(e);
      });
    },
  };
  OnRouterStateChanged = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onRouterStateChanged(e);
      });
    },
    clear: () => {
      this.legacyApiImpl.getJsApiAsync().then((e) => {
        e.clearRouterStateChangedHandlers();
      });
    },
  };
  OnSessionChanged = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onSessionChanged(e);
      });
    },
  };
  OnSetProfile = {
    add: (e) => {
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.onSetProfile(e);
      });
    },
  };
  constructor(e, r, n) {
    ((this.legacyApiImpl = e),
      (this.widgetRendererImpl = r),
      (this.logger = n));
  }
  createMinicartV2Config(e = void 0) {
    let r = e;
    r === void 0 && ((r = er()), document.body.appendChild(r));
    const n = re(a.MINICART_V2, r);
    return (B(n), n);
  }
  addMinicartV2Widgets() {
    const e = Array.from(document.getElementsByClassName(X));
    if (e.length > 0) {
      const n = e
        .filter((o) => Q(o) === void 0)
        .map((o) => this.createMinicartV2Config(o));
      return Promise.resolve(n);
    }
    if (et() && !Se() && !ye()) {
      const n = this.createMinicartV2Config();
      return Promise.resolve([n]);
    }
    return this.legacyApiImpl
      .getEcommerce()
      .widgets.getBootstrapPromise()
      .then((n) =>
        (n.shouldInitMinicartForced &&
          window.ec.storefront?.show_cart_widget !== !1) ||
        window.ec.storefront?.show_cart_widget === !0
          ? [this.createMinicartV2Config()]
          : [],
      );
  }
  buildRoutePageUrl(e) {
    return this.legacyApiImpl.ensureJsApiSync().buildRoutePageUrl(e);
  }
  buildSiteUrl() {
    return this.legacyApiImpl.ensureJsApiSync().buildSiteUrl();
  }
  destroy() {
    const e = ce().filter((r) => r.widgetType === a.PRODUCT_BROWSER);
    e.length > 0 &&
      (this.logger.info(g.JS_API, "Ecwid.destroy()"),
      e.forEach((r) => {
        r.unmountFn !== void 0 && r.unmountFn();
      }));
  }
  closeProductBrowserPopup() {
    return this.legacyApiImpl.ensureJsApiSync().closeProductBrowserPopup();
  }
  formatCurrency(e) {
    return this.legacyApiImpl.ensureJsApiSync().formatCurrency(e);
  }
  init() {
    (this.logger.info(g.JS_API, "Ecwid.init()"),
      Te().forEach((e) => this.initWidget(e)),
      this.addMinicartV2Widgets().then((e) => {
        e.forEach((r) => this.initWidget(r));
      }));
  }
  initWidget(e) {
    try {
      let r = Y(e);
      if (e.id !== void 0 && r === void 0)
        throw new Error(`No such element: ${e.id}`);
      ((r = r ?? $(e)),
        (e.element = r),
        (e.id = r.id),
        this.widgetRendererImpl.renderWidget(e, r).then());
    } catch (r) {
      this.logger.warn(g.APP_LIFECYCLE, "Cannot initialize widget", r);
    }
  }
  isCheckoutMutating() {
    return this.legacyApiImpl.ensureJsApiSync().isCheckoutMutating();
  }
  isStarterSiteFooterLinksEnabled() {
    return this.legacyApiImpl
      .ensureJsApiSync()
      .isStarterSiteFooterLinksEnabled();
  }
  isPageServicedByStorefrontV3(e) {
    return this.legacyApiImpl.ensureJsApiSync().isPageServicedByStorefrontV3(e);
  }
  getAppPublicConfig(e) {
    return this.legacyApiImpl.ensureJsApiSync().getAppPublicConfig(e);
  }
  getAppPublicToken(e) {
    return this.legacyApiImpl.ensureJsApiSync().getAppPublicToken(e);
  }
  getAndClearLegacyStorefrontNotices() {
    return this.legacyApiImpl
      .ensureJsApiSync()
      .getAndClearLegacyStorefrontNotices();
  }
  isIsolatedSessionMode() {
    return this.legacyApiImpl.ensureJsApiSync().isIsolatedSessionMode();
  }
  getCheckoutInfo() {
    return this.legacyApiImpl.ensureJsApiSync().getCheckoutInfo();
  }
  getLegacyAuthToken() {
    return this.legacyApiImpl.ensureJsApiSync().getLegacyAuthToken();
  }
  getFeatureToggles() {
    return this.legacyApiImpl.ensureJsApiSync().getFeatureToggles();
  }
  getInitializedWidgets() {
    const e = ce().map((n) => n.widgetType),
      r = [...new Set(e)];
    return (this.logger.info(g.JS_API, "Ecwid.getInitializedWidgets()", r), r);
  }
  getPageSwitchCallbacks() {
    return this.legacyApiImpl.ensureJsApiSync().getPageSwitchCallbacks();
  }
  getStoreConfiguration() {
    return this.legacyApiImpl.ensureJsApiSync().getStoreConfiguration();
  }
  getStorefrontLang() {
    return this.legacyApiImpl.ensureJsApiSync().getStorefrontLang();
  }
  getOwnerId() {
    throw new Error(
      "This method is implemented in entrypoint and should not be invoked",
    );
  }
  getStaticBaseUrl() {
    return (
      this.logger.warn(
        g.DEPRECATION,
        `Method Ecwid.getStaticBaseUrl() returns nothing in current implementation.
If you use this method in your scripts, please contact us at https://support.ecwid.com/hc/en-us/requests/new`,
      ),
      ""
    );
  }
  scrollToContent() {
    return this.legacyApiImpl.ensureJsApiSync().scrollToContent();
  }
  getTrackingConsent() {
    return this.legacyApiImpl.ensureJsApiSync().getTrackingConsent();
  }
  getVisitorLocation() {
    return this.legacyApiImpl.ensureJsApiSync().getVisitorLocation();
  }
  gotoRoutePage(e) {
    return this.legacyApiImpl.ensureJsApiSync().gotoRoutePage(e);
  }
  onAllCheckoutMutationsCompleted(e) {
    return this.legacyApiImpl
      .ensureJsApiSync()
      .onAllCheckoutMutationsCompleted(e);
  }
  openCookiesSettingSidePanel() {
    return this.legacyApiImpl.ensureJsApiSync().openCookiesSettingSidePanel();
  }
  openPage(e, r) {
    return this.legacyApiImpl.ensureJsApiSync().openPage(e, r);
  }
  refreshConfig() {
    this.legacyApiImpl.ensureJsApiSync().refreshConfig(window.ec);
  }
  resizeProductBrowser() {
    this.logger.warn(
      g.DEPRECATION,
      "Method Ecwid.resizeProductBrowser() is do nothing in current implementation and its call can be removed",
    );
  }
  setRouterExternalState(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => r.setRouterExternalState(e));
  }
  setSignInProvider(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.setSignInProvider(e);
    });
  }
  setSignInUrls(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.setSignInUrls(e);
    });
  }
  setSsoProfile(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.setSsoProfile(e);
    });
  }
  setCheckoutInfo(e) {
    this.legacyApiImpl.ensureJsApiSync().setCheckoutInfo(e);
  }
  setLegacyAuthToken(e) {
    this.legacyApiImpl.ensureJsApiSync().setLegacyAuthToken(e);
  }
  setSession(e) {
    this.legacyApiImpl.ensureJsApiSync().setSession(e);
  }
  setStorefrontBaseUrl(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.setStorefrontBaseUrl(e);
    });
  }
  setTrackingConsent(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.setTrackingConsent(e);
    });
  }
  showProductFilters() {
    this.legacyApiImpl.ensureJsApiSync().showProductFilters();
  }
  getSupportedStorages() {
    return this.legacyApiImpl.ensureJsApiSync().getSupportedStorages();
  }
  getStorageValue(e, r) {
    return this.legacyApiImpl.ensureJsApiSync().getStorageValue(e, r);
  }
  setStorageValue(e, r, n) {
    return this.legacyApiImpl.ensureJsApiSync().setStorageValue(e, r, n);
  }
}
function Me(t) {
  const e = {};
  return (
    t.forEach((r) => {
      const n = r.split("=");
      if (n.length === 2) {
        const o = n[0],
          i = n[1];
        o !== void 0 && i !== void 0 && (e[o] = i);
      }
    }),
    e
  );
}
const nr = "id";
function or(t) {
  return t.find((e) => e instanceof HTMLScriptElement);
}
const ir = (t) => t.filter((e) => typeof e == "string");
function sr(t, e) {
  const r = or(e),
    n = ir(e),
    i = Me(n)[nr];
  return {
    widgetType: t,
    id: i,
    element: be(i),
    currentScript: r,
    arg: n,
    mountState: S.UNMOUNTED,
    unmountFn: void 0,
  };
}
function ar(t) {
  document
    .querySelectorAll(
      "div[itemtype='http://schema.org/Product'], div[itemtype='https://schema.org/Product']",
    )
    .forEach((r) => {
      Q(r) === void 0 && B(re(t, r));
    });
}
class cr {
  widgetRendererImpl;
  ecwidImpl;
  logger;
  constructor(e, r, n) {
    ((this.widgetRendererImpl = r), (this.logger = n), (this.ecwidImpl = e));
  }
  xWidget(e, r) {
    try {
      const n = this.getOrCreateWidgetConfig(e, r),
        o = Y(n) ?? $(n);
      ((n.element = o),
        (n.id = o.id),
        this.widgetRendererImpl.renderWidget(n, o));
    } catch (n) {
      this.logger.warn(g.APP_LIFECYCLE, "Cannot initialize widget", n);
    }
  }
  getOrCreateWidgetConfig(e, r) {
    let n;
    if ((e === a.PRODUCT_BROWSER && (n = Ze(a.PRODUCT_BROWSER)), n !== void 0))
      return n;
    const o = sr(e, r);
    return (B(o), o);
  }
  addMinicartIfNeeded() {
    !Se() &&
      !ye() &&
      this.xWidget(a.MINICART_V2, [
        `${p.DATA_FIXED}=true`,
        `${p.DATA_FIXED_SHAPE}=${F.PILL}`,
        `${p.DATA_SHOW_EMPTY_CART}=false`,
      ]);
  }
  xSingleProductWidgets(e) {
    (ar(e),
      Te()
        .filter((r) => r.widgetType === e)
        .forEach((r) => {
          try {
            const n = Y(r) ?? $(r);
            ((r.element = n),
              (r.id = n.id),
              this.widgetRendererImpl
                .renderWidget(r, n)
                .then(() => this.addMinicartIfNeeded()));
          } catch (n) {
            this.logger.warn(g.APP_LIFECYCLE, "Cannot initialize widget", n);
          }
        }));
  }
  xProductBrowser(...e) {
    (this.ecwidImpl.destroy(), this.xWidget(a.PRODUCT_BROWSER, e));
  }
  xMinicart(...e) {
    this.xWidget(a.MINICART_V1, e);
  }
  xSearchPanel(...e) {
    this.xWidget(a.SEARCH_PANEL, e);
  }
  xSearch(...e) {
    this.xWidget(a.SEARCH_WIDGET, e);
  }
  xCategories(...e) {
    this.xWidget(a.HORIZONTAL_CATEGORIES_V1, e);
  }
  xCategoriesV2(...e) {
    this.xWidget(a.CATEGORIES_V2, e);
  }
  xVCategories(...e) {
    this.xWidget(a.VERTICAL_CATEGORIES_V1, e);
  }
  ecwid_onBodyDone() {
    (this.logger.warn(
      g.DEPRECATION,
      "Function window.ecwid_onBodyDone() is deprecated. Use window.Ecwid.init() instead",
    ),
      this.ecwidImpl.init());
  }
  xAddToBag(...e) {
    this.xWidget(a.ADD_TO_BAG, e);
  }
  xProductThumbnail(...e) {
    this.xWidget(a.PRODUCT_THUMBNAIL, e);
  }
  xSingleProduct() {
    this.xSingleProductWidgets(a.SINGLE_PRODUCT);
  }
  xProduct() {
    this.xSingleProductWidgets(a.PRODUCT);
  }
}
class ur {
  legacyApiImpl;
  constructor(e) {
    this.legacyApiImpl = e;
  }
  addProduct(e, r) {
    this.legacyApiImpl.getJsApiAsync().then((n) => {
      typeof e == "object"
        ? n.addProductToCart(e)
        : n.addProductToCart({
            id: parseInt(e.toString(), 10),
            callback: r ?? (() => {}),
          });
    });
  }
  removeProduct(e, r) {
    this.legacyApiImpl.getJsApiAsync().then((n) => {
      typeof e > "u"
        ? n.removeFromCart(void 0, !1, r)
        : n.removeFromCart([e], !1, r);
    });
  }
  removeProducts(e, r) {
    this.legacyApiImpl.getJsApiAsync().then((n) => {
      n.removeFromCart(e, !0, r);
    });
  }
  updateCartItem(e, r) {
    this.legacyApiImpl.getJsApiAsync().then((n) => {
      n.updateCartItem(e, r);
    });
  }
  clear(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.clearCart(e);
    });
  }
  get(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.getCart(e);
    });
  }
  calculateTotal(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.calculateTotal(e);
    });
  }
  gotoCheckout(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.goToCheckout(e);
    });
  }
  canGotoCheckout(e) {
    return (
      this.legacyApiImpl.getJsApiAsync().then((r) => {
        r.canGoToCheckout(e);
      }),
      !0
    );
  }
  setCustomerEmail(e, r, n) {
    if (this.isEmptyString(e)) return;
    const o = "Ecwid.Cart.setCustomerEmail()";
    this.legacyApiImpl.getJsApiAsync().then((i) => {
      i.updateCart(
        {
          email: e,
        },
        r,
        n,
        o,
      );
    });
  }
  setOrderComments(e, r, n) {
    if (this.isEmptyString(e)) return;
    const o = "Ecwid.Cart.setOrderComments()";
    this.legacyApiImpl.getJsApiAsync().then((i) => {
      i.updateCart(
        {
          orderComments: e,
        },
        r,
        n,
        o,
      );
    });
  }
  setAddress(e, r, n) {
    const o = "Ecwid.Cart.setAddress()";
    this.legacyApiImpl.getJsApiAsync().then((i) => {
      i.updateCart(
        {
          shippingPerson: e,
        },
        r,
        n,
        o,
      );
    });
  }
  setBillingAddress(e, r, n) {
    const o = "Ecwid.Cart.setBillingAddress()";
    this.legacyApiImpl.getJsApiAsync().then((i) => {
      i.updateCart(
        {
          billingPerson: e,
        },
        r,
        n,
        o,
      );
    });
  }
  refreshCartInfo(e) {
    this.legacyApiImpl.getJsApiAsync().then((r) => {
      r.refreshCartInfo(e);
    });
  }
  isEmptyString(e) {
    return e === void 0 || e.trim() === "";
  }
}
const b = {
  STANDARD: "STANDARD",
  MINI: "MINI",
  FLOATING: "FLOATING",
  UNSUPPORTED: "UNSUPPORTED",
};
function O(t) {
  switch (t?.toString()?.toLowerCase()) {
    case "true":
    case "1":
      return !0;
    case "false":
    case "0":
      return !1;
    default:
      return;
  }
}
function x(t) {
  if (t !== void 0) {
    const e = parseInt(t?.toString(), 10);
    if (!Number.isNaN(e)) return e;
  }
}
function In(t) {
  if (t !== void 0) {
    const e = parseFloat(t);
    if (!Number.isNaN(e)) return e;
  }
}
function P(t, e) {
  for (const r of Object.keys(t)) {
    const n = t[r];
    if (n !== void 0 && n.toString() === e) return t[r];
  }
}
function ne(t, e) {
  const r = t.getAttribute(e);
  if (r !== null) return r;
}
function z(t, e) {
  const r = ne(t, e);
  return x(r);
}
function M(t, e) {
  const r = ne(t, e);
  return O(r);
}
function V(t, e, r) {
  return P(r, t.getAttribute(e));
}
const me = "productid",
  dr = "layout",
  lr = "defaultCategoryId",
  gr = "defaultProductId",
  pr = /grid\((?<rows>\d+), *(?<cols>\d+)\)/,
  mr = "views",
  fe = "productid",
  Ae = "data-single-product-id";
function fr(t) {
  const e = t[mr];
  if (e !== void 0) {
    const r = e.match(pr);
    if (
      r !== null &&
      r.groups !== void 0 &&
      r.groups.rows !== void 0 &&
      r.groups.cols !== void 0
    ) {
      const n = Math.max(1, parseInt(r.groups.rows, 10)),
        o = Math.max(1, parseInt(r.groups.cols, 10));
      return n * o;
    }
  }
}
function Ar(t) {
  const e = t[lr],
    r = e !== void 0 ? parseInt(e, 10) : NaN;
  return !Number.isNaN(r) && r > 0 ? r : void 0;
}
function hr(t) {
  const e = t[gr],
    r = e !== void 0 ? parseInt(e, 10) : NaN;
  return !Number.isNaN(r) && r > 0 ? r : void 0;
}
function Er(t, e) {
  const r = e[dr] ?? "";
  return r.toLowerCase().includes("attach")
    ? b.UNSUPPORTED
    : r === "floating"
      ? b.FLOATING
      : r === "Mini"
        ? b.MINI
        : b.STANDARD;
}
function Ir(t) {
  const e = x(t[me]);
  if (e === void 0) throw new Error(`Parameter '${me}' is missing or invalid`);
  return e;
}
function Tr(t, e, r) {
  return {
    productId: e,
    pageProductIdsPromise: r,
  };
}
function Sr(t, e) {
  return {
    layout: Er(t, e),
  };
}
function yr(t) {
  return {
    isMobileViewNotAllowed: t.hasAttribute("data-mobile-no"),
    isChildrenNotAllowed: t.hasAttribute("data-children-no"),
  };
}
function Cr(t) {
  return {
    layout: V(t, p.DATA_LAYOUT, Ue),
    icon: V(t, p.DATA_ICON, Ne),
    isFixed: M(t, p.DATA_FIXED),
    fixedPosition: V(t, p.DATA_FIXED_POSITION, Le),
    fixedShape: V(t, p.DATA_FIXED_SHAPE, F),
    horizontalIndent: z(t, p.DATA_HORIZONTAL_INDENT),
    verticalIndent: z(t, p.DATA_VERTICAL_INDENT),
    isResponsive: M(t, p.DATA_RESPONSIVE),
    customIconUrl: ne(t, p.DATA_CUSTOM_ICON_URL),
    showEmptyCart: M(t, p.DATA_SHOW_EMPTY_CART),
    showBuyAnimation: M(t, p.DATA_SHOW_BUY_ANIMATION),
  };
}
function Pr(t) {
  return {
    layout: P(Ue, t[p.DATA_LAYOUT]),
    icon: P(Ne, t[p.DATA_ICON]),
    isFixed: O(t[p.DATA_FIXED]),
    fixedPosition: P(Le, t[p.DATA_FIXED_POSITION]),
    fixedShape: P(F, t[p.DATA_FIXED_SHAPE]),
    horizontalIndent: x(t[p.DATA_HORIZONTAL_INDENT]),
    verticalIndent: x(t[p.DATA_VERTICAL_INDENT]),
    isResponsive: O(t[p.DATA_RESPONSIVE]),
    customIconUrl: t[p.DATA_CUSTOM_ICON_URL],
    showEmptyCart: O(t[p.DATA_SHOW_EMPTY_CART]),
    showBuyAnimation: O(t[p.DATA_SHOW_BUY_ANIMATION]),
  };
}
function _r(t, e) {
  const r = Cr(t),
    n = Pr(e);
  return {
    layout: n.layout ?? r.layout,
    icon: n.icon ?? r.icon,
    isFixed: n.isFixed ?? r.isFixed,
    fixedPosition: n.fixedPosition ?? r.fixedPosition,
    fixedShape: n.fixedShape ?? r.fixedShape,
    horizontalIndent: n.horizontalIndent ?? r.horizontalIndent,
    verticalIndent: n.verticalIndent ?? r.verticalIndent,
    isResponsive: n.isResponsive ?? r.isResponsive,
    customIconUrl: n.customIconUrl ?? r.customIconUrl,
    showEmptyCart: n.showEmptyCart ?? r.showEmptyCart,
    showBuyAnimation: n.showBuyAnimation ?? r.showBuyAnimation,
  };
}
function Rr(t) {
  return {
    defaultCategoryId: Ar(t),
    defaultProductId: hr(t),
    productsPerPage: fr(t),
    timeZoneOffset: void 0,
  };
}
function wr(t) {
  const e = t[fe],
    r = e !== void 0 ? parseInt(e, 10) : NaN;
  if (Number.isNaN(r))
    throw new Error(`Parameter '${fe}' is missing or invalid`);
  return r;
}
function Or(t, e) {
  return {
    productId: t,
    pageProductIdsPromise: e,
  };
}
function he(t) {
  const e = z(t, Ae);
  if (e === void 0) throw new Error(`Attribute '${Ae}' is missing or invalid`);
  return e;
}
function Ee(t, e, r) {
  return {
    productId: t,
    pageProductIdsPromise: e,
    isNewLookAndFeel: r,
  };
}
class vr {
  ecommerce;
  constructor(e) {
    this.ecommerce = e;
  }
  pageProductIds = new Set();
  collectPageProductId(e) {
    return (
      this.pageProductIds.add(e),
      new Promise((r) => {
        setTimeout(() => {
          const n = [...this.pageProductIds].sort();
          r(n);
        }, 0);
      })
    );
  }
  async renderWidget(e, r) {
    const n = Me(e.arg ?? []);
    switch (
      (await new Promise((o) => {
        setTimeout(o);
      }),
      e.widgetType)
    ) {
      case a.ADD_TO_BAG: {
        const o = Ir(n),
          i = this.collectPageProductId(o);
        return this.ecommerce.widgets.createAddToBag({
          containerElement: r,
          rootProps: Tr(r, o, i),
        });
      }
      case a.HORIZONTAL_CATEGORIES_V1:
        return this.ecommerce.widgets.createCategoriesV1({
          containerElement: r,
          rootProps: {
            direction: H.HORIZONTAL,
          },
        });
      case a.CATEGORIES_V2:
        return this.ecommerce.widgets.createCategoriesV2({
          containerElement: r,
          rootProps: yr(r),
        });
      case a.MINICART_V1:
        return this.ecommerce.widgets.createMinicartV1({
          containerElement: r,
          rootProps: Sr(r, n),
        });
      case a.MINICART_V2:
        return this.ecommerce.widgets.createMinicartV2({
          containerElement: r,
          rootProps: _r(r, n),
        });
      case a.PRODUCT: {
        const o = he(r),
          i = this.collectPageProductId(o);
        return this.ecommerce.widgets.createSingleProduct({
          containerElement: r,
          rootProps: Ee(o, i, !0),
        });
      }
      case a.PRODUCT_BROWSER:
        return this.ecommerce.widgets.createProductBrowser({
          containerElement: r,
          rootProps: Rr(n),
        });
      case a.PRODUCT_THUMBNAIL: {
        const o = wr(n),
          i = this.collectPageProductId(o);
        return this.ecommerce.widgets.createProductThumbnail({
          containerElement: r,
          rootProps: Or(o, i),
        });
      }
      case a.SEARCH_PANEL:
        return this.ecommerce.widgets.createSearchPanel({
          containerElement: r,
          rootProps: {},
        });
      case a.SEARCH_WIDGET:
        return this.ecommerce.widgets.createSearchWidget({
          containerElement: r,
          rootProps: {},
        });
      case a.SINGLE_PRODUCT: {
        const o = he(r),
          i = this.collectPageProductId(o);
        return this.ecommerce.widgets.createSingleProduct({
          containerElement: r,
          rootProps: Ee(o, i, !1),
        });
      }
      case a.VERTICAL_CATEGORIES_V1:
        return this.ecommerce.widgets.createCategoriesV1({
          containerElement: r,
          rootProps: {
            direction: H.VERTICAL,
          },
        });
      case a.CP_PREVIEW_PRODUCT_CARD:
        return this.ecommerce.widgets.createCpPreviewProductCard({
          containerElement: r,
        });
      case a.CP_PREVIEW_CATEGORY:
        return this.ecommerce.widgets.createCpPreviewCategory({
          containerElement: r,
        });
      default:
        throw new Error(`Unknown widget type '${e.widgetType}'`);
    }
  }
}
class Dr {
  jsApiSync;
  trackerAsync;
  ecommerce;
  ecImpl;
  ecwidImpl;
  ecwidCartImpl;
  windowImpl;
  constructor(e, r) {
    this.ecommerce = e;
    const n = new vr(this.ecommerce);
    ((this.ecImpl = new Zt(this)),
      (this.ecwidImpl = new rr(this, n, r)),
      (this.ecwidCartImpl = new ur(this)),
      (this.windowImpl = new cr(this.ecwidImpl, n, r)));
  }
  getEcImpl() {
    return this.ecImpl;
  }
  getEcwidImpl() {
    return this.ecwidImpl;
  }
  getEcwidCartImpl() {
    return this.ecwidCartImpl;
  }
  getWindowImpl() {
    return this.windowImpl;
  }
  getEcommerce() {
    return this.ecommerce;
  }
  ensureJsApiSync() {
    if (this.jsApiSync === void 0)
      throw Error(`Ecwid JS API is not initialized!
Please make sure your code is wrapped in an Ecwid.OnAPILoaded.add callback.
See the documentation for more details: https://api-docs.ecwid.com/reference/ecwidonapiloaded#ecwidonapiloaded`);
    return this.jsApiSync;
  }
  getJsApiAsync() {
    const r = this.getEcommerce().widgets.createOrGetJsApi();
    return (
      r.then((n) => {
        this.jsApiSync = n;
      }),
      r
    );
  }
  getTrackerAsync() {
    if (this.trackerAsync === void 0) {
      const e = this.getEcommerce(),
        r = document.createElement("div");
      this.trackerAsync = e.widgets.createTracker({
        containerElement: r,
        rootProps: {},
      });
    }
    return this.trackerAsync;
  }
}
class Lr extends EventTarget {
  addEventListener(e, r, n) {
    super.addEventListener(e, r, n);
  }
  removeEventListener(e, r, n) {
    super.removeEventListener(e, r, n);
  }
  dispatchTypedEvent(e, r) {
    return super.dispatchEvent(r);
  }
}
function Nr(t, e) {
  return [
    {
      target: t.Array,
      property: "from",
      iframeReferenceFunc: e.Array.from,
    },
    {
      target: t.Array.prototype,
      property: "reduce",
      iframeReferenceFunc: e.Array.prototype.reduce,
    },
    {
      target: t.Array.prototype,
      property: "toJSON",
      iframeReferenceFunc: void 0,
    },
    {
      target: t.window.Function.prototype,
      property: "bind",
      iframeReferenceFunc: e.window.Function.prototype.bind,
    },
    {
      target: t.window.String.prototype,
      property: "replaceAll",
      iframeReferenceFunc: e.window.String.prototype.replaceAll,
    },
    {
      target: t.window.String.prototype,
      property: "trim",
      iframeReferenceFunc: e.window.String.prototype.trim,
    },
    {
      target: t.window.String.prototype,
      property: "trimLeft",
      iframeReferenceFunc: e.window.String.prototype.trimLeft,
    },
    {
      target: t.window.String.prototype,
      property: "trimRight",
      iframeReferenceFunc: e.window.String.prototype.trimRight,
    },
    {
      target: t.window.Promise,
      property: "allSettled",
      iframeReferenceFunc: e.window.Promise.allSettled,
    },
    {
      target: t.window,
      property: "Event",
      iframeReferenceFunc: e.window.Event,
    },
  ];
}
function Ur(t) {
  return typeof t != "function" || !t.toString().includes("[native code]");
}
function br(t, e, r, n) {
  const o = e,
    i = o[r];
  return n !== void 0 && (i === void 0 || Ur(i))
    ? (t.warn(
        g.APP_LIFECYCLE,
        `Browser function '${r}' patched – restoring native implementation. Old value:`,
        o[r],
      ),
      (o[r] = n),
      !0)
    : n === void 0 && i !== void 0
      ? (t.warn(
          g.APP_LIFECYCLE,
          `Browser function '${r}' defined, even though it should not – deleting custom implementation`,
        ),
        delete o[r],
        !0)
      : !1;
}
function Mr(t, e) {
  let r = !1;
  for (const { target: n, property: o, iframeReferenceFunc: i } of t)
    r = br(e, n, o, i) || r;
  return r;
}
function Vr() {
  const t = document.createElement("iframe");
  return (document.body.appendChild(t), t);
}
function xr(t) {
  let e;
  try {
    e = Vr();
    const r = e.contentWindow;
    if (r !== null) {
      const n = Nr(window, r);
      Mr(n, t);
    }
  } catch (r) {
    t.error(g.APP_LIFECYCLE, "Failed to restore patched browser functions:", r);
  } finally {
    e !== void 0 && e.remove();
  }
}
function Wr(t) {
  if (t === void 0) return {};
  const e = t.sessionToken.value;
  return e !== void 0
    ? {
        Authorization: `Bearer ${e}`,
      }
    : {};
}
function Br(t) {
  return JSON.stringify(t);
}
function Fr(t, e) {
  return new Headers({
    "Content-Type": "application/json",
    ...Wr(t),
    ...e,
  });
}
async function kr(t, e, r, n) {
  return pt(() => ({
    method: t,
    mode: "cors",
    headers: Fr(r, n),
    body: Br(e),
  }));
}
const Ve = "StorefrontApiBusinessError";
class Gr extends Error {
  type = Ve;
  response;
  data;
  text;
  constructor(e, r) {
    (super(e.statusText), (this.response = e));
    try {
      this.data = JSON.parse(r);
    } catch {
      this.data = void 0;
    }
    this.text = r;
  }
  isBadRequestError() {
    return this.response.status === 400;
  }
  isUnauthorizedError() {
    return this.response.status === 401;
  }
  isNotFoundError() {
    return this.response.status === 404;
  }
  getData() {
    return this.data;
  }
  getText() {
    return this.text;
  }
  getResponse() {
    return this.response;
  }
}
function W(t) {
  return "type" in t && t.type === Ve;
}
const C = {
    DYNAMIC: "DYNAMIC",
    SSR_NORMAL: "SSR_NORMAL",
    SSR_HEAVY: "SSR_HEAVY",
  },
  Jr = {
    [C.DYNAMIC]: 8,
    [C.SSR_NORMAL]: 1,
    [C.SSR_HEAVY]: 1,
  };
function Hr(t) {
  return Jr[t];
}
function jr(t, e, r, n) {
  if (e?.isRetryable === !1) return !1;
  const o = Hr(r);
  if (t >= o) return !1;
  if (W(n)) {
    const i = n.getResponse().status;
    return i >= 500 && i <= 599;
  }
  return !0;
}
function xe(t) {
  return new Date().getTime() - t.getTime();
}
function k(t) {
  return t > 1 ? [`(x${t})`] : [];
}
function qr(t) {
  const e = xe(t.requestStartDate),
    r = t.error.getResponse(),
    n = [
      `#${t.currentRequestIndex}`,
      ...k(t.retryNumber),
      "⛌",
      `[${e} ms]`,
      `[${r.status} ${r.statusText}]`,
      t.requestMethod?.toUpperCase(),
      t.url,
      t.error.getData() ?? t.error.getText(),
    ];
  t.logger.warn(g.REST, ...n);
}
function $r(t) {
  const e = [];
  let r = t;
  for (; r !== void 0; )
    (e.push(r.stack ?? r.message ?? String(r)), (r = r.cause));
  return e.join(`
Caused by: `);
}
function Yr(t) {
  const e = [
    `#${t.currentRequestIndex}`,
    ...k(t.retryNumber),
    "⛌",
    t.requestMethod?.toUpperCase(),
    t.url,
    $r(t.error),
  ];
  t.logger.warn(g.REST, ...e);
}
function zr(t) {
  W(t.error)
    ? qr({
        logger: t.logger,
        requestStartDate: t.requestStartDate,
        currentRequestIndex: t.currentRequestIndex,
        retryNumber: t.retryNumber,
        requestMethod: t.requestMethod,
        url: t.url,
        error: t.error,
      })
    : Yr({
        logger: t.logger,
        url: t.url,
        currentRequestIndex: t.currentRequestIndex,
        retryNumber: t.retryNumber,
        requestMethod: t.requestMethod,
        error: t.error.getError(),
      });
}
function Kr(t) {
  const e = [
    `#${t.currentRequestIndex}`,
    ...k(t.retryNumber),
    "⮕",
    t.requestMethod.toUpperCase(),
    t.url,
    t.data,
  ];
  t.logger.info(g.REST, ...e);
}
function Xr(t) {
  const e = xe(t.requestStartDate),
    r = `${t.responseStatus} ${t.responseStatusText}`.trim(),
    n = [
      `#${t.currentRequestIndex}`,
      ...k(t.retryNumber),
      "⬅",
      `[${e} ms]`,
      `[${r}]`,
      t.requestMethod?.toUpperCase(),
      t.url,
      t.responseData,
    ];
  t.logger.info(g.REST, ...n);
}
const Qr = "StorefrontApiFatalError";
class Zr extends Error {
  type = Qr;
  error;
  constructor(e) {
    (super(e.message), (this.error = e));
  }
  getError() {
    return this.error;
  }
}
function Tn() {
  return !1;
}
function Sn() {
  return window.top?.location !== window.location;
}
function en(t) {
  return C.DYNAMIC;
}
const tn = {
  [C.DYNAMIC]: 3e4,
  [C.SSR_NORMAL]: 2e3,
  [C.SSR_HEAVY]: 5e3,
};
function rn(t) {
  return tn[t];
}
function nn(t) {
  const e = 2 ** t * 100,
    r = e * 0.2 * Math.random();
  return e + r;
}
function on(t) {
  return new Promise((e) => {
    setTimeout(e, nn(t));
  });
}
class sn {
  sessionStorageOptions;
  storeId;
  apiBaseUrl;
  additionalHeaders;
  logger;
  requestIndex = 0;
  constructor(e, r, n, o) {
    ((this.storeId = e),
      (this.apiBaseUrl = r),
      (this.additionalHeaders = n),
      (this.logger = o));
  }
  createRequestUrl(e) {
    return `${this.apiBaseUrl}/${this.storeId}${e}`;
  }
  setSessionStorageOptions(e) {
    this.sessionStorageOptions = e;
  }
  async makeRequest(e, r, n) {
    let o = 1;
    this.requestIndex += 1;
    const i = "post",
      s = this.requestIndex,
      c = async () => {
        const u = new Date(),
          m = en();
        try {
          Kr({
            logger: this.logger,
            url: e,
            data: r,
            currentRequestIndex: s,
            retryNumber: o,
            requestMethod: i,
          });
          const d = await kr(
              i,
              r,
              this.sessionStorageOptions,
              this.additionalHeaders,
            ),
            l = await we(this.createRequestUrl(e), d, rn(m));
          if (!l.ok) {
            const L = await l.text();
            throw new Gr(l, L);
          }
          const f = await l.json();
          return (
            Xr({
              logger: this.logger,
              url: e,
              currentRequestIndex: s,
              retryNumber: o,
              requestStartDate: u,
              requestMethod: i,
              responseStatus: l.status,
              responseStatusText: l.statusText,
              responseData: f,
            }),
            {
              data: f,
            }
          );
        } catch (d) {
          const l = d,
            f = W(l) ? l : new Zr(l);
          if (
            (zr({
              logger: this.logger,
              url: e,
              currentRequestIndex: s,
              retryNumber: o,
              requestStartDate: u,
              requestMethod: i,
              error: f,
            }),
            W(l) && l.isUnauthorizedError())
          )
            throw (this.resetInvalidSession(), l);
          if (jr(o, n, m, f)) return (await on(o), (o += 1), c());
          throw l;
        }
      };
    return c();
  }
  resetInvalidSession() {
    this.sessionStorageOptions !== void 0 &&
      ((this.sessionStorageOptions.isolatedSessionMode.value = void 0),
      (this.sessionStorageOptions.sessionToken.value = void 0),
      (this.sessionStorageOptions.checkoutInfo.value = void 0),
      (this.sessionStorageOptions.legacyAuthToken.value = void 0));
  }
}
const Ie = {
    NORMAL: "NORMAL",
    PREVIEW_PRODUCT_EDITOR_PAGE: "PREVIEW_PRODUCT_EDITOR_PAGE",
    PREVIEW_BUY_BUTTONS_PAGE: "PREVIEW_BUY_BUTTONS_PAGE",
    PREVIEW_DESIGN_PAGE: "PREVIEW_DESIGN_PAGE",
    PREVIEW_INSTANT_SITE_EDITOR_PAGE: "PREVIEW_INSTANT_SITE_EDITOR_PAGE",
  },
  an = {
    NOT_LOADED: "NOT_LOADED",
    MOUNTED: "MOUNTED",
    UNMOUNTED: "UNMOUNTED",
  };
class cn {
  eventListeners = new Map();
  ensureListeners(e) {
    const r = this.eventListeners.get(e);
    if (r !== void 0) return r;
    const n = new Set();
    return (this.eventListeners.set(e, n), n);
  }
  publish(e, ...r) {
    const n = this.eventListeners.get(e);
    n !== void 0 &&
      n.forEach((o) => {
        (o.fn(...r), o.options?.isOnce === !0 && n.delete(o));
      });
  }
  subscribe(e, r, n) {
    const o = this.ensureListeners(e),
      i = {
        fn: r,
        options: n,
      };
    return (
      o.add(i),
      () => {
        o.has(i) &&
          (o.delete(i), o.size === 0 && this.eventListeners.delete(e));
      }
    );
  }
}
const un = "ec-storefront-forced-tracing-enabled",
  dn = "X-Ec-Forced-Tracing-Enabled";
function ln() {
  return new ze(gt, "show_ec_logs");
}
function gn(t, e, r) {
  if (t !== void 0) return Promise.resolve(t);
  const n = {
    lang: e,
  };
  return r.makeRequest("/bootstrap", n).then((o) => o.data);
}
function pn(t) {
  const e = Math.random() < E.getEcommerceJsParams().tracingSampleRatio;
  return t || e
    ? {
        [dn]: "true",
      }
    : {};
}
function mn(t) {
  return {
    ...pn(t),
  };
}
function fn(t, e) {
  return !!(e || Math.random() < t.sampleRatio);
}
function An(t, e, r) {
  if (t !== null && fn(t, r))
    return A(
      () => import("./vendor-datadog-browser-rum-jclc75gn.js"),
      [],
      import.meta.url,
    ).then((n) => {
      const o = n.datadogRum;
      return (
        o.init({
          applicationId: t.applicationId,
          clientToken: t.clientToken,
          site: t.site,
          service: t.service,
          env: t.env,
          version: t.version,
          allowedTracingUrls: [
            {
              match: e,
              propagatorTypes: ["tracecontext"],
            },
          ],
          sessionSampleRate: 100,
          sessionReplaySampleRate: 0,
          trackingConsent:
            window.ec?.config?.disable_all_cookies === !0
              ? "not-granted"
              : "granted",
          trackUserInteractions: !0,
          trackResources: !0,
          trackLongTasks: !0,
        }),
        o
      );
    });
}
class oe extends Lr {
  interop;
  widgets;
  legacyApiImpl;
  static updateGlobalEcommerceInstance(e) {
    window.Ecwid.ecommerceInstance === void 0 &&
      (window.Ecwid.ecommerceInstance = e);
  }
  constructor(e) {
    (super(), oe.updateGlobalEcommerceInstance(this));
    const r = ln();
    xr(r);
    const n = E.getEntryPointQueryParams(),
      o = e?.storeId ?? n.storeId,
      i = e?.apiBaseUrl ?? E.getEcommerceJsParams().apiBaseUrl,
      s = e?.lang ?? n.lang,
      c = P(Ie, e?.appMode) ?? Ie.NORMAL,
      u = K.get(un) === "true",
      m = An(E.getEcommerceJsParams().datadogRum, i, u),
      d = {
        ecommerceEventTarget: this,
        apiEventBus: new cn(),
        datadogRumPromise: m,
        widgetLang: s,
        dataPlatform: n.dataPlatform,
        storefrontV2State: an.NOT_LOADED,
      };
    this.legacyApiImpl = new Dr(this, r);
    const l = new sn(o, i, mn(u), r),
      f = gn(e?.bootstrap, s, l);
    ((this.interop = new Xe(this.legacyApiImpl)),
      (this.widgets = new Qt({
        appMode: c,
        bootstrapPromise: f,
        ecommerce: this,
        logger: r,
        requestContext: d,
        sessionToken: e?.sessionToken,
        storefrontApiClient: l,
        storeId: o,
      })));
  }
  addEventListener(e, r, n) {
    this.legacyApiImpl.getJsApiAsync().then(() => {
      super.addEventListener(e, r, n);
    });
  }
  refreshConfig() {
    this.legacyApiImpl.getEcwidImpl().refreshConfig();
  }
  setRouterExternalState(e) {
    this.legacyApiImpl.getEcwidImpl().setRouterExternalState(e);
  }
}
window.ec = window.ec ?? {};
window.ec.config = window.ec.config ?? {};
window.ec.order = window.ec.order ?? {};
window.ec.order.extraFields = window.ec.order.extraFields ?? {};
window.ec.storefront = window.ec.storefront ?? {};
window._xnext_initialization_scripts =
  window._xnext_initialization_scripts ?? [];
window.Ecommerce = oe;
window.EcommerceGlobals = E;
window.rtCommonProps !== void 0 &&
  (delete window.rtCommonProps["new.store.fix.ecwid.back.bug"],
  delete window.rtCommonProps["new.store.accountPage.ecwid.signIn.fix"]);
(() => {
  const t = new CustomEvent("ecommerce.ready");
  document.dispatchEvent(t);
})();
export {
  Ie as A,
  Q as B,
  H as C,
  a as D,
  oe as E,
  g as L,
  b as M,
  an as S,
  A as _,
  P as a,
  Le as b,
  Ue as c,
  De as d,
  F as e,
  Ne as f,
  Sn as g,
  Rt as h,
  W as i,
  Re as j,
  de as k,
  yt as l,
  v as m,
  K as n,
  ft as o,
  x as p,
  Tn as q,
  hn as r,
  En as s,
  O as t,
  Ot as u,
  In as v,
  Se as w,
  I as x,
  B as y,
  sr as z,
};
//# sourceMappingURL=https://storefront.ecwid.dev:16088/static/ecommerce-lblkny9l.js.map
