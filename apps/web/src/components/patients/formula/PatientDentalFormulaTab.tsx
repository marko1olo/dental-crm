/**
 * apps/web/src/components/patients/formula/PatientDentalFormulaTab.tsx
 *
 * Интерактивная одонтограмма FDI пациента (Мандаты 8e, 8b, 8k)
 */

import React from "react";
import { ToothChart } from "../../odontogram/ToothChart";
import { ToothRadialMenu } from "../../odontogram/ToothRadialMenu";
import type { PatientDentalFormulaTabProps } from "./formulaTypes";
import { FormulaHeaderBar } from "./FormulaHeaderBar";
import { FormulaStampBar } from "./FormulaStampBar";
import { useDentalFormulaState } from "./useDentalFormulaState";

export type { PatientDentalFormulaTabProps } from "./formulaTypes";

export const PatientDentalFormulaTab: React.FC<PatientDentalFormulaTabProps> = React.memo(
	function PatientDentalFormulaTab({
		patientId,
		patientBirthDate,
		patientName: _patientName,
		onApplyFindingToDiary,
	}) {
		const {
			patientAge,
			dentitionMode,
			setDentitionMode,
			teethData,
			teethDataRef,
			selectedTeeth,
			activeStamp,
			lastSavedTime,
			radialMenuData,
			setRadialMenuData,
			kpuStats,
			commitToothChanges,
			handleSurfacesChange,
			handleToothClick,
			handleMarkIntact,
			handleMarkWisdom,
			handleSelectStamp,
		} = useDentalFormulaState(patientId, patientBirthDate, onApplyFindingToDiary);

		const isPediatric = dentitionMode === "pediatric";
		const isMixed = dentitionMode === "mixed";

		return (
			<div
				className="patient-dental-formula-tab flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs text-[var(--ink)]"
				data-testid="patient-dental-formula-tab"
			>
				<FormulaHeaderBar
					patientAge={patientAge}
					dentitionMode={dentitionMode}
					onDentitionModeChange={setDentitionMode}
					kpuStats={kpuStats}
					onMarkIntact={handleMarkIntact}
					onMarkWisdomMissing={handleMarkWisdom}
				/>

				<FormulaStampBar
					activeStamp={activeStamp}
					onSelectStamp={handleSelectStamp}
					onResetStamp={() => handleSelectStamp(activeStamp!)}
					selectedTeeth={selectedTeeth}
					lastSavedTime={lastSavedTime}
				/>

				<div className="w-full overflow-x-auto py-2">
					<ToothChart
						patientId={patientId}
						teethData={teethData}
						dentitionMode={dentitionMode}
						pediatricMode={isPediatric}
						mixedDentition={isMixed}
						selectedTeeth={selectedTeeth}
						activeStamp={activeStamp}
						useSurfaces={true}
						onToothClick={handleToothClick}
						onSurfacesChange={handleSurfacesChange}
						onQuickStateChange={(targets, state, surfs) => {
							void commitToothChanges(targets, state, surfs);
						}}
						hideQuadrantSwitcher={false}
					/>
				</div>

				{radialMenuData && (
					<ToothRadialMenu
						toothNumber={radialMenuData.toothNumber}
						anchorRect={radialMenuData.anchorRect}
						currentState={radialMenuData.currentState}
						surfaces={teethDataRef.current.find((t) => t.toothNumber === radialMenuData.toothNumber)?.surfaces}
						onSelectState={(state, surfs) => {
							void commitToothChanges([radialMenuData.toothNumber], state, surfs);
							setRadialMenuData(null);
						}}
						onSelectSurfaces={(surfs) => {
							handleSurfacesChange([radialMenuData.toothNumber], surfs);
						}}
						onClose={() => setRadialMenuData(null)}
					/>
				)}
			</div>
		);
	},
);

PatientDentalFormulaTab.displayName = "PatientDentalFormulaTab";
