import { useState } from 'react';
import { affiliateUrl } from '../engine/layout';
import type { LayoutResult } from '../engine/types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { FloorPlan } from './FloorPlan';

interface Props {
  result: LayoutResult;
  beforeUri: string;
  afterUri: string;
  onBack: () => void;
}

export function ResultScreen({ result, beforeUri, afterUri, onBack }: Props) {
  const [tab, setTab] = useState<'render' | 'plan'>('render');
  const s = result.suggestion;

  return (
    <main className="screen">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'render'} onClick={() => setTab('render')}>Rendu Avant / Après</button>
        <button role="tab" aria-selected={tab === 'plan'} onClick={() => setTab('plan')}>Plan 2D</button>
      </div>

      {tab === 'render' ? (
        <BeforeAfterSlider before={beforeUri} after={afterUri} />
      ) : (
        <FloorPlan room={result.room} metrics={result.after} gainM2={result.gainM2} highlightId={s && `sugg-${s.id}`} />
      )}

      <div className="stats">
        <div className="stat"><b>{result.gainM2 >= 0 ? '+' : ''}{result.gainM2} m²</b><span>Gain de surface</span></div>
        <div className="stat"><b>{result.before.passageCm} → {result.after.passageCm} cm</b><span>Passage</span></div>
      </div>

      {result.moved.length > 0 && <p className="sub">Déplacé : {result.moved.join(', ')}.</p>}
      {result.notes.map((n) => <p key={n} className="sub">{n}</p>)}

      {s && (
        <>
          <a className="product" href={affiliateUrl(s)} target="_blank" rel="sponsored noopener noreferrer">
            <div><b>{s.label}</b><small>{s.w}×{s.d}×{s.h} cm · {s.storage} L · {s.price} € · {s.retailer}</small></div>
            <em>Voir ›</em>
          </a>
          <p className="disclosure">Lien d'affiliation : nous pouvons percevoir une commission, sans surcoût pour vous.</p>
        </>
      )}

      <button className="btn secondary" onClick={onBack}>Essayer une autre option</button>
    </main>
  );
}
