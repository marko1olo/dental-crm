/**
 * ============================================================================
 * WAREHOUSE INVENTORY AUDIT MODAL (ИНВ-3, ИНВ-19, ТОРГ-16 & FEFO)
 * Интерактивный HUD управления инвентаризацией стоматологических расходных материалов,
 * формирования описей ИНВ-3, сличительных ведомостей ИНВ-19, партионного контроля
 * сроков годности FEFO и актов списания ТОРГ-16.
 * ============================================================================
 */

import {
	Boxes,
	Check,
	CheckCircle2,
	Download,
	FileCode,
	FileSpreadsheet,
	PackageCheck,
	PackageX,
	Printer,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	type InventoryAuditTotals,
	type WarehouseAuditItemLine,
	type WarehouseInventoryAuditDocument,
	type WarehouseInventoryCommissionMember,
	type WarehouseInventoryStatus,
	type WarehouseTorg16WriteoffAct,
	calculateInventoryAuditTotals,
	computeAuditLineItem,
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	formatRubCurrency,
	generateInv19Html,
	generateInv3Html,
	generateTorg16ActFromInventory,
	generateTorg16Html,
	kopecksToRubles,
	sortAuditItemsByFefo,
} from "./warehouseInventoryEngine.js";
import { WarehouseInventoryAuditTable } from "./WarehouseInventoryAuditTable.js";
import { WarehouseInventoryCommissionDrawer } from "./WarehouseInventoryCommissionDrawer.js";
import { WarehouseInventoryKpisGrid } from "./WarehouseInventoryKpisGrid.js";
import "./warehouseInventory.css";

export interface WarehouseInventoryAuditModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseInventoryAuditDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseInventoryAuditDocument) => void) | undefined;
	readonly onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	readonly onTorg16Generated?: ((act: WarehouseTorg16WriteoffAct) => void) | undefined;
}

