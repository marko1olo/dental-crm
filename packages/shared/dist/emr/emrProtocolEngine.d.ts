/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U STATUTORY PROTOCOL AUTO-GENERATOR & DIARY ENGINE
 * Implementation according to Order of the Ministry of Health № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { type FdiToothRecord, type ToothSurface, type ToothClinicalStatusCode, type SoapVisitDiary, type FullForm043uPayload } from "../documents/forms043u.js";
export type { FdiToothRecord, ToothSurface, ToothClinicalStatusCode, SoapVisitDiary, FullForm043uPayload };
import { type ClinicalProtocolTemplate, type ClinicalSpecialtyKind, type StatutoryAnestheticDrug, type LocalAnesthesiaType, type BlackCavityClass, anestheticDrugLabels, statutoryAnestheticDrugLabels } from "./emrProtocolPresets.js";
export type { StatutoryAnestheticDrug };
export { anestheticDrugLabels, statutoryAnestheticDrugLabels };
import { type Order804nBillingLineItem, type Order804nBillingEstimateResult } from "../toothCanalsAndBilling804n.js";
/** Дневниковая запись одного посещения (SOAP формат по Приказу № 834н) */
export interface VisitDiaryEntry043 {
    id: string;
    entryDate: string;
    entryTime?: string | null;
    toothNumber?: string | null;
    subjectiveComplaints: string;
    objectiveStatusLocalis: string;
    percussionVertical?: "negative" | "positive_mild" | "positive_sharp";
    percussionHorizontal?: "negative" | "positive_mild" | "positive_sharp";
    probingTenderness?: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
    thermalTestResponse?: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
    eodMicroamperes?: number | null;
    probingPocketDepthMm?: number | null;
    assessmentDiagnosisText: string;
    assessmentIcd10Code: string;
    procedureProtocol: string;
    anesthesiaDetails?: string | null;
    appliedMaterials?: string | null;
    homeCareRecommendations?: string | null;
    prescribedMedications?: string | null;
    nextVisitDate?: string | null;
    doctorFullName: string;
    doctorSpecialty?: string | null;
    digitalSignatureHash?: string | null;
    isSignedWithUkep?: boolean;
}
/** Запрос на генерацию дневниковой записи */
export interface ClinicalDiarySynthesisRequest {
    readonly toothNumber?: number | string | null | undefined;
    readonly icd10Code: string;
    readonly surfaces?: readonly ToothSurface[] | null | undefined;
    readonly blackClass?: BlackCavityClass | null | undefined;
    readonly rootCanalsCount?: number | null | undefined;
    readonly doctorFullName: string;
    readonly doctorSpecialty?: string | null | undefined;
    readonly dateStr?: string | null | undefined;
    readonly timeStr?: string | null | undefined;
    readonly customAnesthesia?: {
        drug?: StatutoryAnestheticDrug | string | null | undefined;
        doseCarpules?: number | null | undefined;
        doseMl?: number | null | undefined;
        technique?: LocalAnesthesiaType | null | undefined;
    } | null | undefined;
    readonly customMaterials?: readonly string[] | null | undefined;
    readonly customComplaints?: string | null | undefined;
    readonly customObjectiveNotes?: string | null | undefined;
    readonly customProtocolNotes?: string | null | undefined;
    readonly isMultiVisitEndo?: boolean | undefined;
    readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
}
/** Результат аудита соответствия Приказу Минздрава № 834н */
export interface Statutory043Issue {
    readonly blockKey: "complaints" | "anamnesis" | "objective_status" | "odontogram" | "diagnosis" | "treatment_plan" | "treatment_protocol" | "doctor_signature" | "anesthesia" | "isolation" | "radiology";
    readonly fieldLabel: string;
    readonly message: string;
    readonly severity: "critical" | "warning" | "info";
    readonly statutoryRule: string;
}
export interface Statutory043ComplianceReport {
    readonly isCompliant: boolean;
    readonly complianceScore: number;
    readonly missingMandatoryBlocks: readonly string[];
    readonly criticalDefectsCount: number;
    readonly warningsCount: number;
    readonly issues: readonly Statutory043Issue[];
    readonly semanticChecks: {
        readonly icd10Valid: boolean;
        readonly fdiToothValid: boolean;
        readonly anesthesiaDoseSafe: boolean;
        readonly rubberDamCompliant: boolean;
        readonly rvgControlDocumented: boolean;
        readonly diagnosisProtocolConsistent: boolean;
    };
    readonly statutorySummaryText: string;
}
/** Проверка корректности номера зуба по FDI нотации (11-48 или 51-85) */
export declare function isValidFdiToothNumber(num: number | string | null | undefined): boolean;
/** Автоматическое определение класса по Блэку на основе поверхностей и номера зуба */
export declare function deduceBlackClassFromSurfaces(toothNumber: number | string | null | undefined, surfaces: readonly ToothSurface[] | null | undefined): BlackCavityClass;
export declare const deduceBlackCavityClassFromSurfaces: typeof deduceBlackClassFromSurfaces;
/** Получение шаблона протокола по коду МКБ-10 с поддержкой смежных кодов */
export declare function getClinicalProtocolTemplate(icd10Code: string, specialty?: ClinicalSpecialtyKind): ClinicalProtocolTemplate;
/**
 * Синтезатор дневниковой записи визита (SOAP формат по Приказу Минздрава № 834н)
 */
export declare function synthesizeClinicalDiary(request: ClinicalDiarySynthesisRequest): VisitDiaryEntry043;
/**
 * Синтез полного набора дневниковых записей на основе зубной формулы FDI
 */
