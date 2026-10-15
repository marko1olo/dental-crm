/**
 * ProcedureMaterialDeductionModal.tsx — Компактный фасад модального окна списания расходников
 * по технологическим картам и нормам Минздрава РФ с контролем складских остатков.
 * Декомпозирован по стандарту /decomposer (строго <= 250 строк).
 */

import { formatInventoryUnitRu } from "@dental/shared";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import {
	type DeductionLineItem,
	createQuickCustomLineItem,
} from "./inventoryMath.js";
import {
	ProcedureDeductionFilterBar,
	ProcedureDeductionFooter,
	ProcedureDeductionHeader,
	ProcedureDeductionItemsTable,
	ProcedureDeductionWasteActCard,
	type ProcedureMaterialDeductionModalProps,
	useProcedureDeductionLogic,
} from "./procedureDeductionModules/index.js";
import { ProcedureMaterialAddCustomBar } from "./ProcedureMaterialAddCustomBar.js";
import { ProcedureMaterialPackagesBar } from "./ProcedureMaterialPackagesBar.js";
import type { InventoryItem } from "./useInventoryLogic.js";
import "./inventoryDeduction.css";

export const STANDARD_CONSUMABLE_PRESET_NAME =
	"Стандартный расходный набор (перчатки, маска, слюноотсос, ватные валики, карпула)";

export function createStandardConsumablePresetItem(
	warehouseItems: readonly InventoryItem[] = [],
): DeductionLineItem {
	return {
		...createQuickCustomLineItem(STANDARD_CONSUMABLE_PRESET_NAME, {
			unit: formatInventoryUnitRu("set"),
			quantity: 1,
			warehouseItems,
			unitCostRub: "150.00",
		}),
		category: "ppe",
		mandatory: true,
	};
}

export type { ProcedureMaterialDeductionModalProps };

