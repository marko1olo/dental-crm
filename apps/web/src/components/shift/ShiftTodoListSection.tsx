import React from "react";
import { CheckCircle2 } from "lucide-react";
import { countLabel } from "../../lib/russianPlural";

export interface ShiftTodoListSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: action entity
	readonly visibleRecommendedActions?: readonly any[] | undefined;
	readonly recommendedActionPriorityLabels?: Record<string, string> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient map
	readonly patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: action runner
	readonly onRunRecommendedAction: (action: any) => void;
}

/**
 * ShiftTodoListSection — Блок «Что сделать сейчас» с приоритетами и 1-клик переходами.
 * Mandate 8e: нулевой заслон в работе врача, быстрый переход к задаче.
 */
export const ShiftTodoListSection: React.FC<ShiftTodoListSectionProps> = ({
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	patientsById,
	onRunRecommendedAction,
}) => {
	const actions = visibleRecommendedActions ?? [];

	return (
		<section className="shift-todo" aria-label="Что сделать сейчас" data-testid="shift-todo-list-section">
			<div className="shift-todo-head">
				<h2 style={{ color: "var(--ink)" }}>Что сделать сейчас</h2>
				<span className="shift-todo-count">
					{actions.length > 0
						? countLabel(actions.length, "дело", "дела", "дел")
						: "всё закрыто"}
				</span>
			</div>
			{actions.length > 0 ? (
				<ul className="shift-todo-list">
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{actions.map((action: any) => {
						const patient = action.patientId
							? patientsById.get(action.patientId)
							: null;
						return (
							<li
								key={action.id}
								className={`shift-todo-item priority-${action.priority} min-w-0`}
							>
								<span
									className={`shift-todo-priority priority-${action.priority} shrink-0`}
								>
									{recommendedActionPriorityLabels?.[action.priority] ??
										"без пометки"}
								</span>
								<div className="shift-todo-text min-w-0">
									<strong className="break-words leading-tight">{action.title}</strong>
									<p className="break-words leading-tight">{action.detail}</p>
									{patient ? (
										<span className="shift-todo-patient break-words">
											{patient.fullName}
										</span>
									) : null}
								</div>
								<button
									className="secondary-button shift-todo-go min-h-[44px] px-3 py-2 shrink-0"
									type="button"
									onClick={() => onRunRecommendedAction(action)}
								>
									{action.actionLabel || "Открыть"}
								</button>
							</li>
						);
					})}
				</ul>
			) : (
				<div
					className="compact-todo-empty-card"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						padding: "12px 14px",
						borderRadius: "12px",
						background: "var(--paper-soft, rgba(0,0,0,0.02))",
						border: "1px solid var(--line)",
					}}
				>
					<div
						style={{
							width: "32px",
							height: "32px",
							borderRadius: "8px",
							background: "var(--ok-bg, rgba(21, 128, 61, 0.1))",
							color: "var(--ok-fg, #15803d)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<CheckCircle2 size={16} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<strong style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
							Срочных дел нет
						</strong>
						<span style={{ display: "block", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.35, marginTop: "1px" }}>
							Все приемы подписаны, снимки проверены, документы и оплаты закрыты.
						</span>
					</div>
				</div>
			)}
		</section>
	);
};
