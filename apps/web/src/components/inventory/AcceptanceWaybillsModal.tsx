/**
 * ============================================================================
 * ACCEPTANCE WAYBILLS MODAL (МАНДАТЫ 8e, 8k, 8n, 8s)
 * Десктопный HUD быстрого оприходования накладных от реальных стоматологических
 * поставщиков (Стомторг, Дентал Маркет, ВладМиВа, KaVo, Рокада Мед).
 *
 * ЭРГОНОМИКА:
 * 1. Плотный десктопный вид, высота строк и кнопок 32-36px, плотная сетка.
 * 2. 1-клик шаблоны стоматологических материалов (Септанест, Филтек, ОптиБонд и т.д.).
 * 3. FEFO индикация партий (First Expired, First Out) по срокам годности.
 * 4. Копеечно-точный расчет сумм и ставок НДС (0% на медизделия/ЛС, 20% на прочее).
 * 5. Мандат 8n (Мягкий овердрафт): приход накладной автоматически закрывает дефицит
 *    экстренного списания у кресла врача без бюрократических комиссий.
 * 6. Печать унифицированной формы ТОРГ-12 и экспорт в CSV.
 * ============================================================================
 */

import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileDown,
	FileText,
	Layers,
	Plus,
	Printer,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import {
	type AcceptanceSupplier,
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	type DentalMaterialTemplate,
	type VatRate,
	calculateFefoStatus,
	calculateWaybillTotals,
	createDraftAcceptanceWaybill,
	createSampleDentalWaybill,
	createWaybillItem,
	exportWaybillToCsv,
	formatRubCurrency,
	generateTorg12Html,
	kopecksToRubles,
	reconcileOverdraftOnReceipt,
	rublesToKopecks,
	sortWaybillItemsByFefo,
	validateWaybillDraft,
} from "./acceptanceWaybillsEngine.js";
import "./acceptanceWaybills.css";

export interface AcceptanceWaybillsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: AcceptanceWaybillDocument | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number;
		readonly unitCostRub?: string | undefined;
		readonly unit?: string | undefined;
	}[] | undefined;
}

