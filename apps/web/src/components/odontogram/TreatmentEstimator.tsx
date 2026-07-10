import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ToothData, ToothState } from './ToothChart';
import { FileText, Save, Calculator, Trash2, PenTool } from 'lucide-react';
import { SignaturePad } from '../SignaturePad';

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
  isAuto?: boolean;
}

export const TreatmentEstimator: React.FC<EstimatorProps> = ({ patientId, currentTeeth }) => {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Auto-suggestions based on currentTeeth - fully synchronized
  useEffect(() => {
    setItems(prevItems => {
      let newItems = [...prevItems];
      let changed = false;

      // 1. Remove auto-items for teeth that no longer have that state
      const itemsToRemove: number[] = [];
      newItems.forEach((item, idx) => {
        if (!item.isAuto) return;
        const tooth = currentTeeth.find(t => t.toothNumber === item.toothNumber);
        if (!tooth) {
          itemsToRemove.push(idx);
          return;
        }
        if (item.priceId === 'service_caries_01' && tooth.state !== 'Caries') itemsToRemove.push(idx);
        if ((item.priceId === 'service_implant_osstem' || item.priceId === 'service_surgery_guide') && tooth.state !== 'Planned_Implant' && tooth.state !== 'Implant') itemsToRemove.push(idx);
        if (item.priceId === 'service_endo_pulpitis' && tooth.state !== 'Pulpitis') itemsToRemove.push(idx);
        if (item.priceId === 'service_crown_zirconia' && tooth.state !== 'Crown') itemsToRemove.push(idx);
      });

      if (itemsToRemove.length > 0) {
        newItems = newItems.filter((_, i) => !itemsToRemove.includes(i));
        changed = true;
      }

      // 2. Add missing auto-items
      currentTeeth.forEach(t => {
        if (t.state === 'Caries') {
          if (!newItems.find(i => i.toothNumber === t.toothNumber && i.priceId === 'service_caries_01')) {
            newItems.push({ isAuto: true, toothNumber: t.toothNumber, priceId: 'service_caries_01', name: 'Р›РµС‡РµРЅРёРµ РєР°СЂРёРµСЃР° (РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ)', quantity: 1, price: 5500, discount: 0, phase: 1 });
            changed = true;
          }
        }
        if (t.state === 'Planned_Implant' || t.state === 'Implant') {
          if (!newItems.find(i => i.toothNumber === t.toothNumber && i.priceId === 'service_implant_osstem')) {
            newItems.push({ isAuto: true, toothNumber: t.toothNumber, priceId: 'service_implant_osstem', name: 'РЈСЃС‚Р°РЅРѕРІРєР° РёРјРїР»Р°РЅС‚Р°С‚Р° Osstem TSIII', quantity: 1, price: 35000, discount: 0, phase: 2 });
            newItems.push({ isAuto: true, toothNumber: t.toothNumber, priceId: 'service_surgery_guide', name: 'РҐРёСЂСѓСЂРіРёС‡РµСЃРєРёР№ С€Р°Р±Р»РѕРЅ', quantity: 1, price: 12000, discount: 0, phase: 2 });
            changed = true;
          }
        }
        if (t.state === 'Pulpitis') {
          if (!newItems.find(i => i.toothNumber === t.toothNumber && i.priceId === 'service_endo_pulpitis')) {
            newItems.push({ isAuto: true, toothNumber: t.toothNumber, priceId: 'service_endo_pulpitis', name: 'Р­РЅРґРѕРґРѕРЅС‚РёС‡РµСЃРєРѕРµ Р»РµС‡РµРЅРёРµ (РџСѓР»СЊРїРёС‚)', quantity: 1, price: 12500, discount: 0, phase: 1 });
            changed = true;
          }
        }
        if (t.state === 'Crown') {
          if (!newItems.find(i => i.toothNumber === t.toothNumber && i.priceId === 'service_crown_zirconia')) {
            newItems.push({ isAuto: true, toothNumber: t.toothNumber, priceId: 'service_crown_zirconia', name: 'РљРѕСЂРѕРЅРєР° РёР· РґРёРѕРєСЃРёРґР° С†РёСЂРєРѕРЅРёСЏ', quantity: 1, price: 28000, discount: 0, phase: 3 });
            changed = true;
          }
        }
      });

      return changed ? newItems : prevItems;
    });
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
          name: "РљРѕРјРїР»РµРєСЃРЅС‹Р№ РїР»Р°РЅ Р»РµС‡РµРЅРёСЏ (РљРў)",
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

  const phases = [1, 2, 3];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <FileText size={18} className="text-emerald-400" />
          План лечения
        </h2>
        <div className="flex items-center gap-2">
          {signatureUrl && (
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded">
              ПОДПИСАНО
            </span>
          )}
          <button 
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            Подписать
          </button>
          <button 
            onClick={savePlan}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {items.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            marginTop: '24px',
            backgroundColor: 'var(--odontogram-surface-hover, rgba(9, 9, 11, 0.4))',
            backdropFilter: 'blur(12px)',
            border: '1px dashed var(--odontogram-border-strong, rgba(255, 255, 255, 0.1))',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(13,148,136,0.05) 100%)',
              padding: '16px',
              borderRadius: '50%',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(45,212,191,0.1)'
            }}>
              <Calculator size={40} style={{ color: '#2dd4bf', opacity: 0.8 }} />
            </div>
            <p style={{ color: 'var(--odontogram-ink-muted, #a1a1aa)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              План лечения пуст. Кликайте по зубам на зубной формуле, чтобы отмечать патологии, и услуги будут добавляться автоматически.
            </p>
          </div>
        )}

        {phases.map(phase => {
          const phaseItems = items.filter(i => i.phase === phase);
          if (phaseItems.length === 0) return null;

          return (
            <div key={phase} className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                {phase === 1 && 'I. Терапия (Санация)'}
                {phase === 2 && 'II. Хирургия и Имплантация'}
                {phase === 3 && 'III. Ортопедия (Протезирование)'}
              </h3>
              
              <div className="space-y-2">
                {phaseItems.map((item, idx) => {
                  const globalIdx = items.indexOf(item);
                  return (
                    <div key={globalIdx} className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            {item.toothNumber && (
                              <span className={`px-1.5 py-0.5 rounded-full font-mono text-[11px] font-bold shadow-sm ${item.toothNumber > 50 ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'}`}>
                                [{item.toothNumber}]
                              </span>
                            )}
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{item.name}</span>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{item.price.toLocaleString('ru-RU')} ₽ x {item.quantity}</div>
                        </div>
                        <button onClick={() => removeItem(globalIdx)} className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/30">
                        <select 
                          value={item.phase} 
                          onChange={e => setPhase(globalIdx, parseInt(e.target.value))}
                          className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded p-1 outline-none focus:border-emerald-500"
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

      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Итого по плану:</div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {total.toLocaleString('ru-RU')} <span className="text-zinc-500 dark:text-zinc-400 text-lg">₽</span>
        </div>
      </div>

      {showSignModal && typeof window !== 'undefined' && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <SignaturePad 
              onSign={(dataUrl) => {
                setSignatureUrl(dataUrl);
                setShowSignModal(false);
              }}
              onCancel={() => setShowSignModal(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
