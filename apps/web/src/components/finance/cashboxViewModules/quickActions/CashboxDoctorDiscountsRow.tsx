import React from "react";
import { Tag, ShoppingBag } from "lucide-react";
import { CASHBOX_DISCOUNT_PRESETS } from "../cashboxConstants.js";

export interface CashboxDoctorDiscountsRowProps {
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (warranty: boolean) => void;
	readonly isStaffColleague: boolean;
	readonly setIsStaffColleague: (staff: boolean) => void;
	readonly onResetDiscount: () => void;
	readonly onOpenRetailModal: () => void;
}

export function CashboxDoctorDiscountsRow({
	discountPercent,
	setDiscountPercent,
	isWarranty,
	setIsWarranty,
	isStaffColleague,
	setIsStaffColleague,
	onResetDiscount,
	onOpenRetailModal,
}: CashboxDoctorDiscountsRowProps): React.JSX.Element {
	return (
		<div className="mb-3 px-3 py-2 bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap select-none">
			<div className="flex items-center gap-2 flex-wrap">
				<div className="text-xs font-bold text-[var(--ink)] shrink-0 flex items-center gap-1.5 whitespace-nowrap">
					<Tag className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
					<span>Скидки врача:</span>
				</div>

				<button
					type="button"
					className={`h-[30px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
						isWarranty ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
					}`}
					onClick={() => {
						setIsWarranty(!isWarranty);
						setIsStaffColleague(false);
					}}
				>
					100% Гарантия
				</button>

				<button
					type="button"
					className={`h-[30px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
						isStaffColleague ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
					}`}
					onClick={() => {
						setIsStaffColleague(!isStaffColleague);
						setIsWarranty(false);
					}}
				>
					100% Персонал
				</button>

				{CASHBOX_DISCOUNT_PRESETS.map((pct) => {
					const active = discountPercent === pct && !isWarranty && !isStaffColleague;
					return (
						<button
							key={pct}
							type="button"
							className={`h-[30px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
								active ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
							}`}
							onClick={() => {
								setDiscountPercent(discountPercent === pct ? 0 : pct);
								setIsWarranty(false);
								setIsStaffColleague(false);
							}}
						>
							{pct}%
						</button>
					);
				})}

				{(isWarranty || isStaffColleague || discountPercent > 0) && (
					<button
						type="button"
						className="h-[30px] px-2 rounded-lg text-xs text-[var(--muted)] underline cursor-pointer bg-transparent border-none"
						onClick={onResetDiscount}
					>
						Сбросить
					</button>
				)}
			</div>

			<div className="shrink-0 flex items-center">
				<button
					type="button"
					onClick={onOpenRetailModal}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] inline-flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
					data-testid="btn-open-retail-showcase"
					title="Витрина сопутствующих товаров ресепшена (Curaprox, Marvis, подарочные сертификаты)"
				>
					<ShoppingBag className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
					<span>Витрина товаров</span>
				</button>
			</div>
		</div>
	);
}
