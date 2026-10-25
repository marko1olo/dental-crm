/**
 * VisiographExportProtocolText.ts
 * Builds clinical protocol text for patient visit medical record (Form 043/u).
 */

import { VISIOGRAPH_WINDOW_PRESETS } from "./VisiographWindowPresets";
import { type ClinicalSnapshotPayload, formatViewKindLabel } from "./VisiographExportTypes";

export function buildForm043ProtocolText(payload: ClinicalSnapshotPayload): string {
	const lines: string[] = [];
	lines.push("--- ПРОТОКОЛ ЛУЧЕВОГО ОБСЛЕДОВАНИЯ И 3D-ПЛАНИРОВАНИЯ (ФОРМА № 043/У) ---");
	const dateStr = payload.capturedAt ? new Date(payload.capturedAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU");
	lines.push(`Дата и время: ${dateStr}`);

	const tooth = payload.fdiToothCode || payload.toothCode;
	if (tooth) lines.push(`Область зуба (FDI): № ${tooth}`);
	if (payload.viewKind) lines.push(`Вид исследования: ${formatViewKindLabel(payload.viewKind)}`);

	const exp = payload.exposureParameters;
	const expTime = exp?.exposureTimeSec ?? payload.exposureTimeSec;
	if (exp || expTime !== undefined) {
		const expParts: string[] = [];
		if (expTime !== undefined) expParts.push(`Экспозиция: ${expTime.toFixed(2)} с`);
		if (exp?.kVp !== undefined) expParts.push(`Анодное напряжение: ${exp.kVp} кВ`);
		if (exp?.mAs !== undefined) expParts.push(`Ток/время: ${exp.mAs} мАс`);
		if (exp?.sensorType) expParts.push(`Датчик: ${exp.sensorType}`);
		if (expParts.length > 0) lines.push(`Параметры экспозиции: ${expParts.join(", ")}`);
	}

	const preset = payload.preset ?? (payload.viewKind?.startsWith("mpr") ? VISIOGRAPH_WINDOW_PRESETS.bone : undefined);
	if (preset) {
		lines.push(`Режим контрастирования (HU): ${preset.label} (Окно WW: ${preset.windowWidth} HU, Уровень WL: ${preset.windowCenter} HU)`);
	}

	if (payload.contrast !== undefined || payload.brightness !== undefined || payload.gamma !== undefined || payload.sharpness !== undefined) {
		const adj: string[] = [];
		if (payload.brightness !== undefined) adj.push(`Яркость: ${payload.brightness}%`);
		if (payload.contrast !== undefined) adj.push(`Контрастность: ${payload.contrast}%`);
		if (payload.gamma !== undefined) adj.push(`Гамма: ${payload.gamma.toFixed(2)}`);
		if (payload.sharpness !== undefined) adj.push(`Резкость (USM): ${payload.sharpness}%`);
		lines.push(`Пользовательская коррекция: ${adj.join(", ")}`);
	}

	if (payload.calibration) {
		const ref = payload.calibration.referenceType ? ` (${payload.calibration.referenceType}${payload.calibration.referenceMm ? ` ${payload.calibration.referenceMm} мм` : ""})` : "";
		lines.push(`Калибровка масштаба: 1 px = ${(payload.calibration.scaleMmPerPx ?? 0).toFixed(4)} мм${ref}`);
	}

	if (payload.measurements) {
		const { rulers = [], angles = [], lesions = [] } = payload.measurements;
		if (rulers.length > 0) lines.push(`Линейные замеры: ${rulers.map((r, i) => `${r.label || `L${i + 1}`}: ${(r.lengthMm ?? 0).toFixed(1)} мм`).join(", ")}`);
		if (angles.length > 0) lines.push(`Угловые измерения: ${angles.map((a, i) => `${a.label || `∠${i + 1}`}: ${(a.angleDeg ?? 0).toFixed(1)}°${a.deviationFromVerticalDeg !== undefined ? ` (наклон: ${(a.deviationFromVerticalDeg ?? 0).toFixed(1)}°)` : ""}`).join(", ")}`);
		if (lesions.length > 0) {
			for (let i = 0; i < lesions.length; i++) {
				const les = lesions[i];
				if (les) lines.push(`Очаг деструкции #${i + 1}: ${les.classificationLabel} — площадь: ${(les.areaMm2 ?? 0).toFixed(1)} мм² (экв. Ø: ${(les.equivalentDiameterMm ?? 0).toFixed(1)} мм)${les.treatmentRecommendation ? ` [Тактика: ${les.treatmentRecommendation}]` : ""}`);
			}
		}
	}

	if (payload.radiologicalFinding) lines.push(`Рентгенологическая картина: ${payload.radiologicalFinding}`);
	if (payload.boneDensity) lines.push(`Плотность костной ткани (Misch): ${payload.boneDensity.classification} (среднее значение: ${Math.round(payload.boneDensity.averageHU ?? 0)} HU)`);
	if (payload.implantDetails) lines.push(`Параметры планируемого имплантата: Ø ${(payload.implantDetails.diameterMm ?? 0).toFixed(1)} мм × L ${(payload.implantDetails.lengthMm ?? 0).toFixed(1)} мм${payload.implantDetails.system ? ` (Система: ${payload.implantDetails.system})` : ""}`);

	if (payload.nerveDistanceMm !== undefined && Number.isFinite(payload.nerveDistanceMm)) {
		const isDanger = payload.nerveDistanceMm < 2.0;
		lines.push(`Дистанция до нижнечелюстного канала (N. alveolaris inferior): ${payload.nerveDistanceMm.toFixed(1)} мм ${isDanger ? "[ВНИМАНИЕ: ОПАСНАЯ ЗОНА < 2.0 ММ! ВЫСОКИЙ РИСК ТРАВМАТИЗАЦИИ НЕРВА]" : "[Безопасный коридор ≥ 2.0 мм]"}`);
	}

	if (payload.aiProtocolLog) lines.push(`Заключение ИИ-анализа: ${payload.aiProtocolLog}`);
	if (payload.clinicalNote) lines.push(`Клинические примечания врача: ${payload.clinicalNote}`);
	lines.push("Снимок и протокол прикреплены к электронной медицинской карте 043/у.");
	return lines.join("\n");
}

export const buildClinicalVisitProtocolText = buildForm043ProtocolText;
