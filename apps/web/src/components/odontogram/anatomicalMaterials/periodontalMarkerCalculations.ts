/**
 * DENTE Dental CRM — Periodontal Markers Calculations
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { isMaxillaryArch } from "@dental/shared";
import type {
	FurcationGrade,
	FurcationMarkerSvg,
	PeriodontalBoneLossPattern,
} from "../anatomicalGeometriesTypes";

export function getPeriodontalBoneLevelPath(
	fdiNumber: number,
	boneLossPercent: number,
	pattern: PeriodontalBoneLossPattern = "horizontal",
): { readonly boneLine: string; readonly resorptionArea: string } {
	if (boneLossPercent <= 0 || pattern === "none") {
		return { boneLine: "", resorptionArea: "" };
	}
	const isTop = isMaxillaryArch(fdiNumber);
	const clampedLoss = Math.max(0, Math.min(100, boneLossPercent));
	const factor = clampedLoss / 100;

	if (isTop) {
		const baseY = 96 - factor * 68;
		if (pattern === "vertical") {
			return {
				boneLine: `M 14 ${baseY + 12} L 36 ${baseY} L 64 ${baseY - 10} L 86 ${baseY + 6}`,
				resorptionArea: `M 14 96 L 14 ${baseY + 12} L 36 ${baseY} L 64 ${baseY - 10} L 86 ${baseY + 6} L 86 96 Z`,
			};
		}
		return {
			boneLine: `M 14 ${baseY} Q 50 ${baseY - 4} 86 ${baseY}`,
			resorptionArea: `M 14 96 L 14 ${baseY} Q 50 ${baseY - 4} 86 ${baseY} L 86 96 Z`,
		};
	}
	const baseY = 64 + factor * 68;
	if (pattern === "vertical") {
		return {
			boneLine: `M 14 ${baseY - 12} L 36 ${baseY} L 64 ${baseY + 10} L 86 ${baseY - 6}`,
			resorptionArea: `M 14 64 L 14 ${baseY - 12} L 36 ${baseY} L 64 ${baseY + 10} L 86 ${baseY - 6} L 86 64 Z`,
		};
	}
	return {
		boneLine: `M 14 ${baseY} Q 50 ${baseY + 4} 86 ${baseY}`,
		resorptionArea: `M 14 64 L 14 ${baseY} Q 50 ${baseY + 4} 86 ${baseY} L 86 64 Z`,
	};
}

export function getGingivalRecessionPath(fdiNumber: number, recessionMm: number): string {
	if (recessionMm <= 0) return "";
	const isTop = isMaxillaryArch(fdiNumber);
	const offset = Math.min(26, Math.max(0, recessionMm * 3.2));
	if (isTop) {
		const y = 96 - offset;
		return `M 16 ${y + 3} Q 50 ${y - 4} 84 ${y + 3}`;
	}
	const y = 64 + offset;
	return `M 16 ${y - 3} Q 50 ${y + 4} 84 ${y - 3}`;
}

export function getFurcationMarkerSvg(
	grade: FurcationGrade,
	x: number,
	y: number,
	isTop: boolean,
	size = 7,
): FurcationMarkerSvg | null {
	if (grade <= 0) return null;
	const tipY = isTop ? y - size : y + size;
	const baseY = isTop ? y + size * 0.5 : y - size * 0.5;
	const leftX = x - size * 0.9;
	const rightX = x + size * 0.9;

	switch (grade) {
		case 1:
			return { path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY}`, fill: "none", stroke: "#f59e0b", strokeWidth: 1.8, labelRu: "Фуркация I ст. (начальная, зонд < 3 мм)" };
		case 2:
			return { path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`, fill: "rgba(245, 158, 11, 0.25)", stroke: "#f59e0b", strokeWidth: 2, labelRu: "Фуркация II ст. (частичная/тупиковая, зонд > 3 мм)" };
		case 3:
			return { path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`, fill: "#ef4444", stroke: "#991b1b", strokeWidth: 2, labelRu: "Фуркация III ст. (сквозной дефект бифуркации)" };
		case 4:
			return { path: `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: 2.2, labelRu: "Фуркация IV ст. (сквозная с обнажением рецессией)" };
		default:
			return null;
	}
}
