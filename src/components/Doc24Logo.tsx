import React from 'react';

interface Doc24LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: 'white' | 'dark' | 'primary';
  height?: number | string;
}

// Antonio Batista - SEG_002 - Componente de exibição da logomarca oficial da Doc24 com ajuste dinâmico de temas e cores via CSS filter.
export default function Doc24Logo({
  className = '',
  showText = true,
  textColor = 'white',
  height = '2.25rem'
}: Doc24LogoProps) {
  // Use professional CSS filters to adapt the white logo image to our layout themes
  let filterStyle: React.CSSProperties = {};
  if (textColor === 'primary') {
    // Precise conversion from white to Doc24 Primary Purple/Indigo (#343180)
    // We convert white to black first with brightness(0) saturate(100%), then apply the optimized filter
    filterStyle = { filter: 'brightness(0) saturate(100%) invert(16%) sepia(30%) saturate(2772%) hue-rotate(203deg) brightness(85%) contrast(80%)' };
  } else if (textColor === 'dark') {
    // Precise conversion from white to slate-800 dark gray (#1E293B)
    filterStyle = { filter: 'brightness(0) saturate(100%) invert(14%) sepia(13%) saturate(1239%) hue-rotate(178deg) brightness(94%) contrast(89%)' };
  }

  return (
    <div className={`flex items-center ${className}`} style={{ height }}>
      <img
        src="https://doc24.com.br/wp-content/uploads/2024/08/doc24_iso_w.png"
        alt="Doc24"
        className="h-full w-auto object-contain"
        style={filterStyle}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

