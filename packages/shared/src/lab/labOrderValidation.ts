/**
 * labOrderValidation.ts — Клиническая и регламентная валидация зуботехнического наряда ЗТЛ (SSOT).
 *
 * Инварианты:
 * 1. Проверка заполнения зубов по формуле FDI (11..48) либо выбор челюсти (JawScope).
 * 2. Проверка шкалы цвета VITA (Classical A1-D4, Bleach OM/BL, 3D-Master).
 * 3. Проверка сроков и дедлайнов: предотвращение назначения примерки раньше готовности ЗТЛ.
 * 4. Связка с SSOT SLA риска (evaluateLabSlaRisk).
 */

import { isValidVitaShade } from "./vitaPalette.js";

export type LabSlaRiskLevel = "safe" | "warning_approaching" | "critical_under_24h" | "breached_overdue";

export type JawScope = "upper" | "lower" | "both" | "none";

export interface LabOrderValidationInput {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	selectedTeeth: readonly number[];
	jawScope?: JawScope | null | undefined;
	constructionType?: string | null | undefined;
	material?: string | null | undefined;
	shadeFinal?: string | null | undefined;
	dueDate?: string | null | undefined;
	scheduledVisitDate?: string | null | undefined;
	frameworkTrialDate?: string | null | undefined;
	ceramicTrialDate?: string | null | undefined;
	totalLabPriceRub?: number | undefined;
}

export interface LabOrderValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly slaRisk: LabSlaRiskLevel;
}

export { isValidVitaShade };

export function validateLabOrderInput(input: LabOrderValidationInput): LabOrderValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// 1. Пациент и врач
	if (!input.patientName || input.patientName.trim().length === 0) {
		errors.push("Не указано Ф.И.О. пациента");
	}

	// 2. Зубы или челюсть
	const hasTeeth = input.selectedTeeth && input.selectedTeeth.length > 0;
	const hasJawScope = Boolean(input.jawScope);
	if (!hasTeeth && !hasJawScope) {
		errors.push("Не выбраны зубы по формуле FDI и не указана челюсть наряда");
	}

	if (hasTeeth) {
		for (const tooth of input.selectedTeeth) {
			if (tooth < 11 || tooth > 48) {
				errors.push(`Недопустимый номер зуба FDI: ${tooth} (допустимы 11..48)`);
			}
		}
	}

	// 3. Конструкция и материал
	if (!input.constructionType || input.constructionType.trim().length === 0) {
		errors.push("Не указан тип ортопедической конструкции");
	}
	if (!input.material || input.material.trim().length === 0) {
		errors.push("Не указан материал реставрации");
	}

	// 4. Оттенок VITA
	if (!input.shadeFinal || input.shadeFinal.trim().length === 0) {
		warnings.push("Не указан оттенок VITA (по умолчанию будет использован цвет A2)");
	} else if (!isValidVitaShade(input.shadeFinal)) {
		warnings.push(`Оттенок '${input.shadeFinal}' не является стандартным кодом VITA`);
	}

	// 5. Дедлайн и коллизии примерки
	let slaRisk: LabSlaRiskLevel = "safe";
	if (input.dueDate) {
		const labDate = new Date(input.dueDate);
		if (Number.isNaN(labDate.getTime())) {
			errors.push("Некорректная дата готовности ЗТЛ");
		} else {
			const visitDateStr = input.scheduledVisitDate || input.ceramicTrialDate || input.frameworkTrialDate;
			if (visitDateStr) {
				const visitDate = new Date(visitDateStr);
				if (!Number.isNaN(visitDate.getTime())) {
					if (visitDate < labDate) {
						warnings.push("Дата визита на примерку назначена раньше даты готовности заказа из ЗТЛ!");
						slaRisk = "breached_overdue";
					} else {
						const diffHours = (visitDate.getTime() - labDate.getTime()) / (1000 * 60 * 60);
						if (diffHours < 24) {
							slaRisk = "critical_under_24h";
						} else if (diffHours < 48) {
							slaRisk = "warning_approaching";
						} else {
							slaRisk = "safe";
						}
					}
				}
			}
		}
	}

	// 6. Стоимость
	if (input.totalLabPriceRub !== undefined && input.totalLabPriceRub < 0) {
		errors.push("Стоимость наряда не может быть отрицательной");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		slaRisk,
	};
}

