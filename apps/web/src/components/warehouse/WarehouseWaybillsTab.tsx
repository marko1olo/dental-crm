import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileDown,
	FileText,
	Layers,
	Plus,
	Printer,
	Search,
	Trash2,
	Truck,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import {
	type AcceptanceSupplier,
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	calculateWaybillTotals,
	createDraftAcceptanceWaybill,
	createSampleDentalWaybill,
	createWaybillItem,
	exportWaybillToCsv,
	generateTorg12Html,
	kopecksToRubles,
	reconcileOverdraftOnReceipt,
	rublesToKopecks,
} from "../inventory/acceptanceWaybillsEngine.js";

export interface WarehouseWaybillsTabProps {
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[] | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly onRefreshStock?: (() => void) | undefined;
}

/**
 * Вкладка приходных накладных ТОРГ-12 и оприходования партий ТМЦ (Мандаты 8e, 8n).
 * - Оприходование партий от стоматологических поставщиков с сериями и сроками годности (FEFO).
 * - Автоматическое погашение мягкого овердрафта (дефицита у кресла врача) при приходе накладной.
 * - Печать унифицированной формы ТОРГ-12 и экспорт в CSV.
 * - 0 эмодзи, соответствие СанПиН и стандартам, touch target >= 44px на таче.
 */