export const WarehouseInventoryAuditModal: React.FC<WarehouseInventoryAuditModalProps> = ({
	isOpen,
	onClose,
	initialDocument,
	onDocumentSaved,
	onApplyAudit,
	onTorg16Generated,
}) => {
	// 1. Шапка документа инвентаризации
	const [docNumber, setDocNumber] = useState<string>(
		() => initialDocument?.documentNumber || `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
	);
	const [orderNumber, setOrderNumber] = useState<string>(
		initialDocument?.orderNumber || "ПР-44/ИНВ",
	);
	const [orderDate, setOrderDate] = useState<string>(
		initialDocument?.orderDate || new Date().toISOString().slice(0, 10),
	);
	const [auditDate, setAuditDate] = useState<string>(
		initialDocument?.auditDate || new Date().toISOString().slice(0, 10),
	);
	const [branchNameRu, setBranchNameRu] = useState<string>(
		initialDocument?.branchNameRu || "Центральный распределительный склад (ЦС)",
	);
	const [warehouseNameRu, setWarehouseNameRu] = useState<string>(
		initialDocument?.warehouseNameRu || "Главный склад расходных материалов",
	);
	const [molFullName, setMolFullName] = useState<string>(
		initialDocument?.molFullName || "Ответственный сотрудник",
	);
	const [molPosition, setMolPosition] = useState<string>(
		initialDocument?.molPosition || "Ответственный сотрудник",
	);
	const [status, setStatus] = useState<WarehouseInventoryStatus>(
		initialDocument?.status || "reconciliation",
	);
	const [commission, setCommission] = useState<readonly WarehouseInventoryCommissionMember[]>(
		initialDocument?.commission || DEFAULT_COMMISSION_MEMBERS,
	);

	// 2. Строки инвентаризации
	const [items, setItems] = useState<readonly WarehouseAuditItemLine[]>([]);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [filterTab, setFilterTab] = useState<"all" | "discrepancies" | "expired" | "risk">("all");
	const [sortOrder, setSortOrder] = useState<"default" | "fefo" | "discrepancy" | "name">("default");
	const [showMetaDrawer, setShowMetaDrawer] = useState<boolean>(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	// Инициализация строк
	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) {
				setItems([...initialDocument.items]);
			} else {
				setItems([...DEFAULT_INVENTORY_ITEMS_PRESET]);
			}
		}
	}, [isOpen, initialDocument]);

	// Показ тоста
	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => {
			setToastMessage(null);
		}, 3500);
	}, []);

	// 1-клик переключение на единоличную инвентаризацию (Соло-врач / Ответственный)
	const handleSetSoloCommission = useCallback(() => {
		const currentName = molFullName.trim() || "Ответственный сотрудник";
		const currentPos = molPosition.trim() || "Ответственный сотрудник";
		setCommission([
			{
				fullName: currentName,
				position: currentPos,
				role: "chairman",
				roleRu: "Председатель комиссии (МОЛ / Единолично)",
			},
		]);
		showToast("Установлена единоличная инвентаризация (Соло-врач / Ответственный).");
	}, [molFullName, molPosition, showToast]);

	// Восстановление стандартной комиссии из 4 человек
	const handleSetStandardCommission = useCallback(() => {
		setCommission(DEFAULT_COMMISSION_MEMBERS);
		showToast("Восстановлен стандартный состав комиссии (4 человека).");
	}, [showToast]);

	// Изменение члена комиссии
	const handleCommissionMemberChange = useCallback(
		(index: number, field: "fullName" | "position", value: string) => {
			setCommission((prev) =>
				prev.map((m, i) => {
					if (i !== index) return m;
					return {
						...m,
						[field]: value,
					};
				}),
			);
			if (commission.length === 1) {
				if (field === "fullName") setMolFullName(value);
				if (field === "position") setMolPosition(value);
			}
		},
		[commission.length],
	);

	// Удаление члена комиссии (если их больше одного)
	const handleRemoveCommissionMember = useCallback((index: number) => {
		setCommission((prev: readonly WarehouseInventoryCommissionMember[]): readonly WarehouseInventoryCommissionMember[] => {
			if (prev.length <= 1) return prev;
			const next: WarehouseInventoryCommissionMember[] = prev.filter((_, i) => i !== index);
			const first = next[0];
			if (next.length === 1 && first && first.role !== "chairman") {
				const singleMember: WarehouseInventoryCommissionMember = {
					fullName: first.fullName,
					position: first.position,
					role: "chairman",
					roleRu: "Председатель комиссии (МОЛ / Единолично)",
				};
				return [singleMember];
			}
			return next;
		});
	}, []);

	// Изменение ФИО МОЛ с синхронизацией единоличной комиссии
	const handleMolFullNameChange = useCallback(
		(val: string) => {
			setMolFullName(val);
			if (commission.length === 1) {
				setCommission((prev) =>
					prev.map((m, i) =>
						i === 0
							? {
									...m,
									fullName: val,
								}
							: m,
					),
				);
			}
		},
		[commission.length],
	);

	// Изменение должности МОЛ с синхронизацией единоличной комиссии
	const handleMolPositionChange = useCallback(
		(val: string) => {
			setMolPosition(val);
			if (commission.length === 1) {
				setCommission((prev) =>
					prev.map((m, i) =>
						i === 0
							? {
									...m,
									position: val,
								}
							: m,
					),
				);
			}
		},
		[commission.length],
	);

	// Сводные итоги
	const totals: InventoryAuditTotals = useMemo(() => {
		return calculateInventoryAuditTotals(items);
	}, [items]);

	// Сборка текущего документа
	const currentDocument: WarehouseInventoryAuditDocument = useMemo(() => {
		return {
			id: initialDocument?.id || `inv_doc_${Date.now()}`,
			documentNumber: docNumber,
			orderNumber,
			orderDate,
			auditStartDate: orderDate,
			auditEndDate: auditDate,
			auditDate,
			branchId: initialDocument?.branchId || "central_hub",
			branchNameRu,
			warehouseNameRu,
			molFullName,
			molPosition,
			status,
			commission,
			items,
			organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOkpo: "49201948",
			organizationInn: "7701984512",
		};
	}, [
		initialDocument,
		docNumber,
		orderNumber,
		orderDate,
		auditDate,
		branchNameRu,
		warehouseNameRu,
		molFullName,
		molPosition,
		status,
		commission,
		items,
	]);

	// Изменение фактического количества строки
	const handleQuantityChange = useCallback(
		(itemId: string, newActualQty: number) => {
			const sanitizedQty = Math.max(0, Math.round(newActualQty));
			setItems((prev) =>
				prev.map((it) => {
					if (it.itemId !== itemId) return it;
					return computeAuditLineItem(
						{
							...it,
							actualQuantity: sanitizedQty,
						},
						auditDate,
					);
				}),
			);
		},
		[auditDate],
	);

	// Заполнение факта по учетным данным (1-клик)
	const handleAutofillFactByBook = useCallback(() => {
		setItems((prev) =>
			prev.map((it) =>
				computeAuditLineItem(
					{
						...it,
						actualQuantity: it.bookQuantity,
					},
					auditDate,
				),
			),
		);
		showToast("Фактические остатки заполнены по учетным данным.");
	}, [auditDate, showToast]);

	// Печать документа в отдельном окне браузера
	const handlePrintDocument = useCallback((htmlContent: string) => {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(htmlContent);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	}, []);

	// Скачивание файла
	const handleDownloadFile = useCallback((content: string, filename: string, mimeType: string) => {
		const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, []);

	// Списание просроченных позиций по ТОРГ-16
	const handleCreateTorg16 = useCallback(() => {
		const act = generateTorg16ActFromInventory(currentDocument);
		if (act.items.length === 0) {
			showToast("В описи нет просроченных позиций для формирования ТОРГ-16.");
			return;
		}
		if (onTorg16Generated) {
			onTorg16Generated(act);
		}
		const html = generateTorg16Html(act);
		handlePrintDocument(html);
		showToast(`Сформирован акт ТОРГ-16 на списание ${act.items.length} позиций.`);
	}, [currentDocument, onTorg16Generated, handlePrintDocument, showToast]);

	// Экспорт в CSV
	const handleExportCsv = useCallback(() => {
		const csv = exportInventoryToCsv(currentDocument);
		handleDownloadFile(csv, `Инвентаризация_${docNumber}_${auditDate}.csv`, "text/csv");
		showToast("Инвентаризационная опись успешно выгружена в CSV.");
	}, [currentDocument, docNumber, auditDate, handleDownloadFile, showToast]);

	// Экспорт в 1C XML
	const handleExport1C = useCallback(() => {
		const xml = exportInventoryTo1C(currentDocument);
		handleDownloadFile(xml, `1C_Инвентаризация_${docNumber}.xml`, "application/xml");
		showToast("Документ инвентаризации выгружен в формате 1C CommerceML.");
	}, [currentDocument, docNumber, handleDownloadFile, showToast]);

	// Экспорт сличительной ведомости ИНВ-19 в CSV
	const handleExportInv19Csv = useCallback(() => {
		const csv = exportInv19DiscrepanciesToCsv(currentDocument);
		handleDownloadFile(csv, `Сличительная_ведомость_ИНВ-19_${docNumber}.csv`, "text/csv");
		showToast("Сличительная ведомость ИНВ-19 выгружена в CSV.");
	}, [currentDocument, docNumber, handleDownloadFile, showToast]);

	// Сохранение описи
	const handleSave = useCallback(() => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка сохранения: ${validation.errors.join("; ")}`);
			return;
		}
		if (onDocumentSaved) {
			onDocumentSaved(currentDocument);
		}
		showToast("Инвентаризационная опись сохранена в журнале.");
	}, [currentDocument, onDocumentSaved, showToast]);

	// Проведение инвентаризации
	const handleApply = useCallback(async () => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка проведения: ${validation.errors.join("; ")}`);
			return;
		}
		setStatus("applied");
		const appliedDoc = { ...currentDocument, status: "applied" as const };
		if (onApplyAudit) {
			await onApplyAudit(appliedDoc);
		}
		if (onDocumentSaved) {
			onDocumentSaved(appliedDoc);
		}
		showToast("Инвентаризация утверждена и проведена по складскому балансу.");
	}, [currentDocument, onApplyAudit, onDocumentSaved, showToast]);

	// Фильтрация и сортировка строк
	const filteredItems = useMemo(() => {
		let result = [...items];

		// 1. Поисковый запрос
		if (searchQuery.trim().length > 0) {
			const query = searchQuery.toLowerCase().trim();
			result = result.filter(
				(it) =>
					it.nameRu.toLowerCase().includes(query) ||
					it.sku.toLowerCase().includes(query) ||
					it.batchNumber.toLowerCase().includes(query) ||
					it.category.toLowerCase().includes(query),
			);
		}

		// 2. Вкладки фильтрации
		if (filterTab === "discrepancies") {
			result = result.filter((it) => it.discrepancyType !== "match");
		} else if (filterTab === "expired") {
			result = result.filter((it) => it.fefoStatus === "expired");
		} else if (filterTab === "risk") {
			result = result.filter(
				(it) => it.fefoStatus === "warning_30" || it.fefoStatus === "warning_60",
			);
		}

		// 3. Сортировка
		if (sortOrder === "fefo") {
			result = sortAuditItemsByFefo(result);
		} else if (sortOrder === "discrepancy") {
			result.sort(
				(a, b) =>
					Math.abs(b.discrepancyCostKopecks) - Math.abs(a.discrepancyCostKopecks),
			);
		} else if (sortOrder === "name") {
			result.sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));
		}

		return result;
	}, [items, searchQuery, filterTab, sortOrder]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="warehouse-inventory-overlay" role="dialog" aria-modal="true">
			<div className="warehouse-inventory-modal">
				{/* 1. Header */}
				<header className="warehouse-inventory-header">
					<div className="warehouse-inventory-title-group">
						<div className="warehouse-inventory-icon-box">
							<Boxes size={20} />
						</div>
						<div className="min-w-0">
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<h2 className="warehouse-inventory-title truncate">Складская инвентаризация и FEFO</h2>
								<span
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										padding: "2px 8px",
										borderRadius: 4,
										background: status === "applied" ? "var(--ok-bg, #ecfdf5)" : "var(--info-bg, #eff6ff)",
										color: status === "applied" ? "var(--ok-fg, #047857)" : "var(--info-fg, #1d4ed8)",
										border: `1px solid ${status === "applied" ? "var(--ok-border, #a7f3d0)" : "var(--info-border, #bfdbfe)"}`,
										flexShrink: 0,
									}}
								>
									{status === "applied"
										? "Проведена"
										: status === "approved"
											? "Утверждена"
											: status === "reconciliation"
												? "Сверка (ИНВ-19)"
												: "Черновик"}
								</span>
							</div>
							<p className="warehouse-inventory-subtitle truncate">
								Опись № {docNumber} • Приказ № {orderNumber} от {orderDate} • {warehouseNameRu}
							</p>
						</div>
					</div>

					<div className="warehouse-inventory-header-actions">
						<button
							type="button"
							className={`warehouse-btn ${showMetaDrawer ? "warehouse-btn-primary" : "warehouse-btn-secondary"}`}
							onClick={() => setShowMetaDrawer((v) => !v)}
							title="Реквизиты приказа и состав комиссии"
						>
							<SlidersHorizontal size={14} />
							<span>Комиссия ({commission.length === 1 ? "Соло 1 чел." : `${commission.length} чел.`}) и приказ</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={() => handlePrintDocument(generateInv3Html(currentDocument))}
							title="Печать инвентаризационной описи ИНВ-3"
						>
							<Printer size={14} />
							<span>ИНВ-3</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={() => handlePrintDocument(generateInv19Html(currentDocument))}
							title="Печать сличительной ведомости ИНВ-19"
						>
							<FileSpreadsheet size={14} />
							<span>ИНВ-19</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-ghost"
							onClick={onClose}
							aria-label="Закрыть модальное окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* 2. Top Summary KPI Cards */}
				<WarehouseInventoryKpisGrid totals={totals} />

				{/* 2.1 Meta & Commission Drawer */}
				<WarehouseInventoryCommissionDrawer
					showMetaDrawer={showMetaDrawer}
					docNumber={docNumber}
					setDocNumber={setDocNumber}
					auditDate={auditDate}
					setAuditDate={setAuditDate}
					orderNumber={orderNumber}
					setOrderNumber={setOrderNumber}
					orderDate={orderDate}
					setOrderDate={setOrderDate}
					molFullName={molFullName}
					onMolFullNameChange={handleMolFullNameChange}
					molPosition={molPosition}
					onMolPositionChange={handleMolPositionChange}
					warehouseNameRu={warehouseNameRu}
					setWarehouseNameRu={setWarehouseNameRu}
					commission={commission}
					onSetSoloCommission={handleSetSoloCommission}
					onSetStandardCommission={handleSetStandardCommission}
					onCommissionMemberChange={handleCommissionMemberChange}
					onRemoveCommissionMember={handleRemoveCommissionMember}
				/>

				{/* 3. Toolbar & Filters */}
				<div className="warehouse-inventory-toolbar">
					<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
						<div className="warehouse-inventory-search-box">
							<Search size={16} color="var(--muted)" />
							<input
								type="text"
								className="warehouse-inventory-search-input"
								placeholder="Поиск по названию, артикулу, LOT..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									style={{ background: "none", border: "none", cursor: "pointer" }}
								>
									<X size={14} color="var(--muted)" />
								</button>
							)}
						</div>

						<div className="warehouse-inventory-tabs">
							<button
								type="button"
								className={`warehouse-inventory-tab-btn ${filterTab === "all" ? "active" : ""}`}
								onClick={() => setFilterTab("all")}
							>
								Все ({items.length})
							</button>
							<button
								type="button"
								className={`warehouse-inventory-tab-btn ${filterTab === "discrepancies" ? "active" : ""}`}
								onClick={() => setFilterTab("discrepancies")}
							>
								Расхождения ({totals.surplusItemsCount + totals.shortageItemsCount})
							</button>
							<button
								type="button"
								className={`warehouse-inventory-tab-btn ${filterTab === "expired" ? "active" : ""}`}
								onClick={() => setFilterTab("expired")}
							>
								Просрочено ({totals.expiredItemsCount})
							</button>
							<button
								type="button"
								className={`warehouse-inventory-tab-btn ${filterTab === "risk" ? "active" : ""}`}
								onClick={() => setFilterTab("risk")}
							>
								Риск &lt;60д ({totals.warningItemsCount})
							</button>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
								Сортировка:
							</span>
							<select
								value={sortOrder}
								onChange={(e) => setSortOrder(e.target.value as any)}
								style={{
									fontSize: "0.8125rem",
									padding: "4px 8px",
									borderRadius: 6,
									border: "1px solid var(--border)",
									background: "var(--paper-strong)",
									color: "var(--ink)",
								}}
							>
								<option value="default">По умолчанию</option>
								<option value="fefo">FEFO (Сначала истекающие)</option>
								<option value="discrepancy">По сумме расхождения</option>
								<option value="name">По наименованию</option>
							</select>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={handleAutofillFactByBook}
							title="Установить фактическое количество равным книжному учету"
						>
							<CheckCircle2 size={14} />
							<span>Факт = Учет</span>
						</button>

						{totals.expiredItemsCount > 0 && (
							<button
								type="button"
								className="warehouse-btn warehouse-btn-danger"
								onClick={handleCreateTorg16}
								title="Сформировать акт списания просроченных материалов ТОРГ-16"
							>
								<PackageX size={14} />
								<span>Списать по ТОРГ-16 ({totals.expiredItemsCount})</span>
							</button>
						)}
					</div>
				</div>

				{/* 4. Table Container */}
				<WarehouseInventoryAuditTable
					filteredItems={filteredItems}
					onQuantityChange={handleQuantityChange}
				/>

				{/* 5. Footer */}
				<footer className="warehouse-inventory-footer">
					<div className="warehouse-inventory-footer-left">
						{toastMessage && (
							<div style={{ color: "var(--info-fg, #2563eb)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
								<Check size={16} />
								<span>{toastMessage}</span>
							</div>
						)}
						{!toastMessage && (
							<span>
								МОЛ: <b>{molFullName}</b> ({molPosition}) • {commission.length === 1 ? "Комиссия: Единолично (Соло-врач)" : `Комиссия: ${commission.length} чел.`} • Статус: <b>{status}</b>
							</span>
						)}
					</div>

					<div className="warehouse-inventory-footer-right">
						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={handleExportCsv}
							title="Выгрузить полную опись в CSV (UTF-8 BOM)"
						>
							<Download size={14} />
							<span>CSV (Опись)</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={handleExportInv19Csv}
							title="Выгрузить только расхождения (ИНВ-19) в CSV"
						>
							<FileSpreadsheet size={14} />
							<span>CSV (ИНВ-19)</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={handleExport1C}
							title="Выгрузить документ инвентаризации в формате 1C CommerceML XML"
						>
							<FileCode size={14} />
							<span>1C CommerceML</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={handleSave}
							title="Сохранить черновик описи"
						>
							<Check size={14} />
							<span>Сохранить</span>
						</button>

						<button
							type="button"
							className="warehouse-btn warehouse-btn-primary"
							onClick={handleApply}
							title="Утвердить результаты и провести инвентаризацию"
						>
							<PackageCheck size={14} />
							<span>Провести инвентаризацию</span>
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
