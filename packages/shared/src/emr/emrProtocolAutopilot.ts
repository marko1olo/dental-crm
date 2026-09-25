/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U CLINICAL AUTOPILOT ENGINE (1-CLICK SOAP & 804N ESTIMATES)
 * Implementation according to Order of the Ministry of Health № 834n / № 804n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type FdiToothRecord,
	type ToothSurface,
	type ToothClinicalStatusCode,
	type SoapVisitDiary,
} from "../documents/forms043u.js";
import type {
	ClinicalSpecialtyKind,
	StatutoryAnestheticDrug,
	BlackCavityClass,
} from "./emrProtocolTypes.js";
import {
	getCanalCountForTooth,
	getOrder804nServicesForClinicalCase,
	calculateOrder804nBillingEstimate,
	type Order804nBillingLineItem,
	type Order804nBillingEstimateResult,
} from "../toothCanalsAndBilling804n.js";
import {
	type VisitDiaryEntry043,
	isValidFdiToothNumber,
	deduceBlackCavityClassFromSurfaces,
	synthesizeClinicalDiary,
} from "./emrProtocolDiary.js";
import { getClinicalProtocolTemplate } from "./emrProtocolPresets.js";
import {
	type Statutory043ComplianceReport,
	validateForm043uCompliance,
} from "./emrComplianceValidator.js";

