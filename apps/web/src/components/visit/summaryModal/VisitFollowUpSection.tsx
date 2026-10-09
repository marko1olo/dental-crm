import type React from "react";
import { Calendar, Save } from "lucide-react";

export interface VisitFollowUpSectionProps {
	onScheduleNextStage: () => void;
}

export const VisitFollowUpSection: React.FC<VisitFollowUpSectionProps> = ({
	onScheduleNextStage,
}) => {
	return (
		<div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex-wrap">
			<div className="flex items-center gap-2">
				<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
				<span className="font-semibold text-[var(--ink)] text-sm">
					Клинический протокол готов к финализации
				</span>
			</div>
			<div className="ml-auto flex items-center gap-2.5">
				<button
					type="button"
					onClick={onScheduleNextStage}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95"
					title="Записать пациента на следующий этап через 5-7 дней"
					data-testid="ribbon-schedule-next-stage-btn"
				>
					<Calendar size={14} />
					<span>Записать на след. этап (+5 дней)</span>
				</button>
				<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] text-xs font-medium">
					<Save size={12} className="text-emerald-500" />
					<span>Автосохранено</span>
				</div>
			</div>
		</div>
	);
};
