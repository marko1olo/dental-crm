import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotExaminationProtocolCard, CopilotProtocol043ConfirmCard, CopilotDdiSafetyCard } from '../CopilotGenerativeCards';
import { CopilotNudges } from '../CopilotNudges';

describe('Copilot Examination Protocol & DDI Safety Cards', () => {
  it('renders clinical diary form with complaints, anamnesis, objective, tooth, and treatment', () => {
    const diaryData = {
      patientName: 'Барабаш Сергей Владимирович', tooth: '36', diagnosis: 'K02.1 Кариес дентина (глубокий)',
      complaints: 'Боль от термических раздражителей в зубе 36', anamnesis: 'Появилась 2 недели назад',
      objective: 'Глубокая кариозная полость MOD', treatment: 'Estelite Sigma Quick A2/OA2',
    };
    const html = renderToString(<CopilotExaminationProtocolCard data={diaryData} />);
    assert.ok(html.includes('ДЕНТА сформировала дневник приёма') && html.includes('Барабаш'));
    assert.ok(html.includes('Зуб 36') && html.includes('Внести в дневник'));
  });

  it('renders saved state correctly after confirmation', () => {
    const diaryData = { patientName: 'Сидоров А.П.', tooth: '46', complaints: 'Жалобы отсутствуют' };
    const html = renderToString(<CopilotExaminationProtocolCard data={diaryData} resolved="confirm" />);
    assert.ok(html.includes('Дневник приёма сохранён') && html.includes('В медкарте'));
  });

  it('renders critical alert banner, allergen warning, and safe alternatives', () => {
    const ddiData = {
      severity: 'contraindicated' as const, title: '🛡️ Критическое предупреждение: Противопоказание DDI',
      description: 'Аллергия на пенициллины.', patientAllergies: ['Пенициллины'], safeAlternatives: ['Кларитромицин 500 мг'],
    };
    const html = renderToString(<CopilotDdiSafetyCard data={ddiData} />);
    assert.ok(html.includes('Критическое предупреждение') && html.includes('Пенициллины'));
    assert.ok(html.includes('Кларитромицин 500 мг') && html.includes('Заменить на безопасный препарат'));
  });

  it('renders proactive clinical tooth nudge with FDI tooth, ICD-10, and 1-click button', () => {
    const clinicalNudge = {
      id: 'nudge_tooth_46', kind: 'clinical_tooth_protocol', created_at: '2026-09-01T12:00:00.000Z',
      payload: { tooth: 46, title: 'Зуб #46 (Пульпит K04.0)', icd10: 'K04.0', anesthesia: 'Артикаин 1:100 000', description: 'Рекомендован протокол эндодонтии.' },
    };
    const html = renderToString(<CopilotNudges nudges={[clinicalNudge]} onDismiss={() => {}} />);
    assert.ok(html.includes('Зуб #46') && html.includes('МКБ-10: K04.0'));
  });
});
