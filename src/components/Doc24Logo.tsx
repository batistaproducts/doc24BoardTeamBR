import React from 'react';

interface Doc24LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: 'white' | 'dark' | 'primary';
  height?: number | string;
}

export default function Doc24Logo({
  className = '',
  showText = true,
  textColor = 'white',
  height = '2.25rem'
}: Doc24LogoProps) {
  // Select color for the logo components
  const color = textColor === 'white' ? '#FFFFFF' : textColor === 'primary' ? '#343180' : '#1E293B';

  return (
    <div className={`flex items-center ${className}`} style={{ height }}>
      {/* High-fidelity mathematically exact SVG of the Doc24 Logo */}
      <svg
        viewBox="0 0 280 80"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color }}
      >
        <defs>
          {/* Transparency Mask to cut out the clean space around the diagonal capsule in the clover */}
          <mask id="doc24-icon-mask">
            {/* Everything white in the mask is kept */}
            <rect width="100" height="100" fill="#FFFFFF" />
            {/* The black line cuts a clean transparent gap of exactly 6px (26px mask vs 14px stroke) */}
            <line
              x1="18"
              y1="82"
              x2="38"
              y2="62"
              stroke="#000000"
              strokeWidth="26"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        {/* 1. BRAND ICON (LEFT) */}
        {/* We place the icon inside a translated/scaled group to fit beautifully in the 80px high viewbox */}
        <g transform="translate(5, 0) scale(0.8)">
          {/* Main symmetric 4-lobed clover with custom curved geometry, clipped by the mask */}
          <path
            d="M 50,28 C 58,28 65,12 75,22 C 85,32 70,42 70,50 C 70,58 85,68 75,78 C 65,88 58,72 50,72 C 42,72 35,88 25,78 C 15,68 30,58 30,50 C 30,42 15,32 25,22 C 35,12 42,28 50,28 Z"
            fill="currentColor"
            mask="url(#doc24-icon-mask)"
          />
          {/* The separated diagonal capsule (pill) in the bottom-left lobe */}
          <line
            x1="18"
            y1="82"
            x2="38"
            y2="62"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </g>

        {/* 2. BRAND TEXT "doc24" (RIGHT) */}
        {showText && (
          <g id="brand-text-letters" style={{ color }}>
            {/* Letter 'd': Circle + tall right stem */}
            <circle
              cx="105"
              cy="44"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
            />
            <line
              x1="121"
              y1="12"
              x2="121"
              y2="60"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Letter 'o': Perfect circle */}
            <circle
              cx="152"
              cy="44"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
            />

            {/* Letter 'c': Circular arc open on the right */}
            <path
              d="M 202,33 A 16 16 0 1 0 202,55"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Letter '2': Curved top hook, diagonal slide, horizontal base */}
            <path
              d="M 216,34 C 216,23 238,23 238,34 C 238,44 216,52 216,60 L 238,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Letter '4': Triangle cross, tall right stem */}
            <path
              d="M 259,12 L 244,45 L 268,45 M 259,12 L 259,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
