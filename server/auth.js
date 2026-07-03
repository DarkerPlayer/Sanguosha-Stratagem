const crypto = require("crypto");

const SECRET = process.env.YL_SESSION_SECRET || "yl-dev-secret-change-on-render";
const TOKEN_TTL_MS = Number(process.env.YL_TOKEN_TTL_MS || 4 * 60 * 60 * 1000);
const ALLOWED_GUILD = String(process.env.YL_GUILD_ID || "225756");

const tokens = new Map();
const handshakeLimits = new Map();

function clientKey(ip, clientId) {
  return String(ip || "ip") + ":" + String(clientId || "anon").slice(0, 64);
}

function rateLimit(key, maxPerHour) {
  const now = Date.now();
  const bucket = handshakeLimits.get(key) || { count: 0, reset: now + 3600000 };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + 3600000;
  }
  bucket.count += 1;
  handshakeLimits.set(key, bucket);
  return bucket.count <= maxPerHour;
}

function issueToken(clientId, extra) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, Object.assign({ clientId: String(clientId || "anon"), expiresAt }, extra || {}));
  return { token, expiresAt };
}

function verifyToken(token) {
  if (!token) return null;
  const row = tokens.get(token);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    tokens.delete(token);
    return null;
  }
  return row;
}

function guildAllowed(guildId) {
  return String(guildId || "").trim() === ALLOWED_GUILD;
}

function attachGuild(token, guildId) {
  const row = verifyToken(token);
  if (!row) return null;
  row.guildId = String(guildId || "").trim();
  row.guildOk = guildAllowed(row.guildId);
  return row;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokens.entries()) {
    if (v.expiresAt < now) tokens.delete(k);
  }
}, 600000);

module.exports = {
  ALLOWED_GUILD,
  issueToken,
  verifyToken,
  attachGuild,
  guildAllowed,
  rateLimit,
  clientKey
};
