import { useCallback, useRef, useState } from "react";
import { usePatientStore } from "../../../../store/patientStore.js";
import { logger } from "../../../../utils/logger.js";
import { showToast } from "../../../GlobalToast.js";
import { planVisiographFindings } from "../../visiographFindings.js";
import {
	buildFindingsNotice,
	extractSummary,
	updateVisiographScanMeta,
	type XrayScan,
} from "../../VisiographScanHelpers.js";

export interface UseVisiographAnalyzerAiProps {
	currentImageUrl: string | null;
	currentScan: XrayScan | null;
	setCurrentScan: React.Dispatch<React.SetStateAction<XrayScan | null>>;
	effectivePatientId: string | null | undefined;
	patientId?: string | undefined;
	setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>;
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	setError: (err: string | null) => void;
	setFormulaFailure: (err: string | null) => void;
	setApplyNotice: (notice: string | null) => void;
}

export function useVisiographAnalyzerAi({
	currentImageUrl,
	currentScan,
	setCurrentScan,
	effectivePatientId,
	patientId,
	setSelectedFindingCodes,
	denteClinicalReadHeaders,
	denteClinicalMutationHeaders,
	setError,
	setFormulaFailure,
	setApplyNotice,
}: UseVisiographAnalyzerAiProps) {
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const analysisInFlightRef = useRef(false);

	const handleRunAiAnalysis = useCallback(async () => {
		if (!currentImageUrl) {
			showToast("Сначала загрузите снимок визиографа", "warning");
			return;
		}
		if (analysisInFlightRef.current || isAnalyzing) return;
		analysisInFlightRef.current = true;
		setIsAnalyzing(true);
		setError(null);
		setFormulaFailure(null);
		setApplyNotice(null);

		const patientAtStart = effectivePatientId ?? null;
		try {
			const aiRes = await fetch("/api/imaging/visiograph-ai", {
				method: "POST",
				headers: denteClinicalReadHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ imageBase64: currentImageUrl }),
			});
			if (!aiRes.ok) {
				const errData = await aiRes.json().catch(() => ({}));
				throw new Error(errData.error || `AI сервис недоступен (HTTP ${aiRes.status})`);
			}
			const aiResult = (await aiRes.json()) as { report: string; toothStates: Record<string, string>; warnings: string[] };
			const patientNow = (patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
			if (patientAtStart !== patientNow) {
				setError("Пациент был изменён во время анализа. Результат не применён.");
				return;
			}
			setCurrentScan((prev) => (!prev ? null : {
				...prev,
				aiReport: aiResult.report,
				aiSummary: extractSummary(aiResult.report),
				aiToothStates: aiResult.toothStates,
			}));
			if (currentScan?.id && effectivePatientId) {
				updateVisiographScanMeta(
					currentScan.id,
					{ aiReport: aiResult.report, aiSummary: extractSummary(aiResult.report), aiToothStates: aiResult.toothStates },
					denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				);
			}
			const plan = planVisiographFindings(aiResult.toothStates);
			const allPlanCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
			setSelectedFindingCodes(new Set(allPlanCodes));
			const notices = buildFindingsNotice(plan);
			if (notices) setApplyNotice(notices);
			showToast("ИИ-анализ снимка завершён. Ознакомьтесь с рекомендациями ниже.", "success");
		} catch (err: any) {
			logger.error("[VisiographAnalyzer] AI Error:", err);
			setError(err.message || "Не удалось провести ИИ-анализ снимка. Проверьте подключение.");
		} finally {
			analysisInFlightRef.current = false;
			setIsAnalyzing(false);
		}
	}, [currentImageUrl, isAnalyzing, effectivePatientId, patientId, currentScan?.id, denteClinicalReadHeaders, denteClinicalMutationHeaders, setError, setFormulaFailure, setApplyNotice, setCurrentScan, setSelectedFindingCodes]);

	return { isAnalyzing, handleRunAiAnalysis };
}
