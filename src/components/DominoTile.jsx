import React from 'react';

// Decorative and interactive domino tile with configurable pips, brass center spinner rivet, and face-down mode
export default function DominoTile({
  top = 3,
  bottom = 4,
  faceDown = false,
  className = '',
  size = 'md',
  showSpinner = true,
  onClick,
}) {
  const sizes = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 84,
  };
  const s = sizes[size] || sizes.md;
  const half = s; // each half is a square (s x s), total height is s * 2
  const r = s * 0.065; // pip radius

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
    const pips = pipPositions[Math.min(Math.max(0, value), 6)] || [];
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

  if (faceDown) {
    return (
      <svg
        width={s}
        height={s * 2}
        viewBox={`0 0 ${s} ${s * 2}`}
        className={`drop-shadow-sm select-none ${className}`}
        onClick={onClick}
      >
        <defs>
          <linearGradient id={`wood-grad-${s}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D1E16" />
            <stop offset="50%" stopColor="#1E1611" />
            <stop offset="100%" stopColor="#150E0A" />
          </linearGradient>
        </defs>
        {/* Tile base */}
        <rect
          x="1"
          y="1"
          width={s - 2}
          height={s * 2 - 2}
          rx={s * 0.1}
          fill={`url(#wood-grad-${s})`}
          stroke="#DDA15E"
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />
        {/* Inner engraved border */}
        <rect
          x={s * 0.1}
          y={s * 0.1}
          width={s * 0.8}
          height={s * 1.8}
          rx={s * 0.06}
          fill="none"
          stroke="#DDA15E"
          strokeOpacity="0.25"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        {/* Center Bodega Diamond */}
        <polygon
          points={`${s / 2},${s - s * 0.2} ${s / 2 + s * 0.18},${s} ${s / 2},${s + s * 0.2} ${s / 2 - s * 0.18},${s}`}
          fill="#DDA15E"
          fillOpacity="0.5"
        />
        <circle cx={s / 2} cy={s} r={s * 0.04} fill="#1E1611" />
      </svg>
    );
  }

  return (
    <svg
      width={s}
      height={s * 2}
      viewBox={`0 0 ${s} ${s * 2}`}
      className={`drop-shadow-sm select-none ${className}`}
      onClick={onClick}
    >
      {/* Bone/Ivory Tile body */}
      <rect
        x="1"
        y="1"
        width={s - 2}
        height={s * 2 - 2}
        rx={s * 0.1}
        fill="#F7F4EE"
        stroke="#1E1611"
        strokeWidth="1.5"
      />

      {/* Subtle 3D inner edge highlight */}
      <rect
        x="2.5"
        y="2.5"
        width={s - 5}
        height={s * 2 - 5}
        rx={s * 0.08}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeOpacity="0.8"
      />

      {/* Center divider groove */}
      <line
        x1={s * 0.12}
        y1={half}
        x2={s * 0.88}
        y2={half}
        stroke="#1E1611"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Center brass pivot spinner rivet */}
      {showSpinner && (
        <g>
          <circle cx={s / 2} cy={half} r={s * 0.048} fill="#DDA15E" stroke="#1E1611" strokeWidth="0.6" />
          <circle cx={s / 2 - s * 0.012} cy={half - s * 0.012} r={s * 0.015} fill="#FFF3D4" />
        </g>
      )}

      {/* Pips */}
      {renderPips(top, 0)}
      {renderPips(bottom, half)}
    </svg>
  );
}
