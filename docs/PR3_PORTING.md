# PR #3 manual porting record

PR #3 remains Draft and must not be merged as a whole. It is based on an older Phase 2 head and currently conflicts with the merged UI branch.

## Port manually

- Application Error Boundary.
- Distinct loading, request failure, valid empty, filtered-empty, unauthorized, and save-failure states.
- ESLint and Prettier configuration.
- URL routing with browser back/forward support and shareable public work URLs.
- A backend interface boundary reshaped around the Django REST API.

## Do not port

- Firebase adapters or Firebase as a production default.
- Mock/Firebase dual-provider runtime behavior.
- Google login or Custom Claims.
- PostgreSQL or MinIO decisions.
- Documentation that conflicts with Django 5.2, MySQL 8.4, Docker volumes, or Django sessions.

Useful code will be reimplemented or selectively copied on `agent/django-mysql-mvp` with new tests. PR #3 stays open and Draft until that work is verified.
