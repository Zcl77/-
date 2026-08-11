# 知行造境 / Zhixing Studio

知行造境的正式业务网站与客户项目中心。产品通过真实、透明、持续更新的制作记录，让客户随时了解自己的项目，并与工作室保持联系。

当前分支正在把既有 React/Vite 前端迁移到自建后端。目标运行栈固定为：

- React 19、TypeScript、Vite
- Django 5.2 LTS、Django REST Framework
- MySQL 8.4、InnoDB、utf8mb4、严格模式
- Docker Compose
- Docker Volume 持久化数据库、公开媒体与私人媒体

正式运行不使用 Firebase、Firestore、Firebase Storage、Google 登录或 Custom Claims。仓库中的旧 Firebase 文件仅是迁移期间的历史代码，在 Django API、权限和媒体流程验证完成后删除；不得部署或连接它们。

## 第一版范围

- 公开官网、作品列表、作品详情和公开制作日志
- 询价提交与评论审核
- Django Admin 管理作品、分类、订单、客户项目、阶段、进度和媒体
- 工作室员工与客户的自建账号密码登录
- 客户项目、私人进度图片、查看确认和项目留言
- 客户只能访问 `ProjectMembership` 明确授权的项目
- MySQL 与媒体 Volume 的备份、恢复和持久化验收

支付、短信验证码、微信登录、通知、MinIO/S3 和摄像头直播不属于第一版。

## 本地开发

最终的一键启动命令为：

```bash
docker compose up -d --build
```

首次启动前需要从 `.env.example` 创建仅供本机使用的 `.env`。真实密码和密钥不得提交。开发环境中的全新 MySQL 可通过 `127.0.0.1:3307` 连接 DBeaver；不要连接或复用任何现有远程数据库。

完整安装、初始化管理员、开发数据、测试、备份和恢复命令将在各功能落地后同步补全。不要运行 `docker compose down -v`，该命令会删除持久化数据卷。

## 架构与约束

- [目标架构](docs/ARCHITECTURE.md)
- [PR #3 手工移植清单](docs/PR3_PORTING.md)
- [Phase 2 视觉研究](docs/PHASE_2_UI_RESEARCH.md)
- [仓库工程规则](AGENTS.md)
