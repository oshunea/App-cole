import { footprint, inside, MIN_PASSAGE_CM, measure, openingZone, overlaps, round } from './geometry';
import type { CatalogItem, Furniture, LayoutResult, Rect, Room } from './types';

export const CATALOG: CatalogItem[] = [
  { id: 'billy-col', label: 'Bibliothèque colonne', w: 40, d: 28, h: 202, storage: 180, price: 49, retailer: 'IKEA', query: 'bibliotheque colonne' },
  { id: 'corner-shelf', label: "Meuble d'angle", w: 60, d: 60, h: 180, storage: 240, price: 129, retailer: 'Leroy Merlin', query: 'meuble angle rangement' },
  { id: 'slim-cabinet', label: 'Meuble étroit 25 cm', w: 80, d: 25, h: 120, storage: 90, price: 59, retailer: 'Amazon', query: 'meuble rangement etroit' },
  { id: 'wall-shelf', label: 'Étagère murale haute', w: 100, d: 20, h: 40, storage: 40, price: 35, retailer: 'IKEA', query: 'etagere murale' },
];

const STEP = 20;
/** Résolution de grille pour la recherche (rapide) ; les métriques affichées utilisent la grille fine. */
const SEARCH_CELL = 25;

/** Les meubles hauts ne doivent pas masquer une fenêtre. */
const HIGH = 110;

function candidates(f: Furniture, room: Room): Furniture[] {
  const out: Furniture[] = [];
  for (const rotated of [false, true]) {
    const probe = { ...f, rotated, x: 0, y: 0 };
    const { w, d } = footprint(probe);
    for (let x = 0; x + w <= room.width; x += STEP) {
      out.push({ ...probe, x, y: 0 }, { ...probe, x, y: room.depth - d });
    }
    for (let y = 0; y + d <= room.depth; y += STEP) {
      out.push({ ...probe, x: 0, y }, { ...probe, x: room.width - w, y });
    }
  }
  return out;
}

function blocked(f: Furniture, room: Room, others: Furniture[]): boolean {
  const r = footprint(f);
  if (!inside(r, room)) return true;
  if (others.some((o) => overlaps(r, footprint(o)))) return true;
  for (const o of room.openings) {
    if (o.kind === 'door' && overlaps(r, openingZone(o, room))) return true;
    if (o.kind === 'window' && f.h > HIGH && overlaps(r, openingZone(o, room, 30))) return true;
  }
  return false;
}

/** Place chaque meuble contre un mur, du plus grand au plus petit, en gardant le plus d'espace circulable. */
function arrange(room: Room, items: Furniture[]): Furniture[] {
  const fixed = items.filter((f) => !f.movable);
  const placed: Furniture[] = [...fixed];
  const order = items
    .filter((f) => f.movable)
    .sort((a, b) => b.w * b.d - a.w * a.d);

  for (const item of order) {
    let best: Furniture | undefined;
    let bestScore = -Infinity;
    for (const c of candidates(item, room)) {
      if (blocked(c, room, placed)) continue;
      const m = measure({ ...room, furniture: [...placed, c] }, SEARCH_CELL);
      // Le passage compte davantage que la surface libre ; léger biais pour garder la position d'origine.
      const stay = Math.hypot(c.x - item.x, c.y - item.y) / 1000;
      const score = Math.min(m.passageCm, 120) * 2 + m.freeAreaM2 - stay;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    // Aucune position valide : on laisse le meuble où il est plutôt que de le faire disparaître.
    placed.push(best ?? item);
  }
  return placed;
}

const moved = (before: Furniture[], after: Furniture[]): string[] =>
  after
    .filter((a) => {
      const b = before.find((x) => x.id === a.id);
      return !b || b.x !== a.x || b.y !== a.y || b.rotated !== a.rotated;
    })
    .map((f) => f.label);

function result(before: Room, afterRoom: Room, notes: string[], suggestion?: CatalogItem): LayoutResult {
  const b = measure(before);
  const a = measure(afterRoom);
  return {
    room: afterRoom,
    before: b,
    after: a,
    gainM2: round(a.freeAreaM2 - b.freeAreaM2),
    moved: moved(before.furniture, afterRoom.furniture),
    suggestion,
    notes,
  };
}

/** Option A : réorganise uniquement les meubles présents. */
export function reorganize(room: Room): LayoutResult {
  const furniture = arrange(room, room.furniture);
  const out = result(room, { ...room, furniture }, []);
  if (out.moved.length === 0) out.notes.push("L'agencement actuel est déjà proche de l'optimum.");
  return out;
}

/** Option B : insère un meuble stocké ailleurs et réorganise l'ensemble. */
export function insertStock(room: Room, stock: Omit<Furniture, 'x' | 'y' | 'rotated' | 'movable'>): LayoutResult {
  const item: Furniture = { ...stock, x: 0, y: 0, rotated: false, movable: true };
  const furniture = arrange({ ...room, furniture: [...room.furniture, item] }, [...room.furniture, item]);
  const out = result(room, { ...room, furniture }, []);
  out.moved = out.moved.filter((l) => l !== item.label);
  if (out.after.passageCm < MIN_PASSAGE_CM) {
    out.notes.push(`Attention : le passage descend à ${out.after.passageCm} cm avec « ${item.label} ». Envisagez un meuble plus petit.`);
  } else {
    out.notes.push(`« ${item.label} » intégré en gardant ${out.after.passageCm} cm de passage.`);
  }
  return out;
}

/** Option C : trouve l'emplacement mort où un meuble de rangement du catalogue tient sans passage < 75 cm. */
export function suggestStorage(room: Room, catalog: CatalogItem[] = CATALOG): LayoutResult {
  const base = measure(room, SEARCH_CELL);
  let best: { item: CatalogItem; placed: Furniture; score: number } | undefined;

  for (const c of catalog) {
    const proto: Furniture = { id: `sugg-${c.id}`, label: c.label, w: c.w, d: c.d, h: c.h, x: 0, y: 0, rotated: false, movable: true, storage: c.storage };
    for (const cand of candidates(proto, room)) {
      if (blocked(cand, room, room.furniture)) continue;
      const m = measure({ ...room, furniture: [...room.furniture, cand] }, SEARCH_CELL);
      if (m.passageCm < Math.min(MIN_PASSAGE_CM, base.passageCm)) continue;
      // On valorise le rangement, et on pénalise la surface de circulation perdue.
      const score = c.storage - (base.freeAreaM2 - m.freeAreaM2) * 150;
      if (!best || score > best.score) best = { item: c, placed: cand, score };
    }
  }

  if (!best) {
    return result(room, room, ["Aucun emplacement ne permet d'ajouter un meuble en gardant 75 cm de passage."]);
  }
  const out = result(room, { ...room, furniture: [...room.furniture, best.placed] }, [
    `${best.item.label} (${best.item.w}×${best.item.d} cm) tient dans une zone inutilisée, ${best.item.storage} L de rangement en plus.`,
  ], best.item);
  out.moved = [];
  return out;
}

export function affiliateUrl(item: CatalogItem, affiliateId = 'spaceopti'): string {
  const q = encodeURIComponent(item.query);
  switch (item.retailer) {
    case 'IKEA': return `https://www.ikea.com/fr/fr/search/?q=${q}&utm_source=${affiliateId}`;
    case 'Leroy Merlin': return `https://www.leroymerlin.fr/recherche/?q=${q}&utm_source=${affiliateId}`;
    case 'Amazon': return `https://www.amazon.fr/s?k=${q}&tag=${affiliateId}-21`;
  }
}

export type { Rect };
