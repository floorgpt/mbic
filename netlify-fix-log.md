# Netlify Fix Log

## Attempt 1 – `fix(app-router): align Page props with Next PageProps; normalize searchParams`
- Imported `PageProps` from Next for both dashboard and sales routes.
- Normalized `searchParams` by detecting promise-like values and awaiting when necessary.
- Goal: satisfy Next’s App Router expectation that `searchParams` may be a Promise.

## Attempt 2 – `fix(app): remove invalid PageProps import; normalize searchParams`
- Netlify still reported a type mismatch, so the `PageProps` import was removed.
- Switched to a custom props type union (`DashboardSearchParams | Promise<…>`), normalizing via `await` inside the component.
- RPC wiring remained unchanged; focus was solely on prop typing.

## Attempt 3 – `fix(app): enforce promise-based searchParams handling`
- Latest Netlify error indicated any synchronous member in the union violates the internal `PageProps` constraint.
- Updated dashboard and sales routes to accept only `Promise<…>` (or `undefined`) for `searchParams`; immediately awaited the promise to obtain the object.
- This change keeps date-range handling intact while complying with Next’s type requirement.

## Status
- Each attempt progressively narrowed the typing to match Next’s expectations.
- Current HEAD (`844cf59`) enforces promise-only `searchParams`; awaiting Netlify confirmation that the type check now passes.
