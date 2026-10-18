/**
 * TreatmentPlanPresenterComparisonTab.tsx — вкладка 3-Tier сравнения вариантов плана лечения
 * («Эконом», «Оптимум», «Премиум») для презентации пациенту у кресла.
 * Декомпозирована по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanPresenterComparisonTabProps } from "./presenterModules/comparison/comparisonTabTypes";
import { TreatmentPlanPresenterDentalFormula } from "./presenterModules/TreatmentPlanPresenterDentalFormula";
import { TreatmentPlanPresenterStagesAccordion } from "./presenterModules/TreatmentPlanPresenterStagesAccordion";
import { DentalLabOrderDrawer } from "../lab/DentalLabOrderDrawer";
import { showToast } from "../GlobalToast";
import { usePresenterComparisonHandlers } from "./presenterModules/comparison/usePresenterComparisonHandlers";
import { PresenterMobileTierBar } from "./presenterModules/comparison/PresenterMobileTierBar";
import { PresenterTiersGrid } from "./presenterModules/comparison/PresenterTiersGrid";

export type { TreatmentPlanPresenterComparisonTabProps };

export const TreatmentPlanPresenterComparisonTab: React.FC<TreatmentPlanPresenterComparisonTabProps> = ({
	allTiers,
	selectedTierId,
	onSelectTier,
	getTierLetter,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	setShowMicroConsumables,
	setActiveTab,
	onUpdateItemPrice,
	onConfirmPatientChoice,
	teeth = [],
	planId,
	patientId,
	patientName,
	patientPhone,
	doctorFullName,
}) => {
	const selectedTier = allTiers.find((t) => t.tierId === selectedTierId) || allTiers[0]!;

	const {
		activeLabOrderStage,
		setActiveLabOrderStage,
		handleStageBooking,
		handleOpenLabOrder,
		isStageProsthetic,
	} = usePresenterComparisonHandlers({
		patientId,
		patientName,
		patientPhone,
		planId,
	});

	return (
		<div className="flex flex-col gap-6" data-testid="comparison-view">
			<PresenterMobileTierBar
				allTiers={allTiers}
				selectedTierId={selectedTierId}
				onSelectTier={onSelectTier}
			/>

			<PresenterTiersGrid
				allTiers={allTiers}
				selectedTierId={selectedTierId}
				getTierLetter={getTierLetter}
				onSelectTier={onSelectTier}
				onConfirmPatientChoice={onConfirmPatientChoice}
				setActiveTab={setActiveTab}
			/>

			<TreatmentPlanPresenterDentalFormula
				tier={selectedTier}
				teeth={teeth}
			/>

			<TreatmentPlanPresenterStagesAccordion
				selectedTier={selectedTier}
				getTierLetter={getTierLetter}
				expandedStages={expandedStages}
				onToggleStage={onToggleStage}
				onToggleAllStages={onToggleAllStages}
				showMicroConsumables={showMicroConsumables}
				setShowMicroConsumables={setShowMicroConsumables}
				onUpdateItemPrice={onUpdateItemPrice}
				handleStageBooking={handleStageBooking}
				handleOpenLabOrder={handleOpenLabOrder}
				isStageProsthetic={isStageProsthetic}
			/>

			{activeLabOrderStage && (
				<DentalLabOrderDrawer
					isOpen={true}
					onClose={() => setActiveLabOrderStage(null)}
					editingOrder={null}
					currentPatientName={patientName || "Пациент"}
					currentDoctorName={doctorFullName || "Лечащий врач"}
					currentToothNumber={activeLabOrderStage.toothNumber || 16}
					treatmentPlanId={planId || "PLAN-CURRENT"}
					stageNumber={activeLabOrderStage.stage.stageNumber}
					stageTitle={activeLabOrderStage.stage.title}
					stageId={activeLabOrderStage.stage.id || `stage_${activeLabOrderStage.stage.stageNumber}`}
					onSaveOrder={(order) => {
						setActiveLabOrderStage(null);
						showToast(`Заказ-наряд №${order.orderNumber || "ЗТЛ-1"} успешно создан для ЗТЛ`, "success");
					}}
				/>
			)}
		</div>
	);
};

export default TreatmentPlanPresenterComparisonTab;
