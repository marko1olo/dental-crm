import React, { useState, useEffect } from 'react';
import { ToothData, ToothState } from './ToothChart';
import { FileText, Save, Calculator, AlertTriangle, Plus, Trash2, ShieldCheck, HeartPulse } from 'lucide-react';

interface EstimatorProps {
  patientId: string;
  currentTeeth: ToothData[];
}

interface PlanItem {
  id?: string;
  toothNumber?: number;
  priceId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  phase: number;
}

export const TreatmentEstimator: React.FC<EstimatorProps> = ({ patientId, currentTeeth }) => {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);

  // Auto-suggestions based on currentTeeth
  useEffect(() => {
    const newItems = [...items];
    let changed = false;

    currentTeeth.forEach(t => {
      if (t.state === 'Caries') {
        const existing = newItems.find(i => i.toothNumber === t.toothNumber && i.name.includes('Кариес'));
        if (!existing) {
          newItems.push({
            toothNumber: t.toothNumber,
            priceId: 'service_caries_01',
            name: `Лечение кариеса (Световая пломба)`,
            quantity: 1,
            price: 5500,
            discount: 0,
            phase: 1
          });
          changed = true;
        }
      }
      if (t.state === 'Planned_Implant' || t.state === 'Implant') {
        const existing = newItems.find(i => i.toothNumber === t.toothNumber && i.name.includes('Имплантат'));
        if (!existing) {
          newItems.push({
            toothNumber: t.toothNumber,
            priceId: 'service_implant_osstem',
            name: `Установка имплантата Osstem TSIII`,
            quantity: 1,
            price: 35000,
            discount: 0,
            phase: 2
          });
          newItems.push({
            toothNumber: t.toothNumber,
            priceId: 'service_surgery_guide',
            name: `Хирургический шаблон`,
            quantity: 1,
            price: 12000,
            discount: 0,
            phase: 2
          });
          changed = true;
        }
      }
    });

    if (changed) {
      setItems(newItems);
    }
  }, [currentTeeth]);

  useEffect(() => {
    const t = items.reduce((acc, curr) => acc + (curr.price * curr.quantity - curr.discount), 0);
    setTotal(t);
  }, [items]);

  const savePlan = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: planId,
          name: "Комплексный план лечения (КТ)",
          items: items.map(i => ({ ...i }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlanId(data.planId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const setPhase = (idx: number, phase: number) => {
    const n = [...items];
    if (n[idx]) n[idx].phase = phase;
    setItems(n);
  };

  // Group by phase
  const phases = [1, 2, 3];

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <FileText size={18} className="text-emerald-400" />
          План лечения
        </h2>
        <button 
          onClick={savePlan}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
            <Calculator size={48} className="mb-4 opacity-20" />
            <p>План пуст. Отметьте патологию на формуле.</p>
          </div>
        )}

        {phases.map(phase => {
          const phaseItems = items.filter(i => i.phase === phase);
          if (phaseItems.length === 0) return null;

          return (
            <div key={phase} className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 border-b border-zinc-800 pb-2">
                {phase === 1 && 'I. Терапия (Санация)'}
                {phase === 2 && 'II. Хирургия и Имплантация'}
                {phase === 3 && 'III. Ортопедия (Протезирование)'}
              </h3>
              
              <div className="space-y-2">
                {phaseItems.map((item, idx) => {
                  const globalIdx = items.indexOf(item);
                  return (
                    <div key={globalIdx} className="flex flex-col gap-2 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            {item.toothNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                                Зуб {item.toothNumber}
                              </span>
                            )}
                            <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">{item.price.toLocaleString('ru-RU')} ₽ x {item.quantity}</div>
                        </div>
                        <button onClick={() => removeItem(globalIdx)} className="text-zinc-400 hover:text-red-400 p-1 rounded-md hover:bg-zinc-800">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/30">
                        <select 
                          value={item.phase} 
                          onChange={e => setPhase(globalIdx, parseInt(e.target.value))}
                          className="bg-transparent border border-zinc-800 text-xs text-zinc-400 rounded p-1 outline-none focus:border-zinc-600"
                        >
                          <option value={1}>Этап I: Терапия</option>
                          <option value={2}>Этап II: Хирургия</option>
                          <option value={3}>Этап III: Ортопедия</option>
                        </select>
                        <span className="text-sm font-bold text-emerald-400">
                          {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center">
        <div className="text-sm text-zinc-400">Итого к оплате:</div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {total.toLocaleString('ru-RU')} <span className="text-zinc-400 text-lg">₽</span>
        </div>
      </div>
    </div>
  );
};
