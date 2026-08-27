/**
 * DENTE Dental CRM — Anatomical Root Canals & Minzdrav Order 804n Endodontic Billing
 *
 * Provides anatomical root canal counts for all 32 permanent and 20 primary teeth (FDI notation),
 * plus automated mapping to Order 804n endodontic line items:
 * - 1-canal tooth: A16.07.008.001 (obturation), A16.07.030.001 (instrumentation)
 * - 2-canal tooth: A16.07.008.002 (obturation), A16.07.030.002 (instrumentation)
 * - 3-canal tooth: A16.07.008.003 (obturation), A16.07.030.003 (instrumentation)
 * - 4-canal tooth: A16.07.008.004 (obturation), A16.07.030.004 (instrumentation)
 */
export type AnatomicalCanalCount = 1 | 2 | 3 | 4;
export interface Order804nEndoItem {
    readonly code: string;
    readonly title: string;
    readonly category: string;
    readonly price: number;
    readonly canalCount: AnatomicalCanalCount;
}
export interface EndodonticOrder804nPair {
    readonly canalCount: AnatomicalCanalCount;
    readonly instrumentation: Order804nEndoItem;
    readonly obturation: Order804nEndoItem;
    readonly combinedPrice: number;
}
/**
 * Standard Order 804n line items for root canal instrumentation and medication (A16.07.030)
 */
export declare const ORDER_804N_INSTRUMENTATION: Record<AnatomicalCanalCount, Order804nEndoItem>;
/**
 * Standard Order 804n line items for root canal obturation and filling (A16.07.008)
 */
export declare const ORDER_804N_OBTURATIONS: Record<AnatomicalCanalCount, Order804nEndoItem>;
/**
 * Combined single-package Order 804n line items for pulpitis / endodontics
 */
export declare const ORDER_804N_ENDODONTIC_PACKAGES: Record<AnatomicalCanalCount, Order804nEndoItem>;
/**
 * Additional standard Order 804n line items for endodontic care
 */
export declare const ORDER_804N_MEDICATION_CAOH2: Order804nEndoItem;
export declare const ORDER_804N_UNSEALING: Order804nEndoItem;
/**
 * Derives the anatomical root canal count from the FDI tooth number according to
 * clinical dental anatomy standards.
 *
 * FDI Mapping:
 * - Upper Incisors & Canines (11..13, 21..23): 1 canal
 * - Upper 1st Premolars (14, 24): 2 canals (Buccal + Palatal)
 * - Upper 2nd Premolars (15, 25): 1 canal (occasionally 2, standard default 1)
 * - Upper Molars (16, 17, 18, 26, 27, 28): 3 canals (MB1, DB, P; or 4 if MB2)
 * - Lower Incisors & Canines (31..33, 41..43): 1 canal
 * - Lower Premolars (34, 35, 44, 45): 1 canal
 * - Lower Molars (36, 37, 38, 46, 47, 48): 3 canals (MB, ML, D; or 4)
 * - Primary Upper Incisors & Canines (51..53, 61..63): 1 canal
 * - Primary Lower Incisors & Canines (71..73, 81..83): 1 canal
 * - Primary Upper Molars (54, 55, 64, 65): 3 canals
 * - Primary Lower Molars (74, 75, 84, 85): 2 canals
 */
export declare function getAnatomicalRootCanalCount(fdiNumber: number, clinicalCanalCount?: number): AnatomicalCanalCount;
export declare function getCanalCountForTooth(fdiNumber: number | string, clinicalCanalCount?: number): AnatomicalCanalCount;
/**
 * Checks if a tooth is anatomically multi-rooted (e.g. molars 16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48,
 * upper 1st premolars 14, 24, and primary molars).
 */
export declare function isMultiRootedTooth(fdiNumber: number): boolean;
/**
 * Returns the pair of Order 804n procedures (instrumentation + obturation) for a given canal count.
 */
export declare function getEndodonticOrder804nPair(canalCount: AnatomicalCanalCount): EndodonticOrder804nPair;
/**
 * Returns the accurate Order 804n package procedure for a specific tooth number,
 * with support for explicit canal count overrides (e.g. from endo canal log).
 */
export declare function getOrder804nEndoProcedureForTooth(fdiNumber: number, explicitCanalCount?: number): Order804nEndoItem;
export interface EndodonticFullTreatmentPlanItem {
    readonly fdiNumber: number;
    readonly isMultiRooted: boolean;
    readonly canalCount: AnatomicalCanalCount;
    readonly instrumentation: Order804nEndoItem;
    readonly obturation: Order804nEndoItem;
    readonly medication?: Order804nEndoItem | undefined;
    readonly totalCompositePrice: number;
}
/**
 * Calculates complete endodontic composite treatment pricing (instrumentation + obturation + optional Ca(OH)2 medication)
 * for a specific tooth, accurately handling multi-rooted molars (16, 17, 26, 27, 36, 37, 46, 47) and premolars.
 */
