export const CITY_DISTRICTS = [
  { id: 0, name: "Nordtor", x: 0.12, y: 0.16 },
  { id: 1, name: "Werkring", x: 0.36, y: 0.18 },
  { id: 2, name: "Marktplatte", x: 0.62, y: 0.2 },
  { id: 3, name: "Silo West", x: 0.2, y: 0.48 },
  { id: 4, name: "Aschekreuz", x: 0.46, y: 0.48 },
  { id: 5, name: "Funkhafen", x: 0.74, y: 0.5 },
  { id: 6, name: "Unterstadt", x: 0.44, y: 0.8 }
];

export const CITY_ROADS = [
  { a: 0, b: 1, blocked: false },
  { a: 1, b: 2, blocked: false },
  { a: 0, b: 3, blocked: false },
  { a: 1, b: 4, blocked: false },
  { a: 2, b: 5, blocked: false },
  { a: 3, b: 4, blocked: true },
  { a: 4, b: 5, blocked: false },
  { a: 3, b: 6, blocked: false },
  { a: 4, b: 6, blocked: false },
  { a: 5, b: 6, blocked: true }
];

export function findDistrict(id) {
  return CITY_DISTRICTS.find((d) => d.id === id);
}

export function roadBetween(a, b) {
  return CITY_ROADS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

export function isRoadOpen(a, b) {
  const road = roadBetween(a, b);
  return Boolean(road && !road.blocked);
}

export function neighborsOpen(id) {
  const out = [];
  for (const road of CITY_ROADS) {
    if (road.blocked) continue;
    if (road.a === id) out.push(road.b);
    if (road.b === id) out.push(road.a);
  }
  return out;
}
