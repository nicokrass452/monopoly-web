import { BoardSpace } from "./gameTypes";

const street = (
  index: number,
  id: string,
  name: string,
  group: string,
  color: string,
  price: number,
  rent: [number, number, number, number, number, number],
  buildingCost: number
): BoardSpace => ({
  id,
  index,
  name,
  type: "property",
  propertyKind: "street",
  group,
  color,
  price,
  mortgageValue: Math.floor(price / 2),
  buildingCost,
  rent: {
    base: rent[0],
    colorSet: rent[0] * 2,
    improvements: [rent[1], rent[2], rent[3], rent[4], rent[5]]
  }
});

const transit = (index: number, id: string, name: string): BoardSpace => ({
  id,
  index,
  name,
  type: "transit",
  propertyKind: "transit",
  group: "transit",
  color: "#4b5563",
  price: 200,
  mortgageValue: 100
});

const utility = (index: number, id: string, name: string): BoardSpace => ({
  id,
  index,
  name,
  type: "utility",
  propertyKind: "utility",
  group: "utility",
  color: "#64748b",
  price: 150,
  mortgageValue: 75
});

export const BOARD: BoardSpace[] = [
  { id: "start", index: 0, name: "Civic Start", type: "start" },
  street(1, "maple-mews", "Maple Mews", "copper", "#9a6b3d", 60, [2, 10, 30, 90, 160, 250], 50),
  { id: "community-1", index: 2, name: "Neighborhood Notes", type: "community" },
  street(3, "lantern-lane", "Lantern Lane", "copper", "#9a6b3d", 60, [4, 20, 60, 180, 320, 450], 50),
  { id: "permit-fee", index: 4, name: "Permit Fee", type: "tax", taxAmount: 200 },
  transit(5, "central-tram", "Central Tram Hub"),
  street(6, "harbor-walk", "Harbor Walk", "sky", "#38bdf8", 100, [6, 30, 90, 270, 400, 550], 50),
  { id: "chance-1", index: 7, name: "City Shuffle", type: "chance" },
  street(8, "pixel-place", "Pixel Place", "sky", "#38bdf8", 100, [6, 30, 90, 270, 400, 550], 50),
  street(9, "skyline-street", "Skyline Street", "sky", "#38bdf8", 120, [8, 40, 100, 300, 450, 600], 50),
  { id: "timeout", index: 10, name: "Timeout Check-In", type: "timeout" },
  street(11, "orchard-arcade", "Orchard Arcade", "rose", "#f472b6", 140, [10, 50, 150, 450, 625, 750], 100),
  utility(12, "sun-grid", "Sun Grid Utility"),
  street(13, "gallery-grove", "Gallery Grove", "rose", "#f472b6", 140, [10, 50, 150, 450, 625, 750], 100),
  street(14, "theater-terrace", "Theater Terrace", "rose", "#f472b6", 160, [12, 60, 180, 500, 700, 900], 100),
  transit(15, "riverside-ferry", "Riverside Ferry"),
  street(16, "market-mile", "Market Mile", "amber", "#f59e0b", 180, [14, 70, 200, 550, 750, 950], 100),
  { id: "community-2", index: 17, name: "Block Bulletin", type: "community" },
  street(18, "baker-boulevard", "Baker Boulevard", "amber", "#f59e0b", 180, [14, 70, 200, 550, 750, 950], 100),
  street(19, "foundry-front", "Foundry Front", "amber", "#f59e0b", 200, [16, 80, 220, 600, 800, 1000], 100),
  { id: "rest-stop", index: 20, name: "Rest Stop Plaza", type: "rest" },
  street(21, "garden-gate", "Garden Gate", "red", "#ef4444", 220, [18, 90, 250, 700, 875, 1050], 150),
  { id: "chance-2", index: 22, name: "Crosswalk Chance", type: "chance" },
  street(23, "studio-square", "Studio Square", "red", "#ef4444", 220, [18, 90, 250, 700, 875, 1050], 150),
  street(24, "academy-avenue", "Academy Avenue", "red", "#ef4444", 240, [20, 100, 300, 750, 925, 1100], 150),
  transit(25, "metro-loop", "Metro Loop"),
  street(26, "canal-court", "Canal Court", "violet", "#8b5cf6", 260, [22, 110, 330, 800, 975, 1150], 150),
  street(27, "observatory-way", "Observatory Way", "violet", "#8b5cf6", 260, [22, 110, 330, 800, 975, 1150], 150),
  utility(28, "rainworks", "Rainworks Utility"),
  street(29, "summit-station", "Summit Station", "violet", "#8b5cf6", 280, [24, 120, 360, 850, 1025, 1200], 150),
  { id: "go-timeout", index: 30, name: "Go To Timeout", type: "goToTimeout" },
  street(31, "botanic-bend", "Botanic Bend", "teal", "#14b8a6", 300, [26, 130, 390, 900, 1100, 1275], 200),
  street(32, "innovation-isle", "Innovation Isle", "teal", "#14b8a6", 300, [26, 130, 390, 900, 1100, 1275], 200),
  { id: "community-3", index: 33, name: "Civic Chest", type: "community" },
  street(34, "mayor-market", "Mayor Market", "teal", "#14b8a6", 320, [28, 150, 450, 1000, 1200, 1400], 200),
  transit(35, "airport-link", "Airport Link"),
  { id: "chance-3", index: 36, name: "Late-Night Detour", type: "chance" },
  street(37, "riverlight-road", "navy", "navy", "#2563eb", 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { id: "district-dues", index: 38, name: "District Dues", type: "tax", taxAmount: 100 },
  street(39, "crown-crescent", "Crown Crescent", "navy", "#2563eb", 400, [50, 200, 600, 1400, 1700, 2000], 200)
];

export const PROPERTY_SPACES = BOARD.filter((space) => space.price !== undefined);
export const TIMEOUT_INDEX = 10;
export const START_INDEX = 0;

export const getSpace = (spaceId: string): BoardSpace => {
  const space = BOARD.find((item) => item.id === spaceId);
  if (!space) {
    throw new Error(`Unknown board space: ${spaceId}`);
  }
  return space;
};

export const getSpaceByIndex = (index: number): BoardSpace => {
  const space = BOARD[index];
  if (!space) {
    throw new Error(`Unknown board index: ${index}`);
  }
  return space;
};