export declare function calculateEndodonticCompositeTreatment(fdiNumber: number, options?: {
    state?: "Pulpitis" | "Periodontitis" | string;
    clinicalCanalCount?: number;
    includeMedication?: boolean;
}): EndodonticFullTreatmentPlanItem;
import { type Kopecks } from "./utils/money.js";
import type { ToothSurface } from "./documents/forms043u.js";
export interface Order804nBillingLineItem {
    readonly code: string;
    readonly title: string;
    readonly category: string;
    readonly priceRub: number;
    readonly priceKopecks: Kopecks;
    readonly quantity: number;
    readonly totalRub: number;
    readonly totalKopecks: Kopecks;
    readonly totalPriceKopecks?: Kopecks;
    readonly isMandatory: boolean;
    readonly toothNumber?: number | string | null;
    readonly canalCount?: AnatomicalCanalCount | null;
}
export declare const ORDER_804N_THERAPY_CATALOG: {
    readonly compositeFilling1Surface: {
        readonly code: "A16.07.002.001";
        readonly title: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров";
        readonly category: "Терапевтическая стоматология";
        readonly price: 4500;
    };
    readonly compositeFillingMultiSurfaces: {
        readonly code: "A16.07.002.002";
        readonly title: "Восстановление зуба пломбой с нарушением контактного пункта II, III, IV класс по Блэку с использованием фотополимеров";
        readonly category: "Терапевтическая стоматология";
        readonly price: 5500;
    };
    readonly cariesPreparation: {
        readonly code: "A16.07.031";
        readonly title: "Препарирование твердых тканей зуба при лечении кариеса";
        readonly category: "Терапевтическая стоматология";
        readonly price: 1200;
    };
    readonly deepFluoridation: {
        readonly code: "A11.07.012";
        readonly title: "Глубокое фторирование эмали зуба";
        readonly category: "Профилактическая стоматология";
        readonly price: 900;
    };
    readonly selectivePolishing: {
        readonly code: "A16.07.025";
        readonly title: "Избирательное пришлифовывание и полирование твердых тканей зуба";
        readonly category: "Терапевтическая стоматология";
        readonly price: 600;
    };
    readonly inlayVeneerRestoration: {
        readonly code: "A16.07.003";
        readonly title: "Восстановление зуба вкладками, виниром, полукоронкой";
        readonly category: "Терапевтическая стоматология";
        readonly price: 15000;
    };
};
export declare const ORDER_804N_SURGERY_CATALOG: {
    readonly simpleExtraction: {
        readonly code: "A16.07.001.001";
        readonly title: "Удаление постоянного зуба (простое)";
        readonly category: "Хирургическая стоматология";
        readonly price: 3500;
    };
    readonly complexExtraction: {
        readonly code: "A16.07.001.002";
        readonly title: "Удаление зуба сложное с разъединением корней";
        readonly category: "Хирургическая стоматология";
        readonly price: 6000;
    };
    readonly retractedExtraction: {
        readonly code: "A16.07.001.003";
        readonly title: "Удаление ретинированного, дистопированного или сверхкомплектного зуба";
        readonly category: "Хирургическая стоматология";
        readonly price: 8500;
    };
    readonly sutureApplication: {
        readonly code: "A16.07.097";
        readonly title: "Наложение шва на слизистую оболочку рта";
        readonly category: "Хирургическая стоматология";
        readonly price: 1500;
    };
    readonly periostotomy: {
        readonly code: "A16.07.017";
        readonly title: "Вскрытие поднадкостничного очага воспаления (периостотомия)";
        readonly category: "Хирургическая стоматология";
        readonly price: 3000;
    };
    readonly cystectomy: {
        readonly code: "A16.07.016";
        readonly title: "Цистотомия или цистэктомия в области челюсти";
        readonly category: "Хирургическая стоматология";
        readonly price: 7500;
    };
};
export declare const ORDER_804N_PERIO_CATALOG: {
    readonly prophyHygieneFull: {
        readonly code: "A16.07.051";
        readonly title: "Профессиональная гигиена полости рта и зубов";
        readonly category: "Пародонтология";
        readonly price: 4500;
    };
    readonly ultrasonicScaling: {
        readonly code: "A16.07.020";
        readonly title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком";
        readonly category: "Пародонтология";
        readonly price: 2500;
    };
    readonly closedCurettage: {
        readonly code: "A16.07.039";
        readonly title: "Закрытый кюретаж при заболеваниях пародонта в области зуба";
        readonly category: "Пародонтология";
        readonly price: 1800;
    };
    readonly openCurettage: {
        readonly code: "A16.07.038";
        readonly title: "Открытый кюретаж при заболеваниях пародонта в области зуба";
        readonly category: "Пародонтология";
        readonly price: 3200;
    };
    readonly perioPocketMedication: {
        readonly code: "A11.07.010";
        readonly title: "Введение лекарственных препаратов в пародонтальный карман";
        readonly category: "Пародонтология";
        readonly price: 1200;
    };
    readonly perioSplinting: {
        readonly code: "A16.07.019";
        readonly title: "Временное шинирование при заболеваниях пародонта (1 единица)";
        readonly category: "Пародонтология";
        readonly price: 2200;
    };
};
export declare const ORDER_804N_ORTHO_CATALOG: {
    readonly crownRestoration: {
        readonly code: "A16.07.004";
        readonly title: "Восстановление зуба коронкой постоянной";
        readonly category: "Ортопедическая стоматология";
        readonly price: 18000;
    };
    readonly crownPreparation: {
        readonly code: "A16.07.004.001";
        readonly title: "Препарирование зуба под искусственную коронку";
        readonly category: "Ортопедическая стоматология";
        readonly price: 3500;
    };
    readonly provisionalCrown: {
        readonly code: "A16.07.004.002";
        readonly title: "Изготовление и фиксация временной провизорной коронки";
        readonly category: "Ортопедическая стоматология";
        readonly price: 2500;
    };
    readonly jawImpression: {
        readonly code: "A02.07.010";
        readonly title: "Снятие оттиска с одной челюсти";
        readonly category: "Ортопедическая стоматология";
        readonly price: 1500;
    };
    readonly ceramicZirconiaCrown: {
        readonly code: "A16.07.005";
        readonly title: "Восстановление зуба коронкой постоянной безметалловой (диоксид циркония / E-max)";
        readonly category: "Ортопедическая стоматология";
        readonly price: 24000;
    };
};
export declare const ORDER_804N_ANESTHESIA_CATALOG: {
    readonly infiltration: {
        readonly code: "B01.003.004.005";
        readonly title: "Инфильтрационная анестезия";
        readonly category: "Анестезиология";
        readonly price: 800;
    };
    readonly conduction: {
        readonly code: "B01.003.004.004";
        readonly title: "Проводниковая анестезия";
        readonly category: "Анестезиология";
        readonly price: 950;
    };
    readonly application: {
        readonly code: "B01.003.004.001";
        readonly title: "Аппликационная анестезия";
        readonly category: "Анестезиология";
        readonly price: 400;
    };
};
export declare const ORDER_804N_DIAGNOSTICS_CATALOG: {
    readonly rvgIntraoral: {
        readonly code: "A06.07.007";
        readonly title: "Внутриротовая рентгенография (радиовизиография RVG)";
        readonly category: "Рентгенология";
        readonly price: 750;
    };
    readonly optgPanoramic: {
        readonly code: "A06.07.004";
        readonly title: "Ортопантомография (панорамная томография ОПТГ)";
        readonly category: "Рентгенология";
        readonly price: 1800;
    };
    readonly cbct3d: {
        readonly code: "A06.07.013";
        readonly title: "Конусно-лучевая компьютерная томография (КЛКТ челюстно-лицевой области)";
        readonly category: "Рентгенология";
        readonly price: 3500;
    };
};
export interface ClinicalCase804nOptions {
    readonly fdiNumber?: number | string | null;
    readonly toothNumber?: number | string | null;
    readonly icd10Code: string;
    readonly surfaces?: readonly ToothSurface[] | null;
    readonly canalCount?: number | null | undefined;
    readonly clinicalCanalCount?: number | null | undefined;
    readonly specialty?: string | null | undefined;
    readonly isMultiVisit?: boolean | undefined;
    readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
    readonly isRetreatment?: boolean | undefined;
    readonly isDifficultExtraction?: boolean | undefined;
    readonly includeAnesthesia?: boolean | undefined;
    readonly includeRvg?: boolean | undefined;
    readonly includeSutures?: boolean | undefined;
    readonly anesthesiaType?: "infiltration" | "mandibular" | "torus" | "application" | undefined;
    readonly cavityClass?: string | null | undefined;
}
/**
 * Автоматический маппинг клинического диагноза и анатомии зуба на точные коды номенклатуры 804н.
 */
export declare function getOrder804nServicesForClinicalCase(options: ClinicalCase804nOptions): Order804nBillingLineItem[];
export interface Order804nBillingEstimateResult {
    readonly fdiNumber?: number | null;
    readonly icd10Code: string;
    readonly canalCount?: AnatomicalCanalCount | null;
    readonly items: readonly Order804nBillingLineItem[];
    readonly lineItems: readonly Order804nBillingLineItem[];
    readonly totalKopecks: Kopecks;
    readonly totalRub: number;
    readonly formattedTotal: string;
    readonly invoiceLines: readonly {
        readonly code: string;
        readonly title: string;
        readonly unitPriceRub: number;
        readonly quantity: number;
        readonly totalRub: number;
        readonly toothNumber?: string | null;
    }[];
}
/**
 * Расчет полной сметы и позиций счёта по номенклатуре Минздрава 804н с копеечной точностью.
 */
export declare function calculateOrder804nBillingEstimate(options: ClinicalCase804nOptions): Order804nBillingEstimateResult;
