# 电脑启动与换机演示说明书

这份说明书适用于 Windows 10/11。目标是让第一次接触本项目的人，能够在另一台电脑上从 GitHub 启动“知行造境”，并知道如何安全停止、再次启动和排查常见问题。

## 先看结论：GitHub 能带走什么

只带 GitHub 仓库，可以在另一台电脑上启动最新程序，并创建一套全新的本地演示数据。但 GitHub **不保存**这台电脑 Docker 里的业务数据。

| 内容                                                 | GitHub 克隆后是否存在      |
| ---------------------------------------------------- | -------------------------- |
| React 前端、Django 后端、数据库结构和启动脚本        | 是                         |
| 已合并到 `main` 的中英文、询价购物车、客户项目等功能 | 是                         |
| `.env` 中的本机密码和密钥                            | 否，这是刻意排除的敏感信息 |
| 本机 MySQL 中的作品、订单、账号和管理员              | 否                         |
| 后台上传的作品图片、客户进度图片                     | 否                         |
| Docker 中已经创建好的容器和数据卷                    | 否                         |

因此有两种选择：

1. **快速演示新环境**：带着 GitHub 和本说明书即可。新电脑上重新创建 `.env`、管理员和开发演示数据。
2. **原样演示当前内容**：关机前还必须创建便携包，并把 `.env` 通过加密介质单独带走。便携包包含同一时间点的数据库、媒体文件、源码和 Docker 镜像。

如果只是展示功能，推荐第一种。如果必须展示当前电脑里已经录入的作品、图片、账号和订单，必须使用第二种。

## 一、先理解程序是怎样启动的

本项目不是双击一个 `.exe` 启动。Docker Desktop 会按照 `compose.yaml` 同时运行三个互相配合的服务：

```text
浏览器 -> 前端 React（3000）-> 后端 Django（8000）-> MySQL（3307）
                                  |
                                  -> 媒体文件 Docker Volume
```

- **前端**负责用户看到的网页。
- **后端**负责登录、权限、作品、订单、进度和接口。
- **MySQL**保存账号和业务记录。
- **媒体 Volume**保存后台上传的图片。
- **GitHub**保存源代码，但不代替数据库和媒体 Volume。

### 容器、Volume 和关机到底是什么关系

可以把**容器**理解为正在工作的机器，把 **Volume** 理解为机器旁边单独保存数据的硬盘：

- 容器运行时，前端、后端和 MySQL 才能提供网页服务；
- `docker compose stop` 只会关闭这些机器，不会擦除 Volume；
- 电脑关机后网站会停止，但数据库和图片仍保存在这台电脑的 Docker Volume 中；
- 下次在同一台电脑执行 `docker compose start`，容器会继续读取原来的 Volume；
- GitHub 克隆只能得到程序，无法自动取得另一台电脑硬盘里的 Volume；
- 便携包的作用，就是把数据库和媒体 Volume 做成可校验的副本，再在新电脑创建新的容器和 Volume 并恢复数据。

制作便携包时，原电脑的数据库和后端需要暂时运行，以便脚本取得同一时间点的一致备份。打包成功并复制完成后，原电脑可以安全停止和关机。新电脑恢复完成后拥有独立的数据副本，不需要原电脑保持开机、联网或继续运行容器。

只打开 VS Code 不会启动网站，也不需要手工执行 `npm run dev`。本项目的前端、后端和数据库统一由 Docker Compose 启动。

## 二、新电脑需要准备什么

### 2.1 必须安装

1. **Docker Desktop for Windows**：负责运行整个网站。
2. **Git for Windows**：负责从 GitHub 下载和更新代码。
3. 一个现代浏览器，例如 Edge 或 Chrome。

VS Code 和 DBeaver 都不是启动网站的必需软件。VS Code 用于编辑代码，DBeaver 只用于查看数据库。

请从 Docker 和 Git 官方网站下载安装。Docker Desktop 安装时按默认推荐启用 WSL 2。安装完成后重启电脑，然后打开 Docker Desktop，等待界面显示 Docker Engine 正常运行。

### 2.2 建议条件

- Windows 10/11 64 位；
- 至少 8 GB 内存，建议 16 GB；
- 至少预留 15 GB 磁盘空间；
- 首次构建需要能访问 GitHub 和 Docker Hub；
- 普通本地演示不需要公网服务器，也不会连接 Firebase。

## 三、只用 GitHub 启动一套全新演示环境

以下步骤不会带来原电脑的数据库和图片，它会创建一套新的本地环境。

### 第 1 步：打开 PowerShell

按 Windows 键，搜索 `PowerShell` 并打开。普通窗口即可，不要默认使用管理员身份。

