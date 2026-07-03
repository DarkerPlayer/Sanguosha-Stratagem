# Sanguosha Stratagem

山河图数据库 + 幽灵山庄小抄。

## 架构（当前）

- `/` — 山河图数据查看器
- `/cheat` — 小抄安装页
- `/cheat/ylsz.user.js` — **完整油猴脚本**（本地运行，不云端注入）
- `/api/v1/handshake` + `/api/v1/license` — 仅 **每周授权**（几 KB）

脚本装在 Tampermonkey 里；云端只续一周授权和提供脚本版本更新（`@updateURL`）。

## 本地更新小抄

```bash
# 修改上级目录 幽灵山庄小抄.txt 后
npm run build
git add public/cheat/ylsz.user.js modules/manifest.json
git commit && git push
```

## 环境变量（Render 可选）

- `YL_SESSION_SECRET` — handshake token 密钥
- `YL_GUILD_ID` — 默认 225756
- `RENDER_EXTERNAL_URL` — Render 自动注入（构建脚本 URL）

## 本地运行

```bash
npm install
npm run build
npm start
```
