/**
 * visiographChartBridge.ts — Мост между визиографом и медицинской картой / зубной формулой
 * Mandate 8b: строго <= 120 строк.
 */

import { useVisitStore } from "../../../store/visitStore.js";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import { updateVisiographScanMeta } from "../VisiographScanHelpers.js";

export { writeToothStatesToChart } from "./visiographToothStateWriter.js";

export interface ApplyNormaOptions {
	readonly targetToothCode: string | null;
	readonly currentScanId?: string | undefined;
	readonly effectivePatientId?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly mutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

export function applyNormaTo043({
	targetToothCode,
	currentScanId,
	effectivePatientId,
	onInsertToProtocol,
	mutationHeaders,
}: ApplyNormaOptions): void {
	const toothPrefix = targetToothCode ? ` зуба ${targetToothCode}` : "";
	const normaStatement = `Рентгенологическое исследование (визиография)${toothPrefix}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const current = prev.objectiveStatus || "";
			const updated = current.trim() ? `${current.trim()}\n${normaStatement}` : normaStatement;
			return { ...prev, objectiveStatus: updated };
		});

		const targetToothNum = Number(targetToothCode);
		if (targetToothNum && !Number.isNaN(targetToothNum)) {
			const codeStr = String(targetToothNum);
			const rec = useVisitStore.getState().visitToothRecordsByCode[codeStr];
			useVisitStore.getState().setVisitToothRecord(codeStr, {
				treatmentPlan: rec?.treatmentPlan ? `${rec.treatmentPlan}\n${normaStatement}` : normaStatement,
			});
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					finding: targetToothNum ? { toothNumber: targetToothNum } : undefined,
					objectiveStatus: normaStatement,
					statusLocalis: normaStatement,
					immediate: true,
				},
			}));
		}
	} catch (err) {
		logger.warn("[VisiographAnalyzer] visitStore update failed", err);
	}

	if (onInsertToProtocol) onInsertToProtocol(normaStatement);
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(normaStatement).catch(() => {});
	}

	showToast(`Заключение «Норма: патологии на снимке не выявлено» внесено в медицинскую карту${toothPrefix ? ` (${toothPrefix.trim()})` : ""}`, "success");

	if (currentScanId && effectivePatientId) {
		updateVisiographScanMeta(
			currentScanId,
			{ aiSummary: "Норма: патологии на снимке не выявлено", notes: normaStatement },
			mutationHeaders({ "Content-Type": "application/json" }),
		);
	}
}

export interface InsertReportOptions {
	readonly reportText: string;
	readonly targetToothCode: string | null;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export function insertReportTo043Protocol({
	reportText,
	targetToothCode,
	onInsertToProtocol,
}: InsertReportOptions): void {
	if (!reportText) return;
	const toothPrefix = targetToothCode ? ` (зуб ${targetToothCode})` : "";
	const statement = `Рентгенологическое заключение${toothPrefix}:\n${reportText}`;

	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const current = prev.objectiveStatus || "";
			const updated = current.trim() ? `${current.trim()}\n${statement}` : statement;
			return { ...prev, objectiveStatus: updated };
		});

		const targetToothNum = Number(targetToothCode);
		if (targetToothNum && !Number.isNaN(targetToothNum)) {
			const codeStr = String(targetToothNum);
			const existingRec = useVisitStore.getState().visitToothRecordsByCode[codeStr];
			useVisitStore.getState().setVisitToothRecord(codeStr, {
				diagnosis: existingRec?.diagnosis ? `${existingRec.diagnosis}\n${reportText}` : reportText,
			});
		}
	} catch (err) {
		logger.warn("[VisiographAnalyzer] visitStore update failed", err);
	}

	if (onInsertToProtocol) onInsertToProtocol(statement);
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(statement).catch(() => {});
	}
	showToast(`Заключение лучевой диагностики внесено в медицинскую карту${toothPrefix ? ` (${toothPrefix.trim()})` : ""}`, "success");
}

export const applyNormaToMedicalRecord = applyNormaTo043;
export const insertReportToMedicalProtocol = insertReportTo043Protocol;
