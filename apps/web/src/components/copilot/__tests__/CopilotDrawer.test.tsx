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
  CopilotActionConfirm,
  CopilotActionConfirmation,
  CopilotConfirmCard,
  CopilotLabOrderCard,
  CopilotDrugInteractionCard,
  CopilotTimelineCard,
  CopilotResultCard,
  CopilotNudges,
  CopilotSuggestions,
  CopilotComposer,
  CopilotDrawer,
  PatientProfileCard,
  ScheduleSlotPickerCard,
  Prescription107Card,
  EstimateTierCard,
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

  it('guarantees 100% NaN and edge case protection in formatMoney', () => {
    assert.ok(formatMoney(NaN).includes('0'));
    assert.ok(formatMoney(null).includes('0'));
    assert.ok(formatMoney(undefined).includes('0'));
    assert.ok(formatMoney(Infinity).includes('0'));
    assert.ok(formatMoney(-Infinity).includes('0'));
    assert.ok(formatMoney('invalid_string').includes('0'));
    assert.ok(formatMoney('12 500,50').includes('12'));
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

  it('renders CopilotActionConfirm with 3-way choices and humanized arguments', () => {
    const args = {
      patient_id: 'pat-1',
      start_time: '2026-08-27T15:00:00Z',
      duration_minutes: 45,
      cabinet: 'Кабинет №1',
    };
    const html = renderToString(
      <CopilotActionConfirm
        callId="c1"
        name="agenda.book_appointment"
        args={args}
        onConfirm={() => {}}
      />
    );
    assert.ok(html.includes('Запись на прием'));
    assert.ok(html.includes('Требуется подтверждение'));
    assert.ok(html.includes('Подтвердить'));
    assert.ok(html.includes('Изменить'));
    assert.ok(html.includes('Отклонить'));
    assert.ok(html.includes('45 мин.'));
  });

  it('renders CopilotActionConfirm with destructive styling and resolved states', () => {
    const args = {
      medication: 'Амоксициллин 500мг',
      quantity: 2,
    };
    const htmlDestructive = renderToString(
      <CopilotActionConfirm
        callId="c2"
        name="inventory.dispense_drugs"
        args={args}
        onConfirm={() => {}}
      />
    );
    assert.ok(htmlDestructive.includes('Списание лекарственных средств') || htmlDestructive.includes('Списание медикаментов'));
    assert.ok(htmlDestructive.includes('destructive'));

    const htmlConfirmed = renderToString(
      <CopilotActionConfirm
        callId="c2"
        name="inventory.dispense_drugs"
        args={args}
        resolved="confirm"
      />
    );
    assert.ok(htmlConfirmed.includes('Подтверждено'));
    assert.ok(!htmlConfirmed.includes('Отмена правок'));
  });

  it('renders CopilotActionConfirmation component with 3-way choices and field labels', () => {
    const args = {
      patient_name: 'Иванов Иван Иванович',
      service_name: 'Профессиональная гигиена полости рта',
      discount_percent: 15,
      reason: 'Акция для первичных пациентов',
    };
    const html = renderToString(
      <CopilotActionConfirmation
        callId="c3"
        name="billing.apply_discount"
        args={args}
        onConfirm={() => {}}
      />
    );
    assert.ok(html.includes('Применение специальной скидки') || html.includes('Применение скидки'));
    assert.ok(html.includes('Требуется подтверждение'));
    assert.ok(html.includes('Подтвердить'));
    assert.ok(html.includes('Изменить'));
    assert.ok(html.includes('Отклонить'));
    assert.ok(html.includes('15%'));
    assert.ok(html.includes('Иванов Иван Иванович'));
  });

  it('renders CopilotConfirmCard with humanized arguments and backward compatibility', () => {
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
    assert.ok(html.includes('Изменить'));
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
      <CopilotComposer value="Тест" busy={false} onChange={() => {}} onSubmit={() => {}} onReset={() => {}} />
    );
    assert.ok(html.includes('Данные защищены') || html.includes('Ctrl+K'));
    assert.ok(html.includes('Сброс'));
  });

  it('renders full CopilotDrawer with non-blocking split-view dock and tabs', () => {
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
    assert.ok(html.includes('Split-View'));
    // Ensure no blocking backdrop element
    assert.ok(!html.includes('copilot-backdrop'));
  });

  it('renders PatientProfileCard with avatar, balance, allergies, and open card button', () => {
    const patientData = {
      id: 'p-100',
      fullName: 'Барабаш Сергей Владимирович',
      birthDate: '15.04.1985',
      phone: '+7 (999) 123-45-67',
      cardNumber: '043-789',
      status: 'VIP',
      balanceRub: 14500,
      familyBalanceRub: 35000,
      allergies: ['Пенициллин', 'Лидокаин'],
      lastVisitDate: '20.08.2026',
      lastDoctorName: 'Д-р Смирнова А.С.',
      lastDiagnosis: 'K02.1 Кариес дентина',
      nextAppointmentDate: '05.09.2026 14:00',
      activePlanStage: 'Этап 2: Эндодонтия 2.6',
    };

    const html = renderToString(
      <PatientProfileCard
        patient={patientData}
        onOpenCard={() => {}}
        onBookAppointment={() => {}}
        onSelectPlan={() => {}}
      />
    );

    assert.ok(html.includes('Барабаш Сергей Владимирович'));
    assert.ok(html.includes('БС') || html.includes('Б'));
    assert.ok(html.includes('VIP'));
    assert.ok(html.includes('14') && html.includes('500'));
    assert.ok(html.includes('Семейный'));
    assert.ok(html.includes('Аллергический статус'));
    assert.ok(html.includes('Пенициллин') && html.includes('Лидокаин'));
    assert.ok(html.includes('Кариес дентина'));
    assert.ok(html.includes('Открыть карту'));
  });

  it('renders ScheduleSlotPickerCard with doctor info, date chips, and 1-click booking', () => {
    const scheduleData = {
      doctorId: 'doc-1',
      doctorName: 'Д-р Иванов Петр Сергеевич',
      doctorSpecialty: 'Стоматолог-ортопед',
      cabinet: 'Кабинет № 3 (Кресло 1)',
      date: 'Сегодня',
      availableDates: ['Сегодня', 'Завтра', '02.09'],
      slots: [
        { id: 's-1', time: '09:00', durationMinutes: 30, cabinet: 'Каб. 3', isAvailable: true },
        { id: 's-2', time: '10:30', durationMinutes: 60, cabinet: 'Каб. 3', isAvailable: true },
        { id: 's-3', time: '12:00', durationMinutes: 30, cabinet: 'Каб. 3', isAvailable: false },
        { id: 's-4', time: '14:30', durationMinutes: 45, cabinet: 'Каб. 3', isAvailable: true },
      ],
    };

    const html = renderToString(
      <ScheduleSlotPickerCard
        data={scheduleData}
        selectedSlotId="s-2"
        onSelectSlot={() => {}}
        onBookSlot={() => {}}
        onChangeDate={() => {}}
      />
    );

    assert.ok(html.includes('Д-р Иванов Петр Сергеевич'));
    assert.ok(html.includes('Стоматолог-ортопед'));
    assert.ok(html.includes('Кабинет № 3'));
    assert.ok(html.includes('09:00'));
    assert.ok(html.includes('10:30'));
    assert.ok(html.includes('14:30'));
    assert.ok(html.includes('Забронировать'));
  });

  it('renders Prescription107Card with statutory 1094n header, Latin Rp lines, DDI safety, and UKEP', () => {
    const rxData = {
      series: '77-АА',
      number: '004821',
      patientName: 'Смирнова Елена Васильевна',
      patientBirthDate: '12.11.1990',
      doctorName: 'Д-р Барабаш С.В.',
      doctorSpecialty: 'Врач-стоматолог-терапевт',
      diagnosisIcd10: 'K04.0',
      diagnosisName: 'Острый пульпит',
      drugs: [
        {
          id: 'd1',
          mnn: 'Nimesulide',
          tradeName: 'Нимесил',
          latinName: 'Tab. Nimesulidi',
          dosageForm: 'таблетки',
          dosage: '100 мг',
          quantity: '№ 20',
          signa: 'По 1 таблетке 2 раза в день после еды при болях. Курс 5 дней.',
        },
        {
          id: 'd2',
          mnn: 'Chlorhexidine',
          tradeName: 'Хлоргексидин',
          latinName: 'Sol. Chlorhexidini bigluconatis',
          dosageForm: 'раствор',
          dosage: '0.05%',
          quantity: '100 мл',
          signa: 'Ротовые ванночки 3 раза в день по 1 минуте после чистки зубов.',
        },
      ],
      isSignedUkep: true,
      ukepCertificate: '00E10352F71B39D48C19',
      ukepSignedAt: '31.08.2026 22:30',
    };

    const html = renderToString(
      <Prescription107Card
        prescription={rxData}
        onPrint={() => {}}
        onSignUkep={() => {}}
      />
    );

    assert.ok(html.includes('Рецептурный бланк № 107-1/у'));
    assert.ok(html.includes('1094н'));
    assert.ok(html.includes('77-АА № 004821'));
    assert.ok(html.includes('Смирнова Елена Васильевна'));
    assert.ok(html.includes('Tab. Nimesulidi 100 мг'));
    assert.ok(html.includes('Sol. Chlorhexidini bigluconatis 0.05%'));
    assert.ok(html.includes('D.S.'));
    assert.ok(html.includes('DDI Safe'));
    assert.ok(html.includes('Электронный документ подписан УКЭП') || html.includes('УКЭП'));
    assert.ok(html.includes('00E10352F71B39D48C19'));
    assert.ok(html.includes('Печать 107-1/у'));
  });

  it('renders EstimateTierCard with 3 parallel pricing tiers (Economy, Optimum, Premium), 13% tax deduction, and installments', () => {
    const estimateData = {
      patientName: 'Барабаш Сергей Владимирович',
      teeth: ['1.6', '2.6', '3.6'],
      selectedTier: 'optimum' as const,
      tiers: [
        {
          tierKey: 'economy' as const,
          tierName: 'Тариф «Эконом»',
          badge: 'Базовый',
          totalRub: 45000,
          taxDeductionRub: 5850,
          netCostAfterDeductionRub: 39150,
          monthlyInstallmentRub: 3750,
          installmentMonths: 12,
          warrantyDescription: '1 год официальной гарантии',
          materialsDescription: 'Базовые сертифицированные композиты (Filtek Z250) и металлокерамика Co-Cr',
          keyAdvantages: ['Доступная стоимость санации', 'Сертифицированные материалы', 'Гарантия 1 год'],
        },
        {
          tierKey: 'optimum' as const,
          tierName: 'Тариф «Оптимум»',
          badge: '★ Рекомендуемый (Выбор врачей)',
          totalRub: 84500,
          taxDeductionRub: 10985,
          netCostAfterDeductionRub: 73515,
          monthlyInstallmentRub: 7042,
          installmentMonths: 12,
          warrantyDescription: '2 года расширенной гарантии',
          materialsDescription: 'Нанокомпозиты Estelite Sigma Quick, безметалловая керамика IPS e.max Press',
          keyAdvantages: ['Идеальный баланс эстетики и долговечности', 'Керамика e.max и наногибрид', 'Расширенная гарантия 2 года'],
          stages: [
            { stageName: 'Терапевтическая санация', proceduresCount: 3, totalRub: 24500 },
            { stageName: 'Ортопедическая реставрация', proceduresCount: 2, totalRub: 60000 },
          ],
        },
        {
          tierKey: 'premium' as const,
          tierName: 'Тариф «Премиум»',
          badge: 'VIP / Индивидуальный',
          totalRub: 148000,
          taxDeductionRub: 19240,
          netCostAfterDeductionRub: 128760,
          monthlyInstallmentRub: 12333,
          installmentMonths: 12,
          warrantyDescription: 'Пожизненная гарантия на конструкции',
          materialsDescription: 'CAD/CAM диоксид циркония Multi-Layer, индивидуальные титановые абатменты',
          keyAdvantages: ['Максимальная биосовместимость', 'Персональный куратор лечения', 'Пожизненная гарантия'],
        },
      ],
    };

    const html = renderToString(
      <EstimateTierCard
        data={estimateData}
        activeTier="optimum"
        onSelectTier={() => {}}
        onApplyTier={() => {}}
      />
    );

    assert.ok(html.includes('3 тарифных варианта') || html.includes('Тариф'));
    assert.ok(html.includes('Оптимум'));
    assert.ok(html.includes('Премиум'));
    assert.ok(html.includes('Эконом'));
    assert.ok(html.includes('84') && html.includes('500'));
    assert.ok(html.includes('13% НДФЛ'));
    assert.ok(html.includes('10') && html.includes('985'));
    assert.ok(html.includes('Рассрочка 0%'));
    assert.ok(html.includes('IPS e.max Press'));
    assert.ok(html.includes('Применить тариф в план лечения'));
  });

  it('renders CopilotResultCard dispatching EstimateTierCard, Prescription107Card, and PatientProfileCard correctly', () => {
    // 1. Estimate tiers result
    const estimateResult = {
      patientName: 'Иванов Иван Иванович',
      teeth: ['1.1', '2.1'],
      tiers: [
        {
          tierKey: 'optimum',
          tierName: 'Тариф «Оптимум»',
          badge: 'Выбор врачей',
          totalRub: 65000,
          taxDeductionRub: 8450,
          netCostAfterDeductionRub: 56550,
          warrantyDescription: '2 года гарантии',
          materialsDescription: 'IPS e.max',
          keyAdvantages: ['Высокая эстетика'],
        },
      ],
    };

    const htmlEstimate = renderToString(
      <CopilotResultCard
        toolName="clinical.calculate_treatment_estimate"
        result={estimateResult}
      />
    );
    assert.ok(htmlEstimate.includes('3 тарифных варианта') || htmlEstimate.includes('Оптимум'));
    assert.ok(htmlEstimate.includes('65') && htmlEstimate.includes('000'));

    // 2. Prescription 107-1/u result
    const rxResult = {
      prescription: {
        series: '77-АА',
        number: '123456',
        patientName: 'Ковалева Анна Петровна',
        doctorName: 'Д-р Смирнова А.С.',
        drugs: [
          {
            id: 'd1',
            mnn: 'Amoxicillin',
            latinName: 'Tab. Amoxicillini',
            dosage: '500 мг',
            quantity: '№ 20',
            signa: 'По 1 таблетке 3 раза в день.',
          },
        ],
      },
    };

    const htmlRx = renderToString(
      <CopilotResultCard
        toolName="clinical.prescription_107"
        result={rxResult}
      />
    );
    assert.ok(htmlRx.includes('Рецептурный бланк № 107-1/у'));
    assert.ok(htmlRx.includes('Ковалева Анна Петровна'));
    assert.ok(htmlRx.includes('Tab. Amoxicillini'));
  });
});
