# Firestore 与图片迁移指南

`scripts/migrate-firebase-data.mjs` 用于把早期 Firestore 文档升级到当前结构。脚本使用 Firebase Admin SDK，权限很高，必须在受控本机执行。

## 迁移内容

- 将项目、房间、制作步骤、工作室二维码和成员二维码中的受支持 Base64 图片上传到 Storage。
- 用下载 URL 替换对应 Base64 字段，并记录 `path`、`contentType`、`size`、`originalName`、`uploadedAt`。
- 保留已有 HTTP/HTTPS 图片 URL，不重复上传。
- 根据 `metadata/hiddenCategories` 为项目补充 `visibility`，并保留已明确设为 `hidden` 的项目。
- 将无有效状态的普通旧评论设为 `pending`。
- 将仓库内已知的三条演示评论标记为 `isDemo: true`；缺少状态时设为 `approved`。
- 将仓库内已知的演示项目标记为 `isDemo: true`。

## 执行前

1. 导出或备份 Firestore。
2. 确认目标项目 ID、Firestore 数据库 ID 和 Storage Bucket。
3. 配置 Application Default Credentials。
4. 确认账号拥有 Firestore 与 Storage 管理权限。
5. 先在非生产项目完整演练。

环境变量：

```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
# 仅命名数据库需要
export FIREBASE_DATABASE_ID="your-database-id"
```

PowerShell 使用 `$env:FIREBASE_PROJECT_ID = "..."` 等价设置。

## 只读预检

```bash
npm run migrate:data
```

脚本会输出预计修改的项目、评论、metadata 文档和图片数量，但不会写入。

## 正式执行

确认预检数量与备份后：

```bash
npm run migrate:data -- --apply
```

执行后重新运行只读预检；各项预计修改数量应为 0。随后抽查公开项目、隐藏项目、旧远程 URL、已迁移 Storage URL、评论审核状态和二维码。

## 失败与重试

- 图片对象路径按原字段稳定生成。若图片上传后 Firestore 写入失败，修复权限或网络后可安全重跑，目标对象会被覆盖。
- 脚本不会删除未知 Storage 对象，也不会批量删除原有远程图片。
- 不要在迁移过程中同时从后台修改相同文档。
- 如结果不符合预期，停止写入并从迁移前备份恢复 Firestore；不要猜测性修改生产数据。

## 不自动迁移的内容

- SVG Base64 不会上传，因为当前 Storage Rules 不允许 SVG。请在离线环境转换为 PNG 或 WebP，确认不超过 10 MB，再通过后台上传。
- 无法解析或损坏的 Data URL 会原样保留，便于人工检查。
- 脚本不实现验证码、评论限流、图片内容审核或病毒扫描。

迁移完成并确认无回滚需求后，可另行清理备份与孤立对象；不要在同一次迁移中自动删除源数据。
