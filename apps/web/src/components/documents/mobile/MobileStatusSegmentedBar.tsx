import React from "react";

interface MobileStatusSegmentedBarProps {
	activeStatus: "all" | "draft" | "signed";
	totalCount: number;
	onStatusChange: (status: "all" | "draft" | "signed") => void;
}

export function MobileStatusSegmentedBar({
	activeStatus,
	totalCount,
	onStatusChange,
}: MobileStatusSegmentedBarProps) {
	return (
		<div className="px-4">
			<div className="dente-segmented-bar flex w-full p-1 rounded-[14px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-1">
				<button
					type="button"
					onClick={() => onStatusChange("all")}
					className={`dente-segmented-item flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
						activeStatus === "all" ? "active font-bold shadow-sm" : ""
					}`}
					data-active={activeStatus === "all"}
					data-testid="mobile-status-all"
				>
					Все ({totalCount})
				</button>

				<button
					type="button"
					onClick={() => onStatusChange("signed")}
					className={`dente-segmented-item flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
						activeStatus === "signed"
							? "active font-bold shadow-sm !text-emerald-600 dark:!text-emerald-400"
							: ""
					}`}
					data-active={activeStatus === "signed"}
					data-testid="mobile-status-signed"
				>
					Подписан ПЭП
				</button>

				<button
					type="button"
					onClick={() => onStatusChange("draft")}
					className={`dente-segmented-item flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
						activeStatus === "draft"
							? "active font-bold shadow-sm !text-amber-600 dark:!text-amber-400"
							: ""
					}`}
					data-active={activeStatus === "draft"}
					data-testid="mobile-status-draft"
				>
					Требует подписи
				</button>
			</div>
		</div>
	);
}
