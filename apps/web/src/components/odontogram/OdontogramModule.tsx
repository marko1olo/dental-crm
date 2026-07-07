import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ToothChart, ToothData, ToothState } from './ToothChart';
import { TreatmentEstimator } from './TreatmentEstimator';
import { Check, X, Stethoscope, AlertTriangle } from 'lucide-react';
import './odontogram.css';

export const OdontogramModule = ({ patientId }: { patientId: string }) => {
  const [teethData, setTeethData] = useState<ToothData[]>([]);
  const [menuConfig, setMenuConfig] = useState<{ toothNumber: number; x: number; y: number; position: 'top' | 'bottom' } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Load states from API
  useEffect(() => {
    fetch(`/api/patients/${patientId}/tooth-states`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.states) {
          setTeethData(data.states);
        }
      });
      
    // Listen to CT Events for auto-implants
    const handleClinicalCollision = (e: any) => {
       // Just an example sync point: If an implant is placed on 36
       if (e.detail?.toothNumber) {
          updateToothState(e.detail.toothNumber, 'Planned_Implant');
       }
    };
    window.addEventListener('clinical-implant-placed', handleClinicalCollision);
    
    const handleFinding = (e: any) => {
        if (e.detail?.toothNumber && e.detail?.finding) {
            updateToothState(e.detail.toothNumber, e.detail.finding);
        }
    };
    window.addEventListener('clinical-finding-detected', handleFinding);
    
    return () => {
        window.removeEventListener('clinical-implant-placed', handleClinicalCollision);
        window.removeEventListener('clinical-finding-detected', handleFinding);
    };
  }, [patientId]);

  const updateToothState = async (toothNumber: number, state: ToothState) => {
    setTeethData(prev => {
      const existing = prev.find(t => t.toothNumber === toothNumber);
      if (existing) {
        return prev.map(t => t.toothNumber === toothNumber ? { ...t, state } : t);
      }
      return [...prev, { toothNumber, state }];
    });

    setMenuConfig(null);

    // Save to API
    await fetch(`/api/patients/${patientId}/tooth-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toothNumber, state })
    });
  };

  return (
    <div className="odontogram-module">
      <div className="odontogram-chart-area" ref={containerRef}>
        <ToothChart 
          teethData={teethData} 
          onToothClick={(toothNumber, rect) => {
            const isUpperJaw = toothNumber < 30;
            // Use viewport coords so portal can position correctly regardless of stacking context
            const menuW = 254;
            const menuH = 184;
            const gap = 12;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let x = rect.left + rect.width / 2 - menuW / 2;
            let y = isUpperJaw ? rect.bottom + gap : rect.top - menuH - gap;

            // Clamp horizontally
            x = Math.max(8, Math.min(x, vw - menuW - 8));
            // Clamp vertically — flip side if no room
            if (isUpperJaw && y + menuH > vh - 8) {
              y = rect.top - menuH - gap;
            } else if (!isUpperJaw && y < 8) {
              y = rect.bottom + gap;
            }
            y = Math.max(8, Math.min(y, vh - menuH - 8));

            setMenuConfig({ toothNumber, x, y, position: isUpperJaw ? 'bottom' : 'top' });
          }} 
        />
        
        {/* Radial Menu via Portal — avoids backdrop-filter stacking context bug */}
        {menuConfig && createPortal(
          <>
            {/* Backdrop */}
            <div 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} 
              onClick={() => setMenuConfig(null)} 
            />
            <div 
              className={`tooth-radial-menu caret-${menuConfig.position === 'bottom' ? 'top' : 'bottom'}`}
              style={{ 
                position: 'fixed',
                left: menuConfig.x, 
                top: menuConfig.y,
                transform: 'none',
                zIndex: 9999,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ gridColumn: 'span 2', textAlign: 'center', marginBottom: '8px', color: '#f4f4f5', fontWeight: 'bold' }}>
                Зуб {menuConfig.toothNumber}
              </div>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Caries')} className="tooth-menu-btn caries">
                Кариес
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Pulpitis')} className="tooth-menu-btn">
                Пульпит
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Implant')} className="tooth-menu-btn implant">
                Имплантат
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Crown')} className="tooth-menu-btn crown">
                Коронка
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Missing')} className="tooth-menu-btn missing">
                Отсутствует
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Healthy')} className="tooth-menu-btn filled">
                Здоров
              </button>
            </div>
          </>,
          document.body
        )}
      </div>

      <div className="odontogram-treatment-area">
        <TreatmentEstimator patientId={patientId} currentTeeth={teethData} />
      </div>
    </div>
  );
};
