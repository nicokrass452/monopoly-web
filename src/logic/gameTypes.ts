export type SpaceType =
  | "start"
  | "property"
  | "transit"
  | "utility"
  | "tax"
  | "chance"
  | "community"
  | "timeout"
  | "goToTimeout"
  | "rest";

export type PropertyKind = "street" | "transit" | "utility";

export interface RentTable {
  base: number;
  colorSet: number;
  improvements: [number, number, number, number, number];
}

export interface BoardSpace {
  id: string;
  index: number;
  name: string;
  type: SpaceType;
  group?: string;
  color?: string;
  price?: number;
  mortgageValue?: number;
  buildingCost?: number;
  rent?: RentTable;
  taxAmount?: number;
  propertyKind?: PropertyKind;
}

export interface PropertyState {
  spaceId: string;
  ownerId: string | null;
  mortgaged: boolean;
  improvements: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  token: string;
  cash: number;
  position: number;
  inTimeout: boolean;
  timeoutTurns: number;
  getOutOfTimeoutCards: number;
  bankrupt: boolean;
}

export type CardDeckName = "chance" | "community";

export type CardEffect =
  | { type: "collect"; amount: number }
  | { type: "pay"; amount: number }
  | { type: "collectFromEach"; amount: number }
  | { type: "payEach"; amount: number }
  | { type: "moveTo"; index: number; collectStart?: boolean }
  | { type: "moveBy"; steps: number }
  | { type: "goToTimeout" }
  | { type: "getOutFree" }
  | { type: "repairs"; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  deck: CardDeckName;
  title: string;
  text: string;
  effect: CardEffect;
}

export interface DeckState {
  drawPile: string[];
  discardPile: string[];
}

export interface PendingBuy {
  type: "buyOrAuction";
  playerId: string;
  spaceId: string;
}

export interface PendingDebt {
  type: "debt";
  payerId: string;
  amount: number;
  creditorId: string | null;
  reason: string;
}

export interface PendingCard {
  type: "card";
  playerId: string;
  deck: CardDeckName;
  cardId: string;
}

export type PendingAction = PendingBuy | PendingDebt | PendingCard | null;

export interface AuctionState {
  spaceId: string;
  activePlayerIds: string[];
  currentBidderIndex: number;
  highBid: number;
  highBidderId: string | null;
  passedPlayerIds: string[];
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  offerCash: number;
  requestCash: number;
  offerPropertyIds: string[];
  requestPropertyIds: string[];
  offerCards: number;
  requestCards: number;
  fromConfirmed: boolean;
  toConfirmed: boolean;
}

export interface GameState {
  phase: "setup" | "playing" | "gameOver";
  players: Player[];
  currentPlayerIndex: number;
  properties: Record<string, PropertyState>;
  decks: Record<CardDeckName, DeckState>;
  pendingAction: PendingAction;
  auction: AuctionState | null;
  lastRoll: [number, number] | null;
  lastRollTotal: number;
  doublesCount: number;
  hasRolled: boolean;
  startCash: number;
  startSalary: number;
  log: string[];
  winnerId: string | null;
}

export interface PlayerSetup {
  name: string;
  color: string;
  token: string;
}
