import React, { useState, useRef } from 'react';

interface DetailMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  zoomLevel?: number;
}

export default function DetailMagnifier({
  src,
  alt,
  className = '',
  zoomLevel = 2.5
}: DetailMagnifierProps) {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Calculate percentage coordinates
    const px = (x / width) * 100;
    const py = (y / height) * 100;

    setPosition({ x: px, y: py });
    setCursorPosition({ x, y });
  };

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-crosshair ${className}`}
      onMouseEnter={() => setShowMagnifier(true)}
      onMouseLeave={() => setShowMagnifier(false)}
      onMouseMove={handleMouseMove}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover select-none pointer-events-none transition-all duration-300 group-hover:scale-102"
        referrerPolicy="no-referrer"
      />
      
      {/* Dynamic Magnifying Glass bubble */}
      {showMagnifier && (
        <div
          className="absolute pointer-events-none border border-white/30 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] bg-no-repeat overflow-hidden transition-opacity duration-150"
          style={{
            width: '180px',
            height: '180px',
            left: `${cursorPosition.x - 90}px`,
            top: `${cursorPosition.y - 90}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomLevel * 100}%`,
            backgroundPosition: `${position.x}% ${position.y}%`,
          }}
        >
          {/* Subtle crosshair inside glass */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/10"></div>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-white/10"></div>
          <div className="absolute top-3 left-[40%] text-[8px] tracking-[0.1em] text-white/50 bg-black/40 px-1 py-0.5 rounded font-mono">
            {zoomLevel}X MACRO
          </div>
        </div>
      )}
    </div>
  );
}
