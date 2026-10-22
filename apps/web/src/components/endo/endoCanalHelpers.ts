import React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	type EndoStageStamp,
	getAnatomicalWorkingLength,
} from "./endoCanalConstants";

/**
 * Валидация и санитизация корневых каналов перед сохранением / вставкой в протокол дневника визита.
 * Обеспечивает округление длин до 0.5 мм (Мандат 8b) и исключает NaN/undefined.
 * Запрет на блокировки врача (Мандат 8e): если поле не заполнено, подставляется анатомическая норма.
 */
export function sanitizeCanalsForSubmission(
	inputCanals: EndoCanalData[],
	activeTooth: number,
	stageStamp: EndoStageStamp,
): EndoCanalData[] {
	return inputCanals.map((c) => {
		let safeWl: number | string = c.workingLengthMm;
		if (c.isObliterated) {
			safeWl = 0;
		} else if (typeof safeWl === "number") {
			if (Number.isNaN(safeWl) || !Number.isFinite(safeWl) || safeWl <= 0) {
				safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
			} else {
				safeWl = Math.round(safeWl * 2) / 2;
			}
		} else if (typeof safeWl === "string" && safeWl.trim()) {
			const parsed = Number.parseFloat(safeWl);
			if (!Number.isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
				safeWl = Math.round(parsed * 2) / 2;
			} else {
				safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
			}
		} else {
			safeWl = getAnatomicalWorkingLength(activeTooth, c.canalName);
		}

		return {
			...c,
			isObliterated: Boolean(c.isObliterated),
			workingLengthMm: safeWl,
			masterApicalFile: c.masterApicalFile || "ProTaper F2 (#25)",
			taper: c.taper || ".06 (Конусность 6%)",
			referencePoint: c.referencePoint || "Бугор зуба",
			obturationTechnique:
				c.obturationTechnique ||
				(stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2 (Каласепт)"
					: "Гуттаперча + Силер (AH Plus) латерально"),
		};
	});
}

/**
 * Чистый клинический индикатор калибра инструмента без процедурной симуляции цветов пластиковых ручек (Мандат 8k).
 * Тотальный снос академического симулятора цветов ISO 60: возвращает строгий лаконичный маркер.
 */
export function renderIsoColorBadge(_fileVal: string | undefined): React.ReactNode {
	return null;
}

