import { BOARD } from "./boardData";
import { BoardSpace, GameState } from "./gameTypes";

export const ownedProperties = (state: GameState, ownerId: string) =>
  Object.values(state.properties).filter((property) => property.ownerId === ownerId);

export const ownsFullGroup = (state: GameState, ownerId: string, group: string): boolean => {
  const groupSpaces = BOARD.filter((space) => space.group === group && space.price !== undefined);
  return groupSpaces.length > 0 && groupSpaces.every((space) => state.properties[space.id]?.ownerId === ownerId);
};

export const calculateRent = (state: GameState, space: BoardSpace, diceTotal = state.lastRollTotal): number => {
  const property = state.properties[space.id];
  if (!property?.ownerId || property.mortgaged) {
    return 0;
  }

  if (space.propertyKind === "transit") {
    const transitCount = ownedProperties(state, property.ownerId).filter((owned) => {
      const ownedSpace = BOARD.find((spaceItem) => spaceItem.id === owned.spaceId);
      return ownedSpace?.propertyKind === "transit" && !owned.mortgaged;
    }).length;
    return [0, 25, 50, 100, 200][transitCount] ?? 200;
  }

  if (space.propertyKind === "utility") {
    const utilityCount = ownedProperties(state, property.ownerId).filter((owned) => {
      const ownedSpace = BOARD.find((spaceItem) => spaceItem.id === owned.spaceId);
      return ownedSpace?.propertyKind === "utility" && !owned.mortgaged;
    }).length;
    return diceTotal * (utilityCount >= 2 ? 10 : 4);
  }

  if (!space.rent) {
    return 0;
  }

  if (property.improvements > 0) {
    return space.rent.improvements[Math.min(property.improvements, 5) - 1];
  }

  if (space.group && ownsFullGroup(state, property.ownerId, space.group)) {
    return space.rent.colorSet;
  }

  return space.rent.base;
};

export const canBuyImprovement = (state: GameState, playerId: string, space: BoardSpace): string | null => {
  const property = state.properties[space.id];
  if (!property || property.ownerId !== playerId) return "You do not own this property.";
  if (space.propertyKind !== "street" || !space.group || !space.buildingCost) return "Only street properties can be improved.";
  if (property.mortgaged) return "Unmortgage this property before improving it.";
  if (!ownsFullGroup(state, playerId, space.group)) return "You need the full color set first.";
  if (property.improvements >= 5) return "This property already has a tower.";
  const groupStates = BOARD.filter((item) => item.group === space.group).map((item) => state.properties[item.id]);
  if (groupStates.some((item) => item?.mortgaged)) return "No property in the set can be mortgaged.";
  const minImprovements = Math.min(...groupStates.map((item) => item?.improvements ?? 0));
  if (property.improvements !== minImprovements) return "Build evenly across the set.";
  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.cash < space.buildingCost) return "Not enough cash.";
  return null;
};

export const canSellImprovement = (state: GameState, playerId: string, space: BoardSpace): string | null => {
  const property = state.properties[space.id];
  if (!property || property.ownerId !== playerId) return "You do not own this property.";
  if (space.propertyKind !== "street" || !space.group || !space.buildingCost) return "Only street properties have improvements.";
  if (property.improvements <= 0) return "There are no improvements to sell.";
  const groupStates = BOARD.filter((item) => item.group === space.group).map((item) => state.properties[item.id]);
  const maxImprovements = Math.max(...groupStates.map((item) => item?.improvements ?? 0));
  if (property.improvements !== maxImprovements) return "Sell evenly across the set.";
  return null;
};
