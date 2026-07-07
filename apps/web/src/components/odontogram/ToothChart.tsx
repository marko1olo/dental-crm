import React, { useState } from 'react';
import { Settings, Plus, Info, RefreshCw } from 'lucide-react';
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

const getToothColors = (state: ToothState) => {
  switch (state) {
    case 'Healthy': return { fill: '#ffffff', stroke: '#94a3b8', opacity: "1" };
    case 'Caries': return { fill: '#ef4444', stroke: '#b91c1c', opacity: "1" };
    case 'Pulpitis': return { fill: '#a855f7', stroke: '#7e22ce', opacity: "1" };
    case 'Missing': return { fill: '#ffffff', stroke: '#94a3b8', opacity: "0.2" };
    case 'Crown': return { fill: '#60a5fa', stroke: '#2563eb', opacity: "1" };
    case 'Filled': return { fill: '#2dd4bf', stroke: '#0f766e', opacity: "1" };
    case 'Planned_Implant': return { fill: '#fde047', stroke: '#eab308', opacity: "1", isPulsing: true };
    case 'Implant': return { fill: '#fbbf24', stroke: '#d97706', opacity: "1" };
    default: return { fill: '#ffffff', stroke: '#94a3b8', opacity: "1" };
  }
};

const ToothSVG = ({ number, state, onClick }: { number: number; state: ToothState; onClick: (e: React.MouseEvent, num: number) => void }) => {
  const isTop = number < 30;
  const geom = getToothPath(number);
  const cfg = getToothConfig(number);
  const colors = getToothColors(state);

  const renderImplant = () => {
    return (
      <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid slice" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
        <g>
          <path d={geom.root} fill="#27272a" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
          <path d={geom.crown} fill="#ffffff" stroke="#d97706" strokeWidth="2.2" strokeLinejoin="round" />
          <line x1="25" y1="60" x2="75" y2="60" stroke="#d97706" strokeWidth="2" />
          <line x1="30" y1="80" x2="70" y2="80" stroke="#d97706" strokeWidth="2" />
          <line x1="35" y1="100" x2="65" y2="100" stroke="#d97706" strokeWidth="2" />
        </g>
      </svg>
    );
  };

  const renderStandard = () => {
    return (
      <svg width={cfg.width} height={cfg.height} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid slice" className={colors.isPulsing ? 'animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]' : ''}>
        <g>
          {/* Root is slightly darker or standard gray depending on theme. For dark theme let's use slightly muted fill */}
          <path d={geom.root} fill="#27272a" stroke="#52525b" strokeWidth="1.5" strokeLinejoin="round" />
          
          {geom.canals && state === 'Filled' && (
            <path d={geom.canals} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
          )}

          {/* Crown */}
          <path d={geom.crown} fill={state === 'Healthy' ? '#d4d4d8' : colors.fill} fillOpacity={colors.opacity} stroke={colors.stroke} strokeWidth="2.2" strokeLinejoin="round" />
          
          {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />}
        </g>
      </svg>
    );
  };

  return (
    <div 
      className={`tooth-svg-wrapper ${isTop ? "top" : "bottom"}`}
      onClick={(e) => onClick(e, number)}
    >
      {isTop && <span className="tooth-number">{number}</span>}
      
      {state === 'Implant' || state === 'Planned_Implant' ? renderImplant() : renderStandard()}
      
      {!isTop && <span className="tooth-number">{number}</span>}
    </div>
  );
};

export const ToothChart: React.FC<ToothChartProps> = ({ teethData, onToothClick }) => {
  const handleToothClick = (e: React.MouseEvent, num: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onToothClick(num, rect);
  };

  const getToothState = (num: number) => teethData.find(t => t.toothNumber === num)?.state || 'Healthy';

  return (
    <div className="tooth-chart-container">
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

      <div className="tooth-chart-arch-container">
        {/* Top Arch */}
        <div className="tooth-chart-arch top-arch">
          <div className="tooth-chart-quadrant left-quad">
            {TOP_TEETH.slice(0, 8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} onClick={handleToothClick} />
            ))}
          </div>
          <div className="tooth-chart-quadrant right-quad">
            {TOP_TEETH.slice(8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} onClick={handleToothClick} />
            ))}
          </div>
        </div>

        {/* Bottom Arch */}
        <div className="tooth-chart-arch bottom-arch">
          <div className="tooth-chart-quadrant left-quad">
            {BOTTOM_TEETH.slice(0, 8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} onClick={handleToothClick} />
            ))}
          </div>
          <div className="tooth-chart-quadrant right-quad">
            {BOTTOM_TEETH.slice(8).map(num => (
              <ToothSVG key={num} number={num} state={getToothState(num)} onClick={handleToothClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