export function formatDisplayDate(dStr?: string | null): string {
	if (!dStr) return "";
	try {
		const parsed = new Date(dStr);
		if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString("ru-RU");
	} catch (err: unknown) {
		console.warn("[DentalLabOrderModal] Failed to format date:", dStr, err);
	}
	return dStr;
}

export function mapConstructionTypeToRestorationType(val?: string | null): string {
	if (!val) return "crown_monolithic";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		single_crown: "crown_monolithic",
		crown_zirconia: "crown_monolithic",
		crown_emax: "crown_layered_cutback",
		crown: "crown_monolithic",
		bridge: "bridge_retainer",
		bridge_retainer: "bridge_retainer",
		bridge_pontic: "bridge_pontic",
		veneer: "veneer_laminate",
		veneer_laminate: "veneer_laminate",
		inlay_onlay: "inlay",
		inlay: "inlay",
		onlay: "onlay",
		overlay: "overlay",
		all_on_4_6: "screw_retained_crown",
		all_on_arch: "screw_retained_crown",
		implant_abutment: "custom_abutment_tibase",
		custom_abutment_tibase: "custom_abutment_tibase",
		screw_retained_crown: "screw_retained_crown",
		surgical_guide: "surgical_guide",
		aligner_splint: "clear_aligner_stage",
		aligner_nightguard: "clear_aligner_stage",
		aligners_nightguard: "clear_aligner_stage",
		aligners: "clear_aligner_stage",
		clasp_denture: "crown_monolithic",
		endocrown: "endocrown",
		core_buildup_post: "crown_monolithic",
		nightguard_bruxism: "occlusal_splint_nightguard",
		occlusal_splint: "occlusal_splint_nightguard",
		sports_mouthguard: "occlusal_splint_nightguard",
		bleaching_tray: "occlusal_splint_nightguard",
		full_denture: "crown_monolithic",
		custom_impression_tray: "crown_monolithic",
	};
	return map[lower] || "crown_monolithic";
}

export function mapMaterialToRestorationMaterial(val?: string | null): string {
	if (!val) return "zirconia_multilayer_gradient";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		zirconia_multilayer: "zirconia_multilayer_gradient",
		zirconia: "zirconia_multilayer_gradient",
		emax_lithium_disilicate: "emax_lithium_disilicate_press",
		emax_press: "emax_lithium_disilicate_press",
		emax_cad: "emax_lithium_disilicate_cad",
		emax: "emax_lithium_disilicate_press",
		metal_ceramic: "cocr_milled_cast",
		pmma: "pmma_cad_provisional",
		titanium: "titanium_grade_5",
	};
	return map[lower] || "zirconia_multilayer_gradient";
}

export interface FittingAppointmentDraftParams {
	effectivePatientId: string;
	formPatientName: string;
	formDoctorId: string;
	formDoctorName: string;
	effectiveFittingDate: string;
	material: string;
	selectedTeeth: readonly number[];
	gostOrderNumber: string;
	finalShade: string;
	dueDate: string;
}

export function buildFittingAppointmentDraft({
	effectivePatientId,
	formPatientName,
	formDoctorId,
	formDoctorName,
	effectiveFittingDate,
	material,
	selectedTeeth,
	gostOrderNumber,
	finalShade,
	dueDate,
}: FittingAppointmentDraftParams) {
	const toothLabel = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "11";
	return {
		patientId: effectivePatientId,
		patientName: formPatientName,
		patientPhone: "",
		doctorId: formDoctorId || "doc-current",
		doctorName: formDoctorName || "Врач-ортопед",
		serviceTitle: `Примерка и фиксация: ${material} (зуб ${toothLabel})`,
		serviceCode: "A16.07.004",
		durationMinutes: 45,
		scheduledDate: effectiveFittingDate,
		targetDate: effectiveFittingDate,
		stageKind: "stage_3_orthopedics",
		orderNumber: gostOrderNumber,
		notes: `Автобронь примерки из ЗТЛ № ${gostOrderNumber} (${material}, зуб ${toothLabel}, цвет ${finalShade}). Дедлайн ЗТЛ: ${dueDate || "—"}.`,
	};
}

