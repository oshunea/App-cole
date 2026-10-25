import type { Furniture, Room } from '../engine/types';

/**
 * Contrat avec le backend IA. Le MVP embarque une implémentation de démonstration (`DemoVision`) ;
 * en production, `HttpVision` appelle un serveur qui fait la segmentation (SAM), l'estimation des
 * dimensions (RoomPlan/ARKit ou depth model), l'inpainting et le rendu photoréaliste.
 */
export interface VisionService {
  /** Détecte murs, ouvertures et meubles (détourés) depuis une photo ou une vidéo. */
  analyzeRoom(mediaUri: string, isVideo: boolean): Promise<Room>;
  /** Détoure un meuble stocké ailleurs et estime ses dimensions. */
  analyzeStockItem(photoUri: string): Promise<Omit<Furniture, 'x' | 'y' | 'rotated' | 'movable'>>;
  /** Rendu « après » vu sous le même angle ; renvoie l'URI de l'image générée. */
  renderAfter(mediaUri: string, before: Room, after: Room): Promise<string>;
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
  async renderAfter(mediaUri: string): Promise<string> {
    // Pas de moteur de rendu dans le MVP local : on renvoie la photo source.
    await delay(800);
    return mediaUri;
  }
}

export class HttpVision implements VisionService {
  constructor(private baseUrl: string, private token?: string) {}

  private async post<T>(path: string, body: FormData | string, json = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body,
    });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }

  private media(uri: string, extra: Record<string, string> = {}): FormData {
    const form = new FormData();
    form.append('media', { uri, name: 'capture', type: 'application/octet-stream' } as unknown as Blob);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    return form;
  }

  analyzeRoom(uri: string, isVideo: boolean) {
    return this.post<Room>('/v1/analyze-room', this.media(uri, { video: String(isVideo) }));
  }
  analyzeStockItem(uri: string) {
    return this.post<Awaited<ReturnType<VisionService['analyzeStockItem']>>>('/v1/analyze-item', this.media(uri));
  }
  async renderAfter(uri: string, before: Room, after: Room) {
    const r = await this.post<{ url: string }>('/v1/render', this.media(uri, { before: JSON.stringify(before), after: JSON.stringify(after) }));
    return r.url;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createVision(): VisionService {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? new HttpVision(url, process.env.EXPO_PUBLIC_API_TOKEN) : new DemoVision();
}
