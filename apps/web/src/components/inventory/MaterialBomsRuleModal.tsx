/**
 * MaterialBomsRuleModal.tsx — Модальное окно создания и редактирования нормы списания BOM.
 * (Мандаты 8b <= 120 строк, 8d 0 эмодзи, 8e Doctor Autonomy).
 */

import { type ClinicalMarketMaterialItem } from "@dental/shared";
import { X } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import { MaterialBomsQuickCatalogModal } from "./MaterialBomsQuickCatalogModal.js";
import { MaterialBomsRuleForm } from "./bomModules/MaterialBomsRuleForm.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface ProcedureRuleModalState {
	isOpen: boolean;
	ruleId?: string | undefined;
	serviceId: string;
	inventoryItemId: string;
	quantityToDeduct: string;
}

export interface MaterialBomsRuleModalProps {
	readonly modalState: ProcedureRuleModalState | null;
	readonly availableServices: readonly { id: string; code?: string | null; title: string }[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly isSaving: boolean;
	readonly onClose: () => void;
	readonly onSave: (e: React.FormEvent) => void;
	readonly onChangeModalState: (next: ProcedureRuleModalState) => void;
}

export function MaterialBomsRuleModal({
	modalState,
	availableServices,
	warehouseItems,
	isSaving,
	onClose,
	onSave,
	onChangeModalState,
}: MaterialBomsRuleModalProps) {
	const [isCatalogOpen, setIsCatalogOpen] = useState(false);

	if (!modalState?.isOpen) return null;

	const handleSelectFromMarketCatalog = (material: ClinicalMarketMaterialItem) => {
		const query = material.nameRu.toLowerCase();
		const brand = material.brandName.toLowerCase();
		const matchedItem = warehouseItems.find((it) => {
			const n = it.name.toLowerCase();
			return n.includes(brand) || n.includes(material.id.toLowerCase()) || query.includes(n);
		});

		onChangeModalState({
			...modalState,
			inventoryItemId: matchedItem ? matchedItem.id : modalState.inventoryItemId,
			quantityToDeduct: "1",
		});

		if (matchedItem) {
			showToast(`Выбран материал: ${matchedItem.name} (1 ${material.defaultUnit})`, "success");
		} else {
			showToast(`Установлена норма: 1 ${material.defaultUnit} (${material.nameRu})`, "info");
		}
	};

	return (
		<>
			<div className="material-boms-modal-backdrop" role="dialog" aria-modal="true">
				<div className="material-boms-modal">
					<div className="material-boms-modal-header">
						<div>
							<h3 className="material-boms-modal-title">
								{modalState.ruleId ? "Изменить норму списания" : "Привязать материал к услуге"}
							</h3>
						</div>
						<button
							type="button"
							style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>

					<MaterialBomsRuleForm
						modalState={modalState}
						availableServices={availableServices}
						warehouseItems={warehouseItems}
						isSaving={isSaving}
						onSave={onSave}
						onClose={onClose}
						onChangeModalState={onChangeModalState}
						onOpenCatalog={() => setIsCatalogOpen(true)}
					/>
				</div>
			</div>

			<MaterialBomsQuickCatalogModal
				isOpen={isCatalogOpen}
				onClose={() => setIsCatalogOpen(false)}
				onSelectMaterial={handleSelectFromMarketCatalog}
			/>
		</>
	);
}

export default MaterialBomsRuleModal;
