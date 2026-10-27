import { History, Loader2, RefreshCw } from "lucide-react";
import type React from "react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { AI_RECOGNITION_JOBS_SUBJECT } from "./ai/aiRecognitionJobsConstants";
import { AiRecognitionJobsTable } from "./ai/AiRecognitionJobsTable";
import { useAiRecognitionJobs } from "./ai/useAiRecognitionJobs";

export const AiRecognitionJobsPanel: React.FC = () => {
	const {
		jobs,
		loadState,
		expandedId,
		setExpandedId,
		fetchJobs,
		onOpenInWorkbench,
	} = useAiRecognitionJobs();

	return (
		<section className="ai-section-card" data-testid="ai-recognition-jobs-panel" aria-label="История AI-распознавания" style={{ marginTop: "16px" }}>
			<div className="ai-section-header">
				<div className="ai-section-icon"><History size={24} aria-hidden="true" /></div>
				<div className="ai-section-title">
					<h3>История AI-задач</h3>
					<p>Все задания распознавания этой клиники. Нажмите строку, чтобы вернуть результат в лабораторию.</p>
				</div>
				<button
					type="button"
					className="secondary-button btn--sm"
					data-testid="ai-recognition-jobs-refresh"
					onClick={() => void fetchJobs()}
					disabled={loadState.phase === "loading"}
					style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px", minHeight: 44, minWidth: 44 }}
				>
					{loadState.phase === "loading" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
					Обновить
				</button>
			</div>

			{loadState.phase === "loading" && jobs.length === 0 && (
				<p className="text-sm" style={{ color: "var(--muted)", marginTop: "12px" }} data-testid="ai-recognition-jobs-loading" role="status">Загружаем историю распознавания…</p>
			)}
			{loadState.phase === "failed" && (
				<div style={{ marginTop: "12px" }} data-testid="ai-recognition-jobs-error">
					<PanelLoadFailure subject={AI_RECOGNITION_JOBS_SUBJECT} status={loadState.status} onRetry={() => void fetchJobs()} />
				</div>
			)}
			{loadState.phase === "ready" && jobs.length === 0 && (
				<p className="text-sm" style={{ color: "var(--muted)", marginTop: "12px" }} data-testid="ai-recognition-jobs-empty" role="status">Пока нет ни одной AI-задачи. Распознайте текст в лаборатории выше — запись появится здесь.</p>
			)}
			{jobs.length > 0 && (
				<AiRecognitionJobsTable jobs={jobs} expandedId={expandedId} onToggleExpand={setExpandedId} onOpenInWorkbench={onOpenInWorkbench} />
			)}
		</section>
	);
};

export default AiRecognitionJobsPanel;
