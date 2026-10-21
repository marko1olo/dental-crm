import React from "react";
import { Coins, FileBadge } from "lucide-react";
import type { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import { formatKopecksToRubExact } from "../roadmapPriceHelpers.js";

export interface RoadmapTaxDeductionBannerProps {
	readonly taxBreakdown: ReturnType<typeof calculatePlanTaxDeductionBreakdown>;
	readonly onRequestTaxCertificate?: (() => void) | undefined;
}

export const RoadmapTaxDeductionBanner: React.FC<RoadmapTaxDeductionBannerProps> = ({
	taxBreakdown,
	onRequestTaxCertificate,
}) => {
	return (
		<div className="roadmap-tax-banner" data-testid="roadmap-tax-banner">
			<div className="flex items-start gap-3">
				<div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
					<Coins className="w-5 h-5" />
				</div>
				<div>
					<div className="text-sm font-bold text-[var(--ink)] flex items-center gap-2 flex-wrap">
						<span>Налоговый вычет 13% (Возврат от ФНС России)</span>
						<span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
							+{formatKopecksToRubExact(taxBreakdown.grandTotalRefund13Kopecks)} ₽
						</span>
					</div>
					<div className="text-xs text-[var(--muted,var(--ink-muted))] mt-1 leading-relaxed">
						{taxBreakdown.hasCode02ExpensiveServices ? (
							<>
								План включает дорогостоящее лечение (Код 02: имплантация) — вычет 13% рассчитывается{" "}
								<strong className="text-[var(--ink)]">со всей суммы без лимита</strong>.
							</>
						) : (
							<>
								Стандартное лечение (Код 01) — лимит вычета до 150 000 ₽ в год (возврат до 19 500 ₽).
							</>
						)}
						<div className="mt-0.5 text-[var(--ink)]">
							Итоговая стоимость с учетом возврата:{" "}
							<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
								{formatKopecksToRubExact(taxBreakdown.netPriceWithRefundKopecks)} ₽
							</strong>
						</div>
					</div>
				</div>
			</div>

			<div className="flex-shrink-0 flex items-center">
				<button
					type="button"
					onClick={onRequestTaxCertificate}
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-sky-500/30 text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:white hover:bg-sky-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
					data-testid="request-tax-cert-btn"
				>
					<FileBadge className="w-3.5 h-3.5" />
					<span>Справка для ФНС</span>
				</button>
			</div>
		</div>
	);
};
