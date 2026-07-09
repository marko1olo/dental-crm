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

const FULL_ARCH_WIDTH = 960; // Extra breathing room to prevent any possible subpixel flexbox overflow

const getToothColors = (state: ToothState) => {
  switch (state) {
    case 'Healthy': return { fill: 'var(--tooth-crown-fill)', stroke: 'var(--tooth-root-stroke)', opacity: "1" };
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

  const scaledWidth = cfg.width;
  const scaledHeight = cfg.height;

  const isRightSide = (number >= 21 && number <= 28) || (number >= 31 && number <= 38);
  const transform = `scaleX(${isRightSide ? -1 : 1})`;

  const renderImplant = () => (
    <svg width={scaledWidth} height={scaledHeight} style={{ transform }} viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="none" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
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
    <svg width={scaledWidth} height={scaledHeight} style={{ transform }} viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="none" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
      <g>
        <path d={geom.root} fill="var(--tooth-root-fill, #e2e8f0)" stroke="var(--tooth-root-stroke, #94a3b8)" strokeWidth="1.5" strokeLinejoin="round" />
        {geom.canals && state === 'Filled' && (
          <path d={geom.canals} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        )}
        <path d={geom.crown} fill={colors.fill} fillOpacity={colors.opacity} stroke={colors.stroke} strokeWidth="2.2" strokeLinejoin="round" />
        {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />}
      </g>
    </svg>
  );

  return (
    <div
      className={`tooth-svg-wrapper ${isTop ? "top" : "bottom"}`}
      onClick={(e) => onClick(e, number)}
    >
      {isTop && <span className="tooth-number" style={{ fontSize: scale < 0.85 ? '10px' : undefined }}>{number}</span>}
      {state === 'Implant' || state === 'Planned_Implant' ? renderImplant() : renderStandard()}
      {!isTop && <span className="tooth-number" style={{ fontSize: scale < 0.85 ? '10px' : undefined }}>{number}</span>}
    </div>
  );
};

export const ToothChart: React.FC<ToothChartProps> = ({ teethData, onToothClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const archContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentWidth, setContentWidth] = useState(900);

  useEffect(() => {
    const updateLayout = () => {
      const archEl = archContainerRef.current;
      const contentEl = contentRef.current;
      if (!archEl || !contentEl) return;
      
      const effectiveWidth = window.innerWidth < 640
        ? window.innerWidth - 16
        : archEl.clientWidth;
        
      // Temporarily remove transform to measure true intrinsic width
      const oldTransform = contentEl.style.transform;
      contentEl.style.transform = 'none';
      const trueWidth = contentEl.scrollWidth;
      contentEl.style.transform = oldTransform;
      
      if (trueWidth > 0 && trueWidth !== contentWidth) {
        setContentWidth(trueWidth);
      }

      if (effectiveWidth < trueWidth && trueWidth > 0) {
        setScale(Math.max(0.65, effectiveWidth / trueWidth));
      } else {
        setScale(1);
      }
    };

    updateLayout();
    const ro = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid ResizeObserver loop limit errors
      window.requestAnimationFrame(updateLayout);
    });
    if (archContainerRef.current) ro.observe(archContainerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [contentWidth]);

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
        <div style={{
          width: `${contentWidth * scale}px`,
          height: `${252 * scale}px`,
          margin: '0 auto',
          position: 'relative',
          overflow: 'visible'
        }}>
          <div ref={contentRef} style={{
            width: 'max-content',
            height: '252px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0
          }}>
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
      </div>
    </div>
  );
};
