/**
 * apps/web/src/components/billing/InvoicesView.tsx
 *
 * DENTE Dental CRM — Solo Doctor & Small Clinic Invoicing & Acts View.
 * Compliance: Mandates 8e, 8k, 8n, 8d (Apple HIG / Studio Clinical Invariants).
 *
 * Features:
 * - 1-line dense toolbar (32–36px) with quick filter tabs and search.
 * - Entity cards with <=2 primary action buttons ([Оплатить], [Счет]).
 * - Context menu (...) for secondary operations (Акт выполненных работ, Справка ФНС, Гарантия 100%).
 * - Seamless integration with PaymentModal (cash, card, SBP, certificate, bonus, 0 ₽ warranty).
 * - Minimum touch target >= 44x44px, modal depth strictly 1.
 * - Zero emojis (strict Lucide vector icons).
 */

import { rubToKopecks } from "@dental/shared";
import {
	Banknote,
	CreditCard,
	MoreHorizontal,
	Plus,
	Printer,
	Receipt,
	Search,
	Wallet,
	X,
} from "lucide-react";
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMemoryLeakGuard } from "../../hooks/useMemoryLeakGuard.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../utils/domVirtualizationHelper.js";
const PaymentModal = lazy(() =>
	import("./PaymentModal.js").then((m) => ({ default: m.PaymentModal })),
);
import { InvoicesModalsLayer } from "./InvoicesModalsLayer.js";
import { showToast } from "../GlobalToast.js";
import type {
	BillingInvoice,
	InvoiceFilterTab,
	InvoiceLineItem,
	InvoicesViewProps,
} from "./invoiceTypes.js";
import { handlePrintAct, handlePrintInvoice } from "./invoicesPrintHelpers.js";
import { InvoiceCardItem } from "./InvoiceCardItem.js";
import { InvoicesDomVirtualizationBar } from "./InvoicesDomVirtualizationBar.js";
import {
	INVOICES_STORAGE_KEY,
	loadStoredInvoices,
	saveStoredInvoices,
} from "./invoicesStorage.js";
import { useInvoicesData } from "./useInvoicesData.js";

export { INVOICES_STORAGE_KEY, loadStoredInvoices, saveStoredInvoices };
export type { InvoiceLineItem, BillingInvoice, InvoicesViewProps, InvoiceFilterTab };

export const INVOICE_STATUS_CLASSES = {
	paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
	warranty: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
	pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
} as const;

