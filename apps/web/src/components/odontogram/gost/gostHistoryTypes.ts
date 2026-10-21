/**
 * apps/web/src/components/odontogram/gost/gostHistoryTypes.ts
 *
 * DENTE Dental CRM — DMFT (КПУ/кпу) Clinical Indices and Clinical Record Export.
 */

import {
	ALL_ADULT_TEETH,
	ALL_PEDIATRIC_TEETH,
	LOWER_TEETH_ADULT,
	LOWER_TEETH_PEDIATRIC,
	UPPER_TEETH_ADULT,
	UPPER_TEETH_PEDIATRIC,
	getGostAbbreviation,
} from "@dental/shared";
import type { ToothData, ToothState } from "../chart/toothChartTypes";

export interface DmftCalculationResult {
	dmftTotal: number;
	decayed: number;
	filled: number;
	missing: number;
	healthy: number;
	implants: number;
	severity: "very_low" | "low" | "moderate" | "high" | "very_high";
	severityLabel: string;
	pediatricKpu: {
		k: number;
		p: number;
		u: number;
		total: number;
	};
}

export function calculateDmft(teethData: readonly ToothData[]): DmftCalculationResult {
	const map = new Map<number, ToothState>();
	for (const t of teethData) {
		map.set(t.toothNumber, t.state);
	}

	let decayed = 0;
	let filled = 0;
	let missing = 0;
	let implants = 0;

	for (const num of ALL_ADULT_TEETH) {
		const state = map.get(num) ?? "Healthy";
		if (
			state === "Caries" ||
			state === "Pulpitis" ||
			state === "Periodontitis" ||
			state === "Root"
		) {
			decayed++;
		} else if (state === "Filled" || state === "Crown") {
			filled++;
		} else if (state === "Missing") {
			missing++;
		} else if (state === "Implant" || state === "Planned_Implant") {
			implants++;
		}
	}

	const healthy = 32 - (decayed + filled + missing + implants);
	const dmftTotal = decayed + filled + missing;

	let severity: DmftCalculationResult["severity"] = "very_low";
	let severityLabel = "Очень низкий (0–1.5)";

	if (dmftTotal <= 1.5) {
		severity = "very_low";
		severityLabel = "Очень низкий (0–1.5)";
	} else if (dmftTotal <= 3.0) {
		severity = "low";
		severityLabel = "Низкий (1.6–3.0)";
	} else if (dmftTotal <= 6.2) {
		severity = "moderate";
		severityLabel = "Средний (3.1–6.2)";
	} else if (dmftTotal <= 12.7) {
		severity = "high";
		severityLabel = "Высокий (6.3–12.7)";
	} else {
		severity = "very_high";
		severityLabel = "Очень высокий (> 12.7)";
	}

	// Pediatric calculation
	let pedK = 0;
	let pedP = 0;
	let pedU = 0;

	for (const num of ALL_PEDIATRIC_TEETH) {
		const state = map.get(num) ?? "Healthy";
		if (
			state === "Caries" ||
			state === "Pulpitis" ||
			state === "Periodontitis" ||
			state === "Root"
		) {
			pedK++;
		} else if (state === "Filled" || state === "Crown") {
			pedP++;
		} else if (state === "Missing") {
			pedU++;
		}
	}

	return {
		dmftTotal,
		decayed,
		filled,
		missing,
		healthy,
		implants,
		severity,
		severityLabel,
		pediatricKpu: {
			k: pedK,
			p: pedP,
			u: pedU,
			total: pedK + pedP + pedU,
		},
	};
}

/**
 * Экспорт истории одонтограммы в структурированный текстовый протокол визита / дневник приёма.
 */
export function formatOdontogramToClinicalProtocolText(
	teethData: readonly ToothData[],
	pediatricMode = false,
): string {
	const map = new Map<number, ToothData>();
	for (const t of teethData) {
		map.set(t.toothNumber, t);
	}

	const formatToothStr = (num: number) => {
		const t = map.get(num);
		const abbr = getGostAbbreviation(t?.state);
		const surfs =
			t?.surfaces && t.surfaces.length > 0 ? `(${t.surfaces.join("")})` : "";
		return `${num}:${abbr}${surfs}`;
	};

	const dmft = calculateDmft(teethData);

	if (pediatricMode) {
		const topPed = UPPER_TEETH_PEDIATRIC.map(formatToothStr).join(" ");
		const bottomPed = LOWER_TEETH_PEDIATRIC.map(formatToothStr).join(" ");
		return [
			"Зубная формула (молочный прикус):",
			`Верх: ${topPed}`,
			`Низ:  ${bottomPed}`,
			`Индекс кпу = ${dmft.pediatricKpu.total} (к:${dmft.pediatricKpu.k}, п:${dmft.pediatricKpu.p}, у:${dmft.pediatricKpu.u})`,
		].join("\n");
	}

	const topQ1 = UPPER_TEETH_ADULT.slice(0, 8).map(formatToothStr).join(" ");
	const topQ2 = UPPER_TEETH_ADULT.slice(8, 16).map(formatToothStr).join(" ");
	const bottomQ4 = LOWER_TEETH_ADULT.slice(0, 8).map(formatToothStr).join(" ");
	const bottomQ3 = LOWER_TEETH_ADULT.slice(8, 16).map(formatToothStr).join(" ");

	return [
		"Зубная формула (постоянный прикус):",
		`Верхняя челюсть: ${topQ1} | ${topQ2}`,
		`Нижняя челюсть:  ${bottomQ4} | ${bottomQ3}`,
		`Индекс КПУ = ${dmft.dmftTotal} (К:${dmft.decayed}, П:${dmft.filled}, У:${dmft.missing}) — ${dmft.severityLabel}`,
	].join("\n");
}

export const formatOdontogramTo043ProtocolText = formatOdontogramToClinicalProtocolText;
