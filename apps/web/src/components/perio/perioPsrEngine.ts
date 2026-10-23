/**
 * perioPsrEngine.ts — Расчет и применение индексов ВОЗ/PSR, степеней пародонтита и протоколов.
 * Архитектурный слой Layer 2: Pure Engine (Мандат 8b, <= 120 строк).
 */

import {
	calculateClinicalAttachmentLevel,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioToothRecord,
	PSR_SEXTANTS,
	type PsrSextantResult,
} from "@dental/shared";
import { PERIO_EXPRESS_PRESETS } from "./perioMathPresets";
import type { PerioExpressPresetId, PsrCode } from "./perioMathTypes";

const makePerioSite = (depth: number, gm: number, bop: boolean, calc: boolean, plq = true, pus = false) => ({
	probingDepthMm: depth,
	gingivalMarginMm: gm,
	bleedingOnProbing: bop,
	suppuration: pus,
	plaque: plq,
	calculus: calc,
	calMm: calculateClinicalAttachmentLevel(depth, gm),
});

export function applyPeriodontitisMildPreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const isTarget = [16, 17, 26, 27, 36, 37, 46, 47, 31, 32, 41, 42].includes(t.toothNumber);
		const s = makePerioSite(isTarget ? 4 : 3, 0, true, true);
		return {
			...t, mobility: [31, 32, 41, 42].includes(t.toothNumber) ? 1 : 0, furcation: 0,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPeriodontitisModeratePreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const s = makePerioSite(isMolar ? 5 : 4, 1, true, true);
		return {
			...t, mobility: [31, 32, 41, 42].includes(num) ? 1 : 0,
			furcation: (isMolar && isFurcationEligibleTooth(num) ? 1 : 0) as 0 | 1 | 2 | 3 | 4,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPeriodontitisSeverePreset(teeth: readonly PerioToothRecord[]): PerioToothRecord[] {
	return teeth.map((t) => {
		if (t.isMissing) return { ...t };
		const num = t.toothNumber;
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const isLowerAnt = [31, 32, 41, 42].includes(num);
		const s = makePerioSite(isMolar ? 7 : isLowerAnt ? 6 : 5, 2, true, true, true, isMolar || isLowerAnt);
		return {
			...t, mobility: (isLowerAnt || isMolar ? 2 : 1) as 0 | 1 | 2 | 3,
			furcation: (isMolar && isFurcationEligibleTooth(num) ? 2 : 0) as 0 | 1 | 2 | 3 | 4,
			distoBuccal: s, midBuccal: s, mesioBuccal: s, distoLingual: s, midLingual: s, mesioLingual: s,
		};
	});
}

export function applyPsrSextantCode(
	teeth: readonly PerioToothRecord[], sextantName: string, code: PsrCode, asterisk = false,
): PerioToothRecord[] {
	const sextant = PSR_SEXTANTS.find((s) => s.name === sextantName);
	if (!sextant) return [...teeth];
	const targetTeethSet = new Set<number>(sextant.teeth);
	const depth = code === 0 ? 2 : code <= 2 ? 3 : code === 3 ? 5 : 7;
	const bop = code > 0;
	const calculus = code >= 2;

	return teeth.map((tooth) => {
		if (!targetTeethSet.has(tooth.toothNumber) || tooth.isMissing) return tooth;
		const updated = {
			...tooth,
			mobility: asterisk ? (2 as const) : tooth.mobility,
			furcation: asterisk && isFurcationEligibleTooth(tooth.toothNumber) ? (1 as const) : tooth.furcation,
		};
		for (const key of PERIO_SITE_KEYS) {
			const gm = tooth[key]?.gingivalMarginMm ?? 0;
			updated[key] = {
				probingDepthMm: depth, gingivalMarginMm: gm, bleedingOnProbing: bop,
				suppuration: code === 4, plaque: code > 0, calculus,
				calMm: calculateClinicalAttachmentLevel(depth, gm),
			};
		}
		return updated;
	});
}

export function generatePsrDiaryProtocol(
	presetId: PerioExpressPresetId | "custom", customPsrSummary?: string, customNotes?: string,
): string {
	let text = presetId in PERIO_EXPRESS_PRESETS
		? PERIO_EXPRESS_PRESETS[presetId as PerioExpressPresetId].defaultProtocolRu
		: `Пародонт: обследование по 6 секстантам PSR.\n${customPsrSummary ? `Скрининг PSR (ВОЗ): ${customPsrSummary}.` : ""}\nПародонтальный статус зафиксирован.`;
	if (customNotes?.trim()) text += `\nОсобые отметки: ${customNotes.trim()}`;
	return text;
}

export function getPsrMaxCode(psr: Record<string, PsrSextantResult>): PsrCode {
	let maxCode: PsrCode = 0;
	for (const key of Object.keys(psr)) {
		const item = psr[key];
		if (item && item.code > maxCode) maxCode = item.code;
	}
	return maxCode;
}

export function hasPsrAsterisk(psr: Record<string, PsrSextantResult>): boolean {
	return Object.values(psr).some((item) => Boolean(item?.asterisk));
}
