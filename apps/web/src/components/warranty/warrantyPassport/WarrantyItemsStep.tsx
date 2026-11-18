import { CheckCircle2, FileCheck } from "lucide-react";
import type React from "react";
import type { WarrantyCalculationResult, WarrantyItem, WarrantyRiskFactors } from "../warrantyEngine.js";
import type { StarQuickPreset, WarrantyCategory } from "../warrantyPresets.js";
import type { CompletedTreatmentStage } from "./types";
import { WarrantyTeethFormula } from "./itemsStep/WarrantyTeethFormula";
import { WarrantyCategoryPresetsBar } from "./itemsStep/WarrantyCategoryPresetsBar";
import { WarrantyItemFormInputs } from "./itemsStep/WarrantyItemFormInputs";
import { WarrantyItemsTable } from "./itemsStep/WarrantyItemsTable";
import { WarrantyRiskFactorsPanel } from "./itemsStep/WarrantyRiskFactorsPanel";

export interface WarrantyItemsStepProps {
	completedStages?: CompletedTreatmentStage[] | undefined;
	onOpenRemediation: () => void;
	onImportCompletedStages: () => void | 0;
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
	const { completedStages, onImportCompletedStages } = props;

	return (
		<div className="warranty-studio-grid">
			<div className="warranty-studio-main">
				{/* Баннер импорта из завершенных этапов плана лечения (если есть) */}
				{completedStages && completedStages.length > 0 && (
					<div className="warranty-stages-import-banner">
						<div className="warranty-stages-banner-left">
							<FileCheck size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<div>
								<strong>Завершенные этапы плана лечения ({completedStages.length} поз.)</strong>
								<p>Формирование гарантийного паспорта по всем выполненным манипуляциям</p>
							</div>
						</div>
						<button
							type="button"
							className="warranty-btn-secondary dente-btn-secondary"
							onClick={onImportCompletedStages}
						>
							<CheckCircle2 size={14} style={{ color: "var(--ok-fg)" }} />
							Заполнить из плана ({completedStages.length})
						</button>
					</div>
				)}

				{/* 1. Зубная формула FDI */}
				<WarrantyTeethFormula
					selectedTeeth={props.selectedTeeth}
					items={props.items}
					onToggleTooth={props.onToggleTooth}
				/>

				{/* 2. Категория и готовые пресеты клиники */}
				<WarrantyCategoryPresetsBar
					activeCategory={props.activeCategory}
					currentWorkTitle={props.currentWorkTitle}
					onApplyStarQuickPreset={props.onApplyStarQuickPreset}
					onSelectCategory={props.onSelectCategory}
				/>

				{/* 3. Параметры материала, оттенка VITA и добавление */}
				<WarrantyItemFormInputs {...props} />

				{/* 4. Таблица позиций гарантийного сертификата */}
				<WarrantyItemsTable
					items={props.items}
					calculation={props.calculation}
					onRemoveItem={props.onRemoveItem}
				/>

				{/* 5. Клинические условия и факторы риска (компактный аккордеон, 0px шума для 99% нормы) */}
				<WarrantyRiskFactorsPanel
					riskFactors={props.riskFactors}
					onRiskFactorsChange={props.onRiskFactorsChange}
					calculation={props.calculation}
				/>
			</div>
		</div>
	);
};