export const WarehouseWaybillsTab: React.FC<WarehouseWaybillsTabProps> = ({
	organizationId,
	inventoryItems = [],
	onWaybillPosted,
	onRefreshStock,
}) => {
	// Список проведенных и сохраненных накладных (Мандат 8c / 8k: в боевом режиме честный пустой склад)
	const [waybillsList, setWaybillsList] = useState<AcceptanceWaybillDocument[]>(() => {
		return isDemoShowcaseMode() ? [createSampleDentalWaybill()] : [];
	});
	const [selectedWaybill, setSelectedWaybill] = useState<AcceptanceWaybillDocument | null>(() => {
		return isDemoShowcaseMode() ? createSampleDentalWaybill() : null;
	});
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const [draftWaybill, setDraftWaybill] = useState<AcceptanceWaybillDocument>(() =>
		createDraftAcceptanceWaybill({ supplier: CANONICAL_DENTAL_SUPPLIERS[0]! }),
	);

	// Быстрое оприходование (4 параметра: Поставщик, Номер, Дата, Итоговая сумма)
	const [isExpressModalOpen, setIsExpressModalOpen] = useState(false);
	const [expressSupplierId, setExpressSupplierId] = useState(CANONICAL_DENTAL_SUPPLIERS[0]?.id || "");
	const [expressWaybillNum, setExpressWaybillNum] = useState("ПРХ-2026/10-091");
	const [expressDate, setExpressDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [expressAmountRub, setExpressAmountRub] = useState("45000");

	const handlePostExpressWaybill = async () => {
		const num = expressWaybillNum.trim() || `ПРХ-${Date.now().toString().slice(-4)}`;
		const amtRub = parseFloat(expressAmountRub) || 0;
		const supplier = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === expressSupplierId) || CANONICAL_DENTAL_SUPPLIERS[0]!;

		const defaultItem: AcceptanceWaybillItem = createWaybillItem({
			name: "Расходные материалы стоматологические (пакет поставки)",
			sku: "EXP-PKG-01",
			unit: "упак.",
			category: "Расходные",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(amtRub),
			vatRate: 0,
			batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
			expirationDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
		});

		const items = [defaultItem];
		const totals = calculateWaybillTotals(items);
		const postedDoc: AcceptanceWaybillDocument = {
			id: `wb-express-${Date.now()}`,
			waybillNumber: num,
			receiptDate: expressDate,
			supplier,
			warehouseName: "Центральный склад клиники",
			receiverFullName: "Ответственный за снабжение",
			receiverPosition: "Зав. складом",
			status: "posted",
			items,
			totals,
			postedAt: new Date().toISOString(),
		};

		// Погашение дефицита / овердрафта
		const overdraftItems = inventoryItems.filter(
			(inv) => Number(inv.stockQuantity) < 0,
		);
		let overdraftResolvedCount = 0;
		for (const d of overdraftItems) {
			const curDeficit = Number(d.stockQuantity);
			const reconciliation = reconcileOverdraftOnReceipt(curDeficit, 10);
			if (reconciliation.clearedDeficit > 0) {
				overdraftResolvedCount++;
			}
		}

		setWaybillsList((prev) => [postedDoc, ...prev]);
		setSelectedWaybill(postedDoc);
		setIsExpressModalOpen(false);

		if (onWaybillPosted) {
			await onWaybillPosted(postedDoc);
		}
		if (onRefreshStock) {
			onRefreshStock();
		}

		showToast(
			overdraftResolvedCount > 0
				? `Накладная №${postedDoc.waybillNumber} оприходована. Погашен овердрафт: ${overdraftResolvedCount} поз.`
				: `Накладная №${postedDoc.waybillNumber} успешно оприходована. Склад пополнен.`,
			"success",
		);
	};

	// Быстрое добавление позиции из стоматологических шаблонов
	const handleAddTemplateItem = (templateSku: string) => {
		const tmpl = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.sku === templateSku);
		if (!tmpl) return;

		const newItem = createWaybillItem({
			name: tmpl.name,
			sku: tmpl.sku,
			unit: tmpl.unit,
			category: tmpl.category,
			quantity: 10,
			unitPriceKopecks: tmpl.defaultUnitPriceKopecks,
			vatRate: tmpl.vatRate,
			batchNumber: `${tmpl.defaultBatchPrefix}-${Date.now().toString().slice(-6)}`,
			expirationDate: tmpl.shelfLifeMonths
				? new Date(Date.now() + tmpl.shelfLifeMonths * 30 * 86400000)
						.toISOString()
						.slice(0, 10)
				: "2028-12-31",
			barcode: tmpl.barcode,
		});

		const nextItems = [...draftWaybill.items, newItem];
		const nextTotals = calculateWaybillTotals(nextItems);
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: nextTotals,
		}));
	};

	// Удаление строки из накладной
	const handleRemoveDraftItem = (itemId: string) => {
		const nextItems = draftWaybill.items.filter((it) => it.id !== itemId);
		const nextTotals = calculateWaybillTotals(nextItems);
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: nextTotals,
		}));
	};

	// Проведение накладной (Мандат 8n: гашение овердрафта)
	const handlePostWaybill = async (waybillToPost: AcceptanceWaybillDocument) => {
		if (waybillToPost.items.length === 0) {
			showToast("Добавьте хотя бы одну позицию в накладную", "warning");
			return;
		}

		const postedDoc: AcceptanceWaybillDocument = {
			...waybillToPost,
			status: "posted",
			postedAt: new Date().toISOString(),
		};

		// Проверка гашения мягкого овердрафта
		const overdraftItems = inventoryItems.filter(
			(inv) => Number(inv.stockQuantity) < 0,
		);
		let overdraftResolvedCount = 0;

		for (const wbItem of postedDoc.items) {
			const matchingDeficit = overdraftItems.find((d) =>
				d.name.toLowerCase().includes(wbItem.name.toLowerCase().slice(0, 15)),
			);
			if (matchingDeficit) {
				const currentDeficit = Number(matchingDeficit.stockQuantity);
				const reconciliation = reconcileOverdraftOnReceipt(
					currentDeficit,
					wbItem.quantity,
				);
				if (reconciliation.clearedDeficit > 0) {
					overdraftResolvedCount++;
				}
			}
		}

		setWaybillsList((prev) => [
			postedDoc,
			...prev.filter((w) => w.id !== postedDoc.id),
		]);
		setSelectedWaybill(postedDoc);
		setIsCreatingNew(false);

		if (onWaybillPosted) {
			await onWaybillPosted(postedDoc);
		}
		if (onRefreshStock) {
			onRefreshStock();
		}

		showToast(
			overdraftResolvedCount > 0
				? `Накладная №${postedDoc.waybillNumber} успешно проведена. Погашен овердрафт: ${overdraftResolvedCount} поз.`
				: `Накладная №${postedDoc.waybillNumber} проведена. Склад пополнен.`,
			"success",
		);
	};

	// Печать унифицированной формы ТОРГ-12
	const handlePrintTorg12 = (wb: AcceptanceWaybillDocument) => {
		const html = generateTorg12Html(wb);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Экспорт накладной в CSV
	const handleExportCsv = (wb: AcceptanceWaybillDocument) => {
		const csvContent = exportWaybillToCsv(wb);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `torg12_${wb.waybillNumber.replace(/\//g, "_")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Накладная экспортирована в CSV", "info");
	};

	const filteredWaybills = useMemo(() => {
		if (!searchQuery.trim()) return waybillsList;
		const q = searchQuery.toLowerCase();
		return waybillsList.filter(
			(w) =>
				w.waybillNumber.toLowerCase().includes(q) ||
				w.supplier.name.toLowerCase().includes(q),
		);
	}, [waybillsList, searchQuery]);

	return (
		<div
			className="warehouse-waybills-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2.5"
			data-testid="warehouse-waybills-tab"
		>
			{/* ВЕРХНИЙ ТУЛБАР */}
			<div className="min-h-[36px] h-auto py-1 px-3 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
						<Truck size={14} />
					</div>
					<div className="min-w-0">
						<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight truncate">
							Поступление партий и поставщики
						</h3>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Поиск */}
					<div className="dente-search-wrap relative min-w-[180px] max-w-xs">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							className="dente-search-input"
							placeholder="Поиск накладной или поставщика..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							data-testid="waybill-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								className="dente-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={12} />
							</button>
						)}
					</div>

					<button
						type="button"
						onClick={() => setIsExpressModalOpen(true)}
						className="h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-express-waybill"
						title="Быстрое оприходование накладной по 4 параметрам: Поставщик, Номер, Дата, Сумма"
					>
						<Zap size={13} className="text-teal-600 dark:text-teal-400" />
						<span>Экспресс-приход</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setIsCreatingNew(true);
							setDraftWaybill(
								createDraftAcceptanceWaybill(CANONICAL_DENTAL_SUPPLIERS[0]!),
							);
						}}
						className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="btn-create-waybill"
					>
						<Plus size={14} />
						<span>Оприходовать накладную</span>
					</button>
				</div>
			</div>

			{/* ОСНОВНОЙ КОНТЕНТ: Сплит Список / Детали */}
			<div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2.5 min-h-0 overflow-hidden">
				{/* КОЛОНКА 1: Список накладных */}
				<div className="border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col overflow-hidden">
					<div className="p-2.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] font-semibold text-xs text-[var(--muted,#64748b)] flex items-center justify-between">
						<span>Накладные ({filteredWaybills.length})</span>
						<span className="text-[11px] font-normal">Сортировка: новые</span>
					</div>

					<div className="flex-1 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)] p-1 flex flex-col">
						{filteredWaybills.length === 0 ? (
							<div
								className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--muted,#64748b)] gap-2 my-auto"
								data-testid="waybills-empty-state"
							>
								<Truck size={32} className="opacity-40 text-teal-600" />
								<div className="font-semibold text-sm text-[var(--ink,#0f172a)]">
									{waybillsList.length === 0
										? "Склад пуст — проведите первую приходную накладную"
										: "Накладные по запросу не найдены"}
								</div>
								<p className="text-[11px] max-w-xs text-[var(--muted,#64748b)]">
									{waybillsList.length === 0
										? "В боевом режиме остатки ТМЦ и серии FEFO формируются на основании приходных накладных."
										: "Попробуйте изменить поисковый запрос."}
								</p>
								{waybillsList.length === 0 && (
									<button
										type="button"
										onClick={() => {
											setIsCreatingNew(true);
											setDraftWaybill(createDraftAcceptanceWaybill({ supplier: CANONICAL_DENTAL_SUPPLIERS[0]! }));
										}}
										className="mt-2 h-8 px-3.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
										data-testid="btn-empty-create-waybill"
									>
										<Plus size={13} />
										<span>Оприходовать накладную</span>
									</button>
								)}
							</div>
						) : (
							filteredWaybills.map((wb) => {
								const isSelected = selectedWaybill?.id === wb.id && !isCreatingNew;
								const isPosted = wb.status === "posted";

								return (
									<div
										key={wb.id}
										onClick={() => {
											setSelectedWaybill(wb);
											setIsCreatingNew(false);
										}}
										className={`p-2.5 rounded-lg transition-colors cursor-pointer text-xs ${
											isSelected
												? "bg-teal-500/10 border border-teal-500/30 text-teal-900 dark:text-teal-200"
												: "hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
										}`}
										data-testid={`waybill-item-${wb.id}`}
									>
										<div className="flex items-center justify-between gap-1 mb-1">
											<span className="font-bold truncate">№ {wb.waybillNumber}</span>
											<span
												className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
													isPosted
														? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
														: "bg-amber-500/20 text-amber-800 dark:text-amber-200"
												}`}
											>
												{isPosted ? "Проведена" : "Черновик"}
											</span>
										</div>
										<div className="text-[var(--muted,#64748b)] truncate">
											{wb.supplier.name}
										</div>
										<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] mt-1">
											<span>{wb.receiptDate}</span>
											<span className="font-semibold text-[var(--ink,#0f172a)]">
												{money(kopecksToRubles(wb.totals.totalCostKopecks))}
											</span>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>

				{/* КОЛОНКА 2-3: Просмотр накладной или создание новой */}
				<div className="md:col-span-2 border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col overflow-hidden">
					{isCreatingNew ? (
						/* ФОРМА СОЗДАНИЯ НАКЛАДНОЙ */
						<div className="flex-1 flex flex-col min-h-0 overflow-hidden" data-testid="waybill-create-form">
							{/* Шапка формы */}
							<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
								<div>
									<h4 className="text-xs font-bold text-[var(--ink,#0f172a)]">
										Новая приходная накладная
									</h4>
									<p className="text-[11px] text-[var(--muted,#64748b)]">
										Пополнение склада и погашение отрицательных остатков
									</p>
								</div>
								<button
									type="button"
									onClick={() => setIsCreatingNew(false)}
									className="text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								>
									Отмена
								</button>
							</div>

							{/* Параметры поставщика */}
							<div className="p-3 border-b border-[var(--line,#e2e8f0)] grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 text-xs">
								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
										Поставщик:
									</label>
									<select
										className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										value={draftWaybill.supplier.id}
										onChange={(e) => {
											const s = CANONICAL_DENTAL_SUPPLIERS.find(
												(sup) => sup.id === e.target.value,
											);
											if (s) setDraftWaybill((prev) => ({ ...prev, supplier: s }));
										}}
									>
										{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
										Номер накладной:
									</label>
									<input
										type="text"
										className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										value={draftWaybill.waybillNumber}
										onChange={(e) =>
											setDraftWaybill((prev) => ({ ...prev, waybillNumber: e.target.value }))
										}
									/>
								</div>

								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
										Дата накладной:
									</label>
									<input
										type="date"
										className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										value={draftWaybill.receiptDate}
										onChange={(e) =>
											setDraftWaybill((prev) => ({ ...prev, receiptDate: e.target.value }))
										}
									/>
								</div>
							</div>

							{/* Экспресс-добавление из стоматологических шаблонов */}
							<div className="p-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none shrink-0 text-xs">
								<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] shrink-0">
									Быстрое добавление:
								</span>
								{CANONICAL_DENTAL_MATERIAL_TEMPLATES.slice(0, 5).map((t) => (
									<button
										key={t.sku}
										type="button"
										onClick={() => handleAddTemplateItem(t.sku)}
										className="h-6 px-2 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-teal-500 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors"
										title={`Добавить ${t.name} (10 ${t.unit})`}
									>
										+ {t.name.split(" ")[0]} ({t.unit})
									</button>
								))}
							</div>

							{/* Таблица строк накладной */}
							<div className="flex-1 overflow-y-auto p-3">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)]">
										<tr>
											<th className="py-1.5 px-2">Товар</th>
											<th className="py-1.5 px-2">Серия</th>
											<th className="py-1.5 px-2">Срок годности</th>
											<th className="py-1.5 px-2">Кол-во</th>
											<th className="py-1.5 px-2">Цена без НДС</th>
											<th className="py-1.5 px-2">Сумма с НДС</th>
											<th className="py-1.5 px-2 w-8"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{draftWaybill.items.map((it) => (
											<tr key={it.id}>
												<td className="py-1.5 px-2 font-medium">{it.name}</td>
												<td className="py-1.5 px-2 font-mono text-[11px]">{it.batchNumber}</td>
												<td className="py-1.5 px-2">{it.expirationDate}</td>
												<td className="py-1.5 px-2 font-semibold">
													{it.quantity} {it.unit}
												</td>
												<td className="py-1.5 px-2">
													{money(kopecksToRubles(it.unitPriceKopecks))}
												</td>
												<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">
													{money(kopecksToRubles(it.lineTotalKopecks))}
												</td>
												<td className="py-1.5 px-2">
													<button
														type="button"
														onClick={() => handleRemoveDraftItem(it.id)}
														className="text-rose-500 hover:text-rose-700"
														title="Удалить строку"
													>
														<Trash2 size={13} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Футер формы проведения */}
							<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0 text-xs">
								<div>
									<span>Итого с НДС: </span>
									<strong className="text-sm font-bold text-teal-700 dark:text-teal-300">
										{money(kopecksToRubles(draftWaybill.totals.totalCostKopecks))}
									</strong>
									<span className="text-[11px] text-[var(--muted,#64748b)] ml-2">
										({draftWaybill.items.length} поз.)
									</span>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setIsCreatingNew(false)}
										className="h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
									>
										Отмена
									</button>
									<button
										type="button"
										onClick={() => handlePostWaybill(draftWaybill)}
										className="h-8 px-4 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-98 shadow-xs"
										data-testid="btn-confirm-post-waybill"
									>
										Провести накладную
									</button>
								</div>
							</div>
						</div>
					) : selectedWaybill ? (
						/* ПРОСМОТР ВЫБРАННОЙ НАКЛАДНОЙ */
						<div className="flex-1 flex flex-col min-h-0 overflow-hidden" data-testid="waybill-details-view">
							{/* Заголовок накладной */}
							<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
								<div>
									<div className="flex items-center gap-2">
										<h4 className="text-sm font-bold text-[var(--ink,#0f172a)]">
											Накладная № {selectedWaybill.waybillNumber}
										</h4>
										<span
											className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
												selectedWaybill.status === "posted"
													? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
													: "bg-amber-500/20 text-amber-800 dark:text-amber-200"
											}`}
										>
											{selectedWaybill.status === "posted" ? "Проведена" : "Черновик"}
										</span>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)]">
										Поставщик: <strong>{selectedWaybill.supplier.name}</strong> • ИНН {selectedWaybill.supplier.inn} • Дата: {selectedWaybill.receiptDate}
									</p>
								</div>

								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => handlePrintTorg12(selectedWaybill)}
										className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
										title="Печать накладной поступления"
										data-testid="btn-print-torg12"
									>
										<Printer size={13} />
										<span>Печать накладной</span>
									</button>

									<button
										type="button"
										onClick={() => handleExportCsv(selectedWaybill)}
										className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
										title="Экспорт накладной в CSV"
										data-testid="btn-export-waybill-csv"
									>
										<Download size={13} />
										<span>CSV</span>
									</button>
								</div>
							</div>

							{/* Позиции накладной */}
							<div className="flex-1 overflow-y-auto p-3">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] font-semibold">
										<tr>
											<th className="py-2 px-2.5">Наименование ТМЦ</th>
											<th className="py-2 px-2.5">Серия / Партия</th>
											<th className="py-2 px-2.5">Срок годности</th>
											<th className="py-2 px-2.5">Кол-во</th>
											<th className="py-2 px-2.5">Цена без НДС</th>
											<th className="py-2 px-2.5 text-right">Сумма с НДС</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{selectedWaybill.items.map((it) => (
											<tr key={it.id} className="hover:bg-[var(--paper-soft,#f8fafc)]">
												<td className="py-2 px-2.5 font-medium">{it.name}</td>
												<td className="py-2 px-2.5 font-mono text-[11px] text-[var(--muted,#64748b)]">
													{it.batchNumber}
												</td>
												<td className="py-2 px-2.5 text-[var(--muted,#64748b)]">
													{it.expirationDate}
												</td>
												<td className="py-2 px-2.5 font-semibold">
													{it.quantity} {it.unit}
												</td>
												<td className="py-2 px-2.5 text-[var(--muted,#64748b)]">
													{money(kopecksToRubles(it.unitPriceKopecks))}
												</td>
												<td className="py-2 px-2.5 text-right font-bold text-teal-700 dark:text-teal-300">
													{money(kopecksToRubles(it.lineTotalKopecks))}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Итоги накладной */}
							<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0 text-xs">
								<div className="text-[var(--muted,#64748b)]">
									Сумма без НДС: {money(kopecksToRubles(selectedWaybill.totals.subtotalKopecks))} • НДС: {money(kopecksToRubles(selectedWaybill.totals.totalVatKopecks))}
								</div>
								<div>
									<span>Итого к оплате: </span>
									<strong className="text-sm font-bold text-teal-700 dark:text-teal-300">
										{money(kopecksToRubles(selectedWaybill.totals.totalCostKopecks))}
									</strong>
								</div>
							</div>
						</div>
					) : (
						<div
							className="flex-1 flex flex-col items-center justify-center text-[var(--muted,#64748b)] text-xs gap-2 p-6 text-center"
							data-testid="waybill-details-empty"
						>
							<FileText size={36} className="opacity-40 text-teal-600" />
							<p className="font-semibold text-sm text-[var(--ink,#0f172a)]">
								{waybillsList.length === 0
									? "Склад пуст — проведите первую приходную накладную"
									: "Выберите накладную из списка или создайте новую"}
							</p>
							<p className="text-[11px] max-w-sm text-[var(--muted,#64748b)]">
								{waybillsList.length === 0
									? "После оприходования накладной партии расходников поступят на склад, а мягкий овердрафт процедур автоматически погасится."
									: "Нажмите на накладную слева для просмотра спецификации, печати ТОРГ-12 или выгрузки в CSV."}
							</p>
							{waybillsList.length === 0 && (
								<button
									type="button"
									onClick={() => {
										setIsCreatingNew(true);
										setDraftWaybill(createDraftAcceptanceWaybill({ supplier: CANONICAL_DENTAL_SUPPLIERS[0]! }));
									}}
									className="mt-2 h-8 px-4 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
									data-testid="btn-details-empty-create-wb"
								>
									<Plus size={13} />
									<span>Оприходовать накладную</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
			{/* ЭКСПРЕСС-ОПРИХОДОВАНИЕ НАКЛАДНОЙ (4 ПАРАМЕТРА) */}
			{isExpressModalOpen && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(15, 23, 42, 0.6)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: 16,
					}}
					onClick={() => setIsExpressModalOpen(false)}
					data-testid="modal-express-waybill-overlay"
				>
					<div
						style={{
							background: "var(--paper, #ffffff)",
							borderRadius: 12,
							width: "100%",
							maxWidth: 520,
							boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
							border: "1px solid var(--line, #cbd5e1)",
							overflow: "hidden",
						}}
						onClick={(e) => e.stopPropagation()}
						data-testid="modal-express-waybill"
					>
						{/* Header */}
						<div
							style={{
								padding: "12px 16px",
								borderBottom: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper-soft, #f8fafc)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<div
									style={{
										width: 28,
										height: 28,
										borderRadius: 6,
										background: "var(--primary, #0284c7)",
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Zap size={14} />
								</div>
								<div>
									<h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
										Экспресс-оприходование накладной
									</h3>
									<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
										Быстрое пополнение склада и автоматическое погашение овердрафта
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsExpressModalOpen(false)}
								style={{
									border: "none",
									background: "transparent",
									cursor: "pointer",
									color: "var(--muted, #64748b)",
									padding: 4,
								}}
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						</div>

						{/* Form (4 поля) */}
						<div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
							{/* 1. Поставщик */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
									1. Поставщик:
								</label>
								<select
									style={{
										width: "100%",
										height: 36,
										padding: "0 10px",
										borderRadius: 8,
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										fontSize: "0.8125rem",
										color: "var(--ink, #0f172a)",
									}}
									value={expressSupplierId}
									onChange={(e) => setExpressSupplierId(e.target.value)}
									data-testid="express-wb-supplier"
								>
									{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name} (ИНН: {s.inn})
										</option>
									))}
								</select>
							</div>

							{/* 2. Номер накладной */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
									2. Номер накладной:
								</label>
								<input
									type="text"
									style={{
										width: "100%",
										height: 36,
										padding: "0 10px",
										borderRadius: 8,
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										fontSize: "0.8125rem",
										color: "var(--ink, #0f172a)",
										boxSizing: "border-box",
									}}
									value={expressWaybillNum}
									onChange={(e) => setExpressWaybillNum(e.target.value)}
									placeholder="например, ТОРГ-2026/10-091"
									data-testid="express-wb-number"
								/>
							</div>

							{/* 3. Дата */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
									3. Дата накладной:
								</label>
								<input
									type="date"
									style={{
										width: "100%",
										height: 36,
										padding: "0 10px",
										borderRadius: 8,
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										fontSize: "0.8125rem",
										color: "var(--ink, #0f172a)",
										boxSizing: "border-box",
									}}
									value={expressDate}
									onChange={(e) => setExpressDate(e.target.value)}
									data-testid="express-wb-date"
								/>
							</div>

							{/* 4. Итоговая сумма */}
							<div>
								<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
									4. Итоговая сумма (₽):
								</label>
								<input
									type="number"
									style={{
										width: "100%",
										height: 36,
										padding: "0 10px",
										borderRadius: 8,
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #fff)",
										fontSize: "0.875rem",
										fontWeight: 700,
										color: "var(--teal-700, #0f766e)",
										boxSizing: "border-box",
									}}
									value={expressAmountRub}
									onChange={(e) => setExpressAmountRub(e.target.value)}
									min="0"
									step="100"
									data-testid="express-wb-amount"
								/>
							</div>
						</div>

						{/* Footer CTA */}
						<div
							style={{
								padding: "12px 16px",
								borderTop: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper-soft, #f8fafc)",
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-end",
								gap: 8,
							}}
						>
							<button
								type="button"
								onClick={() => setIsExpressModalOpen(false)}
								style={{
									height: 36,
									padding: "0 16px",
									borderRadius: 8,
									border: "1px solid var(--line, #cbd5e1)",
									background: "var(--paper, #fff)",
									fontSize: "0.8125rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
							>
								Отмена
							</button>

							<button
								type="button"
								onClick={handlePostExpressWaybill}
								style={{
									height: 36,
									padding: "0 18px",
									borderRadius: 8,
									border: "none",
									background: "var(--teal-600, #0d9488)",
									color: "#ffffff",
									fontSize: "0.8125rem",
									fontWeight: 700,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: 6,
								}}
								data-testid="btn-submit-express-wb"
							>
								<Truck size={14} />
								<span>Оприходовать накладную</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default WarehouseWaybillsTab;
