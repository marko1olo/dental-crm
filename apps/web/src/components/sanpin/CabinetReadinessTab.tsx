/**
 * @file CabinetReadinessTab.tsx
 * @description Thin Facade for Cabinet Readiness (SanPiN 3.3686-21).
 * Decomposed into modular components in ./cabinetReadiness/ per Mandate 8b and /decomposer skill.
 */

import React from "react";
import {
	CabinetBactericidalTimer,
	CabinetReadinessActions,
	CabinetReadinessHistoryTable,
	CabinetReadinessStatusHeader,
	CabinetSanpinChecklist,
	useCabinetReadinessState,
} from "./cabinetReadiness";

export function CabinetReadinessTab() {
	const state = useCabinetReadinessState();

	return (
		<div className="sanpin-tab-pane">
			{/* Overall status header and KPI banner */}
			<CabinetReadinessStatusHeader
				selectedCabinet={state.selectedCabinet}
				currentPreset={state.currentPreset}
				isFullyReady={state.evaluation.isFullyReady}
				statusMessageRu={state.evaluation.statusMessageRu}
				disinfectionCompleted={state.disinfectionCompleted}
				turbineSterile={state.turbineSterile}
				contraAngleSterile={state.contraAngleSterile}
				bactericidalActive={state.bactericidalActive}
				onStartAppointmentPaperLogNorm={state.handleStartAppointmentPaperLogNorm}
				onOneClickConfirmCabinetReady={state.handleOneClickConfirmCabinetReady}
				onExportCsv={state.handleExportCsv}
				onPrint={state.handlePrint}
			/>

			{/* Bactericidal irradiator / Dezar lamp runtime and timer */}
			<CabinetBactericidalTimer
				selectedCabinet={state.selectedCabinet}
				nurseName={state.nurseName}
				onExposureLogged={state.handleExposureLogged}
			/>

			{/* Structured SanPiN checklist with 1-click norm preset */}
			<CabinetSanpinChecklist
				selectedCabinet={state.selectedCabinet}
				setSelectedCabinet={state.setSelectedCabinet}
				selectedProfile={state.selectedProfile}
				setSelectedProfile={state.setSelectedProfile}
				currentPreset={state.currentPreset}
				disinfectionCompleted={state.disinfectionCompleted}
				setDisinfectionCompleted={state.setDisinfectionCompleted}
				disinfectantBrand={state.disinfectantBrand}
				setDisinfectantBrand={state.setDisinfectantBrand}
				exposureMinutes={state.exposureMinutes}
				setExposureMinutes={state.setExposureMinutes}
				turbineSterile={state.turbineSterile}
				setTurbineSterile={state.setTurbineSterile}
				contraAngleSterile={state.contraAngleSterile}
				setContraAngleSterile={state.setContraAngleSterile}
				micromotorSterile={state.micromotorSterile}
				setMicromotorSterile={state.setMicromotorSterile}
				class5Verified={state.class5Verified}
				setClass5Verified={state.setClass5Verified}
				mirrorReady={state.mirrorReady}
				setMirrorReady={state.setMirrorReady}
				probeReady={state.probeReady}
				setProbeReady={state.setProbeReady}
				tweezersReady={state.tweezersReady}
				setTweezersReady={state.setTweezersReady}
				excavatorReady={state.excavatorReady}
				setExcavatorReady={state.setExcavatorReady}
				spatulaReady={state.spatulaReady}
				setSpatulaReady={state.setSpatulaReady}
				salivaConnected={state.salivaConnected}
				setSalivaConnected={state.setSalivaConnected}
				hveConnected={state.hveConnected}
				setHveConnected={state.setHveConnected}
				rubberDamReady={state.rubberDamReady}
				setRubberDamReady={state.setRubberDamReady}
				clampsReady={state.clampsReady}
				setClampsReady={state.setClampsReady}
				forcepsReady={state.forcepsReady}
				setForcepsReady={state.setForcepsReady}
				onQuickFillAllReady={state.handleQuickFillAllReady}
			/>

			{/* Action toolbar, verdict banner and sign-off */}
			<CabinetReadinessActions
				isFullyReady={state.evaluation.isFullyReady}
				statusMessageRu={state.evaluation.statusMessageRu}
				missingItems={state.evaluation.missingItems}
				nurseName={state.nurseName}
				setNurseName={state.setNurseName}
				nursePosition={state.nursePosition}
				notes={state.notes}
				setNotes={state.setNotes}
				onSaveChecklist={state.handleSaveChecklist}
				onStartAppointmentPaperLogNorm={state.handleStartAppointmentPaperLogNorm}
				onOneClickConfirmCabinetReady={state.handleOneClickConfirmCabinetReady}
				onQuickFillAllReady={state.handleQuickFillAllReady}
				onExportCsv={state.handleExportCsv}
				onPrint={state.handlePrint}
			/>

			{/* Shift audit history log table */}
			<CabinetReadinessHistoryTable historyRecords={state.historyRecords} />
		</div>
	);
}

export default CabinetReadinessTab;
