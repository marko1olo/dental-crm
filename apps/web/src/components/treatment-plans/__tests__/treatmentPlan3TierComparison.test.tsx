import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { TreatmentPlan3TierComparison } from '../TreatmentPlan3TierComparison';
import { TreatmentPlanPhased4StageView } from '../TreatmentPlanPhased4StageView';
import { TreatmentPlanComparatorModal } from '../comparator/TreatmentPlanComparatorModal';
import { generate3TierPlanComparison, generateTreatmentPlanStages } from '../treatmentPlanStagesEngine';
import type { ToothData } from '../../odontogram/ToothChart';

describe('TreatmentPlan3TierComparison & Sticky Estimates Suite', () => {
  const sampleTeeth: ToothData[] = [
    {
      id: 16,
      state: 'caries',
      systemicNotes: 'Глубокий кариес',
    } as any,
    {
      id: 36,
      state: 'missing',
      systemicNotes: 'Отсутствует зуб, показана имплантация',
    } as any,
  ];

  const sampleTiers = generate3TierPlanComparison(sampleTeeth);
  const sampleStages = generateTreatmentPlanStages(sampleTeeth);

  it('renders 3-tier side-by-side comparison with sticky bottom approval actions and 32px controls', () => {
    const html = renderToString(
      <TreatmentPlan3TierComparison
        tiers={sampleTiers}
        selectedTierId="optimum"
        onSelectTier={() => {}}
        onApproveAndSign={() => {}}
        onOpenInstallment={() => {}}
        onPrintContract={() => {}}
      />
    );

    assert.ok(html.includes('3-Tier Сравнение планов'), 'Should render 3-tier title');
    assert.ok(html.includes('Рассрочка 0%'), 'Should render installment toggle');
    assert.ok(html.includes('Этапы (30/40/30)'), 'Should render staged toggle');
    assert.ok(html.includes('Скидка 5% (100%)'), 'Should render discount toggle');
    assert.ok(html.includes('Утвердить и подписать план'), 'Should render sticky bottom sign button');
    assert.ok(html.includes('sticky bottom-0'), 'Must contain sticky bottom class for estimate footer');
    assert.ok(html.includes('min-h-[32px]'), 'Must contain 32px compact touch buttons');
    assert.ok(html.includes('tier-card-optimum'), 'Must render optimum tier card');
    assert.ok(html.includes('tier-card-standard'), 'Must render standard tier card');
    assert.ok(html.includes('tier-card-economy'), 'Must render economy tier card');
  });

  it('renders TreatmentPlanPhased4StageView with sticky bottom grand totals and action bar', () => {
    const html = renderToString(
      <TreatmentPlanPhased4StageView
        stages={sampleStages}
        planTierTitle="Оптимальный план"
        patientName="Смирнова Е. В."
        onOpenInstallment={() => {}}
        onOpenStagePayment={() => {}}
        onApproveAndSign={() => {}}
        onPrintContract={() => {}}
      />
    );

    assert.ok(html.includes('4 Клинических этапа'), 'Should render 4 clinical phases header');
    assert.ok(html.includes('Итоговая смета по 4 этапам:'), 'Should render sticky grand totals estimate bar');
    assert.ok(html.includes('sticky bottom-0'), 'Should have sticky bottom-0 fixed footer');
    assert.ok(html.includes('Утвердить план'), 'Should contain approval button');
    assert.ok(html.includes('Рассрочка 0%'), 'Should contain installment button');
    assert.ok(html.includes('Печать договора'), 'Should contain contract print button');
  });

  it('renders TreatmentPlanComparatorModal with sticky presentation footer and whole ruble metrics', () => {
    const html = renderToString(
      <TreatmentPlanComparatorModal
        isOpen={true}
        patientName="Иванов И. И."
        doctorName="Д-р Смирнов А. В."
        clinicName="Клиника DENTE"
      />
    );

    assert.ok(html.includes('Студия сравнения планов лечения'), 'Should render comparator modal title');
    assert.ok(html.includes('plan-comparator-footer'), 'Should contain sticky modal footer');
    assert.ok(html.includes('Согласовать план с пациентом'), 'Should contain primary agreement action');
    assert.ok(html.includes('Рассрочка 0%'), 'Should contain installment action');
    assert.ok(html.includes('Печать брошюры'), 'Should contain print brochure action');
  });
});
