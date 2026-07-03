function buildBootstrapScript(baseUrl, version) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const ver = version || "2.0.0-bootstrap";
  return `// ==UserScript==
// @name         幽灵山庄打小抄（云端）
// @namespace    https://sanguosha-stratagem.onrender.com/cheat
// @version      ${ver}
// @author       小麦 幽灵山庄
// @description  幽灵山庄公会专属 · 逻辑从服务器加载，支持冷启动缓存
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
  var CACHE_VER_KEY = "yl_cache_manifest_ver";
  var CACHE_CODE_KEY = "yl_cache_app_code";
  var CACHE_SHA_KEY = "yl_cache_app_sha";
  var CACHE_AT_KEY = "yl_cache_app_at";
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  var CLIENT_KEY = "yl_client_id";

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_e) {} }
  function getClientId() {
    var id = lsGet(CLIENT_KEY);
    if (!id) { id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); lsSet(CLIENT_KEY, id); }
    return id;
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
    var delays = [0, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000];
    for (var i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);
      showBanner(i ? "服务器唤醒中… (" + (i + 1) + "/" + delays.length + ")" : "连接幽灵山庄服务器…");
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, 12000);
        var res = await fetch(BASE + "/api/health", { cache: "no-store", signal: ctrl.signal });
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
      body: JSON.stringify({ clientId: getClientId(), source: "bootstrap" })
    });
    if (!res.ok) throw new Error("handshake " + res.status);
    return res.json();
  }
  async function fetchManifest(token) {
    var res = await fetch(BASE + "/api/v1/manifest", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store"
    });
    if (!res.ok) throw new Error("manifest " + res.status);
    return res.json();
  }
  async function fetchApp(token) {
    var res = await fetch(BASE + "/api/v1/modules/app", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store"
    });
    if (!res.ok) throw new Error("module " + res.status);
    return res.text();
  }
  function cacheValid(expectedSha) {
    var at = Number(lsGet(CACHE_AT_KEY) || 0);
    var code = lsGet(CACHE_CODE_KEY);
    var sha = lsGet(CACHE_SHA_KEY);
    if (!code || !at) return false;
    if (Date.now() - at > CACHE_TTL) return false;
    if (expectedSha && sha && sha !== expectedSha) return false;
    return code.length > 1000;
  }
  function readCache() { return lsGet(CACHE_CODE_KEY); }
  function writeCache(code, sha, manifestVer) {
    lsSet(CACHE_CODE_KEY, code);
    lsSet(CACHE_SHA_KEY, sha || "");
    lsSet(CACHE_VER_KEY, manifestVer || "");
    lsSet(CACHE_AT_KEY, String(Date.now()));
  }
  function runApp(code, fromCache) {
    window.__YL_BOOT__ = { base: BASE, fromCache: !!fromCache, at: Date.now() };
    var el = document.createElement("script");
    el.textContent = code;
    el.setAttribute("data-yl-remote", "1");
    (document.documentElement || document.head || document.body).appendChild(el);
  }
  async function main() {
    var online = await wakeServer();
    var manifest = null;
    var token = null;
    if (online) {
      try {
        var hs = await withRetry("握手", handshake, 4, 2500);
        token = hs.token;
        manifest = await withRetry("拉取清单", function () { return fetchManifest(token); }, 3, 2000);
        if (manifest.killSwitch) {
          showBanner(manifest.message || "服务维护中，请稍后再试", "#fbbf24");
          return;
        }
        var mod = (manifest.modules || [])[0];
        var code = await withRetry("下载模块", function () { return fetchApp(token); }, 3, 3000);
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
        hideBanner();
        runApp(code, false);
        return;
      } catch (err) {
        console.warn("[幽灵山庄] 在线加载失败，尝试缓存", err);
      }
    }
    if (cacheValid()) {
      showBanner("服务器未就绪，使用本地缓存版本", "#fbbf24");
      setTimeout(hideBanner, 4000);
      runApp(readCache(), true);
      if (!online) {
        wakeServer().then(function (ok) { if (ok) location.reload(); });
      }
      return;
    }
    showBanner(online ? "加载失败且无缓存，请刷新或访问 " + BASE + "/cheat" : "服务器冷启动中，请等待 30 秒后刷新", "#f87171");
  }
  main();
})();
`;
}

module.exports = { buildBootstrapScript };
