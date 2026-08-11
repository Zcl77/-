# Zhixing Studio MVP architecture

## Product boundary

The public portfolio and the private customer workspace are separate security domains.

- Public: published categories, works, public process posts, approved reviews, studio contact information, and inquiry submission.
- Private: orders, client projects, memberships, production stages, progress updates, progress images, acknowledgements, and project messages.
- Internal: Django Admin for trusted studio staff. The React application is not an authorization boundary.

## Runtime

```text
Browser
  -> React/Vite frontend
  -> same-origin /api, /admin and media routes
  -> Django 5.2 + DRF
       -> MySQL 8.4
       -> public/private media volume
```

Development uses three Compose services: `frontend`, `backend`, and `db`. Production will place an isolated reverse proxy in front, keep MySQL internal, and use an authorization-gated internal redirect for private media.

| Service    | Development binding | Persistent data             |
| ---------- | ------------------- | --------------------------- |
| `frontend` | `127.0.0.1:3000`    | none                        |
| `backend`  | `127.0.0.1:8000`    | `media_data`, `static_data` |
| `db`       | `127.0.0.1:3307`    | `mysql_data`                |

## Authentication

- A custom Django user model is present from the first migration.
- Studio staff use Django Admin and Django model permissions.
- Customers use the React login page backed by Django sessions.
- Session cookies are HttpOnly; production enables Secure and SameSite settings.
- Unsafe requests require CSRF validation.
- Passwords use Argon2 first, followed by Django's maintained fallback hashers.
- New customer accounts require a password change after the first login.
- Login failures are throttled and authentication/security events are recorded without secrets.

## Authorization

- Every private list and detail queryset is filtered server-side.
- `ProjectMembership` is the only customer-to-project access grant.
- Guessing a project, order, update, message, or media UUID must return the same non-disclosing response as a missing object.
- Private media is streamed only after checking a staff permission or an active project membership.
- Automated tests create at least two customers and prove that neither can access the other's objects.

## Media

- MySQL stores metadata and relative storage keys only.
- Public and private media use separate path prefixes and delivery rules.
- Accepted images: JPEG, PNG, and WebP. SVG is rejected.
- Validation combines extension, declared MIME, decoded format, byte limit, and pixel limit.
- Originals are retained; display and thumbnail derivatives are generated.
- Replacement writes and verifies the new file before changing references, then removes unreferenced old files after commit.
- Production private delivery is designed for Nginx `X-Accel-Redirect`; development uses an authenticated Django response.

## Data model

- Accounts: `User`, `CustomerProfile`, `SecurityEvent`.
- Public portfolio: `Category`, `Work`, `WorkImage`, `PublicProcessPost`, `PublicProcessImage`, `StudioSetting`.
- Customer work: `Order`, `ClientProject`, `ProjectMembership`, `ProductionStage`, `ProgressUpdate`, `ProgressImage`, `ProgressReceipt`, `ProjectMessage`, `MessageReadReceipt`.
- Interaction: `Review`, `Inquiry`, `InquiryAttachment`.
- Media: `MediaAsset`, shared by public and private references through explicit relations.

`Work` is public portfolio content, `Order` is a commercial record, `ClientProject` is an actual production project, `PublicProcessPost` is a public journal, and `ProgressUpdate` is private customer progress. These concepts must not be merged.

## REST API

Public:

- `GET /api/v1/health`
- `GET /api/v1/site`
- `GET /api/v1/categories`
- `GET /api/v1/works`
- `GET /api/v1/works/{slug}`
- `GET /api/v1/public-process`
- `GET|POST /api/v1/reviews`
- `POST /api/v1/inquiries`
- `GET /api/v1/media/public/{asset_id}`

Session authentication:

- `GET /api/v1/auth/csrf`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password/change`

Authorized customer:

- `GET /api/v1/me/orders`
- `GET /api/v1/me/projects`
- `GET /api/v1/me/projects/{project_id}`
- `GET /api/v1/me/projects/{project_id}/stages`
- `GET /api/v1/me/projects/{project_id}/updates`
- `GET|POST /api/v1/me/projects/{project_id}/messages`
- `POST /api/v1/me/projects/{project_id}/updates/{update_id}/acknowledge`
- `GET /api/v1/me/media/{asset_id}`

Staff writes use Django Admin in the MVP, so the first release deliberately avoids a second custom administration API surface.

## Storage boundary

Application code creates media through `media_library` services and exposes normalized rendition metadata to serializers. The first release uses Django file storage backed by `media_data`; this boundary can later adopt an S3-compatible storage backend without changing React page contracts or storing binary data in MySQL.

## Backup boundary

A usable restore point contains both a transaction-consistent MySQL dump and a media archive. `scripts/backup-local.ps1` creates this pair with a checksum manifest; `scripts/verify-backup.ps1` restores it only into isolated temporary locations for verification. Neither script deletes Docker volumes.

## Deferred work

Online payment, SMS authentication, WeChat login, outbound notifications, object storage, and camera streaming are intentionally outside the MVP.
