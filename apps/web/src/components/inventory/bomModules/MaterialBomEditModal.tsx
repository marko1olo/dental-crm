/**
 * MaterialBomEditModal.tsx — Модалка настройки норм расхода материалов для процедуры (BOM).
 *
 * Позволяет:
 * 1. Выбрать медицинскую процедуру.
 * 2. Выбрать расходный материал со склада или из каталога 90% рынка РФ.
 * 3. Задать норму списания с быстрыми пресетами (0.1 г/мл, 0.35 г пломба, 1 шт/карп).
 */

import React from "react";
import { createPortal } from "react-dom";
import { MaterialBomsRuleModal } from "../MaterialBomsRuleModal.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import type { MaterialBomModalState, ServiceOption } from "./materialBomTypes.js";

export interface MaterialBomEditModalProps {
	readonly modalState: MaterialBomModalState | null;
	readonly availableServices: readonly ServiceOption[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly isSaving: boolean;
	readonly onClose: () => void;
	readonly onSave: (e: React.FormEvent) => void;
	readonly onChangeModalState: (next: MaterialBomModalState) => void;
}

export function MaterialBomEditModal({
	modalState,
	availableServices,
	warehouseItems,
	isSaving,
	onClose,
	onSave,
	onChangeModalState,
}: MaterialBomEditModalProps) {
	if (!modalState?.isOpen) return null;

	const modalNode = (
		<MaterialBomsRuleModal
			modalState={modalState}
			availableServices={availableServices}
			warehouseItems={warehouseItems}
			isSaving={isSaving}
			onClose={onClose}
			onSave={onSave}
			onChangeModalState={onChangeModalState}
		/>
	);

	return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

