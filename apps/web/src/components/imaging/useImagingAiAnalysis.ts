import { useState, useCallback } from "react";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import { imagingStudyHasFile } from "./types";

export interface UseImagingAiAnalysisOptions {
	selectedImagingStudy: any;
	auth?: any;
}

export function useImagingAiAnalysis({
	selectedImagingStudy,
	auth,
}: UseImagingAiAnalysisOptions) {
	const [analysisByStudy, setAnalysisByStudy] = useState<
		Record<string, { summary: string; toothUpdates: unknown[] }>
	>({});
	const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
	const [enhancementOn, setEnhancementOn] = useState(false);

	const selectedStudyHasFile = imagingStudyHasFile(selectedImagingStudy);

	const handleAnalyzeAI = useCallback(async () => {
		if (!selectedImagingStudy) return;
		if (!selectedStudyHasFile) {
			showToast(
				"Разбирать нечего: к этой карточке не загружен файл снимка. Добавьте снимок через импорт снимков.",
				"error",
			);
			return;
		}
		const studyId = selectedImagingStudy.id;
		setIsAnalyzingAI(true);
		try {
			const headers = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${studyId}/analyze`, {
				method: "POST",
				headers,
			});
			const rawBody = await res.text();
			let payload: any = null;
			try {
				payload = rawBody.trim() ? JSON.parse(rawBody) : null;
			} catch {
				payload = null;
			}

			if (!res.ok) {
				const serverMessage = typeof payload?.message === "string" ? payload.message : "";
				showToast(
					serverMessage || "Разбор снимка не выполнен. Проверьте, что файл снимка загружен.",
					"error",
				);
				return;
			}
			if (!payload?.analysisResult) {
				showToast("Ответ сервера не удалось прочитать. Повторите разбор снимка.", "error");
				return;
			}

			const summary = typeof payload.analysisResult.summary === "string" ? payload.analysisResult.summary : "";
			const toothUpdates = Array.isArray(payload.analysisResult.toothUpdates) ? payload.analysisResult.toothUpdates : [];
			setAnalysisByStudy((current) => ({
				...current,
				[studyId]: { summary, toothUpdates },
			}));

			setEnhancementOn(true);
			showToast("Разбор снимка ShadowAnalyst завершён", "success");
		} catch (error) {
			logger.error("[imaging analyze] error", error);
			showToast("Сервер не ответил на разбор снимка. Проверьте связь.", "error");
		} finally {
			setIsAnalyzingAI(false);
		}
	}, [selectedImagingStudy, selectedStudyHasFile, auth]);

	const analysisForSelected = selectedImagingStudy
		? analysisByStudy[selectedImagingStudy.id]
		: undefined;
	const selectedStudySummary: string | null =
		analysisForSelected?.summary ??
		(selectedImagingStudy?.aiSummary as string | undefined) ??
		null;
	const selectedStudyToothUpdates =
		analysisForSelected?.toothUpdates ??
		(selectedImagingStudy?.aiToothUpdates as unknown[] | undefined);

	return {
		isAnalyzingAI,
		enhancementOn,
		setEnhancementOn,
		selectedStudyHasFile,
		handleAnalyzeAI,
		selectedStudySummary,
		selectedStudyToothUpdates,
	};
}
