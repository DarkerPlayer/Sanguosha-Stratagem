const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const FEEDBACK_FILE = path.join(ROOT, "data", "feedback.json");
const ARCHIVE_FILE = "山河图数据_2026-07-03 copy.json";

app.use(express.json({ limit: "32kb" }));
app.use(express.static(PUBLIC_DIR));

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, archive: ARCHIVE_FILE });
});

app.get("/api/feedback", (req, res) => {
  const day = String(req.query.day || todayKey()).slice(0, 10);
  const all = readFeedback();
  const items = all
    .filter((item) => item.day === day)
    .sort((a, b) => b.at - a.at);
  res.json({ day, count: items.length, items });
});

app.post("/api/feedback", (req, res) => {
  const message = String(req.body.message || "").trim();
  const nickname = String(req.body.nickname || "访客").trim().slice(0, 32) || "访客";
  if (!message) {
    return res.status(400).json({ error: "请填写建议或反馈内容" });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "内容不能超过 2000 字" });
  }
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    day: todayKey(),
    nickname,
    message,
    at: Date.now()
  };
  const all = readFeedback();
  all.push(entry);
  writeFeedback(all);
  res.json({ ok: true, item: entry });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/data/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log("Sanguosha Stratagem running on port", PORT);
});
