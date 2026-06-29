import { useEffect, useMemo, useReducer, useState } from "react";
import { BOARD, getSpace } from "./logic/boardData";
import { getCard } from "./logic/cardData";
import { createInitialState, gameReducer } from "./logic/gameReducer";
import { calculateRent } from "./logic/rent";
import { emptyTradeOffer } from "./logic/trade";
import { BoardSpace, GameState, Player, PlayerSetup, TradeOffer } from "./logic/gameTypes";

const STORAGE_KEY = "city-estates-save";
const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#f59e0b"];
const TOKENS = ["car", "hat", "key", "star", "bike", "cup"];

const money = (amount: number) => `$${amount}`;

function boardGridPosition(index: number) {
  if (index <= 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index <= 20) return { gridRow: 21 - index, gridColumn: 1 };
  if (index <= 30) return { gridRow: 1, gridColumn: index - 19 };
  return { gridRow: index - 29, gridColumn: 11 };
}

function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function SetupScreen({ dispatch, onLoad }: { dispatch: React.Dispatch<any>; onLoad: () => void }) {
  const [cash, setCash] = useState(1500);
  const [randomize, setRandomize] = useState(false);
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: "Alex", color: COLORS[0], token: TOKENS[0] },
    { name: "Blair", color: COLORS[1], token: TOKENS[1] }
  ]);

  const updatePlayer = (index: number, patch: Partial<PlayerSetup>) => {
    setPlayers((current) => current.map((player, itemIndex) => (itemIndex === index ? { ...player, ...patch } : player)));
  };

  return (
    <main className="setup">
      <section className="setupPanel">
        <div>
          <p className="eyebrow">Original city trading game</p>
          <h1>City Estates</h1>
        </div>
        <div className="setupControls">
          <label>
            Players
            <select
              value={players.length}
              onChange={(event) => {
                const count = Number(event.target.value);
                setPlayers((current) =>
                  Array.from({ length: count }, (_, index) => current[index] ?? { name: `Player ${index + 1}`, color: COLORS[index], token: TOKENS[index] })
                );
              }}
            >
              {[2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starting cash
            <input type="number" min={500} step={50} value={cash} onChange={(event) => setCash(Number(event.target.value))} />
          </label>
          <label className="checkRow">
            <input type="checkbox" checked={randomize} onChange={(event) => setRandomize(event.target.checked)} />
            Randomize turn order
          </label>
        </div>
        <div className="playerSetupList">
          {players.map((player, index) => (
            <div className="playerSetup" key={index}>
              <input value={player.name} onChange={(event) => updatePlayer(index, { name: event.target.value })} aria-label={`Player ${index + 1} name`} />
              <input type="color" value={player.color} onChange={(event) => updatePlayer(index, { color: event.target.value })} aria-label={`Player ${index + 1} color`} />
              <select value={player.token} onChange={(event) => updatePlayer(index, { token: event.target.value })}>
                {TOKENS.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="buttonRow">
          <button
            className="primary"
            onClick={() => dispatch({ type: "START_GAME", players, startCash: cash, randomizeOrder: randomize })}
          >
            Start game
          </button>
          <button onClick={onLoad}>Load saved game</button>
        </div>
      </section>
    </main>
  );
}

function BoardView({
  state,
  onSelect
}: {
  state: GameState;
  onSelect: (space: BoardSpace) => void;
}) {
  const current = state.players[state.currentPlayerIndex];
  return (
    <section className="boardWrap" aria-label="Game board">
      <div className="board">
        <div className="boardCenter">
          <h2>City Estates</h2>
          <p>Current turn</p>
          <strong style={{ color: current?.color }}>{current?.name}</strong>
          <span>{state.lastRoll ? `${state.lastRoll[0]} + ${state.lastRoll[1]} = ${state.lastRollTotal}` : "Roll to move"}</span>
        </div>
        {BOARD.map((space) => {
          const property = state.properties[space.id];
          const owner = property?.ownerId ? state.players.find((player) => player.id === property.ownerId) : null;
          const playersHere = state.players.filter((player) => !player.bankrupt && player.position === space.index);
          return (
            <button
              key={space.id}
              className={`space ${space.type} ${space.index % 10 === 0 ? "corner" : ""}`}
              style={boardGridPosition(space.index)}
              onClick={() => onSelect(space)}
            >
              {space.color && <span className="stripe" style={{ backgroundColor: space.color }} />}
              <span className="spaceIndex">{space.index}</span>
              <span className="spaceName">{space.name}</span>
              {space.price && <span className="price">{money(space.price)}</span>}
              {owner && <span className="ownerDot" style={{ background: owner.color }} title={owner.name} />}
              {property?.mortgaged && <span className="mortgageFlag">M</span>}
              {(property?.improvements ?? 0) > 0 && <span className="buildings">{property?.improvements === 5 ? "Tower" : `${property?.improvements} lofts`}</span>}
              <span className="tokens">
                {playersHere.map((player) => (
                  <span
                    key={player.id}
                    className={`token ${player.id === current?.id ? "currentToken" : ""}`}
                    style={{ backgroundColor: player.color }}
                    title={player.name}
                  >
                    {player.token.slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlayerPanel({ state, onSelect }: { state: GameState; onSelect: (space: BoardSpace) => void }) {
  const current = state.players[state.currentPlayerIndex];
  return (
    <aside className="panel playerPanel">
      <h2>Players</h2>
      {state.players.map((player) => {
        const properties = Object.values(state.properties).filter((property) => property.ownerId === player.id);
        return (
          <div className={`playerCard ${player.id === current?.id ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}`} key={player.id}>
            <div className="playerHeader">
              <span className="token large" style={{ backgroundColor: player.color }}>
                {player.token.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{player.name}</strong>
                <span>{player.inTimeout ? `Timeout attempt ${player.timeoutTurns}/3` : `Space ${player.position}`}</span>
              </div>
              <b>{money(player.cash)}</b>
            </div>
            <div className="propertyChips">
              {properties.length === 0 && <span className="muted">No properties</span>}
              {properties.map((property) => {
                const space = getSpace(property.spaceId);
                return (
                  <button key={property.spaceId} onClick={() => onSelect(space)} style={{ borderColor: space.color }}>
                    {space.name}
                  </button>
                );
              })}
            </div>
            {player.getOutOfTimeoutCards > 0 && <small>{player.getOutOfTimeoutCards} Timeout pass card(s)</small>}
          </div>
        );
      })}
    </aside>
  );
}

function ActionPanel({ state, dispatch, onTrade, onHelp }: { state: GameState; dispatch: React.Dispatch<any>; onTrade: () => void; onHelp: () => void }) {
  const player = state.players[state.currentPlayerIndex];
  const pending = state.pendingAction;
  const pendingCard = pending?.type === "card" ? getCard(pending.cardId) : null;
  const pendingSpace = pending?.type === "buyOrAuction" ? getSpace(pending.spaceId) : null;
  const debtPlayer = pending?.type === "debt" ? state.players.find((item) => item.id === pending.payerId) : null;

  return (
    <aside className="panel actionPanel">
      <div className="panelHeader">
        <h2>Turn</h2>
        <button onClick={onHelp}>Rules</button>
      </div>
      {state.phase === "gameOver" ? (
        <div className="prompt">
          <h3>{state.players.find((item) => item.id === state.winnerId)?.name ?? "Winner"} wins</h3>
        </div>
      ) : (
        <>
          <div className="diceBox">
            <span>Dice</span>
            <strong>{state.lastRoll ? `${state.lastRoll[0]} / ${state.lastRoll[1]}` : "- / -"}</strong>
            {state.doublesCount > 0 && <small>Doubles streak: {state.doublesCount}</small>}
          </div>
          {player?.inTimeout && !state.hasRolled && !pending && (
            <div className="prompt">
              <h3>Timeout options</h3>
              <button disabled={player.cash < 50} onClick={() => dispatch({ type: "PAY_TIMEOUT_FINE" })}>
                Pay $50
              </button>
              <button disabled={player.getOutOfTimeoutCards <= 0} onClick={() => dispatch({ type: "USE_TIMEOUT_CARD" })}>
                Use pass
              </button>
            </div>
          )}
          {pendingSpace && (
            <div className="prompt">
              <h3>Buy {pendingSpace.name}?</h3>
              <p>{money(pendingSpace.price ?? 0)}</p>
              <button className="primary" onClick={() => dispatch({ type: "BUY_PROPERTY" })}>
                Buy
              </button>
              <button onClick={() => dispatch({ type: "DECLINE_PROPERTY" })}>Auction</button>
            </div>
          )}
          {pendingCard && (
            <div className="prompt">
              <h3>{pendingCard.title}</h3>
              <p>{pendingCard.text}</p>
              <button className="primary" onClick={() => dispatch({ type: "ACK_CARD" })}>
                Apply card
              </button>
            </div>
          )}
          {pending?.type === "debt" && (
            <div className="prompt warning">
              <h3>{debtPlayer?.name} owes {money(pending.amount)}</h3>
              <p>{pending.reason}</p>
              <button className="primary" onClick={() => dispatch({ type: "PAY_DEBT" })}>
                Pay debt
              </button>
              <button onClick={() => dispatch({ type: "DECLARE_BANKRUPTCY" })}>Declare bankruptcy</button>
            </div>
          )}
          {!pending && !state.auction && (
            <div className="buttonStack">
              <button className="primary" disabled={state.hasRolled} onClick={() => dispatch({ type: "ROLL_DICE" })}>
                Roll dice
              </button>
              <button disabled={!state.hasRolled} onClick={() => dispatch({ type: "END_TURN" })}>
                End turn
              </button>
              <button onClick={onTrade}>Trade</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function PropertyModal({
  state,
  space,
  onClose,
  dispatch
}: {
  state: GameState;
  space: BoardSpace | null;
  onClose: () => void;
  dispatch: React.Dispatch<any>;
}) {
  if (!space) return null;
  const property = state.properties[space.id];
  const owner = property?.ownerId ? state.players.find((player) => player.id === property.ownerId) : null;
  const debtActor = state.pendingAction?.type === "debt" ? state.pendingAction.payerId : null;
  const actionOwnerId = debtActor ?? state.players[state.currentPlayerIndex]?.id;
  const canManage = property?.ownerId === actionOwnerId;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">{space.type}</p>
            <h2>{space.name}</h2>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        {space.color && <div className="propertyBand" style={{ background: space.color }} />}
        {space.price ? (
          <div className="detailGrid">
            <span>Price</span>
            <b>{money(space.price)}</b>
            <span>Mortgage</span>
            <b>{money(space.mortgageValue ?? 0)}</b>
            <span>Owner</span>
            <b>{owner?.name ?? "Unowned"}</b>
            <span>Status</span>
            <b>{property?.mortgaged ? "Mortgaged" : "Active"}</b>
            <span>Improvements</span>
            <b>{property?.improvements === 5 ? "Tower" : `${property?.improvements ?? 0} lofts`}</b>
            <span>Current rent</span>
            <b>{money(calculateRent(state, space))}</b>
          </div>
        ) : (
          <p>{space.taxAmount ? `Pay ${money(space.taxAmount)} when landing here.` : "Special city space."}</p>
        )}
        {space.rent && (
          <div className="rentTable">
            <span>Base {money(space.rent.base)}</span>
            <span>Set {money(space.rent.colorSet)}</span>
            {space.rent.improvements.map((rent, index) => (
              <span key={rent}>{index === 4 ? "Tower" : `${index + 1} loft`}: {money(rent)}</span>
            ))}
          </div>
        )}
        {canManage && (
          <div className="buttonRow wrap">
            <button onClick={() => dispatch({ type: "MORTGAGE_PROPERTY", spaceId: space.id })}>Mortgage</button>
            <button onClick={() => dispatch({ type: "UNMORTGAGE_PROPERTY", spaceId: space.id })}>Unmortgage</button>
            <button onClick={() => dispatch({ type: "BUY_IMPROVEMENT", spaceId: space.id })}>Buy improvement</button>
            <button onClick={() => dispatch({ type: "SELL_IMPROVEMENT", spaceId: space.id })}>Sell improvement</button>
          </div>
        )}
      </section>
    </div>
  );
}

function AuctionModal({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<any> }) {
  const [bid, setBid] = useState(10);
  const auction = state.auction;
  useEffect(() => {
    if (auction) setBid(auction.highBid + 10);
  }, [auction?.highBid]);
  if (!auction) return null;
  const space = getSpace(auction.spaceId);
  const bidderId = auction.activePlayerIds[auction.currentBidderIndex % auction.activePlayerIds.length];
  const bidder = state.players.find((player) => player.id === bidderId);
  const highBidder = state.players.find((player) => player.id === auction.highBidderId);
  return (
    <div className="modalBackdrop">
      <section className="modal compact">
        <header>
          <div>
            <p className="eyebrow">Auction</p>
            <h2>{space.name}</h2>
          </div>
        </header>
        <p>Current bidder: <strong>{bidder?.name}</strong></p>
        <p>High bid: <strong>{auction.highBid ? `${money(auction.highBid)} by ${highBidder?.name}` : "No bids"}</strong></p>
        <label>
          Bid amount
          <input type="number" min={auction.highBid + 1} value={bid} onChange={(event) => setBid(Number(event.target.value))} />
        </label>
        <div className="buttonRow">
          <button className="primary" onClick={() => dispatch({ type: "AUCTION_BID", playerId: bidderId, amount: bid })}>
            Bid
          </button>
          <button onClick={() => dispatch({ type: "AUCTION_PASS", playerId: bidderId })}>Pass</button>
        </div>
      </section>
    </div>
  );
}

function TradeModal({ state, onClose, dispatch }: { state: GameState; onClose: () => void; dispatch: React.Dispatch<any> }) {
  const from = state.players[state.currentPlayerIndex];
  const targets = state.players.filter((player) => player.id !== from.id && !player.bankrupt);
  const [offer, setOffer] = useState<TradeOffer>(() => emptyTradeOffer(from.id, targets[0]?.id ?? from.id));
  const to = state.players.find((player) => player.id === offer.toPlayerId);
  const fromProperties = Object.values(state.properties).filter((property) => property.ownerId === from.id);
  const toProperties = Object.values(state.properties).filter((property) => property.ownerId === to?.id);

  const patchOffer = (patch: Partial<TradeOffer>) => setOffer((current) => ({ ...current, ...patch }));
  const toggleProperty = (key: "offerPropertyIds" | "requestPropertyIds", propertyId: string) => {
    setOffer((current) => {
      const list = current[key];
      return { ...current, [key]: list.includes(propertyId) ? list.filter((id) => id !== propertyId) : [...list, propertyId], fromConfirmed: false, toConfirmed: false };
    });
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section className="modal tradeModal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">Trade</p>
            <h2>{from.name} proposes</h2>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <label>
          Trade with
          <select value={offer.toPlayerId} onChange={(event) => setOffer(emptyTradeOffer(from.id, event.target.value))}>
            {targets.map((player) => (
              <option value={player.id} key={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <div className="tradeGrid">
          <div>
            <h3>{from.name} offers</h3>
            <label>Cash <input type="number" min={0} value={offer.offerCash} onChange={(event) => patchOffer({ offerCash: Number(event.target.value), fromConfirmed: false, toConfirmed: false })} /></label>
            <label>Timeout cards <input type="number" min={0} max={from.getOutOfTimeoutCards} value={offer.offerCards} onChange={(event) => patchOffer({ offerCards: Number(event.target.value), fromConfirmed: false, toConfirmed: false })} /></label>
            {fromProperties.map((property) => (
              <label className="checkRow" key={property.spaceId}>
                <input type="checkbox" checked={offer.offerPropertyIds.includes(property.spaceId)} onChange={() => toggleProperty("offerPropertyIds", property.spaceId)} />
                {getSpace(property.spaceId).name}
              </label>
            ))}
          </div>
          <div>
            <h3>{to?.name} offers</h3>
            <label>Cash <input type="number" min={0} value={offer.requestCash} onChange={(event) => patchOffer({ requestCash: Number(event.target.value), fromConfirmed: false, toConfirmed: false })} /></label>
            <label>Timeout cards <input type="number" min={0} max={to?.getOutOfTimeoutCards ?? 0} value={offer.requestCards} onChange={(event) => patchOffer({ requestCards: Number(event.target.value), fromConfirmed: false, toConfirmed: false })} /></label>
            {toProperties.map((property) => (
              <label className="checkRow" key={property.spaceId}>
                <input type="checkbox" checked={offer.requestPropertyIds.includes(property.spaceId)} onChange={() => toggleProperty("requestPropertyIds", property.spaceId)} />
                {getSpace(property.spaceId).name}
              </label>
            ))}
          </div>
        </div>
        <div className="buttonRow wrap">
          <button className={offer.fromConfirmed ? "confirmed" : ""} onClick={() => patchOffer({ fromConfirmed: true })}>{from.name} confirms</button>
          <button className={offer.toConfirmed ? "confirmed" : ""} onClick={() => patchOffer({ toConfirmed: true })}>{to?.name} confirms</button>
          <button
            className="primary"
            disabled={!offer.fromConfirmed || !offer.toConfirmed}
            onClick={() => {
              dispatch({ type: "EXECUTE_TRADE", offer });
              onClose();
            }}
          >
            Complete trade
          </button>
        </div>
      </section>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Rules</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <ul className="rules">
          <li>Roll two dice, move clockwise, and collect $200 when passing Civic Start.</li>
          <li>Buy unowned properties or send them to auction for all active players.</li>
          <li>Rent rises when an owner controls a full color set. Lofts and towers must be built and sold evenly.</li>
          <li>Three doubles in one turn sends the player to Timeout. Timeout can be left with $50, a pass card, or doubles.</li>
          <li>Players who cannot pay may sell improvements, mortgage properties, or declare bankruptcy.</li>
        </ul>
      </section>
    </div>
  );
}

function LogPanel({ log }: { log: string[] }) {
  return (
    <section className="panel logPanel">
      <h2>Action log</h2>
      <ol>
        {log.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </section>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [selectedSpace, setSelectedSpace] = useState<BoardSpace | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (state.phase !== "setup") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const savedExists = useMemo(() => Boolean(loadSavedGame()), [state.phase]);
  const load = () => {
    const saved = loadSavedGame();
    if (saved) dispatch({ type: "HYDRATE", state: saved });
  };
  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    dispatch({ type: "SAVE_NOTE" });
  };
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "RESET" });
  };

  if (state.phase === "setup") {
    return <SetupScreen dispatch={dispatch} onLoad={load} />;
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Browser board game</p>
          <h1>City Estates</h1>
        </div>
        <div className="buttonRow">
          <button onClick={save}>Save</button>
          <button disabled={!savedExists} onClick={load}>Load</button>
          <button onClick={reset}>New game</button>
        </div>
      </header>
      <div className="gameLayout">
        <PlayerPanel state={state} onSelect={setSelectedSpace} />
        <BoardView state={state} onSelect={setSelectedSpace} />
        <div className="rightRail">
          <ActionPanel state={state} dispatch={dispatch} onTrade={() => setTradeOpen(true)} onHelp={() => setHelpOpen(true)} />
          <LogPanel log={state.log} />
        </div>
      </div>
      <PropertyModal state={state} space={selectedSpace} onClose={() => setSelectedSpace(null)} dispatch={dispatch} />
      <AuctionModal state={state} dispatch={dispatch} />
      {tradeOpen && <TradeModal state={state} dispatch={dispatch} onClose={() => setTradeOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </main>
  );
}
