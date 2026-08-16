# 便携打包与隔离恢复

便携包用于把同一时间点的 Git 源码、MySQL 数据、媒体文件和运行镜像迁移到另一台电脑，并先在全新的 Docker Compose 项目中恢复验证。它不是生产部署工具，也不会替换当前活动项目。

## 安全边界

- 包中永远不包含 `.env`、密码、密钥、`.git`、`node_modules`、`artifacts` 或 `backups` 原目录。
- `.env` 必须由用户单独保存，建议使用受控密码库或加密介质；不要通过聊天、Git 或便携包传递。
- 恢复只允许全新的项目名、空目标目录、全新的容器和全新的 Volume。
- `zhixing-studio-mvp` 和当前活动 Compose 项目名不能作为恢复目标。
- 脚本没有 `force` 参数，不执行 `docker compose down -v`，也不删除任何既有数据。
- 脚本只访问本机 Docker Engine，不连接 DBeaver 中保存的远程连接或任何远程数据库。

## 创建便携包

先启动当前项目的 `db` 和 `backend` 服务，并确认 Docker Desktop、Docker Compose v2 和 Git 可用。在批准的功能分支中执行：

```powershell
.\scripts\package-portable.ps1
```

脚本依次运行协调备份、隔离恢复验证、前后端镜像构建、`git archive` 和镜像导出。任一步失败都会立即停止，并把不完整目录和 `diagnostics/package.log` 留下供检查；它不会停止当前服务或删除 Volume。

源码包严格来自清单记录的 Git commit。若工作区不干净，未提交和未跟踪内容会被排除并写入警告，因此最终交付包应从干净、已审核的 commit 创建。

默认输出目录为 `artifacts/portable/<UTC时间>/`：

```text
<UTC时间>/
├── source.zip
├── manifest.json
├── SHA256SUMS.txt
├── backup/
│   ├── database.sql
│   ├── media.tar.gz
│   └── manifest.json
├── images/
│   ├── backend.tar
│   ├── frontend.tar
│   └── mysql-8.4.tar
├── docs/
│   └── PORTABLE_PACKAGE.md
└── diagnostics/
    └── package.log
```

顶层 `manifest.json` 记录 Git commit、UTC 创建时间、数据库表数量、媒体文件数量、镜像 ID/摘要/平台和全部载荷的 SHA-256。`SHA256SUMS.txt` 必须与清单逐项一致。

## 隔离恢复

恢复前准备一个单独保存的本地 `.env`。目标目录必须不存在或为空，项目名必须是新的小写名称。端口必须与当前项目错开：

```powershell
.\scripts\restore-portable.ps1 `
  -PackageDirectory 'E:\transfer\20260814T120000Z' `
  -TargetDirectory 'D:\zhixing-portable-review' `
  -TargetProjectName 'zhixing-portable-review-20260814' `
  -EnvFile 'E:\secure\zhixing-review.env' `
  -FrontendHostPort 3100 `
  -BackendHostPort 8100 `
  -MySqlHostPort 3407
```

恢复脚本在任何写操作前完成以下检查：包级 manifest、全部 SHA-256、文件大小、源码 ZIP 排除规则、路径越界、项目名、目标目录、已有容器、已有 Volume 和 `.env` 必需值。校验通过后，它才会：

1. 解压 `source.zip`，把用户提供的 `.env` 复制为目标 `.env`，只修改复制件中的项目名和宿主机端口；
2. 加载并标记包内镜像，创建四个全新命名 Volume；
3. 启动隔离 MySQL，恢复 SQL 并核对表数量；
4. 恢复媒体 Volume 并核对文件数量；
5. 启动目标后端和前端，确认三个服务均在运行。

源 `.env` 不会被修改。恢复产生的 Compose 端口只绑定 `127.0.0.1`。

## 失败与人工回退

恢复失败时，脚本会保留目标目录、日志、容器和 Volume，便于人工核查，不会自动清理。先查看：

```powershell
docker compose --project-name <目标项目名> --env-file <目标目录>\.env `
  -f <目标目录>\compose.yaml -f <目标目录>\compose.portable.override.yaml ps
```

需要停止隔离服务时，在相同命令前缀后使用 `stop`。不要使用 `down -v`。是否删除隔离项目或 Volume 必须在人工确认项目名、备份和恢复结果后另行决定，不属于脚本自动回退范围。

## 验收

核对 `restore-diagnostics.log` 中的表数量和媒体文件数量，并分别访问新端口上的前端、后端健康接口与管理后台。不要把当前 `zhixing-studio-mvp` 数据卷作为演练目标，也不要复用任何旧项目名或旧 Volume。
