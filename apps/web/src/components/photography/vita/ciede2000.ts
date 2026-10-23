/**
 * CIEDE2000 & CIE76 Color Difference Formulas
 */

import { ColorLab, VitaShade, ShadeDeltaResult } from './types';
import { VITA_CLASSICAL_SHADES } from './vitaClassical';
import { getVitaShadeByCode } from './normalize';

const degToRad = (deg: number): number => (deg * Math.PI) / 180;
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export function colorDistanceDeltaE76(lab1: ColorLab, lab2: ColorLab): number {
	const dL = lab1.L - lab2.L, da = lab1.a - lab2.a, db = lab1.b - lab2.b;
	return Math.sqrt(dL * dL + da * da + db * db);
}

export function colorDistanceDeltaE2000(lab1: ColorLab, lab2: ColorLab): number {
	const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
	const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;
	const avgL = (L1 + L2) / 2;
	const C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2);
	const avgC = (C1 + C2) / 2;
	const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
	const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
	const C1p = Math.sqrt(a1p * a1p + b1 * b1), C2p = Math.sqrt(a2p * a2p + b2 * b2);
	const avgCp = (C1p + C2p) / 2;

	let h1p = Math.atan2(b1, a1p);
	if (h1p < 0) h1p += 2 * Math.PI;
	let h2p = Math.atan2(b2, a2p);
	if (h2p < 0) h2p += 2 * Math.PI;

	let dhp = Math.abs(h1p - h2p) <= Math.PI ? h2p - h1p : h2p <= h1p ? h2p - h1p + 2 * Math.PI : h2p - h1p - 2 * Math.PI;
	const dLp = L2 - L1, dCp = C2p - C1p;
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2);

	let avghp = (h1p + h2p) / 2;
	if (Math.abs(h1p - h2p) > Math.PI) avghp += h1p + h2p < 2 * Math.PI ? Math.PI : -Math.PI;

	const T = 1 - 0.17 * Math.cos(avghp - degToRad(30)) + 0.24 * Math.cos(2 * avghp) + 0.32 * Math.cos(3 * avghp + degToRad(6)) - 0.20 * Math.cos(4 * avghp - degToRad(63));
	const dTheta = degToRad(30) * Math.exp(-Math.pow((radToDeg(avghp) - 275) / 25, 2));
	const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
	const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
	const SC = 1 + 0.045 * avgCp, SH = 1 + 0.015 * avgCp * T;
	const RT = -Math.sin(2 * dTheta) * RC;

	const deltaE = Math.sqrt(Math.max(0, Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH)));
	return Number.isFinite(deltaE) ? deltaE : 0;
}

export function calculateShadeDelta(
	beforeInput: VitaShade | string | null | undefined,
	afterInput: VitaShade | string | null | undefined,
): ShadeDeltaResult {
	const defaultBefore = VITA_CLASSICAL_SHADES[8]!; // A2 default
	const defaultAfter = VITA_CLASSICAL_SHADES[4]!; // B1 default

	let before = defaultBefore;
	if (beforeInput) {
		if (typeof beforeInput === 'string') before = getVitaShadeByCode(beforeInput) || defaultBefore;
		else if (typeof beforeInput === 'object' && beforeInput.lab && Number.isFinite(beforeInput.lab.L)) before = beforeInput;
	}

	let after = defaultAfter;
	if (afterInput) {
		if (typeof afterInput === 'string') after = getVitaShadeByCode(afterInput) || defaultAfter;
		else if (typeof afterInput === 'object' && afterInput.lab && Number.isFinite(afterInput.lab.L)) after = afterInput;
	}

	const rawDeltaE00 = colorDistanceDeltaE2000(before.lab, after.lab);
	const deltaE00 = Number.isFinite(rawDeltaE00) ? Math.round(rawDeltaE00 * 100) / 100 : 0;
	const rawDeltaE76 = colorDistanceDeltaE76(before.lab, after.lab);
	const deltaE76 = Number.isFinite(rawDeltaE76) ? Math.round(rawDeltaE76 * 100) / 100 : 0;
	const rawDeltaL = after.lab.L - before.lab.L;
	const deltaL = Number.isFinite(rawDeltaL) ? Math.round(rawDeltaL * 10) / 10 : 0;

	const cBefore = Math.sqrt(Math.max(0, before.lab.a * before.lab.a + before.lab.b * before.lab.b));
	const cAfter = Math.sqrt(Math.max(0, after.lab.a * after.lab.a + after.lab.b * after.lab.b));
	const deltaC = Number.isFinite(cAfter - cBefore) ? Math.round((cAfter - cBefore) * 10) / 10 : 0;

	let hBefore = radToDeg(Math.atan2(before.lab.b, before.lab.a));
	if (hBefore < 0) hBefore += 360;
	let hAfter = radToDeg(Math.atan2(after.lab.b, after.lab.a));
	if (hAfter < 0) hAfter += 360;
	let rawDeltaH = hAfter - hBefore;
	if (rawDeltaH > 180) rawDeltaH -= 360;
	if (rawDeltaH < -180) rawDeltaH += 360;
	const deltaH = Number.isFinite(rawDeltaH) ? Math.round(rawDeltaH * 10) / 10 : 0;

	const stepDelta = (before.valueRanking || 0) - (after.valueRanking || 0);
	const lightnessImprovementRu = deltaL > 0.5 ? `Осветление на +${deltaL} ед. L* (динамика: ${Math.abs(stepDelta)} ст. шкалы)` : deltaL < -0.5 ? `Потемнение на ${deltaL} ед. L*` : 'Без изменений светлоты';
	const chromaChangeRu = deltaC < -0.5 ? `Снижение желтизны/насыщенности на ${deltaC} ед. C*` : deltaC > 0.5 ? `Повышение насыщенности на +${deltaC} ед. C*` : 'Насыщенность стабильна';

	let clinicalSummaryRu = `ΔE₀₀ = ${deltaE00.toFixed(1)} (${before.code} -> ${after.code})`;
	if (stepDelta > 0) clinicalSummaryRu += ` • Эффект отбеливания: +${stepDelta} ступ.`;
	else if (stepDelta < 0) clinicalSummaryRu += ` • Сдвиг в темную зону: ${stepDelta} ступ.`;
	else clinicalSummaryRu += ` • Коррекция цветового тона`;

	return {
		beforeShade: before, afterShade: after, deltaE00, deltaE76, deltaL, deltaC, deltaH,
		isLighter: deltaL > 0, isNoticeable: deltaE00 >= 1.2, stepDelta, lightnessImprovementRu, chromaChangeRu, clinicalSummaryRu,
	};
}
