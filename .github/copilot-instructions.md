# Copilot code review instructions

TeamLab frontend: React 19, TypeScript, Vite, Feature-Sliced Design (`app → pages → widgets → features → entities → shared`, enforced by `steiger.config.ts`). Redux Toolkit + `redux-persist` (persists the `auth` slice to `localStorage`) for client state, TanStack Query 5 (`useQuery`/`useInfiniteQuery`/`useMutation`) for server state, CSS Modules for styling. The HTTP client is a hand-written `fetch` wrapper in `src/shared/api/api.class.ts` (`axios` is a declared but unused dependency).

Review in this priority order. Spend most effort on 1-3.

The categories and code snippets below illustrate the _kind_ of problem to look for in each priority, they are not an exhaustive checklist. Use judgment to flag other issues of the same nature even if the exact pattern isn't shown here.

Do not comment on formatting, whitespace, import order, or quote style — ESLint/Prettier/`lint-staged` already enforce these.

## 1. Security

Look for any point where untrusted data — user input, URL/query params, API or third-party responses, `postMessage` payloads, uploaded files — reaches the DOM, storage, navigation, or code execution without validation or sanitization. Also check that authorization is actually enforced server-side rather than just hidden in the UI, and that sensitive data isn't exposed to storage or channels an attacker's script could read.

For example, rendering unsanitized content as raw HTML is a classic XSS vector:

```tsx
<div dangerouslySetInnerHTML={{ __html: comment.text }} />
```

The same underlying risk — trusting data that shouldn't be trusted — can show up in many other shapes: a `postMessage` handler that skips `event.origin`, a redirect built from a raw query param, `eval`/`new Function`/`JSON.parse` on unvalidated input, tokens or PII pushed into `localStorage`/`sessionStorage` (note: only `auth` is currently whitelisted for persistence in `src/app/store/index.ts`, so treat any widening or new sensitive storage there as worth a closer look), or a protected page/action that only checks permissions in `ProtectedRoute.tsx` without a backing server-side check.

## 2. Critical runtime bugs

Look for anything that could make the app hang, loop forever, leak memory/resources over time, or crash from an unhandled failure. This is broader than any single pattern — think about effect/hook dependencies, cleanup of anything long-lived, async work racing against component lifecycle or itself, unbounded recursion, and unhandled rejections.

For example, an effect that reads a value it doesn't declare as a dependency can re-run in ways that are hard to predict, and one that subscribes to something without cleaning up will leak on every mount:

```tsx
useEffect(() => {
  window.addEventListener('resize', onResize);
}, []); // no cleanup — listener piles up on every remount
```

Apply the same reasoning elsewhere: a fetch that isn't cancelled or guarded when the component unmounts or inputs change quickly (so a slower, stale response can clobber a newer one), a recursive function or component tree with no clear base case, or an API call with no error handling that could leave the UI stuck or crash the app.

## 3. Obvious logic errors

Look for places where the code's behavior clearly doesn't match what it's evidently trying to do — inverted or off-by-one conditions, unguarded access that can throw, values from a stale closure, or state changed in a way the surrounding architecture doesn't expect.

For example, dereferencing a value that isn't guaranteed to exist is a crash waiting to happen:

```tsx
return user.profile.avatarUrl;
```

Apply the same scrutiny anywhere values are dereferenced, compared, or updated without matching the assumptions the rest of the code relies on — including mutating Redux state directly outside a `createSlice` reducer, using a selector that doesn't match the actual state shape, or an RTK Query cache tag that doesn't invalidate what it should.

## 4. Architecture (Feature-Sliced Design)

Check that changed code respects FSD layering and slice boundaries in spirit, not just the specific examples below: layers should only depend on `app → pages → widgets → features → entities → shared` from left to right, slices shouldn't reach into a sibling's internals, and a slice's public surface should be its `index.ts`. Use judgment for cases that don't fit these examples exactly but still break the intent of the architecture (e.g. new code dropped into `shared`/`app` because it was convenient, not because it belongs there).

## 5. Lower priority

Use judgment on type safety, duplication, styling consistency, and dependencies — raise them when they create real risk, confusion, or maintenance cost, not merely because they deviate from a preference (e.g. `any` that hides a real bug is worth flagging; `any` that's harmless boilerplate typing usually isn't).

## Review conduct

Reference the exact file and line; explain why it's a problem.

Show a corrected code snippet instead of only describing the fix.

Group repeated occurrences of the same issue into one comment instead of repeating it for every instance.

## What not to flag

Do not comment on formatting, whitespace, import order, or quote style.

Do not request naming/style changes unless they cause real confusion or a bug.

Do not suggest new state-management, styling, or testing libraries.

Do not request changes to `AGENTS.md`, CI, or build configuration unless the PR touches them.
