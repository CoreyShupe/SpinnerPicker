import { useEffect, useRef } from 'react';
import type { Option } from '../api/types';
import { pointOnCircle, slicePath } from '../lib/wheelGeometry';

/**
 * Presentational spinning wheel. Fully controlled: the parent owns `rotation`
 * and toggles `spinning`. When a spin's CSS transition finishes we call
 * `onSpinEnd` so the parent can reveal the result.
 */

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 6;
const LABEL_RADIUS = RADIUS * 0.64;

interface WheelProps {
  options: Option[];
  rotation: number;
  spinning: boolean;
  durationMs: number;
  onSpinEnd: () => void;
}

export function Wheel({ options, rotation, spinning, durationMs, onSpinEnd }: WheelProps) {
  const rotorRef = useRef<HTMLDivElement>(null);

  // Fire onSpinEnd exactly when the rotor's transform transition completes.
  useEffect(() => {
    const rotor = rotorRef.current;
    if (!rotor) return;
    const handle = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') onSpinEnd();
    };
    rotor.addEventListener('transitionend', handle);
    return () => rotor.removeEventListener('transitionend', handle);
  }, [onSpinEnd]);

  const count = options.length;
  const slice = count > 0 ? 360 / count : 360;

  return (
    <div className="wheel-stage" style={{ width: SIZE, height: SIZE }}>
      <div className="wheel-pointer" aria-hidden />
      <div
        ref={rotorRef}
        className="wheel-rotor"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${durationMs}ms cubic-bezier(0.15, 0.9, 0.25, 1)`
            : 'none',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img"
             aria-label="Picker wheel">
          {count === 0 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} className="wheel-empty" />
          ) : (
            options.map((opt, i) => {
              const start = i * slice;
              const end = start + slice;
              const mid = start + slice / 2;
              const p = pointOnCircle(CENTER, CENTER, LABEL_RADIUS, mid);
              // Keep labels upright on the lower half of the wheel.
              const textAngle = mid > 90 && mid < 270 ? mid + 180 : mid;
              return (
                <g key={opt.id}>
                  <path
                    d={slicePath(CENTER, CENTER, RADIUS, start, end)}
                    fill={opt.color}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    fill="#fff"
                    fontSize={count > 12 ? 10 : 13}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle} ${p.x} ${p.y})`}
                    className="wheel-label"
                  >
                    {truncate(opt.label, count > 10 ? 10 : 16)}
                  </text>
                </g>
              );
            })
          )}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
                  stroke="rgba(0,0,0,0.25)" strokeWidth={4} />
        </svg>
      </div>
      <div className="wheel-hub" aria-hidden />
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
