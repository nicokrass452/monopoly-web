import { BOARD, PROPERTY_SPACES, START_INDEX, TIMEOUT_INDEX, getSpace, getSpaceByIndex } from "./boardData";
import { CHANCE_CARDS, COMMUNITY_CARDS, getCard } from "./cardData";
import { advanceAuction, createAuction, currentAuctionBidder, isAuctionComplete, validateBid } from "./auction";
import { applyTrade } from "./trade";
import { calculateRent, canBuyImprovement, canSellImprovement } from "./rent";
import { Card, CardDeckName, DeckState, GameState, Player, PlayerSetup, PropertyState, TradeOffer } from "./gameTypes";

export type GameAction =
  | { type: "START_GAME"; players: PlayerSetup[]; startCash: number; randomizeOrder: boolean }
  | { type: "HYDRATE"; state: GameState }
  | { type: "ROLL_DICE"; dice?: [number, number] }
  | { type: "END_TURN" }
  | { type: "BUY_PROPERTY" }
  | { type: "DECLINE_PROPERTY" }
  | { type: "ACK_CARD" }
  | { type: "PAY_TIMEOUT_FINE" }
  | { type: "USE_TIMEOUT_CARD" }
  | { type: "PAY_DEBT" }
  | { type: "DECLARE_BANKRUPTCY" }
  | { type: "MORTGAGE_PROPERTY"; spaceId: string }
  | { type: "UNMORTGAGE_PROPERTY"; spaceId: string }
  | { type: "BUY_IMPROVEMENT"; spaceId: string }
  | { type: "SELL_IMPROVEMENT"; spaceId: string }
  | { type: "AUCTION_BID"; playerId: string; amount: number }
  | { type: "AUCTION_PASS"; playerId: string }
  | { type: "EXECUTE_TRADE"; offer: TradeOffer }
  | { type: "SAVE_NOTE" }
  | { type: "RESET" };

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const createDeck = (cards: Card[]): DeckState => ({
  drawPile: shuffle(cards.map((card) => card.id)),
  discardPile: []
});

export const createInitialState = (): GameState => ({
  phase: "setup",
  players: [],
  currentPlayerIndex: 0,
  properties: Object.fromEntries(
    PROPERTY_SPACES.map((space) => [
      space.id,
      { spaceId: space.id, ownerId: null, mortgaged: false, improvements: 0 } satisfies PropertyState
    ])
  ),
  decks: {
    chance: createDeck(CHANCE_CARDS),
    community: createDeck(COMMUNITY_CARDS)
  },
  pendingAction: null,
  auction: null,
  lastRoll: null,
  lastRollTotal: 0,
  doublesCount: 0,
  hasRolled: false,
  startCash: 1500,
  startSalary: 200,
  log: [],
  winnerId: null
});

export const createNewGame = (setups: PlayerSetup[], startCash = 1500, randomizeOrder = false): GameState => {
  const ordered = randomizeOrder ? shuffle(setups) : setups;
  const players: Player[] = ordered.map((setup, index) => ({
    id: `player-${index + 1}`,
    name: setup.name.trim() || `Player ${index + 1}`,
    color: setup.color,
    token: setup.token,
    cash: startCash,
    position: START_INDEX,
    inTimeout: false,
    timeoutTurns: 0,
    getOutOfTimeoutCards: 0,
    bankrupt: false
  }));

  return {
    ...createInitialState(),
    phase: "playing",
    players,
    startCash,
    log: [`Game started. ${players[0]?.name ?? "Player 1"} takes the first turn.`]
  };
};

const addLog = (state: GameState, entry: string): GameState => ({ ...state, log: [entry, ...state.log].slice(0, 120) });

const updatePlayer = (state: GameState, playerId: string, update: (player: Player) => Player): GameState => ({
  ...state,
  players: state.players.map((player) => (player.id === playerId ? update(player) : player))
});

const currentPlayer = (state: GameState) => state.players[state.currentPlayerIndex];

