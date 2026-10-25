import React from 'react';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
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
  const door = room.openings.find((o) => o.kind === 'door');

  return (
    <Svg width="100%" viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Plan 2D de la pièce">
      <G x={PAD} y={PAD}>
        <Rect width={room.width} height={room.depth} fill="#F9FAFB" stroke="#111827" strokeWidth={4} />

        {room.openings.map((o, i) => {
          const z = openingZone(o, room, 6);
          return <Rect key={i} x={z.x} y={z.y} width={z.w} height={z.d} fill={o.kind === 'door' ? '#F59E0B' : '#38BDF8'} />;
        })}

        {room.furniture.map((f) => {
          const r = footprint(f);
          const hot = f.id === highlightId;
          return (
            <G key={f.id}>
              <Rect x={r.x} y={r.y} width={r.w} height={r.d} rx={4} fill={hot ? '#BBF7D0' : '#DBEAFE'} stroke={hot ? '#16A34A' : '#3B82F6'} strokeWidth={2} />
              <SvgText x={r.x + r.w / 2} y={r.y + r.d / 2 + 4} fontSize={12} fill="#111827" textAnchor="middle">
                {f.label}
              </SvgText>
            </G>
          );
        })}

        {door && metrics.passageCm > 0 && (
          <G>
            <Line x1={20} y1={room.depth - 120} x2={20 + metrics.passageCm} y2={room.depth - 120} stroke="#DC2626" strokeWidth={2} strokeDasharray="6 4" />
            <SvgText x={20 + metrics.passageCm / 2} y={room.depth - 126} fontSize={12} fill="#DC2626" textAnchor="middle" fontWeight="bold">
              {metrics.passageCm} cm
            </SvgText>
          </G>
        )}

        <SvgText x={room.width / 2} y={-12} fontSize={13} fill="#374151" textAnchor="middle">{room.width} cm</SvgText>
        <SvgText x={-14} y={room.depth / 2} fontSize={13} fill="#374151" textAnchor="middle" transform={`rotate(-90 -14 ${room.depth / 2})`}>
          {room.depth} cm
        </SvgText>
        <SvgText x={room.width / 2} y={room.depth + 26} fontSize={14} fill="#065F46" textAnchor="middle" fontWeight="bold">
          {gainM2 >= 0 ? '+' : ''}{gainM2} m² de circulation libre · {metrics.freeAreaM2} m² au total
        </SvgText>
      </G>
    </Svg>
  );
}
