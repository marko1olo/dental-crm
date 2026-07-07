import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { getToothPath, getToothConfig } from "../../utils/math/toothGeometry";

export type ToothState = 'Caries' | 'Pulpitis' | 'Missing' | 'Crown' | 'Implant' | 'Filled' | 'Healthy' | 'Planned_Implant';

export interface ToothData {
  toothNumber: number;
  state: ToothState;
}

interface ToothChartProps {
  teethData: ToothData[];
  onToothClick: (toothNumber: number, rect: DOMRect) => void;
}

const TOP_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const BOTTOM_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Full width of one arch at scale=1 (sum of all tooth widths + gaps)
// Widths: teeth 1-2 = 32px, 3 = 36px, 4-5 = 44px, 6-8 = 60px, per quadrant x2
// Per quadrant: 32+32+36+44+44+60+60+60 = 368px, x2 quadrants = 736px + 7*4px gaps per quadrant = 56px total
const FULL_ARCH_WIDTH = 736 + 56; // ~792px

const getToothColors = (state: ToothState) => {
  switch (state) {
    case 'Healthy': return { fill: 'var(--odontogram-paper)', stroke: 'var(--tooth-root-stroke)', opacity: "1" };
    case 'Caries': return { fill: '#ef4444', stroke: '#b91c1c', opacity: "1" };
    case 'Pulpitis': return { fill: '#a855f7', stroke: '#7e22ce', opacity: "1" };
    case 'Missing': return { fill: 'var(--odontogram-paper)', stroke: 'var(--tooth-root-stroke)', opacity: "0.2" };
    case 'Crown': return { fill: '#60a5fa', stroke: '#2563eb', opacity: "1" };
    case 'Filled': return { fill: '#2dd4bf', stroke: '#0f766e', opacity: "1" };
    case 'Planned_Implant': return { fill: '#fde047', stroke: '#eab308', opacity: "1", isPulsing: true };
    case 'Implant': return { fill: '#fbbf24', stroke: '#d97706', opacity: "1" };
    default: return { fill: 'var(--odontogram-paper)', stroke: 'var(--tooth-root-stroke)', opacity: "1" };
  }
};

const ToothSVG = ({ number, state, scale, onClick }: {
  number: number;
  state: ToothState;
  scale: number;
  onClick: (e: React.MouseEvent, num: number) => void;
}) => {
  const isTop = number < 30;
  const geom = getToothPath(number);
  const cfg = getToothConfig(number);
  const colors = getToothColors(state);

  const w = Math.round(parseInt(cfg.width) * scale);
  const h = Math.round(parseInt(cfg.height) * scale);
  const scaledWidth = `${w}px`;
  const scaledHeight = `${h}px`;

  const renderImplant = () => (
    <svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid slice" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
      <g>
        <path d={geom.root} fill="#27272a" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
        <path d={geom.crown} fill="#ffffff" stroke="#d97706" strokeWidth="2.2" strokeLinejoin="round" />
        <line x1="25" y1="60" x2="75" y2="60" stroke="#d97706" strokeWidth="2" />
        <line x1="30" y1="80" x2="70" y2="80" stroke="#d97706" strokeWidth="2" />
        <line x1="35" y1="100" x2="65" y2="100" stroke="#d97706" strokeWidth="2" />
      </g>
    </svg>
  );

  const renderStandard = () => (
    <svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid slice" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
      <g>
        <path d={geom.root} fill="var(--tooth-root-fill, #27272a)" stroke="var(--tooth-root-stroke, #52525b)" strokeWidth="1.5" strokeLinejoin="round" />
        {geom.canals && state === 'Filled' && (
          <path d={geom.canals} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        )}
        <path d={geom.crown} fill={state === 'Healthy' ? 'var(--tooth-crown-fill)' : colors.fill} fillOpacity={colors.opacity} stroke={colors.stroke} strokeWidth="2.2" strokeLinejoin="round" />
        {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />}
      </g>
    </svg>
  );

  return (
    <div
      className={`tooth-svg-wrapper ${isTop ? "top" : "bottom"}`}
      onClick={(e) => onClick(e, number)}
      style={{ padding: scale < 0.85 ? '2px' : '4px' }}
    >
      {isTop && <span className="tooth-number" style={{ fontSize: scale < 0.85 ? '8px' : undefined }}>{number}</span>}
      {state === 'Implant' || state === 'Planned_Implant' ? renderImplant() : renderStandard()}
      {!isTop && <span className="tooth-number" style={{ fontSize: scale < 0.85 ? '8px' : undefined }}>{number}</span>}
    </div>
  );
};

