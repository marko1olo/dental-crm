/**
 * VisiographScanHelpers.ts — Типы, метки состояний и хелперы для анализатора визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import { countLabel } from "../../AppHelpers.js";

export {
	saveVisiographScanToServer,
	updateVisiographScanMeta,
} from "./visiographStorageService.js";

export interface XrayScan {
	id: string;
	patientId: string;
	status: "pending" | "analyzing" | "done" | "error";
	kind: string;
	toothCode?: string | null;
	originalFilename?: string | null;
	aiReport?: string | null;
	aiSummary?: string | null;
	aiToothStates?: Record<string, string> | null;
	aiError?: string | null;
	hasImage: boolean;
	imageDataUri?: string | null;
	capturedAt: string;
	createdAt: string;
}

export interface AiToothState {
	code: string;
	state: string;
}

export const STATE_LABELS: Record<string, string> = {
	treatment: "лечение",
	planned: "план",
	watch: "наблюдение",
	done: "вылечен",
	missing: "отсутствует",
};

export function extractSummary(report: string): string | null {
	if (!report) return null;
	const conclusionMatch = report.match(/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i);
	if (conclusionMatch?.[1]) {
		return conclusionMatch[1].replace(/^[-*\s]+/gm, "").trim().substring(0, 400);
	}
	return report.replace(/[*#`]/g, "").substring(0, 200).trim() || null;
}

export function getInitialDefaultScan(toothCode?: string, patientId?: string | null): XrayScan {
	const fallbackTooth = toothCode || "36";
	const fallbackUrl = fallbackTooth === "16"
		? "/radiology/sample_rvg_tooth16.jpg"
		: fallbackTooth === "46"
			? "/radiology/sample_rvg_pathology.jpg"
			: "/radiology/sample_rvg_tooth36_periapical.jpg";
	const originalFilename = fallbackTooth === "16"
		? "sample_rvg_tooth16.jpg"
		: fallbackTooth === "46"
			? "sample_rvg_pathology.jpg"
			: "sample_rvg_tooth36_periapical.jpg";

	return {
		id: `sample_periapical_${fallbackTooth}`,
		patientId: patientId || "active_patient",
		status: "done",
		kind: "periapical",
		toothCode: fallbackTooth,
		originalFilename,
		aiReport: `### Топография\nОбласть зуба ${fallbackTooth}. Визуализируются анатомическая коронка, корневые каналы и периодонтальная щель.\n\n### Патологии\nКариозная полость в пределах дентина (K02.1).\n\n### Анатомия\nКостная ткань межзубных перегородок без признаков остеолиза, кортикальная пластинка альвеолы сохранена.\n\n### Заключение\nРекомендовано препарирование кариозной полости, пломбирование зуба ${fallbackTooth}.`,
		aiSummary: `Область зуба ${fallbackTooth}: кариозное поражение дентина K02.1, периодонт интактен.`,
		aiToothStates: { [fallbackTooth]: "Caries" },
		hasImage: true,
		imageDataUri: fallbackUrl,
		capturedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
	};
}

export function buildFindingsNotice(plan: {
	readonly unreadableCodes: readonly string[];
	readonly noFormulaStateCodes: readonly string[];
}): string | null {
	const notices: string[] = [];
	if (plan.unreadableCodes.length > 0) {
		notices.push(
			`Помощник описал непонятно ${countLabel(plan.unreadableCodes.length, "зуб", "зуба", "зубов")} (${plan.unreadableCodes.join(", ")}). В формулу не внесены.`,
		);
	}
	if (plan.noFormulaStateCodes.length > 0) {
		notices.push(
			`Для ${countLabel(plan.noFormulaStateCodes.length, "зуба", "зубов", "зубов")} (${plan.noFormulaStateCodes.join(", ")}) в формуле нет подходящего состояния.`,
		);
	}
	return notices.length > 0 ? notices.join(" ") : null;
}
