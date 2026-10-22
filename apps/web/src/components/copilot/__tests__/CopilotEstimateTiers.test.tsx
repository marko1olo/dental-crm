import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { EstimateTierCard } from '../CopilotGenerativeCards';
import { CopilotResultCard } from '../CopilotResultCard';

describe('Copilot Estimate Tiers & Result Dispatcher', () => {
  it('renders EstimateTierCard with 3 parallel pricing tiers', () => {
    const estimateData = {
      patientName: 'Барабаш Сергей Владимирович', teeth: ['1.6', '2.6', '3.6'], selectedTier: 'optimum' as const,
      tiers: [
        { tierKey: 'economy' as const, tierName: 'Тариф «Эконом»', badge: 'Базовый', totalRub: 45000, taxDeductionRub: 5850, netCostAfterDeductionRub: 39150, monthlyInstallmentRub: 3750, installmentMonths: 12, warrantyDescription: '1 год', materialsDescription: 'Композиты Filtek', keyAdvantages: ['Доступно'] },
        { tierKey: 'optimum' as const, tierName: 'Тариф «Оптимум»', badge: '★ Рекомендуемый', totalRub: 84500, taxDeductionRub: 10985, netCostAfterDeductionRub: 73515, monthlyInstallmentRub: 7042, installmentMonths: 12, warrantyDescription: '2 года', materialsDescription: 'e.max', keyAdvantages: ['Баланс'] },
        { tierKey: 'premium' as const, tierName: 'Тариф «Премиум»', badge: 'VIP', totalRub: 148000, taxDeductionRub: 19240, netCostAfterDeductionRub: 128760, monthlyInstallmentRub: 12333, installmentMonths: 12, warrantyDescription: 'Пожизненная', materialsDescription: 'CAD/CAM', keyAdvantages: ['VIP'] },
      ],
    };
    const html = renderToString(<EstimateTierCard data={estimateData} activeTier="optimum" onSelectTier={() => {}} onApplyTier={() => {}} />);
    assert.ok(html.includes('Оптимум') && html.includes('Премиум') && html.includes('Эконом'));
    assert.ok(html.includes('84') && html.includes('500') && html.includes('Применить тариф в план лечения'));
  });

  it('renders CopilotResultCard dispatching calculate_treatment_estimate', () => {
    const estimateResult = {
      patientName: 'Иванов Иван Иванович', teeth: ['1.1', '2.1'],
      tiers: [{ tierKey: 'optimum', tierName: 'Тариф «Оптимум»', badge: 'Выбор врачей', totalRub: 65000, taxDeductionRub: 8450, netCostAfterDeductionRub: 56550, warrantyDescription: '2 года', materialsDescription: 'IPS e.max', keyAdvantages: ['Эстетика'] }],
    };
    const html = renderToString(<CopilotResultCard toolName="clinical.calculate_treatment_estimate" result={estimateResult} />);
    assert.ok(html.includes('3 тарифных варианта') || html.includes('Оптимум'));
  });
});
