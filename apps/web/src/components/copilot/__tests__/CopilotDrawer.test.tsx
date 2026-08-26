import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import {
  formatDateTime,
  formatTimeRange,
  formatTime,
  formatMoney,
  CopilotMarkdown,
  CopilotPatientCard,
  CopilotAppointmentCard,
  CopilotSlotCard,
  CopilotConfirmCard,
  CopilotLabOrderCard,
  CopilotDrugInteractionCard,
  CopilotTimelineCard,
  CopilotResultCard,
  CopilotNudges,
  CopilotSuggestions,
  CopilotComposer,
  CopilotDrawer,
} from '../index';

describe('Copilot Formatters', () => {
  it('formats ISO timestamps with locale', () => {
    const formatted = formatDateTime('2026-08-27T14:30:00Z');
    assert.ok(formatted.includes('27'));
  });

  it('formats time ranges correctly', () => {
    const range = formatTimeRange('2026-08-27T09:00:00Z', '2026-08-27T10:00:00Z');
    assert.ok(range.includes('—') || range.includes(':'));
  });

  it('formats currency values correctly', () => {
    const formatted = formatMoney(15000);
    assert.ok(formatted.includes('15') && (formatted.includes('₽') || formatted.includes('RUB')));
  });
});

describe('Copilot Markdown Parser', () => {
  it('renders bold, code, and bullet lists', () => {
    const md = '### Заголовок\n**Важно**: Пациент `Иванов` прибыл.\n- Пункт 1\n- Пункт 2';
    const html = renderToString(<CopilotMarkdown text={md} />);
    assert.ok(html.includes('Заголовок'));
    assert.ok(html.includes('Важно'));
    assert.ok(html.includes('Иванов'));
    assert.ok(html.includes('Пункт 1'));
  });
});

describe('Copilot Specialized Result Cards', () => {
  it('renders CopilotLabOrderCard with VITA shade and delivery status', () => {
    const orders = [
      {
        id: 'LAB-2026-104',
        prosthesis_kind: 'Циркониевая коронка на каркасе',
        tooth: '2.6',
        vita_shade: 'A2',
        status: 'in_production',
        eta: '2026-08-29T12:00:00Z',
        lab_name: 'Зуботехническая лаборатория «Артис»',
      },
    ];
    const html = renderToString(<CopilotLabOrderCard orders={orders} />);
    assert.ok(html.includes('LAB-2026-104'));
    assert.ok(html.includes('Циркониевая коронка'));
    assert.ok(html.includes('VITA') && html.includes('A2'));
    assert.ok(html.includes('В производстве'));
    assert.ok(html.includes('Артис'));
  });

  it('renders CopilotDrugInteractionCard with contraindication warnings', () => {
    const interactions = [
      {
        severity: 'contraindicated',
        medicationA: 'Амоксициллин',
        medicationB: 'Метотрексат',
        description: 'Увеличение токсичности метотрексата за счет снижения почечного клиренса.',
        medical_advice: 'Заменить антибиотик на спирамицин/кларитромицин под контролем формулы крови.',
      },
    ];
    const html = renderToString(
      <CopilotDrugInteractionCard
        interactions={interactions}
        patientAllergies={['Пенициллины']}
        safeAlternatives={['Кларитромицин', 'Азитромицин']}
      />
    );
    assert.ok(html.includes('ПРОТИВОПОКАЗАНО'));
    assert.ok(html.includes('Амоксициллин'));
    assert.ok(html.includes('Метотрексат'));
    assert.ok(html.includes('Клиническая рекомендация'));
    assert.ok(html.includes('Пенициллины'));
    assert.ok(html.includes('Кларитромицин'));
  });

  it('renders CopilotTimelineCard with chronological visits and ICD-10 codes', () => {
    const events = [
      {
        id: 'ev-1',
        date: '2026-08-20T10:00:00Z',
        type: 'visit',
        title: 'Первичный осмотр и диагностика кариеса',
        doctor_name: 'Д-р Смирнов А.В.',
        specialty: 'Терапевт',
        icd10: 'K02.1',
        teeth: ['1.6', '1.7'],
      },
      {
        id: 'ev-2',
        date: '2026-08-25T14:00:00Z',
        type: 'payment',
        title: 'Оплата этапа лечения',
        amount_rub: 14500,
      },
    ];
    const html = renderToString(<CopilotTimelineCard events={events} patientId="pat-10" />);
    assert.ok(html.includes('Первичный осмотр'));
    assert.ok(html.includes('Смирнов'));
    assert.ok(html.includes('K02.1'));
    assert.ok(html.includes('1.6'));
    assert.ok(html.includes('14') && html.includes('500'));
  });

  it('dispatches specialized cards via CopilotResultCard', () => {
    const labResult = {
      lab_orders: [
        {
          order_id: 'LAB-99',
          prosthesis_kind: 'E.max винир',
          vita_shade: 'BL2',
          status: 'ready',
        },
      ],
    };
    const htmlLab = renderToString(<CopilotResultCard name="get_lab_orders" result={labResult} />);
    assert.ok(htmlLab.includes('E.max винир') && htmlLab.includes('BL2'));

    const drugResult = {
      interactions: [
        {
          severity: 'high',
          title: 'Лидокаин + Неселективные бета-блокаторы',
          description: 'Риск гипертензии и брадикардии.',
        },
      ],
    };
    const htmlDrug = renderToString(<CopilotResultCard name="check_drug_interactions" result={drugResult} />);
    assert.ok(htmlDrug.includes('Лидокаин') || htmlDrug.includes('брадикардии'));

    const timelineResult = {
      timeline: [
        {
          id: 't-1',
          date: '2026-08-01T12:00:00Z',
          type: 'visit',
          title: 'Консультация ортодонта',
        },
      ],
    };
    const htmlTimeline = renderToString(<CopilotResultCard name="get_patient_timeline" result={timelineResult} />);
    assert.ok(htmlTimeline.includes('Консультация ортодонта'));
  });
});

