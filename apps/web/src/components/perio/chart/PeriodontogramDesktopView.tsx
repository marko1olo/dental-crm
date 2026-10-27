/**
 * PeriodontogramDesktopView.tsx — Десктопное рабочее пространство пародонтограммы.
 * Архитектурный слой Layer 4: UI View (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { PerioArchGrid } from "./PerioArchGrid";
import { PerioDiagnosticsPanel } from "./PerioDiagnosticsPanel";
import { PerioExpressBanner } from "./PerioExpressBanner";
import { PerioHelpDrawer } from "./PerioHelpDrawer";
import { PerioKeypadDrawer } from "./PerioKeypadDrawer";
import { PerioSummaryBar } from "./PerioSummaryBar";
import { PerioToolbar } from "./PerioToolbar";
import { PerioToothInspector } from "./PerioToothInspector";
import type { usePerioChartLogic } from "./usePerioChartLogic";

export interface PeriodontogramDesktopViewProps {
	readonly logic: ReturnType<typeof usePerioChartLogic>;
	readonly readOnly?: boolean | undefined;
}

export const PeriodontogramDesktopView: React.FC<PeriodontogramDesktopViewProps> = React.memo(({
	logic, readOnly = false,
}) => {
	const {
		selectedToothNumber, setSelectedToothNumber, focusedSite, setFocusedSite,
		isDiagnosticsExpanded, setIsDiagnosticsExpanded, isHygieneExpanded, setIsHygieneExpanded,
		isHelpOpen, setIsHelpOpen, copyStatus, insertStatus, isTier3ProbingExpanded,
		setIsTier3ProbingExpanded, isProbeKeyboardEnabled, setIsProbeKeyboardEnabled,
		archFilter, setArchFilter, containerRef, summary, psrSextants, psrSummaryText,
		olearyPcr, aapDiagnosis, toothMap, selectedTooth, updateToothSite, updateToothProperties,
		moveToNextSite, moveToPreviousSite, handleKeypadDepth, handleKeypadToggleBop,
		handleKeypadTogglePlaque, handleKeypadToggleSuppuration, handleCycleMobility,
		handleCycleFurcation, handleApplyExpressPreset, handleApplySextantCode,
		handleSetAllIntact, handleMarkSelectedToothPathology, handleMarkBopOnDeepPockets,
		handleClearPlaque, handleApplyTherapistPreset, handleInsertToProtocol,
		handleCopyProtocol, dynamics, syncStatus, lastSavedAt, handleSaveDraft,
	} = logic;

	return (
		<>
			<PerioToolbar
				aapDiagnosis={aapDiagnosis} readOnly={readOnly} selectedToothNumber={selectedToothNumber}
				isHygieneExpanded={isHygieneExpanded} insertStatus={insertStatus} copyStatus={copyStatus}
				syncStatus={syncStatus} lastSavedAt={lastSavedAt}
				onSaveDraft={() => void handleSaveDraft({ closeAfter: false })}
				onApplyExpressPreset={handleApplyExpressPreset} onSetAllIntact={handleSetAllIntact}
				onMarkSelectedToothPathology={handleMarkSelectedToothPathology}
				onMarkBopOnDeepPockets={handleMarkBopOnDeepPockets} onClearPlaque={handleClearPlaque}
				onToggleHygieneExpanded={() => setIsHygieneExpanded((prev) => !prev)}
				onInsertToProtocol={handleInsertToProtocol} onCopyProtocol={handleCopyProtocol}
				onToggleHelp={() => setIsHelpOpen((prev) => !prev)}
			/>
			<PerioExpressBanner
				readOnly={readOnly} isProbeKeyboardEnabled={isProbeKeyboardEnabled}
				onToggleProbeKeyboard={setIsProbeKeyboardEnabled} insertStatus={insertStatus}
				onInsertToProtocol={handleInsertToProtocol} isTier3ProbingExpanded={isTier3ProbingExpanded}
				onToggleTier3Probing={() => setIsTier3ProbingExpanded((prev) => !prev)}
				onApplyExpressPreset={handleApplyExpressPreset} onApplyTherapistPreset={handleApplyTherapistPreset}
				psrSummaryText={psrSummaryText} psrSextants={psrSextants} onApplySextantCode={handleApplySextantCode}
			/>
			<PerioSummaryBar
				summary={summary} olearyPcr={olearyPcr} psrSummaryText={psrSummaryText}
				isDiagnosticsExpanded={isDiagnosticsExpanded}
				onToggleDiagnostics={() => setIsDiagnosticsExpanded((prev) => !prev)}
			/>
			<PerioHelpDrawer isHelpOpen={isHelpOpen} onCloseHelp={() => setIsHelpOpen(false)} />
			{isTier3ProbingExpanded && (
				<PerioKeypadDrawer
					focusedSite={focusedSite} toothMap={toothMap} isProbeKeyboardEnabled={isProbeKeyboardEnabled}
					onToggleProbeKeyboard={setIsProbeKeyboardEnabled} readOnly={readOnly}
					onKeypadDepth={handleKeypadDepth} onToggleBop={handleKeypadToggleBop}
					onTogglePlaque={handleKeypadTogglePlaque} onToggleSuppuration={handleKeypadToggleSuppuration}
					onPrevSite={moveToPreviousSite} onNextSite={moveToNextSite}
				/>
			)}
			<PerioArchGrid
				isTier3ProbingExpanded={isTier3ProbingExpanded} onExpandTier3={() => setIsTier3ProbingExpanded(true)}
				archFilter={archFilter} onSetArchFilter={setArchFilter} toothMap={toothMap}
				selectedToothNumber={selectedToothNumber} focusedSite={focusedSite} readOnly={readOnly}
				onSelectTooth={setSelectedToothNumber}
				onFocusSite={(num, key) => {
					setIsProbeKeyboardEnabled(true); setIsTier3ProbingExpanded(true);
					setFocusedSite({ toothNumber: num, siteKey: key }); setSelectedToothNumber(num);
					containerRef.current?.focus();
				}}
				onCycleMobility={handleCycleMobility} onCycleFurcation={handleCycleFurcation}
				onToggleBop={(num, key) => updateToothSite(num, key, (p) => ({ bleedingOnProbing: !p.bleedingOnProbing }))}
				onTogglePlaque={(num, key) => updateToothSite(num, key, (p) => ({ plaque: !p.plaque }))}
				onToggleSuppuration={(num, key) => updateToothSite(num, key, (p) => ({ suppuration: !p.suppuration }))}
				onSetProbingDepth={(num, key, d) => updateToothSite(num, key, () => ({ probingDepthMm: d }))}
				onSetGingivalMargin={(num, key, gm) => updateToothSite(num, key, () => ({ gingivalMarginMm: gm }))}
			/>
			{isTier3ProbingExpanded && (
				selectedTooth ? (
					<PerioToothInspector
						selectedTooth={selectedTooth} readOnly={readOnly}
						onUpdateToothProperties={updateToothProperties} onUpdateToothSite={updateToothSite}
					/>
				) : (
					<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
						Выберите зуб в схеме, чтобы увидеть шесть точек зондирования и свойства зуба
					</div>
				)
			)}
			<PerioDiagnosticsPanel
				isDiagnosticsExpanded={isDiagnosticsExpanded} onCloseDiagnostics={() => setIsDiagnosticsExpanded(false)}
				psrSummaryText={psrSummaryText} psrSextants={psrSextants} olearyPcr={olearyPcr} dynamics={dynamics}
			/>
		</>
	);
});
PeriodontogramDesktopView.displayName = "PeriodontogramDesktopView";
