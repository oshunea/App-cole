import type { Furniture, Metrics, Opening, Rect, Room } from './types';

export const MIN_PASSAGE_CM = 75;
const DOOR_CLEARANCE = 90;

export const round = (n: number, digits = 1): number => {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
};

export const footprint = (f: Furniture): Rect => ({
  x: f.x,
  y: f.y,
  w: f.rotated ? f.d : f.w,
  d: f.rotated ? f.w : f.d,
});

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

/** Zone devant une ouverture (battant de porte ou accès fenêtre) qui doit rester dégagée. */
export function openingZone(o: Opening, room: Pick<Room, 'width' | 'depth'>, depth = DOOR_CLEARANCE): Rect {
  switch (o.wall) {
    case 'N': return { x: o.offset, y: 0, w: o.width, d: depth };
    case 'S': return { x: o.offset, y: room.depth - depth, w: o.width, d: depth };
    case 'W': return { x: 0, y: o.offset, w: depth, d: o.width };
    case 'E': return { x: room.width - depth, y: o.offset, w: depth, d: o.width };
  }
}

export const inside = (r: Rect, room: Pick<Room, 'width' | 'depth'>): boolean =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= room.width && r.y + r.d <= room.depth;

/**
 * Mesure la circulation sur une grille de 10 cm : distance à l'obstacle le plus proche pour chaque cellule,
 * puis chemin le plus large (max-min) depuis la porte jusqu'à la cellule circulable la plus éloignée.
 */
export function measure(room: Room, CELL = 10): Metrics {
  const cols = Math.floor(room.width / CELL);
  const rows = Math.floor(room.depth / CELL);
  const rects = room.furniture.map(footprint);
  const clearance = new Float32Array(cols * rows);
  let freeCells = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      let best = Infinity;
      for (const f of rects) {
        const dx = Math.max(f.x - cx, 0, cx - (f.x + f.w));
        const dy = Math.max(f.y - cy, 0, cy - (f.y + f.d));
        best = Math.min(best, Math.hypot(dx, dy));
      }
      clearance[r * cols + c] = best;
      if (best >= MIN_PASSAGE_CM / 2) freeCells++;
    }
  }
  const freeAreaM2 = round((freeCells * CELL * CELL) / 10000);

  const door = room.openings.find((o) => o.kind === 'door');
  if (!door || cols === 0 || rows === 0) return { freeAreaM2, passageCm: 0 };
  const z = openingZone(door, room, CELL);
  const sc = Math.min(cols - 1, Math.floor((z.x + z.w / 2) / CELL));
  const sr = Math.min(rows - 1, Math.floor((z.y + z.d / 2) / CELL));
  const start = sr * cols + sc;

  // Plus large chemin : propagation du goulot d'étranglement depuis la porte.
  const width = new Float32Array(cols * rows).fill(-1);
  width[start] = clearance[start];
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const c = i % cols;
    const r = (i - c) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const j = nr * cols + nc;
      const w = Math.min(width[i], clearance[j]);
      if (w > width[j]) {
        width[j] = w;
        stack.push(j);
      }
    }
  }

  let far = start;
  let farDist = -1;
  for (let i = 0; i < width.length; i++) {
    if (width[i] < MIN_PASSAGE_CM / 2) continue;
    const dist = Math.hypot((i % cols) - sc, Math.floor(i / cols) - sr);
    if (dist > farDist) {
      farDist = dist;
      far = i;
    }
  }
  const passage = Math.min(width[far] * 2, 300);
  return { freeAreaM2, passageCm: Math.max(0, Math.round(passage)) };
}
