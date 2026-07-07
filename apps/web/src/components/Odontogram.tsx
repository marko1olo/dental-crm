import { useState } from 'react';
import { usePatientStore, type ToothStatus } from '../store/patientStore';
import { getToothPath, getToothConfig } from "../utils/math/toothGeometry";

const TOOTH_NUMBERS = [
  // Upper right (18 to 11)
  18, 17, 16, 15, 14, 13, 12, 11,
  // Upper left (21 to 28)
  21, 22, 23, 24, 25, 26, 27, 28,
  // Lower right (48 to 41)
  48, 47, 46, 45, 44, 43, 42, 41,
  // Lower left (31 to 38)
  31, 32, 33, 34, 35, 36, 37, 38
];

const UPPER_TEETH = TOOTH_NUMBERS.slice(0, 16);
const LOWER_TEETH = TOOTH_NUMBERS.slice(16, 32);

const STATUS_COLORS: Record<ToothStatus, string> = {
  Healthy: '#ffffff',
  Caries: '#dc2626',
  Filling: '#0ea5e9',
  Missing: '#94a3b8',
  Implant: '#0f766e',
  Crown: '#f59e0b'
};

const STATUS_OPTIONS: ToothStatus[] = ["Healthy", "Caries", "Filling", "Missing", "Implant", "Crown"];