export function ProcedureMaterialDeductionModal(props: ProcedureMaterialDeductionModalProps) {
	const {
		isOpen,
		onClose,
		serviceName,
		patientName,
		toothNumber,
		warehouseItems = [],
		isDeducting = false,
	} = props;

	const {
		selectedMapCodes,
		lines,
		setLines,
		searchQuery,
		setSearchQuery,
		activeCategory,
		setActiveCategory,
		selectedCustomId,
		setSelectedCustomId,
		highlightSelect,
		customMaterialName,
		setCustomMaterialName,
		highlightCustomInput,
		preventNegativeStock,
		setPreventNegativeStock,
		wasteAct,
		setWasteAct,
		showPoModal,
		setShowPoModal,
		copiedPo,
		summary,
		generatedPurchaseOrder,
		filteredLines,
		handleApplyPackage,
		handleToggleTechMap,
		handleStepQuantity,
		handleResetToStandard,
		handleDirectQuantityChange,
		handleRemoveLine,
		handleSelectBatch,
		handleAddCustomMaterial,
		handleAddQuickCustomMaterial,
		handleCopyPurchaseOrder,
		handlePrintPurchaseOrder,
		handleConfirm,
	} = useProcedureDeductionLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="inventory-deduction-backdrop"
			data-testid="procedure-material-deduction-modal"
			onClick={(e) => e.target === e.currentTarget && onClose()}
			onKeyDown={(e) => {
				if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
					onClose();
				}
			}}
		>
			<div
				className="inventory-deduction-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Списание расходных материалов по технологической карте"
			>
				{/* 1. ШАПКА */}
				<ProcedureDeductionHeader
					serviceName={serviceName}
					patientName={patientName}
					toothNumber={toothNumber}
					onClose={onClose}
				/>

				{/* 2. ПАКЕТЫ ПРОЦЕДУР И ТЕХКАРТЫ */}
				<ProcedureMaterialPackagesBar
					selectedMapCodes={selectedMapCodes}
					onApplyPackage={handleApplyPackage}
					onToggleTechMap={handleToggleTechMap}
				/>

				{/* 3. АЛЕРТ МЯГКОГО ОВЕРДРАФТА (Мандат 8n: Doctor Autonomy) */}
				{(summary.hasDeficit || summary.warningCount > 0) && (
					<div
						className={`inventory-alert-summary-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-2 sm:p-1.5 ${summary.hasDeficit ? "has-deficit" : "has-warning"}`}
					>
						<div className="flex items-center gap-2 text-xs text-[var(--ink)] font-semibold min-w-0">
							{summary.hasDeficit ? (
								<ShieldAlert size={15} className="text-[var(--rust,#dc2626)] shrink-0" />
							) : (
								<AlertTriangle size={15} className="text-[var(--amber,#f59e0b)] shrink-0" />
							)}
							<span className="text-xs font-bold leading-tight">
								{summary.hasDeficit
									? `Мягкий овердрафт активен (дефицит: ${summary.criticalCount} поз.). Прием не блокируется, фоновая заявка поставщику сформирована в бэкофисе.`
									: `Внимание: ${summary.warningCount} поз. достигли критического неснижаемого остатка.`}
							</span>
						</div>

						<span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ink-muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line-subtle)]">
							Мандат 8n: Soft Negative Stock
						</span>
					</div>
				)}

				{/* 4. САНПИН 2.1.3684-21 АКТИРОВАНИЕ МЕДОТХОДОВ КЛАССА Б БЕЗ ЭМОДЗИ */}
				<ProcedureDeductionWasteActCard
					wasteAct={wasteAct}
					onChangeWasteAct={setWasteAct}
					disabled={isDeducting}
				/>

				{/* 5. ПОИСК И ФИЛЬТРЫ КАТЕГОРИЙ */}
				<ProcedureDeductionFilterBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					activeCategory={activeCategory}
					onCategoryChange={setActiveCategory}
					lines={lines}
				/>

				{/* 6. ТАБЛИЦА РАСХОДНЫХ МАТЕРИАЛОВ (НОРМЫ 804н + FEFO) */}
				<div className="inventory-materials-body">
					<ProcedureDeductionItemsTable
						filteredLines={filteredLines}
						warehouseItems={warehouseItems}
						onAddStandardPreset={() => {
							setLines([createStandardConsumablePresetItem(warehouseItems)]);
							showToast("Добавлен стандартный клинический расходный набор (Клинический регламент)", "info");
						}}
						onStepQuantity={handleStepQuantity}
						onDirectQuantityChange={handleDirectQuantityChange}
						onResetToStandard={handleResetToStandard}
						onRemoveLine={handleRemoveLine}
						onSelectBatch={handleSelectBatch}
					/>
				</div>

				{/* 7. ПАНЕЛЬ ДОБАВЛЕНИЯ КАСТОМНЫХ МАТЕРИАЛОВ СО СКЛАДА */}
				<ProcedureMaterialAddCustomBar
					warehouseItems={warehouseItems}
					selectedCustomId={selectedCustomId}
					onSelectCustomId={(val) => { setSelectedCustomId(val); if (val) setSelectedCustomId(val); }}
					highlightSelect={highlightSelect}
					onAddCustomMaterial={handleAddCustomMaterial}
					isDeducting={isDeducting}
					customMaterialName={customMaterialName}
					onChangeCustomMaterialName={(val) => setCustomMaterialName(val)}
					highlightCustomInput={highlightCustomInput}
					onAddQuickCustomMaterial={handleAddQuickCustomMaterial}
				/>

				{/* 8. ПОДВАЛ, СЕБЕСТОИМОСТЬ И ДЕЙСТВИЯ */}
				<ProcedureDeductionFooter
					summary={summary}
					preventNegativeStock={preventNegativeStock}
					onTogglePreventNegativeStock={setPreventNegativeStock}
					isDeducting={isDeducting}
					onClose={onClose}
					onConfirm={() => {
						if (lines.length === 0) {
							setLines([createStandardConsumablePresetItem(warehouseItems)]);
							showToast("Добавлен стандартный клинический расходный набор (Клинический регламент)", "info");
							return;
						}
						handleConfirm();
					}}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
