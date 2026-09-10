/**
 * apps/web/src/components/formula/stomxFormulaAdapter.ts
 *
 * Bridge and adapter between StomX tooth defects catalog and Web Odontogram state.
 * Preserves full backwards-compatibility with ToothData and ToothChart.
 */

import {
	findStomxDefectByAlias,
	findStomxPositionAnomaly,
	mapCrmToothStateToStomxDefect,
	mapStomxDefectToCrmToothState,
	type StomxPositionAnomalyCode,
	type StomxToothDefect,
} from "@dental/shared";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import type { StomxDefectBadge, ToothFormulaItem } from "./types";

/**
 * Преобразует существующий ToothData (из ToothChart/Odontogram) в ToothFormulaItem.
 */
export function convertOdontogramDataToFormula(
	toothNumber: number,
	data?: Partial<ToothData>,
): ToothFormulaItem {
	const state: ToothState = data?.state ?? "Healthy";
	const stomxDefect = mapCrmToothStateToStomxDefect(state);
	const initialDefects: string[] = [];

	if (stomxDefect && stomxDefect.alias !== "ok") {
		initialDefects.push(stomxDefect.alias);
	}

	return {
		toothNumber,
		state,
		stomxDefects: initialDefects,
		surfaces: data?.surfaces ? [...data.surfaces] : [],
		mobility: data?.mobility,
		notes: data?.notes,
		requireTreatment: stomxDefect?.require_treatment ?? false,
	};
}

/**
 * Преобразует ToothFormulaItem обратно в partial ToothData для обновления OdontogramModule.
 */
export function convertFormulaToOdontogramData(
	item: ToothFormulaItem,
): Partial<ToothData> {
	const res: Partial<ToothData> = {
		toothNumber: item.toothNumber,
		state: item.state,
	};
	if (item.surfaces) {
		res.surfaces = [...item.surfaces];
	}
	if (item.mobility !== undefined) {
		res.mobility = item.mobility;
	}
	if (item.notes !== undefined) {
		res.notes = item.notes;
	}
	return res;
}

/**
 * Переключает аномалию положения зуба (В, О, Д, М, С, И, Т, Тр, Пр, Рт).
 */
export function toggleStomxPositionAnomalyOnTooth(
	tooth: ToothFormulaItem,
	codeOrAlias: string,
): ToothFormulaItem {
	const cleanCode = codeOrAlias.replace(/^pos(ition)?:/i, "").trim();
	const anomaly = findStomxPositionAnomaly(cleanCode);
	if (!anomaly) return tooth;
	const isSame = tooth.positionAnomaly === anomaly.alias;
	return {
		...tooth,
		positionAnomaly: isSame ? undefined : anomaly.alias,
	};
}

/**
 * Применяет или снимает дефект StomX для зуба.
 * Интеллектуально обновляет канонический state (например, добавление "С" переводит в Caries,
 * а выбор "ok" сбрасывает патологии в Healthy).
 */
export function toggleStomxDefectOnTooth(
	tooth: ToothFormulaItem,
	defectAlias: string,
	isPosition?: boolean,
): ToothFormulaItem {
	if (isPosition || defectAlias.startsWith("pos:") || defectAlias.startsWith("position:")) {
		return toggleStomxPositionAnomalyOnTooth(tooth, defectAlias);
	}

	const defect = findStomxDefectByAlias(defectAlias);
	if (!defect) {
		return tooth;
	}

	// 1. Если кликнули "здоров" (ok) — сброс всех дефектов в Healthy
	if (defect.alias === "ok") {
		return {
			...tooth,
			state: "Healthy",
			stomxDefects: [],
			positionAnomaly: undefined,
			requireTreatment: false,
		};
	}

	// 2. Если это аномалия положения (В, О, Д, М, С, И, Т, Тр, Пр, Рт)
	if (defect.key === "position") {
		const posCode = defect.alias as StomxPositionAnomalyCode;
		const isSame = tooth.positionAnomaly === posCode;
		return {
			...tooth,
			positionAnomaly: isSame ? undefined : posCode,
		};
	}

	// 3. Если это обычный дефект или нозология
	const currentDefects = [...tooth.stomxDefects];
	const existingIndex = currentDefects.indexOf(defect.alias);
	let newDefects: string[];

	if (existingIndex >= 0) {
		// Удаляем дефект
		newDefects = currentDefects.filter((a) => a !== defect.alias);
	} else {
		// Добавляем дефект
		newDefects = [...currentDefects, defect.alias];
	}

	// Определяем новое базовое CRM-состояние
	let newState: ToothState = tooth.state;
	const mappedState = mapStomxDefectToCrmToothState(defect);
	if (mappedState) {
		newState = mappedState;
	} else if (newDefects.length === 0) {
		newState = "Healthy";
	}

	// Проверяем, требуется ли лечение
	const hasTreatmentDefect = newDefects.some((a) => {
		const d = findStomxDefectByAlias(a);
		return d?.require_treatment ?? false;
	});

	return {
		...tooth,
		state: newState,
		stomxDefects: newDefects,
		requireTreatment: hasTreatmentDefect,
	};
}

