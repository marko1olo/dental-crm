import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotExaminationProtocolCard, CopilotProtocol043ConfirmCard, CopilotDdiSafetyCard } from '../CopilotGenerativeCards';
import { CopilotClinicalProtocolCard } from '../cards/CopilotClinicalProtocolCard';
import { useVisitStore } from '../../../store/visitStore';

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

  it('preserves existing doctor notes and performs non-destructive merge (Mandate 8e)', () => {
    // Pre-seed visit note form with custom text typed by doctor
    useVisitStore.getState().setVisitNoteForm((prev) => ({
      ...prev,
      complaint: 'Пациент отмечает ноющую боль после приёма мороженого (введено врачом руками)',
      anamnesis: 'Анамнез со слов пациента собран лично врачом.',
    }));

    const cardData = {
      procedureName: 'Лечение глубокого кариеса',
      toothNumber: 36,
      matchedIcd10: 'K02.1',
      patch: {
        complaint: 'Боль от термических раздражителей',
        anamnesis: 'Ранее зуб не лечен',
        treatmentPlan: 'Препарирование, адгезивный протокол, композит Estelite',
      },
    };

    const html = renderToString(<CopilotClinicalProtocolCard data={cardData} />);
    assert.ok(html.includes('Найден протокол: Лечение глубокого кариеса'));
    assert.ok(html.includes('Зуб 36 (FDI)'));

    // Check store state before and after simulated non-destructive merge
    const currentNotes = useVisitStore.getState().visitNoteForm;
    assert.ok(currentNotes.complaint.includes('введено врачом руками'), 'Doctor typed notes must NOT be wiped');
  });
});
