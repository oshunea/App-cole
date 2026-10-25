import { footprint, openingZone } from '../engine/geometry';
import type { Metrics, Room } from '../engine/types';

interface Props {
  room: Room;
  metrics: Metrics;
  gainM2: number;
  highlightId?: string;
}

const PAD = 36;

/** Plan 2D vu du dessus avec cotes extérieures, ouvertures et largeur de passage. */
export function FloorPlan({ room, metrics, gainM2, highlightId }: Props) {
  const W = room.width + PAD * 2;
  const H = room.depth + PAD * 2 + 28;
  const hasDoor = room.openings.some((o) => o.kind === 'door');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Plan 2D de la pièce">
      <g transform={`translate(${PAD} ${PAD})`}>
        <rect width={room.width} height={room.depth} fill="#F9FAFB" stroke="#111827" strokeWidth={4} />
        {room.openings.map((o, i) => {
          const z = openingZone(o, room, 6);
          return <rect key={i} x={z.x} y={z.y} width={z.w} height={z.d} fill={o.kind === 'door' ? '#F59E0B' : '#38BDF8'} />;
        })}
        {room.furniture.map((f) => {
          const r = footprint(f);
          const hot = f.id === highlightId;
          return (
            <g key={f.id}>
              <rect x={r.x} y={r.y} width={r.w} height={r.d} rx={4} fill={hot ? '#BBF7D0' : '#DBEAFE'} stroke={hot ? '#16A34A' : '#3B82F6'} strokeWidth={2} />
              <text x={r.x + r.w / 2} y={r.y + r.d / 2 + 4} fontSize={12} textAnchor="middle" fill="#111827">{f.label}</text>
            </g>
          );
        })}
        {hasDoor && metrics.passageCm > 0 && (
          <g fill="#DC2626">
            <line x1={20} y1={room.depth - 120} x2={20 + metrics.passageCm} y2={room.depth - 120} stroke="#DC2626" strokeWidth={2} strokeDasharray="6 4" />
            <text x={20 + metrics.passageCm / 2} y={room.depth - 126} fontSize={12} textAnchor="middle" fontWeight="bold">{metrics.passageCm} cm</text>
          </g>
        )}
        <text x={room.width / 2} y={-12} fontSize={13} textAnchor="middle" fill="#374151">{room.width} cm</text>
        <text x={-14} y={room.depth / 2} fontSize={13} textAnchor="middle" fill="#374151" transform={`rotate(-90 -14 ${room.depth / 2})`}>{room.depth} cm</text>
        <text x={room.width / 2} y={room.depth + 26} fontSize={14} textAnchor="middle" fill="#065F46" fontWeight="bold">
          {gainM2 >= 0 ? '+' : ''}{gainM2} m² de circulation libre · {metrics.freeAreaM2} m² au total
        </text>
      </g>
    </svg>
  );
}
