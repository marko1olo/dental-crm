import { anonymizePatientForExternalLab, generateLabQrPayload } from "@dental/shared";
import { type JawScope, CONSTRUCTION_TYPES, LAB_MATERIALS, formatJawScopeLabel } from "../labMath";

export {
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
} from "./labOrderMaterialMappings";

export {
	type FittingAppointmentDraftParams,
	buildFittingAppointmentDraft,
} from "./labOrderFittingDraft";

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
	readonly shadeCervical?: string | undefined; readonly shadeBody?: string | undefined;
	readonly shadeIncisal?: string | undefined; readonly shadeStump?: string | undefined;
	readonly translucency?: string | undefined; readonly mamelons?: boolean | undefined;
	readonly currentStage: string; readonly dueDate: string;
	readonly frameworkTrialDate?: string | undefined; readonly ceramicTrialDate?: string | undefined;
	readonly clinicalNotes: string; readonly totalLabPriceRub: number;
	readonly labCostRub?: number | undefined; readonly costRub?: number | undefined;
	readonly selectedLabName?: string | undefined; readonly laboratoryName?: string | undefined;
	readonly attachedImageUrl: string | null; readonly isWarrantyRework?: boolean | undefined;
	readonly reworkReason?: string | undefined; readonly originalOrderNumber?: string | undefined;
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
		effectivePatientId, formDoctorId, formPatientName, selectedTeeth,
		jawScope, material, finalShade, dueDate, currentStage,
		totalLabPriceRub, attachedImageUrl, gostOrderNumber,
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
	const tokenized = anonymizePatientForExternalLab(formPatientName || "Пациент");
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
		costRub: params.costRub ?? params.labCostRub ?? Math.round(totalLabPriceRub * 0.4),
		labCostRub: params.labCostRub ?? params.costRub ?? Math.round(totalLabPriceRub * 0.4),
		laboratoryName: params.laboratoryName || params.selectedLabName || "Основная лаборатория",
		isWarrantyRework: Boolean(params.isWarrantyRework),
		attachedImageUrl: attachedImageUrl || null,
		tokenizedInitials: tokenized.tokenizedInitials,
		qrPayload,
	};
}