export const ToothChart: React.FC<ToothChartProps> = ({ teethData, onToothClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const archContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      // On mobile: after bleed arch is viewport-wide, so use viewport width as basis
      const effectiveWidth = window.innerWidth < 640
        ? window.innerWidth - 16  // 8px padding on each side inside the bleed
        : containerRef.current.clientWidth - 32;
      if (effectiveWidth < FULL_ARCH_WIDTH) {
        setScale(Math.max(0.45, effectiveWidth / FULL_ARCH_WIDTH));
      } else {
        setScale(1);
      }
    };

    const bleedArch = () => {
      if (!archContainerRef.current) return;
      // Only on mobile viewports
      if (window.innerWidth >= 640) {
        archContainerRef.current.style.marginLeft = '';
        archContainerRef.current.style.marginRight = '';
        archContainerRef.current.style.width = '';
        return;
      }
      const rect = archContainerRef.current.getBoundingClientRect();
      const leftBleed = rect.left; // pixels from viewport left edge
      const rightBleed = window.innerWidth - rect.right; // pixels from viewport right edge
      archContainerRef.current.style.marginLeft = `-${leftBleed}px`;
      archContainerRef.current.style.marginRight = `-${rightBleed}px`;
      archContainerRef.current.style.width = `${window.innerWidth}px`;
    };

    updateLayout();
    bleedArch();

    const ro = new ResizeObserver(() => {
      updateLayout();
      bleedArch();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleToothClick = (e: React.MouseEvent, num: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onToothClick(num, rect);
  };

  const getToothState = (num: number) => teethData.find(t => t.toothNumber === num)?.state || 'Healthy';

  return (
    <div className="tooth-chart-container" ref={containerRef}>
      <div className="tooth-chart-header">
        <h2 className="tooth-chart-title">
          <Settings size={18} className="text-zinc-400" />
          Зубная Формула (FDI)
        </h2>
        <div className="tooth-chart-legend">
          <span className="tooth-chart-legend-item"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Кариес</span>
          <span className="tooth-chart-legend-item"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Имплантат</span>
          <span className="tooth-chart-legend-item"><div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div> Коронка</span>
          <span className="tooth-chart-legend-item"><div className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-pulse shadow-[0_0_5px_#fde047]"></div> План КТ</span>
        </div>
      </div>

      <div className="tooth-chart-arch-container" ref={archContainerRef}>
        {/* Top Arch */}
        <div className="tooth-chart-arch top-arch">
          <div className="tooth-chart-quadrant left-quad">
            {TOP_TEETH.slice(0, 8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} scale={scale} onClick={handleToothClick} />
            ))}
          </div>
          <div className="tooth-chart-quadrant right-quad">
            {TOP_TEETH.slice(8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} scale={scale} onClick={handleToothClick} />
            ))}
          </div>
        </div>

        {/* Bottom Arch */}
        <div className="tooth-chart-arch bottom-arch">
          <div className="tooth-chart-quadrant left-quad">
            {BOTTOM_TEETH.slice(0, 8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} scale={scale} onClick={handleToothClick} />
            ))}
          </div>
          <div className="tooth-chart-quadrant right-quad">
            {BOTTOM_TEETH.slice(8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} scale={scale} onClick={handleToothClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
