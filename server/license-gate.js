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
    try {
      var el = document.getElementById("ylBootBanner");
      if (!el) {
        el = document.createElement("div");
        el.id = "ylBootBanner";
        el.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border-radius:8px;font:13px/1.4 -apple-system,PingFang SC,Microsoft YaHei,sans-serif;color:#e8f4fc;background:rgba(15,39,68,.92);border:1px solid #7ec8e3;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;max-width:92vw;text-align:center";
        (document.documentElement || document.body).appendChild(el);
      }
      el.textContent = t;
      if (c) el.style.borderColor = c;
    } catch (_e) {}
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
    var prog = function (t) { if (typeof onProgress === "function") onProgress(t); else __ylBootBanner(t); };
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
    var had = !!__ylLsGet(__YL_LICENSE_UNTIL_KEY);
    __ylBootBanner(had ? "每周自动更新中，请稍候…" : "首次加载，正在准备小抄…");
    var lic = await __ylRenewLicense(__ylBootBanner);
    if (lic.ok) { __ylHideBootBanner(); return true; }
    __ylBootBanner("授权同步失败，小抄照常使用 · 可点面板「检查更新」", "#fbbf24");
    __ylBootBannerAutoHide(4000);
    return true;
  }
  window.__ylCloudBase = __YL_BASE;
  window.__ylRenewLicense = __ylRenewLicense;
  window.__ylHideBootBanner = __ylHideBootBanner;
  window.__ylLicensed = __ylLicensed;
  await __ylEnsureLicense();
`;
}

module.exports = { buildLicenseGate };
