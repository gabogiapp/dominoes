import React from 'react';

// Decorative domino tile with configurable pip values
export default function DominoTile({ top = 3, bottom = 4, className = '', size = 'md' }) {
  const sizes = { sm: 32, md: 48, lg: 64 };
  const s = sizes[size] || sizes.md;
  const half = s / 2;
  const r = s * 0.06;

  const pipPositions = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
  };

  const renderPips = (value, yOffset) => {
    const pips = pipPositions[Math.min(value, 6)] || [];
    return pips.map(([px, py], i) => (
      <circle
        key={`${yOffset}-${i}`}
        cx={px * s * 0.8 + s * 0.1}
        cy={py * half * 0.8 + yOffset + half * 0.1}
        r={r}
        fill="#1E1611"
      />
    ));
  };

  return (
    <svg width={s} height={s * 2} viewBox={`0 0 ${s} ${s * 2}`} className={className}>
      <rect x="1" y="1" width={s - 2} height={s * 2 - 2} rx={s * 0.08} fill="#F7F4EE" stroke="#1E1611" strokeWidth="1.5" />
      <line x1={s * 0.15} y1={half} x2={s * 0.85} y2={half} stroke="#1E1611" strokeWidth="1" />
      {renderPips(top, 0)}
      {renderPips(bottom, half)}
    </svg>
  );
}
