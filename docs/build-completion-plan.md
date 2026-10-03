# UG LearnHub implementation and acceptance plan

## Inspected baseline

The checkout contains a Next.js App Router scaffold with Better Auth, PostgreSQL,
Drizzle, Vercel Blob, and a static client-side dashboard. Substantial staged
changes already replace an older Vite/Firebase application. Preserve those
changes; do not reset the index or restore deleted application files.

Both attached specifications define the scope. Existing functionality cannot be
counted as complete merely because a page or a package exists.

The supplied `public/school-logo.png` depicts the University of Ghana crest. Use
the original image without recolouring, cropping, redrawing, or stretching it.
The shared `components/ug-brand.tsx` component is ready for integration into the
public, authentication, and workspace layouts. Its presence does not imply
official university affiliation.

Brand reference:
https://www.ug.edu.gh/careers/sites/careers/files/2023-06/UG%20Brand%20Manual.pdf

## Existing-file changes requiring approval

The user's AGENTS.md Hard Rule 1 requires describing changes and receiving a
go-ahead before modifying existing files. The proposed approval covers:

- `app/page.tsx`: replace the mock dashboard with the public landing page and
  links to authenticated role workspaces.
- `app/layout.tsx`, `app/globals.css`: integrate the supplied crest, semantic UG
  blue/gold tokens, accessible responsive layouts, and light/dark/system themes.
- `components/auth-form.tsx`, authentication pages, `lib/auth-client.ts`: connect
  registration, verification, login, recovery, logout, errors, and role redirects.
- `lib/auth.ts`: make role fields server-controlled, enforce account status,
  configure verification/recovery email, secure cookies, rate limits, and audit
  events. Re-read authorization from the database for privileged operations.
- `lib/db/index.ts`, `lib/db/schema.ts`: complete the relational academic model,
  configure database lifecycle, and provide versioned migrations and transactions.
- `app/api/upload/route.ts`: replace unrestricted public uploads with authorized,
  course-scoped private storage and validated resource records.
- `package.json`, lockfile, `next.config.mjs`, and relevant configuration: add
  migration, seed, lint, test, and typecheck commands; stop ignoring build errors;
  add only dependencies needed by the accepted implementation.

## Architecture

Continue with the established Next.js/TypeScript/PostgreSQL/Better Auth stack.
The specification permits a backend other than Supabase. Keep storage and AI
behind replaceable server adapters. Never introduce browser storage as an
identity, academic-data, or file persistence boundary.

Use a restricted application database role, migrations executed by a separate
owner, server authorization, and transaction-scoped identity for PostgreSQL row
policies. Do not claim RLS protection when running with a bypass-capable owner.

Use private object storage. Resource playback and downloads must authorize each
request, support byte ranges for videos, and apply download permissions. Large
uploads need direct upload authorization rather than a serverless multipart
handler that exceeds the hosting provider's body limit. Upload completion must
verify object metadata and ownership before creating a reviewable resource.

## Implementation sequence

1. **Foundation:** environment validation, schema, migrations, restricted database
   permissions, RBAC, validation, typed errors, audit logging, pagination, and
   transactional service boundaries.
2. **Identity:** email/password authentication, verification, reset, sessions,
   logout, disabled accounts, protected routes, forbidden/unauthorized states,
   and secure server-side demo seeding. Registration always creates a student.
3. **Academic catalogue:** faculties, departments, programmes, levels, terms,
   courses, offerings, lecturer assignments, and transactional capacity-aware
   enrollments. Public discovery exposes only published catalogue data.
4. **Role workspaces:** student, lecturer, administrator, and super administrator
   shells and dashboards derived from persisted records. Add every requested
   public, student, lecturer, administrator, and governance route.
5. **Resources:** validated uploads, private storage, versions, moderation,
   correction notes, archive/restore, PDF viewing, permitted downloads, video
   playback/resume, engagement, bookmarks, and private notes. Include a malware
   scanning integration and an orphan-cleanup strategy.
6. **Quizzes:** authoring, question types, availability, attempt limits, server
   deadlines, answer persistence, idempotent submission, server-side scoring,
   and review policies. Never send answer keys to the student attempt client.
7. **Academic activity:** scoped announcements, scheduled publication,
   notifications, calendar month/week/agenda views, search with Ctrl/Cmd+K,
   profiles, preferences, progress, analytics, and reports.
8. **Administration:** user lifecycle, protected administrator management,
   granular permissions, settings, feature flags, integrations, storage reports,
   AI configuration, security activity, and immutable audit history.
9. **Role-aware AI:** server-derived identity, permissions, academic context,
   personas, permission-checked tools, provider adapters, usage limits,
   conversation ownership, authorized document extraction/retrieval, and source
   citations. Reauthorize chunks at retrieval time after moderation or enrollment
   changes. Obtain configured consent before transmitting private materials.
   Sensitive AI-proposed writes require an explicit confirmation and a fresh
   authorization check at execution; prompts cannot grant access.
10. **Verification and delivery:** meaningful unit/integration/Playwright suites,
    responsive and keyboard checks, production build, setup/deployment README,
    environment example, and a feature-by-feature acceptance report.

## Seed acceptance

Use a server-only, explicit development/demo seed command with credentials read
from environment variables. Seed four primary role accounts, at least 10
students, 5 lecturers, 2 administrators, 3 faculties, 6 departments, 8 programmes,
25 courses, 2 terms, 20 offerings, 40 resources, 10 quizzes, and 15 announcements.
Include enrollments, attempts, progress, bookmarks, notifications, and events.
Label all fictional academic records as demo data. Do not embed demo passwords
in client bundles or automatically seed a production database.

## Required acceptance evidence

- Student: log in, enroll, access an approved PDF, download when permitted,
  watch/resume a video, bookmark, submit a quiz, inspect results/progress,
  receive announcements, and use authorized AI context.
- Lecturer: log in, inspect assigned courses/rosters, upload documents and
  videos, submit for moderation, revise corrections, author quizzes and
  announcements, and inspect scoped analytics.
- Administrator: moderate with audited transitions, manage users and catalogue,
  inspect reports, and access permitted audit records.
- Super administrator: manage administrators, roles/permissions, AI, feature
  flags, integrations, and system settings with sensitive-action confirmation.
- Negative cases: role self-escalation, cross-course access, private/draft
  resource access, unrelated student information, answer-key leakage,
  over-capacity enrollment, late/duplicate quiz submissions, disabled accounts,
  forged upload completions, and AI cross-user conversation access are blocked.
- Run typecheck, lint, unit tests, integration tests, E2E tests, and production
  build. Record actual outcomes, never infer passing tests from old artifacts.

## External configuration and current verification limits

No database, authentication, storage, or AI service environment variables were
present during inspection. PostgreSQL and Docker commands were not available on
PATH. No dependency directory was present. Live service behavior therefore
cannot yet be verified.

Deployment needs a PostgreSQL connection, strong authentication secret and
canonical application URL, transactional email configuration, private object
storage credentials, and a selected AI provider/model/key. Never commit or print
real secrets. Implement explicit unavailable-service states and distinguish
implementation completion from live deployment validation.

## Current status

Inspection and the reusable crest component are complete. The component is not
yet wired into existing pages. Implementation edits are awaiting the go-ahead
required by the user's existing-file rule. No build or test pass is claimed.
