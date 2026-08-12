# PR #3 manual porting record

PR #3 remains Draft and must not be merged as a whole. It is based on an older Phase 2 head and currently conflicts with the merged UI branch.

## 已手工移植并重新验证

- Application Error Boundary。
- 加载、请求失败、有效空数据、筛选为空、未授权和保存失败状态。
- ESLint 与 Prettier 配置。
- 支持浏览器前进/后退和可分享作品地址的 URL 路由。
- 围绕 Django REST API 重新建立的数据访问边界。

## Do not port

- Firebase adapters or Firebase as a production default.
- Mock/Firebase dual-provider runtime behavior.
- Google login or Custom Claims.
- PostgreSQL or MinIO decisions.
- Documentation that conflicts with Django 5.2, MySQL 8.4, Docker volumes, or Django sessions.

上述内容已在 `agent/django-mysql-mvp` 中按当前架构重新实现并补充测试，不依赖 PR #3 的 Firebase 或 Mock 运行时。PR #3 继续保持 Draft，不整体合并。
