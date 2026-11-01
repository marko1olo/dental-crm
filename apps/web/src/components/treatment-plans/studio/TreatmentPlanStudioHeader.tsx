/**
 * TreatmentPlanStudioHeader.tsx — Шапка интерактивной студии планов лечения.
 * Мандаты 8e, 8am, Apple HIG:
 * - Свобода скидок врача до 100% (Мандат 8e)
 * - Сенсорные зоны кнопок >= 44x44px
 * - Печать и закрытие без блокировок
 */

import React from "react";
import { Stethoscope, Percent, Printer, X } from "lucide-react";

export interface TreatmentPlanStudioHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly doctorDiscountPercent: number;
	readonly isDiscountBarOpen: boolean;
	readonly onToggleDiscountBar: () => void;
	readonly onSelectDiscountPercent: (percent: number) => void;
	readonly onClose: () => void;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50, 100] as const;

export const TreatmentPlanStudioHeader: React.FC<TreatmentPlanStudioHeaderProps> = ({
	patientName,
	doctorFullName,
	doctorDiscountPercent,
	isDiscountBarOpen,
	onToggleDiscountBar,
	onSelectDiscountPercent,
	onClose,
}) => {
	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	return (
		<>
			<header className="tp-studio-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 min-h-[52px]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Stethoscope className="w-5 h-5" />
					</div>
					<div className="flex flex-col min-w-0">
						<h2
							id="treatment-studio-title"
							className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0"
						>
							<span className="sm:hidden">План лечения</span>
							<span className="hidden sm:inline">Комплексный план лечения</span>
						</h2>
						<div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--muted)] truncate">
							<span className="font-semibold text-[var(--ink)] truncate">{patientName}</span>
							<span className="hidden sm:inline">·</span>
							<span className="hidden sm:inline truncate">{doctorFullName}</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{/* Скидка врача до 100% (Мандат 8e) */}
					<button
						type="button"
						onClick={onToggleDiscountBar}
						className={`tp-studio-header-btn min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
							doctorDiscountPercent > 0
								? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
						}`}
						title="Скидка врача до 100% (Мандат 8e)"
						data-testid="toggle-discount-btn"
					>
						<Percent className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">
							{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}
						</span>
					</button>

					{/* Печать плана и сметы */}
					<button
						type="button"
						onClick={handlePrint}
						className="tp-studio-header-btn hidden sm:flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
						title="Печать сметы плана"
						data-testid="print-plan-btn"
					>
						<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
						<span>Печать</span>
					</button>

					{/* Закрытие модалки */}
					<button
						type="button"
						onClick={onClose}
						className="tp-studio-header-btn min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть студию планов лечения"
						data-testid="close-studio-btn"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</header>

			{/* Панель скидок врача (Мандат 8e: свобода скидки до 100% без блокировок) */}
			{isDiscountBarOpen && (
				<div
					className="px-4 sm:px-6 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-3 flex-wrap text-xs"
					data-testid="doctor-discount-bar"
				>
					<span className="font-bold text-[var(--ink)]">Скидка врача (Мандат 8e):</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						{DISCOUNT_PRESETS.map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => onSelectDiscountPercent(pct)}
								className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									doctorDiscountPercent === pct
										? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
								}`}
							>
								{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
					</div>
					{doctorDiscountPercent > 0 && (
						<span className="text-[var(--teal,#0d9488)] font-semibold ml-auto">
							Применена скидка {doctorDiscountPercent}% на все варианты
						</span>
					)}
				</div>
			)}
		</>
	);
};

export default TreatmentPlanStudioHeader;
