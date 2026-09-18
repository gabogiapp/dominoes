import React from 'react';

/**
 * Miniature standing Domino Tile component specifically tailored for
 * in-navbar navigation indicators, badges, and micro-interactions.
 */
export default function MiniDomino({ top = 6, bottom = 6, className = '' }) {
  const renderPips = (value, yOffset) => {
    const v = Math.max(0, Math.min(6, Math.floor(value)));
    const positions = {
      0: [],
      1: [[6.5, 6]],
      2: [[3.6, 3.2], [9.4, 8.8]],
      3: [[3.6, 3.2], [6.5, 6], [9.4, 8.8]],
      4: [[3.6, 3.2], [9.4, 3.2], [3.6, 8.8], [9.4, 8.8]],
      5: [[3.6, 3.2], [9.4, 3.2], [6.5, 6], [3.6, 8.8], [9.4, 8.8]],
      6: [
        [3.6, 3.2], [9.4, 3.2],
        [3.6, 6.0], [9.4, 6.0],
        [3.6, 8.8], [9.4, 8.8],
      ],
    };

    const pips = positions[v] || [];
    return pips.map(([px, py], i) => (
      <circle
        key={`${yOffset}-${i}`}
        cx={px}
        cy={py + yOffset}
        r={0.9}
        fill="#1E1611"
      />
    ));
  };

  return (
    <svg
      width="13"
      height="22"
      viewBox="0 0 13 22"
      className={`shrink-0 drop-shadow-xs select-none ${className}`}
      aria-hidden="true"
    >
      {/* Ivory Bone Body */}
      <rect
        x="0.5"
        y="0.5"
        width="12"
        height="21"
        rx="2"
        fill="#F7F4EE"
        stroke="#1E1611"
        strokeWidth="0.8"
      />

      {/* Subtle Inner Highlight */}
      <rect
        x="1.3"
        y="1.3"
        width="10.4"
        height="19.4"
        rx="1.4"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.8"
        strokeWidth="0.5"
      />

      {/* Center Dividing Groove */}
      <line
        x1="1"
        y1="11"
        x2="12"
        y2="11"
        stroke="#1E1611"
        strokeWidth="0.75"
        strokeLinecap="round"
      />

      {/* Center Brass Spinner Pivot */}
      <circle
        cx="6.5"
        cy="11"
        r="0.9"
        fill="#DDA15E"
        stroke="#1E1611"
        strokeWidth="0.3"
      />
      <circle
        cx="6.2"
        cy="10.7"
        r="0.3"
        fill="#FFF3D4"
      />

      {/* Pips */}
      {renderPips(top, 0)}
      {renderPips(bottom, 11)}
    </svg>
  );
}