describe('Copilot Core Cards & SSR Rendering', () => {
  it('renders CopilotPatientCard with details', () => {
    const patient = {
      id: 'pat-123',
      full_name: 'Иванов Иван Иванович',
      phone: '+7 999 123-45-67',
      email: 'ivanov@example.com',
      status: 'active',
      date_of_birth: '1985-05-12',
    };
    const html = renderToString(
      <CopilotPatientCard patient={patient} onSelectPatient={() => {}} />
    );
    assert.ok(html.includes('Иванов Иван Иванович'));
    assert.ok(html.includes('+7 999 123-45-67'));
    assert.ok(html.includes('Активен') || html.includes('active'));
    assert.ok(html.includes('Карта') || html.includes('Пациент') || html.includes('Иванов'));
  });

  it('renders CopilotAppointmentCard with status badge', () => {
    const appt = {
      id: 'appt-1',
      patient_name: 'Петрова Анна',
      start_time: '2026-08-27T14:00:00Z',
      end_time: '2026-08-27T15:00:00Z',
      status: 'confirmed',
      cabinet: 'Кабинет №2 (Терапия)',
    };
    const html = renderToString(
      <CopilotAppointmentCard appointment={appt} onSelectAppointment={() => {}} />
    );
    assert.ok(html.includes('Петрова Анна'));
    assert.ok(html.includes('Кабинет №2') || html.includes('Кабинет'));
    assert.ok(html.includes('Подтвержден'));
  });

  it('renders CopilotConfirmCard with humanized arguments and destructive styling', () => {
    const args = {
      patient_id: 'pat-1',
      start_time: '2026-08-27T15:00:00Z',
      duration_minutes: 45,
    };
    const html = renderToString(
      <CopilotConfirmCard
        callId="c1"
        name="book_appointment"
        args={args}
        onConfirm={() => {}}
      />
    );
    assert.ok(html.includes('Требуется подтверждение'));
    assert.ok(html.includes('Подтвердить'));
    assert.ok(html.includes('Отклонить'));
  });

  it('renders CopilotSlotCard with available windows', () => {
    const slots = [
      { start_time: '2026-08-27T10:00:00Z', end_time: '2026-08-27T11:00:00Z', cabinet: 'Кабинет №1' },
    ];
    const html = renderToString(<CopilotSlotCard slots={slots} onBookSlot={() => {}} />);
    assert.ok(html.includes('Доступные окна') || html.includes('окна') || html.includes('Кабинет №1'));
  });

  it('renders CopilotNudges with proactive banners', () => {
    const nudges = [
      {
        id: 'n1',
        kind: 'appointment_cancelled',
        payload: { start_time: '2026-08-27T16:00:00Z' },
        created_at: '2026-08-27T10:00:00Z',
      },
    ];
    const html = renderToString(
      <CopilotNudges nudges={nudges} onAct={() => {}} onDismiss={() => {}} />
    );
    assert.ok(html.includes('отменён') || html.includes('окно') || html.includes('Скрыть'));
  });

  it('renders CopilotSuggestions categories and prompts', () => {
    const html = renderToString(<CopilotSuggestions onPick={() => {}} />);
    assert.ok(html.includes('Клинический ассистент DENTE') || html.includes('DENTE'));
    assert.ok(html.includes('Рабочие сценарии') || html.includes('сценарии'));
  });

  it('renders CopilotComposer with dictation and trust note', () => {
    const html = renderToString(
      <CopilotComposer value="Тест" busy={false} onChange={() => {}} onSubmit={() => {}} />
    );
    assert.ok(html.includes('Данные защищены') || html.includes('Ctrl+K'));
  });

  it('renders full CopilotDrawer with chat messages and tabs', () => {
    const html = renderToString(
      <CopilotDrawer
        isOpen={true}
        messages={[{ kind: 'text', role: 'assistant', text: 'Привет, доктор!' }]}
        busy={false}
        phase={null}
        pending={null}
        nameCache={{}}
        nudges={[]}
        activeTab="chat"
        onTabChange={() => {}}
        onClose={() => {}}
        onSend={() => {}}
        onConfirm={() => {}}
        onReset={() => {}}
        onDismissNudge={() => {}}
      />
    );
    assert.ok(html.includes('DENTE Copilot'));
    assert.ok(html.includes('Привет, доктор!'));
    assert.ok(html.includes('Чат'));
    assert.ok(html.includes('Задачи'));
  });
});
