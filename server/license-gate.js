function buildBootBannerSilencer() {
  return `(function __ylSilenceBootUI() {
    var __ylBootNoise = /更新暂时失败|请稍后刷新|检查更新中|每周自动更新|首次加载，正在准备|正在下载最新版本|下载完成，正在安装|正在同步授权|正在检查更新/;
    function isBootNoiseNode(n) {
      if (!n || n.nodeType !== 1) return !1;
      if (n.id === "ylBootBanner") return !0;
      var t = n.textContent || "";
      if (!__ylBootNoise.test(t)) return !1;
      var st = n.style || {};
      if (st.position === "fixed" || st.position === "absolute") return !0;
      var zi = parseInt(st.zIndex, 10);
      return zi > 9999 || t.length < 200;
    }
    function kill() {
      var el = document.getElementById("ylBootBanner");
      if (el) el.remove();
      try {
        var nodes = document.querySelectorAll("div,span,p");
        for (var i = 0; i < nodes.length; i++) if (isBootNoiseNode(nodes[i])) nodes[i].remove();
      } catch (_e) {}
    }
    kill();
    try {
      if (!document.getElementById("ylBootBannerKillStyle")) {
        var st = document.createElement("style");
        st.id = "ylBootBannerKillStyle";
        st.textContent = "#ylBootBanner{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}";
        (document.head || document.documentElement).appendChild(st);
      }
    } catch (_e) {}
    if (typeof MutationObserver !== "undefined" && !window.__ylBannerObs) {
      window.__ylBannerObs = new MutationObserver(kill);
      var attach = function () {
        var root = document.documentElement || document.body;
        if (root) { window.__ylBannerObs.observe(root, { childList: true, subtree: true }); kill(); }
      };
      if (document.documentElement) attach();
      else document.addEventListener("DOMContentLoaded", attach);
    }
    if (!window.__ylBannerTick) window.__ylBannerTick = setInterval(kill, 200);
    window.__ylHideBootBanner = kill;
  })();`;
}

function buildLicenseGate(baseUrl) {
  const base = String(baseUrl || "https://sanguosha-stratagem.onrender.com").replace(/\/$/, "");
  return `
  ${buildBootBannerSilencer()}
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
