import React from 'react';
import { PdfExportWrapper } from './PdfExportWrapper';

interface TreatmentPhase {
  name: string;
  items: { description: string; tooth: string; price: number }[];
}

interface TreatmentPlanTemplateProps {
  patientName: string;
  phases: TreatmentPhase[];
  totalDiscount: number;
}

export function TreatmentPlanTemplate({ patientName, phases, totalDiscount }: TreatmentPlanTemplateProps) {
  const calculatePhaseTotal = (phase: TreatmentPhase) => 
    phase.items.reduce((sum, item) => sum + item.price, 0);

  const subtotal = phases.reduce((sum, phase) => sum + calculatePhaseTotal(phase), 0);
  const finalTotal = subtotal - totalDiscount;

  return (
    <PdfExportWrapper 
      id="treatment-plan-pdf"
      documentType="treatment_plan"
      title="Комплексный План Лечения"
      patientName={patientName}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-zinc-800 mb-4 border-b border-zinc-200 pb-2">Визуальная схема (Одонтограмма)</h3>
        {/* Placeholder for actual odontogram canvas/image injection */}
        <div className="w-full h-48 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded flex items-center justify-center">
          <span className="text-zinc-400 font-medium">Схема зубов будет отображена здесь</span>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-800 border-b border-zinc-200 pb-2">Детализация этапов</h3>
        
        {phases.map((phase, idx) => (
          <div key={idx} className="phase-block">
            <h4 className="text-md font-bold text-zinc-700 mb-2">{phase.name}</h4>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-zinc-600">
                  <th className="py-2 px-3 border border-zinc-200 font-medium">Зуб</th>
                  <th className="py-2 px-3 border border-zinc-200 font-medium">Процедура</th>
                  <th className="py-2 px-3 border border-zinc-200 font-medium text-right">Стоимость, ₽</th>
                </tr>
              </thead>
              <tbody>
                {phase.items.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-2 px-3 border border-zinc-200 font-medium text-center">{item.tooth}</td>
                    <td className="py-2 px-3 border border-zinc-200">{item.description}</td>
                    <td className="py-2 px-3 border border-zinc-200 text-right">{item.price.toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td colSpan={2} className="py-2 px-3 border border-zinc-200 text-right text-zinc-600">Итого по этапу:</td>
                  <td className="py-2 px-3 border border-zinc-200 text-right text-zinc-800">{calculatePhaseTotal(phase).toLocaleString('ru-RU')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-72 bg-zinc-50 p-4 rounded border border-zinc-200">
          <div className="flex justify-between mb-2 text-sm text-zinc-600">
            <span>Промежуточный итог:</span>
            <span>{subtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex justify-between mb-2 text-sm text-emerald-600 font-medium">
            <span>Скидка:</span>
            <span>- {totalDiscount.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t border-zinc-300 text-lg font-bold text-zinc-900">
            <span>К ОПЛАТЕ:</span>
            <span>{finalTotal.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>
    </PdfExportWrapper>
  );
}
