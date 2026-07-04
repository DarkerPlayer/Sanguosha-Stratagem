#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { buildLicenseGate } = require("../server/license-gate");

const src = path.join(__dirname, "..", "..", "幽灵山庄小抄.txt");
const out = path.join(__dirname, "..", "public", "cheat", "ylsz.user.js");
const manifestPath = path.join(__dirname, "..", "modules", "manifest.json");
const fallbackBody = path.join(__dirname, "..", "modules", "app.js");

const BASE = (process.env.RENDER_EXTERNAL_URL || "https://sanguosha-stratagem.onrender.com").replace(/\/$/, "");

function parseSource(text) {
  const lines = text.split("\n");
  let headerEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("==/UserScript==")) { headerEnd = i + 1; break; }
  }
  return lines.slice(headerEnd).join("\n").trim();
}

function buildHeader(version) {
  return `// ==UserScript==
// @name         幽灵山庄打小抄
// @namespace    ${BASE}/cheat
// @version      ${version}
// @author       小麦 幽灵山庄
// @description  幽灵山庄公会专属 · 脚本本地运行，云端仅每周授权与更新
// @icon         https://i0.hdslb.com/bfs/new_dyn/17ec41a0ca79633b77399065ab80da3f2138912.png
// @downloadURL  ${BASE}/cheat/ylsz.user.js
// @updateURL    ${BASE}/cheat/ylsz.user.js
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
`;
}

function writeManifest(filePath, version) {
  const body = fs.readFileSync(filePath, "utf8");
  const sha256 = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  const manifest = {
    version,
    killSwitch: false,
    message: "",
    scriptFile: "ylsz.user.js",
    scriptSha256: sha256,
    scriptSize: Buffer.byteLength(body, "utf8"),
    data: {
      rogueArchive: "/data/%E5%B1%B1%E6%B2%B3%E5%9B%BE%E6%95%B0%E6%8D%AE_2026-07-03%20(1).json"
    }
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("manifest ok", version, "sha256", sha256.slice(0, 12) + "...");
}

function assemble(body) {
  const version = process.env.YL_MODULE_VERSION || "2.0.0-" + new Date().toISOString().slice(0, 10);
  const gate = buildLicenseGate(BASE);
  const main = body.trim();
  const wrapped = buildHeader(version) + "\n(async function () {\n\"use strict\";\n" + gate + "\n" + main + "\n})();\n";
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, wrapped, "utf8");
  writeManifest(out, version);
  console.log("built ylsz.user.js", wrapped.length, "chars ->", out);
}

let body = "";
if (fs.existsSync(src)) {
  body = parseSource(fs.readFileSync(src, "utf8"));
  console.log("source: 幽灵山庄小抄.txt");
} else if (fs.existsSync(fallbackBody)) {
  body = fs.readFileSync(fallbackBody, "utf8").trim();
  console.log("source: modules/app.js (fallback)");
} else if (fs.existsSync(out)) {
  const raw = fs.readFileSync(out, "utf8");
  const m = raw.match(/==\/UserScript==\s*[\s\S]*?if \(!\(await __ylEnsureLicense\(\)\)\) return;\s*([\s\S]*)}\)\(\);\s*$/);
  body = m ? m[1].trim() : parseSource(raw);
  console.log("source: existing ylsz.user.js body extract");
} else {
  console.error("无源文件，无法构建 ylsz.user.js");
  process.exit(1);
}

assemble(body);
