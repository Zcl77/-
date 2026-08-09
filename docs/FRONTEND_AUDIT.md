# Frontend foundation audit

Audit date: 2026-08-09. Baseline: latest tree from `agent/phase-2-ui-system`.

## Empty gallery diagnosis

The screenshot was a valid Firestore response containing zero public projects, not a category button
failure. The previous data hook started with demo/cache data, subscribed to
`projects where visibility == "public"`, and then replaced both the screen and local cache with `[]`
when Firestore returned an empty snapshot. The gallery treated all of these cases as the same state:

- the initial request was still loading;
- Firestore failed;
- Firestore succeeded but had no public documents;
- a selected category had no matching projects.

The local demo dataset still existed in `src/data.ts`; hidden categories were not the cause for a
signed-out visitor. The fix does not silently fall back to demo records in Firebase mode. Instead,
the selected provider and data state are explicit:

- `loading`: request still in progress;
- `error`: no usable data and the request failed, with retry;
- `stale`: cached Firebase data is visible but the live connection failed, with retry;
- `empty`: selected backend successfully returned zero public projects;
- `ready`: projects loaded successfully.

Local development uses the explicit `mock` adapter and labels all supplied content as demo. Firebase
mode continues to show a truthful empty state when its database contains no published project.

## P0

| Problem | Impact | Result |
| --- | --- | --- |
| Empty, loading and failed project queries shared one UI | Operational failures looked like legitimate empty content | Fixed with explicit state model and retry |
| Components and hooks imported Firebase repositories directly | Removing Firebase required rewriting UI modules | Fixed with backend contracts and adapters |
| Firebase configuration threw during module import | Local UI could not run without Google configuration | Fixed with provider-scoped validation and lazy Firebase loading |
| No application error boundary | A render/configuration exception could blank the whole page | Fixed with visible reload fallback |

## P1

| Problem | Impact | Result |
| --- | --- | --- |
| No offline/local demo provider | UI development depended on a live backend | Fixed; Mock is read-only for authentication and session-only for data |
| Admin appeared as a primary public destination | Public information architecture mixed visitor and operator tasks | Fixed; admin is a separate utility entry |
| “Progress” was ambiguous | Public making records looked like future customer-private status | Fixed copy and navigation to “公开制作日志” |
| “评鉴” was unclear as navigation | New visitors could not predict contact/review content | Renamed public navigation to “联系” |
| Lint was only an alias for TypeScript | Hook and source-quality checks were absent | Fixed with ESLint and React Hooks rules |
| No formatter configuration | Formatting depended on each editor | Fixed with Prettier configuration |
| Provider status was invisible | Developers could confuse demo and cloud records | Fixed with visible demo label and data-source-aware admin copy |
| Windows Node paths could conflict | npm lifecycle commands failed despite a valid Node install | Documented one-install PATH checks; no machine path is committed |
| Vite 6.4.2 had Windows development-server advisories | A LAN-exposed development server increased local risk | Updated to 6.4.3 and bound dev/preview to `127.0.0.1` |

## P2 and remaining work

- `GalleryView.tsx`, `App.tsx`, and several admin forms remain larger than ideal. The data boundary is
  now stable, so further splitting can happen by user workflow without changing persistence.
- The project uses in-memory tab state rather than URL routes. Deep links and browser back/forward
  behavior should be added before launch.
- Demo media still uses third-party placeholder URLs. Real work photography, responsive derivatives,
  focal-point metadata, and ownership-approved alt text are required for final visual QA.
- Automated browser accessibility and end-to-end tests are not yet part of CI. This round performs
  scripted viewport, overflow, keyboard, touch and reduced-motion checks.
- Firebase comment submission still lacks reliable server-side rate limiting or CAPTCHA. Firestore
  validation prevents malformed writes but is not a complete anti-abuse service.
- Firebase remains the only persistent adapter until the Python API is built and migrated.
- `npm audit --omit=dev` reports zero production vulnerabilities. The full audit retains 12 findings
  inside Firebase Admin/CLI tooling after non-breaking fixes. The remaining recommended remediation
  upgrades `firebase-tools` to v15 and therefore requires a Java 21 environment and a separate
  compatibility pass; no breaking `npm audit fix --force` has been applied.

## UX decisions

- Public work and public making logs remain visible to everyone.
- Future customer project status must use a separate authenticated route and object-level access;
  it must not reuse the public making-log query.
- The contact page keeps approved visitor reviews, but “联系” is the public navigation label.
- Administrator access remains reachable, but is no longer presented as equal to visitor content.
