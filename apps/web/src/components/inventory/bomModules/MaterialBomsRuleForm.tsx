import { Sparkles } from "lucide-react";
import React from "react";
import type { ProcedureRuleModalState } from "../MaterialBomsRuleModal.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import { MaterialBomsFormSelects } from "./MaterialBomsFormSelects.js";
import { MaterialBomsQuantityGroup } from "./MaterialBomsQuantityGroup.js";

export interface MaterialBomsRuleFormProps {
	readonly modalState: ProcedureRuleModalState;
	readonly availableServices: readonly { id: string; code?: string | null; title: string }[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly isSaving: boolean;
	readonly onSave: (e: React.FormEvent) => void;
	readonly onClose: () => void;
	readonly onChangeModalState: (next: ProcedureRuleModalState) => void;
	readonly onOpenCatalog: () => void;
}

export const MaterialBomsRuleForm: React.FC<MaterialBomsRuleFormProps> = ({
	modalState,
	availableServices,
	warehouseItems,
	isSaving,
	onSave,
	onClose,
	onChangeModalState,
	onOpenCatalog,
}) => {
	return (
		<form onSubmit={onSave}>
			<div className="material-boms-modal-body">
				<div style={{ marginBottom: "12px" }}>
					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						style={{
							width: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							padding: "9px 14px",
						}}
						onClick={onOpenCatalog}
					>
						<Sparkles size={15} className="text-teal-600" />
						<span>Каталог 90% рынка РФ (Osstem, Bio-Oss, ProTaper, RelyX)</span>
					</button>
				</div>

				<MaterialBomsFormSelects
					modalState={modalState}
					availableServices={availableServices}
					warehouseItems={warehouseItems}
					onChangeModalState={onChangeModalState}
				/>

				<MaterialBomsQuantityGroup
					modalState={modalState}
					onChangeModalState={onChangeModalState}
				/>
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
	);
};

export default MaterialBomsRuleForm;