const activePlayers = (state: GameState) => state.players.filter((player) => !player.bankrupt);

const normalizeCurrentIndex = (state: GameState): GameState => {
  const players = state.players;
  if (activePlayers(state).length <= 1) {
    const winner = activePlayers(state)[0] ?? null;
    return {
      ...state,
      phase: "gameOver",
      winnerId: winner?.id ?? null,
      pendingAction: null,
      auction: null,
      log: [`${winner?.name ?? "Nobody"} wins the city.`, ...state.log]
    };
  }
  let index = state.currentPlayerIndex % players.length;
  while (players[index].bankrupt) {
    index = (index + 1) % players.length;
  }
  return { ...state, currentPlayerIndex: index };
};

const transferCash = (state: GameState, fromId: string | null, toId: string | null, amount: number): GameState => {
  if (amount <= 0) return state;
  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === fromId) return { ...player, cash: player.cash - amount };
      if (player.id === toId) return { ...player, cash: player.cash + amount };
      return player;
    })
  };
};

const requestPayment = (state: GameState, payerId: string, amount: number, creditorId: string | null, reason: string): GameState => {
  const payer = state.players.find((player) => player.id === payerId);
  if (!payer || amount <= 0) return state;
  if (payer.cash >= amount) {
    const creditor = creditorId ? state.players.find((player) => player.id === creditorId) : null;
    return addLog(transferCash(state, payerId, creditorId, amount), `${payer.name} paid ${amount}${creditor ? ` to ${creditor.name}` : " to the bank"} for ${reason}.`);
  }
  return addLog({ ...state, pendingAction: { type: "debt", payerId, amount, creditorId, reason } }, `${payer.name} owes ${amount} for ${reason} and needs to raise funds.`);
};

const sendToTimeout = (state: GameState, playerId: string): GameState => {
  const player = state.players.find((item) => item.id === playerId);
  return addLog(
    updatePlayer(state, playerId, (item) => ({ ...item, position: TIMEOUT_INDEX, inTimeout: true, timeoutTurns: 0 })),
    `${player?.name ?? "Player"} was sent to Timeout.`
  );
};

const drawDeckCard = (state: GameState, deckName: CardDeckName): [GameState, string] => {
  const deck = state.decks[deckName];
  let drawPile = deck.drawPile;
  let discardPile = deck.discardPile;
  if (drawPile.length === 0) {
    drawPile = shuffle(discardPile);
    discardPile = [];
  }
  const [cardId, ...rest] = drawPile;
  return [
    {
      ...state,
      decks: {
        ...state.decks,
        [deckName]: { drawPile: rest, discardPile }
      }
    },
    cardId
  ];
};

const discardCard = (state: GameState, card: Card): GameState => {
  if (card.effect.type === "getOutFree") {
    return state;
  }
  const deck = state.decks[card.deck];
  return {
    ...state,
    decks: {
      ...state.decks,
      [card.deck]: { ...deck, discardPile: [...deck.discardPile, card.id] }
    }
  };
};

const movePlayerTo = (state: GameState, playerId: string, index: number, collectStart = false): GameState => {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return state;
  const passedStart = collectStart && index < player.position && index !== START_INDEX;
  const landedStart = collectStart && index === START_INDEX;
  let next = updatePlayer(state, playerId, (item) => ({
    ...item,
    position: index,
    cash: item.cash + (passedStart || landedStart ? state.startSalary : 0)
  }));
  if (passedStart || landedStart) {
    next = addLog(next, `${player.name} collected ${state.startSalary} from Civic Start.`);
  }
  return handleLanding(next, playerId, getSpaceByIndex(index));
};