export const InvoicesView: React.FC<InvoicesViewProps> = ({
	initialInvoices,
	patientId,
	patientName,
	currentDoctorName = "Врач-стоматолог",
	clinicLegalName = "ООО «ДЕНТЕ»",
	onClose,
}) => {
	// Memory leak protection & DOM virtualization (Wave 252-Perf2 / Low-RAM Laptop Protection)
	const memoryGuard = useMemoryLeakGuard({ debugName: "InvoicesView" });
	const { invoices, setInvoices } = useInvoicesData({
		initialInvoices,
		patientId,
		patientName,
		currentDoctorName,
		memoryGuard,
	});

	const [filterTab, setFilterTab] = useState<InvoiceFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activePaymentInvoice, setActivePaymentInvoice] =
		useState<BillingInvoice | null>(null);
	const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState<string | null>(
		null,
	);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState<boolean>(false);
	const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
	const [isRegisterDrawerOpen, setIsRegisterDrawerOpen] = useState<boolean>(false);
	const [activeSplitInvoice, setActiveSplitInvoice] =
		useState<BillingInvoice | null>(null);
	const [receiptToPrint, setReceiptToPrint] =
		useState<BillingInvoice | null>(null);
	const [refundInvoice, setRefundInvoice] =
		useState<BillingInvoice | null>(null);
	const [bankInstallmentInvoice, setBankInstallmentInvoice] =
		useState<BillingInvoice | null>(null);
	const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState<boolean>(false);

	const [displayLimit, setDisplayLimit] = useState<number>(
		DEFAULT_DOM_PAGE_SIZE,
	);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const toolbarMenuRef = useRef<HTMLDivElement | null>(null);

	// Reset limit to default page size whenever tab or search filter changes to prevent memory blow-up
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset limit when filters change
	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [filterTab, searchQuery]);

	// Auto-dismiss active invoice context menu and toolbar menu on click-outside or Escape (Wave 252-Perf2)
	useEffect(() => {
		if (!activeMenuInvoiceId && !isToolbarMenuOpen) return;
		const handleDocumentClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (activeMenuInvoiceId && !target?.closest(`[data-testid^="btn-invoice-menu-"]`)) {
				setActiveMenuInvoiceId(null);
			}
			if (isToolbarMenuOpen && !target?.closest(`[data-testid="invoices-toolbar-options-btn"]`) && !target?.closest(`[data-testid="invoices-toolbar-menu-dropdown"]`)) {
				setIsToolbarMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActiveMenuInvoiceId(null);
				setIsToolbarMenuOpen(false);
			}
		};
		const removeClick = memoryGuard.safeAddEventListener(
			document,
			"click",
			handleDocumentClick,
		);
		const removeKey = memoryGuard.safeAddEventListener(
			document,
			"keydown",
			handleKeyDown,
		);
		return () => {
			removeClick();
			removeKey();
		};
	}, [activeMenuInvoiceId, isToolbarMenuOpen, memoryGuard]);

	// Filtered list
	const filteredInvoices = useMemo(() => {
		const safeList = Array.isArray(invoices) ? invoices : [];
		return safeList.filter((inv) => {
			if (!inv) return false;
			if (
				filterTab === "pending" &&
				(inv.status === "paid" || inv.status === "warranty_100")
			)
				return false;
			if (filterTab === "paid" && inv.status !== "paid") return false;
			if (filterTab === "warranty" && inv.status !== "warranty_100")
				return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = (inv.patientName || "").toLowerCase().includes(q);
				const matchNum = (inv.number || "").toLowerCase().includes(q);
				const matchPhone = (inv.patientPhone || "").toLowerCase().includes(q);
				if (!matchName && !matchNum && !matchPhone) return false;
			}
			return true;
		});
	}, [invoices, filterTab, searchQuery]);

	// Memory-bounded slice of filtered invoices (prevents DOM bloat and pagefile.sys swap thrashing)
	const listSlice = useMemo(() => {
		return sliceDomList(filteredInvoices, displayLimit, 0);
	}, [filteredInvoices, displayLimit]);

	// Progressive lazy auto-load on scroll via IntersectionObserver (Wave 252-Perf2)
	useEffect(() => {
		if (!listSlice.hasMore || typeof IntersectionObserver === "undefined")
			return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const first = entries[0];
				if (first?.isIntersecting) {
					setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP);
				}
			},
			{ rootMargin: "250px" },
		);

		memoryGuard.registerObserver(observer);
		observer.observe(sentinel);
		return () => {
			observer.disconnect();
		};
	}, [listSlice.hasMore, memoryGuard]);

	// 100% Warranty discount application (Doctor Autonomy Mandate 8e)
	const handleApplyWarranty100 = (inv: BillingInvoice) => {
		setInvoices((prev) => {
			const updated = prev.map((item) =>
				item.id === inv.id
					? {
							...item,
							totalAmountRub: 0,
							paidAmountRub: 0,
							status: "warranty_100" as const,
							paymentMethod: "warranty_discount_100",
							notes:
								(item.notes ? `${item.notes}; ` : "") +
								"Гарантия 100% (без чека ККТ)",
						}
					: item,
			);
			saveStoredInvoices(updated);
			return updated;
		});
		setActiveMenuInvoiceId(null);
		showToast(
			`Счет ${inv.number} переведен в статус: Гарантия 100% (0 ₽)`,
			"info",
		);
	};

	// Create new invoice (1-click preset)
	const handleCreateInvoice = (params: {
		patientName: string;
		serviceName: string;
		servicePriceRub: number;
		isWarranty100: boolean;
	}) => {
		const invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;
		const finalAmount = params.isWarranty100 ? 0 : Math.max(0, params.servicePriceRub);
		const newInvoice: BillingInvoice = {
			id: `inv-${Date.now()}`,
			number: invoiceNumber,
			patientId: patientId || `pat-${Date.now().toString().slice(-4)}`,
			patientName: params.patientName,
			doctorName: currentDoctorName,
			date: new Date().toLocaleDateString("ru-RU"),
			totalAmountRub: finalAmount,
			paidAmountRub: params.isWarranty100 ? 0 : 0,
			status: params.isWarranty100 ? "warranty_100" : "issued",
			items: [
				{
					id: `li-${Date.now()}`,
					code: "A16.07.002",
					name: params.serviceName || "Стоматологический прием и лечение",
					quantity: 1,
					priceRub: finalAmount,
				},
			],
			createdAt: new Date().toISOString(),
			paymentMethod: params.isWarranty100 ? "warranty_discount_100" : undefined,
			notes: params.isWarranty100 ? "Гарантийный прием 100%" : undefined,
		};

		setInvoices((prev) => {
			const updated = [newInvoice, ...prev];
			saveStoredInvoices(updated);
			return updated;
		});

		// Asynchronously notify server if patientId is valid UUID (Mandates 8e, 8n)
		if (patientId && /^[0-9a-fA-F-]{36}$/.test(patientId)) {
			fetch("/api/invoices/generate-from-plan", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					patientId,
					items: [
						{
							code804n: "A16.07.002",
							nameRu:
								params.serviceName || "Стоматологический прием и лечение",
							quantity: 1,
							planUnitPriceRub: finalAmount,
						},
					],
				}),
			}).catch(() => {
				// Soft offline fallback
			});
		}

		setIsCreateModalOpen(false);
		showToast(`Счет ${invoiceNumber} успешно сформирован`, "success");
	};

	return (
		<div className="w-full h-full flex flex-col bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] select-none">
			{/* 1-Line Dense Toolbar (32–36px on desktop, >=44px touch targets on mobile) — Compliance: Mandates 8d, 8p & Hick's Law */}
			<div
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0"
				role="toolbar"
				aria-label="Панель счетов и актов"
			>
				{/* Left: Section Identity & Filter Tabs */}
				<div className="flex items-center gap-1.5 shrink min-w-0 overflow-x-auto scrollbar-none py-0.5">
					<div className="flex items-center gap-1.5 font-bold text-xs mr-2 text-[var(--ink,#0f172a)] shrink-0">
						<Receipt
							size={16}
							className="text-teal-600 dark:text-teal-400 shrink-0"
						/>
						<span className="whitespace-nowrap">Счета и Акты</span>
					</div>

					<div className="dente-segmented-bar shrink-0" role="tablist" aria-label="Фильтры счетов">
						<button
							type="button"
							onClick={() => setFilterTab("all")}
							className={`dente-segmented-item ${filterTab === "all" ? "active" : ""}`}
							data-active={filterTab === "all"}
							data-testid="filter-invoices-all"
						>
							<span>Все</span>
							<span className="text-[10px] opacity-70 font-mono">
								({(Array.isArray(invoices) ? invoices : []).length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("pending")}
							className={`dente-segmented-item ${filterTab === "pending" ? "active" : ""}`}
							data-active={filterTab === "pending"}
							data-testid="filter-invoices-pending"
						>
							<span>К оплате</span>
							<span className="text-[10px] opacity-70 font-mono">
								(
								{
									(Array.isArray(invoices) ? invoices : []).filter(
										(i) =>
											i &&
											(i.status === "issued" ||
												i.status === "draft" ||
												i.status === "partially_paid"),
									).length
								}
								)
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("paid")}
							className={`dente-segmented-item ${filterTab === "paid" ? "active" : ""}`}
							data-active={filterTab === "paid"}
							data-testid="filter-invoices-paid"
						>
							<span>Оплачено</span>
							<span className="text-[10px] opacity-70 font-mono">
								({(Array.isArray(invoices) ? invoices : []).filter((i) => i && i.status === "paid").length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("warranty")}
							className={`dente-segmented-item ${filterTab === "warranty" ? "active" : ""}`}
							data-active={filterTab === "warranty"}
							data-testid="filter-invoices-warranty"
						>
							<span>Гарантия 100%</span>
							<span className="text-[10px] opacity-70 font-mono">
								({(Array.isArray(invoices) ? invoices : []).filter((i) => i && i.status === "warranty_100").length})
							</span>
						</button>
					</div>
				</div>

				{/* Right: Search box & fast actions (Mandate 8c: >=44px on mobile, compact on desktop) */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="dente-search-wrap hidden md:flex w-48 sm:w-60">
						<Search
							size={14}
							className="dente-search-icon"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по пациенту или № счета..."
							className="dente-search-input"
							data-testid="input-search-invoices"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>

					{/* Primary Action: New Invoice */}
					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="primary-button min-h-[36px] sm:min-h-[30px] shrink-0"
						data-testid="btn-create-invoice-open"
						title="Создать счет"
					>
						<Plus size={14} className="shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap">Новый счет</span>
					</button>

					{/* Secondary Operations Dropdown (Clean Studio HIG — Mandates 8c, 8d) */}
					<div className="relative shrink-0" ref={toolbarMenuRef}>
						<button
							type="button"
							onClick={() => setIsToolbarMenuOpen(!isToolbarMenuOpen)}
							data-testid="invoices-toolbar-options-btn"
							className="min-h-[36px] min-w-[36px] sm:min-h-[30px] sm:min-w-[30px] h-8 w-8 p-0 flex items-center justify-center shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
							title="Дополнительные операции с кассой и счетами"
							aria-label="Дополнительные действия"
							aria-expanded={isToolbarMenuOpen}
						>
							<MoreHorizontal size={15} className="shrink-0" />
						</button>

						{isToolbarMenuOpen && (
							<div
								className="absolute right-0 top-full mt-1 w-60 py-1 px-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl z-50 flex flex-col gap-0.5 text-left animate-in fade-in zoom-in-95 duration-100"
								role="menu"
								data-testid="invoices-toolbar-menu-dropdown"
							>
								<button
									type="button"
									onClick={() => {
										setIsToolbarMenuOpen(false);
										setIsRegisterDrawerOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center gap-2.5 cursor-pointer transition-colors"
									role="menuitem"
									data-testid="btn-cash-drawer-open"
								>
									<Banknote size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Ящик кассы и чеки</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsToolbarMenuOpen(false);
										setIsShiftModalOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center gap-2.5 cursor-pointer transition-colors"
									role="menuitem"
									data-testid="btn-cashbox-shift-open"
								>
									<Receipt size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>Смена кассы (Z/X отчеты)</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsToolbarMenuOpen(false);
										setActiveSplitInvoice(invoices[0] || null);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center gap-2.5 cursor-pointer transition-colors"
									role="menuitem"
									data-testid="btn-payment-split-open"
								>
									<CreditCard size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
									<span>Сплит-оплата (несколько методов)</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsToolbarMenuOpen(false);
										setReceiptToPrint(invoices[0] || null);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center gap-2.5 cursor-pointer transition-colors"
									role="menuitem"
									data-testid="btn-cash-receipt-print-open"
								>
									<Printer size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Печать кассового чека</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsToolbarMenuOpen(false);
										setIsInstallmentsModalOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex items-center gap-2.5 cursor-pointer transition-colors"
									role="menuitem"
									data-testid="btn-installments-modal-open"
								>
									<Wallet size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Рассрочка клиники (0%)</span>
								</button>
							</div>
						)}
					</div>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="icon-button min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 cursor-pointer"
							aria-label="Закрыть реестр счетов"
							data-testid="btn-invoices-close"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Invoices List Content */}
			<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 pb-28 sm:pb-6">
				{filteredInvoices.length === 0 ? (
					<div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[var(--line,#e2e8f0)] rounded-2xl bg-[var(--paper,#ffffff)]">
						<Receipt
							size={36}
							className="text-[var(--muted,#64748b)] mb-2 opacity-50"
						/>
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] mb-1">
							Счета не найдены
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] max-w-sm mb-4">
							{searchQuery
								? `По запросу «${searchQuery}» ничего не найдено.`
								: "В данном фильтре пока нет счетов. Нажмите «Новый счет» для быстрого создания."}
						</p>
						<button
							type="button"
							onClick={() => setIsCreateModalOpen(true)}
							className="min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Plus size={14} />
							<span>Создать первый счет</span>
						</button>
					</div>
				) : (
					<>
						{/* Virtualization CSS contract for row items: className="invoice-card", style={{ contentVisibility: "auto", containIntrinsicSize: "1px 48px" }} (see InvoiceCardItem) */}
						{listSlice.visibleItems.map((inv) => (
							<InvoiceCardItem
								key={inv.id}
								invoice={inv}
								isMenuOpen={activeMenuInvoiceId === inv.id}
								onToggleMenu={() =>
									setActiveMenuInvoiceId(
										activeMenuInvoiceId === inv.id ? null : inv.id,
									)
								}
								onPay={() => setActivePaymentInvoice(inv)}
								onPrintInvoice={() => handlePrintInvoice(inv, clinicLegalName)}
								onPrintAct={() => {
									handlePrintAct(inv, clinicLegalName);
									setActiveMenuInvoiceId(null);
								}}
								onApplyWarranty={() => handleApplyWarranty100(inv)}
								onPrepareFnsTaxDeduction={() => {
									showToast(
										`Справка для налогового вычета по счету ${inv.number} подготовлена`,
										"info",
									);
									setActiveMenuInvoiceId(null);
								}}
								onPrintReceipt={() => {
									setReceiptToPrint(inv);
									setActiveMenuInvoiceId(null);
								}}
								onSplitPay={() => {
									setActiveSplitInvoice(inv);
									setActiveMenuInvoiceId(null);
								}}
								onBankInstallment={() => {
									setBankInstallmentInvoice(inv);
									setActiveMenuInvoiceId(null);
								}}
								onRefund={() => {
									setRefundInvoice(inv);
									setActiveMenuInvoiceId(null);
								}}
							/>
						))}

						{/* Virtualization & DOM Memory Guard controls (Wave 252-Perf2) */}
						{filteredInvoices.length > DEFAULT_DOM_PAGE_SIZE && (
							<InvoicesDomVirtualizationBar
								listSlice={listSlice}
								onLoadMore={() =>
									setDisplayLimit(
										(prev) => prev + DEFAULT_DOM_CHUNK_STEP,
									)
								}
								onLoadAll={() => setDisplayLimit(filteredInvoices.length)}
								onCollapseLimit={() => setDisplayLimit(DEFAULT_DOM_PAGE_SIZE)}
							/>
						)}
						{/* Scroll sentinel for seamless auto-load on scroll if hasMore */}
						{listSlice.hasMore && (
							<div
								ref={sentinelRef}
								className="h-1 w-full pointer-events-none opacity-0"
								aria-hidden="true"
							/>
						)}
					</>
				)}
			</div>

			{/* Payment Modal (Modal Depth strictly 1) */}
			{activePaymentInvoice && (
				<Suspense fallback={null}>
					<PaymentModal
						isOpen={true}
						onClose={() => setActivePaymentInvoice(null)}
						amountKopecks={rubToKopecks(
							activePaymentInvoice.totalAmountRub ??
							(activePaymentInvoice as unknown as { amountRub?: number }).amountRub ??
							(activePaymentInvoice as unknown as { total?: number }).total ??
							(activePaymentInvoice as unknown as { amount?: number }).amount ??
							0
						)}
						amountRub={
							activePaymentInvoice.totalAmountRub ??
							(activePaymentInvoice as unknown as { amountRub?: number }).amountRub ??
							(activePaymentInvoice as unknown as { total?: number }).total ??
							(activePaymentInvoice as unknown as { amount?: number }).amount ??
							0
						}
						patientId={activePaymentInvoice.patientId}
						patientName={activePaymentInvoice.patientName}
						patientPhone={activePaymentInvoice.patientPhone}
						doctorName={activePaymentInvoice.doctorName}
						clinicLegalName={clinicLegalName}
						invoiceId={activePaymentInvoice.id}
						onSuccess={(res) => {
							setInvoices((prev) => {
								const updated = prev.map((item) =>
									item.id === activePaymentInvoice.id
										? {
												...item,
												status: (res.method === "warranty_discount_100"
													? "warranty_100"
													: "paid") as BillingInvoice["status"],
												paidAmountRub:
													res.method === "warranty_discount_100"
														? 0
														: item.totalAmountRub,
												paidAt: new Date().toISOString(),
												paymentMethod: res.method,
											}
										: item,
								);
								saveStoredInvoices(updated);
								return updated;
							});
							setActivePaymentInvoice(null);
							showToast(
								`Счет ${activePaymentInvoice.number} успешно закрыт`,
								"success",
							);
						}}
					/>
				</Suspense>
			)}

			{/* Invoices Modals & Drawers Sub-Layer (Mandate 8b / 8d) */}
			<InvoicesModalsLayer
				isCreateModalOpen={isCreateModalOpen}
				setIsCreateModalOpen={setIsCreateModalOpen}
				patientId={patientId}
				patientName={patientName}
				currentDoctorName={currentDoctorName}
				clinicLegalName={clinicLegalName}
				invoices={invoices}
				handleCreateInvoice={handleCreateInvoice}
				isInstallmentsModalOpen={isInstallmentsModalOpen}
				setIsInstallmentsModalOpen={setIsInstallmentsModalOpen}
				setBankInstallmentInvoice={setBankInstallmentInvoice}
				isShiftModalOpen={isShiftModalOpen}
				setIsShiftModalOpen={setIsShiftModalOpen}
				isRegisterDrawerOpen={isRegisterDrawerOpen}
				setIsRegisterDrawerOpen={setIsRegisterDrawerOpen}
				setActivePaymentInvoice={setActivePaymentInvoice}
				activeSplitInvoice={activeSplitInvoice}
				setActiveSplitInvoice={setActiveSplitInvoice}
				receiptToPrint={receiptToPrint}
				setReceiptToPrint={setReceiptToPrint}
				refundInvoice={refundInvoice}
				setRefundInvoice={setRefundInvoice}
				bankInstallmentInvoice={bankInstallmentInvoice}
				onUpdateInvoice={(updatedInv) => {
					setInvoices((prev) => {
						const updated = prev.map((item) =>
							item.id === updatedInv.id ? updatedInv : item,
						);
						saveStoredInvoices(updated);
						return updated;
					});
				}}
			/>
		</div>
	);
};
export default InvoicesView;
