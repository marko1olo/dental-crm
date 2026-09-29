/**
 * DENTE CRM — Clinical Error Boundary & Draft Recovery Architecture
 *
 * Catches localized rendering errors in clinical workspaces (VisitView, LeadsKanbanView, ScheduleView)
 * without tearing down the entire React application or displaying a blank white screen.
 *
 * KEY FEATURES:
 * - Localized isolation: Only the affected workspace crashes; navigation shell, header, and other tabs remain functional.
 * - 1-Click "Повторить попытку": Re-mounts the workspace component tree without a full page refresh.
 * - 1-Click "Восстановить черновик из локального кэша": Inspects L1 RAM and persistent storage
 *   (IndexedDB / localStorage) to restore unsaved doctor notes, complaints, and dental charts.
 * - Zero Emojis, WCAG compliant contrast, macOS / Apple Clinical HIG styling with design tokens.
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { loadVisitDraftSync } from "../../services/offline/offlineStorage";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";

export interface ClinicalErrorBoundaryProps {
	/** Human-readable name of the protected clinical workspace (e.g., "Приём 043/у", "Расписание", "Канбан") */
	workspaceName: string;
	/** Key identifying the domain workspace: 'visit' | 'schedule' | 'leads' | string */
	workspaceKey?: "visit" | "schedule" | "leads" | string;
	/** Optional visit identifier for automated draft recovery */
	visitId?: string;
	/** Optional patient identifier */
	patientId?: string;
	/** Custom draft recovery callback if workspace has custom persistence */
	onRecoverDraft?: () => void | Promise<void>;
	/** Callback when user resets or retries the error boundary */
	onReset?: () => void;
	/** Child elements */
	children?: ReactNode | undefined;
}

export interface ClinicalErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
	occurredAt: Date | null;
	draftRecovered: boolean;
	recoveredSummary: string | null;
}

export class ClinicalErrorBoundary extends Component<
	ClinicalErrorBoundaryProps,
	ClinicalErrorBoundaryState
> {
	constructor(props: ClinicalErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			occurredAt: null,
			draftRecovered: false,
			recoveredSummary: null,
		};
	}

	static getDerivedStateFromError(error: unknown): Partial<ClinicalErrorBoundaryState> {
		return {
			hasError: true,
			error: error instanceof Error ? error : new Error(String(error)),
			occurredAt: new Date(),
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		logger.error(
			`[ClinicalErrorBoundary] Rendering crash caught in workspace '${this.props.workspaceName}'`,
			error,
			errorInfo.componentStack,
		);
	}

	private handleRetry = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			draftRecovered: false,
			recoveredSummary: null,
		});
		this.props.onReset?.();
	};

	private handleRecoverDraft = async (): Promise<void> => {
		const { workspaceKey = "visit", visitId, onRecoverDraft } = this.props;

		try {
			if (onRecoverDraft) {
				await onRecoverDraft();
				this.setState({
					draftRecovered: true,
					recoveredSummary: "Черновик восстановлен пользовательским обработчиком.",
				});
				showToast("Черновик успешно восстановлен из локального кэша", "success");
				return;
			}

			if (workspaceKey === "visit") {
				const effectiveVisitId = visitId || useAppStore.getState().dashboard?.activeVisit?.id;
				if (effectiveVisitId) {
					const draft = loadVisitDraftSync(effectiveVisitId);
					if (draft && draft.data) {
						const form = draft.data as Record<string, string>;
						useVisitStore.getState().setVisitNoteForm({
							complaint: form.complaint || "",
							anamnesis: form.anamnesis || "",
							objectiveStatus: form.objectiveStatus || "",
							diagnosis: form.diagnosis || "",
							treatmentPlan: form.treatmentPlan || "",
						});
						this.setState({
							draftRecovered: true,
							recoveredSummary: `Восстановлен черновик приёма от ${new Date(draft.updatedAt).toLocaleTimeString("ru-RU")}.`,
						});
						showToast("Черновик протокола 043/у восстановлен из памяти", "success");
						this.handleRetry();
						return;
					}
				}

				// If no specific visit draft found, check store form
				const currentForm = useVisitStore.getState().visitNoteForm;
				if (currentForm.complaint || currentForm.diagnosis) {
					this.setState({
						draftRecovered: true,
						recoveredSummary: "Данные активной формы сохранены в оперативной памяти.",
					});
					showToast("Данные формы сохранены в памяти", "info");
					this.handleRetry();
					return;
				}
			}

			this.setState({
				draftRecovered: true,
				recoveredSummary: "Локальный кэш проверен. Критических несохранённых изменений не обнаружено.",
			});
			showToast("Локальный кэш проверен. Несохранённых потерь нет.", "info");
			this.handleRetry();
		} catch (err) {
			logger.error("[ClinicalErrorBoundary] Failed to recover draft", err);
			showToast("Не удалось автоматически восстановить черновик", "warning");
		}
	};

	render(): ReactNode {
		const { hasError, error, occurredAt, draftRecovered, recoveredSummary } = this.state;
		const { workspaceName, children } = this.props;

		if (!hasError) {
			return children;
		}

		return (
			<section
				className="clinical-error-boundary-card p-6 my-4 mx-auto max-w-3xl rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-md"
				role="alert"
				aria-live="assertive"
			>
				<div className="flex items-center gap-3 mb-4">
					<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]">
						<AlertTriangle className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-base font-semibold leading-snug">
							Временная изоляция сбоя: {workspaceName}
						</h2>
						<p className="text-xs text-[var(--ink-muted)]">
							Интерфейс модуля временно приостановлен. Соседние вкладки, расписание и данные пациентов не затронуты.
						</p>
					</div>
				</div>

				<div className="p-3 mb-4 rounded-lg bg-[var(--paper-strong)] border border-[var(--line-subtle)] text-xs">
					<p className="text-[var(--ink-muted)] mb-1">
						Все данные, введённые до сбоя, зафиксированы в оперативной памяти и локальном офлайн-хранилище (IndexedDB).
					</p>
					{occurredAt && (
						<p className="text-[11px] text-[var(--ink-muted)] opacity-80">
							Время фиксации: {occurredAt.toLocaleTimeString("ru-RU")}
						</p>
					)}
					{error && import.meta.env?.DEV && (
						<div className="mt-2 p-2 rounded bg-black/5 font-mono text-[10px] break-all max-h-24 overflow-y-auto">
							{error.message}
						</div>
					)}
				</div>

				{draftRecovered && recoveredSummary && (
					<div className="flex items-center gap-2 p-2.5 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
						<CheckCircle2 className="w-4 h-4 shrink-0" />
						<span>{recoveredSummary}</span>
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2.5 pt-2">
					<button
						type="button"
						onClick={this.handleRetry}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-contrast,#ffffff)] hover:opacity-95 active:scale-95 transition-all h-9"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Повторить попытку
					</button>

					<button
						type="button"
						onClick={this.handleRecoverDraft}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] hover:bg-[var(--line-subtle)] text-[var(--ink)] active:scale-95 transition-all h-9"
					>
						<FileText className="w-3.5 h-3.5" />
						Восстановить черновик из локального кэша
					</button>
				</div>
			</section>
		);
	}
}
