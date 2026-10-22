import React from "react";
import { CalendarPlus, Phone, RotateCcw } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ShiftDebtRecall } from "./drawerTypes";
import type { BookSlotHandler } from "../copilotTypes";

interface CopilotDrawerTasksRecallsProps {
	recalls: ShiftDebtRecall[];
	onBookSlot?: BookSlotHandler;
	onSendPrompt: (text: string) => void;
}

export const CopilotDrawerTasksRecalls: React.FC<CopilotDrawerTasksRecallsProps> = ({
	recalls,
	onBookSlot,
	onSendPrompt,
}) => {
	return (
		<div className="copilot-tasks-section" data-testid="copilot-section-overdue-recalls">
			<div className="copilot-tasks-section-header">
				<div className="flex items-center gap-1.5">
					<RotateCcw size={13} className="text-rose-500 shrink-0" />
					<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
						Просроченные рекаллы
					</span>
				</div>
				<span className="copilot-tasks-count-pill bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
					{recalls.length}
				</span>
			</div>

			<div className="space-y-2 mt-2">
				{recalls.map((recall) => (
					<div key={recall.id} className="copilot-task-card" data-testid={`card-recall-${recall.id}`}>
						<div className="flex items-start justify-between gap-2 mb-1">
							<span className="font-bold text-xs text-[var(--ink)]">{recall.fullName}</span>
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
								+{recall.overdueDays} дн.
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mb-2.5 leading-relaxed">{recall.reason}</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									showToast(`Звонок пациенту: ${recall.fullName} (${recall.phone})`, "info");
									if (typeof window !== "undefined") {
										window.open(`tel:${recall.phone}`);
									}
								}}
								className="copilot-task-btn copilot-task-btn-secondary"
								title={`Позвонить ${recall.phone}`}
								data-testid={`btn-recall-call-${recall.id}`}
							>
								<Phone size={12} className="shrink-0" />
								<span>Позвонить</span>
							</button>
							<button
								type="button"
								onClick={() => {
									if (onBookSlot) {
										onBookSlot({
											start_time: "10:00",
											date: new Date().toISOString().slice(0, 10),
											chairId: "chair-1",
											time: "10:00",
										});
									}
									onSendPrompt(`Запиши пациента ${recall.fullName} на приём: ${recall.reason}`);
								}}
								className="copilot-task-btn copilot-task-btn-primary"
								data-testid={`btn-recall-book-${recall.id}`}
							>
								<CalendarPlus size={12} className="shrink-0" />
								<span>Записать</span>
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
