/**
 * hygienePresets.ts — Hygiene and prophylaxis presets.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 150 lines.
 * - Zero cartoon emojis, 100% strict clinical models.
 */

export const HYGIENE_PRESETS = [
  {
    id: "hygiene",
    label: "Профгигиена (Air-Flow + УЗ)",
    prompt: "профгигиена Air-Flow, ультразвуковой скейлинг, фторирование",
    toothNumber: 11,
    toothState: "NORM",
    toothStateLabel: "Норма (санация)",
    surfaces: [],
    services: [
      {
        id: "srv-h1",
        code804n: "A16.07.051",
        title: "Профессиональная гигиена полости рта и зубов (УЗ + Air-Flow)",
        quantity: 1,
        priceRub: 5000,
      },
      {
        id: "srv-h2",
        code804n: "A11.07.024",
        title: "Местное применение реминерализующих препаратов (фторирование)",
        quantity: 1,
        priceRub: 1500,
      },
    ],
    soap: {
      complaint: "Жалобы на наличие темного пигментированного налета и зубного камня.",
      anamnesis: "Последняя профессиональная гигиена проводилась более 1 года назад.",
      objectiveStatus: "Массивные наддесневые зубные отложения во фронтальном отделе нижней челюсти, пигментированный налет курильщика на молярах. Десна умеренно гиперемирована.",
      diagnosis: "K03.6 Зубные отложения",
      treatmentPlan: "Ультразвуковой скейлинг наддесневых отложений, воздушно-абразивная полировка Air-Flow порошком глицина, полировка пастой Cleanic, покрытие фторлаком Белак-F.",
      recommendations: "Не употреблять красящие продукты (кофе, чай) 24 часа. Замена зубной щетки.",
    },
    anesthetic: undefined,
    consent: {
      consentCode: "IDS-08-HYGIENE",
      consentTitle: "ИДС на проведение профессиональной гигиены и профилактических процедур",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Профессиональная гигиена",
      toothOrArea: "Полость рта",
    },
    safetyAlert: {
      id: "alert-3",
      severity: "info" as const,
      title: "Гигиенический статус",
      description: "Противопоказаний нет. Рекомендована профгигиена и контрольный осмотр 1 раз в 6 месяцев.",
    },
    thoughts: [
      {
        id: "th1",
        stepNumber: 1,
        title: "Оценка гигиенических индексов (OHI-S, КПУ)...",
        status: "done" as const,
        detail: "Выявлены минерализованные наддесневые отложения.",
        durationMs: 60,
      },
      {
        id: "th2",
        stepNumber: 2,
        title: "Диагностика МКБ-10: K03.6 Зубные отложения...",
        status: "done" as const,
        detail: "Определен объем профессиональной гигиены.",
        durationMs: 70,
      },
      {
        id: "th3",
        stepNumber: 3,
        title: "Расчет комплекса профессиональной гигиены...",
        status: "done" as const,
        detail: "Комплекс A16.07.051 + реминерализация A11.07.024. Итого: 6 500 ₽.",
        durationMs: 80,
      },
      {
        id: "th4",
        stepNumber: 4,
        title: "Формирование протокола профилактического приёма...",
        status: "done" as const,
        detail: "Протокол гигиены подготовлен.",
        durationMs: 65,
      },
    ],
  },
];
