const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require("./server/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const CHEAT_DIR = path.join(PUBLIC_DIR, "cheat");
const MODULES_DIR = path.join(ROOT, "modules");
const FEEDBACK_FILE = path.join(ROOT, "data", "feedback.json");
const MANIFEST_FILE = path.join(MODULES_DIR, "manifest.json");
const SCRIPT_FILE = path.join(CHEAT_DIR, "ylsz.user.js");
const STARTED_AT = Date.now();

const CORS_ORIGIN_PATTERNS = [
  /^https:\/\/game\.4399iw2\.com$/,
  /^https:\/\/my\.4399\.com$/,
  /^https:\/\/[\w.-]+\.sanguosha\.com$/,
  /^https:\/\/web\.kuaiwan\.com$/,
  /^https:\/\/wan\.baidu\.com$/,
  /^https:\/\/www\.7k7k\.com$/,
  /^https:\/\/playgame\.iqiyi\.com$/,
  /^https:\/\/[\w.-]+\.onrender\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

function corsAllowed(origin) {
  if (!origin) return false;
  return CORS_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else if (req.path.startsWith("/api/")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: "64kb" }));

function publicBase(req) {
  return process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  } catch (_e) {
    return {
      version: "0.0.0",
      killSwitch: true,
      message: "模块未构建，请执行 npm run build",
      modules: []
    };
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readFeedback() {
  try {
    const raw = fs.readFileSync(FEEDBACK_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_e) {
    return [];
  }
}

function writeFeedback(list) {
  fs.mkdirSync(path.dirname(FEEDBACK_FILE), { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2), "utf8");
}

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

app.get("/api/health", (_req, res) => {
  const manifest = readManifest();
  res.json({
    ok: true,
    service: "sanguosha-stratagem",
    uptime: Math.floor((Date.now() - STARTED_AT) / 1000),
    manifestVersion: manifest.version,
    scriptReady: fs.existsSync(SCRIPT_FILE),
    coldStartHint: "免费实例可能刚唤醒，请稍候重试"
  });
});

app.get("/api/feedback", (req, res) => {
  const day = String(req.query.day || todayKey()).slice(0, 10);
  const all = readFeedback();
  const items = all.filter((item) => item.day === day).sort((a, b) => b.at - a.at);
  res.json({ day, count: items.length, items });
});

app.post("/api/feedback", (req, res) => {
  const message = String(req.body.message || "").trim();
  const nickname = String(req.body.nickname || "访客").trim().slice(0, 32) || "访客";
  if (!message) return res.status(400).json({ error: "请填写建议或反馈内容" });
  if (message.length > 2000) return res.status(400).json({ error: "内容不能超过 2000 字" });
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    day: todayKey(),
    nickname,
    message,
    source: req.body.source || "web",
    at: Date.now()
  };
  const all = readFeedback();
  all.push(entry);
  writeFeedback(all);
  res.json({ ok: true, item: entry });
});

app.post("/api/v1/handshake", (req, res) => {
  const clientId = String(req.body.clientId || "anon").slice(0, 64);
  const key = auth.clientKey(req.ip, clientId);
  if (!auth.rateLimit(key, 120)) {
    return res.status(429).json({ error: "请求过于频繁，请稍后再试" });
  }
  const session = auth.issueToken(clientId, { ip: req.ip });
  res.json({
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    base: publicBase(req),
    licenseUrl: "/api/v1/license",
    scriptUrl: "/cheat/ylsz.user.js"
  });
});

app.get("/api/v1/license", (req, res) => {
  const token = bearer(req);
  if (!auth.verifyToken(token)) {
    return res.status(401).json({ error: "无效或已过期的 token" });
  }
  const manifest = readManifest();
  if (manifest.killSwitch) {
    return res.status(503).json({ ok: false, message: manifest.message || "维护中" });
  }
  const base = publicBase(req);
  res.json({
    ok: true,
    licenseUntil: Date.now() + auth.LICENSE_MS,
    scriptVersion: manifest.version || "0.0.0",
    updateUrl: base + "/cheat/ylsz.user.js"
  });
});

app.get("/api/v1/manifest", (req, res) => {
  const token = bearer(req);
  if (!auth.verifyToken(token)) {
    return res.status(401).json({ error: "无效或已过期的 token，请重新 handshake" });
  }
  const manifest = readManifest();
  res.json(Object.assign({}, manifest, {
    serverTime: Date.now(),
    base: publicBase(req),
    scriptUrl: "/cheat/ylsz.user.js"
  }));
});

app.post("/api/v1/session", (req, res) => {
  const token = bearer(req);
  const row = auth.verifyToken(token);
  if (!row) return res.status(401).json({ error: "token 无效" });
  const guildId = String(req.body.guildId || "").trim();
  const updated = auth.attachGuild(token, guildId);
  res.json({
    ok: true,
    guildId,
    guildOk: !!updated && updated.guildOk,
    features: updated && updated.guildOk ? ["all"] : [],
    expiresAt: updated.expiresAt
  });
});

app.get("/cheat/ylsz.user.js", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE)) {
    return res.status(503).send("// script not built, run npm run build");
  }
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.sendFile(SCRIPT_FILE);
});

app.get("/cheat/bootstrap.user.js", (req, res) => {
  res.redirect(302, "/cheat/ylsz.user.js");
});

app.use("/data", express.static(path.join(PUBLIC_DIR, "data"), { maxAge: "1h" }));
app.use("/cheat", express.static(CHEAT_DIR, { index: "index.html" }));

app.get("/cheat", (_req, res) => {
  res.sendFile(path.join(CHEAT_DIR, "index.html"));
});

app.use(express.static(PUBLIC_DIR, { index: false }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/data/")) return next();
  if (req.path.startsWith("/cheat")) {
    return res.sendFile(path.join(CHEAT_DIR, "index.html"));
  }
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log("Sanguosha Stratagem on port", PORT);
  if (!fs.existsSync(SCRIPT_FILE)) {
    console.warn("WARN: public/cheat/ylsz.user.js missing — run npm run build");
  }
});
