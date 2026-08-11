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

## Deferred work

Online payment, SMS authentication, WeChat login, outbound notifications, object storage, and camera streaming are intentionally outside the MVP.
