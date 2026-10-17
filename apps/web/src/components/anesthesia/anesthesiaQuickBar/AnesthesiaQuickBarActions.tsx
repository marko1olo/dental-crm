import React from 'react';
import type { AnesthesiaQuickBarActionsProps } from './types';
import { AnesthesiaDoseStepper } from './AnesthesiaDoseStepper';
import { AnesthesiaExpressPresets } from './AnesthesiaExpressPresets';
import { AnesthesiaMoreActionsMenu } from './AnesthesiaMoreActionsMenu';
import { AnesthesiaDoseBalanceSummary } from './AnesthesiaDoseBalanceSummary';

export function AnesthesiaQuickBarActions({
	patientWeightKg,
	selectedDrugId: _selectedDrugId,
	selectedDrugInfo: _selectedDrugInfo,
	singleCarpuleResult,
	maxSafeCarpules,
	sessionInjectedCarpules,
	selectedCarpulesCount,
	onChangeSelectedCarpulesCount,
	onApplyCarpules,
	onApplyUbistesinForte,
	onApplyUbistesin,
	onApplyStandardNormPreset,
	onApplyUltracainForteCombined,
	onApplySeptanestInfiltration,
	onApplyInfiltrationArticaine200k,
	onApplyMandibularArticaine100k,
	onApplyScandonestCardio,
	onWriteoffAntishockKit,
	onOpenEmergencyProtocol,
	onSelectDrug,
	disabled = false,
}: AnesthesiaQuickBarActionsProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1.5 border-t border-[var(--line)]">
			{/* 1-Click Action Buttons & Chairside Presets */}
			<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
				<AnesthesiaDoseStepper
					disabled={disabled}
					selectedCarpulesCount={selectedCarpulesCount}
					onChangeSelectedCarpulesCount={onChangeSelectedCarpulesCount}
					onApplyCarpules={onApplyCarpules}
				/>

				<AnesthesiaExpressPresets
					disabled={disabled}
					selectedCarpulesCount={selectedCarpulesCount}
					onChangeSelectedCarpulesCount={onChangeSelectedCarpulesCount}
					onApplyCarpules={onApplyCarpules}
					onApplyUbistesinForte={onApplyUbistesinForte}
					onApplyUbistesin={onApplyUbistesin}
					onApplyInfiltrationArticaine200k={onApplyInfiltrationArticaine200k}
					onApplyMandibularArticaine100k={onApplyMandibularArticaine100k}
					onApplyStandardNormPreset={onApplyStandardNormPreset}
					onApplyUltracainForteCombined={onApplyUltracainForteCombined}
					onApplyScandonestCardio={onApplyScandonestCardio}
					onApplySeptanestInfiltration={onApplySeptanestInfiltration}
					onWriteoffAntishockKit={onWriteoffAntishockKit}
					onOpenEmergencyProtocol={onOpenEmergencyProtocol}
				/>

				<AnesthesiaMoreActionsMenu
					disabled={disabled}
					onSelectDrug={onSelectDrug}
					onApplyCarpules={onApplyCarpules}
					onApplySeptanestInfiltration={onApplySeptanestInfiltration}
				/>
			</div>

			{/* Maximum Safe Carpules Badge & Live Human-Readable Dose Balance */}
			<AnesthesiaDoseBalanceSummary
				patientWeightKg={patientWeightKg}
				maxSafeCarpules={maxSafeCarpules}
				sessionInjectedCarpules={sessionInjectedCarpules}
				singleCarpuleResult={singleCarpuleResult}
			/>
		</div>
	);
}
