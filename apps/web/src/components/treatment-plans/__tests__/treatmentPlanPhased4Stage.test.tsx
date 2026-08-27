import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { TreatmentPlanPhased4StageView } from '../TreatmentPlanPhased4StageView';
import type { TreatmentPlanStage } from '../types';

describe('TreatmentPlanPhased4StageView Component', () => {
  it('renders the 4 clinical phases with exact totals and badges', () => {
    const mockStages: TreatmentPlanStage[] = [
      {
        stageNumber: 1,
        title: 'Терапия и гигиена',
        stageKind: 'stage_1_therapy',
        subtitle: 'Санация и гигиена',
        clinicalGoal: 'Ликвидация очагов инфекции',
        totalRub: 15000,
        totalKopecks: 1500000 as any,
        estimatedVisits: 2,
        estimatedWeeks: 1,
        order804nCodes: ['A16.07.051', 'A16.07.002'],
        items: [
          {
            id: 'it-1',
            name: 'Комплексная профгигиена Air-Flow и ультразвук',
            code804n: 'A16.07.051',
            category: 'hygiene',
            priceRub: 5000,
            stageKind: 'stage_1_therapy',
            phase: 1,
            quantity: 1,
            unitPriceRub: 5000,
            discountRub: 0,
            isAuto: true,
          },
          {
            id: 'it-2',
            name: 'Лечение кариеса зуба 16 с нанокомпозитной реставрацией',
            code804n: 'A16.07.002',
            toothNumber: 16,
            category: 'therapy',
            priceRub: 10000,
            stageKind: 'stage_1_therapy',
            phase: 1,
            quantity: 1,
            unitPriceRub: 10000,
            discountRub: 0,
            isAuto: true,
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Хирургия и имплантация',
        stageKind: 'stage_2_surgery',
        subtitle: 'Хирургический этап',
        clinicalGoal: 'Установка имплантата',
        totalRub: 45000,
        totalKopecks: 4500000 as any,
        estimatedVisits: 1,
        estimatedWeeks: 8,
        order804nCodes: ['A16.07.054'],
        items: [
          {
            id: 'it-3',
            name: 'Установка дентального имплантата Straumann',
            code804n: 'A16.07.054',
            toothNumber: 36,
            category: 'surgery',
            priceRub: 45000,
            stageKind: 'stage_2_surgery',
            phase: 2,
            quantity: 1,
            unitPriceRub: 45000,
            discountRub: 0,
            isAuto: true,
          },
        ],
      },
      {
        stageNumber: 3,
        title: 'Ортопедия',
        stageKind: 'stage_3_orthopedics',
        subtitle: 'Ортопедический этап',
        clinicalGoal: 'Протезирование на имплантате',
        totalRub: 35000,
        totalKopecks: 3500000 as any,
        estimatedVisits: 2,
        estimatedWeeks: 3,
        order804nCodes: ['A16.07.004'],
        items: [
          {
            id: 'it-4',
            name: 'Коронка из диоксида циркония на имплантат',
            code804n: 'A16.07.004',
            toothNumber: 36,
            category: 'ortho',
            priceRub: 35000,
            stageKind: 'stage_3_orthopedics',
            phase: 3,
            quantity: 1,
            unitPriceRub: 35000,
            discountRub: 0,
            isAuto: true,
          },
        ],
      },
    ];

    const html = renderToString(
      <TreatmentPlanPhased4StageView
        stages={mockStages}
        planTierTitle="Оптимальный план"
        patientName="Иванов И.И."
      />
    );

    assert.ok(html.includes('data-testid="treatment-plan-phased-4stage-view"'));
    assert.ok(html.includes('4 Клинических этапа'));
    assert.ok(html.includes('phased-stage-card-hygiene_sanitation'));
    assert.ok(html.includes('phased-stage-card-endo_therapy'));
    assert.ok(html.includes('phased-stage-card-surgery_implant'));
    assert.ok(html.includes('phased-stage-card-ortho_prosthetics'));
    assert.ok(html.includes('95') && html.includes('000')); // 5000+10000+45000+35000 = 95,000
    assert.ok(html.includes('Air-Flow'));
    assert.ok(html.includes('Straumann'));
    assert.ok(html.includes('диоксида циркония'));
  });
});
