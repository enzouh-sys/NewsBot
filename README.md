# NewsBot

Bot Discord Node.js/TypeScript qui publie un digest quotidien (OM, IA/Tech, Gaming).

## Prerequis

- Node.js 20+
- Une application Discord avec bot token

## Installation

```bash
npm install
```

Copier `.env.example` vers `.env` et remplir:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_CHANNEL_ID`
- `TIMEZONE` (ex: `Europe/Paris`)
- `STRICT_MODE` (`true` ou `false`)

## Invitation du bot

Invite le bot avec les scopes OAuth2:

- `bot`
- `applications.commands`

## Scripts

- `npm run dev` : lance le bot en dev
- `npm run build` : compile TypeScript
- `npm run start` : lance le build
- `npm run register:commands` : enregistre les slash commands en mode GUILD (`DISCORD_CLIENT_ID` + `DISCORD_GUILD_ID`)
- `npm run lint` : lint
- `npm run format` : formatage

## Commandes dispo

- `/ping` -> `pong`
- `/digest` -> envoie le digest dans `DISCORD_CHANNEL_ID`
  - option `category` : `om | ai_tech | gaming | all`
  - option `limit` : nombre max par section

## Cron

Le digest quotidien est planifie a `09:00` avec timezone `Europe/Paris` (ou valeur `TIMEZONE`).

## Feeds RSS

Le fichier `feeds.json` contient 3 sections fixes:

- `om`
- `ai_tech`
- `gaming`

Chaque section contient des URLs RSS d'exemple. Tu peux tout remplacer.
Si une source ne propose pas de RSS, ne pas inventer d'URL: remplace-la par une source avec flux RSS valide.

## STRICT_MODE

Quand `STRICT_MODE=true`, le bot filtre les items par allowlist de domaines par section (`om`, `ai_tech`, `gaming`) pour reduire les rumeurs/sources douteuses.

## Robustesse RSS

- Timeout RSS: `8000ms`
- `try/catch` par feed
- retry limite par feed
