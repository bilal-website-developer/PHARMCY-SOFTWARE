# Redesign Progress

## Status

| Phase | Status | Notes |
|---|---|---|
| R0 | Done | Cashier cost/profit sanitizer regression tests pass; seed and visible fallback wording reviewed in the prior R0 pass. |
| R1 | Partly done | Existing route navigation is grouped, Branches and Owner Mobile are hidden from the menu, Style Guide is Admin-only, Cashier menu/direct route access is limited to its allowed screens, and the top header/sidebar use the deep-green theme token. The exact R1 plan and reference layout are unavailable. |
| R2 | Blocked | Exact requirements are in the missing redesign plan. |
| R3 | Blocked | Exact requirements are in the missing redesign plan. |
| R4 | Blocked | Exact requirements and reference pages are unavailable. Cashier API check from R0 remains covered by passing tests. |
| R5 | Blocked | Exact requirements are in the missing redesign plan. |
| R6 | Blocked | Exact requirements and reference pages are unavailable. |
| R7 | Blocked | Exact requirements are in the missing redesign plan. |
| R8 | Blocked | Exact requirements and reference pages are unavailable. |
| R9 | Blocked | Exact requirements and reference pages are unavailable. |
| R10 | Blocked | Exact requirements and reference pages are unavailable. |
| P4 | Blocked | Launch requirements are in the missing redesign plan; the supplied project build plan is not an equivalent specification. |

## Files Changed In This Run

- `packages/shared/src/index.ts`: added navigation groups, hid Branches and Owner Mobile from navigation, limited Style Guide to Admin, and added the deep-green theme token.
- `apps/web/src/components/layout/AppShell.tsx`: rendered ordered navigation sections and applied the deep-green token to the top header/sidebar.
- `apps/web/src/router.tsx`: enforced the specified Cashier route boundary and Admin-only Style Guide.
- `apps/web/src/index.css` and `apps/web/tailwind.config.js`: exposed the sidebar color token.
- `docs/REDESIGN_PROGRESS.md`: recorded status and blockers.

## Assumptions

- The explicit route mapping in the user's prompt is authoritative for R1.
- Existing routes not listed for Cashier should not remain accessible to Cashier by direct URL.
- Existing routes for Branches and Owner Mobile remain registered but hidden from the sidebar, as requested.
- No database migration is needed for the R1 navigation and permission changes.

## Blocked

- `/docs/redesign-plan.md` is not present. The only plan available is `docs/BUILD_PLAN.md`, which describes a different phase structure and does not define R0-R10 or P4.
- `/docs/AI_Friendly_Demo_Store_Website_Specification.pdf` is not present in the workspace, so reference page matching cannot be verified.
- The repository is still on `master` with extensive tracked modifications and untracked application files. No branch switch or phase commit was made, to avoid bundling or disrupting inherited work.
- Exact R2-R10/P4 outcomes, and the missing R1 screens that should receive routes, require the requested source plan before implementation.

## Validation

- `npm run build:web`: passed; Vite reports the existing large-chunk warning.
- Current R1 visual validation: `npm run build:web` passed; Vite reports the existing large-chunk warning.
- `npm run build:api`: passed; Prisma client generation completed.
- `npm --prefix apps/api test`: passed; 8 test files, 59 tests.