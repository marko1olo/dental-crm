import React from "react";
import { showToast } from "../../GlobalToast";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";
import { CephalometricReportTab, CephalometricLandmarksList } from "./CephalometricReportTab";
import { CephMeasurementTable } from "./CephMeasurementTable";
import { CephTab1TopControls, CephTab1BottomActions } from "./CephAnalysisControls";
import { CephModalSidebarTabsNav } from "./CephModalSidebarTabsNav";
import type { CephModalRightSidebarProps } from "./cephRightSidebarTypes";

export const CephModalRightSidebar: React.FC<CephModalRightSidebarProps> = ({
	activeTab,
	setActiveTab,
	mobileView,
	setMobileView,
	isImageLoaded,
	analysis,
	landmarks,
	activeTargetKey,
	setActiveTargetKey,
	aiBackendBadge,
	aiStats,
	aiBackendPref,
	setAiBackendPref,
	detectedBackend,
	onRunAiAutoPlacement,
	isAiInferring,
	placedPercent,
	isAllPlaced,
	onApplyPreset,
	onResetLandmarks,
	onSaveConsultationWithoutCeph,
	onInsertToChart,
	onCopyText,
	copied,
	currentEffectiveProtocolText,
}) => {
	return (
		<div
			className={`lg:col-span-5 flex-col bg-[var(--paper)] border-l border-[var(--line)] text-[var(--ink)] overflow-hidden ${mobileView !== "canvas" ? "flex flex-1" : "hidden lg:flex"}`}
		>
			<CephModalSidebarTabsNav
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				setMobileView={setMobileView}
				isImageLoaded={isImageLoaded}
				analysis={analysis}
			/>

			{activeTab === "landmarks" && (
				<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden">
					<CephTab1TopControls
						landmarks={landmarks}
						analysis={analysis}
						isImageLoaded={isImageLoaded}
						activeTargetKey={activeTargetKey}
						setActiveTargetKey={setActiveTargetKey}
						aiBackendBadge={aiBackendBadge}
						aiStats={aiStats}
						aiBackendPref={aiBackendPref}
						setAiBackendPref={setAiBackendPref}
						detectedBackend={detectedBackend}
						onRunAiAutoPlacement={onRunAiAutoPlacement}
						isAiInferring={isAiInferring}
						placedPercent={placedPercent}
						isAllPlaced={isAllPlaced}
						onApplyPreset={onApplyPreset}
						onResetLandmarks={onResetLandmarks}
						onNavigateToMetrics={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
					/>

					<CephalometricLandmarksList
						landmarks={landmarks}
						isImageLoaded={isImageLoaded}
						activeTargetKey={activeTargetKey}
						onSelectLandmark={(key) => {
							if (!isImageLoaded) { showToast("Сначала загрузите снимок ТРГ", "warning"); return; }
							setActiveTargetKey(key);
							setMobileView("canvas");
							showToast(`Укажите точку «${CEPHALOMETRIC_LANDMARKS.find((l) => l.key === key)?.nameRu}» на снимке`, "info");
						}}
					/>

					<CephTab1BottomActions
						onSaveConsultationWithoutCeph={onSaveConsultationWithoutCeph}
						onNavigateToMetrics={() => { setActiveTab("metrics"); setMobileView("metrics"); }}
					/>
				</div>
			)}

			{activeTab === "metrics" && (
				<CephMeasurementTable
					analysis={analysis}
					landmarks={landmarks}
					onApplyPreset={onApplyPreset}
					onResetLandmarks={onResetLandmarks}
					onNavigateToReport={() => { setActiveTab("report"); setMobileView("report"); }}
				/>
			)}

			{activeTab === "report" && (
				<CephalometricReportTab
					currentEffectiveProtocolText={currentEffectiveProtocolText}
					onInsertToChart={onInsertToChart}
					onSaveConsultationWithoutCeph={onSaveConsultationWithoutCeph}
					onCopyText={onCopyText}
					copied={copied}
				/>
			)}
		</div>
	);
};
export type { CephModalRightSidebarProps } from "./cephRightSidebarTypes";
