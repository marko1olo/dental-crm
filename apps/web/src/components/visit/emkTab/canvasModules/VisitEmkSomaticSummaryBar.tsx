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
				className="chairside-cockpit-pipeline hidden bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg px-2.5 h-8 min-h-[32px] max-h-8 text-xs text-[var(--ink)] items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden"
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
						className="inline-flex items-center gap-1 text-[var(--primary)] font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--paper-soft)] transition-colors"
						title="Перейти к осмотру и детальной зубной формуле"
					>
						<Activity
							size={12}
							className="text-[var(--primary)] shrink-0"
						/>
						<span>1. Осмотр & Одонтограмма</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--ink-muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={() => {
							document
								.querySelector('[data-testid="emk-complaints-section"]')
								?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-2"
						className="inline-flex items-center gap-1 text-[var(--warning)] font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--paper-soft)] transition-colors"
						title="Перейти к SOAP дневнику приёма"
					>
						<FileText
							size={12}
							className="text-[var(--warning)] shrink-0"
						/>
						<span>2. Дневник</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--ink-muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={() => {
							document
								.querySelector('[data-testid="emk-treatment-section"]')
								?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-3"
						className="inline-flex items-center gap-1 text-[var(--ink)] font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--paper-soft)] transition-colors"
						title="Перейти к каталогу услуг"
					>
						<Tag
							size={12}
							className="text-[var(--ink-muted)] shrink-0"
						/>
						<span>3. Услуги</span>
					</button>
					<ChevronRight
						size={11}
						className="text-[var(--ink-muted)] shrink-0 opacity-60"
					/>
					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={false}
						aria-busy={isCompletingVisit}
						data-testid="btn-cockpit-quick-complete"
						className="inline-flex items-center gap-1 text-[var(--primary)] font-bold shrink-0 hover:bg-[var(--paper-soft)] cursor-pointer px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] transition-colors"
						title="Завершить приём, сформировать смету и чек"
					>
						<Receipt
							size={12}
							className="text-[var(--primary)] shrink-0"
						/>
						<span>4. Смета & Чек</span>
					</button>
				</div>
			</div>
		</>
	);
}
