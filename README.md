## 当前状态

PR #4 已通过普通 merge commit 合并到 `main`。当前版本为可在本地运行和验收的 Django + MySQL MVP，尚未部署到正式服务器。

当前支持公开作品、制作日志、询价、离线订单、报价接受或拒绝、客户私人项目、进度图片、留言、确认回执、评价提交与审核，以及 Django Admin 管理后台。

当前暂不包含在线支付、短信验证码、微信登录、摄像头直播和正式服务器部署。

## 日常启动与停止

启动前需要安装并运行 Docker Desktop。必须进入同时包含 `compose.yaml` 和本机 `.env` 的项目目录。

```powershell
docker compose up -d
docker compose ps
```

正常运行后访问：

- 前台：<http://127.0.0.1:3000/>
- 管理后台：<http://127.0.0.1:8000/admin/>
- MySQL 本机端口：`127.0.0.1:3307`

停止容器：

```powershell
docker compose stop
```

重新启动：

```powershell
docker compose start
```

> [!CAUTION]
> 禁止执行 `docker compose down -v`。参数 `-v` 会删除 MySQL、媒体文件等持久化卷，可能造成客户、订单、作品和图片永久丢失。

## 换电脑运行

GitHub 只保存代码，不保存 `.env`、MySQL 业务数据、管理员账号和媒体文件。只克隆仓库只能得到程序，不能得到原电脑中的完整数据。

完整迁移需要：

1. 从 GitHub 克隆 `main`。
2. 根据 `.env.example` 创建新电脑本机使用的 `.env`。
3. 安装并启动 Docker Desktop。
4. 恢复同一时间点的 MySQL 数据库备份。
5. 恢复与数据库匹配的媒体文件备份。
6. 启动 Docker Compose。
7. 执行迁移和系统检查。
8. 验证前台、后台、登录、权限和图片。

`.env`、密码、密钥和备份不得提交到 GitHub，也不要通过聊天发送。

## Firebase 迁移说明

Firebase 仅属于历史原型。当前运行版本不再使用 Firebase Authentication、Firestore、Firebase Storage、Google 登录或 Firebase Custom Claims。当前架构为 React、Django、MySQL 和 Docker Volume。

## 摄像头监控状态

摄像头实时查看尚未接入。规划链路为：

```text
海康威视摄像头 -> RTSP -> MediaMTX -> HLS/WebRTC
                  -> Django 权限控制 -> React 前端
```

禁止把 RTSP 地址、摄像头账号或密码写入前端、提交到 GitHub，或将摄像头管理端口直接暴露到公网。

# 知行造境 / Zhixing Studio

“知行造境”的正式业务网站与客户项目中心。公开网站用于展示作品、公开制作日志并接收询价；登录后的客户中心用于查看被明确授权的订单、制作阶段、真实进度、私人图片、确认记录和项目留言。

产品原则是以透明进度和持续沟通连接消费者与工作室。公开作品与客户私人项目是两个完全分开的权限域，React 中隐藏按钮不构成安全边界。

## 技术栈

- React 19、TypeScript、Vite
- Django 5.2 LTS、Django REST Framework
- MySQL 8.4、InnoDB、`utf8mb4`、严格模式
- Docker Compose
- Docker Volume 持久化 MySQL、媒体和静态文件
- Django Session、HttpOnly Cookie、CSRF、Argon2 密码哈希

正式运行不依赖 Firebase、Firestore、Firebase Storage、Google 登录或 Custom Claims。相关运行时代码、依赖、规则和迁移脚本已经从当前分支移除。

## MVP 范围

- 公开官网、作品列表与详情、公开制作日志
- 询价提交、评论提交与审核
- Django Admin 管理作品、分类、媒体、订单、客户项目、阶段和进度
- 工作室员工与客户的自建账号密码登录
- 客户项目、私人进度图片、查看/确认记录和项目留言
- 服务端对象级权限：客户只能访问 `ProjectMembership` 明确授权的项目
- MySQL 与媒体 Volume 的协调备份和隔离恢复验证

在线支付、短信验证码、微信登录、通知、MinIO/S3 和摄像头直播不属于第一版。

## 一键启动

只需安装并启动 Docker Desktop。首次运行时，在仓库根目录执行：

```powershell
Copy-Item .env.example .env
```

打开仅供本机使用的 `.env`，替换所有 `change-me` 占位值。该文件已被 Git 忽略，不要提交。然后启动三个服务：

```powershell
docker compose up -d --build
```

后端容器会等待 MySQL 就绪，然后自动执行迁移、创建缓存表并收集静态文件。

| 服务         | 本机地址                        | 说明                                |
| ------------ | ------------------------------- | ----------------------------------- |
| React        | `http://127.0.0.1:3000/`        | 公开网站与客户中心，支持开发热更新  |
| Django Admin | `http://127.0.0.1:8000/admin/`  | 工作室内部管理                      |
| REST API     | `http://127.0.0.1:8000/api/v1/` | 前端同源代理的后端接口              |
| MySQL        | `127.0.0.1:3307`                | 只绑定本机，供本项目与 DBeaver 使用 |

