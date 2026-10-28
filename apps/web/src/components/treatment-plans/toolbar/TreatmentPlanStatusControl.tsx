import React from "react";
import { Check, Clock, Zap } from "lucide-react";
import type { TreatmentPlanStatus } from "../types";

export interface TreatmentPlanStatusControlProps {
	readonly planStatus: TreatmentPlanStatus;
	readonly onStatusTransition: (newStatus: TreatmentPlanStatus) => void;
	readonly planAgeDays: number;
}

export const TreatmentPlanStatusControl: React.FC<TreatmentPlanStatusControlProps> = ({
	planStatus,
	onStatusTransition,
	planAgeDays,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0 max-w-full overflow-x-auto scrollbar-none" data-testid="treatment-plan-status-pill">
			<div
				className="tp-segmented-bar shrink-0 flex-nowrap"
				role="group"
				aria-label="Статус плана лечения"
				data-testid="treatment-plan-status-control"
			>
				<button
					type="button"
					onClick={() => onStatusTransition("draft")}
					data-testid="tp-status-btn-draft"
					className={`tp-status-btn status-draft ${planStatus === "draft" ? "active" : ""}`}
					title="Черновик плана лечения"
				>
					<span>Черновик</span>
				</button>
				<button
					type="button"
					onClick={() => onStatusTransition("agreed")}
					data-testid="tp-status-btn-agreed"
					className={`tp-status-btn status-agreed ${planStatus === "agreed" ? "active" : ""}`}
					title="План согласован с пациентом"
				>
					<Check size={12} className={planStatus === "agreed" ? "text-white" : "text-emerald-600 dark:text-emerald-400"} />
					<span>Согласован</span>
				</button>
				<button
					type="button"
					onClick={() => onStatusTransition("in_progress")}
					data-testid="tp-status-btn-in-progress"
					className={`tp-status-btn status-in-progress ${planStatus === "in_progress" ? "active" : ""}`}
					title="План переведен в работу"
				>
					<Zap size={12} className={planStatus === "in_progress" ? "text-white" : "text-teal-600 dark:text-teal-400"} />
					<span>В работе</span>
				</button>
				<button
					type="button"
					onClick={() => onStatusTransition("completed")}
					data-testid="tp-status-btn-completed"
					className={`tp-status-btn status-completed ${planStatus === "completed" ? "active" : ""}`}
					title="Лечение по плану завершено"
				>
					<span>Завершен</span>
				</button>
			</div>

			{planAgeDays > 30 && (
				<span
					className="h-7 px-2 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-[11px] font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs shrink-0"
					title="План составлен более 30 дней назад, цены могут быть скорректированы."
				>
					<Clock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="hidden md:inline">&gt;30 дней</span>
				</span>
			)}
		</div>
	);
};

export default TreatmentPlanStatusControl;
