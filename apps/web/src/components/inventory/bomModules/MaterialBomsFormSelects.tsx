import React from "react";
import type { ProcedureRuleModalState } from "../MaterialBomsRuleModal.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export interface MaterialBomsFormSelectsProps {
	readonly modalState: ProcedureRuleModalState;
	readonly availableServices: readonly { id: string; code?: string | null; title: string }[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly onChangeModalState: (next: ProcedureRuleModalState) => void;
}

export const MaterialBomsFormSelects: React.FC<MaterialBomsFormSelectsProps> = ({
	modalState,
	availableServices,
	warehouseItems,
	onChangeModalState,
}) => {
	return (
		<>
			<div className="material-boms-form-group">
				<label className="material-boms-form-label">Услуга прейскуранта *</label>
				<select
					className="material-boms-form-select"
					value={modalState.serviceId}
					onChange={(e) =>
						onChangeModalState({ ...modalState, serviceId: e.target.value })
					}
					required
				>
					{availableServices.length > 0 ? (
						availableServices.map((s) => (
							<option key={s.id} value={s.id}>
								{s.code ? `[${s.code}] ` : ""}{s.title}
							</option>
						))
					) : (
						<option value="">Выберите услугу из прейскуранта</option>
					)}
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
					{warehouseItems.length > 0 ? (
						warehouseItems.map((it) => (
							<option key={it.id} value={it.id}>
								{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."}, {Number(it.unitCostRub || 0)} ₽)
							</option>
						))
					) : (
						<option value="">Выберите материал на складе</option>
					)}
				</select>
			</div>
		</>
	);
};

export default MaterialBomsFormSelects;
