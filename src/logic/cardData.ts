import { Card } from "./gameTypes";

export const CHANCE_CARDS: Card[] = [
  { id: "chance-start", deck: "chance", title: "Express Scooter", text: "Zip to Civic Start. Collect salary.", effect: { type: "moveTo", index: 0, collectStart: true } },
  { id: "chance-tram", deck: "chance", title: "Platform Shortcut", text: "Move to Central Tram Hub.", effect: { type: "moveTo", index: 5, collectStart: true } },
  { id: "chance-crown", deck: "chance", title: "Rooftop Invitation", text: "Move to Crown Crescent.", effect: { type: "moveTo", index: 39, collectStart: true } },
  { id: "chance-back3", deck: "chance", title: "Closed Sidewalk", text: "Move back three spaces.", effect: { type: "moveBy", steps: -3 } },
  { id: "chance-forward5", deck: "chance", title: "Green Lights", text: "Move forward five spaces.", effect: { type: "moveBy", steps: 5 } },
  { id: "chance-collect75", deck: "chance", title: "Street Fair Prize", text: "Collect 75.", effect: { type: "collect", amount: 75 } },
  { id: "chance-pay50", deck: "chance", title: "Tow Notice", text: "Pay 50.", effect: { type: "pay", amount: 50 } },
  { id: "chance-pay-each", deck: "chance", title: "Dinner Round", text: "Pay each other player 25.", effect: { type: "payEach", amount: 25 } },
  { id: "chance-collect-each", deck: "chance", title: "Pop-Up Workshop", text: "Collect 20 from each other player.", effect: { type: "collectFromEach", amount: 20 } },
  { id: "chance-timeout", deck: "chance", title: "Traffic Tribunal", text: "Go directly to Timeout.", effect: { type: "goToTimeout" } },
  { id: "chance-free", deck: "chance", title: "Apology Voucher", text: "Keep this card until needed to leave Timeout.", effect: { type: "getOutFree" } },
  { id: "chance-repairs", deck: "chance", title: "Facade Inspection", text: "Pay 25 per loft and 100 per tower.", effect: { type: "repairs", perHouse: 25, perHotel: 100 } },
  { id: "chance-utility", deck: "chance", title: "Utility Tour", text: "Move to Rainworks Utility.", effect: { type: "moveTo", index: 28, collectStart: true } },
  { id: "chance-market", deck: "chance", title: "Vendor Meetup", text: "Move to Market Mile.", effect: { type: "moveTo", index: 16, collectStart: true } },
  { id: "chance-tax", deck: "chance", title: "Courier Fine", text: "Pay 15.", effect: { type: "pay", amount: 15 } },
  { id: "chance-bonus", deck: "chance", title: "Creative Grant", text: "Collect 150.", effect: { type: "collect", amount: 150 } }
];

export const COMMUNITY_CARDS: Card[] = [
  { id: "community-start", deck: "community", title: "Block Parade", text: "Advance to Civic Start. Collect salary.", effect: { type: "moveTo", index: 0, collectStart: true } },
  { id: "community-collect100", deck: "community", title: "Neighborhood Bonus", text: "Collect 100.", effect: { type: "collect", amount: 100 } },
  { id: "community-collect50", deck: "community", title: "Bike Share Rebate", text: "Collect 50.", effect: { type: "collect", amount: 50 } },
  { id: "community-pay50", deck: "community", title: "Tree Fund", text: "Pay 50.", effect: { type: "pay", amount: 50 } },
  { id: "community-pay100", deck: "community", title: "Code Update", text: "Pay 100.", effect: { type: "pay", amount: 100 } },
  { id: "community-free", deck: "community", title: "Timeout Pass", text: "Keep this card until needed to leave Timeout.", effect: { type: "getOutFree" } },
  { id: "community-timeout", deck: "community", title: "Noise Complaint", text: "Go directly to Timeout.", effect: { type: "goToTimeout" } },
  { id: "community-pay-each", deck: "community", title: "Shared Garden Tools", text: "Pay each other player 10.", effect: { type: "payEach", amount: 10 } },
  { id: "community-collect-each", deck: "community", title: "Bake Sale Hit", text: "Collect 25 from each other player.", effect: { type: "collectFromEach", amount: 25 } },
  { id: "community-repairs", deck: "community", title: "Weatherproofing", text: "Pay 40 per loft and 115 per tower.", effect: { type: "repairs", perHouse: 40, perHotel: 115 } },
  { id: "community-forward2", deck: "community", title: "Helpful Shortcut", text: "Move forward two spaces.", effect: { type: "moveBy", steps: 2 } },
  { id: "community-back2", deck: "community", title: "Forgotten Keys", text: "Move back two spaces.", effect: { type: "moveBy", steps: -2 } },
  { id: "community-rest", deck: "community", title: "Plaza Picnic", text: "Move to Rest Stop Plaza.", effect: { type: "moveTo", index: 20 } },
  { id: "community-harbor", deck: "community", title: "Harbor Cleanup", text: "Move to Harbor Walk.", effect: { type: "moveTo", index: 6, collectStart: true } },
  { id: "community-dividend", deck: "community", title: "Local Co-Op Dividend", text: "Collect 45.", effect: { type: "collect", amount: 45 } },
  { id: "community-fee", deck: "community", title: "Library Late Fee", text: "Pay 20.", effect: { type: "pay", amount: 20 } }
];

export const ALL_CARDS = [...CHANCE_CARDS, ...COMMUNITY_CARDS];

export const getCard = (cardId: string): Card => {
  const card = ALL_CARDS.find((item) => item.id === cardId);
  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }
  return card;
};
