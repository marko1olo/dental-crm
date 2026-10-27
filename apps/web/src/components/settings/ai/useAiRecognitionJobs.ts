import type { AiRecognitionJob } from "@dental/shared";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { parseJobsPayload } from "./aiRecognitionJobsConstants";

export type LoadState =
	| { phase: "loading" }
	| { phase: "ready" }
	| { phase: "failed"; status: number | null };

export function useAiRecognitionJobs() {
	const appLogic = useAppLogicContext() as {
		auth?: { denteClinicalReadHeaders?: () => Record<string, string> };
		setRecognitionJob?: (job: AiRecognitionJob | null) => void;
		recognitionJob?: AiRecognitionJob | null;
	};

	const [jobs, setJobs] = useState<AiRecognitionJob[]>([]);
	const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const latestJobId = appLogic.recognitionJob?.id ?? null;

	const fetchJobs = useCallback(async () => {
		const headersFn = appLogic.auth?.denteClinicalReadHeaders;
		if (typeof headersFn !== "function") {
			setLoadState({ phase: "failed", status: null });
			return;
		}
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/ai/recognition-jobs", { headers: headersFn() });
			const raw = await res.text();
			if (!res.ok) {
				setLoadState({ phase: "failed", status: res.status });
				return;
			}
			const parsed = parseJobsPayload(raw);
			if (!parsed) {
				setLoadState({ phase: "failed", status: res.status });
				return;
			}
			parsed.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
			setJobs(parsed);
			setLoadState({ phase: "ready" });
		} catch (err) {
			showToast(actionFailureToast("Ошибка загрузки", (err as { status?: number })?.status ?? null), "error");
			logger.error("[ai-recognition-jobs] request failed", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, [appLogic.auth]);

	useEffect(() => { void fetchJobs(); }, [fetchJobs]);

	useEffect(() => {
		if (latestJobId && !jobs.some((j) => j.id === latestJobId)) {
			void fetchJobs();
		}
	}, [latestJobId, jobs, fetchJobs]);

	const onOpenInWorkbench = useCallback((job: AiRecognitionJob) => {
		if (typeof appLogic.setRecognitionJob !== "function") {
			showToast("Не удалось открыть задачу: контекст кабинета не готов.", "error");
			return;
		}
		appLogic.setRecognitionJob(job);
		showToast("Задача открыта в лаборатории нейросетей.", "success");
		try {
			document.querySelector(".ai-result-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
		} catch { /* ignore */ }
	}, [appLogic.setRecognitionJob]);

	return {
		jobs,
		loadState,
		expandedId,
		setExpandedId,
		fetchJobs,
		onOpenInWorkbench,
	};
}
