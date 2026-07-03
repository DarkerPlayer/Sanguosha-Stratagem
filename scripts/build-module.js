#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const src = path.join(__dirname, "..", "..", "幽灵山庄小抄.txt");
const out = path.join(__dirname, "..", "modules", "app.js");
const manifestPath = path.join(__dirname, "..", "modules", "manifest.json");

function writeManifest(body) {
  const sha256 = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  const stat = fs.statSync(out);
  const manifest = {
    version: process.env.YL_MODULE_VERSION || "1.0.0-" + new Date().toISOString().slice(0, 10),
    killSwitch: false,
    message: "",
    modules: [{ id: "app", file: "app.js", sha256, size: stat.size }],
    data: {
      rogueArchive: "/data/%E5%B1%B1%E6%B2%B3%E5%9B%BE%E6%95%B0%E6%8D%AE_2026-07-03%20(1).json"
    }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("manifest ok", manifest.version, "sha256", sha256.slice(0, 12) + "...");
}

if (fs.existsSync(src)) {
  const lines = fs.readFileSync(src, "utf8").split("\n");
  let start = 0;
  if (lines[0] && lines[0].includes("UserScript")) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("==/UserScript==")) { start = i + 1; break; }
    }
  }
  const body = lines.slice(start).join("\n").trim() + "\n";
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, "utf8");
  console.log("built app.js from 幽灵山庄小抄.txt", body.length, "chars");
  writeManifest(body);
} else if (fs.existsSync(out)) {
  const body = fs.readFileSync(out, "utf8");
  console.log("source missing, refresh manifest from committed app.js");
  writeManifest(body);
} else {
  console.error("无源文件且无 modules/app.js，无法构建");
  process.exit(1);
}
