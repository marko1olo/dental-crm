import React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	type EndoStageStamp,
	getAnatomicalWorkingLength,
	getIsoEndoColorInfo,
} from "./endoCanalConstants";

/**
 * Валидация и санитизация корневых каналов перед сохранением / вставкой в протокол 043/у.
 * Обеспечивает округление длин до 0.5 мм (Мандат 8b) и исключает NaN/undefined.
 */
export function sanitizeCanalsForSubmission(
	inputCanals: EndoCanalData[],
	activeTooth: number,
	stageStamp: EndoStageStamp,
): EndoCanalData[] {
	return inputCanals.map((c) => {
		let safeWl: number | string = c.workingLengthMm;
		if (typeof safeWl === "number") {
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
			workingLengthMm: safeWl,
			masterApicalFile: c.masterApicalFile || "ISO 25 (#25 красный)",
			taper: c.taper || ".06 (Конусность 6%)",
			referencePoint: c.referencePoint || "Реперный ориентир",
			obturationTechnique:
				c.obturationTechnique ||
				(stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2 (Metapex / Calcept)"
					: "Гуттаперча + Силер (AH Plus)"),
		};
	});
}

/**
 * ISO 3630-1 цветной индикатор калибра инструмента
 */
export function renderIsoColorBadge(fileVal: string | undefined): React.ReactNode {
	const isoColor = getIsoEndoColorInfo(fileVal);
	const hex = isoColor?.hex || "#94a3b8";
	const isWhite =
		isoColor?.size === 15 || isoColor?.size === 45 || isoColor?.size === 90;
	const isBlack =
		isoColor?.size === 40 || isoColor?.size === 80 || isoColor?.size === 140;

	return React.createElement(
		"span",
		{
			className:
				"inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 rounded-full border shadow-xs transition-transform",
			style: {
				backgroundColor: hex,
				borderColor: isWhite
					? "#94a3b8"
					: isBlack
						? "#64748b"
						: "rgba(0,0,0,0.25)",
				boxShadow: isBlack ? "0 0 0 1px rgba(255,255,255,0.3)" : undefined,
			},
			title: isoColor
				? `${isoColor.labelRu} (${isoColor.colorRu})`
				: "ISO цвет инструмента",
		},
		isWhite
			? React.createElement("span", {
					className: "w-1.5 h-1.5 rounded-full bg-slate-400",
				})
			: null,
	);
}
