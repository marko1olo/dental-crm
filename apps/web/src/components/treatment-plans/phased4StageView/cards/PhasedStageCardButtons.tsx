import React, { useRef } from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import { STAGE_TITLES, type CategorizedStageData, type PhasedStageItem, type PhasedStageStatus } from "../types.js";
import { showToast } from "../../../GlobalToast.js";

export interface PhasedStageCardButtonsProps {
	readonly category: TreatmentPlanStageCategory;
	readonly stageData: CategorizedStageData;
	readonly currentStatus: PhasedStageStatus;
	readonly onSetStageAgreed: (category: TreatmentPlanStageCategory) => void;
	readonly onBookStageToVisit?: ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void) | undefined;
	readonly onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	readonly onOpenStagePayment?: ((category: TreatmentPlanStageCategory, amountRub: number) => void) | undefined;
}

export const PhasedStageCardButtons: React.FC<PhasedStageCardButtonsProps> = ({
	category,
	stageData,
	currentStatus,
	onSetStageAgreed,
	onBookStageToVisit,
	onExecuteStage,
	onOpenStagePayment,
}) => {
	const inFlightRef = useRef(false);

	const runAction = (e: React.MouseEvent, fn: () => void) => {
		e.stopPropagation();
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			fn();
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	const handleBook = () => {
		if (onBookStageToVisit) {
			onBookStageToVisit(category, stageData.items);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-book-stage-appointment", {
					detail: { category, title: STAGE_TITLES[category], items: stageData.items, subtotalRub: stageData.subtotalRub },
				}),
			);
		}
	};

	const handleApprove = () => {
		onSetStageAgreed(category);
		showToast(`Этап «${STAGE_TITLES[category]}» (${stageData.subtotalRub.toLocaleString("ru-RU")} ₽) согласован с пациентом`, "success", 3000);
	};

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<button
				type="button"
				data-testid={`phased-approve-stage-${category}`}
				onClick={(e) => runAction(e, handleApprove)}
				className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[44px] md:min-h-[36px]"
			>
				<svg className="w-3.5 h-3.5 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				{currentStatus === "agreed" ? "Этап согласован" : "Согласовать этап"}
			</button>

			<button
				type="button"
				data-testid={`phased-book-stage-${category}`}
				onClick={(e) => runAction(e, handleBook)}
				className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[44px] md:min-h-[36px]"
			>
				<svg className="w-3.5 h-3.5 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				Записать на приём
			</button>

			{onExecuteStage && (
				<button
					type="button"
					onClick={(e) => runAction(e, () => onExecuteStage(category))}
					className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer min-h-[44px] md:min-h-[36px]"
				>
					<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					</svg>
					Приступить к этапу
				</button>
			)}

			{onOpenStagePayment && (
				<button
					type="button"
					onClick={(e) => runAction(e, () => onOpenStagePayment(category, stageData.subtotalRub))}
					className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[44px] md:min-h-[36px]"
				>
					<svg className="w-3.5 h-3.5 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
					</svg>
					Оплатить этап ({stageData.subtotalRub.toLocaleString("ru-RU")} ₽)
				</button>
			)}
		</div>
	);
};