export interface EmrAutopilotRequest {
	readonly toothNumber: string | number; // FDI (11-48, 51-85)
	readonly icd10Code: string; // e.g. "K02.1", "K04.0", "K08.1", etc.
	readonly surfaces?: readonly ToothSurface[] | null | undefined; // e.g. ["occlusal", "mesial"]
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
export function generateEmrAutopilotPlan(request: EmrAutopilotRequest): EmrAutopilotResult {
	const toothNumStr = String(request.toothNumber || "16").trim();
	const surfaces = request.surfaces && request.surfaces.length > 0 ? request.surfaces : (["occlusal"] as readonly ToothSurface[]);
	const blackClass = request.cavityClass || deduceBlackCavityClassFromSurfaces(toothNumStr, surfaces);
	const template = getClinicalProtocolTemplate(request.icd10Code, (request.doctorSpecialty as ClinicalSpecialtyKind) || undefined);
	const canalCount = getCanalCountForTooth(toothNumStr, request.customCanalCount ?? undefined);

	// Синтез дневниковой записи визита
	const diaryEntry = synthesizeClinicalDiary({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		surfaces,
		blackClass,
		rootCanalsCount: canalCount,
		doctorFullName: request.doctorFullName,
		doctorSpecialty: typeof request.doctorSpecialty === "string" ? request.doctorSpecialty : null,
		dateStr: request.entryDate ?? null,
		timeStr: request.entryTime ?? null,
		customComplaints: request.customComplaints ?? null,
		customObjectiveNotes: request.customObjective ?? null,
		customProtocolNotes: request.customProtocol ?? null,
		customMaterials: request.customMaterials ?? null,
		customAnesthesia: request.anestheticDrug
			? {
					drug: request.anestheticDrug,
					doseCarpules: request.anesthesiaCarpules ?? 1,
				}
			: null,
		isMultiVisitEndo: request.isMultiVisitEndo,
		endoVisitStage: request.endoVisitStage,
	});

	// Генерация 804н услуг
	const order804nServices = getOrder804nServicesForClinicalCase({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		canalCount,
		surfaces,
		specialty: template.specialty,
		includeAnesthesia: request.includeAnesthesia ?? true,
		includeRvg: request.includeRvg ?? (template.requiresApexLocatorRvg || template.specialty === "endodontics"),
		includeSutures: request.includeSutures ?? false,
	});

	// Расчет сметы в копейках
	const billingEstimate = calculateOrder804nBillingEstimate({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		canalCount,
		surfaces,
		specialty: template.specialty,
		includeAnesthesia: request.includeAnesthesia ?? true,
		includeRvg: request.includeRvg ?? (template.requiresApexLocatorRvg || template.specialty === "endodontics"),
		includeSutures: request.includeSutures ?? false,
	});

	// Формирование SOAP записи для формы 043/у
	const soapVisitDiary: SoapVisitDiary = {
		entryDate: diaryEntry.entryDate,
		toothNumber: diaryEntry.toothNumber,
		subjectiveComplaints: diaryEntry.subjectiveComplaints,
		objectiveStatusLocalis: diaryEntry.objectiveStatusLocalis,
		percussionVertical: diaryEntry.percussionVertical || "negative",
		percussionHorizontal: diaryEntry.percussionHorizontal || "negative",
		probingTenderness: diaryEntry.probingTenderness || "none",
		thermalTestResponse: diaryEntry.thermalTestResponse || "indifferent",
		eodMicroamperes: diaryEntry.eodMicroamperes ?? null,
		assessmentDiagnosisText: diaryEntry.assessmentDiagnosisText,
		assessmentIcd10Code: diaryEntry.assessmentIcd10Code,
		procedureProtocol: diaryEntry.procedureProtocol,
		anesthesiaDetails: diaryEntry.anesthesiaDetails ?? null,
		appliedMaterials: diaryEntry.appliedMaterials ?? null,
		homeCareRecommendations: diaryEntry.homeCareRecommendations ?? null,
		nextVisitDate: diaryEntry.nextVisitDate ?? null,
		doctorFullName: diaryEntry.doctorFullName,
	};

	// Валидация соответствия Приказу № 834н
	const complianceAudit = validateForm043uCompliance({
		patientFullName: request.patientFullName || "Пациент Тестовый",
		medicalCardNumber: request.medicalCardNumber || "КАРТА-043-001",
		allergologicalHistory: request.allergologicalHistory || "Аллергологический анамнез спокоен, аллергических реакций на местные анестетики и антибиотики не отмечает.",
		doctorFullName: request.doctorFullName,
		visitDiaries: [soapVisitDiary],
	});

	return {
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		clinicalDiagnosis: diaryEntry.assessmentDiagnosisText,
		specialty: template.specialty,
		canalCount,
		surfaces,
		blackClass,
		diaryEntry,
		soapVisitDiary,
		order804nServices,
		billingEstimate,
		complianceAudit,
	};
}

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
export function synthesizeFullOdontogramAutopilot(request: FullOdontogramAutopilotRequest): FullOdontogramAutopilotResult {
	const validTeeth = (request.teeth || []).filter((t) => isValidFdiToothNumber(t.toothNumber));
	const autopilotItems: EmrAutopilotResult[] = [];
	let totalKopecks = 0;

	for (const tooth of validTeeth) {
		const status = (tooth.statusCode || "healthy") as ToothClinicalStatusCode;

		// Пропуск интактных, удаленных и имплантированных зубов без патологий
		if (status === "healthy" || status === "extracted_absent" || status === "implant" || status === "sealant_fissure") {
			continue;
		}

		let icdCode = "K02.1";
		if (status === "caries_initial" || status === "caries_superficial") {
			icdCode = "K02.0";
		} else if (status === "caries_media" || status === "caries_profunda" || status === "filled_secondary_caries" || status === "filled_defective") {
			icdCode = "K02.1";
		} else if (status === "caries_cementum") {
			icdCode = "K02.2";
		} else if (status === "pulpitis_acute" || status === "pulpitis_chronic" || status === "pulpitis_necrosis") {
			icdCode = "K04.0";
		} else if (status === "periodontitis_acute") {
			icdCode = "K04.4";
		} else if (status === "periodontitis_chronic") {
			icdCode = "K04.5";
		} else if (status === "periodontitis_radicular_cyst") {
			icdCode = "K04.8";
		} else if (status === "wedge_defect") {
			icdCode = "K03.1";
		} else if (status === "erosion") {
			icdCode = "K03.2";
		} else if (status === "attrition_pathological") {
			icdCode = "K03.0";
		} else if (status === "root_remnant" || status === "fracture") {
			icdCode = "K08.1";
		} else if (
			status === "crown_metal_ceramic" ||
			status === "crown_zirconia" ||
			status === "crown_emax" ||
			status === "crown_temporary" ||
			status === "inlay_onlay" ||
			status === "veneer"
		) {
			icdCode = "K08.1_ORTHO";
		}

		const surfaces = tooth.surfaces && tooth.surfaces.length > 0 ? tooth.surfaces : (["occlusal"] as readonly ToothSurface[]);
		const item = generateEmrAutopilotPlan({
			toothNumber: tooth.toothNumber,
			icd10Code: icdCode,
			surfaces,
			doctorFullName: request.doctorFullName,
			doctorSpecialty: request.doctorSpecialty ?? null,
			entryDate: request.entryDate ?? null,
			patientFullName: request.patientFullName ?? null,
			medicalCardNumber: request.medicalCardNumber ?? null,
			allergologicalHistory: request.allergologicalHistory ?? null,
			includeAnesthesia: request.includeAnesthesia ?? true,
			includeRvg: request.includeRvg ?? false,
			includeSutures: request.includeSutures ?? false,
			customCanalCount: tooth.rootCanalsCount ?? null,
		});

		autopilotItems.push(item);
		totalKopecks += item.billingEstimate.totalKopecks;
	}

	const diaries = autopilotItems.map((item) => item.diaryEntry);
	const avgScore =
		autopilotItems.length > 0
			? Math.round(autopilotItems.reduce((acc, item) => acc + item.complianceAudit.complianceScore, 0) / autopilotItems.length)
			: 100;
	const isFullyCompliant = autopilotItems.every((item) => item.complianceAudit.isCompliant);
	const missingBlocks = Array.from(new Set(autopilotItems.flatMap((item) => item.complianceAudit.missingMandatoryBlocks)));

	const rubles = Math.floor(totalKopecks / 100);
	const kopecks = totalKopecks % 100;
	const totalFormattedRub = `${rubles.toLocaleString("ru-RU")},${kopecks.toString().padStart(2, "0")} ₽`;

	return {
		totalTeethCount: validTeeth.length,
		pathologyTeethCount: autopilotItems.length,
		autopilotItems,
		totalKopecks,
		totalFormattedRub,
		diaries,
		overallComplianceScore: avgScore,
		isFullyCompliant,
		missingMandatoryBlocks: missingBlocks,
	};
}
