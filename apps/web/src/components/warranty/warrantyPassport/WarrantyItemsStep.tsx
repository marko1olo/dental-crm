import { CheckCircle2, FileCheck, ShieldAlert } from "lucide-react";
import type React from "react";
import type { WarrantyCalculationResult, WarrantyItem, WarrantyRiskFactors } from "../../warrantyEngine.js";
import type { StarQuickPreset, WarrantyCategory } from "../../warrantyPresets.js";
import type { CompletedTreatmentStage } from "./types";
import { WarrantyTeethFormula } from "./itemsStep/WarrantyTeethFormula";
import { WarrantyCategoryPresetsBar } from "./itemsStep/WarrantyCategoryPresetsBar";
import { WarrantyItemFormInputs } from "./itemsStep/WarrantyItemFormInputs";
import { WarrantyItemsTable } from "./itemsStep/WarrantyItemsTable";
import { WarrantyRiskFactorsPanel } from "./itemsStep/WarrantyRiskFactorsPanel";

export interface WarrantyItemsStepProps {
	completedStages?: CompletedTreatmentStage[];
	onOpenRemediation: () => void;
	onImportCompletedStages: () => void;
	selectedTeeth: string[];
	onToggleTooth: (tooth: string) => void;
	items: WarrantyItem[];
	activeCategory: WarrantyCategory;
	currentWorkTitle: string;
	onWorkTitleChange: (val: string) => void;
	currentMaterial: string;
	onMaterialChange: (val: string) => void;
	currentManufacturer: string;
	onManufacturerChange: (val: string) => void;
	currentShade: string;
	onShadeChange: (val: string) => void;
	currentLot: string;
	onLotChange: (val: string) => void;
	currentServiceCode804n: string;
	onServiceCode804nChange: (val: string) => void;
	currentLabOrderNumber: string;
	onLabOrderNumberChange: (val: string) => void;
	onApplyStarQuickPreset: (qp: StarQuickPreset) => void;
	onSelectCategory: (cat: WarrantyCategory) => void;
	onAddItem: () => void;
	onRemoveItem: (id: string) => void;
	riskFactors: WarrantyRiskFactors;
	onRiskFactorsChange: React.Dispatch<React.SetStateAction<WarrantyRiskFactors>>;
	calculation: WarrantyCalculationResult;
}

export const WarrantyItemsStep: React.FC<WarrantyItemsStepProps> = (props) => {
	const { completedStages, onOpenRemediation, onImportCompletedStages } = props;

	return (
		<div className="warranty-studio-grid">
			<div className="warranty-studio-main">
				<div className="warranty-quick-remediation-banner">
					<div className="warranty-remediation-banner-left">
						<ShieldAlert size={20} className="warranty-remediation-banner-icon" />
						<div>
							<strong>Гарантийный приём (выпала пломба, расцементировка коронки, скол)</strong>
							<p>Оформление гарантии: пациент платит 0 ₽ • Списание со склада по факту</p>
						</div>
					</div>
					<button type="button" className="warranty-btn-remediation-quick" onClick={onOpenRemediation}>
						Оформить переделку (0 ₽)
					</button>
				</div>

				{completedStages && completedStages.length > 0 && (
					<div className="warranty-stages-import-banner">
						<div className="warranty-stages-banner-left">
							<FileCheck size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<div>
								<strong>Завершенные этапы плана лечения ({completedStages.length} поз.)</strong>
								<p>Формирование гарантийного паспорта по всем выполненным манипуляциям</p>
							</div>
						</div>
						<button type="button" className="warranty-btn-secondary" onClick={onImportCompletedStages}>
							<CheckCircle2 size={14} style={{ color: "var(--ok-fg)" }} />
							Заполнить из плана ({completedStages.length})
						</button>
					</div>
				)}

				<WarrantyTeethFormula selectedTeeth={props.selectedTeeth} items={props.items} onToggleTooth={props.onToggleTooth} />
				<WarrantyCategoryPresetsBar activeCategory={props.activeCategory} currentWorkTitle={props.currentWorkTitle} onApplyStarQuickPreset={props.onApplyStarQuickPreset} onSelectCategory={props.onSelectCategory} />
				<WarrantyItemFormInputs {...props} />
				<WarrantyItemsTable items={props.items} calculation={props.calculation} onRemoveItem={props.onRemoveItem} />
			</div>

			<div className="warranty-studio-sidebar">
				<WarrantyRiskFactorsPanel riskFactors={props.riskFactors} onRiskFactorsChange={props.onRiskFactorsChange} calculation={props.calculation} />
			</div>
		</div>
	);
};