### 第 2 步：选择固定目录

如果电脑有 D 盘：

```powershell
Set-Location D:\
New-Item -ItemType Directory -Force D:\web-projects | Out-Null
Set-Location D:\web-projects
```

如果只有 C 盘：

```powershell
New-Item -ItemType Directory -Force C:\web-projects | Out-Null
Set-Location C:\web-projects
```

后续示例假设项目目录是 `D:\web-projects\zhixing-studio`。使用 C 盘时，把路径中的 `D:` 换成 `C:`。

### 第 3 步：克隆最新 `main`

```powershell
git clone https://github.com/Zcl77/-.git zhixing-studio
Set-Location .\zhixing-studio
git switch main
git pull --ff-only origin main
git status --short --branch
```

最后一条命令正常应显示类似：

```text
## main...origin/main
```

不要停留在旧的功能分支。日常演示应使用 `main`。

### 第 4 步：创建仅供本机使用的 `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

记事本打开后，至少替换下面三项中的所有 `change-me`：

```dotenv
MYSQL_PASSWORD=换成一个本机专用的长密码
MYSQL_ROOT_PASSWORD=换成另一个不同的长密码
DJANGO_SECRET_KEY=换成一个不同的长随机字符串
```

`MYSQL_DATABASE` 和 `MYSQL_USER` 可以保留示例值。每个密码建议至少 32 个字符，三个值不要相同，不要使用真实网站或邮箱密码。保存后关闭记事本。

重要规则：

- 不要把 `.env` 上传到 GitHub、聊天或截图中。
- 不要把密码写进 README。
- 数据库第一次创建后，不要随意修改 MySQL 密码；否则后端会无法连接原数据卷。
- 本地演示保持 `DJANGO_ENVIRONMENT=development` 和 `DJANGO_DEBUG=true`。

### 第 5 步：首次构建并启动

先确认 Docker Desktop 已启动，然后在项目根目录执行：

```powershell
docker compose up -d --build
docker compose ps
```

第一次可能需要几分钟下载镜像和安装依赖。不要在构建过程中关闭窗口或 Docker Desktop。

`docker compose ps` 中应看到 `db`、`backend` 和 `frontend`。数据库和后端最终应显示 `healthy`，前端应显示 `Up`。后端会自动执行数据库迁移，不需要手工建表。

### 第 6 步：创建管理员账号

```powershell
docker compose exec backend python manage.py initialize_admin
```

按终端提示输入用户名和密码。密码输入时屏幕上不会出现圆点或星号，这是正常安全行为；输入完成后按回车。

管理员账号保存在当前电脑的 MySQL Volume 中，不会自动上传到 GitHub。

### 第 7 步：可选，创建本地演示数据

全新数据库没有作品和客户项目。只用于本地演示时可以执行：

```powershell
docker compose exec backend python manage.py seed_dev_data
```

命令创建明确标记为“本地开发数据”的作品、订单、客户项目和进度，并在终端中显示临时账号信息。临时信息只在本地保存，不要录入真实客户资料。

如果只想使用后台亲自录入作品，可以跳过这一步。

### 第 8 步：打开网站

- 前台与客户中心：<http://127.0.0.1:3000/>
- 管理后台：<http://127.0.0.1:8000/admin/>

后台使用第 6 步创建的管理员账号登录。浏览器中的 `127.0.0.1` 只代表“当前这台电脑”，其他电脑不能用这个地址访问它。

### 第 9 步：演示前快速检查

1. 前台能打开，并能切换中英文。
2. 作品页能查看作品并加入询价购物车。
3. 询价购物车刷新页面后仍保留内容。
4. 管理后台能登录。
5. 客户账号只能看到被明确授权的项目。
6. 图片能够正常显示。

## 四、以后每天怎样启动和停止

先打开 Docker Desktop，然后进入项目目录：

```powershell
Set-Location D:\web-projects\zhixing-studio
docker compose start
docker compose ps
```

如果 `start` 提示没有容器，使用：

```powershell
docker compose up -d --build
```

演示结束后安全停止：

```powershell
docker compose stop
```

等待命令完成后可以关闭 Docker Desktop 和电脑。`stop` 不会删除数据库和图片。

> **绝对禁止：**不要执行 `docker compose down -v`。其中 `-v` 会删除数据库、媒体文件等持久化 Volume。

## 五、以后怎样拉取 GitHub 最新代码

先确认自己没有正在编辑且未保存的代码，然后执行：

```powershell
Set-Location D:\web-projects\zhixing-studio
git switch main
git pull --ff-only origin main
docker compose up -d --build --force-recreate
docker compose ps
```

