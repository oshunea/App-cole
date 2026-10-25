import test from 'node:test';
import assert from 'node:assert/strict';
import { footprint, measure, overlaps, openingZone } from '../src/engine/geometry';
import { insertStock, reorganize, suggestStorage, affiliateUrl } from '../src/engine/layout';
import { DemoVision } from '../src/services/vision';

const room = () => new DemoVision().analyzeRoom();

const noOverlap = (r: Awaited<ReturnType<typeof room>>) => {
  const rects = r.furniture.map(footprint);
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) assert.ok(!overlaps(rects[i], rects[j]), `${r.furniture[i].label} / ${r.furniture[j].label}`);
  for (const f of rects) {
    assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= r.width && f.y + f.d <= r.depth);
    for (const o of r.openings.filter((o) => o.kind === 'door')) assert.ok(!overlaps(f, openingZone(o, r)), 'porte dégagée');
  }
};

test('option A : aucun chevauchement, passage >= 75 cm, circulation non dégradée', async () => {
  const t0 = Date.now();
  const out = reorganize(await room());
  assert.ok(Date.now() - t0 < 15000, 'moins de 15 s');
  noOverlap(out.room);
  assert.ok(out.after.passageCm >= 75, `passage ${out.after.passageCm}`);
  assert.ok(out.after.freeAreaM2 >= out.before.freeAreaM2);
  assert.equal(out.room.furniture.length, 5);
});

test('option B : le meuble du stock est intégré sans chevauchement', async () => {
  const r = await room();
  const stock = await new DemoVision().analyzeStockItem();
  const out = insertStock(r, stock);
  noOverlap(out.room);
  assert.equal(out.room.furniture.length, r.furniture.length + 1);
  assert.ok(out.after.passageCm >= 75);
});

test('option C : suggestion posée sans casser le passage, lien affilié valide', async () => {
  const r = reorganize(await room()).room;
  const out = suggestStorage(r);
  assert.ok(out.suggestion);
  noOverlap(out.room);
  assert.ok(out.after.passageCm >= Math.min(75, out.before.passageCm));
  assert.match(affiliateUrl(out.suggestion!), /^https:\/\//);
});

test('measure : pièce vide = grand passage, pièce pleine = 0', () => {
  const empty = { width: 300, depth: 300, openings: [{ kind: 'door' as const, wall: 'S' as const, offset: 100, width: 90 }], furniture: [] };
  assert.ok(measure(empty).passageCm >= 200);
  const full = { ...empty, furniture: [{ id: 'x', label: 'x', w: 300, d: 300, h: 50, x: 0, y: 0, rotated: false, movable: true }] };
  assert.equal(measure(full).passageCm, 0);
});
