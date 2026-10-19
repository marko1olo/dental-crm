/**
 * apps/web/src/components/billing/invoices/InvoicesToolbar.tsx
 *
 * 1-line dense toolbar (32–36px on desktop, >=44px touch targets on mobile).
 * Mandates 8d, 8p & Hick's Law. Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Receipt, Search, X, Plus, Wallet, ShieldCheck, Clock, MoreHorizontal, Printer } from "lucide-react";
import type { InvoiceFilterTab, BillingInvoice } from "../invoiceTypes.js";

interface InvoicesToolbarProps {
	readonly invoices: BillingInvoice[];
	readonly filterTab: InvoiceFilterTab;
	readonly setFilterTab: (tab: InvoiceFilterTab) => void;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly onOpenCreate: () => void;
	readonly onOpenCashDrawer: () => void;
	readonly onOpenShift: () => void;
	readonly onOpenInstallments: () => void;
	readonly isToolbarMenuOpen: boolean;
	readonly setIsToolbarMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
	readonly toolbarMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly onPrintRegistry: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const InvoicesToolbar: React.FC<InvoicesToolbarProps> = ({
	invoices,
	filterTab,
	setFilterTab,
	searchQuery,
	setSearchQuery,
	onOpenCreate,
	onOpenCashDrawer,
	onOpenShift,
	onOpenInstallments,
	isToolbarMenuOpen,
	setIsToolbarMenuOpen,
	toolbarMenuRef,
	onPrintRegistry,
	onClose,
}) => {
	const pendingCount = invoices.filter((i) => i && (i.status === "issued" || i.status === "draft" || i.status === "partially_paid")).length;
	const paidCount = invoices.filter((i) => i && i.status === "paid").length;
	const warrantyCount = invoices.filter((i) => i && i.status === "warranty_100").length;

	return (
		<div className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0 select-none" role="toolbar" aria-label="Панель счетов и актов">
			<div className="flex items-center gap-1.5 shrink min-w-0 overflow-x-auto scrollbar-none py-0.5">
				<div className="flex items-center gap-1.5 font-bold text-xs mr-2 text-[var(--ink,#0f172a)] shrink-0">
					<Receipt size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="whitespace-nowrap">Счета и Акты</span>
				</div>

				<div className="dente-segmented-bar shrink-0" role="tablist" aria-label="Фильтры счетов">
					<button type="button" onClick={() => setFilterTab("all")} className={`dente-segmented-item ${filterTab === "all" ? "active" : ""}`} data-active={filterTab === "all"} data-testid="filter-invoices-all">
						<span>Все</span> <span className="text-[10px] opacity-70 font-mono">({invoices.length})</span>
					</button>
					<button type="button" onClick={() => setFilterTab("pending")} className={`dente-segmented-item ${filterTab === "pending" ? "active" : ""}`} data-active={filterTab === "pending"} data-testid="filter-invoices-pending">
						<span>К оплате</span> <span className="text-[10px] opacity-70 font-mono">({pendingCount})</span>
					</button>
					<button type="button" onClick={() => setFilterTab("paid")} className={`dente-segmented-item ${filterTab === "paid" ? "active" : ""}`} data-active={filterTab === "paid"} data-testid="filter-invoices-paid">
						<span>Оплачено</span> <span className="text-[10px] opacity-70 font-mono">({paidCount})</span>
					</button>
					<button type="button" onClick={() => setFilterTab("warranty")} className={`dente-segmented-item ${filterTab === "warranty" ? "active" : ""}`} data-active={filterTab === "warranty"} data-testid="filter-invoices-warranty">
						<span>Гарантия 100%</span> <span className="text-[10px] opacity-70 font-mono">({warrantyCount})</span>
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div className="dente-search-wrap hidden md:flex w-48 sm:w-60">
					<Search size={14} className="dente-search-icon" />
					<input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по пациенту или № счета..." className="dente-search-input" data-testid="input-search-invoices" />
					{searchQuery && (
						<button type="button" onClick={() => setSearchQuery("")} className="dente-search-clear" aria-label="Очистить поиск"><X size={13} /></button>
					)}
				</div>

				<button type="button" onClick={onOpenCreate} className="primary-button h-8 px-2.5 rounded-lg text-xs font-bold text-white shrink-0" data-testid="btn-create-invoice-open">
					<Plus size={14} /> <span>Новый счёт</span>
				</button>
				<button type="button" onClick={onOpenCashDrawer} className="secondary-button h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 hidden sm:inline-flex" data-testid="btn-invoices-open-cash-drawer">
					<Wallet size={14} className="text-teal-600" /> <span>Касса</span>
				</button>
				<button type="button" onClick={onOpenShift} className="secondary-button h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 hidden sm:inline-flex" data-testid="btn-invoices-open-shift-modal">
					<ShieldCheck size={14} className="text-emerald-600" /> <span>Смена</span>
				</button>
				<button type="button" onClick={onOpenInstallments} className="secondary-button h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 hidden lg:inline-flex" data-testid="btn-invoices-open-installments">
					<Clock size={14} className="text-blue-600" /> <span>Рассрочки</span>
				</button>

				<div className="relative" ref={toolbarMenuRef}>
					<button type="button" onClick={() => setIsToolbarMenuOpen((prev) => !prev)} className="secondary-button w-8 h-8 p-0 rounded-lg shrink-0 flex items-center justify-center text-[var(--muted,#64748b)]" data-testid="invoices-toolbar-options-btn" aria-label="Опции реестра">
						<MoreHorizontal size={15} />
					</button>
					{isToolbarMenuOpen && (
						<div className="absolute right-0 top-full mt-1 w-48 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-lg py-1 z-30 text-xs" data-testid="invoices-toolbar-menu-dropdown">
							<button type="button" onClick={onPrintRegistry} className="w-full text-left px-3 py-2 text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer font-medium" data-testid="btn-print-invoices-registry">
								<Printer size={14} className="text-teal-600" /> <span>Печать реестра</span>
							</button>
						</div>
					)}
				</div>

				{onClose && (
					<button type="button" onClick={onClose} className="secondary-button w-8 h-8 p-0 rounded-lg shrink-0 flex items-center justify-center text-[var(--muted,#64748b)]" aria-label="Закрыть реестр счетов" data-testid="btn-invoices-close">
						<X size={15} />
					</button>
				)}
			</div>
		</div>
	);
};