浏览器按 `Ctrl+F5` 强制刷新。如果 `git pull` 报告本地修改或冲突，不要删除文件、不要强制覆盖，先保存完整错误信息再处理。

## 六、把当前电脑的内容原样带到另一台电脑

如果需要保留本机已有的作品、图片、客户项目、订单和账号，仅有 GitHub 不够。必须先在原电脑创建便携包，再在新电脑恢复。不要手工复制 Docker 内部目录，也不要把数据库或 `.env` 上传到 GitHub。

### 6.1 原电脑：关机前创建便携包

打开 Docker Desktop 和 PowerShell，进入固定项目目录。下面以 `D:\zhixing-studio` 为例；如果实际目录不同，请换成自己的真实路径：

```powershell
Set-Location D:\zhixing-studio
git switch main
git pull --ff-only origin main
git status --short --branch
docker compose up -d --build
docker compose ps
```

先确认：

- Git 显示 `main...origin/main`；
- 没有以 `M`、`??` 等符号开头的未提交文件；
- `db`、`backend` 和 `frontend` 都在运行，数据库和后端显示 `healthy`。

如果工作区不干净、服务未启动或出现错误，先停止打包并处理问题，不要假装打包已经完成。确认无误后执行：

```powershell
.\scripts\package-portable.ps1
```

这个过程可能需要较长时间，因为脚本会备份数据库和图片、验证恢复、构建镜像并计算校验值。不要关闭 PowerShell、Docker Desktop 或电脑。脚本完成后，会在 `artifacts\portable\<时间>` 生成一个便携包目录。用下面的命令找到最新目录：

```powershell
Get-ChildItem .\artifacts\portable -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1 FullName, LastWriteTime
```

便携包应包含：

- 当前 Git 提交对应的源码；
- MySQL 数据库快照；
- 后台上传的媒体文件；
- 前端、后端和 MySQL Docker 镜像；
- 校验清单和日志。

顶层至少应看到 `source.zip`、`manifest.json`、`SHA256SUMS.txt`、`backup`、`images`、`docs` 和 `diagnostics`。脚本必须以成功状态结束；任何步骤失败都不能把该目录视为完整交付包。

### 6.2 原电脑：复制和安全关机

完成下面五件事：

1. 把整个便携包目录复制到移动硬盘；
2. 复制完成后，在移动硬盘中确认 `manifest.json`、`backup` 和 `images` 仍然存在；
3. 把本机 `.env` 单独放进密码管理器、BitLocker 加密 U 盘或其他可靠加密介质；
4. 不要把 `.env` 放进便携包、普通网盘、聊天或 GitHub；
5. 保留 GitHub 仓库地址和本说明书。

确认移动硬盘中的文件复制完整后，安全停止当前项目：

```powershell
docker compose stop
```

命令完成后可以关闭 Docker Desktop、弹出移动硬盘并关机。不要执行 `docker compose down -v`。详细的安全边界见 [便携打包与隔离恢复](PORTABLE_PACKAGE.md)。

### 6.3 新电脑：准备恢复环境

1. 安装并启动 Docker Desktop；
2. 安装 Git for Windows；
3. 从 GitHub 克隆最新 `main`，操作方法见第三章；
4. 把完整便携包从移动硬盘复制到新电脑，例如 `E:\transfer\20260817T120000Z`；
5. 把加密保存的 `.env` 解密到仅本人可访问的临时位置，例如 `E:\secure\zhixing-review.env`；
6. 目标目录必须是一个不存在或完全为空的新目录。

不要把新电脑已有项目的目录、容器或 Volume 当作恢复目标。

### 6.4 新电脑：执行隔离恢复

在新克隆的仓库中执行恢复命令。必须使用全新的目标目录、项目名和端口。示例：

```powershell
Set-Location D:\web-projects\zhixing-studio
.\scripts\restore-portable.ps1 `
  -PackageDirectory 'E:\transfer\20260817T120000Z' `
  -TargetDirectory 'D:\zhixing-portable-review' `
  -TargetProjectName 'zhixing-portable-review-20260817' `
  -EnvFile 'E:\secure\zhixing-review.env' `
  -FrontendHostPort 3100 `
  -BackendHostPort 8100 `
  -MySqlHostPort 3407
```

把示例中的时间、盘符和文件名换成实际值。脚本会先检查清单、文件大小、SHA-256、目标目录、项目名、端口、容器和 Volume；检查通过后才会创建新环境。它不会覆盖原电脑，也不会覆盖新电脑已有的项目。

脚本成功结束后访问：

- 前台：`http://127.0.0.1:3100/`
- 管理后台：`http://127.0.0.1:8100/admin/`

