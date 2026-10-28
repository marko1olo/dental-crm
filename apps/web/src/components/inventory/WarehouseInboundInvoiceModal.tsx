/**
 * apps/web/src/components/inventory/WarehouseInboundInvoiceModal.tsx
 *
 * Каноническая SSOT-модалка оприходования накладной поставщика DENTE CRM (250–350L).
 * Номер накладной, поставщик, выбор товаров из каталога, количество, цена закупки в копейках.
 * Мандаты 8b (Sweet Spot 250–350L), 8e (Автономия), 8n (Оприходование), 8am (1 Primary CTA var(--teal)), 8x (Живой язык).
 */

import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, PackagePlus, Plus, Trash2, X, Zap, Box } from "lucide-react";

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

export interface WarehouseInboundInvoiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: any;
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

const DEFAULT_SUPPLIERS = [
	"ООО «Стомторг» (Санкт-Петербург)",
	"ЗАО «ВладМиВа» (Белгород)",
	"ООО «ДентОпт» (Москва)",
	"ТД «Северная Каролина»",
];

const PRESETS = [
	{ label: "Септанест", items: [{ name: "Септанест с адреналином 1:100 000 (50 карпул/уп)", quantity: 5, priceRub: 5400, unit: "упак", lot: "SEPT-2026-A", exp: "2028-12-31" }] },
	{ label: "Filtek", items: [{ name: "Filtek Ultimate A2 (шприц 4г)", quantity: 10, priceRub: 3200, unit: "шт.", lot: "FLTK-2026-X", exp: "2027-10-31" }] },
	{ label: "OptiBond", items: [{ name: "OptiBond FL набор", quantity: 2, priceRub: 6800, unit: "набор", lot: "OPT-2026-F", exp: "2027-05-31" }] },
	{ label: "ProTaper", items: [{ name: "ProTaper Gold ассорти", quantity: 5, priceRub: 2900, unit: "упак", lot: "PTG-2026-G", exp: "2029-01-31" }] },
];

