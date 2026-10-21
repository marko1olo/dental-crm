import type React from "react";
import { CalendarPlus, CheckCircle2, Receipt } from "lucide-react";
import { formatKopecksToRubExact } from "../roadmapPriceHelpers.js";
import type { RoadmapStageData } from "../types.js";

interface FooterProps {
	readonly stage: RoadmapStageData;
	readonly todayRu?: string | undefined;
	readonly onSendStageToVisit: () => void;
	readonly onSendStageToInvoice: () => void;
	readonly onBookStage: () => void;
}

export const RoadmapStageFooter: React.FC<FooterProps> = ({
	stage,
	todayRu,
	onSendStageToVisit,
	onSendStageToInvoice,
	onBookStage,
}) => {
	const totalKopecks =
		typeof stage.totalKopecks === "number" ? stage.totalKopecks : Math.round((stage.totalRub || 0) * 100);

	return (
		<div className="roadmap-stage-footer">
			<div>
				<div className="roadmap-stage-total-label">Стоимость этапа</div>
				<div className="roadmap-stage-total-sum">{formatKopecksToRubExact(totalKopecks)} ₽</div>
				{stage.status === "completed" && (
					<div
						className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5"
						data-testid={`stage-remaining-cost-${stage.stageNumber}`}
					>
						Остаток к оплате: 0,00 ₽
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onSendStageToVisit}
						className="min-h-[44px] md:min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--paper-strong)] border border-[var(--line-subtle,rgba(255,255,255,0.08))] text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`roadmap-send-to-visit-${stage.stageNumber}`}
						title="Перенести услуги этапа в текущий приём врача"
					>
						<CalendarPlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>В приём</span>
					</button>
					<button
						type="button"
						onClick={onSendStageToInvoice}
						className="min-h-[44px] md:min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
						data-testid={`roadmap-send-to-invoice-${stage.stageNumber}`}
						title="Перенести услуги этапа в кассовый счёт на оплату"
					>
						<Receipt className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>В счёт</span>
					</button>
				</div>

				{stage.status === "completed" ? (
					<div
						className="roadmap-stage-completed-badge flex items-center gap-2"
						data-testid={`stage-completed-badge-${stage.stageNumber}`}
					>
						<span
							className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs"
							data-testid={`stage-paid-footer-badge-${stage.stageNumber}`}
						>
							✓ ОПЛАЧЕНО 100%
						</span>
						<span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
							{`✓ Пройден на приеме ${todayRu || new Date().toLocaleDateString("ru-RU")}`}
						</span>
					</div>
				) : (
					<button
						type="button"
						onClick={onBookStage}
						className="roadmap-book-stage-btn"
						data-testid={`book-stage-btn-${stage.stageNumber}`}
					>
						<CalendarPlus className="w-4 h-4" />
						Записаться на этот этап
					</button>
				)}
			</div>
		</div>
	);
};
