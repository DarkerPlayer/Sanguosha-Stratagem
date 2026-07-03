function buildBootstrapScript(baseUrl, version) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const ver = version || "2.0.0-bootstrap";
  return `// ==UserScript==
// @name         幽灵山庄打小抄（云端）
// @namespace    https://sanguosha-stratagem.onrender.com/cheat
// @version      ${ver}
// @author       小麦 幽灵山庄
// @description  幽灵山庄公会专属 · 每周自动更新，平时本地秒开
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
  var UPDATE_CYCLE_DAYS = 7;
  var UPDATE_CYCLE_MS = UPDATE_CYCLE_DAYS * 24 * 60 * 60 * 1000;
  var CACHE_CODE_KEY = "yl_cache_app_code";
  var CACHE_SHA_KEY = "yl_cache_app_sha";
  var CACHE_VER_KEY = "yl_cache_manifest_ver";
  var CACHE_UPDATE_UNTIL_KEY = "yl_cache_update_until";
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
  function updateUntil() {
    var until = Number(lsGet(CACHE_UPDATE_UNTIL_KEY) || lsGet("yl_cache_license_until") || 0);
    if (until) return until;
    var at = Number(lsGet(CACHE_AT_KEY) || 0);
    return at ? at + UPDATE_CYCLE_MS : 0;
  }
  function cacheReady() {
    var code = lsGet(CACHE_CODE_KEY);
    if (!code || code.length < 1000) return false;
    return updateUntil() > Date.now();
  }
  function clearCache() {
    [CACHE_CODE_KEY, CACHE_SHA_KEY, CACHE_VER_KEY, CACHE_UPDATE_UNTIL_KEY, CACHE_AT_KEY].forEach(lsDel);
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
  function readCache() { return lsGet(CACHE_CODE_KEY); }
  function writeCache(code, sha, manifestVer) {
    var now = Date.now();
    lsSet(CACHE_CODE_KEY, code);
    lsSet(CACHE_SHA_KEY, sha || "");
    lsSet(CACHE_VER_KEY, manifestVer || "");
    lsSet(CACHE_AT_KEY, String(now));
    lsSet(CACHE_UPDATE_UNTIL_KEY, String(now + UPDATE_CYCLE_MS));
  }
  function runApp(code) {
    var el = document.createElement("script");
    el.textContent = code;
    el.setAttribute("data-yl-boot", "1");
    (document.documentElement || document.head || document.body).appendChild(el);
  }
  function progress(onProgress, text) {
    if (typeof onProgress === "function") onProgress(text);
    else showBanner(text);
  }
  async function pullWeeklyUpdate(onProgress) {
    async function wakeServer() {
      var delays = [0, 3000, 5000, 8000, 10000];
      var timeouts = [65000, 45000, 30000, 20000, 15000];
      for (var i = 0; i < delays.length; i++) {
        if (delays[i]) await sleep(delays[i]);
        progress(onProgress, "检查更新中… (" + (i + 1) + "/" + delays.length + ")");
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
    async function withRetry(fn, times, gap) {
      var last;
      for (var i = 0; i < times; i++) {
        if (i) {
          progress(onProgress, "检查更新中，重试 " + (i + 1) + "/" + times + "…");
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
      progress(onProgress, "正在下载最新版本…");
      var res = await fetch(BASE + "/api/v1/modules/app", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        mode: "cors"
      });
      if (!res.ok) throw new Error("module " + res.status);
      return res.text();
    }
    try {
      progress(onProgress, "正在检查更新…");
      if (!(await wakeServer())) return { ok: false, error: "offline" };
      var hs = await withRetry(handshake, 3, 2000);
      var manifest = await withRetry(function () { return fetchManifest(hs.token); }, 3, 2000);
      if (manifest.killSwitch) {
        return { ok: false, error: manifest.message || "paused" };
      }
      var mod = (manifest.modules || [])[0];
      var code = await withRetry(function () { return fetchApp(hs.token); }, 3, 3000);
      if (mod && mod.sha256) {
        var ok = true;
        try {
          var buf = new TextEncoder().encode(code);
          var hash = await crypto.subtle.digest("SHA-256", buf);
          var hex = Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
          if (hex !== mod.sha256) ok = false;
        } catch (_e) { ok = true; }
        if (!ok) return { ok: false, error: "checksum" };
      }
      var prevSha = lsGet(CACHE_SHA_KEY) || "";
      writeCache(code, mod && mod.sha256, manifest.version);
      return {
        ok: true,
        version: manifest.version || "",
        changed: !!(mod && mod.sha256 && mod.sha256 !== prevSha)
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  window.__ylCloudBase = BASE;
  window.__ylPullWeeklyUpdate = pullWeeklyUpdate;

  if (cacheReady()) {
    runApp(readCache());
    return;
  }

  (async function weeklyUpdateOnLoad() {
    var hadCache = !!readCache();
    showBanner(hadCache ? "每周自动更新中，请稍候…" : "首次加载，正在准备小抄…");
    var res = await pullWeeklyUpdate(showBanner);
    if (res.ok) {
      hideBanner();
      runApp(readCache());
      return;
    }
    if (hadCache && readCache()) {
      hideBanner();
      runApp(readCache());
      return;
    }
    showBanner("更新暂时失败，请稍后刷新或打开 " + BASE + "/cheat", "#fbbf24");
  })();
})();
`;
}

module.exports = { buildBootstrapScript };
