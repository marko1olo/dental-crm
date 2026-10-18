/**
 * apps/web/src/components/billing/invoices/useInvoicesViewLogic.ts
 *
 * Filter, search, and action logic for InvoicesView.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { DEFAULT_DOM_PAGE_SIZE, DEFAULT_DOM_CHUNK_STEP, sliceDomList } from "../../../utils/domVirtualizationHelper.js";
import { saveStoredInvoices } from "../invoicesStorage.js";
import { showToast } from "../../GlobalToast.js";
import type { BillingInvoice, InvoiceFilterTab } from "../invoiceTypes.js";

export function useInvoicesViewLogic(
	invoices: BillingInvoice[],
	setInvoices: React.Dispatch<React.SetStateAction<BillingInvoice[]>>,
	memoryGuard: any,
) {
	const [filterTab, setFilterTab] = useState<InvoiceFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState<string | null>(null);
	const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState<boolean>(false);
	const [displayLimit, setDisplayLimit] = useState<number>(DEFAULT_DOM_PAGE_SIZE);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const toolbarMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => { setDisplayLimit(DEFAULT_DOM_PAGE_SIZE); }, [filterTab, searchQuery]);

	useEffect(() => {
		if (!activeMenuInvoiceId && !isToolbarMenuOpen) return;
		const handleDocumentClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (activeMenuInvoiceId && !target?.closest(`[data-testid^="btn-invoice-menu-"]`)) setActiveMenuInvoiceId(null);
			if (isToolbarMenuOpen && !target?.closest(`[data-testid="invoices-toolbar-options-btn"]`) && !target?.closest(`[data-testid="invoices-toolbar-menu-dropdown"]`)) setIsToolbarMenuOpen(false);
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { setActiveMenuInvoiceId(null); setIsToolbarMenuOpen(false); }
		};
		const removeClick = memoryGuard.safeAddEventListener(document, "click", handleDocumentClick);
		const removeKey = memoryGuard.safeAddEventListener(document, "keydown", handleKeyDown);
		return () => { removeClick(); removeKey(); };
	}, [activeMenuInvoiceId, isToolbarMenuOpen, memoryGuard]);

	const filteredInvoices = useMemo(() => {
		const safeList = Array.isArray(invoices) ? invoices : [];
		return safeList.filter((inv) => {
			if (!inv) return false;
			if (filterTab === "pending" && (inv.status === "paid" || inv.status === "warranty_100")) return false;
			if (filterTab === "paid" && inv.status !== "paid") return false;
			if (filterTab === "warranty" && inv.status !== "warranty_100") return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				return (inv.patientName || "").toLowerCase().includes(q) || (inv.number || "").toLowerCase().includes(q) || (inv.patientPhone || "").toLowerCase().includes(q);
			}
			return true;
		});
	}, [invoices, filterTab, searchQuery]);

	const listSlice = useMemo(() => sliceDomList(filteredInvoices, displayLimit, 0), [filteredInvoices, displayLimit]);

	useEffect(() => {
		if (!listSlice.hasMore || typeof IntersectionObserver === "undefined") return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP);
		}, { rootMargin: "250px" });
		memoryGuard.registerObserver(observer);
		observer.observe(sentinel);
		return () => { observer.disconnect(); };
	}, [listSlice.hasMore, memoryGuard]);

	const handleApplyWarranty100 = (inv: BillingInvoice) => {
		setInvoices((prev) => {
			const updated = prev.map((item) =>
				item.id === inv.id ? { ...item, totalAmountRub: 0, paidAmountRub: 0, status: "warranty_100" as const, paymentMethod: "warranty_discount_100", notes: (item.notes ? `${item.notes}; ` : "") + "Гарантия 100% (без чека ККТ)" } : item,
			);
			saveStoredInvoices(updated);
			return updated;
		});
		setActiveMenuInvoiceId(null);
		showToast(`Счет ${inv.number} переведен в статус: Гарантия 100% (0 ₽)`, "info");
	};

	return {
		filterTab, setFilterTab, searchQuery, setSearchQuery, activeMenuInvoiceId, setActiveMenuInvoiceId,
		isToolbarMenuOpen, setIsToolbarMenuOpen, listSlice, sentinelRef, toolbarMenuRef,
		handleApplyWarranty100, setDisplayLimit,
	};
}
