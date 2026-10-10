import { countLabel } from "../../AppHelpers.js";
import { actionFailureToast } from "../../lib/panelStateText.js";
import { useVisitStore } from "../../store/visitStore.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import { TOOTH_STATE_LABELS, type ToothState } from "../odontogram/ToothChart.js";
import { updateVisiographScanMeta } from "../VisiographScanHelpers.js";

export async function writeToothStatesToChart(
	targetPatientId: string,
	toothNumbers: number[],
	state: ToothState,
	mutationHeaders: (extra?: Record<string, string>) => Record<string, string>,
): Promise<string | null> {
	const action = `Отметка «${TOOTH_STATE_LABELS[state]}» по снимку на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не внесена в зубную формулу`;
	try {
		const res = await fetch(
			`/api/patients/${targetPatientId}/tooth-states/batch`,
			{
				method: "POST",
				headers: mutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ toothNumbers, state }),
			},
		);
		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(
				`[VisiographAnalyzer] формула не обновлена, ${res.status} ${rawBody.slice(0, 300)}`,
			);
			return `${actionFailureToast(action, res.status)} Поставьте отметку на схеме зубов руками.`;
		}
		return null;
	} catch (err) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("[VisiographAnalyzer] запрос обновления формулы не выполнен", err);
		return `${actionFailureToast(action, null)} Поставьте отметку на схеме зубов руками.`;
	}
}

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
			const updated = current.trim()
				? `${current.trim()}\n${normaStatement}`
				: normaStatement;
			return { ...prev, objectiveStatus: updated };
		});

		const targetToothNum = Number(targetToothCode);
		if (targetToothNum && !Number.isNaN(targetToothNum)) {
			const toothCodeStr = String(targetToothNum);
			const existingRecord =
				useVisitStore.getState().visitToothRecordsByCode[toothCodeStr];
			useVisitStore.getState().setVisitToothRecord(toothCodeStr, {
				treatmentPlan: existingRecord?.treatmentPlan
					? `${existingRecord.treatmentPlan}\n${normaStatement}`
					: normaStatement,
			});
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						finding: targetToothNum ? { toothNumber: targetToothNum } : undefined,
						objectiveStatus: normaStatement,
						statusLocalis: normaStatement,
						immediate: true,
					},
				}),
			);
		}
	} catch (err) {
		logger.warn("[VisiographAnalyzer] visitStore update failed", err);
	}

	if (onInsertToProtocol) onInsertToProtocol(normaStatement);
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(normaStatement).catch(() => {});
	}

	showToast(
		`Заключение «Норма: патологии на снимке не выявлено» внесено в медицинскую карту${toothPrefix ? ` (${toothPrefix.trim()})` : ""}`,
		"success",
	);

	if (currentScanId && effectivePatientId) {
		updateVisiographScanMeta(
			currentScanId,
			{
				aiSummary: "Норма: патологии на снимке не выявлено",
				notes: normaStatement,
			},
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
			const existingRec =
				useVisitStore.getState().visitToothRecordsByCode[codeStr];
			useVisitStore.getState().setVisitToothRecord(codeStr, {
				diagnosis: existingRec?.diagnosis
					? `${existingRec.diagnosis}\n${reportText}`
					: reportText,
			});
		}
	} catch (err) {
		logger.warn("[VisiographAnalyzer] visitStore update failed", err);
	}

	if (onInsertToProtocol) onInsertToProtocol(statement);
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(statement).catch(() => {});
	}
	showToast(
		`Заключение лучевой диагностики внесено в медицинскую карту${toothPrefix ? ` (${toothPrefix.trim()})` : ""}`,
		"success",
	);
}
