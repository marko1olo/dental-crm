import { useState } from 'react';
import { usePatientStore, type ToothStatus } from '../store/patientStore';

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
  Healthy: 'var(--paper)',
  Caries: 'var(--rust)',
  Filling: 'var(--teal-soft)',
  Missing: 'var(--muted)',
  Implant: 'var(--teal)',
  Crown: 'var(--amber)'
};

const STATUS_OPTIONS: ToothStatus[] = ["Healthy", "Caries", "Filling", "Missing", "Implant", "Crown"];

const renderToothSvg = (tooth: number, status: ToothStatus, color: string) => {
  const isUpper = tooth >= 11 && tooth <= 28;
  const transform = isUpper ? "" : "scale(1, -1) translate(0, -50)";
  
  if (status === 'Missing') {
    return (
      <svg width="40" height="50" viewBox="0 0 40 50">
         <line x1="10" y1="15" x2="30" y2="35" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" />
         <line x1="30" y1="15" x2="10" y2="35" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'Implant') {
    return (
      <svg width="40" height="50" viewBox="0 0 40 50" transform={transform}>
         <path d="M16,5 L24,5 L24,20 L16,20 Z" fill="var(--muted)" />
         <path d="M12,20 C12,40 28,40 28,20 Z" fill="var(--paper)" stroke="var(--teal)" strokeWidth="2" />
         <line x1="14" y1="8" x2="26" y2="8" stroke="var(--paper)" strokeWidth="1" />
         <line x1="14" y1="12" x2="26" y2="12" stroke="var(--paper)" strokeWidth="1" />
         <line x1="14" y1="16" x2="26" y2="16" stroke="var(--paper)" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg width="40" height="50" viewBox="0 0 40 50" transform={transform}>
      {/* Roots */}
      <path d="M14,25 C14,10 12,5 18,5 C19,5 20,15 20,15 C20,15 21,5 22,5 C28,5 26,10 26,25 Z" fill="var(--paper)" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Crown */}
      <path d="M10,25 C10,42 30,42 30,25 C30,22 10,22 10,25 Z" fill={color} stroke="var(--line-strong)" strokeWidth="2" strokeLinejoin="round" />
      
      {status === 'Caries' && (
        <circle cx="20" cy="32" r="3.5" fill="var(--ink)" opacity="0.8" />
      )}
      {status === 'Filling' && (
        <path d="M15,30 C15,26 25,26 25,30 C25,34 15,34 15,30 Z" fill="var(--teal)" opacity="0.9" />
      )}
      {status === 'Crown' && (
        <path d="M8,25 C8,45 32,45 32,25 C32,20 8,20 8,25 Z" fill="var(--amber)" opacity="0.7" stroke="var(--amber)" strokeWidth="1" />
      )}
    </svg>
  );
};

export function Odontogram() {
  const { odontogramState, setToothStatus } = usePatientStore();
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  const handleToothClick = (tooth: number) => {
    const currentStatus = odontogramState[tooth] || 'Healthy';
    const currentIndex = STATUS_OPTIONS.indexOf(currentStatus);
    const nextStatus = STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length] as ToothStatus;
    setToothStatus(tooth, nextStatus);
  };

  const renderTooth = (tooth: number) => {
    const status = (odontogramState[tooth] || 'Healthy') as ToothStatus;
    const color = STATUS_COLORS[status];
    const isHovered = hoveredTooth === tooth;

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
          padding: '4px',
          borderRadius: '8px',
          transition: 'var(--transition-smooth)',
          background: isHovered ? 'var(--glass-bg)' : 'transparent',
        }}
        onMouseEnter={() => setHoveredTooth(tooth)}
        onMouseLeave={() => setHoveredTooth(null)}
        onClick={() => handleToothClick(tooth)}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: isHovered ? 'var(--teal-dark)' : 'var(--ink)' }}>{tooth}</span>
        
        {/* SVG Tooth representation */}
        <div style={{
          transition: 'var(--transition-smooth)',
          transform: isHovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
          filter: isHovered ? 'drop-shadow(var(--shadow-premium))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
        }}>
          {renderToothSvg(tooth, status, color)}
        </div>

        {/* Tooltip */}
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '10px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: 'var(--shadow-premium)',
          opacity: isHovered ? 1 : 0,
          transition: 'var(--transition-fast)',
        }}>
          Зуб {tooth}: {status}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'var(--glass-bg)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-premium)',
      backdropFilter: 'var(--glass-blur)',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
         <h3 style={{ margin: 0, color: 'var(--teal-dark)', fontSize: '18px', fontWeight: 700 }}>Зубная формула</h3>
         <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
               <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: STATUS_COLORS[s], border: '1px solid var(--line-strong)' }} />
                  {s}
               </div>
            ))}
         </div>
      </div>
      
      {/* Dental Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {/* Upper arch */}
        <div style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'center',
          position: 'relative',
          paddingBottom: '8px',
          borderBottom: '2px solid var(--line-strong)'
        }}>
          {/* Center divider */}
          <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '-8px', width: '2px', background: 'var(--line-strong)', zIndex: 0 }} />
          
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px' }}>
            {UPPER_TEETH.slice(0, 8).map(renderTooth)}
          </div>
          <div style={{ display: 'flex', gap: '4px', paddingLeft: '8px' }}>
            {UPPER_TEETH.slice(8, 16).map(renderTooth)}
          </div>
        </div>

        {/* Lower arch */}
        <div style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'center',
          position: 'relative',
          paddingTop: '8px'
        }}>
          {/* Center divider */}
          <div style={{ position: 'absolute', left: '50%', top: '-8px', bottom: '0', width: '2px', background: 'var(--line-strong)', zIndex: 0 }} />
          
          <div style={{ display: 'flex', gap: '4px', paddingRight: '8px' }}>
            {LOWER_TEETH.slice(0, 8).map(renderTooth)}
          </div>
          <div style={{ display: 'flex', gap: '4px', paddingLeft: '8px' }}>
            {LOWER_TEETH.slice(8, 16).map(renderTooth)}
          </div>
        </div>
      </div>
    </div>
  );
}
