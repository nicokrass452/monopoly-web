import { AuctionState, GameState } from "./gameTypes";

export const createAuction = (state: GameState, spaceId: string): AuctionState => ({
  spaceId,
  activePlayerIds: state.players.filter((player) => !player.bankrupt).map((player) => player.id),
  currentBidderIndex: 0,
  highBid: 0,
  highBidderId: null,
  passedPlayerIds: []
});

export const currentAuctionBidder = (auction: AuctionState): string =>
  auction.activePlayerIds[auction.currentBidderIndex % auction.activePlayerIds.length];

export const advanceAuction = (auction: AuctionState): AuctionState => {
  let nextIndex = (auction.currentBidderIndex + 1) % auction.activePlayerIds.length;
  let guard = 0;
  while (
    auction.passedPlayerIds.includes(auction.activePlayerIds[nextIndex]) &&
    guard < auction.activePlayerIds.length
  ) {
    nextIndex = (nextIndex + 1) % auction.activePlayerIds.length;
    guard += 1;
  }
  return { ...auction, currentBidderIndex: nextIndex };
};

export const isAuctionComplete = (auction: AuctionState): boolean => {
  if (!auction.highBidderId) {
    return auction.passedPlayerIds.length >= auction.activePlayerIds.length;
  }
  return auction.activePlayerIds.every((playerId) => playerId === auction.highBidderId || auction.passedPlayerIds.includes(playerId));
};

export const validateBid = (state: GameState, auction: AuctionState, playerId: string, amount: number): string | null => {
  const bidder = currentAuctionBidder(auction);
  const player = state.players.find((item) => item.id === playerId);
  if (bidder !== playerId) return "It is not this player's auction turn.";
  if (!player || player.bankrupt) return "This player cannot bid.";
  if (amount <= auction.highBid) return "Bid must beat the current high bid.";
  if (amount > player.cash) return "Bid cannot exceed available cash.";
  return null;
};