使用原数据库中的管理员或客户账号进行人工验收，并检查作品文字、图片、订单和客户项目是否与原电脑一致。此时数据已经属于新电脑自己的容器和 Volume，原电脑可以保持关机。

### 6.5 新电脑：以后启动、查看和停止恢复环境

恢复环境使用两个 Compose 配置文件。查看状态：

```powershell
docker compose --project-name zhixing-portable-review-20260817 `
  --env-file D:\zhixing-portable-review\.env `
  -f D:\zhixing-portable-review\compose.yaml `
  -f D:\zhixing-portable-review\compose.portable.override.yaml ps
```

再次启动时，把最后的 `ps` 换成 `start`；安全停止时，把最后的 `ps` 换成 `stop`。项目名和目录必须与恢复命令中的实际值一致。

不要为了缩短命令而猜测项目名，也不要执行 `down -v`。如果恢复失败，保留目标目录和 `restore-diagnostics.log`，根据终端最后显示的检查命令排查，不要删除已有 Volume。

## 七、最常见的问题

### `docker` 不是命令

Docker Desktop 未安装、未启动，或者安装后尚未重启电脑。先打开 Docker Desktop，等待 Engine 正常，再重新打开 PowerShell。

### Docker Desktop 一直启动失败

检查 Windows 虚拟化和 WSL 2 是否启用，并重启电脑。不要通过删除 Docker 数据来“修复”，否则可能丢失现有 Volume。

### 端口 3000、8000 或 3307 被占用

关闭占用端口的旧程序，或者在 `.env` 中改为未占用端口，例如：

```dotenv
FRONTEND_HOST_PORT=3100
BACKEND_HOST_PORT=8100
MYSQL_HOST_PORT=3407
```

重新执行 `docker compose up -d --build --force-recreate`。此时前台地址也要改为 `http://127.0.0.1:3100/`。

### 页面还是旧版本

先确认分支和容器：

```powershell
git status --short --branch
git log -1 --oneline
docker compose up -d --build --force-recreate frontend
```

然后在浏览器按 `Ctrl+F5`。

### 页面打不开

```powershell
docker compose ps
docker compose logs --tail 100 frontend
docker compose logs --tail 100 backend
```

只分享错误行，不要分享 `.env` 或包含密码的完整输出。

### 后台无法登录

GitHub 不包含管理员账号。全新环境必须执行：

```powershell
docker compose exec backend python manage.py initialize_admin
```

如果账号来自另一台电脑，则必须恢复相应数据库，单独克隆代码不会带来该账号。

### 新电脑没有原来的作品和图片

这是正常现象。代码、MySQL 数据和媒体文件是三类不同内容。需要原内容时，使用第六章的便携包，不要尝试把 Docker Volume 手工复制进 GitHub。

### 后台“查看站点”跳转地址不正确

确认 `.env` 中 `FRONTEND_SITE_URL` 与实际前端端口一致，修改后重新创建后端：

```powershell
docker compose up -d --force-recreate backend
```

## 八、数据安全红线

- 永远不要执行 `docker compose down -v`。
- 不要删除 Docker Desktop 的 Volumes，不要点击“清除全部数据”。
- 不要把 `.env`、密码、客户资料或数据库备份提交到 GitHub。
- 不要用真实管理员密码进行公开演示。
- 不要把 MySQL、Django 开发服务器或摄像头端口直接暴露到公网。
- 不要把本地 Docker 启动方式误认为正式服务器部署方案。
- 做重要修改和换机前，先运行 `scripts\backup-local.ps1` 并验证备份。

## 九、关机前清单

只做全新环境演示：

- [ ] 最新代码已合并到 GitHub `main`；
- [ ] 新电脑能够访问 GitHub 和 Docker Hub；
- [ ] 已保存本说明书；
- [ ] 知道新电脑需要重新创建 `.env`、管理员和演示数据。

需要原样带走当前数据：

- [ ] `package-portable.ps1` 已成功完成；
- [ ] 完整便携包目录已复制到移动硬盘；
- [ ] `.env` 已单独加密保存；
- [ ] GitHub 地址和便携包恢复命令已保存；
- [ ] 当前电脑已使用 `docker compose stop` 安全停止。

## 十、当前功能边界

当前 `main` 包含现阶段已经完成并审核的功能，但“能本地演示”不等于“已经正式上线”。询价购物车不是带库存和真实支付的完整电商购物车。目前仍未接入真实在线支付、短信验证码、微信登录、摄像头直播和生产服务器部署。这些功能必须在后续阶段完成安全设计、开发、测试和部署验收。
