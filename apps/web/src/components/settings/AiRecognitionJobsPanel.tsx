/**
 * История AI-задач распознавания (GET /api/ai/recognition-jobs).
 *
 * БЫЛО: POST /api/ai/recognition-jobs из «Лаборатории нейросетей» создавал
 * задание и показывал только последний результат в `recognitionJob`. Список
 * прошлых задач (status/confidence/result) API уже отдавал через
 * `listAiRecognitionJobsFromDb`, но **zero web callers** на GET. После
 * обновления страницы или смены пресета администратор не видел очередь и
 * историю — нельзя было вернуться к черновику, который уже разобрали.
 *
 * ТЕПЕРЬ: самодостаточная панель на Settings → ИИ под workbench.
 * GET с `auth.denteClinicalReadHeaders` (requireClinicalReadAccess + org).
 * Таблица: вид/цель/статус/источник/уверенность/время; раскрытие строки
 * показывает resultText + warnings; «Открыть в лаборатории» кладёт job в
 * `setRecognitionJob`, чтобы «Передать в карту» работало как после POST.
 */

import type {
	AiJobKind,
	AiJobStatus,
	AiRecognitionJob,
	AiRecognitionTarget,
} from "@dental/shared";
import { ClipboardList, History, Loader2, RefreshCw } from "lucide-react";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { aiJobKindLabels } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { PanelSubject } from "../../lib/panelStateText";
import { recognitionTargetLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";

const AI_RECOGNITION_JOBS_SUBJECT: PanelSubject = {
	notLoadedTitle: "История AI-задач не загружена",
	accusative: "историю AI-задач",
	emptyTitle: "AI-задач пока нет",
	emptyHint:
		"Распознайте текст в лаборатории выше — запись появится в этой таблице.",
	failureConsequence:
		"Не считайте, что заданий нет: список не прочитан. Обновите после входа или сообщите администратору, если отказ повторяется.",
};

type LoadState =
	| { phase: "loading" }
	| { phase: "ready" }
	| { phase: "failed"; status: number | null };

const STATUS_LABELS: Record<AiJobStatus, string> = {
	queued: "В очереди",
	running: "Выполняется",
	needs_review: "На проверке",
	accepted: "Принято",
	rejected: "Отклонено",
	failed: "Ошибка",
};

const STATUS_PILL: Record<AiJobStatus, string> = {
	queued: "status-pending",
	running: "status-pending",
	needs_review: "status-confirmed",
	accepted: "status-confirmed",
	rejected: "status-cancelled",
	failed: "status-cancelled",
};

function isAiJobStatus(value: unknown): value is AiJobStatus {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
	);
}

function isAiJobKind(value: unknown): value is AiJobKind {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(aiJobKindLabels, value)
	);
}

function isAiRecognitionTarget(value: unknown): value is AiRecognitionTarget {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(recognitionTargetLabels, value)
	);
}

