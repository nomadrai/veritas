"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface ForensicLoupeProps {
  imageSrc: string;
  alt: string;
  zoomFactor?: number;
}

/**
 * Phase 1.5 Scaffold: Optical Magnifier Loupe for High-DPI Certificate Inspection
 * Provides a 3x split-lens magnifier over suspect text spans, stamps, and ELA patches.
 */
export function ForensicLoupe({
  imageSrc,
  alt,
  zoomFactor = 2.8,
}: ForensicLoupeProps) {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div className="relative">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
            enabled
              ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
              : "border-[#CBD5E1] bg-white text-[#475569]"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          {enabled ? "Optical Loupe Active (2.8×)" : "Enable Optical Magnifier Loupe"}
        </button>
      </div>

      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={handleMove}
        className="relative overflow-hidden rounded-md border border-[#CBD5E1] bg-white"
      >
        <img src={imageSrc} alt={alt} className="block h-full w-full object-contain" />
        {enabled && hovering && (
          <div
            style={{
              left: `calc(${pos.x}% - 80px)`,
              top: `calc(${pos.y}% - 80px)`,
              width: "160px",
              height: "160px",
              backgroundImage: `url(${imageSrc})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${zoomFactor * 100}%`,
              backgroundPosition: `${pos.x}% ${pos.y}%`,
            }}
            className="pointer-events-none absolute z-30 rounded-full border-2 border-[#1E3A8A] shadow-xl ring-2 ring-white"
          />
        )}
      </div>
    </div>
  );
}
