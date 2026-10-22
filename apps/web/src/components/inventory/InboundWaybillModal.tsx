/**
 * INBOUND WAYBILL MODAL (SSOT ПРИХОДНАЯ НАКЛАДНАЯ)
 * Каноническая модалка оприходования материалов от стоматологических поставщиков.
 * Мандаты 8e (автономия), 8n (соло-врач), 8am (дизайн-код, 1 Primary CTA), 8x (живой язык).
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	Download,
	Plus,
	Printer,
	ShieldCheck,
	Trash2,
	Truck,
	X,
} from "lucide-react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface InboundWaybillLine {
	id: string;
	inventoryItemId?: string | undefined;
	name: string;
	lotNumber: string;
	expirationDate: string; // YYYY-MM-DD
	quantity: number;
	unit: string;
	unitCostRub: number;
	category?: string | undefined;
}

export interface InboundWaybillModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[] | undefined;
	readonly onWaybillPosted?: (() => void | Promise<void>) | undefined;
	readonly onInvoicePosted?: (() => void | Promise<void>) | undefined;
	readonly getHeaders?: ((headers?: Record<string, string>) => Record<string, string>) | undefined;
}

const CANONICAL_SUPPLIERS = [
	{ id: "sup_stomtorg", name: "ООО «Стомторг»", inn: "7701234567" },
	{ id: "sup_kavo", name: "KaVo Dental Russland", inn: "7705432109" },
	{ id: "sup_vladmiva", name: "ЗАО «ВладМиВа»", inn: "3123012345" },
	{ id: "sup_dentalmarket", name: "ООО «ДенталМаркет»", inn: "7709876543" },
	{ id: "sup_3m", name: "3M ESPE Стоматология", inn: "7725019876" },
];

const SAMPLE_PRESETS: Record<string, InboundWaybillLine[]> = {
	stomtorg: [
		{ id: "p1", name: "Септанест 1:100 000 (Septodont)", lotNumber: "LOT-SEP2026-01", expirationDate: "2028-10-31", quantity: 5, unit: "уп", unitCostRub: 4200, category: "anesthesia" },
		{ id: "p2", name: "Филтек Z250 шприц 4г (3M ESPE)", lotNumber: "LOT-FLK2026-A2", expirationDate: "2027-12-31", quantity: 4, unit: "шт", unitCostRub: 2850, category: "composite" },
		{ id: "p3", name: "ОптиБонд FL набор (Kerr)", lotNumber: "LOT-OPT2026-04", expirationDate: "2027-06-30", quantity: 2, unit: "наб", unitCostRub: 8900, category: "composite" },
		{ id: "p4", name: "Крафт-пакеты СтериТ 100х200мм", lotNumber: "LOT-ST-2026", expirationDate: "2029-05-31", quantity: 10, unit: "уп", unitCostRub: 650, category: "sterilization" },
	],
	consumables: [
		{ id: "c1", name: "Перчатки нитриловые неопудренные (M)", lotNumber: "LOT-GLV-26M", expirationDate: "2029-01-31", quantity: 15, unit: "уп", unitCostRub: 580, category: "consumables" },
		{ id: "c2", name: "Слюноотсосы одноразовые (100 шт.)", lotNumber: "LOT-SL-2026", expirationDate: "2029-12-31", quantity: 10, unit: "уп", unitCostRub: 320, category: "consumables" },
		{ id: "c3", name: "Валики ватные стоматологические №2", lotNumber: "LOT-COT-26", expirationDate: "2029-08-31", quantity: 12, unit: "уп", unitCostRub: 290, category: "consumables" },
		{ id: "c4", name: "Нагрудники для пациентов 2-слойные", lotNumber: "LOT-BIB-26", expirationDate: "2029-12-31", quantity: 8, unit: "уп", unitCostRub: 450, category: "consumables" },
	],
};

export const InboundWaybillModal: React.FC<InboundWaybillModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	inventoryItems = [],
	onWaybillPosted,
	onInvoicePosted,
	getHeaders,
}) => {
	const [waybillNumber, setWaybillNumber] = useState(
		() => `НАКЛ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`,
	);
	const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [supplierName, setSupplierName] = useState("ООО «Стомторг»");
	const [warehouseName, setWarehouseName] = useState("Основной склад");
	const [isPosting, setIsPosting] = useState(false);
	const inFlightRef = useRef(false);

	const [lines, setLines] = useState<InboundWaybillLine[]>(() => [
		{
			id: "line-1",
			name: "Перчатки нитриловые неопудренные (M)",
			lotNumber: `LOT-${new Date().getFullYear()}-01`,
			expirationDate: "2028-12-31",
			quantity: 10,
			unit: "уп",
			unitCostRub: 580,
			category: "consumables",
		},
	]);

	useEffect(() => {
		if (isOpen) {
			setReceiptDate(new Date().toISOString().slice(0, 10));
		}
	}, [isOpen]);

	// Карта дефицита (отрицательные остатки на складе)
	const deficitMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const it of inventoryItems) {
			const qty = Number(it.stockQuantity) || 0;
			if (qty < 0) {
				map.set(it.name.toLowerCase().trim(), qty);
				if (it.id) map.set(it.id, qty);
			}
		}
		return map;
	}, [inventoryItems]);

	const totals = useMemo(() => {
		let totalQty = 0;
		let totalSumRub = 0;
		let resolvingDeficitCount = 0;

		for (const line of lines) {
			const q = Number(line.quantity) || 0;
			const p = Number(line.unitCostRub) || 0;
			totalQty += q;
			totalSumRub += q * p;
			if (deficitMap.has(line.name.toLowerCase().trim())) {
				resolvingDeficitCount++;
			}
		}

		return {
			positionsCount: lines.length,
			totalQty,
			totalSumRub,
			totalSumFormatted: money(Math.round(totalSumRub * 100)),
			resolvingDeficitCount,
		};
	}, [lines, deficitMap]);

	if (!isOpen) return null;

	const handleAddEmptyLine = () => {
		const newLine: InboundWaybillLine = {
			id: `line-${Date.now()}`,
			name: "",
			lotNumber: `LOT-${new Date().getFullYear()}-${String(lines.length + 1).padStart(2, "0")}`,
			expirationDate: "2028-12-31",
			quantity: 1,
			unit: "уп",
			unitCostRub: 0,
			category: "materials",
		};
		setLines((prev) => [...prev, newLine]);
	};

	const handleLoadPreset = (presetKey: "stomtorg" | "consumables") => {
		const preset = SAMPLE_PRESETS[presetKey];
		if (!preset) return;
		setLines(preset.map((it) => ({ ...it, id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })));
		if (presetKey === "stomtorg") setSupplierName("ООО «Стомторг»");
		showToast(`Загружен образец накладной (${preset.length} позиций)`, "info");
	};

	const handleUpdateLine = (id: string, updates: Partial<InboundWaybillLine>) => {
		setLines((prev) =>
			prev.map((l) => {
				if (l.id !== id) return l;
				const updated = { ...l, ...updates };
				// Если выбрано имя существующего товара, подтягиваем единицу и себестоимость
				if (updates.name && updates.name !== l.name) {
					const found = inventoryItems.find(
						(inv) => inv.name.toLowerCase().trim() === updates.name?.toLowerCase().trim(),
					);
					if (found) {
						if (!updates.unit && found.unit) updated.unit = found.unit;
						if (updates.unitCostRub === undefined && found.unitCostRub) {
							updated.unitCostRub = Number(found.unitCostRub) || updated.unitCostRub;
						}
						updated.inventoryItemId = found.id;
					}
				}
				return updated;
			}),
		);
	};

	const handleRemoveLine = (id: string) => {
		if (lines.length <= 1) {
			showToast("В накладной должна быть хотя бы одна позиция", "warning");
			return;
		}
		setLines((prev) => prev.filter((l) => l.id !== id));
	};

	const handlePostWaybill = async () => {
		if (lines.length === 0) {
			showToast("Добавьте хотя бы одну позицию в накладную", "warning");
			return;
		}
		const emptyNames = lines.filter((l) => !l.name.trim());
		if (emptyNames.length > 0) {
			showToast("Заполните наименования для всех позиций накладной", "error");
			return;
		}

		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsPosting(true);

		const headers = getHeaders
			? getHeaders({ "Content-Type": "application/json" })
			: getDenteAuthHeaders({ "Content-Type": "application/json" });

		try {
			// Отправляем пакетный запрос оприходования на бэкенд
			const payload = {
				waybillNumber,
				supplierName,
				receiptDate,
				warehouseName,
				items: lines.map((l) => ({
					inventoryItemId: l.inventoryItemId,
					name: l.name.trim(),
					quantity: Number(l.quantity) || 1,
					unitCostRub: Number(l.unitCostRub) || 0,
					batchNumber: l.lotNumber || `LOT-${new Date().getFullYear()}`,
					expirationDate: l.expirationDate || "2028-12-31",
					unit: l.unit || "уп",
				})),
			};

			const res = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				// Fallback: обновляем построчно, если пакетный роут вернул ошибку
				for (const line of lines) {
					const matchingItem = inventoryItems.find(
						(inv) => inv.name.toLowerCase().trim() === line.name.toLowerCase().trim(),
					);
					if (matchingItem) {
						await fetch(`/api/inventory/${organizationId}/${matchingItem.id}/stock`, {
							method: "PATCH",
							headers,
							body: JSON.stringify({
								adjustment: Number(line.quantity) || 1,
								reason: `Оприходование накладной №${waybillNumber} (${supplierName})`,
								lotNumber: line.lotNumber,
								expirationDate: line.expirationDate,
								allowOverdraft: true,
							}),
						});
					}
				}
			}

			showToast(
				`Накладная №${waybillNumber} проведена! Оприходовано ${lines.length} поз. на сумму ${totals.totalSumFormatted}`,
				"success",
			);

			if (onWaybillPosted) await onWaybillPosted();
			if (onInvoicePosted) await onInvoicePosted();
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка оприходования накладной";
			showToast(msg, "error");
		} finally {
			inFlightRef.current = false;
			setIsPosting(false);
		}
	};

	const handlePrintWaybill = () => {
		const rows = lines
			.map(
				(l, idx) => `
			<tr>
				<td style="text-align:center; padding:4px 6px; border:1px solid #ccc;">${idx + 1}</td>
				<td style="padding:4px 6px; border:1px solid #ccc;"><strong>${l.name}</strong><br><span style="font-size:10px; color:#555;">Партия: ${l.lotNumber} | Годен до: ${l.expirationDate}</span></td>
				<td style="text-align:center; padding:4px 6px; border:1px solid #ccc;">${l.unit}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #ccc; font-weight:bold;">${l.quantity}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #ccc;">${l.unitCostRub.toLocaleString("ru-RU")} ₽</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #ccc; font-weight:bold;">${(l.quantity * l.unitCostRub).toLocaleString("ru-RU")} ₽</td>
			</tr>
		`,
			)
			.join("");

		const html = `<!DOCTYPE html>
		<html lang="ru"><head><meta charset="utf-8"><title>Приходная накладная № ${waybillNumber}</title>
		<style>
			body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111; margin: 24px; line-height: 1.3; }
			table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10pt; }
			th { background: #f3f4f6; border: 1px solid #ccc; padding: 6px; font-weight: 600; text-align: center; }
			.signatures { margin-top: 36px; width: 100%; font-size: 10pt; }
			.signatures td { padding: 8px 0; border: none; }
			@media print { body { margin: 12mm; } }
		</style></head><body>
		<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #14b8a6; padding-bottom:10px;">
			<div>
				<h2 style="margin:0; font-size:16pt; color:#0f172a;">ПРИХОДНАЯ НАКЛАДНАЯ МАТЕРИАЛОВ № ${waybillNumber}</h2>
				<div style="font-size:11pt; color:#475569; margin-top:4px;">Дата приёмки: ${receiptDate} г. • Склад: ${warehouseName}</div>
			</div>
			<div style="text-align:right; font-size:10pt; color:#64748b;">
				Поставщик: <strong>${supplierName}</strong>
			</div>
		</div>
		<table><thead><tr>
			<th style="width:5%;">№</th>
			<th style="width:45%; text-align:left;">Наименование материала, партия, срок</th>
			<th style="width:8%;">Ед.</th>
			<th style="width:10%;">Кол-во</th>
			<th style="width:14%;">Цена за ед.</th>
			<th style="width:18%;">Сумма</th>
		</tr></thead><tbody>${rows}
		<tr style="background:#f8fafc; font-weight:bold;">
			<td colspan="3" style="text-align:right; padding:8px; border:1px solid #ccc;">ИТОГО:</td>
			<td style="text-align:right; padding:8px; border:1px solid #ccc;">${totals.totalQty}</td>
			<td style="border:1px solid #ccc;"></td>
			<td style="text-align:right; padding:8px; border:1px solid #ccc; color:#0f766e;">${totals.totalSumFormatted}</td>
		</tr></tbody></table>
		<table class="signatures"><tr>
			<td style="width:50%;"><strong>Отпустил (Поставщик):</strong><br><br>_________________ / _________________ /</td>
			<td style="width:50%;"><strong>Принял (Ответственный сотрудник):</strong><br><br>_________________ / _________________ /</td>
		</tr></table></body></html>`;

		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 250);
		}
	};

	const handleExportCsv = () => {
		const header = "№;Наименование;Партия;Срок годности;Количество;Ед;Цена руб;Сумма руб\n";
		const rows = lines
			.map(
				(l, idx) =>
					`${idx + 1};"${l.name.replace(/"/g, '""')}";"${l.lotNumber}";"${l.expirationDate}";${l.quantity};"${l.unit}";${l.unitCostRub};${l.quantity * l.unitCostRub}`,
			)
			.join("\n");
		const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Накладная_${waybillNumber}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("CSV файл выгружен", "info");
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-waybill-title"
			data-testid="inbound-waybill-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isPosting) onClose();
			}}
		>
			<div className="relative w-full max-w-4xl lg:max-w-5xl my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				{/* Шапка модалки */}
				<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
							<Truck size={18} />
						</div>
						<div className="min-w-0">
							<h2 id="inbound-waybill-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
								Приходная накладная материалов
							</h2>
							<p className="text-xs text-[var(--muted)] truncate">
								Оприходование партий стоматологических препаратов и расходников
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						disabled={isPosting}
						className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/10 transition"
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Реквизиты и пресеты */}
				<div className="p-3 sm:p-4 border-b border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
						<div>
							<label className="font-semibold text-[var(--muted)] block mb-1">Номер накладной</label>
							<input
								type="text"
								value={waybillNumber}
								onChange={(e) => setWaybillNumber(e.target.value)}
								className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono font-bold"
								placeholder="НАКЛ-261022-01"
							/>
						</div>

						<div>
							<label className="font-semibold text-[var(--muted)] block mb-1">Дата приёмки</label>
							<input
								type="date"
								value={receiptDate}
								onChange={(e) => setReceiptDate(e.target.value)}
								className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							/>
						</div>

						<div>
							<label className="font-semibold text-[var(--muted)] block mb-1">Поставщик</label>
							<select
								value={supplierName}
								onChange={(e) => setSupplierName(e.target.value)}
								className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							>
								{CANONICAL_SUPPLIERS.map((s) => (
									<option key={s.id} value={s.name}>
										{s.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="font-semibold text-[var(--muted)] block mb-1">Склад размещения</label>
							<input
								type="text"
								value={warehouseName}
								onChange={(e) => setWarehouseName(e.target.value)}
								className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								placeholder="Основной склад"
							/>
						</div>
					</div>

					{/* Быстрые образцы */}
					<div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--line-subtle)]">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mr-1">
								Образцы:
							</span>
							<button
								type="button"
								onClick={() => handleLoadPreset("stomtorg")}
								className="h-7 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)]/10 text-[var(--ink)] transition"
							>
								📦 Стомторг (Септанест, Филтек, ОптиБонд)
							</button>
							<button
								type="button"
								onClick={() => handleLoadPreset("consumables")}
								className="h-7 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)]/10 text-[var(--ink)] transition"
							>
								🧤 Расходники (Перчатки, слюноотсосы, валики)
							</button>
						</div>

						<button
							type="button"
							onClick={handleAddEmptyLine}
							className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition inline-flex items-center gap-1"
							data-testid="btn-add-waybill-line"
						>
							<Plus size={13} />
							<span>+ Добавить строку</span>
						</button>
					</div>
				</div>

				{/* Таблица позиций накладной */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[220px]">
					<div className="overflow-x-auto rounded-xl border border-[var(--line)]">
						<table className="w-full text-xs text-left border-collapse" style={{ minWidth: 680 }}>
							<thead className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)] uppercase font-semibold text-[11px]">
								<tr>
									<th className="py-2.5 px-3 w-8 text-center">№</th>
									<th className="py-2.5 px-3">Материал / Препарат</th>
									<th className="py-2.5 px-3 w-28">Партия (LOT)</th>
									<th className="py-2.5 px-3 w-32">Срок годности</th>
									<th className="py-2.5 px-3 w-20 text-right">Кол-во</th>
									<th className="py-2.5 px-3 w-16">Ед.</th>
									<th className="py-2.5 px-3 w-24 text-right">Цена, ₽</th>
									<th className="py-2.5 px-3 w-28 text-right">Сумма, ₽</th>
									<th className="py-2.5 px-2 w-10 text-center"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{lines.map((line, idx) => {
									const isDeficit = deficitMap.has(line.name.toLowerCase().trim());
									const subtotal = (Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0);

									return (
										<tr key={line.id} className="hover:bg-[var(--paper-soft)]/60 transition">
											<td className="py-2 px-3 text-center text-[var(--muted)] font-mono">{idx + 1}</td>
											<td className="py-2 px-3">
												<input
													type="text"
													value={line.name}
													onChange={(e) => handleUpdateLine(line.id, { name: e.target.value })}
													placeholder="Название материала..."
													className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium text-xs"
													list="inventory-catalog-list"
												/>
												{isDeficit && (
													<span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
														<ShieldCheck size={11} />
														<span>Погашает дефицит на складе</span>
													</span>
												)}
											</td>
											<td className="py-2 px-3">
												<input
													type="text"
													value={line.lotNumber}
													onChange={(e) => handleUpdateLine(line.id, { lotNumber: e.target.value })}
													className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs"
												/>
											</td>
											<td className="py-2 px-3">
												<input
													type="date"
													value={line.expirationDate}
													onChange={(e) => handleUpdateLine(line.id, { expirationDate: e.target.value })}
													className="w-full h-8 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
												/>
											</td>
											<td className="py-2 px-3 text-right">
												<input
													type="number"
													min={1}
													value={line.quantity}
													onChange={(e) => handleUpdateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
													className="w-full h-8 px-2 text-right rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold text-xs"
												/>
											</td>
											<td className="py-2 px-3">
												<input
													type="text"
													value={line.unit}
													onChange={(e) => handleUpdateLine(line.id, { unit: e.target.value })}
													className="w-full h-8 px-1.5 text-center rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
												/>
											</td>
											<td className="py-2 px-3 text-right">
												<input
													type="number"
													min={0}
													value={line.unitCostRub}
													onChange={(e) => handleUpdateLine(line.id, { unitCostRub: Math.max(0, Number(e.target.value) || 0) })}
													className="w-full h-8 px-2 text-right rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
												/>
											</td>
											<td className="py-2 px-3 text-right font-bold text-[var(--ink)] font-mono whitespace-nowrap">
												{subtotal.toLocaleString("ru-RU")} ₽
											</td>
											<td className="py-2 px-2 text-center">
												<button
													type="button"
													onClick={() => handleRemoveLine(line.id)}
													className="p-1 rounded text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
													title="Удалить позицию"
												>
													<Trash2 size={14} />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<datalist id="inventory-catalog-list">
						{inventoryItems.map((it) => (
							<option key={it.id} value={it.name} />
						))}
					</datalist>
				</div>

				{/* Итоговая сводка и футер */}
				<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-4 text-xs">
						<div>
							<span className="text-[var(--muted)]">Позиций: </span>
							<strong className="text-[var(--ink)]">{totals.positionsCount}</strong>
						</div>
						<div>
							<span className="text-[var(--muted)]">Всего единиц: </span>
							<strong className="text-[var(--ink)]">{totals.totalQty} шт.</strong>
						</div>
						<div>
							<span className="text-[var(--muted)]">Итого: </span>
							<strong className="text-sm font-bold text-[var(--primary)] font-mono">
								{totals.totalSumFormatted}
							</strong>
						</div>
						{totals.resolvingDeficitCount > 0 && (
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
								<CheckCircle2 size={13} />
								<span>Погашает дефицит ({totals.resolvingDeficitCount} поз.)</span>
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handlePrintWaybill}
							className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition"
							title="Печать приходной накладной"
							data-testid="btn-print-inbound-waybill"
						>
							<Printer size={14} />
							<span>Печать накладной</span>
						</button>

						<button
							type="button"
							onClick={handleExportCsv}
							className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition"
							title="Выгрузить в CSV"
						>
							<Download size={14} />
							<span>CSV</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							disabled={isPosting}
							className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold transition"
						>
							Отмена
						</button>

						{/* Primary CTA: строго 1 кнопка на видимый экран по Мандату 8am */}
						<button
							type="button"
							onClick={handlePostWaybill}
							disabled={isPosting}
							className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--primary)] text-white hover:brightness-110 active:scale-95 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition"
							data-testid="btn-post-inbound-waybill"
						>
							<Truck size={15} />
							<span>{isPosting ? "Оприходование..." : "✓ Оприходовать накладную"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export default InboundWaybillModal;