const renderToothSvg = (tooth: number, status: ToothStatus, color: string) => {
  const isUpper = tooth >= 11 && tooth <= 28;
  const geom = getToothPath(tooth);
  const cfg = getToothConfig(tooth);
  
  const scale = 1.0;
  const scaledWidth = `${parseFloat(cfg.width) * scale}px`;
  const scaledHeight = `${parseFloat(cfg.height) * scale}px`;
  
  if (status === 'Missing') {
    return (
      <svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <g>
          <path d={geom.root} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
          <path d={geom.crown} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.15" />
          <path d="M20 20L80 130M80 20L20 130" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        </g>
      </svg>
    );
  }

  if (status === 'Implant') {
    return (
      <svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <g>
          <path d={geom.root} fill="#f1f5f9" stroke="#0f766e" strokeWidth="2" strokeLinejoin="round" />
          <path d={geom.crown} fill="#ffffff" stroke="#0f766e" strokeWidth="2.2" strokeLinejoin="round" />
          <line x1="25" y1="60" x2="75" y2="60" stroke="#0f766e" strokeWidth="2" />
          <line x1="30" y1="80" x2="70" y2="80" stroke="#0f766e" strokeWidth="2" />
          <line x1="35" y1="100" x2="65" y2="100" stroke="#0f766e" strokeWidth="2" />
        </g>
      </svg>
    );
  }

  const fillOpacity = status === 'Healthy' ? "1" : "0.2";
  const strokeColor = status === 'Healthy' ? "#94a3b8" : color;

  return (
    <svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`} preserveAspectRatio="xMidYMid meet">
      <g>
        <path d={geom.root} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeLinejoin="round" />
        
        {geom.canals && status === 'Filling' && (
          <path d={geom.canals} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        )}

        <path d={geom.crown} fill={status === 'Healthy' ? '#ffffff' : color} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth="2.2" strokeLinejoin="round" />
        
        {geom.fissures && <path d={geom.fissures} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />}

        {status === 'Caries' && (
          <circle cx={cfg.viewWidth / 2} cy={isUpper ? 110 : 40} r="8" fill="#dc2626" opacity="0.9" />
        )}
        {status === 'Crown' && (
          <path d={geom.crown} fill="#f59e0b" opacity="0.3" stroke="#f59e0b" strokeWidth="1" />
        )}
      </g>
    </svg>
  );
};

export function Odontogram() {
  const { odontogramState, setToothStatus } = usePatientStore();
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [radialMenuOpen, setRadialMenuOpen] = useState<number | null>(null);

  const handleToothClick = (tooth: number) => {
    // Fitts's Law / Hick's Law: open a radial menu instead of cycling
    setRadialMenuOpen(radialMenuOpen === tooth ? null : tooth);
  };

  const renderTooth = (tooth: number) => {
    const status = (odontogramState[tooth] || 'Healthy') as ToothStatus;
    const color = STATUS_COLORS[status];
    const isHovered = hoveredTooth === tooth;
    const isUpper = tooth >= 11 && tooth <= 28;

    return (
      <div 
        key={tooth} 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
          cursor: 'pointer',
          padding: '2px',
          borderRadius: '8px',
          transition: 'all 0.2s',
          background: isHovered ? '#f1f5f9' : 'transparent',
          width: 'max-content'
        }}
        onMouseEnter={() => setHoveredTooth(tooth)}
        onMouseLeave={() => setHoveredTooth(null)}
        onClick={() => handleToothClick(tooth)}
      >
        {isUpper && <span style={{ fontSize: '15px', fontWeight: 700, color: isHovered ? '#2563eb' : '#475569' }}>{tooth}</span>}
        
        {/* SVG Tooth representation */}
        <div style={{
          transition: 'all 0.2s',
          transform: isHovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
        }}>
          {renderToothSvg(tooth, status, color)}
        </div>

        {!isUpper && <span style={{ fontSize: '15px', fontWeight: 700, color: isHovered ? '#2563eb' : '#475569' }}>{tooth}</span>}

        {/* Tooltip */}
        <div style={{
          position: 'absolute',
          bottom: isUpper ? '100%' : 'auto',
          top: !isUpper ? '100%' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: isUpper ? '12px' : '0',
          marginTop: !isUpper ? '12px' : '0',
          background: '#1e293b',
          color: '#ffffff',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          opacity: isHovered && radialMenuOpen !== tooth ? 1 : 0,
          transition: 'opacity 0.2s',
        }}>
          Зуб {tooth}: {status}
        </div>

        {/* Fitts's Law & Hick's Law: Radial Menu */}
        {radialMenuOpen === tooth && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            width: '160px',
            height: '160px',
            pointerEvents: 'none',
          }}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* Overlay to close */}
              <div 
                style={{ position: 'fixed', top: -9999, left: -9999, right: -9999, bottom: -9999, cursor: 'default', pointerEvents: 'auto' }}
                onClick={(e) => { e.stopPropagation(); setRadialMenuOpen(null); }}
              />
              
              {STATUS_OPTIONS.map((opt, i) => {
                const angle = (i * (360 / STATUS_OPTIONS.length)) - 90;
                const radius = 60;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                
                return (
                  <button
                    key={opt}
                    onClick={(e) => {
                      e.stopPropagation();
                      setToothStatus(tooth, opt);
                      setRadialMenuOpen(null);
                    }}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      width: '44px', // Fitts's Law (min 44px)
                      height: '44px',
                      borderRadius: '50%',
                      background: STATUS_COLORS[opt],
                      border: '2px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      transition: 'transform 0.1s',
                      color: opt === 'Healthy' ? '#000' : '#fff',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    title={opt}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}
                  >
                    {opt.substring(0, 1)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '32px 24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px',
      width: '100%',
      overflowX: 'auto',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
         <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: 700 }}>Зубная формула</h3>
         <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
               <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: STATUS_COLORS[s], border: '1px solid #94a3b8' }} />
                  {s}
               </div>
            ))}
         </div>
      </div>
      
      {/* Dental Grid */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 'max-content', padding: '0 16px' }}>
          {/* Upper arch */}
          <div style={{
            display: 'flex',
            gap: '2px',
            justifyContent: 'center',
            position: 'relative',
            paddingBottom: '12px',
            borderBottom: '3px solid #cbd5e1'
          }}>
            {/* Center divider */}
            <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '-12px', width: '3px', background: '#cbd5e1', zIndex: 0 }} />
            
            <div style={{ display: 'flex', gap: '2px', paddingRight: '8px' }}>
              {UPPER_TEETH.slice(0, 8).map(renderTooth)}
            </div>
            <div style={{ display: 'flex', gap: '2px', paddingLeft: '8px' }}>
              {UPPER_TEETH.slice(8, 16).map(renderTooth)}
            </div>
          </div>

          {/* Lower arch */}
          <div style={{
            display: 'flex',
            gap: '2px',
            justifyContent: 'center',
            position: 'relative',
            paddingTop: '12px'
          }}>
            {/* Center divider */}
            <div style={{ position: 'absolute', left: '50%', top: '-12px', bottom: '0', width: '3px', background: '#cbd5e1', zIndex: 0 }} />
            
            <div style={{ display: 'flex', gap: '2px', paddingRight: '8px' }}>
              {LOWER_TEETH.slice(0, 8).map(renderTooth)}
            </div>
            <div style={{ display: 'flex', gap: '2px', paddingLeft: '8px' }}>
              {LOWER_TEETH.slice(8, 16).map(renderTooth)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