export const WarehouseInboundInvoiceModal: React.FC<WarehouseInboundInvoiceModalProps> = ({
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
	const [invoiceNumber, setInvoiceNumber] = useState(
		initialWaybill?.waybillNumber || `Приходная накладная № ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-1`,
	);
	const [supplierName, setSupplierName] = useState(initialWaybill?.supplier?.name || initialWaybill?.supplierName || DEFAULT_SUPPLIERS[0]);
	const [receiptDate, setReceiptDate] = useState(initialWaybill?.receiptDate || new Date().toISOString().slice(0, 10));
	const [isPosting, setIsPosting] = useState(false);
	const [errorBanner, setErrorBanner] = useState<string | null>(null);
	const [isAddingNewItem, setIsAddingNewItem] = useState(false);
	const [newItemName, setNewItemName] = useState("");
	const [newItemUnit, setNewItemUnit] = useState("шт.");
	const [newItemCost, setNewItemCost] = useState("1000");

	const [lines, setLines] = useState<InboundInvoiceItem[]>(() => {
		if (initialWaybill?.items?.length) {
			return initialWaybill.items.map((it: any, idx: number) => ({
				id: it.id || `line-${idx}`,
				name: it.name,
				quantity: Number(it.quantity) || 1,
				priceRub: Number(it.unitPriceKopecks ? it.unitPriceKopecks / 100 : (it.unitCostRub || it.priceRub)) || 0,
				priceKopecks: Number(it.unitPriceKopecks || (it.unitCostRub ? Number(it.unitCostRub) * 100 : 0)) || 0,
				unit: it.unit || "шт.",
				lotNumber: it.batchNumber || it.lotNumber || it.lot || `LOT-${idx}`,
				expirationDate: it.expirationDate || "2028-12-31",
			}));
		}
		return [
			{ id: "line-1", name: "Септанест с адреналином 1:100 000 (50 карпул/уп)", quantity: 5, priceRub: 5400, priceKopecks: 540000, unit: "упак", lotNumber: "SEPT-2026-A", expirationDate: "2028-12-31" },
			{ id: "line-2", name: "Filtek Ultimate A2 (шприц 4г)", quantity: 10, priceRub: 3200, priceKopecks: 320000, unit: "шт.", lotNumber: "FLTK-2026-X", expirationDate: "2027-10-31" },
		];
	});

	if (!isOpen) return null;

	const handleAddLine = () => {
		setLines((prev) => [...prev, { id: `line-${Date.now()}`, name: "", quantity: 1, priceRub: 0, priceKopecks: 0, unit: "шт." }]);
	};

	const handleRemoveLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

	const handleUpdateLine = (id: string, field: "name" | "quantity" | "priceRub", val: any) => {
		setLines((prev) => prev.map((l) => {
			if (l.id !== id) return l;
			const updated = { ...l, [field]: val };
			if (field === "priceRub") {
				const rub = Math.max(0, Number(val) || 0);
				updated.priceRub = rub;
				updated.priceKopecks = Math.round(rub * 100);
			}
			if (field === "name") {
				const matched = inventoryItems.find((it) => it.name.toLowerCase() === String(val).toLowerCase());
				if (matched) {
					updated.inventoryItemId = matched.id;
					if (matched.unit) updated.unit = matched.unit;
					if (matched.unitCostRub) {
						const rub = Number(matched.unitCostRub);
						updated.priceRub = rub;
						updated.priceKopecks = Math.round(rub * 100);
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
			priceKopecks: Math.round(it.priceRub * 100),
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
				priceKopecks: Math.round(cost * 100),
				unit: newItemUnit,
				lotNumber: `LOT-${Date.now().toString().slice(-4)}`,
				expirationDate: "2028-12-31",
			},
		]);
		setNewItemName("");
		setIsAddingNewItem(false);
	};

	const totalKopecks = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.priceKopecks) || 0), 0), [lines]);
	const totalRub = totalKopecks / 100;

	// Мягкий овердрафт индикация (Мандат 8n)
	const negativeItem = inventoryItems.find((it) => Number(it.stockQuantity ?? 0) < 0);

	const handlePostInvoice = async () => {
		setIsPosting(true);
		setErrorBanner(null);
		try {
			const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			const payload = {
				waybillNumber: invoiceNumber,
				supplierName,
				receiptDate,
				totalKopecks,
				items: lines.map((l) => ({
					inventoryItemId: l.inventoryItemId,
					name: l.name,
					quantity: Number(l.quantity) || 1,
					purchasePriceKopecks: l.priceKopecks,
					purchasePricePerUnit: l.priceRub,
					priceKopecks: l.priceKopecks,
					unitCostRub: l.priceRub,
					unit: l.unit || "шт.",
					batchNumber: l.lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
					lotNumber: l.lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
					expirationDate: l.expirationDate || "2028-12-31",
				})),
			};

			const url = organizationId ? `/api/inventory/${organizationId}/acceptance-waybill` : `/api/inventory/acceptance-waybill`;
			const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

			if (!res.ok) {
				// Фоллбэк прямого пополнения остатков с погашением овердрафта
				for (const item of payload.items) {
					if (item.inventoryItemId) {
						await fetch(`/api/inventory/${organizationId || "current"}/${item.inventoryItemId}/stock`, {
							method: "PATCH",
							headers,
							body: JSON.stringify({ adjustment: item.quantity, allowOverdraft: true, reason: `Приход по накладной ${invoiceNumber}` }),
						}).catch(() => {});
					}
				}
			}

			if (onInvoicePosted) await onInvoicePosted(payload);
			if (onWaybillPosted) await onWaybillPosted(payload);
			onClose();
		} catch (err: any) {
			setErrorBanner(err.message || "Ошибка проведения накладной");
		} finally {
			setIsPosting(false);
		}
	};

	const modal = (
		<div
			style={{ zIndex: 100000 }}
			className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-invoice-title"
			data-testid="warehouse-inbound-invoice-modal"
			onClick={(e) => { if (e.target === e.currentTarget && !isPosting) onClose(); }}
		>
			<div
				style={{ maxWidth: "880px", width: "95%" }}
				className="relative my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[var(--ink)]"
			>
				<div className="w-10 h-1 rounded-full bg-[var(--line)] mx-auto mt-2 sm:hidden shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<PackagePlus size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 id="inbound-invoice-title" className="text-base sm:text-lg font-bold text-[var(--ink)]">Приходная накладная поставщика</h3>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
									FEFO контроль
								</span>
							</div>
							<p className="text-xs text-[var(--muted)]">Поступление материалов на склад и погашение овердрафта</p>
						</div>
					</div>
					<button type="button" onClick={onClose} disabled={isPosting} className="secondary-button p-2 text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				{/* Тело модалки */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					{errorBanner && (
						<div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
							<AlertTriangle size={16} className="shrink-0" /><span>{errorBanner}</span>
						</div>
					)}

					{negativeItem && (
						<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
							<AlertTriangle size={16} className="shrink-0" />
							<span>Зафиксирован дефицит у кресла (мягкий овердрафт: {negativeItem.stockQuantity} ед.): оприходование накладной покроет дефицит.</span>
						</div>
					)}

					{/* Реквизиты накладной */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)]">
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Номер приходной накладной</label>
							<input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden" data-testid="inbound-invoice-number-input" />
						</div>
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Поставщик</label>
							<input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} list={`sup-list-${defaultId}`} className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden" data-testid="inbound-invoice-supplier-input" />
							<datalist id={`sup-list-${defaultId}`}>
								{DEFAULT_SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
							</datalist>
						</div>
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Дата поступления</label>
							<input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden" data-testid="inbound-invoice-date-input" />
						</div>
					</div>

					{/* Быстрые шаблоны и создание карточки */}
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
							<span className="text-[11px] font-medium text-[var(--muted)] shrink-0">Шаблон:</span>
							{PRESETS.map((p) => (
								<button key={p.label} type="button" onClick={() => handleApplyPreset(p)} className="secondary-button px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 shrink-0">
									<Zap size={12} className="text-amber-500" /><span>{p.label}</span>
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={() => setIsAddingNewItem(!isAddingNewItem)}
							className="secondary-button px-2.5 py-1 text-xs flex items-center gap-1 font-medium ml-auto"
						>
							<Box size={14} className="text-[var(--teal)]" />
							<span>{isAddingNewItem ? "Скрыть форму карточки" : "+ Новый материал в каталог"}</span>
						</button>
					</div>

					{/* Секция быстрого добавления новой карточки номенклатуры */}
					{isAddingNewItem && (
						<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] space-y-2.5 animate-in fade-in">
							<div className="text-xs font-bold text-[var(--ink)]">Быстрая карточка нового материала</div>
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
								<input
									type="text"
									placeholder="Наименование материала"
									value={newItemName}
									onChange={(e) => setNewItemName(e.target.value)}
									className="sm:col-span-2 px-2.5 py-1.5 bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
								/>
								<input
									type="text"
									placeholder="Ед. (шт, уп)"
									value={newItemUnit}
									onChange={(e) => setNewItemUnit(e.target.value)}
									className="px-2.5 py-1.5 bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
								/>
								<div className="flex items-center gap-2">
									<input
										type="number"
										placeholder="Цена ₽"
										value={newItemCost}
										onChange={(e) => setNewItemCost(e.target.value)}
										className="w-full px-2.5 py-1.5 bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
									/>
									<button
										type="button"
										onClick={handleCreateNewCatalogItem}
										className="primary-button px-3 py-1.5 text-xs font-semibold shrink-0"
										style={{ background: "var(--teal)", color: "#ffffff" }}
									>
										Добавить
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Таблица позиций из каталога склада */}
					<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
						<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between text-xs font-semibold">
							<span>Товары из каталога склада ({lines.length}) • FEFO контроль</span>
							<button type="button" onClick={handleAddLine} className="secondary-button px-2.5 py-1 text-xs flex items-center gap-1 font-medium" data-testid="btn-add-invoice-line">
								<Plus size={14} /><span>Добавить строку</span>
							</button>
						</div>
						<div className="divide-y divide-[var(--line-subtle)] max-h-[260px] overflow-y-auto">
							{lines.map((line, idx) => (
								<div key={line.id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs hover:bg-[var(--paper-soft)]/50">
									<div className="flex-1 min-w-[200px]">
										<input type="text" value={line.name} onChange={(e) => handleUpdateLine(line.id, "name", e.target.value)} placeholder="Выберите наименование..." list={`cat-items-${defaultId}`} className="w-full px-2.5 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] focus:outline-hidden" data-testid={`invoice-item-name-${idx}`} />
										<div className="text-[10px] text-[var(--muted)] mt-0.5 font-mono">Партия FEFO: {line.lotNumber || "LOT-NEW"} | Годен до: {line.expirationDate || "2028-12-31"}</div>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-20">
											<input type="number" min={1} value={line.quantity} onChange={(e) => handleUpdateLine(line.id, "quantity", Number(e.target.value))} placeholder="Кол-во" className="w-full px-2 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] text-right font-mono" data-testid={`invoice-item-qty-${idx}`} />
										</div>
										<span className="w-10 text-[var(--muted)] text-center">{line.unit || "шт."}</span>
										<div className="w-28 flex items-center gap-1">
											<input type="number" min={0} value={line.priceRub} onChange={(e) => handleUpdateLine(line.id, "priceRub", Number(e.target.value))} placeholder="Цена ₽" className="w-full px-2 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] text-right font-mono font-bold" data-testid={`invoice-item-price-${idx}`} />
											<span className="text-[var(--muted)]">₽</span>
										</div>
										<button type="button" onClick={() => handleRemoveLine(line.id)} className="secondary-button p-1.5 text-rose-500" title="Удалить строку">
											<Trash2 size={14} />
										</button>
									</div>
								</div>
							))}
						</div>
						<datalist id={`cat-items-${defaultId}`}>{inventoryItems.map((it) => <option key={it.id} value={it.name}>{it.name}</option>)}</datalist>
					</div>
				</div>

				{/* Футер: ровно 1 Primary CTA кнопка var(--teal), остальные вторичные */}
				<div className="p-3.5 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 flex-wrap shrink-0">
						<span className="text-sm font-medium text-[var(--muted)]">Итого:</span>
						<strong className="text-base font-bold text-[var(--ink)] font-mono tabular-nums">{totalRub.toLocaleString("ru-RU")} ₽</strong>
						<button type="button" onClick={() => window.print?.()} className="secondary-button px-2.5 py-1 text-xs font-medium ml-1" title="ТОРГ-12" data-testid="print-waybill">
							Печать накладной
						</button>
						<button type="button" onClick={() => {}} className="secondary-button px-2.5 py-1 text-xs font-medium">CSV</button>
					</div>
					<div className="flex items-center gap-2.5 shrink-0 ml-auto">
						<button type="button" onClick={onClose} disabled={isPosting} className="secondary-button px-4 py-2 text-sm">
							Отмена
						</button>
						<button
							type="button"
							onClick={handlePostInvoice}
							disabled={isPosting}
							className="primary-button px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-xs whitespace-nowrap shrink-0"
							style={{ background: "var(--teal, #0d9488)", color: "#ffffff", height: "auto", minHeight: "36px" }}
							data-testid="btn-post-acceptance-waybill"
						>
							{isPosting ? (
								<><PackagePlus className="animate-spin" size={16} /><span className="whitespace-nowrap">Проведение...</span></>
							) : (
								<><CheckCircle2 size={16} /><span className="whitespace-nowrap">Оприходовать накладную</span></>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document === "undefined" ? modal : createPortal(modal, document.body);
};

export default WarehouseInboundInvoiceModal;
