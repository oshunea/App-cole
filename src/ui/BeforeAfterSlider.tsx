import { useRef, useState } from 'react';

interface Props {
  before: string;
  after: string;
}

/** Curseur Avant / Après : l'image « avant » est révélée à gauche de la poignée. */
export function BeforeAfterSlider({ before, after }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);

  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setRatio(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div
      ref={box}
      className="ba"
      style={{ '--w': `${box.current?.clientWidth ?? 0}px` } as React.CSSProperties}
      role="slider"
      aria-label="Curseur avant / après"
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setRatio((r) => Math.max(0, r - 0.05));
        if (e.key === 'ArrowRight') setRatio((r) => Math.min(1, r + 0.05));
      }}
    >
      <img src={after} alt="Après" />
      <div className="clip" style={{ width: `${ratio * 100}%` }}>
        <img src={before} alt="Avant" />
      </div>
      <div className="handle" style={{ left: `${ratio * 100}%` }}>
        <div className="knob">⇆</div>
      </div>
      <span className="tag" style={{ left: 10 }}>AVANT</span>
      <span className="tag" style={{ right: 10 }}>APRÈS</span>
    </div>
  );
}