export function buildLabOrderApiPayload(params: BuildLabOrderPayloadParams) {
	const {
		effectivePatientId, formDoctorId, formPatientName, selectedTeeth,
		jawScope, material, finalShade, dueDate, currentStage,
		totalLabPriceRub, attachedImageUrl, gostOrderNumber,
	} = params;

	let toothFdiStr: string;
	if (jawScope) {
		toothFdiStr = jawScope;
	} else if (selectedTeeth.length > 0) {
		toothFdiStr = selectedTeeth.join(", ");
	} else {
		toothFdiStr = "Общий наряд / Челюсть целиком";
	}

	const comprehensiveNotes = buildComprehensiveClinicalNotes(params);

	const parts = (formPatientName || "").trim().split(/\s+/).filter(Boolean);
	const tokenizedInitials = parts.length > 0
		? parts.map((p, idx) => (idx === 0 ? p : `${p[0]?.toUpperCase()}.`)).join(" ")
		: "Пациент";
	const qrPayload = `DNT-LAB:${gostOrderNumber || "ORDER"}|${tokenizedInitials}|${toothFdiStr}|${finalShade}`;

	return {
		patientId: effectivePatientId,
		doctorId: formDoctorId || null,
		toothFdi: toothFdiStr,
		jawScope: jawScope || undefined,
		material,
		colorVita: finalShade,
		status: currentStage || "draft",
		dueDate,
		clinicalNotes: comprehensiveNotes,
		priceRub: totalLabPriceRub,
		attachedImageUrl: attachedImageUrl || null,
		gostOrderNumber,
		tokenizedInitials,
		qrPayload,
	};
}

export interface BuildLabOrderPayloadParams {
	readonly effectivePatientId: string;
	readonly formPatientName: string;
	readonly formDoctorId: string;
	readonly formDoctorName: string;
	readonly patientChartNumber?: string | undefined;
	readonly selectedTeeth: readonly number[];
	readonly jawScope: JawScope | null;
	readonly constructionType: string;
	readonly material: string;
	readonly impressionType: string;
	readonly finalShade: string;
	readonly shadeCervical?: string | undefined;
	readonly shadeBody?: string | undefined;
	readonly shadeIncisal?: string | undefined;
	readonly shadeStump?: string | undefined;
	readonly translucency?: string | undefined;
	readonly mamelons?: boolean | undefined;
	readonly currentStage: string;
	readonly dueDate: string;
	readonly frameworkTrialDate?: string | undefined;
	readonly ceramicTrialDate?: string | undefined;
	readonly clinicalNotes: string;
	readonly totalLabPriceRub: number;
	readonly labCostRub?: number | undefined;
	readonly costRub?: number | undefined;
	readonly selectedLabName?: string | undefined;
	readonly laboratoryName?: string | undefined;
	readonly attachedImageUrl: string | null;
	readonly isWarrantyRework?: boolean | undefined;
	readonly reworkReason?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly effectiveOverride?: { authorized: boolean; doctorName: string } | null | undefined;
	readonly gostOrderNumber: string;
}

export function buildComprehensiveClinicalNotes(params: BuildLabOrderPayloadParams): string {
	const {
		isWarrantyRework, reworkReason, originalOrderNumber, patientChartNumber,
		jawScope, clinicalNotes, impressionType, constructionType,
		shadeCervical, shadeBody, shadeIncisal, shadeStump,
		translucency, mamelons, frameworkTrialDate, ceramicTrialDate, effectiveOverride,
	} = params;

	const parts = [
		isWarrantyRework ? "ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 РУБ ДЛЯ ПАЦИЕНТА)" : null,
		reworkReason ? `Причина рекламации: ${reworkReason}` : null,
		originalOrderNumber ? `Исходный наряд ЗТЛ: № ${originalOrderNumber}` : null,
		patientChartNumber ? `№ Медкарты: ${patientChartNumber}` : null,
		jawScope ? `Наряд на челюсть: ${jawScope}` : null,
		clinicalNotes.trim(),
		`Оттискная масса / Скан: ${impressionType}`,
		`Конструкция: ${constructionType}`,
		shadeCervical && shadeBody && shadeIncisal
			? `Цветовые зоны: Пришейка ${shadeCervical}, Тело ${shadeBody}, Режущий край ${shadeIncisal}`
			: null,
		shadeStump ? `Культя: ${shadeStump}` : null,
		translucency ? `Транслюцентность: ${translucency}` : null,
		mamelons ? "Эффект мамелонов" : null,
		"Окклюзия: В привычной центральной окклюзии по регистрату",
		frameworkTrialDate ? `Примерка каркаса: ${frameworkTrialDate}` : null,
		ceramicTrialDate ? `Примерка керамики: ${ceramicTrialDate}` : null,
		effectiveOverride?.authorized
			? `Клиническое решение врача: отправка наряда согласована (${effectiveOverride.doctorName})`
			: null,
	];

	return parts.filter(Boolean).join("\n* ");
}
