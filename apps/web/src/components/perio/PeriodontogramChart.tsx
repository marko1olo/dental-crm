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
import React, { useId, useState } from "react";
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
export * from "./chart/PerioMobileTouchCockpit";

import { PerioArchGrid } from "./chart/PerioArchGrid";
import { PerioDiagnosticsPanel } from "./chart/PerioDiagnosticsPanel";
import { PerioExpressBanner } from "./chart/PerioExpressBanner";
import { PerioHelpDrawer } from "./chart/PerioHelpDrawer";
import { PerioKeypadDrawer } from "./chart/PerioKeypadDrawer";
import { PerioMobileTouchCockpit } from "./chart/PerioMobileTouchCockpit";
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
		dynamics,
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

	const [viewModeOverride, setViewModeOverride] = useState<"auto" | "touch" | "desktop">("auto");

	return (
		<div
			ref={containerRef}
			id={chartContainerId}
			tabIndex={isProbeKeyboardEnabled ? 0 : -1}
			onKeyDown={handleKeyDown}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-4 select-none relative focus:outline-none focus:ring-1 focus:ring-teal-500/50 rounded-2xl p-2 sm:p-4 bg-[var(--paper)] border border-[var(--line)] shadow-xs overflow-x-clip max-w-[100vw] w-full"
		>
			{/* Ergonomic Mode Switcher (Doctor Autonomy Mandate 8e & Apple HIG) */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold select-none w-full">
				<div className="grid grid-cols-2 gap-1 w-full sm:w-auto sm:flex sm:items-center">
					<button
						type="button"
						onClick={() => setViewModeOverride("touch")}
						className={`min-h-[40px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
							viewModeOverride === "touch"
								? "bg-[var(--paper)] text-teal-300 font-bold shadow-xs border border-teal-500/40"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="perio-mode-touch-btn"
					>
						<span>Сенсорный (Q1–Q4)</span>
					</button>
					<button
						type="button"
						onClick={() => setViewModeOverride("desktop")}
						className={`min-h-[40px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
							viewModeOverride === "desktop"
								? "bg-[var(--paper)] text-teal-300 font-bold shadow-xs border border-teal-500/40"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="perio-mode-desktop-btn"
					>
						<span>Полная сетка (18–48)</span>
					</button>
				</div>
				<div className="flex items-center justify-between sm:justify-end gap-2 px-1">
					{viewModeOverride !== "auto" && (
						<button
							type="button"
							onClick={() => setViewModeOverride("auto")}
							className="min-h-[36px] px-2 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer"
						>
							Авто
						</button>
					)}
					<span className="text-[11px] text-[var(--muted)] hidden md:inline px-1 truncate">
						{viewModeOverride === "touch"
							? "Florida Probe Touch (1–7+ мм, 6 датчиков на зуб)"
							: "Форма 043/у (32 зуба, 192 точки зондирования)"}
					</span>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    TOUCH-FIRST MOBILE COCKPIT (APPLE HIG 390x844 & FLORIDA PROBE)
			    Visible by default on mobile screens (md:hidden) or when forced
			    ═══════════════════════════════════════════════════════════════════ */}
			<div
				className={
					viewModeOverride === "desktop"
						? "hidden"
						: viewModeOverride === "touch"
							? "block w-full"
							: "block md:hidden w-full"
				}
			>
				<PerioMobileTouchCockpit
					toothMap={toothMap}
					selectedToothNumber={selectedToothNumber}
					onSelectTooth={setSelectedToothNumber}
					focusedSite={focusedSite}
					onFocusSite={(toothNumber, siteKey) => {
						setIsProbeKeyboardEnabled(true);
						setFocusedSite({ toothNumber, siteKey });
						setSelectedToothNumber(toothNumber);
					}}
					readOnly={readOnly}
					onKeypadDepth={handleKeypadDepth}
					onToggleBop={handleKeypadToggleBop}
					onTogglePlaque={handleKeypadTogglePlaque}
					onToggleSuppuration={handleKeypadToggleSuppuration}
					onPrevSite={moveToPreviousSite}
					onNextSite={moveToNextSite}
					onCycleMobility={handleCycleMobility}
					onCycleFurcation={handleCycleFurcation}
					updateToothSite={updateToothSite}
					updateToothProperties={updateToothProperties}
					summary={summary}
					aapDiagnosis={aapDiagnosis}
					onApplyExpressPreset={handleApplyExpressPreset}
					onSetAllIntact={handleSetAllIntact}
					onInsertToProtocol={handleInsertToProtocol}
					insertStatus={insertStatus}
				/>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    DESKTOP TRADITIONAL FULL-ARCH VIEW (1440px Cockpit)
			    Visible on desktop screens (hidden md:flex) or when forced
			    ═══════════════════════════════════════════════════════════════════ */}
			<div
				className={`flex-col gap-4 w-full ${
					viewModeOverride === "touch"
						? "hidden"
						: viewModeOverride === "desktop"
							? "flex"
							: "hidden md:flex"
				}`}
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
				dynamics={dynamics}
			/>
			</div>
		</div>
	);
});

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
