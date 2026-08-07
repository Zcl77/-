# 知行造境 / Zhixing Studio

知行造境官方网站与客户项目管理系统的早期原型。当前仓库保留作品展厅、制作进度、评论与后台管理等既有功能，并完成了第一阶段的权限、数据与工程基础加固。

仓库中的预置作品和评论仅用于演示界面，前台与后台均标记为“演示内容”，不代表真实客户、评价、销售或商业成绩。

## 技术栈

- React 19、TypeScript、Vite 6、Tailwind CSS 4
- Firebase Authentication、Cloud Firestore、Cloud Storage
- Vitest、Firebase Local Emulator Suite

## 目录

```text
src/
  components/          页面组件
  components/admin/    后台项目、评论、分类和设置模块
  components/gallery/  展厅子组件
  domain/              纯校验与可见性逻辑
  hooks/               认证和实时数据状态
  services/firebase/   Firebase repository/service 层
scripts/               管理员 Claim 与数据迁移脚本
tests/                 逻辑测试和 Firebase Rules 测试
docs/                  Firebase 配置与迁移操作文档
```

## 环境要求

- Node.js 22.12 或更高版本
- npm 10 或更高版本
- Java 21，用于本地 Firebase Rules 模拟器

不依赖任何固定电脑路径，也不要求在服务器上安装全局 `firebase-tools`。

## 本地开发

1. 安装依赖：

   ```bash
   npm ci
   ```

2. 从示例创建本地环境变量文件，并填入 Firebase Web App 的公开客户端配置：

   ```bash
   cp .env.example .env.local
   ```

3. 启动开发服务器：

   ```bash
   npm run dev
   ```

4. 打开 `http://localhost:3000`。

`.env.local` 已被 Git 忽略。不要在其中放置 Admin SDK 私钥，也不要提交服务账号 JSON、访问令牌或真实管理员 UID。

## 常用命令

```bash
npm run dev          # 本地开发
npm run typecheck    # TypeScript 检查
npm test             # 纯逻辑测试
npm run test:rules   # Firestore + Storage Rules 模拟器测试
npm run build        # 生产构建
npm run check        # 类型、逻辑测试和构建
```

## Firebase 配置

完整步骤见 [Firebase 配置指南](docs/FIREBASE_SETUP.md)。上线前至少需要：

1. 创建或选择 Firebase 项目和 Web App。
2. 启用 Google Authentication、Firestore 和 Storage。
3. 配置 `.env.local`。
4. 使用 Firebase Admin SDK 为指定 UID 设置 `admin: true` Custom Claim。
5. 部署 `firestore.rules` 与 `storage.rules`。
6. 用普通 Google 账号和管理员账号分别验证权限。

前端不会按邮箱、邮箱验证状态或本地状态伪造管理员权限。后台只有在 Firebase ID Token 含 `admin: true` 时开放；Firestore 与 Storage Rules 会再次独立校验同一 Claim。

## 管理员 Claim

脚本使用 Application Default Credentials，并保留账号已有的其他 Custom Claims：

```bash
# macOS / Linux
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_ADMIN_UID="firebase-auth-uid"
npm run admin:claim

# 撤销
npm run admin:claim -- --revoke
```

PowerShell：

```powershell
$env:FIREBASE_PROJECT_ID = "your-project-id"
$env:FIREBASE_ADMIN_UID = "firebase-auth-uid"
npm run admin:claim
```

Claim 更新后，该用户必须退出并重新登录，或刷新 ID Token。不要把管理员 UID 写入仓库。

## 数据迁移

旧远程 URL 和旧 Base64 图片在迁移前仍可显示。新上传图片全部进入 Firebase Storage，Firestore 仅保存 URL、Storage 路径和元数据。

迁移脚本默认只读预检，只有追加 `--apply` 才会写入：

```bash
npm run migrate:data
npm run migrate:data -- --apply
```

执行前必须备份 Firestore，并按照 [数据迁移指南](docs/DATA_MIGRATION.md) 配置 ADC、项目、数据库和 Bucket。脚本还会为旧项目补充可见性，为旧评论补充审核状态，并标记仓库已知的演示记录。

## 安全边界

- 游客只能查询 `visibility == "public"` 的项目和 `status == "approved"` 的评论。
- 分类管理文档和隐藏分类名称仅管理员可读。
- 新评论只能写入白名单字段，评分必须为 1-5 整数，状态必须为 `pending`。
- Storage 只允许管理员写入 `public/`，并限制为 JPEG、PNG、WebP、GIF、AVIF 且不超过 10 MB。
- 所有其他 Firestore 文档与 Storage 路径默认拒绝。

当前直接写入 Firestore 的评论入口没有可靠的服务端频率限制或验证码。`ReviewSubmissionGateway` 已集中为单一扩展入口，后续应替换为验证 App Check/验证码并执行速率限制的 HTTPS Callable Function；在完成前不要宣称具备服务端防刷能力。

## 部署

先验证，再显式指定 Firebase 项目部署规则：

```bash
npm run typecheck
npm test
npm run build
npm run test:rules
npx firebase deploy --project your-project-id --only firestore:rules,storage
```

前端可将 `dist/` 部署到 Firebase Hosting、Vercel、Cloudflare Pages 或其他静态托管服务。生产环境变量应在托管平台配置，不应写入仓库。

## 持续集成

`.github/workflows/quality.yml` 会在 Pull Request 和 `main` 推送时使用 Node.js 22 与 Java 21 执行安装、类型检查、测试、构建和 Rules 验证。

## 已知限制

- 尚未接入服务端验证码、App Check 或可靠频率限制。
- 被放弃且从未保存的临时图片上传可能形成 Storage 孤立对象；上线前应配置定期清理任务或上传暂存机制。
- 首屏 JavaScript 包仍较大，后续可按页面做动态加载，不影响本阶段安全修复。
