## MBIC Dashboard (CPF Floors)

Marketing & BI Center (MBIC) for CPF Floors built with Next.js 15, TypeScript, shadcn/ui, Tailwind CSS, Recharts, and Supabase.

## Requirements

- Node.js 18+
- npm 9+
- Supabase project with `sales_demo`, `sales_reps_demo`, and `customers_demo` tables
- Environment variables (see below)

## Environment Variables

Copy `.env.local.example` to `.env.local` and populate the values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser access |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key used server-side (profile page) |
| `RETELL_AI_SECRET` | Secret token used to authorise Retell AI webhook calls |
| `OPENAI_API_KEY` | OpenAI key for MBIC agent summaries |

> **Note:** `SUPABASE_SERVICE_ROLE_KEY`, `RETELL_AI_SECRET`, and `OPENAI_API_KEY` are server-only secrets and must never be prefixed with `NEXT_PUBLIC_`.

## Scripts

```bash
npm run dev         # Start local dev server
npm run lint        # Run ESLint with auto-fix
npm run type-check  # Run TypeScript compiler with --noEmit
npm run build       # Production build used by Netlify
npm run start       # Run the compiled production build
```

Before pushing, ensure both lint and type-check succeed so Netlify builds remain healthy:

```bash
npm run lint
npm run type-check
npm run build
```

## Development Notes

- UI tokens are centralised via Tailwind CSS and shadcn/ui. Prefer updating custom tokens through `tailwind.config` or component-level classes instead of mutating third-party theme types.
- Supabase queries live in `lib/supabase/queries.ts` and are shared by page components and API handlers.
- `middleware.ts` protects the Retell AI webhook by enforcing `RETELL_AI_SECRET`.

## Deployment (Netlify)

1. Connect the GitHub repository to Netlify.
2. Set the environment variables listed above in Netlify → Site settings → Environment variables.
3. Build command: `npm run build`
4. Publish directory: `.next`

Every push to `main` will trigger a Netlify deploy.
