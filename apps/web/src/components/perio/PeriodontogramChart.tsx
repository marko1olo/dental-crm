/**
 * PeriodontogramChart.tsx — Интерактивная пародонтологическая карта приёма
 * Двухчелюстная 6-точечная пародонтограмма (32 зуба, 192 точки зондирования)
 *
 * Архитектура и Мандаты:
 * - Мандат 8e (Докторская автономия): Экспресс-фиксация физиологической нормы, профгигиены и диагнозов
 * - Мандат 8k (Ликвидация трения): 0-модальный ввод, экспресс-скрининг PSR/CPITN ВОЗ/СтАР
 * - Мандат 8d (Эргономика): Плотный однострочный тулбар 32-36px (h-9, min-h-[36px]), тач-таргеты min-h-[44px] min-w-[44px]
 * - Мандат 8b: Модульная декомпозиция (< 450 строк).
 *
 * Invariant Strings & TestIDs for Automated Test Verification:
 * data-testid="perio-toolbar-norm-1click-btn" ("Вся десна здорова (Норма)", "1-клик: Здоровый пародонт (Норма)")
 * data-testid="perio-toolbar-prophy-1click-btn" ("Профгигиена")
 * data-testid="perio-healthy-norm-btn" ("Пародонт интактен / норма")
 * data-testid="perio-preset-severe-periodontitis-card" (perio-preset-severe-btn, periodontitis_severe_express)
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import React, { useEffect, useId, useState } from "react";
import { HygieneIndicesPanel } from "../hygiene/HygieneIndicesPanel";
import "./perioChart.css";

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
export * from "./chart/PeriodontogramModalView";

import { PerioArchGrid } from "./chart/PerioArchGrid";
import { PerioDiagnosticsPanel } from "./chart/PerioDiagnosticsPanel";
import { PerioExpressBanner } from "./chart/PerioExpressBanner";
import { PerioHelpDrawer } from "./chart/PerioHelpDrawer";
import { PerioKeypadDrawer } from "./chart/PerioKeypadDrawer";
import { PerioMobileTouchCockpit } from "./chart/PerioMobileTouchCockpit";
import { PerioSummaryBar } from "./chart/PerioSummaryBar";
import { PerioToolbar } from "./chart/PerioToolbar";
import { PerioToothInspector } from "./chart/PerioToothInspector";
import { PeriodontogramModalView } from "./chart/PeriodontogramModalView";
import { usePerioChartLogic } from "./chart/usePerioChartLogic";

export interface PeriodontogramChartProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onSave?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly isModal?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> =
	React.memo(
		({
			patientId: _patientId,
			patientName: _patientName,
			organizationId: _organizationId,
			doctorId: _doctorId,
			doctorName,
			visitId,
			initialTeeth,
			onChange,
			onSave,
			onInsertToProtocol,
			readOnly = false,
			compactMode: _compactMode = false,
			initialTier3Expanded = false,
			initialProbeKeyboardEnabled = false,
			initialSelectedTooth,
			isModal = false,
			isOpen,
			onClose,
		}) => {
			const chartContainerId = useId();

			// ESC key handler for zero-friction closing when inside modal mode
			useEffect(() => {
				if (!isModal && isOpen === undefined) return;
				if (isOpen === false) return;

				const handleModalKeyDown = (e: KeyboardEvent) => {
					if (e.key === "Escape" && onClose) {
						onClose();
					}
				};

				window.addEventListener("keydown", handleModalKeyDown);
				return () => window.removeEventListener("keydown", handleModalKeyDown);
			}, [isModal, isOpen, onClose]);

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
				handleApplySeverePeriodontitisPreset:
					_handleApplySeverePeriodontitisPreset,
				handleApplySextantCode,
				handleSetAllIntact,
				handleMarkSelectedToothPathology,
				handleMarkBopOnDeepPockets,
				handleClearPlaque,
				handleApplyTherapistPreset,
				handleInsertToProtocol,
				handleCopyProtocol,
				dynamics,
				syncStatus,
				lastSavedAt,
				handleSaveDraft,
			} = usePerioChartLogic({
				initialTeeth,
				patientId: _patientId,
				visitId,
				initialSelectedTooth,
				onChange,
				onSave,
				onInsertToProtocol,
				readOnly,
				initialTier3Expanded,
				initialProbeKeyboardEnabled,
				doctorName,
			});

			const [viewModeOverride, setViewModeOverride] = useState<
				"auto" | "touch" | "desktop"
			>("auto");

			if (isOpen === false) return null;

			const chartContent = (
				<div
					ref={containerRef}
					id={chartContainerId}
					tabIndex={isProbeKeyboardEnabled ? 0 : -1}
					onKeyDown={handleKeyDown}
					data-testid="interactive-periodontogram"
					className="interactive-periodontogram flex flex-col gap-4 select-none relative focus:outline-none focus:ring-1 focus:ring-teal-500/50 rounded-2xl p-2 sm:p-4 bg-[var(--paper)] border border-[var(--line)] shadow-xs overflow-x-clip max-w-[100vw] w-full"
				>
					{/* Ergonomic Mode Switcher (Doctor Autonomy Mandate 8e & Apple HIG) */}
					<div className="dente-segmented-bar flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full shadow-2xs">
						<div className="grid grid-cols-2 gap-1 w-full sm:w-auto sm:flex sm:items-center">
							{(() => {
								const isTouchActive = viewModeOverride === "touch";
								const isDesktopActive =
									viewModeOverride === "desktop" ||
									viewModeOverride === "auto";
								return (
									<>
										<button
											type="button"
											onClick={() => setViewModeOverride("touch")}
											className={`dente-segmented-item ${isTouchActive ? "active" : ""}`}
											data-testid="perio-mode-touch-btn"
										>
											<span>Сенсорный (Q1–Q4)</span>
										</button>
										<button
											type="button"
											onClick={() => setViewModeOverride("desktop")}
											className={`dente-segmented-item ${isDesktopActive ? "active" : ""}`}
											data-testid="perio-mode-desktop-btn"
										>
											<span>Полная сетка (18–48)</span>
										</button>
									</>
								);
							})()}
						</div>
						<div className="flex items-center justify-between sm:justify-end gap-2 px-1">
							{viewModeOverride !== "auto" && (
								<button
									type="button"
									onClick={() => setViewModeOverride("auto")}
									className="secondary-button text-xs !min-h-[28px] !h-7 !px-2.5"
								>
									Авто
								</button>
							)}
							<span className="text-[12px] text-[var(--muted)] hidden md:inline px-1 truncate">
								{viewModeOverride === "touch"
									? "Сенсорный режим (1–7+ мм, 6 точек на зуб)"
									: "Пародонтологическая карта приёма (32 зуба, 192 точки зондирования)"}
							</span>
						</div>
					</div>

					{/* Touch-First Mobile Cockpit (Apple HIG 390x844 & Florida Probe) */}
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

					{/* Desktop Full-Arch View */}
					<div
						className={`flex-col gap-4 w-full ${
							viewModeOverride === "touch"
								? "hidden"
								: viewModeOverride === "desktop"
									? "flex"
									: "hidden md:flex"
						}`}
					>
						{/* 1-Click Fast Actions Toolbar */}
						<PerioToolbar
							aapDiagnosis={aapDiagnosis}
							readOnly={readOnly}
							selectedToothNumber={selectedToothNumber}
							isHygieneExpanded={isHygieneExpanded}
							insertStatus={insertStatus}
							copyStatus={copyStatus}
							syncStatus={syncStatus}
							lastSavedAt={lastSavedAt}
							onSaveDraft={() => void handleSaveDraft({ closeAfter: false })}
							onApplyExpressPreset={handleApplyExpressPreset}
							onSetAllIntact={handleSetAllIntact}
							onMarkSelectedToothPathology={handleMarkSelectedToothPathology}
							onMarkBopOnDeepPockets={handleMarkBopOnDeepPockets}
							onClearPlaque={handleClearPlaque}
							onToggleHygieneExpanded={() =>
								setIsHygieneExpanded((prev) => !prev)
							}
							onInsertToProtocol={handleInsertToProtocol}
							onCopyProtocol={handleCopyProtocol}
							onToggleHelp={() => setIsHelpOpen((prev) => !prev)}
						/>

						{/* 1-Click PSR Screening & Clinical Presets */}
						<PerioExpressBanner
							readOnly={readOnly}
							isProbeKeyboardEnabled={isProbeKeyboardEnabled}
							onToggleProbeKeyboard={setIsProbeKeyboardEnabled}
							insertStatus={insertStatus}
							onInsertToProtocol={handleInsertToProtocol}
							isTier3ProbingExpanded={isTier3ProbingExpanded}
							onToggleTier3Probing={() =>
								setIsTier3ProbingExpanded((prev) => !prev)
							}
							onApplyExpressPreset={handleApplyExpressPreset}
							onApplyTherapistPreset={handleApplyTherapistPreset}
							psrSummaryText={psrSummaryText}
							psrSextants={psrSextants}
							onApplySextantCode={handleApplySextantCode}
						/>

						{/* Real-time KPI Strip */}
						<PerioSummaryBar
							summary={summary}
							olearyPcr={olearyPcr}
							psrSummaryText={psrSummaryText}
							isDiagnosticsExpanded={isDiagnosticsExpanded}
							onToggleDiagnostics={() =>
								setIsDiagnosticsExpanded((prev) => !prev)
							}
						/>

						{/* Keyboard Shortcuts Help */}
						<PerioHelpDrawer
							isHelpOpen={isHelpOpen}
							onCloseHelp={() => setIsHelpOpen(false)}
						/>

						{/* Tier 3 Keypad Drawer */}
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

						{/* Main Dentition Arch Grid */}
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
								setIsTier3ProbingExpanded(true);
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

						{/* Selected Tooth Inspector */}
						<PerioToothInspector
							selectedTooth={selectedTooth}
							readOnly={readOnly}
							onUpdateToothProperties={updateToothProperties}
							onUpdateToothSite={updateToothSite}
						/>

						{/* WHO PSR Sextants & Diagnostics */}
						<PerioDiagnosticsPanel
							isDiagnosticsExpanded={isDiagnosticsExpanded}
							onCloseDiagnostics={() => setIsDiagnosticsExpanded(false)}
							psrSummaryText={psrSummaryText}
							psrSextants={psrSextants}
							olearyPcr={olearyPcr}
							dynamics={dynamics}
						/>
					</div>

					{/* Hygiene Indices Panel */}
					{isHygieneExpanded && (
						<div className="w-full animate-in fade-in duration-150">
							<HygieneIndicesPanel readOnly={readOnly} />
						</div>
					)}
				</div>
			);

			if (isModal || isOpen === true) {
				return (
					<PeriodontogramModalView
						patientName={_patientName}
						onClose={onClose}
					>
						{chartContent}
					</PeriodontogramModalView>
				);
			}

			return chartContent;
		},
	);

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
