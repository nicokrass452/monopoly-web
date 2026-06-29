import { describe, expect, it } from "vitest";
import { createNewGame, gameReducer } from "./gameReducer";
import { calculateRent } from "./rent";
import { getSpace } from "./boardData";
import { GameState, PlayerSetup } from "./gameTypes";

const setups: PlayerSetup[] = [
  { name: "A", color: "#e11d48", token: "car" },
  { name: "B", color: "#2563eb", token: "hat" }
];

const withOwner = (state: GameState, spaceId: string, ownerId: string): GameState => ({
  ...state,
  properties: {
    ...state.properties,
    [spaceId]: { ...state.properties[spaceId], ownerId }
  }
});

describe("rent calculation", () => {
  it("doubles base rent when a street color set is owned", () => {
    let state = createNewGame(setups, 1500, false);
    state = withOwner(state, "maple-mews", "player-1");
    state = withOwner(state, "lantern-lane", "player-1");

    expect(calculateRent(state, getSpace("maple-mews"))).toBe(4);
  });

  it("uses improvement rent before color-set rent", () => {
    let state = createNewGame(setups, 1500, false);
    state = withOwner(state, "maple-mews", "player-1");
    state = withOwner(state, "lantern-lane", "player-1");
    state = {
      ...state,
      properties: {
        ...state.properties,
        "maple-mews": { ...state.properties["maple-mews"], improvements: 2 }
      }
    };

    expect(calculateRent(state, getSpace("maple-mews"))).toBe(30);
  });
});

describe("movement and doubles", () => {
  it("moves a player and awards salary when passing start", () => {
    let state = createNewGame(setups, 1500, false);
    state = { ...state, players: state.players.map((player) => (player.id === "player-1" ? { ...player, position: 38 } : player)) };

    state = gameReducer(state, { type: "ROLL_DICE", dice: [2, 3] });

    expect(state.players[0].position).toBe(3);
    expect(state.players[0].cash).toBe(1700);
  });

  it("sends a player to Timeout after three doubles", () => {
    let state = createNewGame(setups, 1500, false);

    state = gameReducer(state, { type: "ROLL_DICE", dice: [1, 1] });
    state = { ...state, pendingAction: null };
    state = gameReducer(state, { type: "ROLL_DICE", dice: [2, 2] });
    state = { ...state, pendingAction: null };
    state = gameReducer(state, { type: "ROLL_DICE", dice: [3, 3] });

    expect(state.players[0].inTimeout).toBe(true);
    expect(state.players[0].position).toBe(10);
  });
});

describe("card effects", () => {
  it("applies collect cards", () => {
    let state = createNewGame(setups, 1500, false);
    state = {
      ...state,
      pendingAction: { type: "card", playerId: "player-1", deck: "chance", cardId: "chance-bonus" }
    };

    state = gameReducer(state, { type: "ACK_CARD" });

    expect(state.players[0].cash).toBe(1650);
  });

  it("stores get out of Timeout cards", () => {
    let state = createNewGame(setups, 1500, false);
    state = {
      ...state,
      pendingAction: { type: "card", playerId: "player-1", deck: "community", cardId: "community-free" }
    };

    state = gameReducer(state, { type: "ACK_CARD" });

    expect(state.players[0].getOutOfTimeoutCards).toBe(1);
  });
});

describe("bankruptcy", () => {
  it("transfers assets to a creditor when bankrupt to another player", () => {
    let state = createNewGame(setups, 100, false);
    state = withOwner(state, "maple-mews", "player-1");
    state = {
      ...state,
      pendingAction: { type: "debt", payerId: "player-1", creditorId: "player-2", amount: 500, reason: "rent" }
    };

    state = gameReducer(state, { type: "DECLARE_BANKRUPTCY" });

    expect(state.players[0].bankrupt).toBe(true);
    expect(state.properties["maple-mews"].ownerId).toBe("player-2");
    expect(state.phase).toBe("gameOver");
  });
});
