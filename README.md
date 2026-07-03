# Sanguosha Stratagem

山河图数据库 + 幽灵山庄小抄云端分发。

## 架构

- `/` — 山河图数据查看器
- `/cheat` — 小抄安装与服务器唤醒
- `/cheat/bootstrap.user.js` — 油猴引导层（动态生成，含你的 Render 域名）
- `/api/v1/handshake` → `/api/v1/manifest` → `/api/v1/modules/app` — 主逻辑下发

## 冷启动与国内网络

- **不依赖 GitHub**：运行时全部走 Render 域名
- **免费 Render 休眠**：bootstrap 自动重试唤醒；失败则用 localStorage 缓存（7 天）
- `/cheat` 页可手动「唤醒 / 重新检测」

## 本地更新小抄模块

```bash
# 修改上级目录 幽灵山庄小抄.txt 后
npm run build
git add modules/app.js modules/manifest.json
git commit && git push
```

## 环境变量（Render 可选）

- `YL_SESSION_SECRET` — handshake token 密钥
- `YL_GUILD_ID` — 默认 225756
- `RENDER_EXTERNAL_URL` — Render 自动注入

## 本地运行

```bash
npm install
npm run build
npm start
```
