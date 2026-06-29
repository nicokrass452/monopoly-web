import { GameState, TradeOffer } from "./gameTypes";

export const emptyTradeOffer = (fromPlayerId: string, toPlayerId: string): TradeOffer => ({
  fromPlayerId,
  toPlayerId,
  offerCash: 0,
  requestCash: 0,
  offerPropertyIds: [],
  requestPropertyIds: [],
  offerCards: 0,
  requestCards: 0,
  fromConfirmed: false,
  toConfirmed: false
});

export const validateTrade = (state: GameState, offer: TradeOffer): string | null => {
  const from = state.players.find((player) => player.id === offer.fromPlayerId);
  const to = state.players.find((player) => player.id === offer.toPlayerId);
  if (!from || !to || from.bankrupt || to.bankrupt) return "Both trade players must be active.";
  if (!offer.fromConfirmed || !offer.toConfirmed) return "Both players must confirm the trade.";
  if (offer.offerCash < 0 || offer.requestCash < 0) return "Cash amounts cannot be negative.";
  if (from.cash < offer.offerCash) return `${from.name} does not have enough cash.`;
  if (to.cash < offer.requestCash) return `${to.name} does not have enough cash.`;
  if (from.getOutOfTimeoutCards < offer.offerCards) return `${from.name} does not have enough cards.`;
  if (to.getOutOfTimeoutCards < offer.requestCards) return `${to.name} does not have enough cards.`;

  for (const propertyId of offer.offerPropertyIds) {
    if (state.properties[propertyId]?.ownerId !== from.id) return `${from.name} does not own one offered property.`;
    if ((state.properties[propertyId]?.improvements ?? 0) > 0) return "Improved properties cannot be traded.";
  }

  for (const propertyId of offer.requestPropertyIds) {
    if (state.properties[propertyId]?.ownerId !== to.id) return `${to.name} does not own one requested property.`;
    if ((state.properties[propertyId]?.improvements ?? 0) > 0) return "Improved properties cannot be traded.";
  }

  return null;
};

export const applyTrade = (state: GameState, offer: TradeOffer): GameState => {
  const error = validateTrade(state, offer);
  if (error) {
    return { ...state, log: [error, ...state.log] };
  }

  const players = state.players.map((player) => {
    if (player.id === offer.fromPlayerId) {
      return {
        ...player,
        cash: player.cash - offer.offerCash + offer.requestCash,
        getOutOfTimeoutCards: player.getOutOfTimeoutCards - offer.offerCards + offer.requestCards
      };
    }
    if (player.id === offer.toPlayerId) {
      return {
        ...player,
        cash: player.cash + offer.offerCash - offer.requestCash,
        getOutOfTimeoutCards: player.getOutOfTimeoutCards + offer.offerCards - offer.requestCards
      };
    }
    return player;
  });

  const properties = { ...state.properties };
  offer.offerPropertyIds.forEach((propertyId) => {
    properties[propertyId] = { ...properties[propertyId], ownerId: offer.toPlayerId };
  });
  offer.requestPropertyIds.forEach((propertyId) => {
    properties[propertyId] = { ...properties[propertyId], ownerId: offer.fromPlayerId };
  });

  return { ...state, players, properties, log: ["Trade completed.", ...state.log] };
};
