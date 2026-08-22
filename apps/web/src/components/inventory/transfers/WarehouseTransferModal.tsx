/**
 * ============================================================================
 * WAREHOUSE TRANSFER & TORG-13 MODAL (МЕЖФИЛИАЛЬНЫЕ ПЕРЕМЕЩЕНИЯ ТМЦ)
 * Сенсорный HUD управления межскладской логистикой, формирования накладных ТОРГ-13,
 * фиксации приемки и актирования расхождений ТОРГ-2.
 * ============================================================================
 */

import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Boxes,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	FileText,
	Filter,
	Layers,
	PackageCheck,
	PackageOpen,
	PackagePlus,
	PackageSearch,
	Plus,
	Printer,
	RefreshCw,
	ShieldCheck,
	Trash2,
	Truck,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	calculateTransferTotals,
	formatRubCurrency,
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
	kopecksToRubles,
	rublesToKopecks,
	validateTransferDraft,
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
	type WarehouseTransferLineItem,
} from "./warehouseTransferEngine.js";
import "./warehouseTransfer.css";
import {
	getWarehouseBranch,
	getWarehouseItemCatalogPreset,
	TRANSFER_STATUS_PIPELINE,
	WAREHOUSE_BRANCHES,
	WAREHOUSE_CATALOG_PRESETS,
	type WarehouseBranchId,
	type WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseTransferDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseTransferDocument) => void) | undefined;
	readonly onConfirmTransfer?: ((doc?: WarehouseTransferDocument) => void | Promise<void>) | undefined;
	readonly onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined;
}