const movePlayerBy = (state: GameState, playerId: string, steps: number): GameState => {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return state;
  const rawPosition = player.position + steps;
  const position = ((rawPosition % BOARD.length) + BOARD.length) % BOARD.length;
  const passedStart = steps > 0 && rawPosition >= BOARD.length;
  let next = updatePlayer(state, playerId, (item) => ({
    ...item,
    position,
    cash: item.cash + (passedStart ? state.startSalary : 0)
  }));
  if (passedStart) {
    next = addLog(next, `${player.name} passed Civic Start and collected ${state.startSalary}.`);
  }
  return handleLanding(next, playerId, getSpaceByIndex(position));
};

const applyCardEffect = (state: GameState, playerId: string, card: Card): GameState => {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return state;
  let next = addLog(state, `${player.name} drew "${card.title}": ${card.text}`);
  switch (card.effect.type) {
    case "collect": {
      const { amount } = card.effect;
      next = updatePlayer(next, playerId, (item) => ({ ...item, cash: item.cash + amount }));
      return addLog(discardCard(next, card), `${player.name} collected ${amount}.`);
    }
    case "pay": {
      const { amount } = card.effect;
      return discardCard(requestPayment(next, playerId, amount, null, card.title), card);
    }
    case "collectFromEach": {
      const { amount } = card.effect;
      for (const other of next.players.filter((item) => item.id !== playerId && !item.bankrupt)) {
        next = requestPayment(next, other.id, amount, playerId, card.title);
        if (next.pendingAction) break;
      }
      return discardCard(next, card);
    }
    case "payEach": {
      const { amount } = card.effect;
      const recipients = next.players.filter((item) => item.id !== playerId && !item.bankrupt);
      const total = amount * recipients.length;
      if (player.cash < total) {
        return discardCard(requestPayment(next, playerId, total, null, card.title), card);
      }
      next = {
        ...next,
        players: next.players.map((item) => {
          if (item.id === playerId) return { ...item, cash: item.cash - total };
          if (recipients.some((recipient) => recipient.id === item.id)) return { ...item, cash: item.cash + amount };
          return item;
        })
      };
      return addLog(discardCard(next, card), `${player.name} paid ${amount} to each active player.`);
    }
    case "moveTo":
      return discardCard(movePlayerTo(next, playerId, card.effect.index, card.effect.collectStart), card);
    case "moveBy":
      return discardCard(movePlayerBy(next, playerId, card.effect.steps), card);
    case "goToTimeout":
      return discardCard(sendToTimeout(next, playerId), card);
    case "getOutFree":
      return updatePlayer(next, playerId, (item) => ({ ...item, getOutOfTimeoutCards: item.getOutOfTimeoutCards + 1 }));
    case "repairs": {
      const { perHouse, perHotel } = card.effect;
      const owned = Object.values(next.properties).filter((property) => property.ownerId === playerId);
      const amount = owned.reduce((sum, property) => {
        if (property.improvements === 5) return sum + perHotel;
        return sum + property.improvements * perHouse;
      }, 0);
      return discardCard(requestPayment(next, playerId, amount, null, card.title), card);
    }
  }
};

function handleLanding(state: GameState, playerId: string, space = getSpaceByIndex(state.players.find((player) => player.id === playerId)?.position ?? 0)): GameState {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return state;

  if (space.type === "goToTimeout") {
    return sendToTimeout(state, playerId);
  }

  if (space.type === "tax") {
    return requestPayment(state, playerId, space.taxAmount ?? 0, null, space.name);
  }

  if (space.type === "chance" || space.type === "community") {
    const deckName = space.type === "chance" ? "chance" : "community";
    const [drawnState, cardId] = drawDeckCard(state, deckName);
    const card = getCard(cardId);
    return {
      ...drawnState,
      pendingAction: { type: "card", playerId, deck: deckName, cardId }
    };
  }

  if (space.price !== undefined) {
    const property = state.properties[space.id];
    if (!property.ownerId) {
      return {
        ...state,
        pendingAction: { type: "buyOrAuction", playerId, spaceId: space.id }
      };
    }
    if (property.ownerId !== playerId) {
      const owner = state.players.find((item) => item.id === property.ownerId);
      const rent = calculateRent(state, space);
      return requestPayment(state, playerId, rent, property.ownerId, `rent on ${space.name}${owner ? ` owned by ${owner.name}` : ""}`);
    }
  }

  return addLog(state, `${player.name} landed on ${space.name}.`);
}

