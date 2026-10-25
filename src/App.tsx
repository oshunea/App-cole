import { useMemo, useRef, useState } from 'react';
import { insertStock, reorganize, suggestStorage } from './engine/layout';
import type { LayoutResult, OptionKey, Room } from './engine/types';
import * as ent from './services/entitlements';
import { createVision } from './services/vision';
import { ResultScreen } from './ui/ResultScreen';

type Step =
  | { name: 'capture' }
  | { name: 'options' }
  | { name: 'working'; label: string }
  | { name: 'paywall'; option: OptionKey }
  | { name: 'result'; result: LayoutResult; afterUri: string };

const OPTIONS: { key: OptionKey; title: string; sub: string; badge: string }[] = [
  { key: 'A', title: "Réorganiser avec l'existant", sub: "0 € d'achat · déplace uniquement vos meubles", badge: '1 essai gratuit' },
  { key: 'B', title: 'Intégrer mes meubles en stock', sub: 'Photographiez un meuble de la cave ou du garage', badge: 'Premium' },
  { key: 'C', title: 'Meubles gain de place', sub: 'Repère les angles morts et suggère un rangement', badge: 'Premium' },
];

export function App() {
  const vision = useMemo(createVision, []);
  const roomInput = useRef<HTMLInputElement>(null);
  const stockInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ name: 'capture' });
  const [media, setMedia] = useState<{ file: File; url: string } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [rights, setRights] = useState(ent.load);
  const pendingOption = useRef<OptionKey>('A');

  const fail = (e: unknown) => {
    window.alert(e instanceof Error ? e.message : 'Une erreur est survenue.');
  };

  async function onRoomFile(file?: File) {
    if (!file) return;
    if (media) URL.revokeObjectURL(media.url);
    setMedia({ file, url: URL.createObjectURL(file) });
    setStep({ name: 'working', label: 'Analyse de la pièce…' });
    try {
      setRoom(await vision.analyzeRoom(file, file.type.startsWith('video/')));
      setStep({ name: 'options' });
    } catch (e) {
      fail(e);
      setStep({ name: 'capture' });
    }
  }

  function start(option: OptionKey, current = rights) {
    if (!ent.canUse(current, option)) return setStep({ name: 'paywall', option });
    pendingOption.current = option;
    if (option === 'B') stockInput.current?.click();
    else run(option, current);
  }

  async function run(option: OptionKey, current: ent.Entitlements, stockFile?: File) {
    if (!room || !media) return;
    try {
      let result: LayoutResult;
      if (option === 'B') {
        setStep({ name: 'working', label: 'Détourage du meuble…' });
        result = insertStock(room, await vision.analyzeStockItem(stockFile!));
      } else {
        setStep({ name: 'working', label: 'Calcul du nouvel agencement…' });
        await new Promise((r) => setTimeout(r, 30)); // laisse l'indicateur s'afficher avant le calcul
        result = option === 'A' ? reorganize(room) : suggestStorage(room);
      }
      setStep({ name: 'working', label: 'Génération du rendu…' });
      const afterUri = await vision.renderAfter(media.file, room, result.room);
      setRights(ent.consume(current, option));
      setStep({ name: 'result', result, afterUri });
    } catch (e) {
      fail(e);
      setStep({ name: 'options' });
    }
  }

  function buy(plan: ent.Plan) {
    const next = ent.purchase(rights, plan);
    setRights(next);
    if (step.name === 'paywall') start(step.option, next);
  }

  return (
    <>
      <input ref={roomInput} type="file" accept="image/*,video/*" capture="environment" hidden onChange={(e) => { onRoomFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={stockInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) run(pendingOption.current, rights, f);
      }} />

      {step.name === 'capture' && (
        <main className="screen center">
          <h1>SpaceOpti AI</h1>
          <p className="sub">Prenez une photo ou filmez 10 à 15 secondes de votre pièce : on vous propose un agencement qui gagne de la place.</p>
          <button className="btn" onClick={() => roomInput.current?.click()}>📷 Scanner ma pièce</button>
        </main>
      )}

      {step.name === 'options' && media && room && (
        <main className="screen">
          {media.file.type.startsWith('video/') ? <video className="thumb" src={media.url} muted playsInline /> : <img className="thumb" src={media.url} alt="Votre pièce" />}
          <p className="sub">{room.furniture.length} meubles détectés · {(room.width * room.depth / 10000).toFixed(1)} m²</p>
          {OPTIONS.map((o) => (
            <button key={o.key} className="option" onClick={() => start(o.key)}>
              <div><b>{o.key}. {o.title}</b><span>{o.sub}</span></div>
              <span className={`badge ${ent.canUse(rights, o.key) ? 'free' : ''}`}>
                {ent.isPremium(rights) ? 'Inclus' : o.key === 'A' && rights.freeOptionAUsed ? 'Premium' : o.badge}
              </span>
            </button>
          ))}
          <button className="btn secondary" onClick={() => setStep({ name: 'capture' })}>Reprendre une photo</button>
        </main>
      )}

      {step.name === 'working' && (
        <main className="screen center" aria-live="polite">
          <div className="spinner" />
          <p className="sub" style={{ textAlign: 'center' }}>{step.label}</p>
        </main>
      )}

      {step.name === 'paywall' && (
        <main className="screen center">
          <h1>Passez Premium</h1>
          <p className="sub">Intégration de vos meubles, suggestions gain de place, rendu 3D/vidéo : débloquez tout.</p>
          <button className="btn" onClick={() => buy('pass48h')}>Pass 48 h</button>
          <button className="btn" onClick={() => buy('monthly')}>Abonnement mensuel</button>
          <button className="btn secondary" onClick={() => setStep({ name: 'options' })}>Plus tard</button>
        </main>
      )}

      {step.name === 'result' && media && (
        <ResultScreen result={step.result} beforeUri={media.url} afterUri={step.afterUri} onBack={() => setStep({ name: 'options' })} />
      )}
    </>
  );
}
