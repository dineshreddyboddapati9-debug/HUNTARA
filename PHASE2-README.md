# HUNTARA — Phase 2 file bundle

These files are meant to be copied INTO the project that `npx create-next-app@latest .`
already generated in your cloned HUNTARA repo. Do not just drop this whole folder in as-is —
merge it:

1. Run `npx create-next-app@latest .` first, inside your cloned repo (see the chat instructions).
2. Copy every file from this bundle into the matching path in your repo, overwriting
   `app/layout.tsx` and `app/page.tsx` (create-next-app generates default versions of both —
   yours should replace them).
3. Do NOT copy `.env.example` values as-is — it has no real secrets in it by design. Create your
   own `.env.local` (not committed to Git) with your real Supabase values.
4. Everything else (`package.json`, `tailwind` config, `next.config.ts`, `.gitignore`) should stay
   exactly as create-next-app generated it — don't overwrite those with anything from here.

Folder layout in this bundle:

```
app/
  layout.tsx
  page.tsx
  jobs/page.tsx
  companies/page.tsx
  remote-jobs/page.tsx
  about/page.tsx
  contact/page.tsx
  privacy-policy/page.tsx
  terms/page.tsx
  cookie-policy/page.tsx
  disclaimer/page.tsx
components/
  layout/Header.tsx
  layout/Footer.tsx
.env.example
```
