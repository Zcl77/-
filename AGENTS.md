# Zhixing Studio engineering rules

## Product

- This repository is the production business website for 知行造境 / Zhixing Studio, not a demo site.
- The product principle is to connect customers and the studio through truthful, transparent progress and sustained communication.
- Never fabricate reviews, progress, deadlines, customer feedback, sales, awards, clients, or business results.
- Public portfolio content and private customer project content are separate domains and must never share an authorization shortcut.

## Fixed MVP stack

- Frontend: React 19, TypeScript, Vite.
- Backend: Django 5.2 LTS and Django REST Framework.
- Database: MySQL 8.4 with InnoDB, utf8mb4, and strict mode.
- Local orchestration: Docker Compose.
- Media: Docker volumes. MySQL stores paths and metadata, not image bytes.
- Internal administration: Django Admin.
- Firebase, Firestore, Firebase Storage, Google login, and Custom Claims are not part of the target runtime.

## MVP boundaries

- Implement public works, inquiries, moderated reviews, orders, customer projects, progress, private images, acknowledgements, and project messages.
- Do not implement payments, SMS login, WeChat login, notifications, MinIO/S3, or camera streaming in the first release.
- Customers may access only projects explicitly granted through ProjectMembership.
- Private media must pass server-side object authorization. A hidden button or unguessable URL is never an authorization boundary.
- Use real project records. Local seed data must be explicitly marked as development-only and must never load automatically in production.

## Security and operations

- Never commit passwords, tokens, private keys, administrator IDs, customer data, or machine-specific paths.
- Do not connect to Firebase, an existing remote database, or any server without explicit approval.
- Do not deploy without explicit approval.
- Do not expose MySQL or private media ports publicly.
- Never run `docker compose down -v` or any command that removes persistent volumes.
- Use Django sessions, HttpOnly cookies, CSRF protection, Argon2 password hashing, login throttling, and server-side permission checks.
- Reject undeclared API fields and validate uploaded content, decoded image type, size, and pixel dimensions.

## Required checks

- Frontend: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- Backend: Django system checks, migration checks, model/serializer/auth/permission/media tests.
- Integration: Compose build, clean database migration, customer isolation, media persistence, and coordinated backup/restore rehearsal.
- Production preparation: `python manage.py check --deploy` with production settings.

## Git workflow

- Work only on an approved feature branch. Never push directly to `main`.
- Keep commits small and logically scoped.
- Do not rebase, force-push, or rewrite shared history.
- Open a Draft PR for the Django MVP and do not merge it without explicit approval.
