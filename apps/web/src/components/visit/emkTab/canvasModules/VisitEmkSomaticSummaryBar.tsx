import { Activity, ChevronRight, FileText, Receipt, Tag } from "lucide-react";
import React from "react";
import type { VisitEmkSomaticSummaryBarProps } from "./visitEmkCanvasTypes";

export function VisitEmkSomaticSummaryBar({
	handleCompleteVisitAndGenerateReceipt,
	isCompletingVisit = false,
}: VisitEmkSomaticSummaryBarProps) {
	return (
		<>
			{/* Траектория врача у кресла */}
			<div
				className="chairside-cockpit-pipeline hidden bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 h-8 min-h-[32px] max-h-8 text-xs text-[var(--ink)] items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden"
				data-testid="chairside-cockpit-pipeline-banner"
			>
				<div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-0 font-medium text-[11px]">
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent("dente:visit-tab-change", {
									detail: { tab: "odontogram" },
								}),
							);
						}}
						data-testid="stepper-step-1"
						className="inline-flex items-center gap-1 text-teal-800 dark:text-teal-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-teal-500/10 transition-colors"
						title="Перейти к осмотру и детальной зубной формуле"
					>
						<Activity
							size={12}
							className="text-teal-600 dark:text-teal-400 shrink-0"
						/>
						<span>1. Осмотр & Одонтограмма</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={() => {
							document
								.querySelector('[data-testid="emk-complaints-section"]')
								?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-2"
						className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
						title="Перейти к SOAP дневнику приёма"
					>
						<FileText
							size={12}
							className="text-amber-600 dark:text-amber-400 shrink-0"
						/>
						<span>2. Дневник</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={() => {
							document
								.querySelector('[data-testid="emk-treatment-section"]')
								?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-3"
						className="inline-flex items-center gap-1 text-blue-800 dark:text-blue-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
						title="Перейти к каталогу услуг"
					>
						<Tag
							size={12}
							className="text-blue-600 dark:text-blue-400 shrink-0"
						/>
						<span>3. Услуги</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={isCompletingVisit}
						data-testid="btn-cockpit-quick-complete"
						className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold shrink-0 hover:bg-emerald-500/20 cursor-pointer px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 transition-colors"
						title="Завершить приём, сформировать смету и чек"
					>
						<Receipt
							size={12}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span>4. Смета & Чек</span>
					</button>
				</div>
			</div>
		</>
	);
}
