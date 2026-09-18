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

- Run the existing frontend lint command.
- Run the existing frontend build command.
- Run relevant tests if they exist.
- Do not claim that a command passed unless it was actually executed.

## Final response

At the end:

1. Briefly explain what was implemented.
2. List the changed files.
3. List the validation commands and their results.
4. Mention any remaining limitations or assumptions.
