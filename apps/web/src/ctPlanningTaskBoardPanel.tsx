import type React from "react";
import { useState } from "react";
import { Check, CheckCircle2, ListPlus } from "lucide-react";
import type { CtPlanningTaskCard, CtPlanningTaskSnapshot } from "./ctPlanningState";

export type CtPlanningTaskBoardPanelProps = {
	planningSnapshot: CtPlanningTaskSnapshot;
	patientId?: string;
	onTaskCreated?: (task: { title: string; priority: string; status: string }) => void;
};

export function CtPlanningTaskBoardPanel({
	planningSnapshot,
	patientId,
	onTaskCreated,
}: CtPlanningTaskBoardPanelProps) {
	const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
	const [completedCardIds, setCompletedCardIds] = useState<Set<string>>(new Set());
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const handleCompleteCard = (cardId: string) => {
		setCompletedCardIds((prev) => {
			const next = new Set(prev);
			if (next.has(cardId)) {
				next.delete(cardId);
			} else {
				next.add(cardId);
			}
			return next;
		});
	};

	const handleCreateCtPlanningTask = async () => {
		const title = `Снимок КТ / планирование: ${planningSnapshot?.taskSummaryLabel || "Планирование имплантации"}`;
		const description = `КТ-планирование: готовность ${planningSnapshot?.readinessScore ?? 0}%. ${planningSnapshot?.implantSummaryLabel || ""}`;
		const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const priority = "urgent";

		// Optimistic notification
		setToastMessage("Задача «Снимок КТ / планирование» создана в CRM");
		setTimeout(() => setToastMessage(null), 3500);

		if (onTaskCreated) {
			onTaskCreated({ title, priority, status: "open" });
		}

		// Sync with backend / localStorage
		try {
			const storedToken =
				typeof window !== "undefined"
					? localStorage.getItem("dental_crm_token") || localStorage.getItem("token")
					: null;
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (storedToken) {
				headers.Authorization = `Bearer ${storedToken}`;
			}

			await fetch("/api/tasks", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patientId || undefined,
					title,
					description,
					dueDate,
					priority,
					category: "imaging",
				}),
			}).catch(() => null);

			// Also persist to local tickets fallback for offline/test reliability
			if (typeof window !== "undefined") {
				const existingStr = localStorage.getItem("dental_patient_tickets") || "[]";
				try {
					const tickets = JSON.parse(existingStr);
					tickets.unshift({
						id: `ticket-ct-${Date.now()}`,
						patientId: patientId || "demo-patient",
						title,
						description,
						priority,
						status: "open",
						dueDate,
						createdAt: new Date().toISOString(),
					});
					localStorage.setItem("dental_patient_tickets", JSON.stringify(tickets));
				} catch {
					// Ignore json parse error
				}
			}
		} catch {
			// Non-blocking network failure fallback
		}
	};

	const rawCards: CtPlanningTaskCard[] = planningSnapshot?.cards ?? [];
	const filteredCards = rawCards.filter((task) => {
		const isCompleted = completedCardIds.has(task.id) || task.status === "ready";
		if (filterStatus === "active") return !isCompleted;
		if (filterStatus === "completed") return isCompleted;
		return true;
	});

	return (
		<div className="space-y-3">
			{/* 1-Line Compact Toolbar (32-36px, Mandate 8d) */}
			<div
				className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border min-w-0"
				style={{
					background: "var(--paper-strong, var(--paper, #ffffff))",
					borderColor: "var(--line, #e2e8f0)",
				}}
				data-testid="ct-planning-task-toolbar"
			>
				<div className="flex items-center gap-2 min-w-0">
					<ListPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span
						className="text-xs font-semibold truncate"
						style={{ color: "var(--ink, #0f172a)" }}
					>
						Задачи КТ-планирования
					</span>
					<span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
						{planningSnapshot?.readinessScore ?? 0}%
					</span>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Status Filters */}
					<div className="inline-flex rounded-md p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
						<button
							type="button"
							onClick={() => setFilterStatus("all")}
							className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
								filterStatus === "all"
									? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
							data-testid="ct-planning-filter-all"
						>
							Все ({rawCards.length})
						</button>
						<button
							type="button"
							onClick={() => setFilterStatus("active")}
							className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
								filterStatus === "active"
									? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
							data-testid="ct-planning-filter-active"
						>
							В работе
						</button>
						<button
							type="button"
							onClick={() => setFilterStatus("completed")}
							className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
								filterStatus === "completed"
									? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
							data-testid="ct-planning-filter-completed"
						>
							Выполнено
						</button>
					</div>

					{/* 1-Click Mandate 8k/8s Action: Transfer to CRM Tasks */}
					<button
						type="button"
						onClick={handleCreateCtPlanningTask}
						data-testid="ct-planning-create-crm-task-btn"
						className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
						title="Создать срочную задачу в клинике (+1 день)"
					>
						<ListPlus className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">+ Задача «Снимок КТ / планирование»</span>
						<span className="sm:hidden">+ В задачи</span>
					</button>
				</div>
			</div>

			{/* Non-blocking feedback toast */}
			{toastMessage ? (
				<div
					className="text-xs px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-fadeIn"
					role="status"
				>
					<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="truncate">{toastMessage}</span>
				</div>
			) : null}

			{/* Route Cards & Planning Summary */}
			<section
				className="ct-planning-task-board"
				data-testid="ct-planning-task-board"
				aria-label="Задачи КТ-планирования для просмотрщика"
			>
				<article className="ct-planning-task-summary">
					<span>Готовность плана</span>
					<strong>{planningSnapshot?.readinessScore ?? 0}%</strong>
					<p className="truncate min-w-0">{planningSnapshot?.taskSummaryLabel}</p>
					<small className="truncate min-w-0">{planningSnapshot?.implantSummaryLabel}</small>
				</article>
				{(planningSnapshot?.routeCards ?? []).map((route, idx) => (
					<article
						className={route?.state ?? ""}
						key={route?.id ?? `route-${idx}`}
					>
						<span className="truncate">{route?.label}</span>
						<strong className="truncate">{route?.title}</strong>
						<p className="break-words">{route?.detail}</p>
					</article>
				))}
			</section>

			{/* Detailed Planning Tasks with 1-Click Completion (Mandates 8d & 8e) */}
			{filteredCards.length > 0 ? (
				<section
					className="ct-planning-task-list"
					data-testid="ct-planning-task-list"
					aria-label="Переносимые задачи КТ-планирования"
				>
					{filteredCards.map((task, idx) => {
						const isDone = completedCardIds.has(task.id) || task.status === "ready";
						return (
							<article
								className={`ct-planning-task ${isDone ? "ready" : task?.status ?? ""}`}
								key={task?.id ?? `task-${idx}`}
								data-task-kind={task?.kind}
							>
								<div className="flex items-center justify-between gap-1 min-w-0">
									<span className="truncate">{task?.statusLabel}</span>
									{isDone ? (
										<span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
											<Check className="w-3 h-3" /> Готово
										</span>
									) : null}
								</div>
								<strong className="truncate">{task?.title}</strong>
								<p className="break-words">{task?.detail}</p>
								<small className="truncate">{task?.toolLabel}</small>
								{(task?.warnings ?? []).length > 0 ? (
									<em className="break-words">{(task?.warnings ?? []).join(" · ")}</em>
								) : null}

								{/* Direct 1-click action: Max 1 button per card (Mandate 8d & 8e) */}
								<div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
									<button
										type="button"
										onClick={() => handleCompleteCard(task.id)}
										className={`h-6 px-2 text-[11px] font-medium rounded transition-colors inline-flex items-center gap-1 cursor-pointer ${
											isDone
												? "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
												: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900"
										}`}
										title={isDone ? "Вернуть в работу" : "Завершить в 1 клик"}
										data-testid={`ct-task-toggle-${task.id}`}
									>
										<Check className="w-3 h-3" />
										<span>{isDone ? "Вернуть" : "Завершить"}</span>
									</button>
								</div>
							</article>
						);
					})}
				</section>
			) : (
				<div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
					{filterStatus === "completed"
						? "Нет выполненных задач КТ-планирования"
						: "Все задачи КТ-планирования выполнены"}
				</div>
			)}
		</div>
	);
}

