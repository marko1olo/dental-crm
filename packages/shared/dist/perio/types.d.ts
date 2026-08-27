import { z } from "zod";
/**
 * 6 anatomical probing sites per tooth according to standard Florida Probe workflow:
 * - MB: Mesio-Buccal (Медиально-вестибулярно / медиально-щечно)
 * - B: Mid-Buccal (По центру вестибулярно / щечно)
 * - DB: Disto-Buccal (Дистально-вестибулярно / дистально-щечно)
 * - ML: Mesio-Lingual (Медиально-язычно / медиально-нёбно)
 * - L: Mid-Lingual (По центру язычно / нёбно)
 * - DL: Disto-Lingual (Дистально-язычно / дистально-нёбно)
 */
export declare const perioSiteKeySchema: z.ZodEnum<["distoBuccal", "midBuccal", "mesioBuccal", "distoLingual", "midLingual", "mesioLingual"]>;
export type PerioSiteKey = z.infer<typeof perioSiteKeySchema>;
export declare const perioSiteShortKeySchema: z.ZodEnum<["MB", "B", "DB", "ML", "L", "DL"]>;
export type PerioSiteShortKey = z.infer<typeof perioSiteShortKeySchema>;
export interface PerioSiteConfig {
    readonly key: PerioSiteKey;
    readonly shortKey: PerioSiteShortKey;
    readonly labelRu: string;
    readonly aspect: "buccal" | "lingual";
    readonly anatomicalLocationRu: string;
}
export declare const PERIO_SITES_CONFIG: readonly PerioSiteConfig[];
export declare const BUCCAL_SITE_KEYS: readonly PerioSiteKey[];
export declare const LINGUAL_SITE_KEYS: readonly PerioSiteKey[];
export declare const PERIO_SITE_KEYS: readonly PerioSiteKey[];
export declare const perioSiteMeasurementSchema: z.ZodObject<{
    /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
    probingDepthMm: z.ZodDefault<z.ZodNumber>;
    /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
    gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
    /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
    bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
    /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
    suppuration: z.ZodDefault<z.ZodBoolean>;
    /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
    plaque: z.ZodDefault<z.ZodBoolean>;
    /** Поддесневой зубной камень (Calculus, CALC) */
    calculus: z.ZodDefault<z.ZodBoolean>;
    /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
    calMm: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    probingDepthMm: number;
    gingivalMarginMm: number;
    bleedingOnProbing: boolean;
    suppuration: boolean;
    plaque: boolean;
    calculus: boolean;
    calMm?: number | undefined;
}, {
    probingDepthMm?: number | undefined;
    gingivalMarginMm?: number | undefined;
    bleedingOnProbing?: boolean | undefined;
    suppuration?: boolean | undefined;
    plaque?: boolean | undefined;
    calculus?: boolean | undefined;
    calMm?: number | undefined;
}>;
export type PerioSiteMeasurement = z.infer<typeof perioSiteMeasurementSchema>;
export declare const furcationGradeSchema: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
export type FurcationGrade = z.infer<typeof furcationGradeSchema>;
export declare const mobilityGradeSchema: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
export type MobilityGrade = z.infer<typeof mobilityGradeSchema>;
export declare const perioToothRecordSchema: z.ZodObject<{
    /** Номер зуба по международной двухцифровой классификации FDI (11..48, 51..85) */
    toothNumber: z.ZodNumber;
    /** Зуб отсутствует (адентия, удалён) */
    isMissing: z.ZodDefault<z.ZodBoolean>;
    /** Имплантат (периимплантатное зондирование) */
    isImplant: z.ZodDefault<z.ZodBoolean>;
    /** Подвижность зуба по шкале Миллера / Энтина (0 = физиологическая, 1 = I ст., 2 = II ст., 3 = III ст.) */
    mobility: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>;
    /** Вовлечение бифуркации/трифуркации корней моляров по Hamp & Glickman (0 = норма, 1 = I ст., 2 = II ст., 3 = III ст., 4 = IV ст.) */
    furcation: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>>;
    /** 6 анатомических точек зондирования */
    distoBuccal: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
    midBuccal: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
    mesioBuccal: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
    distoLingual: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
    midLingual: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
    mesioLingual: z.ZodDefault<z.ZodObject<{
        /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
        probingDepthMm: z.ZodDefault<z.ZodNumber>;
        /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
        gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
        /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
        suppuration: z.ZodDefault<z.ZodBoolean>;
        /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
        plaque: z.ZodDefault<z.ZodBoolean>;
        /** Поддесневой зубной камень (Calculus, CALC) */
        calculus: z.ZodDefault<z.ZodBoolean>;
        /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
        calMm: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    }, {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    toothNumber: number;
    mobility: 0 | 2 | 1 | 3;
    distoBuccal: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    midBuccal: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    mesioBuccal: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    distoLingual: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    midLingual: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    mesioLingual: {
        probingDepthMm: number;
        gingivalMarginMm: number;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        calMm?: number | undefined;
    };
    isMissing: boolean;
    isImplant: boolean;
    furcation: 0 | 2 | 1 | 3 | 4;
}, {
    toothNumber: number;
    mobility?: 0 | 2 | 1 | 3 | undefined;
    distoBuccal?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    midBuccal?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    mesioBuccal?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    distoLingual?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    midLingual?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    mesioLingual?: {
        probingDepthMm?: number | undefined;
        gingivalMarginMm?: number | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
        calMm?: number | undefined;
    } | undefined;
    isMissing?: boolean | undefined;
    isImplant?: boolean | undefined;
    furcation?: 0 | 2 | 1 | 3 | 4 | undefined;
}>;
export type PerioToothRecord = z.infer<typeof perioToothRecordSchema>;
export declare const aapStageSchema: z.ZodEnum<["health", "gingivitis", "stage_1", "stage_2", "stage_3", "stage_4"]>;
export type AapStage = z.infer<typeof aapStageSchema>;
export declare const aapGradeSchema: z.ZodEnum<["grade_a", "grade_b", "grade_c"]>;
export type AapGrade = z.infer<typeof aapGradeSchema>;
export declare const praRiskLevelSchema: z.ZodEnum<["low", "moderate", "high"]>;
export type PraRiskLevel = z.infer<typeof praRiskLevelSchema>;
export declare const smokingStatusSchema: z.ZodEnum<["non_smoker", "light", "heavy"]>;
export type SmokingStatus = z.infer<typeof smokingStatusSchema>;
export declare const diabetesStatusSchema: z.ZodEnum<["none", "controlled", "uncontrolled"]>;
export type DiabetesStatus = z.infer<typeof diabetesStatusSchema>;
export declare const perioChartSummarySchema: z.ZodObject<{
    totalTeethExamined: z.ZodNumber;
    totalSitesProbed: z.ZodNumber;
    /** Full Mouth Bleeding Score (FMBS / BOP %) в процентах (0..100%) */
    fmbsPercent: z.ZodNumber;
    /** Full Mouth Plaque Score (FMPS) в процентах (0..100%) */
    fmpsPercent: z.ZodNumber;
    /** Число глубоких карманов (PD >= 5 мм) */
    deepPocketsCount: z.ZodNumber;
    /** Число умеренных карманов (PD == 4 мм) */
    moderatePocketsCount: z.ZodNumber;
    /** Число участков с нагноением (Suppuration) */
    sitesWithSuppurationCount: z.ZodNumber;
    /** Число участков с поддесневым зубным камнем */
    sitesWithCalculusCount: z.ZodNumber;
    /** Число подвижных зубов (подвижность >= 1) */
    teethWithMobilityCount: z.ZodNumber;
    /** Число зубов с поражением фуркации (фуркация >= 1) */
    teethWithFurcationCount: z.ZodNumber;
    /** Максимальная глубина кармана (мм) */
    maxPocketDepthMm: z.ZodNumber;
    /** Средняя глубина кармана (мм) */
    meanPocketDepthMm: z.ZodNumber;
    /** Максимальная потеря прикрепления (CAL мм) */
    maxCalMm: z.ZodNumber;
    /** Средняя потеря прикрепления (CAL мм) */
    meanCalMm: z.ZodNumber;
    /** Категория риска по Lang & Tonetti (PRA) */
    riskCategory: z.ZodEnum<["low", "moderate", "high"]>;
    /** Стадия пародонтита по классификации AAP/EFP 2018 */
    aapStage: z.ZodOptional<z.ZodEnum<["health", "gingivitis", "stage_1", "stage_2", "stage_3", "stage_4"]>>;
    /** Степень прогрессирования (Грейд) по классификации AAP/EFP 2018 */
    aapGrade: z.ZodOptional<z.ZodEnum<["grade_a", "grade_b", "grade_c"]>>;
}, "strip", z.ZodTypeAny, {
    riskCategory: "low" | "high" | "moderate";
    totalTeethExamined: number;
    totalSitesProbed: number;
    fmbsPercent: number;
    fmpsPercent: number;
    deepPocketsCount: number;
    moderatePocketsCount: number;
    sitesWithSuppurationCount: number;
    sitesWithCalculusCount: number;
    teethWithMobilityCount: number;
    teethWithFurcationCount: number;
    maxPocketDepthMm: number;
    meanPocketDepthMm: number;
    maxCalMm: number;
    meanCalMm: number;
    aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
    aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
}, {
    riskCategory: "low" | "high" | "moderate";
    totalTeethExamined: number;
    totalSitesProbed: number;
    fmbsPercent: number;
    fmpsPercent: number;
    deepPocketsCount: number;
    moderatePocketsCount: number;
    sitesWithSuppurationCount: number;
    sitesWithCalculusCount: number;
    teethWithMobilityCount: number;
    teethWithFurcationCount: number;
    maxPocketDepthMm: number;
    meanPocketDepthMm: number;
    maxCalMm: number;
    meanCalMm: number;
    aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
    aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
}>;
export type PerioChartSummary = z.infer<typeof perioChartSummarySchema>;
export declare const perioChartDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    patientId: z.ZodString;
    visitId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    doctorId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    chartDate: z.ZodString;
    teeth: z.ZodArray<z.ZodObject<{
        /** Номер зуба по международной двухцифровой классификации FDI (11..48, 51..85) */
        toothNumber: z.ZodNumber;
        /** Зуб отсутствует (адентия, удалён) */
        isMissing: z.ZodDefault<z.ZodBoolean>;
        /** Имплантат (периимплантатное зондирование) */
        isImplant: z.ZodDefault<z.ZodBoolean>;
        /** Подвижность зуба по шкале Миллера / Энтина (0 = физиологическая, 1 = I ст., 2 = II ст., 3 = III ст.) */
        mobility: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>;
        /** Вовлечение бифуркации/трифуркации корней моляров по Hamp & Glickman (0 = норма, 1 = I ст., 2 = II ст., 3 = III ст., 4 = IV ст.) */
        furcation: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>>;
        /** 6 анатомических точек зондирования */
        distoBuccal: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
        midBuccal: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
        mesioBuccal: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
        distoLingual: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
        midLingual: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
        mesioLingual: z.ZodDefault<z.ZodObject<{
            /** Глубина зондирования десневого кармана в миллиметрах (Probing Depth, PD: 0..20 мм, стандарт 1..12 мм) */
            probingDepthMm: z.ZodDefault<z.ZodNumber>;
            /** Положение десневого края (Gingival Margin, GM: положительное = рецессия корня, отрицательное = гиперплазия/отёк) */
            gingivalMarginMm: z.ZodDefault<z.ZodNumber>;
            /** Кровоточивость при зондировании (Bleeding on Probing, BOP — маркер активного воспаления) */
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            /** Нагноение (Suppuration / Pus — активный гнойный экссудат) */
            suppuration: z.ZodDefault<z.ZodBoolean>;
            /** Зубной налёт / биопленка на придесневой поверхности (Plaque, PLQ) */
            plaque: z.ZodDefault<z.ZodBoolean>;
            /** Поддесневой зубной камень (Calculus, CALC) */
            calculus: z.ZodDefault<z.ZodBoolean>;
            /** Клинический уровень потери зубодесневого прикрепления (CAL mm = PD + GM) */
            calMm: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        }, {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        toothNumber: number;
        mobility: 0 | 2 | 1 | 3;
        distoBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        midBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        mesioBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        distoLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        midLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        mesioLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        isMissing: boolean;
        isImplant: boolean;
        furcation: 0 | 2 | 1 | 3 | 4;
    }, {
        toothNumber: number;
        mobility?: 0 | 2 | 1 | 3 | undefined;
        distoBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        midBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        mesioBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        distoLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        midLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        mesioLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        isMissing?: boolean | undefined;
        isImplant?: boolean | undefined;
        furcation?: 0 | 2 | 1 | 3 | 4 | undefined;
    }>, "many">;
    summary: z.ZodOptional<z.ZodObject<{
        totalTeethExamined: z.ZodNumber;
        totalSitesProbed: z.ZodNumber;
        /** Full Mouth Bleeding Score (FMBS / BOP %) в процентах (0..100%) */
        fmbsPercent: z.ZodNumber;
        /** Full Mouth Plaque Score (FMPS) в процентах (0..100%) */
        fmpsPercent: z.ZodNumber;
        /** Число глубоких карманов (PD >= 5 мм) */
        deepPocketsCount: z.ZodNumber;
        /** Число умеренных карманов (PD == 4 мм) */
        moderatePocketsCount: z.ZodNumber;
        /** Число участков с нагноением (Suppuration) */
        sitesWithSuppurationCount: z.ZodNumber;
        /** Число участков с поддесневым зубным камнем */
        sitesWithCalculusCount: z.ZodNumber;
        /** Число подвижных зубов (подвижность >= 1) */
        teethWithMobilityCount: z.ZodNumber;
        /** Число зубов с поражением фуркации (фуркация >= 1) */
        teethWithFurcationCount: z.ZodNumber;
        /** Максимальная глубина кармана (мм) */
        maxPocketDepthMm: z.ZodNumber;
        /** Средняя глубина кармана (мм) */
        meanPocketDepthMm: z.ZodNumber;
        /** Максимальная потеря прикрепления (CAL мм) */
        maxCalMm: z.ZodNumber;
        /** Средняя потеря прикрепления (CAL мм) */
        meanCalMm: z.ZodNumber;
        /** Категория риска по Lang & Tonetti (PRA) */
        riskCategory: z.ZodEnum<["low", "moderate", "high"]>;
        /** Стадия пародонтита по классификации AAP/EFP 2018 */
        aapStage: z.ZodOptional<z.ZodEnum<["health", "gingivitis", "stage_1", "stage_2", "stage_3", "stage_4"]>>;
        /** Степень прогрессирования (Грейд) по классификации AAP/EFP 2018 */
        aapGrade: z.ZodOptional<z.ZodEnum<["grade_a", "grade_b", "grade_c"]>>;
    }, "strip", z.ZodTypeAny, {
        riskCategory: "low" | "high" | "moderate";
        totalTeethExamined: number;
        totalSitesProbed: number;
        fmbsPercent: number;
        fmpsPercent: number;
        deepPocketsCount: number;
        moderatePocketsCount: number;
        sitesWithSuppurationCount: number;
        sitesWithCalculusCount: number;
        teethWithMobilityCount: number;
        teethWithFurcationCount: number;
        maxPocketDepthMm: number;
        meanPocketDepthMm: number;
        maxCalMm: number;
        meanCalMm: number;
        aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
        aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
    }, {
        riskCategory: "low" | "high" | "moderate";
        totalTeethExamined: number;
        totalSitesProbed: number;
        fmbsPercent: number;
        fmpsPercent: number;
        deepPocketsCount: number;
        moderatePocketsCount: number;
        sitesWithSuppurationCount: number;
        sitesWithCalculusCount: number;
        teethWithMobilityCount: number;
        teethWithFurcationCount: number;
        maxPocketDepthMm: number;
        meanPocketDepthMm: number;
        maxCalMm: number;
        meanCalMm: number;
        aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
        aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
    }>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    praRisk: z.ZodOptional<z.ZodEnum<["low", "moderate", "high"]>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    organizationId: string;
    chartDate: string;
    teeth: {
        toothNumber: number;
        mobility: 0 | 2 | 1 | 3;
        distoBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        midBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        mesioBuccal: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        distoLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        midLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        mesioLingual: {
            probingDepthMm: number;
            gingivalMarginMm: number;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            calMm?: number | undefined;
        };
        isMissing: boolean;
        isImplant: boolean;
        furcation: 0 | 2 | 1 | 3 | 4;
    }[];
    id?: string | undefined;
    visitId?: string | null | undefined;
    notes?: string | null | undefined;
    doctorId?: string | null | undefined;
    summary?: {
        riskCategory: "low" | "high" | "moderate";
        totalTeethExamined: number;
        totalSitesProbed: number;
        fmbsPercent: number;
        fmpsPercent: number;
        deepPocketsCount: number;
        moderatePocketsCount: number;
        sitesWithSuppurationCount: number;
        sitesWithCalculusCount: number;
        teethWithMobilityCount: number;
        teethWithFurcationCount: number;
        maxPocketDepthMm: number;
        meanPocketDepthMm: number;
        maxCalMm: number;
        meanCalMm: number;
        aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
        aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
    } | undefined;
    praRisk?: "low" | "high" | "moderate" | undefined;
}, {
    patientId: string;
    organizationId: string;
    chartDate: string;
    teeth: {
        toothNumber: number;
        mobility?: 0 | 2 | 1 | 3 | undefined;
        distoBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        midBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        mesioBuccal?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        distoLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        midLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        mesioLingual?: {
            probingDepthMm?: number | undefined;
            gingivalMarginMm?: number | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
            calMm?: number | undefined;
        } | undefined;
        isMissing?: boolean | undefined;
        isImplant?: boolean | undefined;
        furcation?: 0 | 2 | 1 | 3 | 4 | undefined;
    }[];
    id?: string | undefined;
    visitId?: string | null | undefined;
    notes?: string | null | undefined;
    doctorId?: string | null | undefined;
    summary?: {
        riskCategory: "low" | "high" | "moderate";
        totalTeethExamined: number;
        totalSitesProbed: number;
        fmbsPercent: number;
        fmpsPercent: number;
        deepPocketsCount: number;
        moderatePocketsCount: number;
        sitesWithSuppurationCount: number;
        sitesWithCalculusCount: number;
        teethWithMobilityCount: number;
        teethWithFurcationCount: number;
        maxPocketDepthMm: number;
        meanPocketDepthMm: number;
        maxCalMm: number;
        meanCalMm: number;
        aapStage?: "health" | "gingivitis" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | undefined;
        aapGrade?: "grade_a" | "grade_b" | "grade_c" | undefined;
    } | undefined;
    praRisk?: "low" | "high" | "moderate" | undefined;
}>;
export type PerioChartData = z.infer<typeof perioChartDataSchema>;
/**
 * Standard adult dental arches for periodontal examination (FDI).
 */
export declare const PERIO_UPPER_ARCH_TEETH: readonly [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export declare const PERIO_LOWER_ARCH_TEETH: readonly [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export declare const ALL_PERIO_TEETH: readonly [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
/**
 * Probing step in continuous Florida probe workflow.
 */
export interface ProbingStep {
    readonly toothNumber: number;
    readonly siteKey: PerioSiteKey;
    readonly arch: "upper" | "lower";
    readonly aspect: "buccal" | "lingual";
}
/**
 * Furcation grading details according to Hamp et al. & Glickman classifications.
 */
export interface FurcationGradeDetail {
    readonly grade: FurcationGrade;
    readonly codeRu: string;
    readonly nameRu: string;
    readonly descriptionRu: string;
    readonly symbol: string;
    readonly badgeColor: string;
    readonly badgeBg: string;
}
export declare const FURCATION_GRADES: Record<number, FurcationGradeDetail>;
/**
 * Mobility grading details according to Miller's Classification.
 */
export interface MobilityGradeDetail {
    readonly grade: MobilityGrade;
    readonly codeRu: string;
    readonly nameRu: string;
    readonly descriptionRu: string;
    readonly badgeColor: string;
    readonly badgeBg: string;
}
export declare const MOBILITY_GRADES: Record<number, MobilityGradeDetail>;
