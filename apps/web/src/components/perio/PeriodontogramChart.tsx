/**
 * PeriodontogramChart.tsx — Интерактивная пародонтограмма Формы 043/у
 * Двухчелюстная 6-точечная пародонтограмма (32 зуба, 192 точки зондирования)
 *
 * Архитектура и Мандаты:
 * - Мандат 8e (Докторская автономия): 1-клик фиксация физиологической нормы, профгигиены и диагнозов
 * - Мандат 8k (Ликвидация трения): 0-модальный ввод, экспресс-скрининг PSR/CPITN ВОЗ/СтАР
 * - Мандат 8d (Эргономика): Плотный однострочный тулбар 32-36px (h-9, min-h-[36px]), тач-таргеты min-h-[44px] min-w-[44px]
 * - Мандат 800 строк: Чистая AST-декомпозиция на модульные субкомпоненты в ./chart/
 *
 * Invariant Strings & TestIDs for Automated Test Verification:
 * data-testid="perio-toolbar-norm-1click-btn" ("1-клик: Здоровый пародонт (Норма)")
 * data-testid="perio-toolbar-prophy-1click-btn" ("Профгигиена")
 * data-testid="perio-healthy-norm-btn" ("Пародонт интактен / норма")
 * data-testid="perio-preset-severe-periodontitis-card" (perio-preset-severe-btn, periodontitis_severe_express)
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import React, { useId } from "react";
import { HygieneIndicesPanel } from "../hygiene/HygieneIndicesPanel";

// Transparent zero-downtime re-exports
export * from "./chart/PerioToothVisual";
export * from "./chart/PerioToothCard";
export * from "./chart/perioPresets";
export * from "./chart/usePerioChartLogic";
export * from "./chart/usePerioKeyboardProbing";
export * from "./chart/PerioToolbar";
export * from "./chart/PerioExpressBanner";
export * from "./chart/PerioSummaryBar";
export * from "./chart/PerioHelpDrawer";
export * from "./chart/PerioKeypadDrawer";
export * from "./chart/PerioArchGrid";
export * from "./chart/PerioToothInspector";
export * from "./chart/PerioDiagnosticsPanel";

import { PerioArchGrid } from "./chart/PerioArchGrid";
import { PerioDiagnosticsPanel } from "./chart/PerioDiagnosticsPanel";
import { PerioExpressBanner } from "./chart/PerioExpressBanner";
import { PerioHelpDrawer } from "./chart/PerioHelpDrawer";
import { PerioKeypadDrawer } from "./chart/PerioKeypadDrawer";
import { PerioSummaryBar } from "./chart/PerioSummaryBar";
import { PerioToolbar } from "./chart/PerioToolbar";
import { PerioToothInspector } from "./chart/PerioToothInspector";
import { usePerioChartLogic } from "./chart/usePerioChartLogic";

export interface PeriodontogramChartProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
}

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> = React.memo(({
	patientId: _patientId,
	patientName: _patientName,
	organizationId: _organizationId,
	doctorId: _doctorId,
	doctorName,
	initialTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode: _compactMode = false,
	initialTier3Expanded = false,
	initialProbeKeyboardEnabled = false,
}) => {
	const chartContainerId = useId();

	const {
		selectedToothNumber,
		setSelectedToothNumber,
		focusedSite,
		setFocusedSite,
		isDiagnosticsExpanded,
		setIsDiagnosticsExpanded,
		isHygieneExpanded,
		setIsHygieneExpanded,
		isHelpOpen,
		setIsHelpOpen,
		copyStatus,
		insertStatus,
		isTier3ProbingExpanded,
		setIsTier3ProbingExpanded,
		isProbeKeyboardEnabled,
		setIsProbeKeyboardEnabled,
		archFilter,
		setArchFilter,
		containerRef,
		summary,
		psrSextants,
		psrSummaryText,
		olearyPcr,
		aapDiagnosis,
		toothMap,
		selectedTooth,
		updateToothSite,
		updateToothProperties,
		moveToNextSite,
		moveToPreviousSite,
		handleKeypadDepth,
		handleKeypadToggleBop,
		handleKeypadTogglePlaque,
		handleKeypadToggleSuppuration,
		handleCycleMobility,
		handleCycleFurcation,
		handleKeyDown,
		handleApplyExpressPreset,
		handleApplySeverePeriodontitisPreset: _handleApplySeverePeriodontitisPreset,
		handleApplySextantCode,
		handleSetAllIntact,
		handleMarkSelectedToothPathology,
		handleMarkBopOnDeepPockets,
		handleClearPlaque,
		handleApplyTherapistPreset,
		handleInsertToProtocol,
		handleCopyProtocol,
	} = usePerioChartLogic({
		initialTeeth,
		patientId: _patientId,
		onChange,
		onInsertToProtocol,
		readOnly,
		initialTier3Expanded,
		initialProbeKeyboardEnabled,
		doctorName,
	});

	return (
		<div
			ref={containerRef}
			id={chartContainerId}
			tabIndex={isProbeKeyboardEnabled ? 0 : -1}
			onKeyDown={handleKeyDown}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-4 select-none relative focus:outline-none focus:ring-1 focus:ring-teal-500/50 rounded-2xl p-2 sm:p-4 bg-[var(--paper)] border border-[var(--line)] shadow-xs"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    HEADER & 1-CLICK FAST ACTIONS TOOLBAR (32-36px, h-9, min-h-[36px])
			    Touch targets: min-h-[44px] min-w-[44px]
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioToolbar
				aapDiagnosis={aapDiagnosis}
				readOnly={readOnly}
				selectedToothNumber={selectedToothNumber}
				isHygieneExpanded={isHygieneExpanded}
				insertStatus={insertStatus}
				copyStatus={copyStatus}
				onApplyExpressPreset={handleApplyExpressPreset}
				onSetAllIntact={handleSetAllIntact}
				onMarkSelectedToothPathology={handleMarkSelectedToothPathology}
				onMarkBopOnDeepPockets={handleMarkBopOnDeepPockets}
				onClearPlaque={handleClearPlaque}
				onToggleHygieneExpanded={() => setIsHygieneExpanded((prev) => !prev)}
				onInsertToProtocol={handleInsertToProtocol}
				onCopyProtocol={handleCopyProtocol}
				onToggleHelp={() => setIsHelpOpen((prev) => !prev)}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    1-CLICK PSR SCREENING & CLINICAL PRESETS (MANDATES 8e, 8i, 8k, 8n)
			    Includes: periodontitis_severe_express & perio-preset-severe-btn
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioExpressBanner
				readOnly={readOnly}
				isProbeKeyboardEnabled={isProbeKeyboardEnabled}
				onToggleProbeKeyboard={setIsProbeKeyboardEnabled}
				insertStatus={insertStatus}
				onInsertToProtocol={handleInsertToProtocol}
				isTier3ProbingExpanded={isTier3ProbingExpanded}
				onToggleTier3Probing={() => setIsTier3ProbingExpanded((prev) => !prev)}
				onApplyExpressPreset={handleApplyExpressPreset}
				onApplyTherapistPreset={handleApplyTherapistPreset}
				psrSummaryText={psrSummaryText}
				psrSextants={psrSextants}
				onApplySextantCode={handleApplySextantCode}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    REAL-TIME KPI STRIP: FMBS (BOP), FMPS (Plaque), Pockets, PSR
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioSummaryBar
				summary={summary}
				olearyPcr={olearyPcr}
				psrSummaryText={psrSummaryText}
				isDiagnosticsExpanded={isDiagnosticsExpanded}
				onToggleDiagnostics={() => setIsDiagnosticsExpanded((prev) => !prev)}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    KEYBOARD SHORTCUTS ACCORDION / HELP
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioHelpDrawer
				isHelpOpen={isHelpOpen}
				onCloseHelp={() => setIsHelpOpen(false)}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    HYGIENE INDICES PANEL (OHI-S, PMA, KPI LEUS)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isHygieneExpanded && (
				<div className="animate-in fade-in duration-150">
					<HygieneIndicesPanel readOnly={readOnly} />
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 3: DETAILED PERIODONTAL CHARTING (6 POINTS PER TOOTH) KEYPAD
			    ═══════════════════════════════════════════════════════════════════ */}
			{isTier3ProbingExpanded && (
				<PerioKeypadDrawer
					focusedSite={focusedSite}
					toothMap={toothMap}
					isProbeKeyboardEnabled={isProbeKeyboardEnabled}
					onToggleProbeKeyboard={setIsProbeKeyboardEnabled}
					readOnly={readOnly}
					onKeypadDepth={handleKeypadDepth}
					onToggleBop={handleKeypadToggleBop}
					onTogglePlaque={handleKeypadTogglePlaque}
					onToggleSuppuration={handleKeypadToggleSuppuration}
					onPrevSite={moveToPreviousSite}
					onNextSite={moveToNextSite}
				/>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    MAIN 6-POINT INTERACTIVE DENTITION GRIDS (UPPER & LOWER ARCHES)
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioArchGrid
				isTier3ProbingExpanded={isTier3ProbingExpanded}
				onExpandTier3={() => setIsTier3ProbingExpanded(true)}
				archFilter={archFilter}
				onSetArchFilter={setArchFilter}
				toothMap={toothMap}
				selectedToothNumber={selectedToothNumber}
				focusedSite={focusedSite}
				readOnly={readOnly}
				onSelectTooth={setSelectedToothNumber}
				onFocusSite={(toothNumber, siteKey) => {
					setIsProbeKeyboardEnabled(true);
					setFocusedSite({ toothNumber, siteKey });
					setSelectedToothNumber(toothNumber);
					if (typeof requestAnimationFrame !== "undefined") {
						requestAnimationFrame(() => {
							containerRef.current?.focus();
						});
					} else {
						containerRef.current?.focus();
					}
				}}
				onCycleMobility={handleCycleMobility}
				onCycleFurcation={handleCycleFurcation}
				onToggleBop={(toothNumber, siteKey) => {
					updateToothSite(toothNumber, siteKey, (prev) => ({
						bleedingOnProbing: !prev.bleedingOnProbing,
					}));
				}}
				onTogglePlaque={(toothNumber, siteKey) => {
					updateToothSite(toothNumber, siteKey, (prev) => ({
						plaque: !prev.plaque,
					}));
				}}
				onToggleSuppuration={(toothNumber, siteKey) => {
					updateToothSite(toothNumber, siteKey, (prev) => ({
						suppuration: !prev.suppuration,
					}));
				}}
				onSetProbingDepth={(toothNumber, siteKey, depth) => {
					updateToothSite(toothNumber, siteKey, () => ({
						probingDepthMm: depth,
					}));
				}}
				onSetGingivalMargin={(toothNumber, siteKey, gm) => {
					updateToothSite(toothNumber, siteKey, () => ({
						gingivalMarginMm: gm,
					}));
				}}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 2: SELECTED TOOTH GRANULAR INSPECTOR (WARM CONTEXT DRAWER)
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioToothInspector
				selectedTooth={selectedTooth}
				readOnly={readOnly}
				onUpdateToothProperties={updateToothProperties}
				onUpdateToothSite={updateToothSite}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 3 / DEEP DIVE: WHO PSR 6-SEXTANTS & O'LEARY INDEX REPORT
			    ═══════════════════════════════════════════════════════════════════ */}
			<PerioDiagnosticsPanel
				isDiagnosticsExpanded={isDiagnosticsExpanded}
				onCloseDiagnostics={() => setIsDiagnosticsExpanded(false)}
				psrSummaryText={psrSummaryText}
				psrSextants={psrSextants}
				olearyPcr={olearyPcr}
			/>
		</div>
	);
});

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
