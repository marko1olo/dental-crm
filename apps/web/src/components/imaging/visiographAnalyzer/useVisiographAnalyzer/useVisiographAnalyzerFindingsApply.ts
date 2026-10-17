import { useCallback, useState } from "react";
import { countLabel } from "../../../../AppHelpers.js";
import { showToast } from "../../../GlobalToast.js";
import type { ToothState } from "../../../odontogram/ToothChart.js";
import { planVisiographFindings } from "../../visiographFindings.js";
import type { XrayScan } from "../../VisiographScanHelpers.js";
import {
	applyNormaTo043,
	insertReportTo043Protocol,
	writeToothStatesToChart,
} from "../visiographChartBridge.js";

export interface UseVisiographAnalyzerFindingsApplyProps {
	currentScan: XrayScan | null;
	effectivePatientId: string | null | undefined;
	selectedFindingCodes: Set<string>;
	toothCode?: string | null | undefined;
	onInsertToProtocol?: ((reportText: string) => void) | undefined;
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	setFormulaFailure: (err: string | null) => void;
	setAppliedToothCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useVisiographAnalyzerFindingsApply({
	currentScan,
	effectivePatientId,
	selectedFindingCodes,
	toothCode,
	onInsertToProtocol,
	denteClinicalMutationHeaders,
	setFormulaFailure,
	setAppliedToothCodes,
}: UseVisiographAnalyzerFindingsApplyProps) {
	const [isApplyingToChart, setIsApplyingToChart] = useState(false);
	const [isNormaApplied, setIsNormaApplied] = useState(false);

	const handleApplyFindingsToChart = useCallback(async () => {
		if (!currentScan?.aiToothStates) return;
		if (!effectivePatientId) {
			setFormulaFailure("Пациент не выбран, поэтому находки НЕ внесены в зубную формулу.");
			return;
		}
		const plan = planVisiographFindings(currentScan.aiToothStates);
		if (plan.groups.length === 0) {
			showToast("Нет подходящих для зубной формулы находок", "warning");
			return;
		}
		if (selectedFindingCodes.size === 0) {
			showToast("Отметьте галочками хотя бы одну находку ИИ или нажмите «Выбрать все»", "info");
			return;
		}

		setIsApplyingToChart(true);
		setFormulaFailure(null);
		const appliedCodes: string[] = [];
		const writeFailures: string[] = [];

		for (const group of plan.groups) {
			const teethToApply = group.teeth.filter((t) => selectedFindingCodes.has(t.code));
			if (teethToApply.length === 0) continue;
			const failure = await writeToothStatesToChart(
				effectivePatientId,
				teethToApply.map((t) => t.toothNumber),
				group.state as ToothState,
				denteClinicalMutationHeaders,
			);
			if (failure) writeFailures.push(failure);
			else appliedCodes.push(...teethToApply.map((t) => t.code));
		}

		if (writeFailures.length > 0) setFormulaFailure(writeFailures.join(" "));
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
			showToast(`В зубную формулу внесено: ${countLabel(appliedCodes.length, "зуб", "зуба", "зубов")} (${appliedCodes.join(", ")})`, "success");
		}
		setIsApplyingToChart(false);
	}, [currentScan?.aiToothStates, effectivePatientId, selectedFindingCodes, denteClinicalMutationHeaders, setFormulaFailure, setAppliedToothCodes]);

	const handleApplyNormaTo043 = useCallback(() => {
		const targetToothCode = toothCode || currentScan?.toothCode || null;
		applyNormaTo043({
			targetToothCode,
			currentScanId: currentScan?.id,
			effectivePatientId: effectivePatientId ?? undefined,
			onInsertToProtocol,
			mutationHeaders: denteClinicalMutationHeaders,
		});
		setIsNormaApplied(true);
	}, [toothCode, currentScan?.toothCode, currentScan?.id, effectivePatientId, onInsertToProtocol, denteClinicalMutationHeaders]);

	const handleInsertReportToProtocol = useCallback(
		(reportText: string) => {
			insertReportTo043Protocol({
				reportText,
				targetToothCode: toothCode || currentScan?.toothCode || null,
				onInsertToProtocol,
			});
		},
		[toothCode, currentScan?.toothCode, onInsertToProtocol],
	);

	return {
		isApplyingToChart,
		isNormaApplied,
		setIsNormaApplied,
		setIsApplyingToChart,
		handleApplyFindingsToChart,
		handleApplyNormaTo043,
		handleInsertReportToProtocol,
	};
}
