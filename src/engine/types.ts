export type Wall = 'N' | 'E' | 'S' | 'W';

/** Toutes les dimensions sont en centimètres, origine en haut à gauche de la pièce (vue de dessus). */
export interface Opening {
  kind: 'door' | 'window';
  wall: Wall;
  /** Position du début de l'ouverture le long du mur (cm). */
  offset: number;
  width: number;
}

export interface Furniture {
  id: string;
  label: string;
  /** Empreinte au sol avant rotation. */
  w: number;
  d: number;
  /** Hauteur, sert à ne pas masquer les fenêtres. */
  h: number;
  x: number;
  y: number;
  rotated: boolean;
  movable: boolean;
  /** Litres de rangement, utile pour l'option C. */
  storage?: number;
}

export interface Room {
  width: number;
  depth: number;
  openings: Opening[];
  furniture: Furniture[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

export type OptionKey = 'A' | 'B' | 'C';

export interface Metrics {
  /** Surface de circulation libre, en m². */
  freeAreaM2: number;
  /** Largeur du passage le plus étroit entre la porte et le fond de la pièce, en cm. */
  passageCm: number;
}

export interface CatalogItem {
  id: string;
  label: string;
  w: number;
  d: number;
  h: number;
  storage: number;
  price: number;
  retailer: 'IKEA' | 'Leroy Merlin' | 'Amazon';
  query: string;
}

export interface LayoutResult {
  room: Room;
  before: Metrics;
  after: Metrics;
  gainM2: number;
  moved: string[];
  suggestion?: CatalogItem;
  notes: string[];
}
