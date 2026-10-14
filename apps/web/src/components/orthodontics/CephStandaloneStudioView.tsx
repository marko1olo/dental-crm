/**
 * DENTE CRM — Standalone Cephalometric TRG Studio (Pop-out Window / Dual Monitor Cockpit)
 *
 * Layer 5: Canonical Facade & Orchestrator (< 250 lines)
 * Decomposed via /decomposer standard into modular DAG:
 * - cephStudioTypes.ts (Layer 0)
 * - useCephStudioLogic.ts (Layer 3)
 * - CephStudioHeader.tsx (Layer 4)
 * - CephCanvasOverlay.tsx (Layer 4)
 * - CephMeasurementsSidebar.tsx (Layer 4)
 */

import React from "react";
import {
	CephStudioHeader,
} from "./cephStudioModules/CephStudioHeader";
import {
	CephCanvasOverlay,
} from "./cephStudioModules/CephCanvasOverlay";
import {
	CephMeasurementsSidebar,
} from "./cephStudioModules/CephMeasurementsSidebar";
import {
	useCephStudioLogic,
} from "./cephStudioModules/useCephStudioLogic";
import type {
	CephStandaloneStudioViewProps,
} from "./cephStudioModules/cephStudioTypes";

export type { CephStandaloneStudioViewProps } from "./cephStudioModules/cephStudioTypes";
export type * from "./cephStudioModules/cephStudioTypes";

export function CephStandaloneStudioView(props: CephStandaloneStudioViewProps) {
	const logic = useCephStudioLogic(props);

	return (
		<div
			className={`fixed inset-0 z-50 flex flex-col font-sans select-none overflow-hidden ${
				logic.theme === "light" ? "bg-slate-100 text-slate-800" : "bg-slate-950 text-slate-100"
			}`}
			data-testid="ceph-standalone-studio"
			data-theme={logic.theme}
		>
			<CephStudioHeader
				patientId={logic.patientId}
				patientName={logic.patientName}
				theme={logic.theme}
				isPatientDemoMode={logic.isPatientDemoMode}
				isFullscreen={logic.isFullscreen}
				analysis={logic.analysis}
				torqueRecommendation={logic.torqueRecommendation}
				onCloseWindow={logic.handleCloseWindow}
				onToggleDemoMode={logic.toggleDemoMode}
				onInsertToChart={logic.handleInsertToChart}
				onToggleTheme={logic.toggleTheme}
				onToggleFullscreen={logic.toggleFullscreen}
			/>

			<div className="flex-1 flex overflow-hidden">
				<CephCanvasOverlay
					imageUrl={logic.imageUrl}
					landmarks={logic.landmarks}
					showPlanes={logic.showPlanes}
					showPolygon={logic.showPolygon}
					showLabels={logic.showLabels}
					activeTargetKey={logic.activeTargetKey}
					scaleMmPerPixel={logic.scaleMmPerPixel}
					filterMode={logic.filterMode}
					brightness={logic.brightness}
					contrast={logic.contrast}
					theme={logic.theme}
					onFilterModeChange={logic.setFilterMode}
					onLandmarkChange={logic.handleLandmarkChange}
					onRemoveLandmark={logic.handleRemoveLandmark}
					onSelectTargetKey={logic.setActiveTargetKey}
					onImageUpload={(url) => logic.setImageUrl(url)}
					onScaleChange={(scale) => logic.setScaleMmPerPixel(scale)}
					onTogglePlanes={() => logic.setShowPlanes((p) => !p)}
					onTogglePolygon={() => logic.setShowPolygon((p) => !p)}
					onToggleLabels={() => logic.setShowLabels((p) => !p)}
					onApplyPreset={logic.handleApplyPreset}
				/>

				<CephMeasurementsSidebar
					theme={logic.theme}
					isPatientDemoMode={logic.isPatientDemoMode}
					activeTab={logic.activeTab}
					onTabChange={logic.setActiveTab}
					analysis={logic.analysis}
					landmarks={logic.landmarks}
					activeTargetKey={logic.activeTargetKey}
					onSelectTargetKey={logic.setActiveTargetKey}
					copiedProtocol={logic.copiedProtocol}
					onCopyProtocol={logic.handleCopyProtocol}
					onInsertToChart={logic.handleInsertToChart}
				/>
			</div>
		</div>
	);
}

export default CephStandaloneStudioView;
