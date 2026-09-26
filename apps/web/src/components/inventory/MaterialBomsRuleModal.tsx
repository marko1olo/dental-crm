/**
 * MaterialBomsRuleModal.tsx — Модальное окно создания и редактирования нормы списания BOM (804н).
 * (Мандаты 8b <= 800 строк, 8d 0 эмодзи, 8e Doctor Autonomy).
 */

import { type ClinicalMarketMaterialItem } from "@dental/shared";
import { Sparkles, X } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import { MaterialBomsQuickCatalogModal } from "./MaterialBomsQuickCatalogModal.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface ProcedureRuleModalState {
	isOpen: boolean;
	ruleId?: string;
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

const QUICK_CHIPS: readonly { readonly label: string; readonly val: string }[] = [
	{ label: "0.1 г/мл", val: "0.1" },
	{ label: "0.35 г (пломба)", val: "0.35" },
	{ label: "0.5 мл", val: "0.5" },
	{ label: "1 шт/карп.", val: "1" },
	{ label: "2 шт", val: "2" },
	{ label: "15 мл (ирригация)", val: "15" },
	{ label: "25 г (Air-Flow)", val: "25" },
];

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
		// Try to find matching warehouse item by id, name or brand
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
								{modalState.ruleId ? "Изменить норму списания" : "Привязать материал к услуге 804н"}
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

					<form onSubmit={onSave}>
						<div className="material-boms-modal-body">
							{/* Quick pick button for 90% Market Catalog */}
							<div style={{ marginBottom: "12px" }}>
								<button
									type="button"
									className="material-boms-btn material-boms-btn-secondary"
									style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
										padding: "8px 12px",
										borderColor: "var(--primary, #0d9488)",
										color: "var(--primary, #0d9488)",
									}}
									onClick={() => setIsCatalogOpen(true)}
								>
									<Sparkles size={16} />
									Выбрать из каталога 90% рынка РФ (Osstem, Bio-Oss, ProTaper, Damon, RelyX)
								</button>
							</div>

							<div className="material-boms-form-group">
								<label className="material-boms-form-label">Услуга приказа 804н *</label>
								<select
									className="material-boms-form-select"
									value={modalState.serviceId}
									onChange={(e) =>
										onChangeModalState({ ...modalState, serviceId: e.target.value })
									}
									required
								>
									{availableServices.map((s) => (
										<option key={s.id} value={s.id}>
											{s.code ? `[${s.code}] ` : ""}{s.title}
										</option>
									))}
								</select>
							</div>

							<div className="material-boms-form-group">
								<label className="material-boms-form-label">Складской материал *</label>
								<select
									className="material-boms-form-select"
									value={modalState.inventoryItemId}
									onChange={(e) =>
										onChangeModalState({
											...modalState,
											inventoryItemId: e.target.value,
										})
									}
									required
								>
									{warehouseItems.map((it) => (
										<option key={it.id} value={it.id}>
											{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."}, {Number(it.unitCostRub || 0)} ₽)
										</option>
									))}
								</select>
							</div>

							<div className="material-boms-form-group">
								<label className="material-boms-form-label">
									Норма расхода на 1 услугу (в граммах, мл или штуках) *
								</label>
								<input
									type="number"
									step="0.0001"
									min="0.0001"
									className="material-boms-form-input"
									value={modalState.quantityToDeduct}
									onChange={(e) =>
										onChangeModalState({
											...modalState,
											quantityToDeduct: e.target.value,
										})
									}
									placeholder="например: 0.35"
									required
								/>

								{/* Quick Chips */}
								<div className="material-boms-chips-row">
									{QUICK_CHIPS.map((chip) => (
										<button
											key={chip.label}
											type="button"
											className="material-boms-chip"
											onClick={() =>
												onChangeModalState({
													...modalState,
													quantityToDeduct: chip.val,
												})
											}
										>
											+{chip.label}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="material-boms-modal-footer">
							<button
								type="button"
								className="material-boms-btn material-boms-btn-secondary"
								onClick={onClose}
							>
								Отмена
							</button>
							<button
								type="submit"
								className="material-boms-btn material-boms-btn-primary"
								disabled={isSaving}
							>
								{isSaving ? "Сохраняем..." : "Сохранить норму"}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Sub-modal: 90% Market Materials Catalog */}
			<MaterialBomsQuickCatalogModal
				isOpen={isCatalogOpen}
				onClose={() => setIsCatalogOpen(false)}
				onSelectMaterial={handleSelectFromMarketCatalog}
			/>
		</>
	);
}
