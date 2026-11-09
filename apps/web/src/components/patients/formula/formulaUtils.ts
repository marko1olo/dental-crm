/**
 * apps/web/src/components/patients/formula/formulaUtils.ts
 *
 * Чистые расчетные функции одонтограммы (Мандаты 8e, 8b)
 */

import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import type { DentitionMode, KpuStats } from "./formulaTypes";
import { ALL_PERMANENT_TEETH, ALL_DECIDUOUS_TEETH } from "./formulaConstants";

export function getInitialDentitionMode(patientAge: number | null): DentitionMode {
	if (patientAge === null) return "adult";
	return patientAge < 6 ? "pediatric" : patientAge < 12 ? "mixed" : "adult";
}

export function getBaselineTeeth(dentitionMode: DentitionMode): ToothData[] {
	const targetNumbers = dentitionMode === "pediatric"
		? ALL_DECIDUOUS_TEETH
		: dentitionMode === "mixed"
		? [...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH]
		: ALL_PERMANENT_TEETH;
	return targetNumbers.map((num) => ({ toothNumber: num, state: "Healthy" as ToothState }));
}

export function calculateKpuStats(teethData: readonly ToothData[]): KpuStats {
	let c = 0, p = 0, u = 0;
	let primaryC = 0, primaryP = 0;
	let hasPermanent = false;
	let hasPrimary = false;

	for (const t of teethData) {
		const isPrimary = t.toothNumber >= 51 && t.toothNumber <= 85;
		if (isPrimary) {
			hasPrimary = true;
			if (t.state === "Caries" || t.state === "Pulpitis" || t.state === "Periodontitis") {
				c++;
				primaryC++;
			} else if (t.state === "Filled") {
				p++;
				primaryP++;
			}
			// Физиологическая смена/выпадение молочных зубов ("Missing"/"Root") не приписывается к 1У
		} else {
			hasPermanent = true;
			if (t.state === "Caries" || t.state === "Pulpitis" || t.state === "Periodontitis") {
				c++;
			} else if (t.state === "Filled") {
				p++;
			} else if (t.state === "Missing" || t.state === "Root") {
				u++;
			}
		}
	}

	const isPediatricOnly = hasPrimary && !hasPermanent;
	const isMixed = hasPrimary && hasPermanent;
	const primaryTotal = primaryC + primaryP;

	return {
		c,
		p,
		u,
		total: isPediatricOnly ? primaryTotal : c + p + u,
		primaryC,
		primaryP,
		primaryTotal,
		isPediatricOnly,
		isMixed,
	};
}

export function mergeServerTeeth(prev: readonly ToothData[], server: readonly ToothData[]): ToothData[] {
	const merged = [...prev];
	for (const s of server) {
		const idx = merged.findIndex((m) => m.toothNumber === s.toothNumber);
		if (idx >= 0) merged[idx] = { ...merged[idx], ...s };
		else merged.push(s);
	}
	return merged;
}

export function buildUpdatedTeethData(
	current: readonly ToothData[],
	targets: readonly number[],
	nextState: ToothState,
	nextSurfaces: readonly string[] | undefined,
	nowIso: string,
): ToothData[] {
	const updated: ToothData[] = current.map((item) => {
		if (!targets.includes(item.toothNumber)) return item;
		return {
			...item,
			state: nextState,
			updatedAt: nowIso,
			surfaces: nextSurfaces && nextSurfaces.length > 0 ? [...nextSurfaces] : undefined,
		};
	});

	for (const num of targets) {
		if (!updated.some((u) => u.toothNumber === num)) {
			updated.push({
				toothNumber: num,
				state: nextState,
				surfaces: nextSurfaces && nextSurfaces.length > 0 ? [...nextSurfaces] : [],
				updatedAt: nowIso,
			});
		}
	}
	return updated;
}
