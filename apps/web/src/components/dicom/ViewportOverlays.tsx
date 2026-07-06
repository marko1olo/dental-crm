import React from 'react';
import { Maximize } from 'lucide-react';

interface ViewportOverlaysProps {
  patientName?: string;
  patientDate?: string;
  viewportType: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'VR' | 'PANOREX' | 'CROSS_SECTION';
  wl?: number;
  ww?: number;
  thickness?: number;
  zoom?: number;
  fov?: string;
  orientationMarkers?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  vrPreset?: string;
  onMaximize?: () => void;
  color?: string;
}

export function ViewportOverlays({
  patientName = 'Иванов И. И.',
  patientDate = '05.07.2026',
  viewportType,
  wl = 400,
  ww = 1500,
  thickness = 0.2,
  zoom = 120,
  fov = '15x15 cm',
  orientationMarkers,
  vrPreset,
  onMaximize,
  color = '#a1a1aa'
}: ViewportOverlaysProps) {
  
  // Base styles to ensure strict layout and no CLS
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    color: '#a1a1aa',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 10,
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const getViewportColor = () => {
    switch (viewportType) {
      case 'AXIAL': return '#ef4444'; // Red
      case 'SAGITTAL': return '#4ade80'; // Green
      case 'CORONAL': return '#60a5fa'; // Blue
      case 'VR': return '#f59e0b'; // Amber
      case 'PANOREX': return '#2dd4bf'; // Teal
      case 'CROSS_SECTION': return '#a78bfa'; // Purple
      default: return color;
    }
  };

  const accentColor = getViewportColor();

  return (
    <>
      {/* TOP LEFT: Patient Info / VR Preset */}
      <div style={{ ...baseStyle, top: '8px', left: '8px' }}>
        {viewportType === 'VR' ? (
          <>
            3D Volume Rendering<br/>
            <span style={{ color: accentColor }}>Preset: {vrPreset || 'CT-Bone'}</span>
          </>
        ) : (
          <>
            Пациент: {patientName}<br/>
            <span style={{ color: '#71717a' }}>{patientDate}</span>
          </>
        )}
      </div>

      {/* TOP RIGHT: Viewport Type & Maximize */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '8px', 
          right: '8px', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          color: accentColor, 
          fontSize: '12px', 
          fontWeight: 700, 
          letterSpacing: '0.05em', 
          zIndex: 10, 
          border: `1px solid ${accentColor}4D`, // 30% opacity hex
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          userSelect: 'none', 
          pointerEvents: onMaximize ? 'auto' : 'none',
          cursor: onMaximize ? 'pointer' : 'default'
        }}
        onClick={onMaximize ? (e) => { e.stopPropagation(); onMaximize(); } : undefined}
      >
        <Maximize size={12} style={{ opacity: 0.7 }} /> {viewportType}
      </div>

      {/* BOTTOM LEFT: Window Level / Thickness */}
      {viewportType !== 'VR' && (
        <div style={{ ...baseStyle, bottom: '8px', left: '8px' }}>
          WL: {wl} WW: {ww}<br/>
          <span style={{ color: '#71717a' }}>T: {thickness.toFixed(2)} mm</span>
        </div>
      )}

      {/* BOTTOM RIGHT: Zoom / FOV */}
      {viewportType !== 'VR' && (
        <div style={{ ...baseStyle, bottom: '8px', right: '8px', textAlign: 'right' }}>
          Zoom: {zoom}%<br/>
          <span style={{ color: '#71717a' }}>FOV: {fov}</span>
        </div>
      )}

      {/* ORIENTATION MARKERS */}
      {orientationMarkers && (
        <>
          {orientationMarkers.top && <div style={{ ...baseStyle, top: '4px', left: '50%', transform: 'translateX(-50%)', color: '#52525b' }}>{orientationMarkers.top}</div>}
          {orientationMarkers.bottom && <div style={{ ...baseStyle, bottom: '4px', left: '50%', transform: 'translateX(-50%)', color: '#52525b' }}>{orientationMarkers.bottom}</div>}
          {orientationMarkers.left && <div style={{ ...baseStyle, top: '50%', left: '4px', transform: 'translateY(-50%)', color: '#52525b' }}>{orientationMarkers.left}</div>}
          {orientationMarkers.right && <div style={{ ...baseStyle, top: '50%', right: '4px', transform: 'translateY(-50%)', color: '#52525b' }}>{orientationMarkers.right}</div>}
        </>
      )}
    </>
  );
}