export const WarehouseTransferModal: React.FC<WarehouseTransferModalProps> = ({
	isOpen,
	onClose,
	initialDocument,
	onDocumentSaved,
	onDiscrepancyActGenerated,
}) => {
	// 1. Шапка накладной
	const [docNumber, setDocNumber] = useState<string>(
		initialDocument?.documentNumber || `ТОРГ-13-2026/08-${Math.floor(100 + Math.random() * 900)}`,
	);
	const [docDate, setDocDate] = useState<string>(
		initialDocument?.documentDate || new Date().toISOString().slice(0, 10),
	);
	const [sourceBranchId, setSourceBranchId] = useState<WarehouseBranchId>(
		initialDocument?.sourceBranchId || "central_hub",
	);
	const [targetBranchId, setTargetBranchId] = useState<WarehouseBranchId>(
		initialDocument?.targetBranchId || "branch_center",
	);
	const [status, setStatus] = useState<WarehouseTransferStatus>(
		initialDocument?.status || "draft",
	);

	// 2. Лица и транспортировка
	const [dispatchedBy, setDispatchedBy] = useState<string>(
		initialDocument?.dispatchedByFullName || "Васильев О.П.",
	);
	const [dispatchedPosition, setDispatchedPosition] = useState<string>(
		initialDocument?.dispatchedByPosition || "Заведующий складом",
	);
	const [receivedBy, setReceivedBy] = useState<string>(
		initialDocument?.receivedByFullName || "Смирнова А.В.",
	);
	const [receivedPosition, setReceivedPosition] = useState<string>(
		initialDocument?.receivedByPosition || "Главная медсестра",
	);
	const [driverName, setDriverName] = useState<string>(
		initialDocument?.transportDriverFullName || "Кузнецов М.С. (Служба доставки)",
	);
	const [vehiclePlate, setVehiclePlate] = useState<string>(
		initialDocument?.transportVehiclePlate || "А 784 МЕ 777",
	);
	const [notes, setNotes] = useState<string>(initialDocument?.notes || "");

	// 3. Строки товаров
	const [items, setItems] = useState<WarehouseTransferLineItem[]>([]);
	const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>(
		WAREHOUSE_CATALOG_PRESETS[0]?.id || "mat_ultracain_forte",
	);
	const [addQuantity, setAddQuantity] = useState<number>(5);

	// Инициализация строк при открытии
	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) {
				setItems([...initialDocument.items]);
			} else {
				// Демо-набор позиций перемещения
				setItems([
					{
						itemId: "mat_ultracain_forte",
						sku: "AN-ULTRA-01",
						nameRu: "Ультракаин Д-С Форте (100 карпул/уп)",
						unitRu: "упак",
						okeiCode: "778",
						batchNumber: "LOT-2026A44",
						expiryDate: "2027-12-31",
						requestedQuantity: 10,
						dispatchedQuantity: 10,
						receivedQuantity: 10,
						unitCostKopecks: 650000, // 6 500 руб
						discrepancyType: "none",
					},
					{
						itemId: "mat_impl_osstem_40_10",
						sku: "IMP-OSST-4010",
						nameRu: "Дентальный имплантат Osstem TS III SA Ø4.0 x 10 мм",
						unitRu: "шт",
						okeiCode: "796",
						batchNumber: "LOT-OS-5541",
						expiryDate: "2029-06-30",
						requestedQuantity: 5,
						dispatchedQuantity: 5,
						receivedQuantity: 5,
						unitCostKopecks: 1250000, // 12 500 руб
						discrepancyType: "none",
					},
					{
						itemId: "mat_filtek_ultimate_a2",
						sku: "COMP-FILT-A2",
						nameRu: "Композит Filtek Ultimate шприц 4г (Enamel A2)",
						unitRu: "шт",
						okeiCode: "796",
						batchNumber: "LOT-FLT-772",
						expiryDate: "2027-05-15",
						requestedQuantity: 4,
						dispatchedQuantity: 4,
						receivedQuantity: 4,
						unitCostKopecks: 420000, // 4 200 руб
						discrepancyType: "none",
					},
				]);
			}
		}
	}, [isOpen, initialDocument]);

	// Сводные суммы и валидация
	const totals = useMemo(() => calculateTransferTotals(items), [items]);
	const validation = useMemo(() => {
		return validateTransferDraft(sourceBranchId, targetBranchId, items);
	}, [sourceBranchId, targetBranchId, items]);

	// Добавление товара из каталога
	const handleAddItem = () => {
		const preset = getWarehouseItemCatalogPreset(selectedCatalogItemId);
		if (!preset) return;

		// Проверка на дубликат в таблице
		const existingIndex = items.findIndex((i) => i.itemId === preset.id);
		if (existingIndex >= 0) {
			const updated = [...items];
			const current = updated[existingIndex]!;
			updated[existingIndex] = {
				...current,
				requestedQuantity: current.requestedQuantity + addQuantity,
				dispatchedQuantity: current.dispatchedQuantity + addQuantity,
				receivedQuantity: current.receivedQuantity + addQuantity,
			};
			setItems(updated);
			return;
		}

		const newItem: WarehouseTransferLineItem = {
			itemId: preset.id,
			sku: preset.sku,
			nameRu: preset.nameRu,
			unitRu: preset.unitRu,
			okeiCode: preset.okeiCode,
			batchNumber: preset.defaultBatchNumber,
			expiryDate: "2027-12-31",
			requestedQuantity: addQuantity,
			dispatchedQuantity: addQuantity,
			receivedQuantity: addQuantity,
			unitCostKopecks: preset.unitCostKopecks,
			discrepancyType: "none",
		};

		setItems((prev) => [...prev, newItem]);
		setAddQuantity(1);
	};

	// Удаление строки
	const handleRemoveItem = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	// Изменение количества или данных строки
	const handleUpdateItem = (index: number, patch: Partial<WarehouseTransferLineItem>) => {
		setItems((prev) => {
			const updated = [...prev];
			const current = updated[index];
			if (current) {
				updated[index] = { ...current, ...patch };
			}
			return updated;
		});
	};

	// Сохранение документа
	const handleSaveDocument = (newStatus?: WarehouseTransferStatus) => {
		const effectiveStatus = newStatus || status;
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber,
			documentDate: docDate,
			sourceBranchId,
			targetBranchId,
			status: effectiveStatus,
			items,
			dispatchedByFullName: dispatchedBy,
			dispatchedByPosition: dispatchedPosition,
			receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition,
			transportDriverFullName: driverName || undefined,
			transportVehiclePlate: vehiclePlate || undefined,
			notes: notes.trim() || undefined,
		};

		if (onDocumentSaved) {
			onDocumentSaved(doc);
		}
		onClose();
	};

	// Печать накладной ТОРГ-13
	const handlePrintTorg13 = () => {
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber,
			documentDate: docDate,
			sourceBranchId,
			targetBranchId,
			status,
			items,
			dispatchedByFullName: dispatchedBy,
			dispatchedByPosition: dispatchedPosition,
			receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition,
			transportDriverFullName: driverName || undefined,
			transportVehiclePlate: vehiclePlate || undefined,
		};

		const html = generateTorg13Html(doc);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	// Печать Акта расхождений ТОРГ-2
	const handlePrintTorg2 = () => {
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber,
			documentDate: docDate,
			sourceBranchId,
			targetBranchId,
			status,
			items,
			dispatchedByFullName: dispatchedBy,
			dispatchedByPosition: dispatchedPosition,
			receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition,
			transportDriverFullName: driverName || undefined,
			transportVehiclePlate: vehiclePlate || undefined,
		};

		const act = generateDiscrepancyAct(doc);
		if (onDiscrepancyActGenerated) {
			onDiscrepancyActGenerated(act);
		}

		const html = generateTorg2Html(act);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="wh-transfer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wh-modal-title">
			<div className="wh-transfer-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="wh-transfer-header">
					<div className="wh-transfer-title" id="wh-modal-title">
						<Truck size={24} className="text-teal-600" />
						<div>
							<div className="font-bold text-lg leading-tight">
								Межфилиальное Перемещение ТМЦ (ТОРГ-13)
							</div>
							<div className="text-xs font-normal text-muted">
								Централизованная складская логистика • Партионный учет • Акты расхождений ТОРГ-2
							</div>
						</div>
					</div>

					<button
						type="button"
						className="wh-btn wh-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно перемещения"
					>
						<X size={20} />
					</button>
				</header>

				{/* Stepper статусов */}
				<div className="px-6 pt-3 bg-paper-strong border-b border-line">
					<div className="wh-stepper">
						{(["draft", "requested", "dispatched", "in_transit", "received_ok"] as const).map((st, idx) => {
							const def = TRANSFER_STATUS_PIPELINE[st];
							const currentIdx = TRANSFER_STATUS_PIPELINE[status]?.stepIndex || 1;
							const isCompleted = currentIdx > def.stepIndex;
							const isActive = status === st;

							return (
								<div
									key={st}
									className={`wh-step-item cursor-pointer ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
									onClick={() => setStatus(st)}
								>
									<div className="wh-step-circle">
										{isCompleted ? <Check size={14} /> : def.stepIndex}
									</div>
									<span>{def.labelRu}</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Body */}
				<div className="wh-transfer-body">
					{/* 1. Маршрут: Отправитель -> Получатель */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
						<div>
							<label htmlFor="wh-source-branch" className="text-xs font-semibold text-muted block mb-1">
								Склад-отправитель (Списание)
							</label>
							<select
								id="wh-source-branch"
								value={sourceBranchId}
								onChange={(e) => setSourceBranchId(e.target.value as WarehouseBranchId)}
								className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
							>
								{WAREHOUSE_BRANCHES.map((b) => (
									<option key={b.id} value={b.id}>
										{b.nameRu}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="wh-target-branch" className="text-xs font-semibold text-muted block mb-1">
								Склад-получатель (Оприходование)
							</label>
							<select
								id="wh-target-branch"
								value={targetBranchId}
								onChange={(e) => setTargetBranchId(e.target.value as WarehouseBranchId)}
								className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
							>
								{WAREHOUSE_BRANCHES.map((b) => (
									<option key={b.id} value={b.id}>
										{b.nameRu}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="wh-doc-number" className="text-xs font-semibold text-muted block mb-1">
								Номер накладной и Дата
							</label>
							<div className="flex gap-2">
								<input
									id="wh-doc-number"
									type="text"
									value={docNumber}
									onChange={(e) => setDocNumber(e.target.value)}
									className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-mono font-bold"
								/>
								<input
									type="date"
									value={docDate}
									onChange={(e) => setDocDate(e.target.value)}
									className="w-36 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm"
								/>
							</div>
						</div>
					</div>

					{/* Ошибки валидации */}
					{!validation.isValid && (
						<div className="p-3 rounded-lg bg-bad-bg text-bad-fg text-xs flex items-center gap-2">
							<AlertTriangle size={16} className="shrink-0" />
							<span>{validation.errors.join("; ")}</span>
						</div>
					)}

					{/* 2. Таблица позиций */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<div className="font-bold text-sm flex items-center gap-1.5">
								<Boxes size={18} className="text-teal-600" />
								<span>Товарно-материальные ценности к перемещению</span>
							</div>
							<div className="text-xs text-muted">
								Позиций: <span className="font-bold text-ink">{items.length}</span>
							</div>
						</div>

						<div className="wh-table-container">
							<table className="wh-table">
								<thead>
									<tr>
										<th>Товар / Артикул</th>
										<th>Серия (LOT)</th>
										<th>Срок годности</th>
										<th className="text-center">Запрошено</th>
										<th className="text-center">Отпущено</th>
										<th className="text-center">Принято</th>
										<th className="text-right">Цена, ₽</th>
										<th className="text-right">Сумма, ₽</th>
										<th className="text-center">Расхождение</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{items.map((item, index) => {
										const unitRub = kopecksToRubles(item.unitCostKopecks);
										const totalRub = (item.dispatchedQuantity * item.unitCostKopecks) / 100;
										const diff = item.dispatchedQuantity - item.receivedQuantity;

										return (
											<tr key={item.itemId}>
												<td>
													<div className="font-semibold text-ink leading-tight">{item.nameRu}</div>
													<div className="text-xs text-muted font-mono">{item.sku}</div>
												</td>
												<td>
													<input
														type="text"
														value={item.batchNumber}
														onChange={(e) => handleUpdateItem(index, { batchNumber: e.target.value })}
														className="w-24 h-8 px-2 rounded border border-line bg-paper text-xs font-mono"
													/>
												</td>
												<td>
													<input
														type="date"
														value={item.expiryDate}
														onChange={(e) => handleUpdateItem(index, { expiryDate: e.target.value })}
														className="w-32 h-8 px-2 rounded border border-line bg-paper text-xs"
													/>
												</td>
												<td className="text-center font-semibold">
													{item.requestedQuantity} {item.unitRu}
												</td>
												<td className="text-center">
													<input
														type="number"
														min={0}
														value={item.dispatchedQuantity}
														onChange={(e) =>
															handleUpdateItem(index, {
																dispatchedQuantity: Number(e.target.value),
															})
														}
														className="w-16 h-8 text-center font-bold rounded border border-line bg-paper text-xs"
													/>
												</td>
												<td className="text-center">
													<input
														type="number"
														min={0}
														value={item.receivedQuantity}
														onChange={(e) =>
															handleUpdateItem(index, {
																receivedQuantity: Number(e.target.value),
															})
														}
														className="w-16 h-8 text-center font-bold rounded border border-line bg-paper text-xs"
													/>
												</td>
												<td className="text-right font-medium text-muted">
													{unitRub.toFixed(2)}
												</td>
												<td className="text-right font-black text-ink">
													{totalRub.toFixed(2)}
												</td>
												<td className="text-center">
													{diff !== 0 ? (
														<span className="text-xs font-bold text-bad-fg bg-bad-bg px-2 py-0.5 rounded-full">
															{diff > 0 ? `Недостача -${diff}` : `Излишек +${Math.abs(diff)}`}
														</span>
													) : (
														<span className="text-xs font-semibold text-ok-fg">ОК</span>
													)}
												</td>
												<td className="text-center">
													<button
														type="button"
														onClick={() => handleRemoveItem(index)}
														className="text-muted hover:text-bad-fg p-1.5 rounded transition-colors"
														title="Удалить позицию"
													>
														<Trash2 size={16} />
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Строка быстрого добавления из каталога */}
						<div className="p-3 rounded-xl border border-line bg-paper-soft flex flex-wrap gap-2 items-center">
							<select
								value={selectedCatalogItemId}
								onChange={(e) => setSelectedCatalogItemId(e.target.value)}
								className="flex-1 min-w-[280px] h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm"
							>
								{WAREHOUSE_CATALOG_PRESETS.map((p) => {
									const sourceStock = p.initialStockByBranch[sourceBranchId] ?? 0;
									return (
										<option key={p.id} value={p.id}>
											{p.nameRu} (Остаток на складе: {sourceStock} {p.unitRu})
										</option>
									);
								})}
							</select>

							<input
								type="number"
								min={1}
								value={addQuantity}
								onChange={(e) => setAddQuantity(Number(e.target.value))}
								className="w-20 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center font-bold"
							/>

							<button
								type="button"
								onClick={handleAddItem}
								className="wh-btn wh-btn-secondary h-10"
							>
								<Plus size={16} /> Добавить в накладную
							</button>
						</div>
					</div>

					{/* 3. Сводная плашка сумм */}
					<div className="wh-summary-bar">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Всего отпущено</span>
							<span className="text-lg font-black text-ink">
								{totals.totalDispatchedQuantity} ед.
							</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Сумма по накладной</span>
							<span className="text-xl font-extrabold text-teal-dark">
								{formatRubCurrency(totals.totalDispatchedCostKopecks, true)}
							</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Фактически принято</span>
							<span className="text-lg font-black text-ink">
								{totals.totalReceivedQuantity} ед.
							</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold uppercase text-bad-fg">Сумма расхождений</span>
							<span className="text-lg font-black text-bad-fg">
								{totals.hasDiscrepancy
									? formatRubCurrency(totals.totalDiscrepancyDamageKopecks, true)
									: "0,00 ₽"}
							</span>
						</div>
					</div>
				</div>

				{/* Footer */}
				<footer className="wh-transfer-footer">
					<button
						type="button"
						className="wh-btn wh-btn-secondary"
						onClick={handlePrintTorg13}
						title="Печать официальной накладной ТОРГ-13"
					>
						<Printer size={16} /> Накладная ТОРГ-13 (А4)
					</button>

					{totals.hasDiscrepancy && (
						<button
							type="button"
							className="wh-btn wh-btn-secondary text-bad-fg"
							onClick={handlePrintTorg2}
							title="Печать акта об установленном расхождении ТОРГ-2"
						>
							<FileText size={16} /> Акт расхождений ТОРГ-2
						</button>
					)}

					<button
						type="button"
						className="wh-btn wh-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>

					<button
						type="button"
						className="wh-btn wh-btn-primary"
						onClick={() => handleSaveDocument()}
					>
						<PackageCheck size={18} /> Сохранить перемещение
					</button>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
