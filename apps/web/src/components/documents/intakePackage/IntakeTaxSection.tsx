/**
 * IntakeTaxSection.tsx
 *
 * Секция расчета и оформления справки для налогового вычета 13% НДФЛ (ФНС).
 *
 * Инварианты Apple HIG & Мандата 8am:
 * - Крупные сенсорные переключатели налогового года (Touch Target >= 44x44px).
 * - Наглядные карточки категорий вычета без горизонтального дрифта.
 */

import React from "react";

export interface IntakeTaxSectionProps {
	readonly selectedTaxYear: number;
	readonly onSelectYear: (year: number) => void;
	readonly taxAggregated: {
		readonly code01Rub: number;
		readonly code02Rub: number;
		readonly estimatedRefund13Rub: number;
	};
}

export function IntakeTaxSection({
	selectedTaxYear,
	onSelectYear,
	taxAggregated,
}: IntakeTaxSectionProps): React.JSX.Element {
	const currentYear = new Date().getFullYear();
	const availableYears = [currentYear, currentYear - 1, currentYear - 2];

	return (
		<div className="space-y-3.5" data-testid="intake-tax-section">
			{/* Year Selector */}
			<div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex-wrap">
				<span className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
					Налоговый период (календарный год):
				</span>
				<div className="flex items-center gap-2">
					{availableYears.map((year) => (
						<button
							key={year}
							type="button"
							onClick={() => onSelectYear(year)}
							className={`secondary-button min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
								selectedTaxYear === year
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-tax-year-${year}`}
						>
							{year} год
						</button>
					))}
				</div>
			</div>

			{/* Three Tax Metric Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs">
					<div className="text-[11px] font-medium text-[var(--muted,#64748b)]">Код 01 (стандартное лечение):</div>
					<div className="text-lg font-bold text-[var(--ink,#0f172a)] mt-1">
						{taxAggregated.code01Rub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">Лимит вычета до 150 000 ₽</div>
				</div>

				<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs">
					<div className="text-[11px] font-medium text-[var(--muted,#64748b)]">Код 02 (дорогостоящее лечение):</div>
					<div className="text-lg font-bold text-[var(--teal,#0d9488)] mt-1">
						{taxAggregated.code02Rub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">Имплантация и ортопедия без лимита</div>
				</div>

				<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs">
					<div className="text-[11px] font-medium text-[var(--muted,#64748b)]">Оценка возврата 13% НДФЛ:</div>
					<div className="text-lg font-bold text-emerald-600 mt-1">
						{taxAggregated.estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">К возврату пациенту из бюджета</div>
				</div>
			</div>
		</div>
	);
}
