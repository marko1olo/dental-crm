import { useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { logger } from "../../../utils/logger.js";
import { planVisiographFindings } from "../visiographFindings.js";
import { TOOTH_STATE_LABELS } from "../../odontogram/ToothChart.js";

export function useDicomViewerModalAi(
	currentImageSrc: string | null,
	selectedPatientId: string | null | undefined,
	denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>,
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>,
	fileInputRef: React.RefObject<HTMLInputElement | null>,
) {
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [aiReport, setAiReport] = useState<string | null>(null);
	const [aiToothStates, setAiToothStates] = useState<Record<string, string> | null>(null);
	const [selectedFindingCodes, setSelectedFindingCodes] = useState<Set<string>>(new Set());
	const [appliedToothCodes, setAppliedToothCodes] = useState<string[]>([]);
	const [isApplyingToChart, setIsApplyingToChart] = useState(false);
	const [formulaFailure, setFormulaFailure] = useState<string | null>(null);
	const [showFindingsDrawer, setShowFindingsDrawer] = useState(false);
	const analysisInFlightRef = useRef(false);

	const handleRunAiAnalysis = async () => {
		if (!currentImageSrc) {
			fileInputRef.current?.click();
			showToast("Выберите снимок RVG/DICOM для анализа", "info");
			return;
		}
		if (analysisInFlightRef.current || isAnalyzing) return;
		analysisInFlightRef.current = true;
		setIsAnalyzing(true);
		setFormulaFailure(null);
		try {
			const res = await fetch("/api/imaging/visiograph-ai", {
				method: "POST",
				headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ imageBase64: currentImageSrc }),
			});
			if (!res.ok) throw new Error(`AI сервис недоступен (HTTP ${res.status})`);
			const data = await res.json();
			setAiReport(data.report);
			setAiToothStates(data.toothStates);
			const plan = planVisiographFindings(data.toothStates);
			setSelectedFindingCodes(new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))));
			setShowFindingsDrawer(true);
			showToast("ИИ-анализ снимка завершён", "success");
		} catch (err: any) {
			logger.error("[DicomViewerModal] AI failed:", err);
			showToast(err.message || "Не удалось выполнить ИИ-анализ снимка", "error");
		} finally {
			analysisInFlightRef.current = false;
			setIsAnalyzing(false);
		}
	};

	const handleApplyFindingsToChart = async () => {
		if (!aiToothStates || !selectedPatientId) return;
		const plan = planVisiographFindings(aiToothStates);
		if (selectedFindingCodes.size === 0) return;
		setIsApplyingToChart(true);
		setFormulaFailure(null);
		const appliedCodes: string[] = [];
		for (const group of plan.groups) {
			const teethToApply = group.teeth.filter((t) => selectedFindingCodes.has(t.code));
			if (teethToApply.length === 0) continue;
			try {
				const res = await fetch(`/api/patients/${selectedPatientId}/tooth-states/batch`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ toothNumbers: teethToApply.map((t) => t.toothNumber), state: group.state }),
				});
				if (res.ok) appliedCodes.push(...teethToApply.map((t) => t.code));
			} catch (err) {
				logger.error("[DicomViewerModal] chart update error", err);
			}
		}
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
			showToast(`В зубную формулу внесено находок: ${appliedCodes.length}`, "success");
		}
		setIsApplyingToChart(false);
	};

	const resetAiState = () => {
		setAiReport(null);
		setAiToothStates(null);
		setSelectedFindingCodes(new Set());
		setAppliedToothCodes([]);
		setShowFindingsDrawer(false);
		setFormulaFailure(null);
	};

	return {
		isAnalyzing, aiReport, aiToothStates, selectedFindingCodes, setSelectedFindingCodes,
		appliedToothCodes, isApplyingToChart, formulaFailure, showFindingsDrawer, setShowFindingsDrawer,
		handleRunAiAnalysis, handleApplyFindingsToChart, resetAiState,
	};
}