export declare function synthesizeDiariesFromOdontogram(teeth: readonly FdiToothRecord[], doctorInfo: {
    fullName: string;
    specialty?: string;
    snils?: string;
}, baseDateStr?: string): VisitDiaryEntry043[];
/**
 * Семантический и законодательный валидатор формы № 043/у по Приказу Минздрава № 834н
 */
export declare function validateForm043uCompliance(input: any): Statutory043ComplianceReport;
/**
 * Входные параметры для 1-клик генерации клинического протокола и сметы
 */
export interface EmrAutopilotRequest {
    readonly toothNumber: string | number;
    readonly icd10Code: string;
    readonly surfaces?: readonly ToothSurface[] | null | undefined;
    readonly cavityClass?: BlackCavityClass | null | undefined;
    readonly doctorFullName: string;
    readonly doctorSpecialty?: ClinicalSpecialtyKind | string | null | undefined;
    readonly entryDate?: string | null | undefined;
    readonly entryTime?: string | null | undefined;
    readonly patientFullName?: string | null | undefined;
    readonly medicalCardNumber?: string | null | undefined;
    readonly allergologicalHistory?: string | null | undefined;
    readonly customComplaints?: string | null | undefined;
    readonly customObjective?: string | null | undefined;
    readonly customProtocol?: string | null | undefined;
    readonly customMaterials?: readonly string[] | null | undefined;
    readonly anestheticDrug?: StatutoryAnestheticDrug | null | undefined;
    readonly anesthesiaCarpules?: number | null | undefined;
    readonly includeAnesthesia?: boolean | undefined;
    readonly includeRvg?: boolean | undefined;
    readonly includeSutures?: boolean | undefined;
    readonly customCanalCount?: number | null | undefined;
    readonly isMultiVisitEndo?: boolean | undefined;
    readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
}
/**
 * Результат работы 1-клик клинического автопилота EMR
 */
export interface EmrAutopilotResult {
    readonly toothNumber: string;
    readonly icd10Code: string;
    readonly clinicalDiagnosis: string;
    readonly specialty: ClinicalSpecialtyKind;
    readonly canalCount: number;
    readonly surfaces: readonly ToothSurface[];
    readonly blackClass: BlackCavityClass;
    readonly diaryEntry: VisitDiaryEntry043;
    readonly soapVisitDiary: SoapVisitDiary;
    readonly order804nServices: readonly Order804nBillingLineItem[];
    readonly billingEstimate: Order804nBillingEstimateResult;
    readonly complianceAudit: Statutory043ComplianceReport;
}
/**
 * 1-Клик клинический автопилот EMR (Приказ № 834н + Номенклатура 804н + Расчет сметы в копейках)
 */
export declare function generateEmrAutopilotPlan(request: EmrAutopilotRequest): EmrAutopilotResult;
/**
 * Запрос пакетного автопилота всей зубной формулы FDI
 */
export interface FullOdontogramAutopilotRequest {
    readonly teeth: readonly FdiToothRecord[];
    readonly doctorFullName: string;
    readonly doctorSpecialty?: ClinicalSpecialtyKind | string | null;
    readonly entryDate?: string | null;
    readonly patientFullName?: string | null;
    readonly medicalCardNumber?: string | null;
    readonly allergologicalHistory?: string | null;
    readonly includeAnesthesia?: boolean;
    readonly includeRvg?: boolean;
    readonly includeSutures?: boolean;
}
/**
 * Результат пакетного автопилота всей зубной формулы FDI
 */
export interface FullOdontogramAutopilotResult {
    readonly totalTeethCount: number;
    readonly pathologyTeethCount: number;
    readonly autopilotItems: readonly EmrAutopilotResult[];
    readonly totalKopecks: number;
    readonly totalFormattedRub: string;
    readonly diaries: readonly VisitDiaryEntry043[];
    readonly overallComplianceScore: number;
    readonly isFullyCompliant: boolean;
    readonly missingMandatoryBlocks: readonly string[];
}
/**
 * Пакетный автопилот зубной формулы FDI (генерация всех протоколов и общей сметы 804н)
 */
export declare function synthesizeFullOdontogramAutopilot(request: FullOdontogramAutopilotRequest): FullOdontogramAutopilotResult;
/**
 * Справочник структурированных описаний процедур по Номенклатуре Минздрава 804н
 */
export interface Order804nProtocolDefinition {
    readonly code: string;
    readonly nameRu: string;
    readonly primaryIcd10: string;
    readonly protocolStepRu: string;
    readonly defaultSubjective?: string;
    readonly defaultStatusLocalis?: string;
    readonly requiredMaterials?: readonly string[];
}
export declare const ORDER_804N_PROTOCOL_DEFINITIONS: Record<string, Order804nProtocolDefinition>;
/**
 * Опции для интеллектуального обогащения дневниковой записи на основе кодов 804н
 */
export interface EnrichDiaryFrom804nOptions {
    readonly toothNumber?: number | string | null | undefined;
    readonly surfaces?: readonly ToothSurface[] | null | undefined;
    readonly preserveCustomText?: boolean | undefined;
    readonly doctorFullName?: string | null | undefined;
    readonly doctorSpecialty?: string | null | undefined;
}
/**
 * Синтезирует структурированный клинический протокол и дневник на основе выбранной услуги Номенклатуры 804н
 */
export declare function synthesizeProtocolFromOrder804nService(code804n: string, options?: EnrichDiaryFrom804nOptions): Order804nProtocolDefinition;
/**
 * 100% неразрушающее обогащение дневника 043/у при выборе услуг 804н.
 * Защищает от потери любой введенный врачом текст (жалобы, анамнез, сопутствующие патологии).
 */
export declare function enrichDiaryFrom804nServices(existingDiary: Partial<SoapVisitDiary> | any, services804n: readonly (string | {
    code: string;
})[], options?: EnrichDiaryFrom804nOptions): SoapVisitDiary;
