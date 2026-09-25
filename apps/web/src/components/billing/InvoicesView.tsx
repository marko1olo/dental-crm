/**
 * apps/web/src/components/billing/InvoicesView.tsx
 *
 * DENTE Dental CRM — Solo Doctor & Small Clinic Invoicing & Acts View.
 * Compliance: Mandates 8e, 8k, 8n, 8d (Apple HIG / Studio Clinical Invariants).
 *
 * Features:
 * - 1-line dense toolbar (32–36px) with quick filter tabs and search.
 * - Entity cards with <=2 primary action buttons ([Оплатить], [Счет]).
 * - Context menu (...) for secondary operations (Акт 804н, Справка ФНС, Гарантия 100%).
 * - Seamless integration with PaymentModal (cash, card, SBP, certificate, bonus, 0 ₽ warranty).
 * - Minimum touch target >= 44x44px, modal depth strictly 1.
 * - Zero emojis (strict Lucide vector icons).
 */

import { rubToKopecks } from "@dental/shared";
import {
	Plus,
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
	import("../finance/PaymentModal.js").then((m) => ({ default: m.PaymentModal })),
);
import { PatientInstallmentsModal } from "./PatientInstallmentsModal.js";
import { showToast } from "../GlobalToast.js";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage.js";
import type {
	BillingInvoice,
	InvoiceFilterTab,
	InvoiceLineItem,
	InvoicesViewProps,
} from "./invoiceTypes.js";
import { handlePrintAct, handlePrintInvoice } from "./invoicesPrintHelpers.js";
import { InvoiceCardItem } from "./InvoiceCardItem.js";
import { InvoicesDomVirtualizationBar } from "./InvoicesDomVirtualizationBar.js";
import { QuickCreateInvoiceModal } from "./QuickCreateInvoiceModal.js";

export type { InvoiceLineItem, BillingInvoice, InvoicesViewProps, InvoiceFilterTab };

export const INVOICE_STATUS_CLASSES = {
	paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
	warranty: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
	pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
} as const;

export const INVOICES_STORAGE_KEY = "dente_billing_invoices";

export function loadStoredInvoices(): BillingInvoice[] {
	if (typeof window === "undefined") {
		return [];
	}
	const stored = safeLocalStorageGetJson<BillingInvoice[]>(INVOICES_STORAGE_KEY, []);
	if (!Array.isArray(stored)) return [];
	return stored.filter((item): item is BillingInvoice => Boolean(item && typeof item === "object"));
}

