# CLAUDE.md – Fredagsbar Kortspil

Mobil PWA med fredagsbarens kort- og drikkespil. Én telefon (lokal motor) eller flere telefoner i et rum (server-autoritativ motor).

Spec (Claude Docs): https://claude.ai/artifact/VoLP3EBmo54X6RxbZ7ecHm — læs via Claude Docs-connectoren, ikke web-fetch.

## Projektstyring

Lokale instruktioner (Kaneo-board m.m.) ligger i `CLAUDE.local.md`, som ikke er i git.

## Arbejdsregler (fra spec afsnit 14)

- Byg i faserne fra spec: Fundament → Én telefon → Flere telefoner → Bussen → PWA og deploy. Status i `tasks/todo.md`.
- Tech stack er fast (spec afsnit 3). Ingen nye biblioteker, database, login eller eksterne tjenester uden at spørge.
- Spillogik kun i `packages/core` — aldrig i React-komponenter eller serverens event-handlere.
- Spilmoduler er rene: ingen I/O, `Date.now()` eller `Math.random()`; tilfældighed kun via injiceret `Rng`. Immutabel, JSON-serialiserbar state. `view` lækker aldrig skjult information.
- Tests skrives sammen med spillogikken (Vitest, seedet rng).
- Al UI-tekst på dansk, samlet i `apps/web/src/i18n/da.ts`. Kode, kommentarer og commits på engelsk.
- Uklar eller modstridende regel → spørg, opfind ikke en variant.

## Design

- **Alt designarbejde går gennem `/taste`-skillen**: nye skærme, komponenter, redesign, farver, typografi, animationer og "få det til at se godt ud". Indlæs skillen før første designbeslutning, også ved små visuelle ændringer.
- Design-tokens ligger i `apps/web/src/index.css` (`@theme` + `:root`) med kildehenvisning til design-collection pr. token. Komponenter bruger tokens (`bg-ink`, `bg-raise`, `text-paper`, `text-muted`, `bg-accent`, `font-display`, `--ease-house`), aldrig rå farver.
- Referencer: dont-board-me (typografi), siena-film-foundation (farve), terminal-industries (bevægelse). Pole: toy. Én accent (`--color-accent`). Ét mørkt tema med vilje (spec + mørk bar).
- Anton-overskrifter: `.display` har målt top-luft til Å/Ø. Sæt aldrig `overflow: hidden` eller lavere `line-height` på display-tekst uden at måle glyf-højderne igen.
- Ikoner: kun Tabler (MIT) kopieret ordret i `components/Icon.tsx`. Skrifter selvhostes i `apps/web/public/fonts/`.
- Verificér visuelt i browseren ved 375 px bredde, før designarbejde meldes færdigt.

## Kommandoer

```bash
pnpm install
pnpm dev         # Vite (5173) + server (3000)
pnpm test        # alle Vitest-suites
pnpm build       # bygger alle pakker
pnpm typecheck
pnpm lint
pnpm format:check
```

## Noter

- TypeScript 6.0, ikke 7.x: typescript-eslint understøtter kun `<6.1`.
- Core bruger `module: NodeNext` → relative imports skal have `.js`-endelse.
- Server-dev kører på port 3000 uanset `PORT` (preview-værktøjet sætter `PORT=5173`); brug `SERVER_PORT` for at ændre.
- To "telefoner" i browseren: brug `localhost:5173` og `127.0.0.1:5173` (adskilt localStorage, så tokens ikke kolliderer).
- Docker: `docker build -t kortspil:local .` og `docker run -p 3000:3000 kortspil:local`.
