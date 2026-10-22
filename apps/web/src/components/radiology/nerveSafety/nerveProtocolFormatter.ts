/**
 * DENTE CRM — CBCT Surgery Protocol & Diary Formatter (Layer 2)
 * Mandate 8x & 8ap: Plain Russian Clinical UX. Mandate 8b: <= 120 lines.
 */

import {
	analyzeMischBoneQuality,
	formatMischProtocolToDiaryText,
	type HUZoneSampling,
} from "../boneDensityMischMath.js";
import {
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type AlveolarRidgeEnvelope,
	type ComprehensiveCbctPlanAudit,
	type AlveolarContainmentResult,
	createUnmeasuredNerveSafety,
} from "./nerveSafetyTypes.js";
import { calculateApexCoordinates } from "./nerveGeometryMath.js";
import {
	auditMandibularNerveSafety,
	auditAlveolarBoneContainment,
	auditMaxillarySinusSafety,
} from "./nerveAuditEngine.js";

export interface PerformCbctPlanningAuditParams {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly canal?: MandibularCanalCrossSection | null | undefined;
	readonly envelope?: AlveolarRidgeEnvelope | null | undefined;
	readonly huSampling: HUZoneSampling;
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
}

export function formatNerveSafetyBadgeText(clearanceMm: number | null): string {
	if (clearanceMm === null || clearanceMm === undefined) {
		return "⚠️ Канал не размечен";
	}
	return `⚠️ Расстояние до канала ${clearanceMm.toFixed(1)} мм`;
}

export function performCbctPlanningAudit(params: PerformCbctPlanningAuditParams): ComprehensiveCbctPlanAudit {
	const apex = calculateApexCoordinates(params.implantPose.entryPoint, params.implantPose.angulationDeg, params.implantPose.implantSpec.lengthMm);
	const isMaxilla = params.toothFdi < 30;
	const nerveSafety = isMaxilla ? auditMaxillarySinusSafety(params.implantPose) : params.canal ? auditMandibularNerveSafety(params.implantPose, params.canal) : createUnmeasuredNerveSafety();
	const boneContainment: AlveolarContainmentResult = params.envelope
		? auditAlveolarBoneContainment(params.implantPose, params.envelope)
		: { residualBuccalBoneMm: 0, residualLingualBoneMm: 0, isBuccalBoneAdequate: false, isLingualBoneAdequate: false, isApexContained: true, requiresGbrAugmentation: false, isUnmeasured: true };
	const boneQuality = analyzeMischBoneQuality(params.huSampling, params.implantPose.implantSpec.diameterMm);
	const isPlanApproved = nerveSafety.safetyStatus !== "unmeasured" && !nerveSafety.isDangerous && !nerveSafety.isWarning;

	const anatomyTitle = isMaxilla ? "2. АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ И ГАЙМОРОВА ПАЗУХА:" : "2. АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ И НИЖНЕЧЕЛЮСТНОЙ КАНАЛ:";
	const distanceLine = nerveSafety.safetyStatus === "unmeasured"
		? "   - Дистанция до канала: Канал не размечен"
		: isMaxilla
			? `   - Дистанция до дна пазухи: ${nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм`
			: `   - Дистанция до канала: ${nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм`;

	const diaryLines = [
		"============================================================",
		"ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
		`Пациент: ${params.patientName || "Пациент"} | Клиника: ${params.clinicName || "Стоматологический центр DENTE"} | Зуб: FDI #${params.toothFdi}`,
		"============================================================",
		"1. ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:",
		`   - Система: ${params.implantPose.implantSpec.brandName} (${params.implantPose.implantSpec.lineName})`,
		`   - Размеры: Ø ${params.implantPose.implantSpec.diameterMm.toFixed(1)} x ${params.implantPose.implantSpec.lengthMm.toFixed(1)} мм, наклон: ${params.implantPose.angulationDeg}°`,
		"",
		anatomyTitle,
		distanceLine,
		`   - Статус: ${nerveSafety.safetyStatus === "unmeasured" ? "Канал не размечен" : `Дистанция ${nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм`}`,
		`   - Вестибулярная костная стенка: ${params.envelope && !boneContainment.isUnmeasured ? `${boneContainment.residualBuccalBoneMm.toFixed(1)} мм` : "Не измерялась (—)"}`,
		`   - Оральная костная стенка: ${params.envelope && !boneContainment.isUnmeasured ? `${boneContainment.residualLingualBoneMm.toFixed(1)} мм` : "Не измерялась (—)"}`,
		"",
		`3. ${formatMischProtocolToDiaryText(params.huSampling, boneQuality, params.toothFdi)}`,
		"",
		"4. ЗАКЛЮЧЕНИЕ И РЕКОМЕНДАЦИИ:",
		`   - Анатомический статус: ${nerveSafety.safetyStatus === "unmeasured" ? "Канал не размечен" : `Дистанция ${nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм`}`,
		params.envelope && !boneContainment.isUnmeasured
			? (boneContainment.requiresGbrAugmentation ? "   - Рекомендована сопутствующая НКР (GBR)." : "   - Дополнительной костной пластики не требуется.")
			: "   - Потребность в НКР/GBR: Не определена (замеры гребня не проводились).",
		"============================================================",
	];

	const treatmentPlanItem = {
		code: `A16.07.054.${params.toothFdi}`,
		nameRu: `Установка дентального имплантата ${params.implantPose.implantSpec.brandName} ${params.implantPose.implantSpec.lineName} Ø${params.implantPose.implantSpec.diameterMm}x${params.implantPose.implantSpec.lengthMm} (позиция #${params.toothFdi})`,
		priceKopecks: params.implantPose.implantSpec.priceKopecks,
		priceFormattedRu: `${(params.implantPose.implantSpec.priceKopecks / 100).toLocaleString("ru-RU")} ₽`,
	};

	return {
		toothFdi: params.toothFdi, implantPose: params.implantPose, apexPoint: apex,
		nerveSafety, boneContainment, boneQuality, isPlanApproved,
		form043DiaryText: diaryLines.join("\n"), treatmentPlanItem,
	};
}

export function generateForm043CbctDiary(paramsOrAudit: PerformCbctPlanningAuditParams | ComprehensiveCbctPlanAudit): string {
	if ("form043DiaryText" in paramsOrAudit) return paramsOrAudit.form043DiaryText;
	return performCbctPlanningAudit(paramsOrAudit).form043DiaryText;
}

export const generateSurgeryProtocolDiary = generateForm043CbctDiary;