function parseJobsPayload(raw: string): AiRecognitionJob[] | null {
	let parsed: unknown;
	try {
		parsed = raw.trim() ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	const jobs: AiRecognitionJob[] = [];
	for (const item of parsed) {
		if (!item || typeof item !== "object") continue;
		const r = item as Record<string, unknown>;
		if (typeof r.id !== "string" || !r.id) continue;
		if (!isAiJobKind(r.kind)) continue;
		if (!isAiRecognitionTarget(r.target)) continue;
		if (!isAiJobStatus(r.status)) continue;
		jobs.push({
			id: r.id,
			organizationId:
				typeof r.organizationId === "string" ? r.organizationId : "",
			patientId: typeof r.patientId === "string" ? r.patientId : null,
			imagingStudyId:
				typeof r.imagingStudyId === "string" ? r.imagingStudyId : null,
			kind: r.kind,
			target: r.target,
			status: r.status,
			sourceLabel: typeof r.sourceLabel === "string" ? r.sourceLabel : "",
			inputText: typeof r.inputText === "string" ? r.inputText : "",
			resultText: typeof r.resultText === "string" ? r.resultText : "",
			confidence:
				typeof r.confidence === "number" && Number.isFinite(r.confidence)
					? r.confidence
					: 0,
			warnings: Array.isArray(r.warnings)
				? r.warnings.filter((w): w is string => typeof w === "string")
				: [],
			suggestedNextStep:
				typeof r.suggestedNextStep === "string" ? r.suggestedNextStep : "",
			createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
			updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
		});
	}
	return jobs;
}

function formatWhen(iso: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	try {
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}

function previewText(text: string, max = 140): string {
	const t = text.replace(/\s+/g, " ").trim();
	if (!t) return "—";
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

export const AiRecognitionJobsPanel: React.FC = () => {
	const appLogic = useAppLogicContext() as {
		auth?: {
			denteClinicalReadHeaders?: (
				extra?: Record<string, string>,
			) => Record<string, string>;
		};
		setRecognitionJob?: (job: AiRecognitionJob | null) => void;
		recognitionJob?: AiRecognitionJob | null;
	};

	const [jobs, setJobs] = useState<AiRecognitionJob[]>([]);
	const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
	const [expandedId, setExpandedId] = useState<string | null>(null);
	/** После POST workbench обновляем список без ручного «Обновить». */
	const latestJobId = appLogic.recognitionJob?.id ?? null;

	const fetchJobs = useCallback(async () => {
		const headersFn = appLogic.auth?.denteClinicalReadHeaders;
		if (typeof headersFn !== "function") {
			setLoadState({ phase: "failed", status: null });
			return;
		}
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/ai/recognition-jobs", {
				headers: headersFn(),
			});
			const raw = await res.text();
			if (!res.ok) {
				console.error(
					"[ai-recognition-jobs] list failed",
					res.status,
					raw.slice(0, 200),
				);
				setLoadState({ phase: "failed", status: res.status });
				return;
			}
			const parsed = parseJobsPayload(raw);
			if (!parsed) {
				console.error("[ai-recognition-jobs] bad payload shape");
				setLoadState({ phase: "failed", status: res.status });
				return;
			}
			// Newest first — API may return insert order; sort client-side.
			parsed.sort((a, b) => {
				const ta = Date.parse(a.createdAt) || 0;
				const tb = Date.parse(b.createdAt) || 0;
				return tb - ta;
			});
			setJobs(parsed);
			setLoadState({ phase: "ready" });
		} catch (err) {
			console.error("[ai-recognition-jobs] request failed", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, [appLogic.auth]);

	useEffect(() => {
		void fetchJobs();
	}, [fetchJobs]);

	useEffect(() => {
		if (!latestJobId) return;
		if (jobs.some((j) => j.id === latestJobId)) return;
		void fetchJobs();
	}, [latestJobId, jobs, fetchJobs]);

	const onOpenInWorkbench = useCallback(

		(job: AiRecognitionJob) => {
			const setter = appLogic.setRecognitionJob;
			if (typeof setter !== "function") {
				showToast(
					"Не удалось открыть задачу в лаборатории: контекст кабинета не готов.",
					"error",
					10000,
				);
				return;
			}
			setter(job);
			showToast(
				"Задача открыта в лаборатории нейросетей — можно передать результат в карту.",
				"success",
				7000,
			);
			// Scroll workbench result into view if present.
			try {
				document
					.querySelector(".ai-result-panel")
					?.scrollIntoView({ behavior: "smooth", block: "nearest" });
			} catch {
				/* ignore */
			}
		},
		[appLogic.setRecognitionJob],
	);

	return (
		<section
			className="ai-section-card"
			data-testid="ai-recognition-jobs-panel"
			aria-label="История AI-распознавания"
			style={{ marginTop: "16px" }}
		>
			<div className="ai-section-header">
				<div className="ai-section-icon">
					<History size={24} aria-hidden="true" />
				</div>
				<div className="ai-section-title">
					<h3>История AI-задач</h3>
					<p>
						Все задания распознавания этой клиники: очередь, черновики на
						проверке и уже разобранные тексты. Откройте строку, чтобы вернуть
						результат в лабораторию.
					</p>
				</div>
				<button
					type="button"
					className="secondary-button btn--sm"
					data-testid="ai-recognition-jobs-refresh"
					onClick={() => void fetchJobs()}
					disabled={loadState.phase === "loading"}
					style={{
						marginLeft: "auto",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						minHeight: 44,
						minWidth: 44,
					}}
				>
					{loadState.phase === "loading" ? (
						<Loader2 size={14} className="animate-spin" aria-hidden="true" />
					) : (
						<RefreshCw size={14} aria-hidden="true" />
					)}
					Обновить
				</button>
			</div>

			{loadState.phase === "loading" && jobs.length === 0 ? (
				<p
					className="text-sm"
					style={{ color: "var(--muted)", marginTop: "12px" }}
					data-testid="ai-recognition-jobs-loading"
					role="status"
				>
					Загружаем историю распознавания…
				</p>
			) : null}

			{loadState.phase === "failed" ? (
				<div style={{ marginTop: "12px" }} data-testid="ai-recognition-jobs-error">
					<PanelLoadFailure
						subject={AI_RECOGNITION_JOBS_SUBJECT}
						status={loadState.status}
						onRetry={() => void fetchJobs()}
					/>
				</div>
			) : null}

			{loadState.phase === "ready" && jobs.length === 0 ? (
				<p
					className="text-sm"
					style={{ color: "var(--muted)", marginTop: "12px" }}
					data-testid="ai-recognition-jobs-empty"
					role="status"
				>
					Пока нет ни одной AI-задачи. Распознайте текст в лаборатории выше —
					запись появится здесь.
				</p>
			) : null}

			{jobs.length > 0 ? (
				<div
					className="ai-jobs-table-wrap"
					data-testid="ai-recognition-jobs-list"
					style={{ marginTop: "12px", overflowX: "auto" }}
				>
					<table
						className="data-table"
						style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
					>
						<thead>
							<tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
								<th style={{ padding: "8px 6px" }}>Когда</th>
								<th style={{ padding: "8px 6px" }}>Вид</th>
								<th style={{ padding: "8px 6px" }}>Цель</th>
								<th style={{ padding: "8px 6px" }}>Статус</th>
								<th style={{ padding: "8px 6px" }}>Увер.</th>
								<th style={{ padding: "8px 6px" }}>Источник</th>
								<th style={{ padding: "8px 6px" }}>Результат</th>
								<th style={{ padding: "8px 6px" }} />
							</tr>
						</thead>
						<tbody>
							{jobs.map((job) => {
								const open = expandedId === job.id;
								return (
									<Fragment key={job.id}>
										<tr
											data-testid={`ai-recognition-job-row-${job.id}`}
											style={{
												borderBottom: open
													? "none"
													: "1px solid var(--line)",
												cursor: "pointer",
												verticalAlign: "top",
											}}
											onClick={() =>
												setExpandedId(open ? null : job.id)
											}
										>
											<td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
												{formatWhen(job.createdAt)}
											</td>
											<td style={{ padding: "8px 6px" }}>
												{aiJobKindLabels[job.kind] ?? job.kind}
											</td>
											<td style={{ padding: "8px 6px" }}>
												{recognitionTargetLabels[job.target] ?? job.target}
											</td>
											<td style={{ padding: "8px 6px" }}>
												<span
													className={`status-pill ${STATUS_PILL[job.status] ?? ""}`}
													data-testid={`ai-recognition-job-status-${job.id}`}
												>
													{STATUS_LABELS[job.status] ?? job.status}
												</span>
											</td>
											<td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
												{Math.round(job.confidence * 100)}%
											</td>
											<td
												style={{
													padding: "8px 6px",
													maxWidth: 160,
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
												title={job.sourceLabel}
											>
												{job.sourceLabel || "—"}
											</td>
											<td
												style={{
													padding: "8px 6px",
													maxWidth: 220,
													color: "var(--muted)",
												}}
											>
												{previewText(job.resultText || job.inputText)}
											</td>
											<td
												style={{ padding: "8px 6px" }}
												onClick={(e) => e.stopPropagation()}
											>
												<button
													type="button"
													className="secondary-button btn--sm"
													data-testid={`ai-recognition-job-open-${job.id}`}
													onClick={() => onOpenInWorkbench(job)}
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "6px",
														minHeight: 44,
														minWidth: 44,
													}}
												>
													<ClipboardList size={14} aria-hidden="true" />
													В лабораторию
												</button>
											</td>
										</tr>
										{open ? (
											<tr
												data-testid={`ai-recognition-job-detail-${job.id}`}
												style={{
													borderBottom: "1px solid var(--line)",
													background: "var(--paper-soft, rgba(0,0,0,0.02))",
												}}
											>
												<td colSpan={8} style={{ padding: "12px 10px" }}>
													{job.suggestedNextStep ? (
														<p
															style={{
																margin: "0 0 8px",
																fontSize: "13px",
															}}
														>
															<strong>Следующий шаг: </strong>
															{job.suggestedNextStep}
														</p>
													) : null}
													{job.resultText ? (
														<pre
															style={{
																margin: 0,
																whiteSpace: "pre-wrap",
																wordBreak: "break-word",
																fontFamily: "inherit",
																fontSize: "13px",
																lineHeight: 1.45,
															}}
														>
															{job.resultText}
														</pre>
													) : (
														<p
															style={{
																margin: 0,
																color: "var(--muted)",
																fontSize: "13px",
															}}
														>
															Результат ещё пуст
															{job.status === "queued" ||
															job.status === "running"
																? " — задача в работе."
																: "."}
														</p>
													)}
													{job.warnings.length > 0 ? (
														<ul
															style={{
																margin: "10px 0 0",
																paddingLeft: "18px",
																color: "var(--warning, #b45309)",
																fontSize: "12px",
															}}
														>
															{job.warnings.map((w) => (
																<li key={w}>{w}</li>
															))}
														</ul>
													) : null}
												</td>
											</tr>
										) : null}
									</Fragment>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</section>
	);
};

export default AiRecognitionJobsPanel;
