import React from "react";
import type { Form257Record } from "./autoclaveLogEngine.js";
import {
	EXPRESS_CYCLE_DEFAULTS,
	type ExpressCycleFillState,
	computeExpressStandardCycleValues,
	resolveAutoclaveCycleFallbacks,
} from "./newCycle/newCycleDefaults";
import { useNewCycleState } from "./newCycle/useNewCycleState";
import { NewCycleExpressModes } from "./newCycle/NewCycleExpressModes";
import { NewCycleRegimesSelector } from "./newCycle/NewCycleRegimesSelector";
import { NewCyclePrimaryFields } from "./newCycle/NewCyclePrimaryFields";
import { NewCycleSensorsSection } from "./newCycle/NewCycleSensorsSection";
import { NewCycleChamberPointsSection } from "./newCycle/NewCycleChamberPointsSection";
import { NewCycleFooterSection } from "./newCycle/NewCycleFooterSection";

export {
	EXPRESS_CYCLE_DEFAULTS,
	type ExpressCycleFillState,
	computeExpressStandardCycleValues,
	resolveAutoclaveCycleFallbacks,
};

export interface AutoclaveNewCycleTabProps {
	readonly onSaveRecord: (record: Form257Record) => void;
	readonly defaultOperatorName?: string;
	readonly defaultHeadNurseName?: string;
	readonly latestCycleNumber?: number;
}

export function AutoclaveNewCycleTab({
	onSaveRecord, defaultOperatorName = "Сотрудник клиники",
	defaultHeadNurseName = "Старшая медицинская сестра", latestCycleNumber = 1,
}: AutoclaveNewCycleTabProps) {
	const state = useNewCycleState(onSaveRecord, defaultOperatorName, defaultHeadNurseName, latestCycleNumber);

	return (
		<form onSubmit={state.handleSave} noValidate style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<NewCycleExpressModes
				selectedRegimeId={state.selectedRegimeId} actualTime={state.actualTime}
				onStandardCycle={state.handleExpressStandardCycle}
				onDelicateCycle={state.handleExpressDelicateCycle}
				onFastCycle={state.handleExpressFastCycle}
			/>
			<NewCycleRegimesSelector selectedRegimeId={state.selectedRegimeId} onSelectRegime={state.handleSelectRegime} />
			<NewCyclePrimaryFields
				selectedSterilizerId={state.selectedSterilizerId} onSterilizerChange={state.setSelectedSterilizerId}
				cycleDate={state.cycleDate} onCycleDateChange={state.setCycleDate}
				cycleNumber={state.cycleNumber} onCycleNumberChange={state.setCycleNumber}
				packagingType={state.packagingType} onPackagingTypeChange={state.setPackagingType}
				packsCount={state.packsCount} onPacksCountChange={state.setPacksCount}
				bixNumber={state.bixNumber} onBixNumberChange={state.setBixNumber}
			/>
			<NewCycleSensorsSection
				selectedRegimeId={state.selectedRegimeId}
				actualTemp={state.actualTemp} onActualTempChange={state.setActualTemp}
				actualPressure={state.actualPressure} onActualPressureChange={state.setActualPressure}
				actualTime={state.actualTime} onActualTimeChange={state.setActualTime}
				compliance={state.compliance}
			/>
			<NewCycleChamberPointsSection
				chamberPoints={state.chamberPoints}
				onTogglePoint={state.togglePointStatus}
				onSetAllPointsStatus={state.setAllPointsStatus}
			/>
			<NewCycleFooterSection
				itemsDescription={state.itemsDescription} onItemsDescriptionChange={state.setItemsDescription}
				operatorFullName={state.operatorFullName} onOperatorFullNameChange={state.setOperatorFullName}
				isHeadNurseVerified={state.isHeadNurseVerified} onHeadNurseVerifiedChange={state.setIsHeadNurseVerified}
				compliance={state.compliance} areAllPointsPassed={state.areAllPointsPassed}
			/>
		</form>
	);
}

export default AutoclaveNewCycleTab;
