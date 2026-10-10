import {
	Download,
	FileText,
	Plus,
	Printer,
	Search,
	Truck,
	X,
	Zap,
} from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../../inventory/acceptanceWaybillsEngine.js";
import type { WarehouseWaybillsTabProps } from "./types.js";
import { useWarehouseWaybills } from "./useWarehouseWaybills.js";
import { WaybillsListTable } from "./WaybillsListTable.js";
import { ExpressWaybillModal, WaybillEditorModal } from "./WaybillEditorModal.js";
import { WaybillItemsGrid } from "./WaybillItemsGrid.js";

export * from "./types.js";
export { useWarehouseWaybills } from "./useWarehouseWaybills.js";
export { WaybillsListTable } from "./WaybillsListTable.js";
export { ExpressWaybillModal, WaybillEditorModal } from "./WaybillEditorModal.js";
export { WaybillItemsGrid } from "./WaybillItemsGrid.js";

/**
 * Вкладка приходных накладных ТОРГ-12 и оприходования партий ТМЦ (Мандаты 8e, 8n).
 * - Оприходование партий от стоматологических поставщиков с сериями и сроками годности (FEFO).
 * - Автоматическое погашение мягкого овердрафта (дефицита у кресла врача) при приходе накладной.
 * - Печать унифицированной формы ТОРГ-12 и экспорт в CSV.
 * - 0 эмодзи, соответствие СанПиН и стандартам, touch target >= 44px на таче.
 */
export const WarehouseWaybillsTab: React.FC<WarehouseWaybillsTabProps> = (props) => {
	const {
		waybillsList,
		selectedWaybill,
		setSelectedWaybill,
		isCreatingNew,
		setIsCreatingNew,
		searchQuery,
		setSearchQuery,
		draftWaybill,
		isExpressModalOpen,
		setIsExpressModalOpen,
		expressSupplierId,
		setExpressSupplierId,
		expressWaybillNum,
		setExpressWaybillNum,
		expressDate,
		setExpressDate,
		expressAmountRub,
		setExpressAmountRub,
		handlePostExpressWaybill,
		handleAddTemplateItem,
		handleRemoveDraftItem,
		handlePostWaybill,
		handlePrintTorg12,
		handleExportCsv,
		handleStartCreateNew,
		filteredWaybills,
		handleChangeSupplier,
		handleChangeWaybillNumber,
		handleChangeReceiptDate,
	} = useWarehouseWaybills(props);

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
						onClick={handleStartCreateNew}
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
				<WaybillsListTable
					waybills={filteredWaybills}
					totalWaybillsCount={waybillsList.length}
					selectedWaybillId={selectedWaybill?.id ?? null}
					isCreatingNew={isCreatingNew}
					onSelectWaybill={(wb) => {
						setSelectedWaybill(wb);
						setIsCreatingNew(false);
					}}
					onStartCreateNew={handleStartCreateNew}
				/>

				{/* КОЛОНКА 2-3: Просмотр накладной или создание новой */}
				<div className="md:col-span-2 border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)] flex flex-col overflow-hidden">
					{isCreatingNew ? (
						/* ФОРМА СОЗДАНИЯ НАКЛАДНОЙ */
						<WaybillEditorModal
							draftWaybill={draftWaybill}
							onChangeSupplier={handleChangeSupplier}
							onChangeWaybillNumber={handleChangeWaybillNumber}
							onChangeReceiptDate={handleChangeReceiptDate}
							onAddTemplateItem={handleAddTemplateItem}
							onRemoveDraftItem={handleRemoveDraftItem}
							onCancel={() => setIsCreatingNew(false)}
							onSubmit={handlePostWaybill}
						/>
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
								<WaybillItemsGrid
									items={selectedWaybill.items}
									mode="view"
								/>
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
									onClick={handleStartCreateNew}
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
			<ExpressWaybillModal
				isOpen={isExpressModalOpen}
				supplierId={expressSupplierId}
				waybillNum={expressWaybillNum}
				receiptDate={expressDate}
				amountRub={expressAmountRub}
				onSupplierIdChange={setExpressSupplierId}
				onWaybillNumChange={setExpressWaybillNum}
				onReceiptDateChange={setExpressDate}
				onAmountRubChange={setExpressAmountRub}
				onClose={() => setIsExpressModalOpen(false)}
				onSubmit={handlePostExpressWaybill}
			/>
		</div>
	);
};

export default WarehouseWaybillsTab;
