/**
 * apps/web/src/components/copilot/chairside/presets/therapyPresets.ts
 *
 * Therapeutic and endodontic clinical presets for ChairsideCopilotHUD.
 * Compliance: Mandate 8b (<= 250 lines), zero cartoon emojis, 100% strict clinical models.
 */

export const THERAPY_PRESETS = [
  {
    id: "caries-16",
    label: "Кариес 16 (пломба + анестезия)",
    prompt: "вылечили кариес 16 зуба, световая пломба, анестезия убистезин 1 карпула",
    toothNumber: 16,
    toothState: "C2",
    toothStateLabel: "Кариес дентина (C2)",
    surfaces: ["O"],
    services: [
      {
        id: "srv-1",
        code804n: "A16.07.002.010",
        title: "Препарирование и медикаментозная обработка кариозной полости",
        quantity: 1,
        priceRub: 2500,
        toothNumber: 16,
      },
      {
        id: "srv-2",
        code804n: "A16.07.002.011",
        title: "Восстановление зуба пломбой светового отверждения (композит)",
        quantity: 1,
        priceRub: 4500,
        toothNumber: 16,
      },
      {
        id: "srv-3",
        code804n: "A25.07.001",
        title: "Местная анестезия (Убистезин 1 карпула 1.7 мл)",
        quantity: 1,
        priceRub: 1200,
        toothNumber: 16,
      },
    ],
    soap: {
      complaint: "Жалобы на кратковременные боли от термических и сладких раздражителей в зубе 16.",
      anamnesis: "Зуб ранее не лечен, дискомфорт возник около недели назад.",
      objectiveStatus: "На окклюзионной поверхности зуба 16 глубокая кариозная полость с пигментированным дентином. Зондирование дна чувствительно, перкуссия безболезненна.",
      diagnosis: "K02.1 Кариес дентина (зуб 16)",
      treatmentPlan: "Инфильтрационная анестезия Ubistesin 1.7 ml. Препарирование полости, некрэктомия, обработка 2% хлоргексидином. Адгезивная подготовка, нанокомпозит светового отверждения Filtek A2/OA2, шлифовка и полировка.",
      recommendations: "Щадящая диета 2 часа, контрольный осмотр через 6 месяцев.",
    },
    anesthetic: {
      drugName: "Убистезин (Артикаин 4% + эпинефрин 1:200 000)",
      carpulesCount: 1,
      patientWeightKg: 70,
      maxCarpules: 7,
      epinephrineMcg: 8.5,
      isCardiovascularRisk: false,
      notes: "В пределах МРД (до 7 карпул). Стандартная инфильтрационная анестезия.",
    },
    consent: {
      consentCode: "IDS-02-THERAPY",
      consentTitle: "ИДС на терапевтическое лечение кариеса и некариозных поражений",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Терапевтическое лечение кариеса",
      toothOrArea: "Зуб 16",
    },
    safetyAlert: {
      id: "alert-1",
      severity: "info" as const,
      title: "Аллергологический профиль проверен",
      description: "Аллергии на артикаин и сульфиты не зафиксированы. Противопоказаний нет.",
    },
    thoughts: [],
  },
  {
    id: "pulpitis-26",
    label: "Пульпит 26 (эндодонтия 3 канала)",
    prompt: "пульпит 26 зуба, эндодонтия 3 канала, временная пломба",
    toothNumber: 26,
    toothState: "P",
    toothStateLabel: "Пульпит (P)",
    surfaces: ["M", "O", "D"],
    services: [
      {
        id: "srv-p1",
        code804n: "A16.07.008",
        title: "Экстирпация пульпы и механическая обработка корневого канала (3 канала)",
        quantity: 3,
        priceRub: 6000,
        toothNumber: 26,
      },
      {
        id: "srv-p2",
        code804n: "A16.07.030",
        title: "Временное пломбирование лекарственным препаратом (Каласепт)",
        quantity: 1,
        priceRub: 1800,
        toothNumber: 26,
      },
      {
        id: "srv-p3",
        code804n: "A25.07.001",
        title: "Местная анестезия (Убистезин 1.7 мл)",
        quantity: 1,
        priceRub: 1200,
        toothNumber: 26,
      },
    ],
    soap: {
      complaint: "Жалобы на самопроизвольные приступообразные ночные боли в области зуба 26 с иррадиацией в висок.",
      anamnesis: "Боли начались 2 дня назад, усиливаются от температурных раздражителей.",
      objectiveStatus: "Глубокая кариозная полость MOD в зубе 26, зондирование болезненно в одной точке. Перкуссия слабо чувствительна.",
      diagnosis: "K04.0 Острый очаговый пульпит (зуб 26)",
      treatmentPlan: "Проводниковая анестезия. Раскрытие полости, экстирпация пульпы из 3 каналов (MB, DB, P). Медикаментозная обработка NaOCl 3%, ЭДТА 17%. Временное введение гидроксида кальция, временная повязка Септопак.",
      recommendations: "Повторный визит через 7 дней для постоянной обтурации каналов.",
    },
    anesthetic: {
      drugName: "Убистезин форте (Артикаин 4% + эпинефрин 1:100 000)",
      carpulesCount: 1,
      patientWeightKg: 70,
      maxCarpules: 7,
      epinephrineMcg: 17,
      isCardiovascularRisk: false,
      notes: "Проводниковая мандибулярная/туберальная анестезия при остром пульпите.",
    },
    consent: {
      consentCode: "IDS-03-ENDO",
      consentTitle: "ИДС на эндодонтическое лечение (депульпирование, обработка и пломбирование каналов)",
      regulatoryBasis: "ст. 20 323-ФЗ, Приказ Минздрава 1051н",
      procedureType: "Эндодонтическое лечение",
      toothOrArea: "Зуб 26",
    },
    safetyAlert: {
      id: "alert-2",
      severity: "warning" as const,
      title: "Эндодонтический протокол безопасности",
      description: "Обязателен рентген-контроль рабочей длины каналов перед постоянной обтурацией.",
    },
    thoughts: [],
  },
];

export const THERAPY_COPILOT_PRESETS = THERAPY_PRESETS;
