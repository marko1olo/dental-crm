import React from "react";
import {
	MOBILE_EMK_STEPS,
	isEmkTabFilled,
	isEmkTabActive,
} from "./emkToolbarTypes";

export interface EmkStepperControlsProps {
	activeEmkTab: string;
	setActiveEmkTab: (tabId: string) => void;
	noteForm?: Record<string, any>;
}

export function EmkStepperControls({
	activeEmkTab,
	setActiveEmkTab,
	noteForm = {},
}: EmkStepperControlsProps) {
	return (
		<div
			className="emk-tabs-container sm:!hidden w-full min-w-0 bg-[var(--paper-soft)] border-t border-[var(--line)] box-border"
			role="tablist"
			aria-label="Вкладки разделов приема"
			data-testid="emk-tabs-container"
		>
			{/* Мобильный вариант (Apple HIG Segmented Control, 44px touch targets) */}
			<div className="flex sm:hidden items-center p-1 gap-1 w-full min-w-0">
				{MOBILE_EMK_STEPS.map((step) => {
					const isFilled = isEmkTabFilled(step.id, noteForm);
					const isActive = isEmkTabActive(step.id, activeEmkTab, noteForm);
					return (
						<button
							key={step.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`mobile-segmented-btn flex-1 min-h-[40px] px-1 text-[12.5px] rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1 touch-manipulation select-none border ${
								isActive
									? "active bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] shadow-xs font-semibold"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] border-transparent font-medium"
							}`}
							onClick={() => setActiveEmkTab(step.id)}
						>
							<span>{step.label}</span>
							{isFilled && (
								<span
									className={`w-1.5 h-1.5 rounded-full shrink-0 ${
										isActive
											? "bg-[var(--teal,#0d9488)] ring-1 ring-[var(--teal)]/40"
											: "bg-emerald-500/80"
									}`}
									title="Раздел заполнен"
								/>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
