import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { TreatmentPlan3TierComparison } from '../TreatmentPlan3TierComparison';
import { TreatmentPlanPhased4StageView } from '../TreatmentPlanPhased4StageView';
import { TreatmentPlanComparatorModal } from '../comparator/TreatmentPlanComparatorModal';
import { TreatmentPlanContractPrint } from '../TreatmentPlanContractPrint';
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
    assert.ok(html.includes('min-h-[44px]') || html.includes('min-h-[36px]') || html.includes('min-h-[32px]'), 'Must contain touch buttons');
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

    assert.ok(html.includes('4 клинических этапа') || html.includes('4 Клинических этапа'), 'Should render 4 clinical phases header');
    assert.ok(html.includes('Итоговая смета по 4 этапам:'), 'Should render sticky grand totals estimate bar');
    assert.ok(html.includes('sticky bottom-0'), 'Should have sticky bottom-0 fixed footer');
    assert.ok(html.includes('Утвердить план'), 'Should contain approval button');
    assert.ok(html.includes('Рассрочка'), 'Should contain installment button');
    assert.ok(html.includes('Эскроу'), 'Should contain escrow button');
    assert.ok(html.includes('Печать договора'), 'Should contain contract print button');
  });

  it('renders TreatmentPlanComparatorModal with sticky presentation footer and whole ruble metrics in demo mode', () => {
    const html = renderToString(
      <TreatmentPlanComparatorModal
        isOpen={true}
        isDemoMode={true}
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

  it('renders authentic empty state in TreatmentPlanComparatorModal when customVariants omitted in production (!isDemoMode)', () => {
    const html = renderToString(
      <TreatmentPlanComparatorModal
        isOpen={true}
        isDemoMode={false}
        patientName="Иванов И. И."
        doctorName="Д-р Смирнов А. В."
        clinicName="Клиника DENTE"
      />
    );

    assert.ok(html.includes('plan-comparator-empty-state'), 'Should render empty state container');
    assert.ok(html.includes('Варианты планов лечения пока не сформированы'), 'Should state variants are not formed');
    assert.ok(html.includes('btn-comparator-empty-close'), 'Should render action button to return');
  });

  it('renders Apple HIG native Segmented Control on mobile screens (<= 640px) with touch-first tabs and formatted prices', () => {
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

    // Segmented control container with data-testid
    assert.ok(html.includes('treatment-3tier-segmented-control'), 'Should render Apple HIG segmented control container');
    assert.ok(html.includes('sm:hidden'), 'Segmented control must be hidden on desktop viewports');

    // Individual segment tabs with data-testid
    assert.ok(html.includes('segmented-tab-optimum'), 'Should render optimum segmented tab');
    assert.ok(html.includes('segmented-tab-standard'), 'Should render standard segmented tab');
    assert.ok(html.includes('segmented-tab-economy'), 'Should render economy segmented tab');

    // Mobile active card and desktop grid separation
    assert.ok(html.includes('tier-card-mobile-optimum'), 'Should render active tier card for mobile single view');
    assert.ok(html.includes('tier-card-optimum'), 'Should render optimum desktop card in grid');
    assert.ok(html.includes('tier-card-standard'), 'Should render standard desktop card in grid');
    assert.ok(html.includes('tier-card-economy'), 'Should render economy desktop card in grid');
  });

  it('renders 3-tier materials headline, service life, and messenger copy buttons without matrix confusion', () => {
    const html = renderToString(
      <TreatmentPlan3TierComparison
        tiers={sampleTiers}
        selectedTierId="standard"
        onSelectTier={() => {}}
        onApproveAndSign={() => {}}
        onOpenInstallment={() => {}}
        onPrintContract={() => {}}
      />
    );

    // Segmented control labels
    assert.ok(html.includes('Эконом'), 'Segmented control must include Эконом');
    assert.ok(html.includes('Оптимум'), 'Segmented control must include Оптимум');
    assert.ok(html.includes('Премиум'), 'Segmented control must include Премиум');

    // Materials headline
    assert.ok(html.includes('Клинические материалы'), 'Must render materials headline badge');

    // Service life
    assert.ok(html.includes('Срок службы'), 'Must render service life heading');
    assert.ok(html.includes('лет'), 'Must format service life in years');

    // Messenger copy buttons
    assert.ok(html.includes('data-testid="top-copy-messenger-btn"'), 'Must render top messenger copy button');
    assert.ok(html.includes('copy-estimate-messenger-btn-standard'), 'Must render card messenger copy button');
  });

  it('renders TreatmentPlanContractPrint with patient-friendly mode, messenger copy, and Order 1051n consent', () => {
    const html = renderToString(
      <TreatmentPlanContractPrint
        isOpen={true}
        tier={sampleTiers[1]!}
        stages={sampleStages}
        patientName="Петрова Анна Сергеевна"
        patientId="PAT-999"
        doctorFullName="Д-р Соколов И. В."
        clinicName="Клиника DENTE"
        onClose={() => {}}
      />
    );

    assert.ok(html.includes('data-testid="contract-view-patient-friendly-btn"'), 'Must render patient friendly mode button');
    assert.ok(html.includes('data-testid="contract-view-official-btn"'), 'Must render official 804n mode button');
    assert.ok(html.includes('data-testid="contract-copy-messenger-btn"'), 'Must render messenger copy button');
    assert.ok(html.includes('1051н'), 'Must cite Order 1051n in informed consent');
    assert.ok(html.includes('323-ФЗ'), 'Must cite 323-FZ in informed consent');
  });

  it('renders rich clinical turnkey presets (45k, 145k, 380k) with zero 0 ₽ values when patient has no charted pathology', () => {
    const emptyTiers = generate3TierPlanComparison([]);
    assert.equal(emptyTiers.length, 3);
    const [eco, std, opt] = emptyTiers;

    assert.equal(eco?.totalRub, 45000, 'Economy tier must be 45 000 ₽');
    assert.equal(eco?.durationWeeks, 3, 'Economy duration must be 3 weeks');
    assert.equal(eco?.durationVisits, 3, 'Economy visits must be 3');
    assert.equal(eco?.warrantyYears, 1, 'Economy warranty must be 1 year');

    assert.equal(std?.totalRub, 145000, 'Standard tier must be 145 000 ₽');
    assert.equal(std?.durationWeeks, 6, 'Standard duration must be 6 weeks');
    assert.equal(std?.durationVisits, 5, 'Standard visits must be 5');
    assert.equal(std?.warrantyYears, 2, 'Standard warranty must be 2 years');

    assert.equal(opt?.totalRub, 380000, 'Optimum tier must be 380 000 ₽');
    assert.equal(opt?.durationWeeks, 16, 'Optimum duration must be 16 weeks');
    assert.equal(opt?.durationVisits, 8, 'Optimum visits must be 8');
    assert.ok(String(opt?.warrantyYears).includes('5'), 'Optimum warranty must be 5+ years');

    const html = renderToString(
      <TreatmentPlan3TierComparison
        tiers={emptyTiers}
        selectedTierId="optimum"
        onSelectTier={() => {}}
        onApproveAndSign={() => {}}
        onOpenInstallment={() => {}}
        onPrintContract={() => {}}
      />
    );

    assert.ok(html.includes('45 000'), 'Must render 45 000 ₽ in HTML');
    assert.ok(html.includes('145 000'), 'Must render 145 000 ₽ in HTML');
    assert.ok(html.includes('380 000'), 'Must render 380 000 ₽ in HTML');
    assert.equal(html.includes('0 ₽/мес'), false, 'Must NOT contain 0 ₽/мес');
  });

  it('eliminates button landfill in 3-tier toolbar: clean segmented controls and [ ⚙ Параметры сметы ▾ ] dropdown', () => {
    const html = renderToString(
      <TreatmentPlan3TierComparison
        tiers={sampleTiers}
        selectedTierId="optimum"
        onSelectTier={() => {}}
        onApproveAndSign={() => {}}
        onOpenInstallment={() => {}}
        onPrintContract={() => {}}
        onOpenComparatorStudio={() => {}}
      />
    );

    // Dropdown button exists
    assert.ok(html.includes('data-testid="tp-3tier-params-btn"'), 'Must render tp-3tier-params-btn');
    assert.ok(html.includes('Параметры сметы'), 'Must render Parameters label');

    // Secondary items grouped inside dropdown menu
    assert.ok(html.includes('Вычет 13% (НДФЛ)'), 'Must render NDFL toggle in parameters dropdown');
    assert.ok(html.includes('Студия сравнения планов'), 'Must render studio trigger in parameters dropdown');

    // Messenger share button remains accessible
    assert.ok(html.includes('data-testid="top-copy-messenger-btn"'), 'Must render top messenger share button');
  });
});


