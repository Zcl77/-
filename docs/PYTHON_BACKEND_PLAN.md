# 自建 Python 后端方案

本文件是设计方案，不包含服务器部署。本轮未连接或修改任何服务器。

## 技术选择

| 维度 | FastAPI | Django + Django REST Framework |
| --- | --- | --- |
| 定位 | API 优先、类型驱动、异步能力直接 | 完整 Web 平台加成熟 REST 工具集 |
| 数据建模 | 需自行选择 ORM、迁移和后台管理组合 | 内置 ORM、迁移、认证、权限和管理后台 |
| 管理内容 | 通常需要另建管理界面或引入额外系统 | Django Admin 很适合作品、进度、评论和客户资料的内部管理 |
| 权限 | 可通过依赖注入组合，但模型和策略需要自行搭建 | 用户、组、模型权限及 DRF 权限类有统一体系 |
| 当前项目成本 | API 本身轻，但需要组合较多基础设施 | 初始结构更重，但能减少后台、账号和审核功能的自建量 |

推荐 **Django + Django REST Framework**。当前目标不只是公开 API，还包括作品管理、客户账号、项目阶段、评论审核和媒体管理。Django 的 ORM、迁移、认证和内部管理后台能减少独立开发者的基础设施负担。FastAPI 仍是优秀的 API 优先方案，适合后续独立的异步通知、媒体处理或直播状态服务，但不建议作为第一版管理系统的唯一框架。

参考：

- [FastAPI Features](https://fastapi.tiangolo.com/features/) 与 [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Django Authentication](https://docs.djangoproject.com/en/dev/topics/auth/) 与 [Django Admin](https://docs.djangoproject.com/en/4.2/ref/contrib/admin/)
- [DRF Authentication](https://www.django-rest-framework.org/api-guide/authentication/) 与 [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/)

## 基础设施

- 数据库：PostgreSQL。开发、测试、预发布和生产使用独立数据库与凭据。
- 图片与视频：开发环境可使用独立本地媒体目录；生产优先使用 MinIO 或其他兼容 S3 的对象存储。数据库只保存对象键、URL、MIME、大小、尺寸和校验信息。
- 缓存与任务：初版不强制引入。确有通知、转码或批处理需求时再增加 Redis 与成熟任务队列。
- API：版本化 `/api/v1/`，OpenAPI 只作为接口契约，不把内部模型无选择地全部暴露。

## 认证与权限

1. 使用 Django 成熟的密码哈希、会话、CSRF 和用户系统，不自写密码算法或令牌算法。
2. 同域 Web 客户端优先使用 `HttpOnly`、`Secure`、`SameSite` Cookie 的会话认证，并对写请求执行 CSRF 校验。
3. 角色至少分为游客、客户、编辑、审核员、管理员。
4. 客户项目使用 `ProjectMembership` 做对象级授权；知道项目 ID 不等于拥有读取权限。
5. 公共作品与公共制作日志使用显式发布状态；客户私有项目、阶段和文件使用独立端点与权限，不共用“隐藏分类”作为安全边界。
6. 若未来需要移动端或跨域客户端，再采用成熟、审计过的短期令牌组件或身份提供商。

## 应用模块

| Django app | 职责 |
| --- | --- |
| `accounts` | 用户、角色、客户资料、登录与会话 |
| `catalog` | 作品、分类、工艺、公开展示状态 |
| `projects` | 客户项目、成员、阶段、里程碑 |
| `progress` | 公开制作日志与私有进度更新 |
| `reviews` | 游客提交、审核、拒绝、删除 |
| `media` | 对象存储记录、上传授权、引用与清理 |
| `studio` | 工作室公开设置和联系信息 |
| `inquiries` | 后续询价入口 |
| `notifications` | 后续邮件、站内通知和投递记录 |
| `live` | 后续直播入口和状态，不在第一版实现推流系统 |

## 数据表初稿

- `User`, `CustomerProfile`, `Role`/`Group`
- `Category`, `Project`, `ProjectImage`, `Room`, `RoomImage`, `Craft`
- `ClientProject`, `ProjectMembership`, `ProjectStage`, `ProgressUpdate`
- `Review`, `ReviewModerationEvent`
- `MediaAsset`, `MediaReference`
- `StudioSetting`, `Inquiry`, `NotificationDelivery`, `LiveEntry`
- 所有业务表保留稳定 UUID、创建/更新时间、必要的发布状态和操作者审计字段。

## 前后端联调

React 只调用 `StudioBackend` 接口。当前已有 `mock` 与 `firebase` 适配器；后续新增 `rest` 适配器，将 `/api/v1/` 响应映射为现有领域类型。开发环境由 Vite 代理 API，生产环境使用同域反向代理，减少 CORS 和 Cookie 配置风险。

## Firebase 迁移与回滚

1. 保持当前 Firebase 适配器可运行，冻结新的 Firebase 专属 UI 逻辑。
2. 在独立开发环境建立 Django API、PostgreSQL 和对象存储，完成契约测试。
3. 从 Firestore/Storage 只读导出，记录文档数、对象数、哈希和失败清单；导入预发布环境后逐项核对。
4. REST 适配器先做只读影子验证，对比关键列表和详情，不改变线上读路径。
5. 计划维护窗口，短暂停止后台写入，做最后增量迁移，再通过环境变量切换前端适配器。
6. 回滚时把前端适配器切回 Firebase，并保留迁移期间的写入审计；未核对完成前不删除 Firebase 数据。
7. 经过备份恢复演练和观察期后，再单独审批 Firebase 下线。

## 环境与服务器隔离

- `dev`：本机 Compose、假邮件、独立媒体目录，可重置数据。
- `test`：临时 PostgreSQL/对象存储，自动测试后销毁。
- `staging`：独立域名、数据库、Bucket、密钥和匿名化数据。
- `production`：独立系统用户、项目目录、Compose 项目名、容器网络、卷和备份。

正式部署前必须获得授权并只读清点系统、负载、端口、Docker、Nginx、数据库、域名、证书、容器、网络、卷与备份。不得覆盖现有配置，不长期使用 root 运行服务，不未经确认开放端口。每次配置变更都应先备份并准备明确回滚命令。