export const AcceptanceWaybillsModal: React.FC<AcceptanceWaybillsModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	initialWaybill,
	onWaybillPosted,
	inventoryItems = [],
}) => {
	// Состояние формы накладной
	const [waybill, setWaybill] = useState<AcceptanceWaybillDocument>(() =>
		initialWaybill || createSampleDentalWaybill(),
	);
	const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
		() => initialWaybill?.supplier.id || CANONICAL_DENTAL_SUPPLIERS[0]!.id,
	);
	const [isPosting, setIsPosting] = useState<boolean>(false);
	const [validationErrors, setValidationErrors] = useState<readonly string[]>([]);
	const [validationWarnings, setValidationWarnings] = useState<readonly string[]>([]);

	// Инициализация при открытии
	useEffect(() => {
		if (isOpen) {
			const initial = initialWaybill || createSampleDentalWaybill();
			setWaybill(initial);
			setSelectedSupplierId(initial.supplier.id);
			setValidationErrors([]);
			setValidationWarnings([]);
		}
	}, [isOpen, initialWaybill]);

	// Поиск дефицитных материалов среди остатков (Мандат 8n — мягкий овердрафт)
	const overdraftItemIds = useMemo(() => {
		const map = new Map<string, number>();
		for (const it of inventoryItems) {
			if (it.stockQuantity < 0) {
				map.set(it.name.toLowerCase().trim(), it.stockQuantity);
				map.set(it.id, it.stockQuantity);
			}
		}
		return map;
	}, [inventoryItems]);

	// Обновление итогов при изменении строк
	const handleItemsChange = useCallback((newItems: readonly AcceptanceWaybillItem[]) => {
		setWaybill((prev) => {
			const totals = calculateWaybillTotals(newItems);
			return {
				...prev,
				items: newItems,
				totals,
			};
		});
	}, []);

	// Смена поставщика
	const handleSupplierChange = useCallback((supplierId: string) => {
		setSelectedSupplierId(supplierId);
		const found = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === supplierId);
		if (found) {
			setWaybill((prev) => ({
				...prev,
				supplier: found,
			}));
		}
	}, []);

	// Редактирование поля строки
	const handleUpdateItem = useCallback(
		(index: number, updates: Partial<AcceptanceWaybillItem>) => {
			setWaybill((prev) => {
				const updated = [...prev.items];
				const current = updated[index];
				if (!current) return prev;

				const nextItem = createWaybillItem({
					id: current.id,
					inventoryItemId: updates.inventoryItemId ?? current.inventoryItemId,
					name: updates.name ?? current.name,
					category: updates.category ?? current.category,
					unit: updates.unit ?? current.unit,
					batchNumber: updates.batchNumber ?? current.batchNumber,
					expirationDate: updates.expirationDate ?? current.expirationDate,
					manufactureDate: updates.manufactureDate ?? current.manufactureDate,
					quantity: updates.quantity ?? current.quantity,
					unitPriceKopecks: updates.unitPriceKopecks ?? current.unitPriceKopecks,
					vatRate: updates.vatRate ?? current.vatRate,
					barcode: updates.barcode ?? current.barcode,
					sku: updates.sku ?? current.sku,
					notes: updates.notes ?? current.notes,
					referenceDateIso: prev.receiptDate,
				});

				updated[index] = nextItem;
				const totals = calculateWaybillTotals(updated);
				return {
					...prev,
					items: updated,
					totals,
				};
			});
		},
		[],
	);

	// Удаление строки
	const handleRemoveItem = useCallback((index: number) => {
		setWaybill((prev) => {
			const updated = prev.items.filter((_, idx) => idx !== index);
			const totals = calculateWaybillTotals(updated);
			return {
				...prev,
				items: updated,
				totals,
			};
		});
	}, []);

	// Добавление стоматологического материала из шаблона в 1 клик
	const handleAddFromTemplate = useCallback((template: DentalMaterialTemplate) => {
		setWaybill((prev) => {
			const today = new Date();
			today.setMonth(today.getMonth() + template.shelfLifeMonths);
			const expDate = today.toISOString().slice(0, 10);
			const batchNum = `${template.defaultBatchPrefix}-${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`;

			const newItem = createWaybillItem({
				name: template.name,
				category: template.category,
				unit: template.unit,
				batchNumber: batchNum,
				expirationDate: expDate,
				quantity: 5,
				unitPriceKopecks: template.defaultUnitPriceKopecks,
				vatRate: template.vatRate,
				sku: template.sku,
				barcode: template.barcode,
				referenceDateIso: prev.receiptDate,
			});

			const updated = [...prev.items, newItem];
			const totals = calculateWaybillTotals(updated);
			return {
				...prev,
				items: updated,
				totals,
			};
		});
		showToast(`Добавлен: ${template.name}`, "info");
	}, []);

	// Добавление произвольной пустой строки
	const handleAddEmptyItem = useCallback(() => {
		setWaybill((prev) => {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 2);
			const expDate = futureDate.toISOString().slice(0, 10);

			const newItem = createWaybillItem({
				name: "",
				category: "Расходные материалы",
				unit: "шт",
				batchNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
				expirationDate: expDate,
				quantity: 1,
				unitPriceKopecks: 10000,
				vatRate: 0,
				referenceDateIso: prev.receiptDate,
			});

			const updated = [...prev.items, newItem];
			const totals = calculateWaybillTotals(updated);
			return {
				...prev,
				items: updated,
				totals,
			};
		});
	}, []);

	// Загрузка готовой накладной от Стомторга
	const handleLoadSample = useCallback(() => {
		const sample = createSampleDentalWaybill();
		setWaybill(sample);
		setSelectedSupplierId(sample.supplier.id);
		showToast("Загружена эталонная накладная (Стомторг, 6 стоматологических позиций)", "success");
	}, []);

	// Сортировка по FEFO
	const handleSortFefo = useCallback(() => {
		setWaybill((prev) => {
			const sorted = sortWaybillItemsByFefo(prev.items, "asc");
			return {
				...prev,
				items: sorted,
			};
		});
		showToast("Строки отсортированы по FEFO (первыми идут с ближайшим сроком)", "info");
	}, []);

	// Печать ТОРГ-12
	const handlePrintTorg12 = useCallback(() => {
		const html = generateTorg12Html(waybill);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		} else {
			showToast("Разрешите всплывающие окна для печати ТОРГ-12", "warning");
		}
	}, [waybill]);

	// Экспорт в CSV
	const handleExportCsv = useCallback(() => {
		const csv = exportWaybillToCsv(waybill);
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Накладная_${waybill.waybillNumber}_${waybill.receiptDate}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast("Накладная выгружена в CSV", "success");
	}, [waybill]);

	// 1-клик Проведение накладной (зачисление на склад)
	const handlePostWaybill = useCallback(async () => {
		const validation = validateWaybillDraft(waybill);
		setValidationErrors(validation.errors);
		setValidationWarnings(validation.warnings);

		if (!validation.isValid) {
			showToast(`Ошибка: ${validation.errors[0]}`, "error");
			return;
		}

		setIsPosting(true);
		try {
			// Вызов API эндпоинта если передан organizationId
			if (organizationId) {
				const response = await fetch(`/api/inventory/${organizationId}/acceptance-waybill`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						supplierName: waybill.supplier.name,
						supplierInn: waybill.supplier.inn,
						waybillNumber: waybill.waybillNumber,
						receiptDate: waybill.receiptDate,
						warehouseId: waybill.warehouseId ?? null,
						warehouseName: waybill.warehouseName,
						notes: waybill.notes,
						items: waybill.items.map((it) => ({
							inventoryItemId: it.inventoryItemId,
							name: it.name,
							category: it.category,
							unit: it.unit,
							batchNumber: it.batchNumber,
							expirationDate: it.expirationDate,
							manufactureDate: it.manufactureDate,
							quantity: it.quantity,
							purchasePriceKopecks: it.unitPriceKopecks,
							vatRate: it.vatRate,
							sku: it.sku,
							barcode: it.barcode,
							notes: it.notes,
						})),
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.message || "Ошибка сервера при проведении накладной");
				}
			}

			const postedDoc: AcceptanceWaybillDocument = {
				...waybill,
				status: "posted",
				postedAt: new Date().toISOString(),
				postedBy: "Авторизованный пользователь",
			};

			if (onWaybillPosted) {
				await onWaybillPosted(postedDoc);
			}

			showToast(
				`Накладная №${waybill.waybillNumber} проведена! Оприходовано ${waybill.totals.totalPositions} позиций (${formatRubCurrency(waybill.totals.totalCostKopecks)})`,
				"success",
			);
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось провести накладную";
			showToast(msg, "error");
		} finally {
			setIsPosting(false);
		}
	}, [waybill, organizationId, onWaybillPosted, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="acceptance-modal-overlay" role="dialog" aria-modal="true" data-testid="acceptance-waybills-modal">
			<div className="acceptance-modal-window">
				{/* 1. Шапка модального окна */}
				<header className="acceptance-modal-header">
					<div className="acceptance-modal-title">
						<FileDown size={20} style={{ color: "var(--teal, #0d9488)" }} />
						<span>Приходная накладная поставщика (Оприходование & FEFO)</span>
						<span
							style={{
								fontSize: 11,
								padding: "2px 8px",
								borderRadius: 12,
								background: "rgba(13, 148, 136, 0.12)",
								color: "var(--teal, #0d9488)",
								fontWeight: 700,
							}}
						>
							Мандаты 8e / 8n
						</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button
							type="button"
							onClick={handleLoadSample}
							className="acceptance-btn-secondary"
							style={{ height: 32, fontSize: 12 }}
							title="Загрузить образцовую накладную от Стомторга со стандартным набором материалов"
							data-testid="btn-load-sample-waybill"
						>
							<Sparkles size={14} style={{ color: "var(--teal, #0d9488)" }} />
							<span>Образец (Стомторг)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="acceptance-btn-danger"
							title="Закрыть окно"
							data-testid="btn-close-acceptance-modal"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 2. Мета-панель (Поставщик, Номер, Дата, Склад) */}
				<section className="acceptance-meta-bar">
					<div className="acceptance-meta-field">
						<label className="acceptance-meta-label">Поставщик</label>
						<select
							className="acceptance-select"
							value={selectedSupplierId}
							onChange={(e) => handleSupplierChange(e.target.value)}
							data-testid="select-supplier"
						>
							{CANONICAL_DENTAL_SUPPLIERS.map((sup) => (
								<option key={sup.id} value={sup.id}>
									{sup.name} {sup.inn ? `(ИНН ${sup.inn})` : ""}
								</option>
							))}
						</select>
					</div>

					<div className="acceptance-meta-field">
						<label className="acceptance-meta-label">ИНН поставщика</label>
						<input
							type="text"
							className="acceptance-input"
							value={waybill.supplier.inn}
							onChange={(e) =>
								setWaybill((prev) => ({
									...prev,
									supplier: { ...prev.supplier, inn: e.target.value },
								}))
							}
							placeholder="7701234567"
							data-testid="input-supplier-inn"
						/>
					</div>

					<div className="acceptance-meta-field">
						<label className="acceptance-meta-label">Номер накладной</label>
						<input
							type="text"
							className="acceptance-input"
							value={waybill.waybillNumber}
							onChange={(e) => setWaybill((prev) => ({ ...prev, waybillNumber: e.target.value }))}
							placeholder="СТ-48192"
							data-testid="input-waybill-number"
						/>
					</div>

					<div className="acceptance-meta-field">
						<label className="acceptance-meta-label">Дата прихода</label>
						<input
							type="date"
							className="acceptance-input"
							value={waybill.receiptDate}
							onChange={(e) => setWaybill((prev) => ({ ...prev, receiptDate: e.target.value }))}
							data-testid="input-receipt-date"
						/>
					</div>

					<div className="acceptance-meta-field">
						<label className="acceptance-meta-label">Склад зачисления</label>
						<select
							className="acceptance-select"
							value={waybill.warehouseName}
							onChange={(e) => setWaybill((prev) => ({ ...prev, warehouseName: e.target.value }))}
							data-testid="select-warehouse-destination"
						>
							<option value="Центральный склад клиники">Центральный склад клиники</option>
							<option value="Кабинет №1 (Терапия)">Кабинет №1 (Терапия)</option>
							<option value="Кабинет №2 (Хирургия)">Кабинет №2 (Хирургия)</option>
							<option value="Кабинет №3 (Ортопедия)">Кабинет №3 (Ортопедия)</option>
						</select>
					</div>
				</section>

				{/* 3. Пресеты быстрого добавления стоматологических материалов */}
				<section className="acceptance-presets-toolbar">
					<span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Быстрый выбор:
					</span>
					{CANONICAL_DENTAL_MATERIAL_TEMPLATES.map((tmpl) => (
						<button
							key={tmpl.name}
							type="button"
							className="acceptance-preset-chip"
							onClick={() => handleAddFromTemplate(tmpl)}
							title={`Добавить ${tmpl.name} (${tmpl.category}, ставка НДС ${tmpl.vatRate}%)`}
						>
							<Plus size={12} />
							<span>{tmpl.name.split(" ")[0]}</span>
						</button>
					))}
					<button
						type="button"
						className="acceptance-preset-chip"
						style={{ background: "var(--teal-soft, rgba(13,148,136,0.1))", color: "var(--teal, #0d9488)" }}
						onClick={handleAddEmptyItem}
						data-testid="btn-add-empty-line"
					>
						<Plus size={12} />
						<span>+ Своя строка</span>
					</button>
					<button
						type="button"
						className="acceptance-preset-chip"
						onClick={handleSortFefo}
						title="Сортировать по FEFO (первыми расходуются партии с наименьшим сроком)"
						data-testid="btn-sort-fefo"
					>
						<Layers size={12} />
						<span>Сортировка FEFO</span>
					</button>
				</section>

				{/* 4. Таблица позиций накладной */}
				<main className="acceptance-table-container">
					<table className="acceptance-table">
						<thead>
							<tr>
								<th style={{ width: "32px", textAlign: "center" }}>№</th>
								<th style={{ width: "28%" }}>Наименование материала</th>
								<th style={{ width: "13%" }}>Серия / Партия</th>
								<th style={{ width: "14%" }}>Срок годности (FEFO)</th>
								<th style={{ width: "7%", textAlign: "center" }}>Ед.</th>
								<th style={{ width: "7%", textAlign: "right" }}>Кол-во</th>
								<th style={{ width: "10%", textAlign: "right" }}>Закупка, ₽</th>
								<th style={{ width: "8%", textAlign: "center" }}>НДС</th>
								<th style={{ width: "10%", textAlign: "right" }}>Сумма, ₽</th>
								<th style={{ width: "36px", textAlign: "center" }}></th>
							</tr>
						</thead>
						<tbody>
							{waybill.items.map((item, idx) => {
								const fefo = calculateFefoStatus(item.expirationDate, waybill.receiptDate);
								const deficitStock = overdraftItemIds.get(item.name.toLowerCase().trim());
								const hasOverdraft = deficitStock !== undefined && deficitStock < 0;

								return (
									<tr key={item.id} data-testid={`waybill-row-${idx}`}>
										<td style={{ textAlign: "center", fontSize: 11, color: "var(--muted)" }}>{idx + 1}</td>
										<td>
											<input
												type="text"
												className="acceptance-table-input"
												value={item.name}
												onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
												placeholder="Название материала"
											/>
											{hasOverdraft && (
												<div
													style={{
														fontSize: 10,
														color: "var(--amber, #f59e0b)",
														display: "flex",
														alignItems: "center",
														gap: 3,
														marginTop: 2,
													}}
													title="Мандат 8n: приход автоматически закроет накопленный дефицит"
												>
													<AlertTriangle size={10} />
													<span>Дефицит на складе: {deficitStock} ед. (будет погашен)</span>
												</div>
											)}
										</td>
										<td>
											<input
												type="text"
												className="acceptance-table-input"
												value={item.batchNumber}
												onChange={(e) => handleUpdateItem(idx, { batchNumber: e.target.value })}
												placeholder="LOT-2026-X"
											/>
										</td>
										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
												<input
													type="date"
													className="acceptance-table-input"
													value={item.expirationDate}
													onChange={(e) => handleUpdateItem(idx, { expirationDate: e.target.value })}
												/>
												<span
													className="fefo-badge"
													style={{ color: fefo.hexColor, background: fefo.bgSoft }}
												>
													{fefo.badgeLabelRu}
												</span>
											</div>
										</td>
										<td style={{ textAlign: "center" }}>
											<input
												type="text"
												className="acceptance-table-input"
												style={{ textAlign: "center", width: "45px", margin: "0 auto" }}
												value={item.unit}
												onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
											/>
										</td>
										<td style={{ textAlign: "right" }}>
											<input
												type="number"
												step="1"
												min="0"
												className="acceptance-table-input"
												style={{ textAlign: "right" }}
												value={item.quantity}
												onChange={(e) =>
													handleUpdateItem(idx, { quantity: Math.max(0, Number(e.target.value)) })
												}
											/>
										</td>
										<td style={{ textAlign: "right" }}>
											<input
												type="number"
												step="0.01"
												min="0"
												className="acceptance-table-input"
												style={{ textAlign: "right" }}
												value={(item.unitPriceKopecks / 100).toFixed(2)}
												onChange={(e) => {
													const val = Number(e.target.value);
													handleUpdateItem(idx, { unitPriceKopecks: rublesToKopecks(val) });
												}}
											/>
										</td>
										<td style={{ textAlign: "center" }}>
											<select
												className="acceptance-table-input"
												style={{ height: 28, fontSize: 11, textAlign: "center" }}
												value={item.vatRate}
												onChange={(e) =>
													handleUpdateItem(idx, { vatRate: Number(e.target.value) as VatRate })
												}
											>
												<option value={0}>0%</option>
												<option value={10}>10%</option>
												<option value={20}>20%</option>
											</select>
										</td>
										<td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
											{formatRubCurrency(item.lineTotalKopecks)}
										</td>
										<td style={{ textAlign: "center" }}>
											<button
												type="button"
												className="acceptance-btn-danger"
												onClick={() => handleRemoveItem(idx)}
												title="Удалить позицию"
												data-testid={`btn-remove-item-${idx}`}
											>
												<Trash2 size={14} />
											</button>
										</td>
									</tr>
								);
							})}
							{waybill.items.length === 0 && (
								<tr>
									<td colSpan={10} style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
										Позиции отсутствуют. Нажмите кнопку <strong>«Образец (Стомторг)»</strong> или добавьте материалы кнопками быстрого выбора.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</main>

				{/* 5. Подвал модального окна (Сводка и кнопки действий) */}
				<footer className="acceptance-modal-footer">
					<div className="acceptance-summary-block">
						<div className="acceptance-summary-item">
							<span className="acceptance-summary-label">Позиций</span>
							<span className="acceptance-summary-value">{waybill.totals.totalPositions}</span>
						</div>
						<div className="acceptance-summary-item">
							<span className="acceptance-summary-label">Количество ед.</span>
							<span className="acceptance-summary-value">{waybill.totals.totalQuantity}</span>
						</div>
						<div className="acceptance-summary-item">
							<span className="acceptance-summary-label">Сумма без НДС</span>
							<span className="acceptance-summary-value">
								{formatRubCurrency(waybill.totals.subtotalKopecks)}
							</span>
						</div>
						<div className="acceptance-summary-item">
							<span className="acceptance-summary-label">НДС</span>
							<span className="acceptance-summary-value">
								{formatRubCurrency(waybill.totals.totalVatKopecks)}
							</span>
						</div>
						<div className="acceptance-summary-item">
							<span className="acceptance-summary-label">Итого с НДС</span>
							<span className="acceptance-summary-value" style={{ color: "var(--teal, #0d9488)", fontSize: 16 }}>
								{formatRubCurrency(waybill.totals.totalCostKopecks)}
							</span>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button
							type="button"
							className="acceptance-btn-secondary"
							onClick={handlePrintTorg12}
							title="Печать унифицированной формы ТОРГ-12"
							data-testid="btn-print-torg12"
						>
							<Printer size={15} />
							<span>Печать ТОРГ-12</span>
						</button>

						<button
							type="button"
							className="acceptance-btn-secondary"
							onClick={handleExportCsv}
							title="Экспорт в CSV файл"
							data-testid="btn-export-csv"
						>
							<Download size={15} />
							<span>CSV</span>
						</button>

						<button
							type="button"
							className="acceptance-btn-primary"
							onClick={handlePostWaybill}
							disabled={isPosting || waybill.items.length === 0}
							data-testid="btn-post-acceptance-waybill"
						>
							<CheckCircle2 size={16} />
							<span>{isPosting ? "Проведение..." : "Провести накладную"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
