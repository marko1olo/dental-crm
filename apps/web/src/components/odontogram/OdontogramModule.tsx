import React, { useState, useEffect } from 'react';
import { ToothChart, ToothData, ToothState } from './ToothChart';
import { TreatmentEstimator } from './TreatmentEstimator';
import { Check, X, Stethoscope, AlertTriangle } from 'lucide-react';
import './odontogram.css';

export const OdontogramModule = ({ patientId }: { patientId: string }) => {
  const [teethData, setTeethData] = useState<ToothData[]>([]);
  const [menuConfig, setMenuConfig] = useState<{ toothNumber: number; x: number; y: number } | null>(null);

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
      <div className="odontogram-chart-area">
        <ToothChart 
          teethData={teethData} 
          onToothClick={(toothNumber, rect) => {
            setMenuConfig({ toothNumber, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }} 
        />
        
        {/* Radial Menu Popup */}
        {menuConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setMenuConfig(null)}>
            <div 
              className="absolute bg-zinc-900 border border-zinc-700 p-4 rounded-2xl shadow-2xl flex flex-wrap gap-2 w-64"
              style={{ left: menuConfig.x - 128, top: menuConfig.y + 20 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="w-full text-center text-sm font-bold text-zinc-300 mb-2 border-b border-zinc-700 pb-2">
                Зуб {menuConfig.toothNumber}
              </h3>
              
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Caries')} className="flex-1 min-w-[45%] py-2 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors">
                Кариес
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Pulpitis')} className="flex-1 min-w-[45%] py-2 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 rounded-lg transition-colors">
                Пульпит
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Implant')} className="flex-1 min-w-[45%] py-2 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 rounded-lg transition-colors">
                Имплантат
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Crown')} className="flex-1 min-w-[45%] py-2 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-colors">
                Коронка
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Missing')} className="flex-1 min-w-[45%] py-2 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded-lg transition-colors">
                Отсутствует
              </button>
              <button onClick={() => updateToothState(menuConfig.toothNumber, 'Healthy')} className="flex-1 min-w-[45%] py-2 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/40 rounded-lg transition-colors">
                Здоров
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-[450px]">
        <TreatmentEstimator patientId={patientId} currentTeeth={teethData} />
      </div>
    </div>
  );
};