/**
 * Возвращает визуальные стили для бейджа дефекта StomX.
 */
export function getStomxDefectBadgeProps(defectAlias: string): StomxDefectBadge {
	const defect = findStomxDefectByAlias(defectAlias);
	if (!defect) {
		return {
			alias: defectAlias,
			name: defectAlias,
			color: null,
			category: "pathology",
			requireTreatment: false,
			badgeBg: "bg-slate-500/15 dark:bg-slate-800/40",
			badgeText: "text-slate-700 dark:text-slate-300",
			badgeBorder: "border-slate-400/30",
		};
	}

	switch (defect.color) {
		case "green":
			return {
				alias: defect.alias,
				name: defect.name,
				color: defect.color,
				category: defect.category,
				requireTreatment: defect.require_treatment,
				badgeBg: "bg-emerald-500/15 dark:bg-emerald-950/50",
				badgeText: "text-emerald-700 dark:text-emerald-300",
				badgeBorder: "border-emerald-500/40",
			};
		case "red":
			return {
				alias: defect.alias,
				name: defect.name,
				color: defect.color,
				category: defect.category,
				requireTreatment: defect.require_treatment,
				badgeBg: "bg-rose-500/15 dark:bg-rose-950/50",
				badgeText: "text-rose-700 dark:text-rose-300",
				badgeBorder: "border-rose-500/40",
			};
		case "yellow":
			return {
				alias: defect.alias,
				name: defect.name,
				color: defect.color,
				category: defect.category,
				requireTreatment: defect.require_treatment,
				badgeBg: "bg-amber-500/15 dark:bg-amber-950/50",
				badgeText: "text-amber-800 dark:text-amber-300",
				badgeBorder: "border-amber-500/40",
			};
		case "white":
		default:
			return {
				alias: defect.alias,
				name: defect.name,
				color: defect.color,
				category: defect.category,
				requireTreatment: defect.require_treatment,
				badgeBg: "bg-slate-200 dark:bg-slate-800",
				badgeText: "text-slate-800 dark:text-slate-200",
				badgeBorder: "border-slate-300 dark:border-slate-700",
			};
	}
}

/**
 * Возвращает строковое описание текущих дефектов зуба для карточки или амбулаторной записи.
 */
export function formatToothFormulaSummary(item: ToothFormulaItem): string {
	const parts: string[] = [];

	if (item.state !== "Healthy") {
		parts.push(item.state);
	}

	if (item.positionAnomaly) {
		const pos = findStomxPositionAnomaly(item.positionAnomaly);
		if (pos) {
			parts.push(`Положение: ${pos.name} (${pos.alias})`);
		}
	}

	if (item.stomxDefects.length > 0) {
		const defectNames = item.stomxDefects
			.map((a) => {
				const d = findStomxDefectByAlias(a);
				return d ? `${d.name} [${d.alias}]` : a;
			})
			.join(", ");
		parts.push(defectNames);
	}

	if (item.surfaces && item.surfaces.length > 0) {
		parts.push(`Поверхности: ${item.surfaces.join(", ")}`);
	}

	return parts.length > 0 ? parts.join(" | ") : "Здоров (норма)";
}
