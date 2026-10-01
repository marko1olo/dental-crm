/**
 * VisiographScanHelpers.ts
 *
 * Helper types, state labels, and default sample scans for VisiographAnalyzer.
 */

import { countLabel } from "../../AppHelpers";
import { logger } from "../../utils/logger";

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
	const conclusionMatch = report.match(
		/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i,
	);
	if (conclusionMatch?.[1]) {
		return conclusionMatch[1]
			.replace(/^[-*\s]+/gm, "")
			.trim()
			.substring(0, 400);
	}
	return report.replace(/[*#`]/g, "").substring(0, 200).trim() || null;
}

export function getInitialDefaultScan(toothCode?: string, patientId?: string | null): XrayScan {
	const fallbackTooth = toothCode || "36";
	const fallbackUrl =
		fallbackTooth === "16"
			? "/radiology/sample_rvg_tooth16.jpg"
			: fallbackTooth === "46"
				? "/radiology/sample_rvg_pathology.jpg"
				: "/radiology/sample_rvg_tooth36_periapical.jpg";
	const originalFilename =
		fallbackTooth === "16"
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

export async function saveVisiographScanToServer(
	patientId: string,
	dataUrl: string,
	file: File,
	headers: Record<string, string>,
): Promise<{ saved?: XrayScan; failure?: string }> {
	try {
		const res = await fetch("/api/xray/scans", {
			method: "POST",
			headers,
			body: JSON.stringify({
				patientId,
				imageBase64: dataUrl,
				originalFilename: file.name,
				mimeType: file.type || "image/jpeg",
				kind: "periapical",
				status: "done",
			}),
		});
		if (!res.ok) {
			logger.error(`[VisiographAnalyzer] снимок не сохранён, ответ ${res.status}`);
			return {
				failure:
					res.status === 413
						? "Снимок слишком тяжёлый для базы данных."
						: "Не удалось сохранить снимок в карту пациента на сервере.",
			};
		}
		const saved: XrayScan = await res.json();
		return { saved };
	} catch (saveErr) {
		logger.error("[VisiographAnalyzer] запись снимка в карту не выполнена", saveErr);
		return { failure: "Сервер не ответил на сохранение снимка в карту." };
	}
}

export function updateVisiographScanMeta(
	scanId: string,
	payload: Record<string, unknown>,
	headers: Record<string, string>,
): void {
	if (!scanId || scanId.startsWith("local-")) return;
	fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
		method: "PUT",
		headers,
		body: JSON.stringify(payload),
	}).catch((e) => logger.warn("[VisiographAnalyzer] Background scan update error:", e));
}
