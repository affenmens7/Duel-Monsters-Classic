# Duell Monsters Classic

## Project Overview
YuGiOh fan-made card game (web-based). DM era through early GX. No Synchro/XYZ/Pendulum/Link.

## Tech Stack
- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: Express + TypeScript (port 3001, in `server/`)
- **Database**: PostgreSQL 16 (Docker container `dmc-postgres`, port 5432)
- **Card Data**: Downloaded from YGOPRODeck API, stored in own DB
- **Card Images**: Local files in `public/images/cards/` (gitignored, ~45MB)
- **Pack Artworks**: Local files in `public/images/sets/` (gitignored, ~60MB)

## How to Start Development
```bash
# 1. Start PostgreSQL (Docker muss laufen)
sudo service docker start
docker compose up -d

# 2. Start Backend
cd server && npx tsx src/index.ts

# 3. Start Frontend (neues Terminal)
npm run dev

# 4. Einmalig: Karten importieren (falls DB leer)
cd server && npx tsx src/db/import-cards.ts
```

## Project Structure
```
/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── cardBrowser/          # Karten-Browser Komponenten
│   │   ├── common/               # FloatingCards, Modal, Roadmap, ScrollReveal, Settings
│   │   └── layout/               # AppLayout, Header, NavBar, Footer
│   ├── pages/                    # TitleScreen, HomePage, CardBrowser, Deckbuilder, StarterChoice
│   ├── config/                   # news.ts, roadmap.ts, sets.ts, themes.ts, version.ts
│   ├── hooks/                    # useCards, useCardLocale, useScrollReveal
│   ├── i18n/                     # de.ts, en.ts (Deutsch/Englisch)
│   ├── services/                 # authApi, cardApi, deckApi
│   ├── store/                    # AuthContext, ThemeContext, CardContext
│   ├── styles/
│   │   ├── global.css            # NUR Resets + Base-Defaults
│   │   └── themes/orichalcos-gold/variables.css  # Theme CSS Variablen
│   ├── routes/index.tsx          # React Router Konfiguration
│   └── types/card.ts             # TypeScript Interfaces
├── server/                       # Backend (Express)
│   └── src/
│       ├── config/               # db.ts, env.ts, starterDecks.ts
│       ├── db/                   # migrate.ts, import-cards.ts
│       ├── middleware/           # auth.ts (JWT)
│       ├── routes/               # auth.ts, cards.ts, user.ts, decks.ts
│       └── services/             # authService.ts, emailService.ts
├── public/images/                # Karten- und Set-Bilder (gitignored)
├── docker-compose.yml            # PostgreSQL Container
└── .env                          # Secrets (gitignored)
```

## Design Rules
- Theme: **Orichalcos + Millennium Gold Mix** (dark, teal #00dca8, gold #c8a830)
- Fonts: Cinzel Decorative (logo), Cinzel (headings), Cormorant Garamond (body)
- CSS: global.css ONLY for resets. Every component gets its own `.module.css`
- Language: Bilingual DE/EN via i18n. Cards show German or English based on setting
- No emojis in code or UI unless user requests it

## Test Accounts
| Account | Password | Role | DP |
|---------|----------|------|-----|
| admin | admin123 | admin | 9999 |

## DB Connection
```
Host: localhost
Port: 5432
User: dmc_user
Password: (see .env → DB_PASSWORD)
Database: dmc
```

## Active Wave System
Sets are managed via `card_sets` table with `wave` and `active` flags.
Currently active: Wave 1 (Starter Decks, LOB, MRD, SRL, PSV, LON, LOD, DCR)

## Email
Gmail SMTP via `duel.masters.classic@gmail.com`. App-Password in .env.
Sends: Welcome email + Verification email (5s delay between them to avoid spam)

## Current Status (v0.0.1)
### Done
- TitleScreen (login/register/guest with floating cards background)
- HomePage (news, card database banner, shop banner, deckbuilder banner, roadmap, changelog, community, server status)
- Card Browser (search, type filter, set filter, availability filter, card detail popup)
- Deckbuilder (drag & drop, click-to-add, auto-save, main deck 40 + extra deck 15)
- Starter Deck Choice (Yugi or Kaiba after first login)
- Auth (JWT, bcrypt, rate limiting, helmet)
- Email service (welcome + verification)
- i18n (DE/EN)
- Theme system (CSS-based, expandable)
- 1719 cards imported, 318 available (active sets)
- 20 pack artworks downloaded

### Next Steps (Priority Order)
1. Deckbuilder: nur eigene Karten anzeigen (aus Inventar)
2. Shop: Booster kaufen, Pack-Opening, DP abziehen
3. Admin UI: News/Roadmap/Sets verwalten
4. Starter Deck Auswahl bugfrei machen
5. Discord OAuth (spaeter, wenn Domain vorhanden)
6. VPS Deployment
7. Duel Engine (srvpro Integration)

## Important Conventions
- German in UI, English in code (variable names, comments)
- Commit messages in English
- Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
- Never commit .env, card images, or set images
- All API endpoints under /api/
- Security: parameterized queries, input validation, JWT auth, rate limiting
