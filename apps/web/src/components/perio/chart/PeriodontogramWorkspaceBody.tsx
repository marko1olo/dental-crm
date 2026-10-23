/**
 * PeriodontogramWorkspaceBody.tsx — Интерактивное рабочее тело пародонтограммы (сенсорный и десктопный слои).
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { PeriodontogramDesktopView } from "./PeriodontogramDesktopView";
import { PerioMobileTouchCockpit } from "./PerioMobileTouchCockpit";
import { PerioModeSwitcher } from "./PerioModeSwitcher";
import type { usePerioChartLogic } from "./usePerioChartLogic";

export interface PeriodontogramWorkspaceBodyProps {
	readonly chartContainerId: string;
	readonly logic: ReturnType<typeof usePerioChartLogic>;
	readonly viewModeOverride: "auto" | "touch" | "desktop";
	readonly setViewModeOverride: (mode: "auto" | "touch" | "desktop") => void;
	readonly readOnly?: boolean | undefined;
}

export const PeriodontogramWorkspaceBody: React.FC<PeriodontogramWorkspaceBodyProps> = React.memo(({
	chartContainerId, logic, viewModeOverride, setViewModeOverride, readOnly = false,
}) => {
	const {
		containerRef, isProbeKeyboardEnabled, handleKeyDown,
		toothMap, selectedToothNumber, setSelectedToothNumber,
		focusedSite, setFocusedSite, setIsProbeKeyboardEnabled,
		handleKeypadDepth, handleKeypadToggleBop, handleKeypadTogglePlaque,
		handleKeypadToggleSuppuration, moveToPreviousSite, moveToNextSite,
		handleCycleMobility, handleCycleFurcation, updateToothSite,
		updateToothProperties, summary, aapDiagnosis, handleApplyExpressPreset,
		handleSetAllIntact, handleInsertToProtocol, insertStatus,
	} = logic;

	return (
		<div
			ref={containerRef}
			id={chartContainerId}
			tabIndex={isProbeKeyboardEnabled ? 0 : -1}
			onKeyDown={handleKeyDown}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-4 select-none relative focus:outline-none focus:ring-1 focus:ring-teal-500/50 rounded-2xl p-2 sm:p-4 bg-[var(--paper)] border border-[var(--line)] shadow-xs overflow-x-clip max-w-[100vw] w-full"
		>
			<PerioModeSwitcher viewModeOverride={viewModeOverride} setViewModeOverride={setViewModeOverride} />

			{/* Touch-First Mobile Cockpit (Apple HIG 390x844) */}
			<div className={viewModeOverride === "desktop" ? "hidden" : viewModeOverride === "touch" ? "block w-full" : "block md:hidden w-full"}>
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
			<div className={`flex-col gap-4 w-full ${viewModeOverride === "touch" ? "hidden" : viewModeOverride === "desktop" ? "flex" : "hidden md:flex"}`}>
				<PeriodontogramDesktopView logic={logic} readOnly={readOnly} />
			</div>
		</div>
	);
});

PeriodontogramWorkspaceBody.displayName = "PeriodontogramWorkspaceBody";
