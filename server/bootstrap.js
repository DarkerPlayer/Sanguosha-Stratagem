function buildBootstrapScript(baseUrl, version) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const ver = version || "2.0.0-bootstrap";
  return `// ==UserScript==
// @name         幽灵山庄打小抄（云端）
// @namespace    https://sanguosha-stratagem.onrender.com/cheat
// @version      ${ver}
// @author       小麦 幽灵山庄
// @description  幽灵山庄公会专属 · 首次云端授权后本地缓存 7 天，期内免联网
// @icon         https://i0.hdslb.com/bfs/new_dyn/17ec41a0ca79633b77399065ab80da3f2138912.png
// @downloadURL  ${base}/cheat/bootstrap.user.js
// @updateURL    ${base}/cheat/bootstrap.user.js
// @match        *://game.4399iw2.com/yxsgs/*
// @match        *://my.4399.com/yxsgs/*
// @match        *://*.sanguosha.com/*
// @match        *://web.kuaiwan.com/kwsgsn/*
// @match        *://wan.baidu.com/microend?gameId=19793595/*
// @match        *://www.7k7k.com/special/sgs/?*
// @match        *://playgame.iqiyi.com/login/iframe_page_web/top?game_id=146
// @exclude      https://game.4399iw2.com/yxxsgs/*
// @exclude      *://*.sanguosha.com/10/*
// @exclude      *://*.sanguosha.com/10th/*
// @exclude      https://wan.baidu.com/*gameId=19793616*
// @exclude      *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @exclude      *://qqgame.qq.com/webappframe/?appid=10951
// @exclude      *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function () {
  "use strict";
  var BASE = "${base}";
  var LICENSE_DAYS = 7;
  var LICENSE_MS = LICENSE_DAYS * 24 * 60 * 60 * 1000;
  var CACHE_CODE_KEY = "yl_cache_app_code";
  var CACHE_SHA_KEY = "yl_cache_app_sha";
  var CACHE_VER_KEY = "yl_cache_manifest_ver";
  var CACHE_LICENSE_UNTIL_KEY = "yl_cache_license_until";
  var CACHE_AT_KEY = "yl_cache_app_at";
  var CLIENT_KEY = "yl_client_id";

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_e) {} }
  function getClientId() {
    var id = lsGet(CLIENT_KEY);
    if (!id) { id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); lsSet(CLIENT_KEY, id); }
    return id;
  }
  function licenseUntil() {
    var until = Number(lsGet(CACHE_LICENSE_UNTIL_KEY) || 0);
    if (until) return until;
    var at = Number(lsGet(CACHE_AT_KEY) || 0);
    return at ? at + LICENSE_MS : 0;
  }
  function cacheLicensed() {
    var code = lsGet(CACHE_CODE_KEY);
    if (!code || code.length < 1000) return false;
    var until = licenseUntil();
    return until > Date.now();
  }
  function licenseDaysLeft() {
    var left = licenseUntil() - Date.now();
    if (left <= 0) return 0;
    return Math.ceil(left / 86400000);
  }
  function clearCache() {
    [CACHE_CODE_KEY, CACHE_SHA_KEY, CACHE_VER_KEY, CACHE_LICENSE_UNTIL_KEY, CACHE_AT_KEY].forEach(lsDel);
  }
  function showBanner(text, color) {
    try {
      var el = document.getElementById("ylBootBanner");
      if (!el) {
        el = document.createElement("div");
        el.id = "ylBootBanner";
        el.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border-radius:8px;font:13px/1.4 -apple-system,PingFang SC,Microsoft YaHei,sans-serif;color:#e8f4fc;background:rgba(15,39,68,.92);border:1px solid #7ec8e3;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none";
        (document.documentElement || document.body).appendChild(el);
      }
      el.textContent = text;
      if (color) el.style.borderColor = color;
    } catch (_e) {}
  }
  function hideBanner() {
    var el = document.getElementById("ylBootBanner");
    if (el) el.remove();
  }
  async function wakeServer() {
    var delays = [0, 3000, 5000, 8000, 10000, 12000];
    var timeouts = [65000, 65000, 45000, 30000, 20000, 15000];
    var tStart = Date.now();
    for (var i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);
      var elapsed = Math.floor((Date.now() - tStart) / 1000);
      showBanner("云端授权中… (" + (i + 1) + "/" + delays.length + ") 已等 " + elapsed + "s");
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, timeouts[i] || 15000);
        var res = await fetch(BASE + "/api/health", { cache: "no-store", signal: ctrl.signal, mode: "cors" });
        clearTimeout(timer);
        if (res.ok) return true;
      } catch (_e) {}
    }
    return false;
  }
  async function withRetry(label, fn, times, gap) {
    var last;
    for (var i = 0; i < times; i++) {
      if (i) {
        showBanner(label + " 重试 " + (i + 1) + "/" + times + "…");
        await sleep(gap);
      }
      try { return await fn(); } catch (e) { last = e; }
    }
    throw last;
  }
  async function handshake() {
    var res = await fetch(BASE + "/api/v1/handshake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: getClientId(), source: "bootstrap" }),
      mode: "cors"
    });
    if (!res.ok) throw new Error("handshake " + res.status);
    return res.json();
  }
  async function fetchManifest(token) {
    var res = await fetch(BASE + "/api/v1/manifest", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      mode: "cors"
    });
    if (!res.ok) throw new Error("manifest " + res.status);
    return res.json();
  }
  async function fetchApp(token) {
    var res = await fetch(BASE + "/api/v1/modules/app", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      mode: "cors"
    });
    if (!res.ok) throw new Error("module " + res.status);
    return res.text();
  }
  function readCache() { return lsGet(CACHE_CODE_KEY); }
  function writeCache(code, sha, manifestVer) {
    var now = Date.now();
    lsSet(CACHE_CODE_KEY, code);
    lsSet(CACHE_SHA_KEY, sha || "");
    lsSet(CACHE_VER_KEY, manifestVer || "");
    lsSet(CACHE_AT_KEY, String(now));
    lsSet(CACHE_LICENSE_UNTIL_KEY, String(now + LICENSE_MS));
  }
  function runApp(code, fromCache, meta) {
    window.__YL_BOOT__ = Object.assign({
      base: BASE,
      fromCache: !!fromCache,
      at: Date.now(),
      licensedUntil: licenseUntil(),
      licenseDaysLeft: licenseDaysLeft()
    }, meta || {});
    var el = document.createElement("script");
    el.textContent = code;
    el.setAttribute("data-yl-remote", fromCache ? "cache" : "cloud");
    (document.documentElement || document.head || document.body).appendChild(el);
  }
  async function fetchFromCloud() {
    var online = await wakeServer();
    if (!online) throw new Error("server offline");
    var hs = await withRetry("握手", handshake, 4, 2500);
    var manifest = await withRetry("拉取清单", function () { return fetchManifest(hs.token); }, 3, 2000);
    if (manifest.killSwitch) {
      clearCache();
      throw new Error(manifest.message || "服务维护中");
    }
    var mod = (manifest.modules || [])[0];
    var code = await withRetry("下载模块", function () { return fetchApp(hs.token); }, 3, 3000);
    if (mod && mod.sha256) {
      var ok = true;
      try {
        var buf = new TextEncoder().encode(code);
        var hash = await crypto.subtle.digest("SHA-256", buf);
        var hex = Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        if (hex !== mod.sha256) ok = false;
      } catch (_e) { ok = true; }
      if (!ok) throw new Error("sha256 mismatch");
    }
    writeCache(code, mod && mod.sha256, manifest.version);
    return code;
  }
  async function main() {
    if (cacheLicensed()) {
      runApp(readCache(), true, { mode: "cache" });
      return;
    }
    var hadCache = !!readCache();
    showBanner(hadCache ? "本地授权已过期，正在续期…" : "首次使用，正在从云端获取授权…");
    try {
      var code = await fetchFromCloud();
      hideBanner();
      runApp(code, false, { mode: "cloud" });
      return;
    } catch (err) {
      console.warn("[幽灵山庄] 云端授权失败", err);
    }
    if (hadCache && readCache()) {
      showBanner("续期失败，临时使用上一版缓存（公会校验仍生效）", "#fbbf24");
      setTimeout(hideBanner, 3500);
      runApp(readCache(), true, { mode: "stale" });
      return;
    }
    showBanner("无法获取授权，请打开 " + BASE + "/cheat 唤醒服务器后刷新", "#f87171");
  }
  main();
})();
`;
}

module.exports = { buildBootstrapScript };
