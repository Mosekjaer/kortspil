# Bidrag

Tak fordi du vil hjælpe. Kort om hvordan projektet er skruet sammen.

## Regler for koden

- **Spillogik ligger kun i `packages/core`.** Aldrig i React-komponenter eller i serverens event-handlere.
- **Spilmoduler er rene funktioner:** ingen I/O, ingen `Date.now()`, ingen `Math.random()`. Tilfældighed kommer kun fra det `Rng`, der sendes ind. State er immutabel og kan serialiseres som JSON.
- **`view` lækker aldrig skjult information** (bunkens rækkefølge, uvendte kort).
- **Tests skrives sammen med spillogikken** (Vitest, seedet rng).
- **Al tekst i brugerfladen er på dansk** og ligger i `apps/web/src/i18n/da.ts`. Kode, kommentarer og commit-beskeder er på engelsk.
- **Ingen nye afhængigheder, database, login eller eksterne tjenester** uden en konkret begrundelse i PR'en.

## Et nyt spil

1. Lav `packages/core/src/games/<spil>/` med `types.ts` og `rules.ts`, der implementerer `GameDefinition`.
2. Registrér det i `engine/registry.ts` og tilføj Zod-skemaer i `protocol/schemas.ts` (`GAME_SCHEMAS`).
3. Skriv tests i `packages/core/test/`.
4. Byg UI'et i `apps/web/src/games/<spil>/` og registrér det i `games/registry.ts`.

## Før du åbner en PR

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

Commit-beskeder: `<type>: <kort beskrivelse>` i bydeform, fx `feat: add horse race rules`. Typer: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