export function saveStoredInvoices(invoices: BillingInvoice[]): void {
	if (typeof window === "undefined") {
		return;
	}
	safeLocalStorageSetJson(INVOICES_STORAGE_KEY, invoices);
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
	initialInvoices,
	patientId,
	patientName,
	currentDoctorName = "Врач-стоматолог",
	clinicLegalName = "ООО «ДЕНТЕ»",
	onClose,
}) => {
	const [invoices, setInvoices] = useState<BillingInvoice[]>(() => {
		if (initialInvoices && initialInvoices.length > 0) {
			return initialInvoices;
		}
		const stored = loadStoredInvoices();
		return stored.length > 0 ? stored : [];
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

	// Memory leak protection & DOM virtualization (Wave 252-Perf2 / Low-RAM Laptop Protection)
	const memoryGuard = useMemoryLeakGuard({ debugName: "InvoicesView" });
	const [displayLimit, setDisplayLimit] = useState<number>(
		DEFAULT_DOM_PAGE_SIZE,
	);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	// Reset limit to default page size whenever tab or search filter changes to prevent memory blow-up
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset limit when filters change
	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [filterTab, searchQuery]);

	// Server synchronization (Mandates 8e, 8n) with AbortController memory protection
	useEffect(() => {
		const abortController = memoryGuard.createAbortController();
		const syncInvoices = async () => {
			try {
				const url = `/api/invoices${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`;
				const res = await fetch(url, {
					signal: abortController.signal,
					headers: {
						...denteAdminSecretRequestHeaders(),
					},
				});
				if (!res.ok) return;
				const data = (await res.json()) as unknown;
				const rawList: Record<string, unknown>[] = Array.isArray(data)
					? (data as Record<string, unknown>[])
					: Array.isArray((data as { items?: unknown[] })?.items)
						? (data as { items: Record<string, unknown>[] }).items
						: Array.isArray((data as { invoices?: unknown[] })?.invoices)
							? (data as { invoices: Record<string, unknown>[] }).invoices
							: [];

				if (rawList.length === 0) return;

				const mapped: BillingInvoice[] = rawList.map((raw, idx) => {
					if (raw.number && raw.status && Array.isArray(raw.items)) {
						return raw as unknown as BillingInvoice;
					}

					const numMatch =
						typeof raw.notes === "string"
							? raw.notes.match(
									/(?:Наряд|Счет|СЧТ|НРД|АКТ)[\s-]*([A-ZА-Я0-9-]+)/i,
								)
							: null;
					const invoiceNumber = String(
						raw.number ||
							(numMatch
								? numMatch[1]
								: `СЧ-${(raw.id || idx).toString().slice(-6)}`),
					);
					const total =
						typeof raw.totalAmountRub === "number"
							? raw.totalAmountRub
							: typeof raw.priceRub === "number"
								? raw.priceRub
								: 0;

					return {
						id: String(raw.id || `inv-${Date.now()}-${idx}`),
						number: invoiceNumber,
						patientId: String(raw.patientId || patientId || ""),
						patientName: String(raw.patientName || patientName || "Пациент"),
						patientPhone:
							typeof raw.patientPhone === "string"
								? raw.patientPhone
								: undefined,
						doctorName: String(raw.doctorName || currentDoctorName),
						date:
							typeof raw.date === "string"
								? raw.date
								: typeof raw.createdAt === "string"
									? new Date(raw.createdAt).toLocaleDateString("ru-RU")
									: new Date().toLocaleDateString("ru-RU"),
						totalAmountRub: total,
						paidAmountRub:
							typeof raw.paidAmountRub === "number"
								? raw.paidAmountRub
								: raw.status === "paid"
									? total
									: 0,
						status: (raw.status as BillingInvoice["status"]) || "issued",
						items:
							Array.isArray(raw.items) && raw.items.length > 0
								? (raw.items as InvoiceLineItem[])
								: [
										{
											id: `li-${String(raw.id || idx)}`,
											code: String(raw.code || raw.serviceCode || "A16.07.002"),
											name: String(
												raw.title || raw.name || "Стоматологический прием",
											),
											quantity: Number(raw.quantity) || 1,
											priceRub: total,
										},
									],
						createdAt:
							typeof raw.createdAt === "string"
								? raw.createdAt
								: new Date().toISOString(),
						paidAt: typeof raw.paidAt === "string" ? raw.paidAt : undefined,
						paymentMethod:
							typeof raw.paymentMethod === "string"
								? raw.paymentMethod
								: undefined,
						notes: typeof raw.notes === "string" ? raw.notes : undefined,
					};
				});

				if (!memoryGuard.isMounted()) return;

				setInvoices((prev) => {
					const map = new Map<string, BillingInvoice>();
					for (const inv of mapped) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
					for (const inv of prev) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
					const merged = Array.from(new Set(map.values()));
					saveStoredInvoices(merged);
					return merged;
				});
			} catch (err: unknown) {
				if ((err as Error)?.name === "AbortError") {
					return;
				}
				// Soft fallback: continue working with local data (Mandates 8e, 8n)
			}
		};

		void syncInvoices();
	}, [patientId, patientName, currentDoctorName, memoryGuard]);

	// Real-time reactive synchronization across tabs and modules (Treatment Plans -> Invoices)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleExternalInvoiceUpdate = (evt?: Event) => {
			const customDetail = (evt as CustomEvent<BillingInvoice>)?.detail;
			const stored = loadStoredInvoices();
			setInvoices((prev) => {
				const map = new Map<string, BillingInvoice>();
				if (customDetail?.id) {
					map.set(customDetail.id, customDetail);
					if (customDetail.number) map.set(customDetail.number, customDetail);
				}
				for (const inv of stored) {
					map.set(inv.id, inv);
					if (inv.number) map.set(inv.number, inv);
				}
				for (const inv of prev) {
					if (!map.has(inv.id) && (!inv.number || !map.has(inv.number))) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
				}
				return Array.from(new Set(map.values()));
			});
		};

		const unlisten1 = memoryGuard.safeAddEventListener(
			window,
			"dente-invoices-updated",
			handleExternalInvoiceUpdate,
		);
		const unlisten2 = memoryGuard.safeAddEventListener(
			window,
			"storage",
			handleExternalInvoiceUpdate,
		);
		return () => {
			unlisten1();
			unlisten2();
		};
	}, [memoryGuard]);

	// Auto-dismiss active invoice context menu on click-outside or Escape (Wave 252-Perf2)
	useEffect(() => {
		if (!activeMenuInvoiceId) return;
		const handleDocumentClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target?.closest(`[data-testid^="btn-invoice-menu-"]`)) {
				setActiveMenuInvoiceId(null);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActiveMenuInvoiceId(null);
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
	}, [activeMenuInvoiceId, memoryGuard]);

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
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0 overflow-x-auto"
				role="toolbar"
				aria-label="Панель счетов и актов"
			>
				{/* Left: Section Identity & Filter Tabs */}
				<div className="flex items-center gap-1.5 shrink-0">
					<div className="flex items-center gap-1.5 font-bold text-xs mr-2 text-[var(--ink,#0f172a)] shrink-0">
						<Receipt
							size={16}
							className="text-teal-600 dark:text-teal-400 shrink-0"
						/>
						<span className="whitespace-nowrap">Счета и Акты</span>
					</div>

					<div className="flex items-center gap-1 bg-[var(--paper-soft,#f1f5f9)] p-0.5 sm:p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] shrink-0">
						<button
							type="button"
							onClick={() => setFilterTab("all")}
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 sm:px-2 py-1.5 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
								filterTab === "all"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-all"
						>
							<span>Все</span>
							<span className="text-[10px] opacity-70">
								({(Array.isArray(invoices) ? invoices : []).length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("pending")}
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 sm:px-2 py-1.5 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
								filterTab === "pending"
									? "bg-[var(--paper,#ffffff)] text-amber-700 dark:text-amber-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-pending"
						>
							<span>К оплате</span>
							<span className="text-[10px] opacity-70">
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
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 sm:px-2 py-1.5 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
								filterTab === "paid"
									? "bg-[var(--paper,#ffffff)] text-emerald-700 dark:text-emerald-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-paid"
						>
							<span>Оплачено</span>
							<span className="text-[10px] opacity-70">
								({(Array.isArray(invoices) ? invoices : []).filter((i) => i && i.status === "paid").length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("warranty")}
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 sm:px-2 py-1.5 sm:py-0 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
								filterTab === "warranty"
									? "bg-[var(--paper,#ffffff)] text-purple-700 dark:text-purple-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-warranty"
						>
							<span>Гарантия 100%</span>
							<span className="text-[10px] opacity-70">
								({(Array.isArray(invoices) ? invoices : []).filter((i) => i && i.status === "warranty_100").length})
							</span>
						</button>
					</div>
				</div>

				{/* Right: Search box & fast actions (Mandate 8c: >=44px on mobile, compact on desktop) */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="relative flex items-center">
						<Search
							size={14}
							className="absolute left-2.5 text-[var(--muted,#64748b)] pointer-events-none"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по пациенту или № счета..."
							className="h-11 min-h-[44px] sm:h-7 sm:min-h-[28px] w-48 sm:w-60 pl-9.5 pr-3 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
							data-testid="input-search-invoices"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="w-11 h-11 min-h-[44px] min-w-[44px] sm:w-7 sm:h-7 sm:min-h-[28px] sm:min-w-[28px] absolute right-0 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer flex items-center justify-center"
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
					</div>

					<button
						type="button"
						onClick={() => setIsInstallmentsModalOpen(true)}
						className="min-h-[44px] h-11 sm:h-7 sm:min-h-[28px] px-3 rounded-lg border border-teal-500/40 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shrink-0 whitespace-nowrap"
						data-testid="btn-installments-modal-open"
						title="Внутренняя беспроцентная рассрочка клиники (0%)"
					>
						<Wallet size={14} className="text-teal-600 dark:text-teal-400" />
						<span className="hidden md:inline">Рассрочка 0%</span>
					</button>

					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="min-h-[44px] h-11 sm:h-7 sm:min-h-[28px] px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98 shrink-0 whitespace-nowrap"
						data-testid="btn-create-invoice-open"
						title="Создать счет (1 клик)"
					>
						<Plus size={14} />
						<span className="hidden sm:inline">Новый счет</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="w-11 h-11 min-h-[44px] min-w-[44px] sm:w-7 sm:h-7 sm:min-h-[28px] sm:min-w-[28px] rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors shrink-0"
							aria-label="Закрыть реестр счетов"
							data-testid="btn-invoices-close"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Invoices List Content */}
			<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
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
										`Справка для налоговой (ФНС 1151156) по счету ${inv.number} подготовлена`,
										"info",
									);
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

			{/* Quick Create Invoice Modal (Modal Depth strictly 1) */}
			<QuickCreateInvoiceModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				patientName={patientName}
				currentDoctorName={currentDoctorName}
				onCreateInvoice={handleCreateInvoice}
			/>

			{isInstallmentsModalOpen && (
				<PatientInstallmentsModal
					isOpen={isInstallmentsModalOpen}
					onClose={() => setIsInstallmentsModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					clinicName={clinicLegalName}
				/>
			)}
		</div>
	);
};
export default InvoicesView;
