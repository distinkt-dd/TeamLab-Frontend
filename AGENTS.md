# Frontend instructions

## General

- Work only inside the frontend directory unless the task explicitly requires otherwise.
- Before making changes, inspect the existing project structure, routing,
  components, styles, API layer, and conventions used in neighboring files.
- Preserve the existing architecture, naming conventions, formatting,
  and code style.
- Make minimal, task-focused changes.
- Do not refactor unrelated code.

## Stack

- React
- TypeScript
- Vite
- Use the package manager and commands already configured in the repository.

## Components and styles

- Reuse existing UI components, layouts, typography, icons, design tokens,
  and CSS conventions.
- Do not duplicate components that already exist.
- Do not introduce a new styling approach.
- Do not hardcode colors, spacing, or typography when the project already
  has tokens or shared styles for them.
- Keep the page responsive and consistent with the existing design.

## Dependencies

- Do not install new production dependencies unless explicitly requested.
- Do not replace existing libraries with alternatives.

## TypeScript

- Do not use `any` unless there is no reasonable alternative.
- Preserve existing public types and API contracts.
- Do not suppress TypeScript or lint errors without explaining the reason.

## Validation

Default checks for every code change (fast, run before finishing):

- `npm run lint` (ESLint).
- `npm run build` (`tsc -b && vite build`).

Do not run these on every change — they are not routine per-change checks:

- Cypress e2e (`npm run test:e2e` = `cypress run`, needs a running `npm run dev`).
  E2E is a commit gate, not a per-change check: run it when the user asks to commit or
  prepare a commit, or when the task itself is about the Cypress suite (`cypress/`,
  `cypress.config.ts`) or about behaviour already covered by it.
- `npx steiger ./src` and `npm run format:check` — the current code base fails both
  (inherited debt). Run them only when the task touches FSD boundaries or formatting,
  and compare against the baseline instead of expecting a clean run.
- Backend `pytest` — only for backend tasks.

- Run other relevant tests only if they exist and the change touches them.
- Do not claim that a command passed unless it was actually executed.

## Final response

At the end:

1. Briefly explain what was implemented.
2. List the changed files.
3. List the validation commands and their results.
4. Mention any remaining limitations or assumptions.
