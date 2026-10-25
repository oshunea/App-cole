import type { Furniture, Room } from '../engine/types';

/**
 * Contrat avec le backend IA. Le MVP embarque une implémentation de démonstration (`DemoVision`) ;
 * en production, `HttpVision` appelle un serveur qui fait la segmentation (SAM), l'estimation des
 * dimensions (RoomPlan/ARKit ou depth model), l'inpainting et le rendu photoréaliste.
 */
export interface VisionService {
  /** Détecte murs, ouvertures et meubles (détourés) depuis une photo ou une vidéo. */
  analyzeRoom(media: File, isVideo: boolean): Promise<Room>;
  /** Détoure un meuble stocké ailleurs et estime ses dimensions. */
  analyzeStockItem(photo: File): Promise<Omit<Furniture, 'x' | 'y' | 'rotated' | 'movable'>>;
  /** Rendu « après » vu sous le même angle ; renvoie l'URI de l'image générée. */
  renderAfter(media: File, before: Room, after: Room): Promise<string>;
}

const DEMO_ROOM: Room = {
  width: 450,
  depth: 380,
  openings: [
    { kind: 'door', wall: 'S', offset: 40, width: 90 },
    { kind: 'window', wall: 'N', offset: 150, width: 140 },
  ],
  furniture: [
    { id: 'sofa', label: 'Canapé', w: 220, d: 95, h: 85, x: 120, y: 140, rotated: false, movable: true },
    { id: 'table', label: 'Table basse', w: 100, d: 55, h: 40, x: 180, y: 250, rotated: false, movable: true },
    { id: 'tv', label: 'Meuble TV', w: 160, d: 40, h: 50, x: 20, y: 60, rotated: false, movable: true, storage: 120 },
    { id: 'shelf', label: 'Bibliothèque', w: 90, d: 35, h: 190, x: 300, y: 260, rotated: false, movable: true, storage: 200 },
    { id: 'armchair', label: 'Fauteuil', w: 80, d: 80, h: 80, x: 330, y: 120, rotated: false, movable: true },
  ],
};

export class DemoVision implements VisionService {
  async analyzeRoom(): Promise<Room> {
    await delay(600);
    return structuredClone(DEMO_ROOM);
  }
  async analyzeStockItem() {
    await delay(400);
    return { id: 'stock-1', label: 'Commode (stock)', w: 90, d: 45, h: 85, storage: 150 };
  }
  async renderAfter(media: File): Promise<string> {
    // Pas de moteur de rendu dans le MVP local : on renvoie la photo source.
    await delay(800);
    return URL.createObjectURL(media);
  }
}

export class HttpVision implements VisionService {
  constructor(private baseUrl: string, private token?: string) {}

  private async post<T>(path: string, form: FormData): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  private form(file: File, extra: Record<string, string> = {}): FormData {
    const form = new FormData();
    form.append('media', file);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    return form;
  }

  analyzeRoom(file: File, isVideo: boolean) {
    return this.post<Room>('/v1/analyze-room', this.form(file, { video: String(isVideo) }));
  }
  analyzeStockItem(file: File) {
    return this.post<Awaited<ReturnType<VisionService['analyzeStockItem']>>>('/v1/analyze-item', this.form(file));
  }
  async renderAfter(file: File, before: Room, after: Room) {
    const r = await this.post<{ url: string }>('/v1/render', this.form(file, { before: JSON.stringify(before), after: JSON.stringify(after) }));
    return r.url;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createVision(): VisionService {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  const url = env.VITE_API_URL;
  return url ? new HttpVision(url, env.VITE_API_TOKEN) : new DemoVision();
}
