/**
 * apps/web/src/components/billing/retail/RetailModalHeaderFooter.tsx
 *
 * Header and footer components for RetailProductsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { ShoppingBag, X, ShieldCheck } from "lucide-react";

interface RetailModalHeaderProps {
	readonly patientName?: string | undefined;
	readonly onClose: () => void;
}

export const RetailModalHeader: React.FC<RetailModalHeaderProps> = ({ patientName, onClose }) => {
	return (
		<header className="px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
					<ShoppingBag size={18} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="text-sm sm:text-base font-black truncate leading-tight">
							Витрина стойки ресепшена
						</h2>
						<span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
							54-ФЗ НДС 20% / Аванс
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] truncate">
						{patientName ? `Добавление товаров в чек пациента: ${patientName}` : "Curaprox · Marvis · Biorepair · Waterpik · Сертификаты"}
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors shrink-0"
				aria-label="Закрыть витрину"
				data-testid="btn-close-retail-modal"
			>
				<X size={18} />
			</button>
		</header>
	);
};

interface RetailModalFooterProps {
	readonly totalSelectedItemsCount: number;
	readonly onAddAllSelected?: (() => void) | undefined;
	readonly onClose: () => void;
}

export const RetailModalFooter: React.FC<RetailModalFooterProps> = ({
	totalSelectedItemsCount,
	onAddAllSelected,
	onClose,
}) => {
	return (
		<footer className="px-4 sm:px-6 py-2.5 border-t border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 text-xs shrink-0">
			<div className="flex items-center gap-2 text-[var(--muted,#64748b)]">
				<ShieldCheck size={14} className="text-teal-600 shrink-0" />
				<span className="hidden sm:inline">
					54-ФЗ: товары витрины пробиваются со ставкой <strong>НДС 20%</strong> (ст. 164 НК РФ). Медуслуги — <strong>Без НДС</strong>.
				</span>
				<span className="sm:hidden text-[11px]">
					Товары: НДС 20% · Услуги: Без НДС
				</span>
			</div>

			<div className="flex items-center gap-2">
				{onAddAllSelected && totalSelectedItemsCount > 1 && (
					<button
						type="button"
						onClick={onAddAllSelected}
						className="h-8 px-3 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95"
					>
						Добавить выбранные ({totalSelectedItemsCount})
					</button>
				)}
				<button
					type="button"
					onClick={onClose}
					className="h-8 px-3.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
				>
					Готово
				</button>
			</div>
		</footer>
	);
};
