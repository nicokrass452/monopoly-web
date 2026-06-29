# City Estates

City Estates is an original browser-based property trading board game with city-themed streets, auctions, trades, rent, cards, improvements, debt, and bankruptcy.

## Setup

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm test
```

## Gameplay

- Supports 2 to 4 local players with custom names, colors, tokens, starting cash, and optional randomized turn order.
- The board has 40 original city-themed spaces: Civic Start, streets, transit hubs, utilities, taxes, Chance-style cards, Community-style cards, Timeout, Go To Timeout, and Rest Stop Plaza.
- Players roll two dice, collect salary when passing Civic Start, buy unowned spaces, pay rent, draw cards, trade, auction declined properties, mortgage assets, build lofts/towers, and handle bankruptcy.
- Timeout can be left by paying $50, using a Timeout pass card, or rolling doubles. After three failed attempts, the player must pay and leave.
- Lofts and towers must be built and sold evenly across complete color groups.
- Game state is saved to `localStorage` after each state change and can be manually saved, loaded, reset, or replaced with a new game.

## Architecture

- `src/logic/gameTypes.ts` contains the core TypeScript model.
- `src/logic/boardData.ts` defines the 40-space board.
- `src/logic/cardData.ts` defines the two original 16-card decks.
- `src/logic/gameReducer.ts` owns turn flow, movement, cards, debt, auctions, bankruptcy, and persistence-ready state transitions.
- `src/logic/rent.ts`, `auction.ts`, and `trade.ts` contain focused rule helpers.
- `src/App.tsx` renders setup, board, player status, action prompts, modals, auctions, trades, rules, and log.

The reducer is kept deterministic when test dice are supplied, which makes Vitest coverage straightforward for movement, doubles, cards, rent, and bankruptcy.
