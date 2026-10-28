import React from "react";
import { Tag, ShieldCheck } from "lucide-react";

export interface CashRegisterDiscountsSectionProps {
	readonly isWarranty: boolean;
	readonly discountPercent: number;
	readonly onToggleWarranty: () => void;
	readonly onSetDiscountPercent: (percent: number) => void;
	readonly onResetDiscounts: () => void;
}

export const CashRegisterDiscountsSection: React.FC<CashRegisterDiscountsSectionProps> = ({
	isWarranty,
	discountPercent,
	onToggleWarranty,
	onSetDiscountPercent,
	onResetDiscounts,
}) => {
	return (
		<>
			{/* Doctor Discounts Row (Mandate 8e, 1-Click Warranty) */}
			<div className="flex items-center justify-between gap-1.5 p-2.5 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)] text-xs flex-wrap">
				<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0">
					<Tag className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Скидки врача:
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						data-testid="btn-discount-warranty"
						onClick={onToggleWarranty}
						className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
							isWarranty
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						100% Гарантия
					</button>
					<button
						type="button"
						onClick={() => onSetDiscountPercent(discountPercent === 50 ? 0 : 50)}
						className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
							discountPercent === 50 && !isWarranty
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						50% Коллеги
					</button>
					<button
						type="button"
						onClick={() => onSetDiscountPercent(discountPercent === 10 ? 0 : 10)}
						className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
							discountPercent === 10 && !isWarranty
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						10% Пенсионеры
					</button>
					{(isWarranty || discountPercent > 0) && (
						<button
							type="button"
							onClick={onResetDiscounts}
							className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline min-h-[36px] px-1.5"
						>
							Сбросить
						</button>
					)}
				</div>
			</div>

			{/* Physical Person Non-Requirement Badge (Mandates 8e, 8n) */}
			<div
				className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs"
				title="Плательщик: физическое лицо (ИНН не требуется)"
			>
				<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
					<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
					<span className="font-medium text-[var(--ink)]">Плательщик: физическое лицо</span>
				</div>
				<span
					data-testid="inn-physical-not-required-badge"
					className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
				>
					ИНН не требуется
				</span>
			</div>
		</>
	);
};
