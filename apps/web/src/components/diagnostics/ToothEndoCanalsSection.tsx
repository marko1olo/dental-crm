import React from "react";
import {
	type ToothEndoCanalsSectionProps,
	useToothEndoCanalsState,
	ToothEndoHeader,
	ToothEndoPresetsBar,
	ToothEndoControlsRow,
	ToothEndoCanalsTable,
	ToothEndoFooter,
} from "./endo";

export * from "./endo";

export const ToothEndoCanalsSection: React.FC<ToothEndoCanalsSectionProps> = ({
	toothNumber,
	toothData,
	showEndoTable,
	onToggleShowEndoTable,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const {
		canals,
		handleCanalChange,
		handleAddCanal,
		handleRemoveCanal,
		handleResetCanals,
		handleApplyPulpitis,
		handleApplyPeriodontitis,
		handleApplyObturation,
		handleApplyAnatomical,
		handleApplyRevision,
		handleInsertProtocol,
	} = useToothEndoCanalsState(toothNumber, toothData, onUpdateTooth, onInsertToProtocol);

	return (
		<div className="dente-endo-section">
			<ToothEndoHeader
				canalCount={canals.length}
				showEndoTable={showEndoTable}
				onToggleShowEndoTable={onToggleShowEndoTable}
				onApplyExpressProTaper={handleApplyPulpitis}
			/>

			{showEndoTable && (
				<div className="dente-endo-body">
					<ToothEndoPresetsBar
						onApplyProTaper={handleApplyPulpitis}
						onApplyCalasept={handleApplyPeriodontitis}
						onApplyRevision={handleApplyRevision}
						onApplyObturation={handleApplyObturation}
					/>

					<ToothEndoControlsRow
						onApplyAnatomicalLengths={handleApplyAnatomical}
						onResetCanals={handleResetCanals}
						onAddCanal={handleAddCanal}
					/>

					<ToothEndoCanalsTable
						canals={canals}
						onCanalChange={handleCanalChange}
						onRemoveCanal={handleRemoveCanal}
					/>

					<ToothEndoFooter onInsertProtocol={handleInsertProtocol} />
				</div>
			)}
		</div>
	);
};

export default ToothEndoCanalsSection;
