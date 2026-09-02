/**
 * ============================================================================
 * WAREHOUSE INVENTORY AUDIT MODAL (ИНВ-3, ИНВ-19, ТОРГ-16 & FEFO)
 * Интерактивный HUD управления инвентаризацией стоматологических расходных материалов,
 * формирования описей ИНВ-3, сличительных ведомостей ИНВ-19, партионного контроля
 * сроков годности FEFO и актов списания ТОРГ-16.
 * ============================================================================
 */

import {
	AlertCircle,
	AlertTriangle,
	ArrowUpDown,
	Boxes,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileCode,
	FileSpreadsheet,
	FileText,
	Filter,
	Layers,
	PackageCheck,
	PackageX,
	Plus,
	Printer,
	RefreshCw,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Trash2,
	User,
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
	validateInventoryAuditDraft,
} from "./warehouseInventoryEngine.js";
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
		initialDocument?.documentNumber || `ИНВ-2026/08-${Math.floor(100 + Math.random() * 900)}`,
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
		initialDocument?.molFullName || "Васильев Олег Петрович",
	);
	const [molPosition, setMolPosition] = useState<string>(
		initialDocument?.molPosition || "Заведующий складом",
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
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<h2 className="warehouse-inventory-title">Складская инвентаризация и FEFO</h2>
								<span
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										padding: "2px 8px",
										borderRadius: 4,
										background: status === "applied" ? "var(--ok-bg, #ecfdf5)" : "var(--info-bg, #eff6ff)",
										color: status === "applied" ? "var(--ok-fg, #047857)" : "var(--info-fg, #1d4ed8)",
										border: `1px solid ${status === "applied" ? "var(--ok-border, #a7f3d0)" : "var(--info-border, #bfdbfe)"}`,
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
							<p className="warehouse-inventory-subtitle">
								Опись № {docNumber} • Приказ № {orderNumber} от {orderDate} • {warehouseNameRu}
							</p>
						</div>
					</div>

					<div className="warehouse-inventory-header-actions">
						<button
							type="button"
							className="warehouse-btn warehouse-btn-secondary"
							onClick={() => setShowMetaDrawer((v) => !v)}
							title="Реквизиты приказа и состав комиссии"
						>
							<SlidersHorizontal size={14} />
							<span>Комиссия и приказ</span>
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
				<div className="warehouse-inventory-summary-grid">
					<div className="warehouse-kpi-card">
						<span className="warehouse-kpi-label">Позиции / Расхождения</span>
						<div className="warehouse-kpi-value">
							{totals.totalItemsCount}{" "}
							<span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--muted)" }}>
								(Совпало: {totals.matchedItemsCount})
							</span>
						</div>
						<div className="warehouse-kpi-sub">
							{totals.surplusItemsCount > 0 && (
								<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
									+{totals.surplusItemsCount} излишков
								</span>
							)}
							{totals.shortageItemsCount > 0 && (
								<span style={{ color: "var(--bad-fg, #dc2626)", fontWeight: 600, marginLeft: 4 }}>
									-{totals.shortageItemsCount} недостач
								</span>
							)}
							{totals.surplusItemsCount === 0 && totals.shortageItemsCount === 0 && (
								<span>Расхождений нет</span>
							)}
						</div>
					</div>

					<div className="warehouse-kpi-card">
						<span className="warehouse-kpi-label">Книжный остаток (учет)</span>
						<div className="warehouse-kpi-value">{formatRubCurrency(totals.totalBookCostRubles)}</div>
						<div className="warehouse-kpi-sub">Всего: {totals.totalBookQuantity} ед. ТМЦ</div>
					</div>

					<div className="warehouse-kpi-card">
						<span className="warehouse-kpi-label">Фактический остаток</span>
						<div className="warehouse-kpi-value">{formatRubCurrency(totals.totalActualCostRubles)}</div>
						<div className="warehouse-kpi-sub">Всего: {totals.totalActualQuantity} ед. ТМЦ</div>
					</div>

					<div className="warehouse-kpi-card">
						<span className="warehouse-kpi-label">Сальдо сверки (ИНВ-19)</span>
						<div
							className={`warehouse-kpi-value ${
								totals.netDiscrepancyCostRubles > 0
									? "surplus"
									: totals.netDiscrepancyCostRubles < 0
										? "shortage"
										: ""
							}`}
						>
							{totals.netDiscrepancyCostRubles > 0 ? "+" : ""}
							{formatRubCurrency(totals.netDiscrepancyCostRubles)}
						</div>
						<div className="warehouse-kpi-sub">
							{totals.netDiscrepancyCostRubles === 0
								? "100% баланс"
								: totals.netDiscrepancyCostRubles > 0
									? "Суммарный излишек"
									: "Суммарная недостача"}
						</div>
					</div>

					<div className="warehouse-kpi-card">
						<span className="warehouse-kpi-label">Контроль FEFO</span>
						<div
							className="warehouse-kpi-value"
							style={{
								color: totals.expiredItemsCount > 0 ? "var(--bad-fg, #dc2626)" : "var(--ok-fg, #059669)",
								display: "flex",
								alignItems: "center",
								gap: 6,
							}}
						>
							{totals.expiredItemsCount > 0 ? (
								<>
									<AlertCircle size={18} />
									<span>{totals.expiredItemsCount} просрочено</span>
								</>
							) : (
								<>
									<ShieldCheck size={18} />
									<span>Все партии в норме</span>
								</>
							)}
						</div>
						<div className="warehouse-kpi-sub">
							{totals.warningItemsCount > 0
								? `${totals.warningItemsCount} партий требуют внимания (<60д)`
								: "Свежие партии"}
						</div>
					</div>
				</div>

				{/* 2.1 Meta & Commission Drawer */}
				{showMetaDrawer && (
					<div className="warehouse-meta-drawer">
						<div className="warehouse-meta-field">
							<label className="warehouse-meta-label">Номер и дата описи</label>
							<div style={{ display: "flex", gap: 6 }}>
								<input
									className="warehouse-meta-input"
									value={docNumber}
									onChange={(e) => setDocNumber(e.target.value)}
									placeholder="Номер описи"
									style={{ width: "60%" }}
								/>
								<input
									className="warehouse-meta-input"
									type="date"
									value={auditDate}
									onChange={(e) => setAuditDate(e.target.value)}
									style={{ width: "40%" }}
								/>
							</div>
						</div>

						<div className="warehouse-meta-field">
							<label className="warehouse-meta-label">Приказ о ревизии (ИНВ-22)</label>
							<div style={{ display: "flex", gap: 6 }}>
								<input
									className="warehouse-meta-input"
									value={orderNumber}
									onChange={(e) => setOrderNumber(e.target.value)}
									placeholder="Приказ №"
									style={{ width: "60%" }}
								/>
								<input
									className="warehouse-meta-input"
									type="date"
									value={orderDate}
									onChange={(e) => setOrderDate(e.target.value)}
									style={{ width: "40%" }}
								/>
							</div>
						</div>

						<div className="warehouse-meta-field">
							<label className="warehouse-meta-label">Материально ответственное лицо (МОЛ)</label>
							<input
								className="warehouse-meta-input"
								value={molFullName}
								onChange={(e) => setMolFullName(e.target.value)}
								placeholder="ФИО МОЛ"
							/>
						</div>

						<div className="warehouse-meta-field">
							<label className="warehouse-meta-label">Склад / Подразделение</label>
							<input
								className="warehouse-meta-input"
								value={warehouseNameRu}
								onChange={(e) => setWarehouseNameRu(e.target.value)}
								placeholder="Склад"
							/>
						</div>
					</div>
				)}

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
				<div className="warehouse-inventory-table-container">
					<table className="warehouse-inventory-table">
						<thead>
							<tr>
								<th style={{ width: 36, textAlign: "center" }}>№</th>
								<th>Наименование ТМЦ / Артикул</th>
								<th>Категория</th>
								<th style={{ textAlign: "center" }}>Серия (LOT)</th>
								<th style={{ textAlign: "center" }}>Срок годности (FEFO)</th>
								<th style={{ textAlign: "center" }}>Ед.</th>
								<th style={{ textAlign: "right" }}>Учет (книжн.)</th>
								<th style={{ textAlign: "center", width: 140 }}>Факт (наличие)</th>
								<th style={{ textAlign: "center" }}>Разница</th>
								<th style={{ textAlign: "right" }}>Цена (руб.)</th>
								<th style={{ textAlign: "right" }}>Сумма учета</th>
								<th style={{ textAlign: "right" }}>Сумма факта</th>
								<th style={{ textAlign: "right" }}>Расхождение (руб.)</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={13} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
										Позиций по заданным критериям фильтрации не найдено.
									</td>
								</tr>
							) : (
								filteredItems.map((it, idx) => {
									const isExpired = it.fefoStatus === "expired";
									const isDiscrepant = it.discrepancyType !== "match";

									return (
										<tr
											key={it.itemId}
											className={isExpired ? "row-expired" : isDiscrepant ? "row-discrepancy" : ""}
										>
											<td style={{ textAlign: "center", color: "var(--muted)" }}>{idx + 1}</td>

											<td>
												<div style={{ fontWeight: 600, color: "var(--ink)" }}>{it.nameRu}</div>
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													SKU: {it.sku} • {it.storageLocationRu}
												</div>
											</td>

											<td style={{ color: "var(--muted)" }}>{it.category}</td>

											<td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>
												{it.batchNumber}
											</td>

											<td style={{ textAlign: "center" }}>
												<span className={`fefo-badge ${it.fefoStatus.replace("_", "-")}`}>
													{it.expiryDate} (
													{isExpired
														? "Истек"
														: it.fefoStatus === "warning_30"
															? "<30д"
															: it.fefoStatus === "warning_60"
																? "<60д"
																: "Свежий"}
													)
												</span>
											</td>

											<td style={{ textAlign: "center" }}>{it.unitRu}</td>

											<td style={{ textAlign: "right", fontWeight: 600 }}>{it.bookQuantity}</td>

											<td style={{ textAlign: "center" }}>
												<div className="warehouse-qty-stepper" style={{ margin: "0 auto" }}>
													<button
														type="button"
														className="warehouse-qty-stepper-btn"
														onClick={() => handleQuantityChange(it.itemId, it.actualQuantity - 1)}
														aria-label="Уменьшить фактическое количество"
													>
														-
													</button>
													<input
														type="number"
														className="warehouse-qty-input"
														value={it.actualQuantity}
														min={0}
														onChange={(e) =>
															handleQuantityChange(it.itemId, Number.parseInt(e.target.value, 10) || 0)
														}
													/>
													<button
														type="button"
														className="warehouse-qty-stepper-btn"
														onClick={() => handleQuantityChange(it.itemId, it.actualQuantity + 1)}
														aria-label="Увеличить фактическое количество"
													>
														+
													</button>
												</div>
											</td>

											<td style={{ textAlign: "center" }}>
												<span
													className={`discrepancy-pill ${it.discrepancyType}`}
												>
													{it.discrepancyQuantity > 0 ? `+${it.discrepancyQuantity}` : it.discrepancyQuantity}
												</span>
											</td>

											<td style={{ textAlign: "right" }}>
												{kopecksToRubles(it.unitCostKopecks).toFixed(2)}
											</td>

											<td style={{ textAlign: "right" }}>
												{kopecksToRubles(it.bookTotalKopecks).toFixed(2)}
											</td>

											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{kopecksToRubles(it.actualTotalKopecks).toFixed(2)}
											</td>

											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color:
														it.discrepancyType === "surplus"
															? "var(--ok-fg, #059669)"
															: it.discrepancyType === "shortage"
																? "var(--bad-fg, #dc2626)"
																: "var(--muted)",
												}}
											>
												{it.discrepancyCostKopecks > 0 ? "+" : ""}
												{kopecksToRubles(it.discrepancyCostKopecks).toFixed(2)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

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
								МОЛ: <b>{molFullName}</b> ({molPosition}) • Статус: <b>{status}</b>
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