const finishAuctionIfNeeded = (state: GameState): GameState => {
  const auction = state.auction;
  if (!auction || !isAuctionComplete(auction)) return state;
  const space = getSpace(auction.spaceId);
  if (!auction.highBidderId) {
    return addLog({ ...state, auction: null, pendingAction: null }, `No bids were placed for ${space.name}. It remains unowned.`);
  }
  const winner = state.players.find((player) => player.id === auction.highBidderId);
  let next = transferCash(state, auction.highBidderId, null, auction.highBid);
  next = {
    ...next,
    auction: null,
    pendingAction: null,
    properties: {
      ...next.properties,
      [auction.spaceId]: { ...next.properties[auction.spaceId], ownerId: auction.highBidderId }
    }
  };
  return addLog(next, `${winner?.name ?? "Highest bidder"} won ${space.name} for ${auction.highBid}.`);
};

const nextTurn = (state: GameState): GameState => {
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[nextIndex].bankrupt) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    hasRolled: false,
    doublesCount: 0,
    lastRoll: null,
    lastRollTotal: 0,
    pendingAction: null
  };
};

const bankruptPlayer = (state: GameState, playerId: string): GameState => {
  const debt = state.pendingAction?.type === "debt" && state.pendingAction.payerId === playerId ? state.pendingAction : null;
  const player = state.players.find((item) => item.id === playerId);
  const creditorId = debt?.creditorId ?? null;
  let next = { ...state };

  next = {
    ...next,
    players: next.players.map((item) => {
      if (item.id === playerId) return { ...item, cash: 0, bankrupt: true, getOutOfTimeoutCards: 0 };
      if (creditorId && item.id === creditorId) return { ...item, cash: item.cash + Math.max(player?.cash ?? 0, 0) };
      return item;
    }),
    properties: Object.fromEntries(
      Object.entries(next.properties).map(([spaceId, property]) => {
        if (property.ownerId !== playerId) return [spaceId, property];
        if (creditorId) {
          return [spaceId, { ...property, ownerId: creditorId, improvements: 0 }];
        }
        return [spaceId, { ...property, ownerId: null, mortgaged: false, improvements: 0 }];
      })
    ),
    pendingAction: null
  };
  next = addLog(next, `${player?.name ?? "Player"} declared bankruptcy${creditorId ? " and transferred assets to the creditor" : " and returned assets to the bank"}.`);
  return normalizeCurrentIndex(next);
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "START_GAME":
      return createNewGame(action.players, action.startCash, action.randomizeOrder);
    case "HYDRATE":
      return action.state;
    case "RESET":
      return createInitialState();
    case "SAVE_NOTE":
      return addLog(state, "Game saved locally.");
    case "ROLL_DICE": {
      if (state.phase !== "playing" || state.pendingAction || state.auction || state.hasRolled) return state;
      const player = currentPlayer(state);
      if (!player || player.bankrupt) return normalizeCurrentIndex(state);
      const dice = action.dice ?? [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)] as [number, number];
      const total = dice[0] + dice[1];
      const isDoubles = dice[0] === dice[1];
      let next: GameState = { ...state, lastRoll: dice, lastRollTotal: total };
      next = addLog(next, `${player.name} rolled ${dice[0]} and ${dice[1]}.`);

      if (player.inTimeout) {
        if (isDoubles) {
          next = updatePlayer(next, player.id, (item) => ({ ...item, inTimeout: false, timeoutTurns: 0 }));
          next = addLog(next, `${player.name} rolled doubles and left Timeout.`);
          next = movePlayerBy(next, player.id, total);
          return { ...next, hasRolled: true, doublesCount: 0 };
        }
        const attempts = player.timeoutTurns + 1;
        if (attempts >= 3) {
          next = requestPayment(next, player.id, 50, null, "Timeout release fine");
          next = updatePlayer(next, player.id, (item) => ({ ...item, inTimeout: false, timeoutTurns: 0 }));
          next = movePlayerBy(next, player.id, total);
          return { ...next, hasRolled: true, doublesCount: 0 };
        }
        next = updatePlayer(next, player.id, (item) => ({ ...item, timeoutTurns: attempts }));
        return addLog({ ...next, hasRolled: true, doublesCount: 0 }, `${player.name} stays in Timeout. Attempt ${attempts} of 3.`);
      }

      const doublesCount = isDoubles ? state.doublesCount + 1 : 0;
      if (doublesCount >= 3) {
        return { ...sendToTimeout(next, player.id), hasRolled: true, doublesCount: 0 };
      }
      next = movePlayerBy(next, player.id, total);
      return { ...next, hasRolled: !isDoubles, doublesCount };
    }
    case "END_TURN": {
      if (state.pendingAction || state.auction || !state.hasRolled || state.phase !== "playing") return state;
      const next = nextTurn(state);
      return addLog(next, `${currentPlayer(next).name}'s turn.`);
    }
    case "BUY_PROPERTY": {
      if (state.pendingAction?.type !== "buyOrAuction") return state;
      const { playerId, spaceId } = state.pendingAction;
      const space = getSpace(spaceId);
      const player = state.players.find((item) => item.id === playerId);
      if (!player || player.cash < (space.price ?? 0)) return addLog(state, "Not enough cash to buy this property.");
      let next = transferCash(state, playerId, null, space.price ?? 0);
      next = {
        ...next,
        properties: { ...next.properties, [spaceId]: { ...next.properties[spaceId], ownerId: playerId } },
        pendingAction: null
      };
      return addLog(next, `${player.name} bought ${space.name} for ${space.price}.`);
    }
    case "DECLINE_PROPERTY": {
      if (state.pendingAction?.type !== "buyOrAuction") return state;
      const auction = createAuction(state, state.pendingAction.spaceId);
      return addLog({ ...state, auction, pendingAction: null }, `Auction started for ${getSpace(auction.spaceId).name}.`);
    }
    case "ACK_CARD": {
      if (state.pendingAction?.type !== "card") return state;
      const { playerId, cardId } = state.pendingAction;
      return { ...applyCardEffect({ ...state, pendingAction: null }, playerId, getCard(cardId)) };
    }
    case "PAY_TIMEOUT_FINE": {
      const player = currentPlayer(state);
      if (!player?.inTimeout || state.pendingAction || player.cash < 50) return state;
      let next = requestPayment(state, player.id, 50, null, "Timeout release fine");
      next = updatePlayer(next, player.id, (item) => ({ ...item, inTimeout: false, timeoutTurns: 0 }));
      return addLog(next, `${player.name} paid to leave Timeout and may roll.`);
    }
    case "USE_TIMEOUT_CARD": {
      const player = currentPlayer(state);
      if (!player?.inTimeout || player.getOutOfTimeoutCards <= 0 || state.pendingAction) return state;
      let next = updatePlayer(state, player.id, (item) => ({
        ...item,
        inTimeout: false,
        timeoutTurns: 0,
        getOutOfTimeoutCards: item.getOutOfTimeoutCards - 1
      }));
      return addLog(next, `${player.name} used a Timeout pass and may roll.`);
    }
    case "PAY_DEBT": {
      if (state.pendingAction?.type !== "debt") return state;
      const debt = state.pendingAction;
      const payer = state.players.find((item) => item.id === debt.payerId);
      if (!payer || payer.cash < debt.amount) return addLog(state, "Debt is still unpaid. Raise funds or declare bankruptcy.");
      return addLog({ ...transferCash(state, debt.payerId, debt.creditorId, debt.amount), pendingAction: null }, `${payer.name} settled the debt.`);
    }
    case "DECLARE_BANKRUPTCY": {
      if (state.pendingAction?.type !== "debt") return state;
      return bankruptPlayer(state, state.pendingAction.payerId);
    }
    case "MORTGAGE_PROPERTY": {
      const property = state.properties[action.spaceId];
      const space = getSpace(action.spaceId);
      if (!property?.ownerId || property.mortgaged || property.improvements > 0) return state;
      const owner = state.players.find((player) => player.id === property.ownerId);
      let next = updatePlayer(state, property.ownerId, (player) => ({ ...player, cash: player.cash + (space.mortgageValue ?? 0) }));
      next = { ...next, properties: { ...next.properties, [action.spaceId]: { ...property, mortgaged: true } } };
      return addLog(next, `${owner?.name ?? "Owner"} mortgaged ${space.name}.`);
    }
    case "UNMORTGAGE_PROPERTY": {
      const property = state.properties[action.spaceId];
      const space = getSpace(action.spaceId);
      const cost = Math.ceil((space.mortgageValue ?? 0) * 1.1);
      const owner = state.players.find((player) => player.id === property?.ownerId);
      if (!property?.ownerId || !property.mortgaged || !owner || owner.cash < cost) return state;
      let next = transferCash(state, owner.id, null, cost);
      next = { ...next, properties: { ...next.properties, [action.spaceId]: { ...property, mortgaged: false } } };
      return addLog(next, `${owner.name} unmortgaged ${space.name} for ${cost}.`);
    }
    case "BUY_IMPROVEMENT": {
      const space = getSpace(action.spaceId);
      const player = currentPlayer(state);
      const error = canBuyImprovement(state, player.id, space);
      if (error) return addLog(state, error);
      let next = transferCash(state, player.id, null, space.buildingCost ?? 0);
      next = {
        ...next,
        properties: {
          ...next.properties,
          [space.id]: { ...next.properties[space.id], improvements: next.properties[space.id].improvements + 1 }
        }
      };
      return addLog(next, `${player.name} added an improvement to ${space.name}.`);
    }
    case "SELL_IMPROVEMENT": {
      const space = getSpace(action.spaceId);
      const property = state.properties[space.id];
      const player = currentPlayer(state);
      const error = canSellImprovement(state, player.id, space);
      if (error) return addLog(state, error);
      let next = updatePlayer(state, player.id, (item) => ({ ...item, cash: item.cash + Math.floor((space.buildingCost ?? 0) / 2) }));
      next = {
        ...next,
        properties: {
          ...next.properties,
          [space.id]: { ...property, improvements: property.improvements - 1 }
        }
      };
      return addLog(next, `${player.name} sold an improvement from ${space.name}.`);
    }
    case "AUCTION_BID": {
      if (!state.auction) return state;
      const error = validateBid(state, state.auction, action.playerId, action.amount);
      if (error) return addLog(state, error);
      const bidder = state.players.find((player) => player.id === action.playerId);
      const auction = advanceAuction({
        ...state.auction,
        highBid: action.amount,
        highBidderId: action.playerId
      });
      return addLog(finishAuctionIfNeeded({ ...state, auction }), `${bidder?.name ?? "Bidder"} bid ${action.amount}.`);
    }
    case "AUCTION_PASS": {
      if (!state.auction || currentAuctionBidder(state.auction) !== action.playerId) return state;
      const bidder = state.players.find((player) => player.id === action.playerId);
      const auction = advanceAuction({
        ...state.auction,
        passedPlayerIds: [...new Set([...state.auction.passedPlayerIds, action.playerId])]
      });
      return addLog(finishAuctionIfNeeded({ ...state, auction }), `${bidder?.name ?? "Bidder"} passed.`);
    }
    case "EXECUTE_TRADE":
      if (state.pendingAction || state.auction) return addLog(state, "Resolve the current action before trading.");
      return applyTrade(state, action.offer);
    default:
      return state;
  }
};
