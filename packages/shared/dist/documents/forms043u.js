import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 043/у — МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА
 * Приказ Минздрава СССР № 1030 / Приказ Минздрава РФ № 274н / 804н / СтАР
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** 5 поверхностей зуба по анатомической номенклатуре */
export const toothSurfaceSchema = z.enum([
    "occlusal", // O — окклюзионная (жевательная / режущий край incisal)
    "vestibular", // V / B — вестибулярная (щечная / губная)
    "oral", // L / P — оральная (язычная lingual / нёбная palatal)
    "mesial", // M — мезиальная (медиальная контактная)
    "distal", // D — дистальная (латеральная контактная)
]);
export const toothSurfaceLabels = {
    occlusal: "Окклюзионная / Режущий край (O)",
    vestibular: "Вестибулярная / Щечная (V)",
    oral: "Оральная / Язычная / Нёбная (L)",
    mesial: "Мезиальная (M)",
    distal: "Дистальная (D)",
};
/** Клинический статус отдельного зуба в формуле FDI */
export const toothClinicalStatusCodeSchema = z.enum([
    "healthy", // Здоровый (норма)
    "caries_initial", // C0 / K02.0 — Кариес в стадии пятна
    "caries_superficial", // C1 / K02.0 — Поверхностный кариес
    "caries_media", // C2 / K02.1 — Средний кариес (эмали и дентина)
    "caries_profunda", // C3 / K02.1 — Глубокий кариес
    "caries_cementum", // C4 / K02.2 — Кариес цемента
    "pulpitis_acute", // P / K04.0 — Острый пульпит
    "pulpitis_chronic", // Pch / K04.0 — Хронический пульпит
    "pulpitis_necrosis", // Pn / K04.1 — Некроз / гангрена пульпы
    "periodontitis_acute", // Pt / K04.4 — Острый апикальный периодонтит
    "periodontitis_chronic", // Ptch / K04.5 — Хронический периодонтит
    "periodontitis_radicular_cyst", // K04.8 — Корневая киста / гранулема
    "filled_satisfactory", // Pl — Пломбирован (сохранна)
    "filled_secondary_caries", // Pl+C — Пломба с вторичным/рецидивным кариесом
    "filled_defective", // Pl_def — Дефектная пломба (нарушение краевого прилегания)
    "crown_metal_ceramic", // K_mc — Коронка металлокерамическая
    "crown_zirconia", // K_zr — Коронка диоксид циркония
    "crown_emax", // K_emax — Безметалловая коронка E-max
    "crown_temporary", // K_temp — Временная коронка
    "inlay_onlay", // Inlay / Onlay — Вкладка керамическая / композитная
    "veneer", // V — Винир
    "bridge_abutment", // BA — Опорный зуб мостовидного протеза
    "bridge_pontic", // BP — Искусственный зуб мостовидного протеза
    "implant", // I — Дентальный имплантат
    "extracted_absent", // A / O — Удален / Отсутствует (адентия)
    "root_remnant", // R — Разрушен до уровня десны / Корень
    "fracture", // Fr — Травма / Фрактура коронки / корня
    "fluorosis", // Fl / K00.3 — Флюороз
    "wedge_defect", // W / K03.1 — Клиновидный дефект
    "erosion", // Er / K03.2 — Эрозия эмали
    "attrition_pathological", // At / K03.0 — Патологическая стираемость
    "hypoplasia", // Hyp / K00.4 — Гипоплазия эмали
    "sealant_fissure", // F — Герметизированная фиссура
    "retention_impacted", // Ret — Ретинированный / Дистопированный
    "mobility_degree_1", // Mob1 — Подвижность I степени
    "mobility_degree_2", // Mob2 — Подвижность II степени
    "mobility_degree_3", // Mob3 — Подвижность III степени
]);
export const toothStatusCodeShortMap = {
    healthy: "Norm",
    caries_initial: "C0",
    caries_superficial: "C1",
    caries_media: "C2",
    caries_profunda: "C3",
    caries_cementum: "Cc",
    pulpitis_acute: "P",
    pulpitis_chronic: "Pch",
    pulpitis_necrosis: "Pn",
    periodontitis_acute: "Pt",
    periodontitis_chronic: "Ptch",
    periodontitis_radicular_cyst: "Cyst",
    filled_satisfactory: "Pl",
    filled_secondary_caries: "Pl+C",
    filled_defective: "Pl(д)",
    crown_metal_ceramic: "K(мк)",
    crown_zirconia: "K(zr)",
    crown_emax: "K(em)",
    crown_temporary: "K(вр)",
    inlay_onlay: "Вкл",
    veneer: "Вин",
    bridge_abutment: "Опора",
    bridge_pontic: "Фасет",
    implant: "Импл",
    extracted_absent: "Отс(A)",
    root_remnant: "R(кор)",
    fracture: "Фрак",
    fluorosis: "Флю",
    wedge_defect: "Клин",
    erosion: "Эроз",
    attrition_pathological: "Стир",
    hypoplasia: "Гипо",
    sealant_fissure: "Герм(F)",
    retention_impacted: "Рет(R)",
    mobility_degree_1: "I ст.",
    mobility_degree_2: "II ст.",
    mobility_degree_3: "III ст.",
};
export const toothStatusCodeLabels = {
    healthy: "Здоровый (норма)",
    caries_initial: "Кариес в стадии пятна (K02.0)",
    caries_superficial: "Поверхностный кариес (K02.0)",
    caries_media: "Средний кариес (K02.1)",
    caries_profunda: "Глубокий кариес (K02.1)",
    caries_cementum: "Кариес цемента (K02.2)",
    pulpitis_acute: "Острый пульпит (K04.0)",
    pulpitis_chronic: "Хронический пульпит (K04.0)",
    pulpitis_necrosis: "Некроз пульпы / гангрена (K04.1)",
    periodontitis_acute: "Острый апикальный периодонтит (K04.4)",
    periodontitis_chronic: "Хронический апикальный периодонтит (K04.5)",
    periodontitis_radicular_cyst: "Корневая киста / апикальная гранулема (K04.8)",
    filled_satisfactory: "Пломбирован без дефектов (Pl)",
    filled_secondary_caries: "Пломба с вторичным кариесом (Pl+C)",
    filled_defective: "Дефектная пломба / нарушение краевого прилегания",
    crown_metal_ceramic: "Коронка металлокерамическая",
    crown_zirconia: "Коронка диоксид циркония",
    crown_emax: "Коронка безметалловая E-max",
    crown_temporary: "Коронка временная",
    inlay_onlay: "Вкладка керамическая / композитная",
    veneer: "Винир",
    bridge_abutment: "Опорный зуб мостовидного протеза",
    bridge_pontic: "Искусственный зуб мостовидного протеза (тело)",
    implant: "Дентальный имплантат",
    extracted_absent: "Зуб отсутствует / удален ранее (A)",
    root_remnant: "Разрушен, корень зуба под удаление / лечение (R)",
    fracture: "Перелом коронки / корня зуба",
    fluorosis: "Флюороз зубов (K00.3)",
    wedge_defect: "Клиновидный дефект (K03.1)",
    erosion: "Эрозия эмали зуба (K03.2)",
    attrition_pathological: "Патологическая повышенная стираемость (K03.0)",
    hypoplasia: "Гипоплазия эмали (K00.4)",
    sealant_fissure: "Фиссура запечатана герметиком (F)",
    retention_impacted: "Ретинированный / дистопированный зуб",
    mobility_degree_1: "Подвижность зуба I степени",
    mobility_degree_2: "Подвижность зуба II степени",
    mobility_degree_3: "Подвижность зуба III степени",
};
/** Единичная запись зуба в зубной формуле FDI 11-48 / 51-85 */
export const fdiToothRecordSchema = z.object({
    toothNumber: z.number().int().min(11).max(85), // FDI нотация: 11-48 (постоянные), 51-85 (временные)
    statusCode: toothClinicalStatusCodeSchema.default("healthy"),
    surfaces: z.array(toothSurfaceSchema).default([]),
    mobility: z.enum(["none", "degree_1", "degree_2", "degree_3"]).default("none"),
    furcationInvolvement: z.enum(["none", "class_1", "class_2", "class_3"]).default("none"),
    probingDepthMm: z.number().min(0).max(15).nullable().optional(),
    recessionMm: z.number().min(0).max(15).nullable().optional(),
    rootCanalsCount: z.number().int().min(1).max(5).nullable().optional(),
    diagnosisIcd10: z.string().trim().max(32).nullable().optional(),
    customNotes: z.string().trim().max(500).nullable().optional(),
});
export const DENTAL_CONDITION_LABELS = toothStatusCodeLabels;
/** Список всех 32 постоянных зубов FDI */
export const PERMANENT_FDI_TEETH = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, // Верхняя челюсть
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38, // Нижняя челюсть
];
/** Список 20 временных (молочных) зубов FDI */
export const DECIDUOUS_FDI_TEETH = [
    55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
    85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
];
/** Индекс КПУ (DMFT) постоянных и кпу (dft) временных зубов */
export const dmftIndexSchema = z.object({
    decayed: z.number().int().min(0).max(32).default(0), // К (Кариозные постоянные)
    filled: z.number().int().min(0).max(32).default(0), // П (Пломбированные постоянные)
    missing: z.number().int().min(0).max(32).default(0), // У (Удаленные / подлежащие удалению)
    totalDmft: z.number().int().min(0).max(32).default(0), // КПУ = К + П + У
    decayedSurfaces: z.number().int().min(0).max(160).default(0), // КПУ(п) кариозных поверхностей
    filledSurfaces: z.number().int().min(0).max(160).default(0), // КПУ(п) пломбированных поверхностей
    totalDmfs: z.number().int().min(0).max(160).default(0), // КПУ(п) всего
    deciduousDecayed: z.number().int().min(0).max(20).default(0), // к (кариозные временные)
    deciduousFilled: z.number().int().min(0).max(20).default(0), // п (пломбированные временные)
    deciduousExtracted: z.number().int().min(0).max(20).default(0), // у (удаленные временные)
    totalDft: z.number().int().min(0).max(20).default(0), // кпу временных
    intensityLevel: z
        .enum(["very_low", "low", "medium", "high", "very_high"])
        .default("medium"),
});
/** Калькулятор индекса КПУ по зубной формуле */
export function calculateDmftFromOdontogram(teethInput) {
    const teeth = Array.isArray(teethInput)
        ? teethInput
        : Object.values(teethInput ?? {});
    let decayed = 0;
    let filled = 0;
    let missing = 0;
    let decayedSurfaces = 0;
    let filledSurfaces = 0;
    let deciduousDecayed = 0;
    let deciduousFilled = 0;
    let deciduousExtracted = 0;
    const decayedCodes = [
        "C",
        "P",
        "Pt",
        "F_C",
        "caries_initial",
        "caries_superficial",
        "caries_media",
        "caries_profunda",
        "caries_cementum",
        "pulpitis_acute",
        "pulpitis_chronic",
        "pulpitis_necrosis",
        "periodontitis_acute",
        "periodontitis_chronic",
        "periodontitis_radicular_cyst",
        "filled_secondary_caries",
        "fracture",
    ];
    const filledCodes = [
        "F",
        "In",
        "filled_satisfactory",
        "filled_defective",
        "inlay_onlay",
    ];
    const missingCodes = [
        "X",
        "R",
        "root_remnant",
        "extracted_absent",
    ];
    for (const tooth of teeth) {
        const num = Number(tooth.toothNumber);
        const isDeciduous = num >= 51 && num <= 85;
        const cond = tooth.condition ?? tooth.statusCode ?? "H";
        const surfaces = tooth.surfaces
            ? Array.isArray(tooth.surfaces)
                ? tooth.surfaces
                : Object.keys(tooth.surfaces)
            : [];
        const surfCount = Math.max(1, surfaces.length);
        if (isDeciduous) {
            if (decayedCodes.includes(cond))
                deciduousDecayed += 1;
            else if (filledCodes.includes(cond))
                deciduousFilled += 1;
            else if (missingCodes.includes(cond))
                deciduousExtracted += 1;
        }
        else {
            if (decayedCodes.includes(cond)) {
                decayed += 1;
                decayedSurfaces += surfCount;
            }
            else if (filledCodes.includes(cond)) {
                filled += 1;
                filledSurfaces += surfCount;
            }
            else if (missingCodes.includes(cond)) {
                missing += 1;
            }
        }
    }
    const totalDmft = decayed + filled + missing;
    const totalDmfs = decayedSurfaces + filledSurfaces;
    const totalDft = deciduousDecayed + deciduousFilled + deciduousExtracted;
    let intensityLevel = "medium";
    let intensityLevelLabel = "Средний (3.5–4.9)";
    if (totalDmft <= 1.5) {
        intensityLevel = "very_low";
        intensityLevelLabel = "Очень низкий (0–1.5)";
    }
    else if (totalDmft <= 4.9) {
        intensityLevel = totalDmft <= 3.4 ? "low" : "medium";
        intensityLevelLabel =
            totalDmft <= 3.4 ? "Низкий (1.6–3.4)" : "Средний (3.5–4.9)";
    }
    else if (totalDmft <= 8.0) {
        intensityLevel = "high";
        intensityLevelLabel = "Высокий (5–8)";
    }
    else {
        intensityLevel = "very_high";
        intensityLevelLabel = "Очень высокий (> 8.0)";
    }
    return {
        decayed,
        filled,
        missing,
        totalDmft,
        dmftTotal: totalDmft,
        decayedSurfaces,
        filledSurfaces,
        totalDmfs,
        deciduousDecayed,
        deciduousFilled,
        deciduousExtracted,
        totalDft,
        intensityLevel,
        intensityLevelLabel,
    };
}
/** Секстанты и коды индекса CPITN (PSR) */
export const cpitnSextantCodeSchema = z.enum([
    "0_healthy", // Код 0: Десна здорова, кровоточивости и карманов нет
    "1_bleeding", // Код 1: Кровоточивость при мягком зондировании
    "2_calculus", // Код 2: Над- или поддесневой зубной камень
    "3_pocket_4_5mm", // Код 3: Пародонтальный карман глубиной 4-5 мм
    "4_pocket_6mm_plus", // Код 4: Пародонтальный карман глубиной 6 мм и более
    "x_excluded", // Код X: Секстант исключен (менее 2 зубов)
]);
export const cpitnIndexSchema = z.object({
    sextant18_14: cpitnSextantCodeSchema.default("0_healthy"), // 18-14 (Верхний правый)
    sextant13_23: cpitnSextantCodeSchema.default("0_healthy"), // 13-23 (Верхний передний)
    sextant24_28: cpitnSextantCodeSchema.default("0_healthy"), // 24-28 (Верхний левый)
    sextant48_44: cpitnSextantCodeSchema.default("0_healthy"), // 48-44 (Нижний правый)
    sextant43_33: cpitnSextantCodeSchema.default("0_healthy"), // 43-33 (Нижний передний)
    sextant34_38: cpitnSextantCodeSchema.default("0_healthy"), // 34-38 (Нижний левый)
    treatmentNeedCategory: z
        .enum(["0_none", "1_hygiene_instructions", "2_scaling_root_planing", "3_complex_periodontal"])
        .default("0_none"),
});
/** Классификация прикуса */
export const dentalBiteTypeSchema = z.enum([
    "orthognathic", // Ортогнатический (физиологический)
    "direct", // Прямой (физиологический)
    "biprognathic", // Бипрогнатический
    "distal_angle_2", // Дистальный (Класс II по Энглю)
    "mesial_angle_3", // Мезиальный (Класс III по Энглю)
    "deep_bite", // Глубокий прикус (перекрытие более 1/3 высоты коронки)
    "open_bite_anterior", // Открытый прикус передний
    "open_bite_lateral", // Открытый прикус боковой
    "cross_bite_unilateral", // Перекрестный прикус односторонний
    "cross_bite_bilateral", // Перекрестный прикус двусторонний
    "physiological_spaced", // Физиологический со стигмами/тремами
]);
export const dentalBiteTypeLabels = {
    orthognathic: "Ортогнатический прикус (норма)",
    direct: "Прямой прикус",
    biprognathic: "Бипрогнатический прикус",
    distal_angle_2: "Дистальный прикус (Класс II по Энглю)",
    mesial_angle_3: "Мезиальный прикус (Класс III по Энглю)",
    deep_bite: "Глубокий прикус (травмирующий / глубокое резцовое перекрытие)",
    open_bite_anterior: "Открытый прикус в переднем отделе",
    open_bite_lateral: "Открытый прикус в боковых отделах",
    cross_bite_unilateral: "Перекрестный прикус (односторонний)",
    cross_bite_bilateral: "Перекрестный прикус (двусторонний)",
    physiological_spaced: "Физиологический прикус с физиологическими тремами/диастемами",
};
/** Состояние слизистой оболочки полости рта (СОПР) и тканей пародонта */
export const oralMucosaStatusSchema = z.object({
    color: z
        .enum(["pale_pink_normal", "hyperemic_red", "cyanotic_bluish", "anemic_pale"])
        .default("pale_pink_normal"),
    moisture: z.enum(["normal", "dry_xerostomia", "excessive_salivation"]).default("normal"),
    pathologicalElements: z.string().trim().max(1000).nullable().optional(), // Афты, язвы, эрозии, лейкоплакия
    gingivalPapillae: z
        .enum(["normal_pointed", "hypertrophic_swollen", "atrophic_receded", "necrotic"])
        .default("normal_pointed"),
    bleedingPBI: z.enum(["grade_0", "grade_1", "grade_2", "grade_3", "grade_4"]).default("grade_0"),
    tongueStatus: z.string().trim().max(500).default("Язык чистый, влажный, сосочки выражены умерено"),
    regionalLymphNodes: z
        .string()
        .trim()
        .max(500)
        .default("Подчелюстные, шейные, подбородочные лимфоузлы не увеличены, мягкоэластичные, подвижные, безболезненные при пальпации"),
    tmjFunction: z
        .string()
        .trim()
        .max(500)
        .default("Открывание рта в полном объеме (более 40 мм), свободное, безболезненное, девиации и суставного шума/щелчков нет"),
});
/** Дневник приёма по схеме SOAP (Subjective, Objective, Assessment, Plan) */
export const soapVisitDiarySchema = z.object({
    entryDate: z.string().trim().min(10).max(32),
    toothNumber: z.string().trim().max(32).nullable().optional(),
    // S (Subjective) — Жалобы и анамнез текущего визита
    subjectiveComplaints: z.string().trim().min(1).max(2000),
    // O (Objective) — Status localis, зондирование, перкуссия, пальпация, ЭОД, термометрия
    objectiveStatusLocalis: z.string().trim().min(1).max(3000),
    percussionVertical: z.enum(["negative", "positive_mild", "positive_sharp"]).default("negative"),
    percussionHorizontal: z.enum(["negative", "positive_mild", "positive_sharp"]).default("negative"),
    probingTenderness: z.enum(["none", "along_enamel_dentin_border", "at_cavity_bottom", "bleeding_orifice"]).default("none"),
    thermalTestResponse: z.enum(["indifferent", "transient_pain", "lingering_sharp_pain", "pain_relieved_by_cold"]).default("indifferent"),
    eodMicroamperes: z.number().min(0).max(200).nullable().optional(), // ЭОД (норма 2-6 мкА, пульпит 20-40 мкА, некроз >100 мкА)
    // A (Assessment) — Диагноз по МКБ-10 с нозологией
    assessmentDiagnosisText: z.string().trim().min(1).max(1000),
    assessmentIcd10Code: z.string().trim().min(1).max(32),
    // P (Plan/Procedure) — Протокол лечебных манипуляций, материалы, анестезия, назначения
    procedureProtocol: z.string().trim().min(1).max(4000),
    anesthesiaDetails: z.string().trim().max(1000).nullable().optional(),
    appliedMaterials: z.string().trim().max(1000).nullable().optional(),
    homeCareRecommendations: z.string().trim().max(1000).nullable().optional(),
    nextVisitDate: z.string().trim().max(32).nullable().optional(),
    doctorFullName: z.string().trim().min(1).max(160),
});
/** Полный структурированный Payload формы № 043/у */
export const fullForm043uPayloadSchema = z.object({
    formNumber: z.literal("043/у"),
    // Паспортная часть и реквизиты клиники
    clinicLegalName: z.string().trim().min(1).max(240),
    clinicAddress: z.string().trim().max(240).nullable().optional(),
    clinicOgrn: z.string().trim().max(32).nullable().optional(),
    clinicInn: z.string().trim().max(16).nullable().optional(),
    clinicLicenseNumber: z.string().trim().max(64).nullable().optional(),
    clinicLicenseDate: z.string().trim().max(32).nullable().optional(),
    clinicLicenseIssuer: z.string().trim().max(240).nullable().optional(),
    // Данные медицинской карты и пациента
    medicalCardNumber: z.string().trim().min(1).max(64),
    cardOpenedDate: z.string().trim().min(10).max(32),
    patientFullName: z.string().trim().min(1).max(160),
    patientBirthDate: z.string().trim().min(10).max(32),
    patientSex: z.enum(["male", "female"]).default("male"),
    patientPhone: z.string().trim().max(64).nullable().optional(),
    patientAddressRegistration: z.string().trim().max(240).nullable().optional(),
    patientAddressResidence: z.string().trim().max(240).nullable().optional(),
    patientIdentityDocument: z.string().trim().max(120).nullable().optional(),
    patientSnils: z.string().trim().max(32).nullable().optional(),
    patientInsurancePolicy: z.string().trim().max(64).nullable().optional(),
    patientPrivilegeCategory: z.string().trim().max(120).nullable().optional(),
    // Лечащий врач
    attendingDoctorFullName: z.string().trim().min(1).max(160),
    attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
    // Анамнез жизни и сопутствующие патологии
    allergologicalHistory: z.string().trim().max(2000).default("Аллергологический анамнез не отягощен, непереносимость медикаментов отрицает"),
    concomitantDiseases: z.string().trim().max(2000).default("Хронические соматические заболевания отрицает. ВИЧ, гепатиты B/C, туберкулез, сифилис отрицает"),
    currentMedications: z.string().trim().max(1000).default("Лекарственные препараты (антикоагулянты, бисфосфонаты, цитостатики) на постоянной основе не принимает"),
    pregnancyLactationStatus: z.string().trim().max(240).default("Беременность / период лактации: нет"),
    pastDentalInterventions: z.string().trim().max(2000).default("Ранее лечился по поводу кариеса и его осложнений, анестезию переносил без осложнений"),
    // Анамнез настоящего заболевания
    chiefComplaint: z.string().trim().min(1).max(2000),
    historyOfPresentIllness: z.string().trim().min(1).max(2000),
    // Зубная формула и индексы
    odontogramTeeth: z.array(fdiToothRecordSchema).default([]),
    dmftIndex: dmftIndexSchema.default({
        decayed: 0,
        filled: 0,
        missing: 0,
        totalDmft: 0,
        decayedSurfaces: 0,
        filledSurfaces: 0,
        totalDmfs: 0,
        deciduousDecayed: 0,
        deciduousFilled: 0,
        deciduousExtracted: 0,
        totalDft: 0,
        intensityLevel: "medium",
    }),
    cpitnIndex: cpitnIndexSchema.default({
        sextant18_14: "0_healthy",
        sextant13_23: "0_healthy",
        sextant24_28: "0_healthy",
        sextant48_44: "0_healthy",
        sextant43_33: "0_healthy",
        sextant34_38: "0_healthy",
        treatmentNeedCategory: "0_none",
    }),
    hygieneIndexOhiS: z.string().trim().max(64).default("OHI-S = 0.8 (удовлетворительный уровень гигиены)"),
    biteType: dentalBiteTypeSchema.default("orthognathic"),
    biteDescription: z.string().trim().max(500).default("Прикус ортогнатический, смыкание по I классу Энгля"),
    oralMucosaStatus: oralMucosaStatusSchema.default({
        color: "pale_pink_normal",
        moisture: "normal",
        pathologicalElements: null,
        gingivalPapillae: "normal_pointed",
        bleedingPBI: "grade_0",
        tongueStatus: "Язык чистый, влажный, сосочки выражены умерено",
        regionalLymphNodes: "Подчелюстные, шейные, подбородочные лимфоузлы не увеличены, мягкоэластичные, подвижные, безболезненные при пальпации",
        tmjFunction: "Открывание рта в полном объеме (более 40 мм), свободное, безболезненное, девиации и суставного шума/щелчков нет",
    }),
    // Рентгенологическое обследование
    xrayFindingsDescription: z.string().trim().max(2000).default("На прицельных радиовизиограммах/ОПТГ костная ткань межзубных перегородок без признаков выраженной резорбции, периапикальные ткани без патологических очагов деструкции"),
    // Предварительный и окончательный план лечения
    generalTreatmentPlan: z.string().trim().min(1).max(4000),
    // Дневники приёма SOAP
    soapDiaries: z.array(soapVisitDiarySchema).default([]),
});
