/**
 * DENTE CRM — Radiology Consultation Split Pure Utilities (Layer 1)
 * Directed Acyclic Graph (DAG): Layer 1 (Pure utility functions, 0 side effects)
 */

import type { BoneDimensionPoint } from "../cbctComparisonMath.js";

/**
 * Formats date/time for consultation history or notes
 */
export function formatConsultationTimestamp(dateOrIso?: string | Date | number): string {
	if (!dateOrIso) {
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	}
	const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
	if (Number.isNaN(d.getTime())) return "12:00";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Resolves patient gender from explicit prop or name heuristics
 */
export function resolvePatientGender(patientGender?: string, patientName?: string): string {
	if (patientGender) return patientGender;
	if (!patientName) return "Пациент";
	const clean = patientName.trim();
	if (
		clean.includes("Роман") ||
		clean.includes("Александр") ||
		clean.includes("Иван") ||
		clean.endsWith("ич") ||
		clean.endsWith("ов") ||
		clean.endsWith("ев") ||
		clean.endsWith("ин")
	) {
		return "Муж.";
	}
	return "Жен.";
}

/**
 * Constructs Form 043/u clinical protocol text for the consultation
 */
export function buildForm043ConsultationStatement(options: {
	readonly isAtlas: boolean;
	readonly targetTooth?: string | number | undefined;
	readonly leftTitle: string;
	readonly leftSubtitle: string;
	readonly rightTitle: string;
	readonly rightSubtitle: string;
}): string {
	const { isAtlas, targetTooth, leftTitle, leftSubtitle, rightTitle, rightSubtitle } = options;
	const toothDesc = targetTooth ? `зуба №${targetTooth} ` : "";

	if (isAtlas) {
		return `Проведена клиническая консультация (Атлас патологий DENTE): сопоставлены рентгенограмма пациента и анатомический эталон («${rightTitle}»). Пациенту наглядно продемонстрированы анатомические ориентиры, обоснован план комплексной санации и согласован протокол лечения.`;
	}

	return `Проведена клиническая консультация (Сплит-сопоставление «До / После»): сопоставлены снимок ${toothDesc}до начала лечения («${leftTitle}», ${leftSubtitle}) и контрольный снимок после лечения («${rightTitle}», ${rightSubtitle}). Пациенту наглядно продемонстрирован результат лечения, согласован протокол реабилитации.`;
}

/**
 * Formats bone measurement metrics for clinical display
 */
export function formatBoneDimensionText(point: BoneDimensionPoint): string {
	return `H: ${point.heightMm.toFixed(1)} мм | W: ${point.widthMm.toFixed(1)} мм | ${point.densityHU} HU`;
}
