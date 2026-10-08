import {
	AlertTriangle,
	Boxes,
	Check,
	CheckCircle2,
	Download,
	FileCode,
	FileSpreadsheet,
	FileText,
	Package,
	PackageCheck,
	PackageX,
	Printer,
	Search,
	SlidersHorizontal,
	Trash2,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import {
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
	generateInv19Html,
	generateInv3Html,
	generateTorg16ActFromInventory,
	generateTorg16Html,
	kopecksToRubles,
} from "../inventory/warehouseInventoryEngine.js";

export interface WarehouseInventoryTabProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	readonly onRefresh?: (() => void) | undefined;
}

/**
 * Вкладка складской инвентаризации (ИНВ-3, ИНВ-19, ТОРГ-16) (Мандаты 8e, 8n).
 * - Сверка книжных остатков с фактическими данными пересчета.
 * - Выявление излишков и недостач с расчетом копеечных сумм.
 * - Оформление единолично врачом/медсестрой без обязательного созыва 3 человек (Мандат 8n).
 * - Печать регламентных бланков ИНВ-3, ИНВ-19 и ТОРГ-16.
 */
export const WarehouseInventoryTab: React.FC<WarehouseInventoryTabProps> = ({
	organizationId,
	items,
	onApplyAudit,
	onRefresh,
}) => {
	const todayDate = new Date().toISOString().slice(0, 10);

	// Линии инвентаризации
	const [auditLines, setAuditLines] = useState<WarehouseAuditItemLine[]>(() => {
		return items.map((it, idx) => {
			const costRub = Number.parseFloat(it.unitCostRub || "0") || 0;
			const unitCostKopecks = Math.round(costRub * 100);
			const bookQuantity = Number(it.stockQuantity) || 0;

			return computeAuditLineItem(
				{
					itemId: it.id,
					sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`,
					nameRu: it.name,
					category: it.category || "Расходные материалы",
					unitRu: it.unit || "шт.",
					okeiCode: "796",
					batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`,
					expiryDate: it.expirationDate || "2028-12-31",
					storageLocationRu: "Основной стеллаж",
					bookQuantity,
					actualQuantity: bookQuantity,
					unitCostKopecks,
				},
				todayDate,
			);
		});
	});

	// Синхронизация при изменении входящих items, если строки еще не модифицировались
	React.useEffect(() => {
		if (items.length > 0 && auditLines.length === 0) {
			setAuditLines(
				items.map((it, idx) => {
					const costRub = Number.parseFloat(it.unitCostRub || "0") || 0;
					const unitCostKopecks = Math.round(costRub * 100);
					const bookQuantity = Number(it.stockQuantity) || 0;
					return computeAuditLineItem(
						{
							itemId: it.id,
							sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`,
							nameRu: it.name,
							category: it.category || "Расходные материалы",
							unitRu: it.unit || "шт.",
							okeiCode: "796",
							batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`,
							expiryDate: it.expirationDate || "2028-12-31",
							storageLocationRu: "Основной стеллаж",
							bookQuantity,
							actualQuantity: bookQuantity,
							unitCostKopecks,
						},
						todayDate,
					);
				}),
			);
		}
	}, [items, todayDate, auditLines.length]);

	const [documentNumber, setDocumentNumber] = useState(
		`СВЕРКА-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
	);
	const [molFullName, setMolFullName] = useState("Кузнецов А.В. (Врач-стоматолог)");
	const [searchQuery, setSearchQuery] = useState("");
	const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
	const [isApplying, setIsApplying] = useState(false);

	// Расчет итогов
	const totals: InventoryAuditTotals = useMemo(() => {
		return calculateInventoryAuditTotals(auditLines);
	}, [auditLines]);

	// Обновление фактического количества
	const handleActualQtyChange = (itemId: string, newQty: number) => {
		setAuditLines((prev) =>
			prev.map((line) => {
				if (line.itemId !== itemId) return line;
				return computeAuditLineItem(
					{
						itemId: line.itemId,
						sku: line.sku,
						nameRu: line.nameRu,
						category: line.category,
						unitRu: line.unitRu,
						okeiCode: line.okeiCode,
						batchNumber: line.batchNumber,
						expiryDate: line.expiryDate,
						storageLocationRu: line.storageLocationRu,
						bookQuantity: line.bookQuantity,
						actualQuantity: Math.max(0, newQty),
						unitCostKopecks: line.unitCostKopecks,
					},
					todayDate,
				);
			}),
		);
	};

	// Быстрое выставление фактического количества равным учетному для всех
	const handleReconcileAllMatch = () => {
		setAuditLines((prev) =>
			prev.map((line) =>
				computeAuditLineItem(
					{
						itemId: line.itemId,
						sku: line.sku,
						nameRu: line.nameRu,
						category: line.category,
						unitRu: line.unitRu,
						okeiCode: line.okeiCode,
						batchNumber: line.batchNumber,
						expiryDate: line.expiryDate,
						storageLocationRu: line.storageLocationRu,
						bookQuantity: line.bookQuantity,
						actualQuantity: line.bookQuantity,
						unitCostKopecks: line.unitCostKopecks,
					},
					todayDate,
				),
			),
		);
		showToast("Фактические остатки приравнены к учётным данным", "info");
	};

	// Сборка текущего документа
	const currentDoc: WarehouseInventoryAuditDocument = useMemo(() => {
		return {
			id: `audit-${Date.now()}`,
			documentNumber,
			orderNumber: "ПР-44/ИНВ",
			orderDate: todayDate,
			auditStartDate: todayDate,
			auditEndDate: todayDate,
			auditDate: todayDate,
			branchId: organizationId,
			branchNameRu: "Центральное отделение",
			warehouseNameRu: "Главный склад расходных материалов",
			molFullName,
			molPosition: "Врач-стоматолог / Ответственный сотрудник",
			status: "reconciliation",
			commission: [
				{
					fullName: molFullName,
					position: "Врач-стоматолог",
					role: "mol",
					roleRu: "Материально ответственное лицо",
				},
			],
			items: auditLines,
			organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOkpo: "49201948",
			organizationInn: "7701984512",
		};
	}, [documentNumber, todayDate, organizationId, molFullName, auditLines]);

	// Печать ИНВ-3
	const handlePrintInv3 = () => {
		const html = generateInv3Html(currentDoc);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 300);
		}
	};

	// Печать ИНВ-19
	const handlePrintInv19 = () => {
		const html = generateInv19Html(currentDoc);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 300);
		}
	};

	// Печать ТОРГ-16
	const handlePrintTorg16 = () => {
		const act = generateTorg16ActFromInventory(
			currentDoc,
			`Списание по результатам инвентаризации ${currentDoc.documentNumber}`,
		);
		const html = generateTorg16Html(act);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 300);
		}
	};

	// Применение результатов инвентаризации
	const handleApplyAuditDoc = async () => {
		setIsApplying(true);
		try {
			if (onApplyAudit) {
				await onApplyAudit(currentDoc);
			}
			if (onRefresh) {
				onRefresh();
			}
			showToast("Результаты инвентаризации успешно зафиксированы", "success");
		} catch {
			showToast("Ошибка при фиксации инвентаризации", "error");
		} finally {
			setIsApplying(false);
		}
	};

	// Фильтрация строк
	const filteredLines = useMemo(() => {
		return auditLines.filter((l) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				if (!l.nameRu.toLowerCase().includes(q) && !l.sku.toLowerCase().includes(q)) {
					return false;
				}
			}
			if (discrepancyOnly && l.discrepancyType === "match") {
				return false;
			}
			return true;
		});
	}, [auditLines, searchQuery, discrepancyOnly]);

	return (
		<div
			className="warehouse-inventory-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2.5"
			data-testid="warehouse-inventory-tab"
		>
			{/* KPI ПАНЕЛЬ ИНВЕНТАРИЗАЦИИ */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
						Позиций в описи
					</span>
					<span className="text-lg font-bold text-[var(--ink,#0f172a)] leading-tight mt-0.5">
						{totals.totalItemsCount}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Совпадений: {totals.matchedItemsCount}
					</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
						Недостача к списанию
					</span>
					<span className="text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight mt-0.5">
						{totals.shortageItemsCount} поз.
					</span>
					<span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
						{money(kopecksToRubles(totals.totalShortageCostKopecks))}
					</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
						Излишки
					</span>
					<span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
						{totals.surplusItemsCount} поз.
					</span>
					<span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
						{money(kopecksToRubles(totals.totalSurplusCostKopecks))}
					</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
						Фактический баланс
					</span>
					<span className="text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight mt-0.5">
						{money(kopecksToRubles(totals.totalActualCostKopecks))}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">По результатам сверки</span>
				</div>
			</div>

			{/* ТУЛБАР УПРАВЛЕНИЯ ИНВЕНТАРИЗАЦИЕЙ (СТРОГО 1 СТРОКА 36PX ПО ЗАКОНУ ХИКА) */}
			<div className="h-9 min-h-[36px] px-3 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl flex items-center justify-between gap-2 shrink-0">
				<div className="flex items-center gap-2 flex-1 min-w-0">
					{/* Поиск */}
					<div className="dente-search-wrap relative w-64 max-w-xs shrink-0">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							className="dente-search-input"
							placeholder="Поиск по названию или SKU..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							data-testid="audit-search-input"
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
						onClick={() => setDiscrepancyOnly((prev) => !prev)}
						className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
							discrepancyOnly
								? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40"
								: "border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-filter-discrepancies"
					>
						Только расхождения ({totals.shortageItemsCount + totals.surplusItemsCount})
					</button>

					<button
						type="button"
						onClick={handleReconcileAllMatch}
						className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium cursor-pointer shrink-0"
						title="Приравнять все фактические остатки к учетным"
						data-testid="btn-reconcile-match-all"
					>
						Все в норме (=)
					</button>
				</div>

				{/* Действия печати и применения */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handlePrintInv3}
						className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
						data-testid="btn-print-inv3"
						title="Печать описи фактических остатков"
					>
						<Printer size={13} />
						<span>Опись остатков</span>
					</button>

					<button
						type="button"
						onClick={handlePrintInv19}
						className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
						data-testid="btn-print-inv19"
						title="Печать сличительной ведомости расхождений"
					>
						<Printer size={13} />
						<span>Сличительная ведомость</span>
					</button>

					{totals.shortageItemsCount > 0 && (
						<button
							type="button"
							onClick={handlePrintTorg16}
							className="h-7 px-2.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
							data-testid="btn-print-torg16"
							title="Сформировать акт списания недостач и боя"
						>
							<PackageX size={13} />
							<span>Акт списания</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleApplyAuditDoc}
						disabled={isApplying}
						className="h-7 px-3 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
						data-testid="btn-apply-audit"
					>
						<Check size={14} />
						<span>{isApplying ? "Сохранение..." : "Утвердить опись"}</span>
					</button>
				</div>
			</div>

			{/* ТАБЛИЦА СЛИЧИТЕЛЬНОЙ ВЕДОМОСТИ */}
			<div className="flex-1 border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden flex flex-col bg-[var(--paper,#ffffff)] min-h-[280px]">
				<div className="overflow-x-auto flex-1">
					<table className="w-full text-left text-xs border-collapse" data-testid="warehouse-inventory-table">
						<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] sticky top-0 z-10 font-semibold">
							<tr>
								<th className="py-2.5 px-3">Наименование / Артикул</th>
								<th className="py-2.5 px-3">Серия / Срок</th>
								<th className="py-2.5 px-3 text-center">Учётное кол-во</th>
								<th className="py-2.5 px-3 text-center w-28">Фактическое кол-во</th>
								<th className="py-2.5 px-3 text-center">Расхождение</th>
								<th className="py-2.5 px-3 text-right">Сумма расхождения</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{items.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-14 text-center text-[var(--muted,#64748b)]">
										<div className="flex flex-col items-center justify-center max-w-sm mx-auto">
											<div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-3 border border-teal-500/20">
												<Package size={24} />
											</div>
											<p className="font-bold text-sm text-[var(--ink,#0f172a)] mb-1">
												Склад пуст — проведите первую приходную накладную
											</p>
											<p className="text-xs text-[var(--muted,#64748b)] mb-2">
												В боевой базе отсутствуют остатки для инвентаризационной описи. Оприходуйте материалы от поставщика.
											</p>
										</div>
									</td>
								</tr>
							) : filteredLines.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-[var(--muted,#64748b)]">
										<Package size={28} className="mx-auto mb-2 opacity-50" />
										<p className="font-medium">Позиции по выбранным критериям не найдены</p>
									</td>
								</tr>
							) : (
								filteredLines.map((line) => {
									const isShortage = line.discrepancyType === "shortage";
									const isSurplus = line.discrepancyType === "surplus";

									return (
										<tr
											key={line.itemId}
											className={`hover:bg-[var(--paper-soft,#f8fafc)] transition-colors ${
												isShortage
													? "bg-rose-500/5"
													: isSurplus
														? "bg-emerald-500/5"
														: ""
											}`}
											data-testid={`inventory-line-${line.itemId}`}
										>
											{/* Товар */}
											<td className="py-2 px-3 font-medium text-[var(--ink,#0f172a)]">
												<div className="truncate max-w-[240px] sm:max-w-xs font-semibold">
													{line.nameRu}
												</div>
												<div className="text-[10px] text-[var(--muted,#64748b)] font-mono">
													{line.sku} • {line.category}
												</div>
											</td>

											{/* Партия и срок (FEFO) */}
											<td className="py-2 px-3 text-[var(--muted,#64748b)]">
												<div className="font-mono text-[11px] text-[var(--ink,#0f172a)] font-semibold">{line.batchNumber}</div>
												<div className="flex items-center gap-1.5 mt-0.5">
													<span className="text-[10px]">до {line.expiryDate}</span>
													<span
														className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
															line.fefoStatus === "expired"
																? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
																: line.fefoStatus === "warning_30" || line.fefoStatus === "warning_60"
																	? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
																	: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
														}`}
													>
														{line.fefoStatus === "expired"
															? "Просрочен"
															: line.fefoStatus === "warning_30" || line.fefoStatus === "warning_60"
																? "Внимание"
																: "Свежий"}
													</span>
												</div>
											</td>

											{/* Учетное кол-во */}
											<td className="py-2 px-3 text-center font-bold text-[var(--ink,#0f172a)]">
												{line.bookQuantity} {line.unitRu}
											</td>

											{/* Фактическое кол-во (интерактивный ввод) */}
											<td className="py-2 px-3 text-center">
												<input
													type="number"
													min="0"
													step="1"
													value={line.actualQuantity}
													onChange={(e) =>
														handleActualQtyChange(
															line.itemId,
															Number.parseFloat(e.target.value) || 0,
														)
													}
													className={`w-20 h-7 text-center rounded-md border text-xs font-bold ${
														isShortage
															? "border-rose-400 bg-rose-50 text-rose-900"
															: isSurplus
																? "border-emerald-400 bg-emerald-50 text-emerald-900"
																: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
													}`}
													data-testid={`input-actual-qty-${line.itemId}`}
												/>
											</td>

											{/* Статус расхождения */}
											<td className="py-2 px-3 text-center">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
														isShortage
															? "bg-rose-500/20 text-rose-800 dark:text-rose-200"
															: isSurplus
																? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
																: "bg-slate-500/10 text-slate-700 dark:text-slate-300"
													}`}
												>
													{isShortage && `-${line.discrepancyQuantity} ${line.unitRu}`}
													{isSurplus && `+${line.discrepancyQuantity} ${line.unitRu}`}
													{!isShortage && !isSurplus && "Совпадает"}
												</span>
											</td>

											{/* Сумма расхождения */}
											<td
												className={`py-2 px-3 text-right font-bold ${
													isShortage
														? "text-rose-600 dark:text-rose-400"
														: isSurplus
															? "text-emerald-600 dark:text-emerald-400"
															: "text-[var(--muted,#64748b)]"
												}`}
											>
												{line.discrepancyCostKopecks === 0
													? "0.00 ₽"
													: `${isShortage ? "-" : "+"}${money(kopecksToRubles(Math.abs(line.discrepancyCostKopecks)))}`}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default WarehouseInventoryTab;
