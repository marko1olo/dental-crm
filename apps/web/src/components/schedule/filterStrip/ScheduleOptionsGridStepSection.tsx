import { Plus } from "lucide-react";
import React from "react";

interface ScheduleOptionsGridStepSectionProps {
	gridStepMinutes?: (15 | 30 | 60) | undefined;
	onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
	handleOpenAddChair: () => void;
	setIsOptionsMenuOpen: (open: boolean) => void;
}

export const ScheduleOptionsGridStepSection: React.FC<ScheduleOptionsGridStepSectionProps> = ({
	gridStepMinutes = 30,
	onGridStepChange,
	handleOpenAddChair,
	setIsOptionsMenuOpen,
}) => {
	return (
		<>
			<div className="flex items-center justify-between px-2.5 py-1 text-xs">
				<span className="font-semibold text-[var(--muted)]">Шаг сетки:</span>
				<div
					className="schedule-grid-step-segmented shrink-0 select-none"
					role="group"
					aria-label="Шаг сетки расписания"
					data-testid="schedule-filter-grid-step-selector"
				>
					{([15, 30, 60] as const).map((step) => (
						<button
							key={step}
							type="button"
							onClick={() => {
								onGridStepChange?.(step);
								setIsOptionsMenuOpen(false);
							}}
							className={`schedule-grid-step-btn ${
								(gridStepMinutes ?? 30) === step ? "active" : ""
							}`}
							data-testid={`filter-strip-step-${step}`}
						>
							{step}м
						</button>
					))}
				</div>
			</div>

			<button
				type="button"
				onClick={() => {
					setIsOptionsMenuOpen(false);
					handleOpenAddChair();
				}}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				style={{ minHeight: "44px" }}
				role="menuitem"
				data-testid="schedule-options-add-chair-btn"
				title="Быстрое добавление кресла или кабинета в расписание"
			>
				<Plus
					size={14}
					className="text-[var(--teal,var(--brand-primary))] shrink-0"
					aria-hidden="true"
				/>
				<span>Добавить кресло (+ Кресло)</span>
			</button>
		</>
	);
};
