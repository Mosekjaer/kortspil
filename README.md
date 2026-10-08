# Fredagsbar Kortspil

Kort- og drikkespil fra fredagsbaren som mobil web-app (PWA). Spil på én telefon, der går på omgang, eller på flere telefoner i et fælles rum med QR-kode. Begge tilstande bruger den samme spilmotor.

- **Én telefon:** al logik kører i browseren. Ingen server, ingen login, virker offline, når appen er indlæst én gang.
- **Flere telefoner:** værten opretter et rum (kode + QR), de andre joiner fra egen telefon. Serveren styrer spillet og sender hver spiller kun det, de må se.
- **Gæster:** værten kan tilføje spillere uden telefon og spille deres tur.

Spil i v1: **Ring of Fire** og **Bussen**. Al tekst i appen er på dansk.

## Struktur

```
packages/core   Spilmotor, kort, regler og netværksprotokol (ren TypeScript, ingen UI)
apps/web        Vite + React + Tailwind PWA
apps/server     Fastify + Socket.IO; serverer også det byggede frontend
```

Spillogik ligger kun i `packages/core` og køres enten af browseren (én telefon) eller af serveren (rum).

## Lokal udvikling

Kræver Node 24 og pnpm 11.

```bash
pnpm install
pnpm dev
```

`pnpm dev` starter Vite på http://localhost:5173 og serveren på port 3000. Vite proxyer `/socket.io` til serveren. Telefoner på samme net kan åbne Vite's netværksadresse.

```bash
pnpm test          # Vitest i alle pakker
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm typecheck
pnpm build
```

## Kør det selv

### 1. Med det færdige image

```bash
cp .env.example .env    # sæt IMAGE og PUBLIC_URL
docker compose up -d
```

### 2. Byg selv fra kildekoden

```bash
docker build -t kortspil .
docker run -d -p 3000:3000 -e PUBLIC_URL=https://kort.example.dk kortspil
```

### Miljøvariabler

| Variabel     | Eksempel                  | Formål                                  |
| ------------ | ------------------------- | --------------------------------------- |
| `PORT`       | `3000`                    | Port serveren lytter på                 |
| `NODE_ENV`   | `production`              | Produktionstilstand                     |
| `PUBLIC_URL` | `https://kort.example.dk` | Bruges i QR-koder og join-links         |
| `LOG_LEVEL`  | `info`                    | Logniveau (`warn`, `info`, `debug` ...) |

Uden `PUBLIC_URL` bygges join-links ud fra den adresse, telefonen brugte.

### Endpoints

- `GET /healthz` svarer `200 ok` (health check).
- Ukendte stier (fx `/r/ABCD`) returnerer `index.html`.
- Hashede filer caches i et år (`immutable`); `index.html`, `sw.js` og manifest har `no-cache`.

## Deploy på Coolify

1. Opret en **Docker Compose**-ressource med `docker-compose.yml` fra repoet.
2. Sæt `IMAGE=ghcr.io/<owner>/<repo>:main` og `PUBLIC_URL` til dit domæne.
3. Port 3000, health check på `/healthz`, domæne = `PUBLIC_URL`.
4. Kopiér ressourcens deploy-webhook og et API-token til GitHub secrets `COOLIFY_WEBHOOK` og `COOLIFY_TOKEN`.

GHCR-pakken skal være **public**, så Coolify kan hente uden login: GitHub → Packages → pakken → Package settings → Change visibility.

**Rollback:** sæt image-tagget i Coolify til en tidligere `sha-…` og redeploy.

## Cloudflare

Serveren kører bag Cloudflare, som lukker inaktive forbindelser efter cirka 100 sekunder. Socket.IO pinger hvert 25. sekund (timeout 20 s), og klienten genforbinder og går automatisk ind i rummet igen.

- **SSL/TLS:** Full (strict). Ikke Flexible.
- **Network → WebSockets:** On.
- **Cache rule:** Bypass for `/socket.io/*`.
- **Rocket Loader:** Off.
- Hvis Coolifys Let's Encrypt fejler bag proxyen: brug et Cloudflare Origin Certificate.

### Kun én instans

Rum ligger i serverens hukommelse. Kør derfor kun én container. Flere instanser kræver sticky sessions og en Socket.IO-adapter (fx Redis), og det er ikke bygget.

### Manuel driftstest efter første deploy

1. Opret et rum med to telefoner.
2. Lad begge ligge stille i 5 minutter. Forbindelsen skal være intakt.
3. Lås skærmen på den ene i 2 minutter og lås op. Spilleren skal være tilbage på sin plads med korrekt visning.
4. Skift fra WiFi til mobildata midt i et spil. Samme forventning.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

| Hændelse                      | Resultat                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Pull request (også fra forks) | Lint, typecheck, tests og Docker-build uden push. Ingen secrets, intet deploy |
| Push til `main`               | Samme checks, push af `:main` og `:sha-<kort sha>` til GHCR, Coolify-webhook  |
| Tag `v*` (fx `v1.2.0`)        | Multi-arch image (amd64 + arm64): `:1.2.0`, `:1.2` og `:latest`               |

`main` bygges kun til serverens arkitektur (`linux/amd64`, kan ændres med repo-variablen `SERVER_PLATFORM`).

## Licens

MIT. Se [LICENSE](LICENSE). Skrifterne Anton og Inter Tight er under SIL Open Font License, ikonerne fra Tabler under MIT.
