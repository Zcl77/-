# Firebase 配置指南

## 1. 创建服务

在 Firebase Console 中选择项目，然后：

1. 注册 Web App，取得 Web 客户端配置。
2. 在 Authentication 中启用 Google 登录提供方，并设置支持邮箱和授权域名。
3. 创建 Cloud Firestore 数据库。
4. 启用 Cloud Storage，并确认生产 Bucket 名称。
5. 将 Web App 配置写入本机 `.env.local`。这些值是客户端标识，不是 Admin SDK 凭据。

如果使用命名 Firestore 数据库，再设置 `VITE_FIREBASE_DATABASE_ID`；默认数据库应删除该变量或留空。

## 2. 部署 Rules

先在本地验证：

```bash
npm run test:rules
```

再使用明确的项目 ID 部署，避免误部署到 CLI 当前项目：

```bash
npx firebase deploy --project your-project-id --only firestore:rules,storage
```

部署后在 Firebase Console 的 Rules 页面确认发布时间和内容。

## 3. 设置管理员 Claim

管理员权限必须由受信任环境中的 Firebase Admin SDK 设置，不能从浏览器设置。

1. 在 Authentication 用户列表取得目标账号 UID。
2. 在本机配置 Application Default Credentials。可使用 `gcloud auth application-default login`，或在本机临时设置 `GOOGLE_APPLICATION_CREDENTIALS` 指向未纳入 Git 的服务账号文件。
3. 确认执行身份有管理 Firebase Authentication 用户的权限。
4. 设置环境变量并运行：

   ```bash
   FIREBASE_PROJECT_ID="your-project-id" FIREBASE_ADMIN_UID="uid" npm run admin:claim
   ```

5. 让该用户完整退出并重新登录，以获取含新 Claim 的 ID Token。

撤销权限：

```bash
FIREBASE_PROJECT_ID="your-project-id" FIREBASE_ADMIN_UID="uid" npm run admin:claim -- --revoke
```

脚本不会删除该用户已有的其他 Custom Claims。

## 4. 手工验收

使用两个不同账号执行：

1. 普通已验证 Google 账号：登录后应看到“没有管理员 Claim”，并被 Firebase 真正退出；不能读取隐藏分类或未审核评论，也不能写项目或 Storage。
2. 含 `admin: true` 的账号：可进入后台、保存项目、审核评论、管理分类并上传图片。
3. 管理员点击退出后：Auth 会话应清除，后台编辑状态关闭；刷新页面仍保持退出。
4. 隐藏一个分类：其项目应立即从展厅、制作进度和评论目标列表消失，直接读取隐藏项目也应被 Rules 拒绝。

## 5. 评论防滥用后续工作

当前 Rules 负责字段、长度、评分与审核状态约束，但 Firestore Rules 不能提供可靠的按 IP/账号频率限制。

正式开放匿名评论前，应把 `reviewSubmissionService` 的 `ReviewSubmissionGateway` 替换为 HTTPS Callable Function 或受控 API，并在服务端：

- 验证 Firebase App Check；
- 验证验证码令牌；
- 按 IP、设备和时间窗口限流；
- 记录滥用事件；
- 仅由服务端创建 `pending` 评论。

在该服务上线前，建议限制评论入口曝光或由运营人员监控待审核队列。
