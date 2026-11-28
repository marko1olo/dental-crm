/**
 * apps/web/src/components/inventory/InboundWaybillModal.tsx
 *
 * Каноническая SSOT-модалка оприходования накладной поставщика DENTE CRM.
 * Номер накладной, поставщик, выбор товаров из каталога, количество, цена закупки в копейках.
 * Мандаты 8b (Sweet Spot 250–350L), 8e (Автономия), 8n (Оприходование), 8am (1 Primary CTA var(--teal)), 8x (Живой язык).
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Loader2, PackagePlus, X, Zap, Box } from "lucide-react";
import { generateUuidV7, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { InboundWaybillItemsTable } from "./InboundWaybillItemsTable.js";
import { CANONICAL_DENTAL_SUPPLIERS } from "./acceptanceWaybills/acceptanceCanonicalSuppliers.js";
import { generateAcceptanceWaybillHtml } from "./acceptanceWaybills/acceptanceWaybillPrintDocument.js";
import { createWaybillItem } from "./acceptanceWaybills/acceptanceWaybillItemFactory.js";
import type { AcceptanceWaybillDocument } from "./acceptanceWaybillsTypes.js";

function printHtmlViaHiddenIframe(htmlContent: string, documentTitle = "Приходная накладная"): void {
	if (typeof document === "undefined") return;
	const iframe = document.createElement("iframe");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.border = "0";
	iframe.title = documentTitle;
	document.body.appendChild(iframe);
	const iframeDoc = iframe.contentWindow?.document;
	if (!iframeDoc) {
		if (document.body.contains(iframe)) document.body.removeChild(iframe);
		return;
	}
	iframeDoc.open();
	iframeDoc.write(htmlContent);
	iframeDoc.close();
	setTimeout(() => {
		try {
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
		} catch (e) {
			clientLogger.warn("[InboundWaybillModal] Iframe print error", e, { module: "Inventory" });
		} finally {
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1000);
		}
	}, 200);
}

export interface InboundInvoiceItem {
	id: string;
	inventoryItemId?: string | undefined;
	name: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	unitCostRub?: number | string | undefined;
	unit?: string | undefined;
	lotNumber?: string | undefined;
	expirationDate?: string | undefined;
}

export type InboundWaybillLineItem = InboundInvoiceItem;

export interface InitialWaybillItemData {
	id?: string | undefined;
	inventoryItemId?: string | undefined;
	itemId?: string | undefined;
	name?: string | undefined;
	quantity?: number | string | undefined;
	unitPriceKopecks?: number | undefined;
	unitCostRub?: number | string | undefined;
	priceRub?: number | string | undefined;
	unit?: string | undefined;
	batchNumber?: string | undefined;
	lotNumber?: string | undefined;
	lot?: string | undefined;
	expirationDate?: string | undefined;
}

export interface InitialWaybillData {
	waybillNumber?: string | undefined;
	supplierName?: string | undefined;
	supplier?: { name?: string | undefined } | undefined;
	receiptDate?: string | undefined;
	items?: readonly InitialWaybillItemData[] | undefined;
}

export interface InboundWaybillModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: InitialWaybillData | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly unitCostRub?: string | number | null | undefined;
		readonly unit?: string | null | undefined;
		readonly sku?: string | null | undefined;
		readonly stockQuantity?: number | string | null | undefined;
	}[] | undefined;
	readonly onInvoicePosted?: ((doc: unknown) => void | Promise<void>) | undefined;
	readonly onWaybillPosted?: ((doc: unknown) => void | Promise<void>) | undefined;
	readonly getHeaders?: ((extra?: Record<string, string> | undefined) => Record<string, string>) | undefined;
}

export type WarehouseInboundInvoiceModalProps = InboundWaybillModalProps;
export type AcceptanceWaybillsModalProps = InboundWaybillModalProps;

const DEFAULT_SUPPLIERS = CANONICAL_DENTAL_SUPPLIERS.map((s) => s.name);

const PRESETS = [
	{ label: "Септанест", items: [{ name: "Септанест с адреналином 1:100 000 (50 карпул/уп)", quantity: 5, priceRub: 5400, unit: "упак", lot: "SEPT-2026-A", exp: "2028-12-31" }] },
	{ label: "Filtek", items: [{ name: "Filtek Ultimate A2 (шприц 4г)", quantity: 10, priceRub: 3200, unit: "шт.", lot: "FLTK-2026-X", exp: "2027-10-31" }] },
	{ label: "OptiBond", items: [{ name: "OptiBond FL набор", quantity: 2, priceRub: 6800, unit: "набор", lot: "OPT-2026-F", exp: "2027-05-31" }] },
	{ label: "ProTaper", items: [{ name: "ProTaper Gold ассорти", quantity: 5, priceRub: 2900, unit: "упак", lot: "PTG-2026-G", exp: "2029-01-31" }] },
];

function buildInitialInvoiceNumber(initialWaybill?: InitialWaybillData): string {
	return initialWaybill?.waybillNumber || `Приходная накладная № ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-1`;
}

function buildInitialSupplierName(initialWaybill?: InitialWaybillData): string {
	return initialWaybill?.supplier?.name || initialWaybill?.supplierName || "";
}

function buildInitialReceiptDate(initialWaybill?: InitialWaybillData): string {
	return initialWaybill?.receiptDate || new Date().toISOString().slice(0, 10);
}

function buildInitialLines(initialWaybill?: InitialWaybillData): InboundInvoiceItem[] {
	if (initialWaybill?.items?.length) {
		return initialWaybill.items.map((it, idx: number) => ({
			id: it.id || `line-${idx}`,
			inventoryItemId: it.inventoryItemId || it.itemId,
			name: it.name || "",
			quantity: Number(it.quantity) || 1,
			priceRub: Number(it.unitPriceKopecks ? kopecksToRubles(it.unitPriceKopecks) : (it.unitCostRub || it.priceRub)) || 0,
			priceKopecks: Number(it.unitPriceKopecks || (it.unitCostRub ? rublesToKopecks(Number(it.unitCostRub)) : 0)) || 0,
			unit: it.unit || "шт.",
			lotNumber: it.batchNumber || it.lotNumber || it.lot || `LOT-${idx + 1}`,
			expirationDate: it.expirationDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
		}));
	}
	return [
		{
			id: "line-1",
			name: "",
			quantity: 1,
			priceRub: 0,
			priceKopecks: 0,
			unit: "шт.",
			lotNumber: "",
			expirationDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
		},
	];
}

export const InboundWaybillModal: React.FC<InboundWaybillModalProps> = ({
	isOpen,
	onClose,
	organizationId = "",
	initialWaybill,
	inventoryItems = [],
	onInvoicePosted,
	onWaybillPosted,
	getHeaders,
}) => {
	const defaultId = useId();
	const [invoiceNumber, setInvoiceNumber] = useState(() => buildInitialInvoiceNumber(initialWaybill));
	const [supplierName, setSupplierName] = useState(() => buildInitialSupplierName(initialWaybill));
	const [receiptDate, setReceiptDate] = useState(() => buildInitialReceiptDate(initialWaybill));
	const [isPosting, setIsPosting] = useState(false);
	const [errorBanner, setErrorBanner] = useState<string | null>(null);
	const [isAddingNewItem, setIsAddingNewItem] = useState(false);
	const [newItemName, setNewItemName] = useState("");
	const [newItemUnit, setNewItemUnit] = useState("шт.");
	const [newItemCost, setNewItemCost] = useState("1000");
	const [lines, setLines] = useState<InboundInvoiceItem[]>(() => buildInitialLines(initialWaybill));

	const wasOpenRef = useRef(false);

	useEffect(() => {
		const justOpened = isOpen && !wasOpenRef.current;
		const justClosed = !isOpen && wasOpenRef.current;
		wasOpenRef.current = isOpen;
		if (!justOpened && !justClosed) return;
		setInvoiceNumber(buildInitialInvoiceNumber(initialWaybill));
		setSupplierName(buildInitialSupplierName(initialWaybill));
		setReceiptDate(buildInitialReceiptDate(initialWaybill));
		setLines(buildInitialLines(initialWaybill));
		setErrorBanner(null);
		setIsAddingNewItem(false);
		setNewItemName("");
		setNewItemUnit("шт.");
		setNewItemCost("1000");
	}, [isOpen, initialWaybill]);

	if (!isOpen) return null;

	const handleAddLine = () => {
		setLines((prev) => [...prev, { id: `line-${Date.now()}`, name: "", quantity: 1, priceRub: 0, priceKopecks: 0, unit: "шт." }]);
	};

	const handleRemoveLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

	const handleUpdateLine = (id: string, field: "name" | "quantity" | "priceRub" | "unit" | "lotNumber" | "expirationDate", val: string | number) => {
		setLines((prev) => prev.map((l) => {
			if (l.id !== id) return l;
			const updated = { ...l, [field]: val };
			if (field === "priceRub") {
				const rub = Math.max(0, Number(val) || 0);
				updated.priceRub = rub;
				updated.priceKopecks = rublesToKopecks(rub);
				updated.unitCostRub = rub;
			}
			if (field === "quantity") {
				updated.quantity = Math.max(0, Number(val) || 0);
			}
			if (field === "name") {
				const matched = inventoryItems.find((it) => it.name.toLowerCase() === String(val).toLowerCase());
				if (matched) {
					updated.inventoryItemId = matched.id;
					if (matched.unit) updated.unit = matched.unit;
					if (matched.unitCostRub) {
						const rub = Number(matched.unitCostRub);
						updated.priceRub = rub;
						updated.priceKopecks = rublesToKopecks(rub);
						updated.unitCostRub = rub;
					}
				}
			}
			return updated;
		}));
	};

	const handleApplyPreset = (preset: typeof PRESETS[0]) => {
		setLines(preset.items.map((it, idx) => ({
			id: `preset-${idx}-${Date.now()}`,
			name: it.name,
			quantity: it.quantity,
			priceRub: it.priceRub,
			priceKopecks: rublesToKopecks(it.priceRub),
			unit: it.unit,
			lotNumber: it.lot,
			expirationDate: it.exp,
		})));
	};

	const handleCreateNewCatalogItem = () => {
		if (!newItemName.trim()) return;
		const cost = Math.max(0, parseFloat(newItemCost) || 0);
		setLines((prev) => [
			...prev,
			{
				id: `new-${Date.now()}`,
				name: newItemName.trim(),
				quantity: 1,
				priceRub: cost,
				priceKopecks: rublesToKopecks(cost),
				unit: newItemUnit,
				lotNumber: `LOT-${Date.now().toString().slice(-4)}`,
				expirationDate: "2028-12-31",
			},
		]);
		setNewItemName("");
		setIsAddingNewItem(false);
	};

	const totalKopecks = useMemo(
		() =>
			Math.round(
				lines.reduce(
					(acc, l) => acc + Math.round((Number(l.quantity) || 0) * (Number(l.priceKopecks) || 0)),
					0,
				),
			),
		[lines],
	);
	const totalRub = kopecksToRubles(totalKopecks);

	const handlePrintWaybill = () => {
		const supplierObj = CANONICAL_DENTAL_SUPPLIERS.find(
			(s) => s.name.toLowerCase() === supplierName.toLowerCase(),
		) || {
			id: `sup-${supplierName || "custom"}`,
			name: supplierName || "Стоматологический поставщик",
			inn: "",
			isPreferred: false,
		};

		const waybillDoc: AcceptanceWaybillDocument = {
			id: `wb-print-${Date.now()}`,
			waybillNumber: invoiceNumber,
			receiptDate,
			supplier: supplierObj,
			warehouseName: "Основной склад",
			status: "posted",
			items: lines.map((l, idx) => {
				const qty = Number(l.quantity) || 1;
				const costKopecks = Number(l.priceKopecks) || 0;
				return createWaybillItem({
					id: l.id || `line-${idx}`,
					inventoryItemId: l.inventoryItemId,
					name: l.name || "Материал стоматологический",
					category: "Расходные",
					unit: l.unit || "шт.",
					batchNumber: l.lotNumber || `LOT-${idx + 1}`,
					expirationDate: l.expirationDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
					quantity: qty,
					unitPriceKopecks: costKopecks,
					vatRate: 0,
				});
			}),
			totals: {
				totalPositions: lines.length,
				totalQuantity: lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0),
				subtotalKopecks: totalKopecks,
				totalVatKopecks: 0,
				totalCostKopecks: totalKopecks,
				subtotalRubles: totalRub,
				totalVatRubles: 0,
				totalCostRubles: totalRub,
			},
			receiverFullName: "Ответственный за снабжение",
			receiverPosition: "Ответственный за снабжение",
			postedAt: new Date().toISOString(),
		};
		const html = generateAcceptanceWaybillHtml(waybillDoc);
		printHtmlViaHiddenIframe(html, `Приходная_накладная_${invoiceNumber}`);
	};

	const handleExportCsv = () => {
		const headers = ["Наименование", "Количество", "Ед. изм.", "Цена (руб.)", "Сумма (руб.)", "Партия", "Срок годности"];
		const rows = lines.map((l) => [
			`"${(l.name || "").replace(/"/g, '""')}"`,
			l.quantity,
			`"${l.unit || "шт."}"`,
			l.priceRub,
			l.quantity * l.priceRub,
			`"${l.lotNumber || ""}"`,
			`"${l.expirationDate || ""}"`,
		]);
		const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `Накладная_${invoiceNumber.replace(/[^\wа-яА-Я0-9_-]/g, "_")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Мягкий овердрафт индикация (Мандат 8n)
	const negativeItem = inventoryItems.find((it) => Number(it.stockQuantity ?? 0) < 0);

	const handlePostInvoice = async () => {
		setIsPosting(true);
		setErrorBanner(null);
		try {
			const idempotencyHeaders = {
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			};
			const headers = getHeaders
				? getHeaders(idempotencyHeaders)
				: denteClinicalMutationHeaders(idempotencyHeaders);
			const payload = {
				waybillNumber: invoiceNumber,
				supplierName,
				receiptDate,
				items: lines.map((l) => ({
					...(l.inventoryItemId ? { inventoryItemId: l.inventoryItemId } : {}),
					name: l.name,
					quantity: Number(l.quantity) || 1,
					purchasePriceKopecks: l.priceKopecks,
					unitPriceKopecks: l.priceKopecks,
					purchasePricePerUnit: l.priceRub,
					unit: l.unit || "шт.",
					batchNumber: l.lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
					lotNumber: l.lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
					expirationDate: l.expirationDate || "2028-12-31",
				})),
			};

			const url = organizationId ? `/api/inventory/${organizationId}/acceptance-waybill` : `/api/inventory/acceptance-waybill`;
			const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

			if (!res.ok) {
				let errorMessage = "Ошибка проведения накладной";
				try {
					const errorJson = await res.json();
					errorMessage = errorJson.error || errorJson.message || `Ошибка сервера (${res.status})`;
				} catch (parseErr) {
					clientLogger.warn("[InboundWaybillModal] Failed to parse error JSON", parseErr, { module: "Inventory" });
					errorMessage = `Ошибка сервера (${res.status} ${res.statusText})`;
				}
				setErrorBanner(errorMessage);
				return;
			}

			let resData: unknown = payload;
			try {
				resData = await res.json();
			} catch (parseErr) {
				clientLogger.warn("[InboundWaybillModal] Non-JSON success response; falling back to submitted payload", parseErr, { module: "Inventory" });
			}
			if (onInvoicePosted) await onInvoicePosted(resData);
			if (onWaybillPosted) await onWaybillPosted(resData);
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setErrorBanner(msg || "Ошибка проведения накладной");
		} finally {
			setIsPosting(false);
		}
	};

	const modal = (
		<div
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto overflow-x-clip max-w-full animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-invoice-title"
			data-testid="warehouse-inbound-invoice-modal"
			data-cy="inbound-waybill-modal"
			onClick={(e) => { if (e.target === e.currentTarget && !isPosting) onClose(); }}
		>
			<div
				className="relative sm:my-auto w-full sm:w-[95%] sm:max-w-[880px] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--ink)]"
				data-testid="inbound-waybill-modal"
			>
				<div className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto my-3 sm:hidden pointer-events-none shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
							<PackagePlus className="w-4 h-4 shrink-0" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h3 id="inbound-invoice-title" className="text-base font-semibold text-[var(--ink)] truncate">Приходная накладная поставщика</h3>
								<span className="h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 shrink-0 bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
									FEFO контроль
								</span>
							</div>
							<p className="text-xs text-[var(--ink-muted)] truncate">Поступление материалов на склад и погашение овердрафта</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4 shrink-0" />
					</button>
				</div>

				{/* Тело модалки */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{errorBanner && (
						<div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-[var(--danger)] text-xs flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorBanner}</span>
						</div>
					)}

					{negativeItem && (
						<div className="p-3 rounded-xl bg-[var(--warning-soft)] border border-[var(--warning-soft)] text-[var(--warning)] text-xs flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 shrink-0" />
							<span>Зафиксирован дефицит у кресла (мягкий овердрафт: {negativeItem.stockQuantity} ед.): оприходование накладной покроет дефицит.</span>
						</div>
					)}

					{/* Реквизиты накладной */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)]">
						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted)] mb-1">Номер приходной накладной</label>
							<input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full h-11 sm:h-9 px-3 text-base sm:text-sm bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none" data-testid="inbound-invoice-number-input" />
						</div>
						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted)] mb-1">Поставщик</label>
							<input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} list={`sup-list-${defaultId}`} className="w-full h-11 sm:h-9 px-3 text-base sm:text-sm bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none" data-testid="inbound-invoice-supplier-input" />
							<datalist id={`sup-list-${defaultId}`}>
								{DEFAULT_SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
							</datalist>
						</div>
						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted)] mb-1">Дата поступления</label>
							<input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="w-full h-11 sm:h-9 px-3 text-base sm:text-sm bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none" data-testid="inbound-invoice-date-input" />
						</div>
					</div>

					{/* Быстрые шаблоны и создание карточки */}
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
							<span className="text-xs font-medium text-[var(--ink-muted)] shrink-0">Шаблон:</span>
							{PRESETS.map((p) => (
								<button key={p.label} type="button" onClick={() => handleApplyPreset(p)} className="h-11 sm:h-8 px-2.5 rounded-xl sm:rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shrink-0 cursor-pointer">
									<Zap className="w-3.5 h-3.5 shrink-0" /><span>{p.label}</span>
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={() => setIsAddingNewItem(!isAddingNewItem)}
							className="h-11 sm:h-8 px-2.5 rounded-xl sm:rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] ml-auto cursor-pointer shrink-0"
						>
							<Box className="w-3.5 h-3.5 shrink-0" />
							<span>{isAddingNewItem ? "Скрыть форму карточки" : "+ Новый материал в каталог"}</span>
						</button>
					</div>

					{/* Секция быстрого добавления новой карточки номенклатуры */}
					{isAddingNewItem && (
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] space-y-2.5 animate-in fade-in">
							<div className="text-xs font-semibold text-[var(--ink)]">Быстрая карточка нового материала</div>
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
								<input
									type="text"
									placeholder="Наименование материала"
									value={newItemName}
									onChange={(e) => setNewItemName(e.target.value)}
									className="sm:col-span-2 h-11 sm:h-9 px-3 bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none"
								/>
								<input
									type="text"
									placeholder="Ед. (шт, уп)"
									value={newItemUnit}
									onChange={(e) => setNewItemUnit(e.target.value)}
									className="h-11 sm:h-9 px-3 bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none"
								/>
								<div className="flex items-center gap-2">
									<input
										type="number"
										placeholder="Цена ₽"
										value={newItemCost}
										onChange={(e) => setNewItemCost(e.target.value)}
										className="w-full h-11 sm:h-9 px-3 bg-[var(--paper)] text-[var(--ink)] rounded-xl sm:rounded-lg border border-[var(--line)] focus:outline-none"
									/>
									<button
										type="button"
										onClick={handleCreateNewCatalogItem}
										className="h-11 sm:h-9 px-3.5 text-xs font-medium shrink-0 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] rounded-xl sm:rounded-lg transition-colors cursor-pointer"
									>
										Добавить
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Таблица позиций из каталога склада (InboundWaybillItemsTable Мандат 8b/8aq) */}
					<InboundWaybillItemsTable
						lines={lines}
						inventoryItems={inventoryItems}
						onAddLine={handleAddLine}
						onRemoveLine={handleRemoveLine}
						onUpdateLine={handleUpdateLine}
						datalistId={`cat-items-${defaultId}`}
					/>
				</div>

				{/* Футер: ровно 1 Primary CTA кнопка var(--primary), остальные вторичные */}
				<div className="min-h-[64px] px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 flex-wrap shrink-0">
						<span className="text-sm font-medium text-[var(--ink-muted)]">Итого по накладной:</span>
						<strong className="text-base font-medium text-[var(--ink)] font-mono tracking-tight text-right tabular-nums">{totalRub.toLocaleString("ru-RU")} ₽</strong>
						<button type="button" onClick={handlePrintWaybill} className="h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0" title="Печать приходной накладной" data-testid="print-waybill">
							Печать накладной
						</button>
						<button type="button" onClick={handleExportCsv} className="h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shrink-0" title="Экспорт накладной в CSV" data-testid="btn-export-invoice-csv">CSV</button>
					</div>
					<div className="flex items-center gap-3 shrink-0 ml-auto w-full sm:w-auto justify-end">
						<button type="button" onClick={onClose} className="h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0">
							Отмена
						</button>
						<button
							type="button"
							onClick={handlePostInvoice}
							className="h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
							data-testid="btn-post-acceptance-waybill"
							data-cy="btn-post-inbound-invoice"
						>
							{isPosting ? (
								<><Loader2 className="w-4 h-4 shrink-0 animate-spin" /><span className="whitespace-nowrap">Проведение...</span></>
							) : (
								<><CheckCircle2 className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">Оприходовать накладную</span></>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document === "undefined" ? modal : createPortal(modal, document.body);
};

// Канонические SSOT алиасы (Мандаты 8b, 8e, 8n, 8s: ликвидация дублирующих накладных)
export { InboundWaybillModal as default };
export { InboundWaybillModal as WarehouseInboundInvoiceModal };
export { InboundWaybillModal as AcceptanceWaybillsModal };
export { InboundWaybillModal as InventoryInboundInvoiceModal };
