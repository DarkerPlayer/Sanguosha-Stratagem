function buildBootBannerSilencer() {
  return `(function __ylSilenceBootUI() {
    if (window.__ylSilenceBootOn) return;
    window.__ylSilenceBootOn = !0;
    try {
      if (window.__ylBannerObs) { window.__ylBannerObs.disconnect(); window.__ylBannerObs = null; }
      if (window.__ylBannerTick) { clearInterval(window.__ylBannerTick); window.__ylBannerTick = null; }
    } catch (_e) {}
    function killBanner() {
      var el = document.getElementById("ylBootBanner");
      if (el) el.remove();
    }
    killBanner();
    try {
      if (!document.getElementById("ylBootBannerKillStyle")) {
        var st = document.createElement("style");
        st.id = "ylBootBannerKillStyle";
        st.textContent = "#ylBootBanner{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}";
        (document.head || document.documentElement).appendChild(st);
      }
    } catch (_e) {}
    try {
      if (!Node.prototype.__ylBannerHooked) {
        Node.prototype.__ylBannerHooked = !0;
        var _append = Node.prototype.appendChild;
        var _insert = Node.prototype.insertBefore;
        function blockBanner(node) {
          if (!node || node.id !== "ylBootBanner") return node;
          try { node.style.setProperty("display", "none", "important"); } catch (_e) {}
          return node;
        }
        Node.prototype.appendChild = function(child) {
          return _append.call(this, blockBanner(child));
        };
        Node.prototype.insertBefore = function(child, ref) {
          return _insert.call(this, blockBanner(child), ref);
        };
      }
    } catch (_e) {}
    try {
      document.querySelectorAll("script[data-yl-boot]").forEach(function (s) { s.remove(); });
    } catch (_e) {}
    window.__ylHideBootBanner = killBanner;
  })();`;
}

function buildLicenseGate(baseUrl) {
  const base = String(baseUrl || "https://sanguosha-stratagem.onrender.com").replace(/\/$/, "");
  return `
  var __YL_BASE = "${base}";
  var __YL_LICENSE_UNTIL_KEY = "yl_license_until";
  var __YL_LICENSE_VER_KEY = "yl_license_ver";
  var __YL_CLIENT_KEY = "yl_client_id";
  function __ylLsGet(k) { try { return localStorage.getItem(k); } catch (_e) { return null; } }
  function __ylLsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_e) { return false; } }
  function __ylLicensed() { return Number(__ylLsGet(__YL_LICENSE_UNTIL_KEY) || 0) > Date.now(); }
  function __ylBootBanner(t, c) {
    try { __ylHideBootBanner(); } catch (_e) {}
  }
  function __ylHideBootBanner() {
    var el = document.getElementById("ylBootBanner");
    if (el) el.remove();
    if (window.__ylBootBannerTimer) { clearTimeout(window.__ylBootBannerTimer); window.__ylBootBannerTimer = null; }
  }
  function __ylBootBannerAutoHide(ms) {
    if (window.__ylBootBannerTimer) clearTimeout(window.__ylBootBannerTimer);
    window.__ylBootBannerTimer = setTimeout(__ylHideBootBanner, ms || 5000);
  }
  async function __ylFetchCors(url, opts, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 45000);
    try {
      var res = await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal, mode: "cors", cache: "no-store" }));
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }
  async function __ylRenewLicense(onProgress) {
    var prog = function (t) { if (typeof onProgress === "function") onProgress(t); };
    try {
      prog("正在检查更新…");
      var cid = __ylLsGet(__YL_CLIENT_KEY);
      if (!cid) { cid = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); __ylLsSet(__YL_CLIENT_KEY, cid); }
      var hsRes = await __ylFetchCors(__YL_BASE + "/api/v1/handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: cid, source: "userscript" })
      }, 30000);
      if (!hsRes.ok) throw new Error("handshake");
      var hs = await hsRes.json();
      prog("正在同步授权…");
      var licRes = await __ylFetchCors(__YL_BASE + "/api/v1/license", {
        headers: { Authorization: "Bearer " + hs.token }
      }, 30000);
      if (!licRes.ok) throw new Error("license " + licRes.status);
      var lic = await licRes.json();
      if (!lic.ok || !lic.licenseUntil) throw new Error(lic.message || "denied");
      __ylLsSet(__YL_LICENSE_UNTIL_KEY, String(lic.licenseUntil));
      __ylLsSet(__YL_LICENSE_VER_KEY, lic.scriptVersion || "");
      return lic;
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }
  async function __ylEnsureLicense() {
    if (__ylLicensed()) { __ylHideBootBanner(); return true; }
    var lic = await __ylRenewLicense(null);
    __ylHideBootBanner();
    return true;
  }
  window.__ylCloudBase = __YL_BASE;
  window.__ylRenewLicense = __ylRenewLicense;
  window.__ylHideBootBanner = __ylHideBootBanner;
  window.__ylLicensed = __ylLicensed;
  __ylHideBootBanner();
  await __ylEnsureLicense();
`;
}

module.exports = { buildLicenseGate, buildBootBannerSilencer };
