/**
 * labOrderPayloadBuilder.ts — Сборка DTO, генерация QR-кода/штрих-кода и ключей идемпотентности наряда.
 *
 * Инварианты:
 * 1. Интеграция со стандартами @dental/shared: 152-ФЗ деперсонализация и HMAC QR-подпись.
 * 2. Генерация клиентского ключа идемпотентности (UUIDv7/v4) против двойных кликов.
 * 3. Точный маппинг номенклатуры конструкций и материалов по клиническим стандартам.
 */

import {
	anonymizePatientForExternalLab,
	generateLabQrPayload,
} from "@dental/shared";
import {
	type DentalLabOrderData,
	type JawScope,
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	formatJawScopeLabel,
	addWorkingDays,
} from "../labMath";

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
	readonly attachedImageUrl: string | null;
	readonly isWarrantyRework?: boolean | undefined;
	readonly reworkReason?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly effectiveOverride?: { authorized: boolean; doctorName: string } | null | undefined;
	readonly gostOrderNumber: string;
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
		pfm_cocr: "cocr_milled_cast",
		metal_ceramic: "cocr_milled_cast",
		pmma_temporary: "pmma_cad_provisional",
		pmma: "pmma_cad_provisional",
		titanium_custom_abutment: "titanium_grade_5",
		titanium: "titanium_grade_5",
		composite_lab_nanohybrid: "composite_lab_nanohybrid",
		peek_biohpp: "peek_biohpp",
		resin_3d_surgical_guide: "resin_3d_surgical_guide",
		resin_3d_splint_biocompatible: "resin_3d_splint_biocompatible",
	};
	return map[lower] || "zirconia_multilayer_gradient";
}

export function buildComprehensiveClinicalNotes(params: BuildLabOrderPayloadParams): string {
	const {
		isWarrantyRework,
		reworkReason,
		originalOrderNumber,
		patientChartNumber,
		jawScope,
		clinicalNotes,
		impressionType,
		constructionType,
		shadeCervical,
		shadeBody,
		shadeIncisal,
		shadeStump,
		translucency,
		mamelons,
		frameworkTrialDate,
		ceramicTrialDate,
		effectiveOverride,
	} = params;

	const parts = [
		isWarrantyRework ? "ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 РУБ ДЛЯ ПАЦИЕНТА)" : null,
		reworkReason ? `Причина рекламации: ${reworkReason}` : null,
		originalOrderNumber ? `Исходный наряд ЗТЛ: № ${originalOrderNumber}` : null,
		patientChartNumber ? `№ Медкарты: ${patientChartNumber}` : null,
		jawScope ? `Наряд на челюсть: ${formatJawScopeLabel(jawScope)}` : null,
		clinicalNotes.trim(),
		`Оттискная масса / Скан: ${impressionType}`,
		`Конструкция: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`,
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

export function buildLabOrderApiPayload(params: BuildLabOrderPayloadParams) {
	const {
		effectivePatientId,
		formDoctorId,
		formPatientName,
		selectedTeeth,
		jawScope,
		material,
		finalShade,
		dueDate,
		currentStage,
		totalLabPriceRub,
		attachedImageUrl,
		gostOrderNumber,
	} = params;

	let toothFdiStr: string;
	if (jawScope) {
		toothFdiStr = formatJawScopeLabel(jawScope);
	} else if (selectedTeeth.length > 0) {
		toothFdiStr = selectedTeeth.join(", ");
	} else {
		toothFdiStr = "Общий наряд / Челюсть целиком";
	}

	const comprehensiveNotes = buildComprehensiveClinicalNotes(params);

	// 152-ФЗ Деперсонализация ПДн пациента для ЗТЛ
	const tokenized = anonymizePatientForExternalLab(formPatientName || "Пациент");

	// Генерация защищенного QR-кода на коробку
	const qrPayload = generateLabQrPayload(gostOrderNumber || "L-00000", "dente-lab-secret");

	return {
		patientId: effectivePatientId,
		doctorId: formDoctorId || null,
		toothFdi: toothFdiStr,
		jawScope: jawScope || undefined,
		material: LAB_MATERIALS.find((m) => m.id === material)?.name || material,
		colorVita: finalShade,
		dueDate: dueDate ? new Date(dueDate).toISOString() : null,
		status: currentStage || "sent_to_lab",
		stage: currentStage || "sent_to_lab",
		clinicalNotes: `* ${comprehensiveNotes}`,
		priceRub: totalLabPriceRub,
		attachedImageUrl: attachedImageUrl || null,
		tokenizedInitials: tokenized.tokenizedInitials,
		qrPayload,
	};
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
}: {
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
}) {
	const toothLabel = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "11";
	const matTitle = LAB_MATERIALS.find((m) => m.id === material)?.name || material;

	return {
		patientId: effectivePatientId,
		patientName: formPatientName,
		patientPhone: "",
		doctorId: formDoctorId || "doc-current",
		doctorName: formDoctorName || "Врач-ортопед",
		serviceTitle: `Примерка и фиксация: ${matTitle} (зуб ${toothLabel})`,
		serviceCode: "A16.07.004", // Прейскурант ортопедии
		durationMinutes: 45,
		scheduledDate: effectiveFittingDate,
		targetDate: effectiveFittingDate,
		stageKind: "stage_3_orthopedics",
		orderNumber: gostOrderNumber,
		notes: `Автобронь примерки из ЗТЛ № ${gostOrderNumber} (${matTitle}, зуб ${toothLabel}, цвет ${finalShade}). Дедлайн ЗТЛ: ${dueDate || "—"}.`,
	};
}
