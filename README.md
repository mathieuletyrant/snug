<div align="center">

<img src="apps/web/public/icon.svg" width="96" alt="Snug" />

# Snug

**A cozy, self-hosted tracker for the TV series you're watching.**
Where you are (S02E05), what's next, what airs soon. One tap to mark an episode watched.

[![Image](https://img.shields.io/badge/ghcr.io-mathieuletyrant%2Fsnug-f0a35e?logo=docker&logoColor=white)](https://github.com/mathieuletyrant/snug/pkgs/container/snug)
![Bun](https://img.shields.io/badge/Bun-1.4-f6ecdf?logo=bun&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)

<img src="docs/screenshots/home.png" alt="Home: ready to watch and upcoming series" />

</div>

## ✨ Features

- 🛋️ **Home that matters**: *Ready to watch* (next episode is out) and *Upcoming* (caught up, next air date). One tap ✓ marks the next episode, with undo.
- 📺 **Per-episode progress**: Watchlist, Watching, Paused, Completed, Dropped. Series come back to *Watching* on their own when you resume them or a new season airs.
- 🪼 **Jellyfin webhook**: finished or "mark played" episodes are tracked automatically, unknown series are added. Full webhook history with raw payloads.
- 📥 **Import** your history from a JSON export, with live progress while series details are fetched.
- 🌍 **Your language**: descriptions, episode titles and posters from TMDB in French, Spanish, German…, falling back to English.
- 📱 **PWA**: installable, works offline for what you've already seen, mobile-first.
- 🔐 **Accounts**: email + password, the first account is admin, sign-up closed afterwards.
- ⚡ **Fast**: Bun + SQLite, TMDB images cached on disk, home served in ~20 ms for 190 series.

<table>
  <tr>
    <td width="68%"><img src="docs/screenshots/series.png" alt="Series page" /></td>
    <td width="32%"><img src="docs/screenshots/mobile.png" alt="Mobile home" /></td>
  </tr>
</table>

## 🚀 Run it

```sh
docker run -d --name snug -p 3000:3000 -v ./data:/data \
  -e SNUG_ORIGINS=http://localhost:3000 \
  ghcr.io/mathieuletyrant/snug:latest
```

Open http://localhost:3000, create the admin account, paste a [TMDB key](https://www.themoviedb.org/settings/api) (v3 API key or v4 read access token) and pick a language.

| Env | Default | |
|---|---|---|
| `SNUG_ORIGINS` | – | Comma-separated URLs you open Snug with (LAN name, IP, Tailscale…) |
| `DATA_DIR` | `/data` | SQLite database, image cache, generated auth secret |
| `BETTER_AUTH_SECRET` | generated in `DATA_DIR/secret` | |
| `PORT` | `3000` | |

The image is multi-arch (amd64 / arm64), tagged `latest`, `x.y` and `x.y.z`.

## 🪼 Jellyfin

1. Install the **Webhook** plugin (Dashboard → Plugins → Catalog) and restart Jellyfin.
2. Add a **Generic Destination** with your webhook URL from Snug → Settings → Jellyfin.
3. Tick **Playback Stop** and **User Data Saved**, select your user, tick **Send All Properties**.

> [!TIP]
> The URL must be reachable **from Jellyfin's container**: use Snug's LAN address or `host.docker.internal`, not `localhost`.

## 🛠️ Develop

```sh
bun install
bun run dev          # API on :3000, web on http://localhost:5173 (shares ./data with Docker)
bun test
bun run typecheck
docker compose up --build   # production build locally on :3000
```

After a schema change: `cd apps/server && bun run db:generate` (migrations run at startup).

```
apps/server      Bun · Hono · Drizzle (SQLite) · better-auth
  src/modules/<module>/{domain,application,infrastructure,http}
    catalog      Series & Episodes from TMDB (cached, refreshed daily)
    tracking     TrackedSeries aggregate: Status, Watches, Progress
    identity     accounts, sessions, preferences, webhook tokens
    jellyfin     webhook → Watches, history
    import       JSON export → TrackedSeries
apps/web         React 19 · Vite · Tailwind 4 · TanStack Query, PWA
packages/shared  API contract types
```

### 📦 Releases

Fully automatic, driven by [Conventional Commits](https://www.conventionalcommits.org) (`feat:` → minor, `fix:` → patch):

1. Every push to `main` opens or updates a **release PR** with the next version and the CHANGELOG.
2. Merging it creates the tag and GitHub release, then builds and publishes the Docker image.

📖 Vocabulary: [GLOSSARY.md](GLOSSARY.md) · 🧭 Decisions: [docs/adr](docs/adr)
