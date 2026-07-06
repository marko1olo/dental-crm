import React from 'react';
import { Crosshair, Activity, Target, Layers, UnfoldHorizontal, Maximize, Minimize, X } from 'lucide-react';
import * as cornerstoneTools from "@cornerstonejs/tools";

interface DicomToolbarProps {
  activeTool: string;
  setTool: (toolName: string) => void;
  panorexThickness: number;
  setPanorexThickness: (val: number) => void;
  blendMode: 'mip' | 'average';
  setBlendMode: (mode: 'mip' | 'average') => void;
  onGeneratePanorex: () => void;
  onSetWindowLevel?: (lower: number, upper: number) => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  onClose?: () => void;
  isPreview?: boolean;
}

export function DicomToolbar({
  activeTool,
  setTool,
  panorexThickness,
  setPanorexThickness,
  blendMode,
  setBlendMode,
  onGeneratePanorex,
  onSetWindowLevel,
  isMinimized,
  setIsMinimized,
  onClose,
  isPreview = false
}: DicomToolbarProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      backgroundColor: 'rgba(15, 15, 18, 0.95)', 
      backdropFilter: 'blur(16px)', 
      borderBottom: '1px solid rgba(255,255,255,0.06)', 
      padding: '10px 16px', 
      zIndex: 20, 
      gap: '16px', 
      flexShrink: 0 
    }}>
      
      {/* LEFT: Tool group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Tool pills */}
        <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', 
              backgroundColor: activeTool === cornerstoneTools.CrosshairsTool.toolName ? 'rgba(20,184,166,0.18)' : 'transparent', 
              color: activeTool === cornerstoneTools.CrosshairsTool.toolName ? '#2dd4bf' : '#71717a', 
              boxShadow: activeTool === cornerstoneTools.CrosshairsTool.toolName ? '0 0 12px rgba(20,184,166,0.2), inset 0 1px 0 rgba(20,184,166,0.15)' : 'none' 
            }}
            onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
            title="MPR — Кликни левой кнопкой для перекрёстного позиционирования"
          >
            <Crosshair size={14} />
            <span>MPR</span>
          </button>
          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', 
              backgroundColor: activeTool === cornerstoneTools.SplineROITool.toolName ? 'rgba(20,184,166,0.18)' : 'transparent', 
              color: activeTool === cornerstoneTools.SplineROITool.toolName ? '#2dd4bf' : '#71717a', 
              boxShadow: activeTool === cornerstoneTools.SplineROITool.toolName ? '0 0 12px rgba(20,184,166,0.2), inset 0 1px 0 rgba(20,184,166,0.15)' : 'none' 
            }}
            onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
            title="Дуга — нарисуй кривую по зубному ряду для панорамного снимка"
          >
            <Activity size={14} />
            <span>Дуга</span>
          </button>
          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', 
              backgroundColor: activeTool === cornerstoneTools.ProbeTool.toolName ? 'rgba(20,184,166,0.18)' : 'transparent', 
              color: activeTool === cornerstoneTools.ProbeTool.toolName ? '#2dd4bf' : '#71717a', 
              boxShadow: activeTool === cornerstoneTools.ProbeTool.toolName ? '0 0 12px rgba(20,184,166,0.2), inset 0 1px 0 rgba(20,184,166,0.15)' : 'none' 
            }}
            onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
            title="HU Density — клик для измерения плотности Хаунсфилда"
          >
            <Target size={14} />
            <span>Плотность (HU)</span>
          </button>
          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease', 
              backgroundColor: activeTool === 'ImplantTool' ? 'rgba(20,184,166,0.18)' : 'transparent', 
              color: activeTool === 'ImplantTool' ? '#2dd4bf' : '#71717a', 
              boxShadow: activeTool === 'ImplantTool' ? '0 0 12px rgba(20,184,166,0.2), inset 0 1px 0 rgba(20,184,166,0.15)' : 'none' 
            }}
            onClick={() => setTool('ImplantTool')}
            title="Установить Имплантат"
          >
            <Activity size={14} />
            <span>Имплантат</span>
          </button>
        </div>

        {activeTool === 'ImplantTool' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
            <select 
              id="implantBrandSelect"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
              onChange={(e) => {
                const event = new CustomEvent('set-implant-brand', { detail: e.target.value });
                window.dispatchEvent(event);
              }}
            >
              <option value="Osstem TSIII">Osstem TSIII</option>
              <option value="Straumann Bone Level">Straumann Bone Level</option>
              <option value="Nobel Biocare Active">Nobel Biocare Active</option>
            </select>
            <select 
              id="implantSizeSelect"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
              onChange={(e) => {
                const event = new CustomEvent('set-implant-size', { detail: e.target.value });
                window.dispatchEvent(event);
              }}
            >
              <option value="4.0x10.0">4.0 x 10.0 мм</option>
              <option value="4.0x11.5">4.0 x 11.5 мм</option>
              <option value="4.5x10.0">4.5 x 10.0 мм</option>
              <option value="5.0x10.0">5.0 x 10.0 мм</option>
            </select>
          </div>
        )}
        
        {/* Keyboard hints — compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#3f3f46', marginLeft: '4px' }}>
          <span title="Scroll to navigate slices">🖱 Скролл</span>
          <span title="Right click for W/L">R-Click: W/L</span>
          <span title="Middle click to pan">M-Click: Pan</span>
          <span title="Shift + Left click to zoom">⇧+L-Click: Zoom</span>
        </div>
      </div>

      {/* CENTER: W/L Presets */}
      {onSetWindowLevel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', marginRight: '4px' }}>W/L</span>
          <button 
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', backgroundColor: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => onSetWindowLevel(-1000, 3000)}
            onMouseOver={e => e.currentTarget.style.color = '#e4e4e7'}
            onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}
          >Кость</button>
          <button 
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', backgroundColor: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => onSetWindowLevel(-160, 240)}
            onMouseOver={e => e.currentTarget.style.color = '#e4e4e7'}
            onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}
          >Мягкие ткани</button>
          <button 
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', backgroundColor: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => onSetWindowLevel(0, 4000)}
            onMouseOver={e => e.currentTarget.style.color = '#e4e4e7'}
            onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}
          >Эмаль</button>
        </div>
      )}

      {/* RIGHT: Thickness + Panorex + Window controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Thickness control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Layers size={13} color="#52525b" />
          <span style={{ color: '#71717a', fontWeight: 500 }}>Толщина:</span>
          <input 
            type="range" min="0" max="20" step="1" 
            value={panorexThickness} 
            onChange={(e) => setPanorexThickness(Number(e.target.value))}
            style={{ width: '72px', cursor: 'pointer', accentColor: '#0d9488' }}
          />
          <span style={{ minWidth: '36px', textAlign: 'right', fontWeight: 700, color: '#e4e4e7', fontSize: '12px' }}>{panorexThickness} <span style={{ fontWeight: 400, color: '#52525b' }}>мм</span></span>
          
          <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a', margin: '0 2px' }} />
          
          <div style={{ display: 'flex', gap: '3px' }}>
            <button 
              style={{ padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', cursor: panorexThickness === 0 ? 'not-allowed' : 'pointer', border: 'none', opacity: panorexThickness === 0 ? 0.4 : 1, transition: 'all 0.15s ease', backgroundColor: blendMode === 'mip' ? '#3f3f46' : 'transparent', color: blendMode === 'mip' ? '#f4f4f5' : '#52525b' }}
              onClick={() => setBlendMode("mip")}
              disabled={panorexThickness === 0}
            >MIP</button>
            <button 
              style={{ padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', cursor: panorexThickness === 0 ? 'not-allowed' : 'pointer', border: 'none', opacity: panorexThickness === 0 ? 0.4 : 1, transition: 'all 0.15s ease', backgroundColor: blendMode === 'average' ? '#3f3f46' : 'transparent', color: blendMode === 'average' ? '#f4f4f5' : '#52525b' }}
              onClick={() => setBlendMode("average")}
              disabled={panorexThickness === 0}
            >AVG</button>
          </div>
        </div>

        {/* Panorex button */}
        <button 
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)', color: '#fff', padding: '7px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,148,136,0.35)', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s ease', letterSpacing: '0.01em' }}
          onClick={onGeneratePanorex}
          title="Панорама"
        >
          <UnfoldHorizontal size={15} />
          <span>Панорама</span>
        </button>

        {/* Generate Report button */}
        <button 
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '7px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s ease' }}
          onClick={() => {
            const event = new CustomEvent('generate-clinical-report');
            window.dispatchEvent(event);
          }}
          title="Сгенерировать отчет"
        >
          <Layers size={15} />
          <span>Отчет</span>
        </button>
        
        {/* Save Planning Status (Just an indicator/button) */}
        <button 
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s ease' }}
          onClick={() => {
            const event = new CustomEvent('save-ct-planning');
            window.dispatchEvent(event);
          }}
          title="Сохранить"
        >
          <Target size={15} />
          <span>Сохранить</span>
        </button>

        {/* Minimize + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isPreview && (
            <button 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#71717a', transition: 'all 0.2s ease' }}
              onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
              title="Свернуть в угол"
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#e4e4e7'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#71717a'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
          
          {!isPreview && onClose && (
            <button 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', transition: 'all 0.2s ease' }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              title="Закрыть 3D Модуль"
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
