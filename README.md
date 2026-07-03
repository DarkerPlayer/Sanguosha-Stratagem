# Sanguosha Stratagem · 山河图数据库

在线查看山河图技能/武将数据，并收集访客反馈建议。

## 本地运行

```bash
npm install
npm start
```

打开 http://localhost:3000

## Render 部署

1. 将本仓库连接到 [Render](https://render.com)
2. 新建 **Web Service**，选择此 GitHub 仓库
3. Render 会读取 `render.yaml` 自动配置
4. 或手动设置：Build `npm install`，Start `npm start`

## 数据说明

- 静态档案：`public/data/山河图数据_2026-07-03 copy.json`
- 访客反馈：运行时写入 `data/feedback.json`（每条提交存一条）
