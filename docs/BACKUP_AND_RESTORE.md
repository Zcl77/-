# 本地备份与恢复验证

本项目的业务数据分为两部分：MySQL 中的结构化数据，以及 `media_data` Docker Volume 中的图片文件。一次有效备份必须同时包含两者。

## 创建本地备份

先确认本项目的 `db` 和 `backend` 容器正在运行，然后在仓库根目录执行：

```powershell
.\scripts\backup-local.ps1
```

备份会写入被 Git 忽略的 `backups/<UTC 时间>/`，其中包括：

- `database.sql`：使用一致性快照导出的 MySQL 数据；
- `media.tar.gz`：公开和私有媒体文件；
- `manifest.json`：文件校验和、数据表数量和媒体文件数量。

脚本只读取本项目 Compose 服务，不连接 DBeaver 中的远程数据库，也不会停止容器或删除 Volume。`.env` 不会进入备份；生产密钥应另外存入受控的密码管理工具。

## 隔离恢复演练

以下命令会校验 SHA-256，然后把 SQL 恢复到临时 MySQL 数据库，把媒体解压到后端容器的临时目录，并比较数据表与文件数量：

```powershell
.\scripts\verify-backup.ps1 -BackupDirectory .\backups\20260812T120000Z
```

验证结束后只清理名称以 `zhixing_restore_verify_` 开头的临时数据库和临时文件。活动数据库、活动媒体目录和 Docker Volume 均不会被覆盖。

## 正式恢复原则

正式恢复属于高风险运维操作，不能在网站仍接受写入时直接执行。上线后应采用以下顺序：

1. 确认目标环境、备份时间、维护窗口和回滚点；
2. 暂停会产生写入的应用流量；
3. 先为当前数据库和媒体创建一份新备份；
4. 在隔离数据库和临时媒体目录中完成恢复验证；
5. 核对关键记录、媒体数量和抽样文件；
6. 通过明确批准的切换步骤替换目标数据；
7. 恢复服务并执行游客、客户和管理员验收；
8. 保留恢复前备份，直到业务方确认完成。

`docker compose down` 会停止并移除容器，但保留命名 Volume。禁止执行 `docker compose down -v`，因为 `-v` 会删除数据库和媒体 Volume。