查看容器状态：

```powershell
docker compose ps
```

普通停止不会删除数据：

```powershell
docker compose down
```

禁止执行 `docker compose down -v`，因为 `-v` 会删除 MySQL、媒体和静态文件 Volume。

## 本地验收数据

本地开发数据不是正式内容，不会在生产启动时自动导入。以下命令仅在 `DJANGO_ENVIRONMENT=development` 且 `DJANGO_DEBUG=true` 时允许运行：

```powershell
docker compose exec backend python manage.py seed_dev_data
```

命令创建少量带“本地开发数据”标记的作品、公开日志、评论、客户、订单、项目、进度、私人图片和留言，并在终端中一次性显示随机临时密码。客户首次登录后必须修改临时密码。

需要重建时，`--reset` 只清理明确带开发标记的数据；遇到与真实记录混合关联时会拒绝清理：

```powershell
docker compose exec backend python manage.py seed_dev_data --reset
```

也可以先预检将被清理的开发数据。该命令默认只显示数量，不会删除数据库记录或媒体文件：

```powershell
docker compose exec backend python manage.py clean_dev_data
```

人工确认预检结果后，只有明确追加 `--apply` 才会实际清理带开发标记的数据：

```powershell
docker compose exec backend python manage.py clean_dev_data --apply
```

请勿在本地验收数据中录入真实客户资料、联系方式或商业金额。

## 管理员与客户账号

使用交互命令创建首个管理员，密码输入不会出现在命令历史中，也没有默认管理员密码：

```powershell
docker compose exec backend python manage.py initialize_admin
```

管理员登录 Django Admin 后，可以通过用户管理创建客户账号，并在线下安全交付临时密码。客户首次登录 React 客户中心时必须修改密码，随后才能访问私人项目。项目访问必须再通过 `ProjectMembership` 显式授权。

用户名统一限制为最多 18 个字符。升级现有数据库时，迁移会先检查旧账号；如存在超过 18 个字符的用户名，迁移会安全停止并报告数量，不会自动截断、重命名或删除账号。

## DBeaver

DBeaver 只是数据库查看工具，不参与网站运行。请创建一个全新的 MySQL 连接：

- Host：`127.0.0.1`
- Port：`.env` 中的 `MYSQL_HOST_PORT`，默认 `3307`
- Database：`.env` 中的 `MYSQL_DATABASE`
- Username：`.env` 中的 `MYSQL_USER`
- Password：仅使用本项目 `.env` 中的本地密码

不要连接、复用或测试已有项目的远程数据库。生产环境不会把 MySQL 3306 端口暴露到公网。

## 质量检查

前端完整检查：

```powershell
docker compose exec frontend npm run check
```

Django 快速检查与 SQLite 隔离测试：

```powershell
docker compose exec backend python manage.py check
docker compose exec backend python manage.py makemigrations --check --dry-run
docker compose exec -e DJANGO_TEST_SQLITE=true backend python manage.py test
```

使用本地 MySQL 进行完整测试时，测试进程需要临时创建和销毁 `test_` 前缀数据库。下面的 root 凭据只在数据库容器内部读取，不会写入命令或日志：

```powershell
docker compose exec backend sh -c 'MYSQL_USER=root MYSQL_PASSWORD="$MYSQL_ROOT_PASSWORD" python manage.py test'
```

GitHub Actions 会在每个 PR 上分别运行前端检查和临时 MySQL 8.4 后端检查，不执行部署。

## 备份

```powershell
.\scripts\backup-local.ps1
.\scripts\verify-backup.ps1 -BackupDirectory .\backups\<备份时间>
```

第一条命令协调备份本项目 MySQL 与媒体 Volume；第二条命令在临时数据库和临时目录中验证恢复，不覆盖活动数据。详见 [备份与恢复](docs/BACKUP_AND_RESTORE.md)。

需要把已验证的数据库、媒体、源码和 Docker 镜像一起迁移到另一台电脑时，使用便携打包与隔离恢复流程。`.env` 不会进入包，必须单独加密保存。命令、包结构和拒绝规则详见 [便携打包与隔离恢复](docs/PORTABLE_PACKAGE.md)。

## 目录

```text
backend/                 Django 项目和业务应用
docker/                  前后端镜像、启动脚本和 MySQL 配置
src/                     React 页面、组件、REST 客户端与数据映射
tests/                   前端单元测试
scripts/                 本地备份与隔离恢复验证脚本
docs/                    架构、设计研究和阶段记录
compose.yaml             本地三服务编排
```

更多说明：

- [系统架构](docs/ARCHITECTURE.md)
- [备份与恢复](docs/BACKUP_AND_RESTORE.md)
- [PR #3 手工移植记录](docs/PR3_PORTING.md)
- [Phase 2 视觉研究](docs/PHASE_2_UI_RESEARCH.md)
- [仓库工程约束](AGENTS.md)

当前仅用于本机开发与验收，尚未连接或部署到任何生产服务器。
