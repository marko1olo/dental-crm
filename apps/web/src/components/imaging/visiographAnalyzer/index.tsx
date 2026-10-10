import React from "react";
import {
	demoScanButtonStyle,
	visiographContainerStyle,
} from "../VisiographAnalyzerStyles.js";
import { VisiographHeaderBar } from "../VisiographHeaderBar.js";
import { VisiographDropzone } from "../VisiographDropzone.js";
import { VisiographStatusAlerts } from "../VisiographStatusAlerts.js";
import { VisiographHistoryDrawer, type XrayHistoryItem } from "../VisiographHistoryDrawer.js";
import { SensorStudyViewer } from "../../radiology/SensorStudyViewer.js";
import { printAiScanReport } from "../VisiographPrint.js";
import type { XrayScan } from "../VisiographScanHelpers.js";

import type { VisiographAnalyzerProps } from "./types.js";
import { useVisiographAnalyzer } from "./useVisiographAnalyzer.js";
import { VisiographToolbarControls } from "./VisiographToolbarControls.js";
import { VisiographCanvasViewport } from "./VisiographCanvasViewport.js";
import { VisiographMeasurementPanel } from "./VisiographMeasurementPanel.js";

export type { XrayScan };
export * from "./types.js";
export * from "./useVisiographAnalyzer.js";
export * from "./VisiographToolbarControls.js";
export * from "./VisiographCanvasViewport.js";
export * from "./VisiographMeasurementPanel.js";

export function VisiographAnalyzer(props: VisiographAnalyzerProps = {}) {
	const {
		onInsertToProtocol,
		toothCode,
		onConnectRvg,
		onUploadDicom,
		onReferToRadiology,
	} = props;

	const {
		fileInputRef,
		dropRef,
		effectivePatientId,
		patientFullName,
		isSensorViewerOpen,
		setIsSensorViewerOpen,
		isDragOver,
		setIsDragOver,
		isAnalyzing,
		isSaving,
		currentImageUrl,
		currentScan,
		saveFailure,
		appliedToothCodes,
		applyNotice,
		formulaFailure,
		selectedFindingCodes,
		setSelectedFindingCodes,
		isApplyingToChart,
		isHistoryView,
		error,
		setError,
		isStudioMode,
		setIsStudioMode,
		quickPreset,
		setQuickPreset,
		initialStudioTool,
		setInitialStudioTool,
		isNormaApplied,
		scanHistory,
		isLoadingHistory,
		historyFailure,
		deletingScanId,
		deleteFailure,
		openFailure,
		setOpenFailure,
		loadHistory,
		loadHistoryScan,
		deleteScan,
		filmstripItems,
		handleSelectFilmstripStudy,
		handleDoubleClickFilmstripStudy,
		handleLoadDemoScan,
		processFile,
		handleRunAiAnalysis,
		handleApplyFindingsToChart,
		handleApplyNormaTo043,
		handleInsertReportToProtocol,
		handleDrop,
		handleClear,
		toothStatesArray,
		criticalCount,
		historyPhase,
		calibration,
		workingLengthMm,
		handleMeasureWorkingLength,
	} = useVisiographAnalyzer(props);

	return (
		<div
			className="visiograph-analyzer-container"
			data-testid="visiograph-analyzer-container"
			style={visiographContainerStyle}
		>
			<VisiographHeaderBar
				scanHistoryCount={scanHistory.length}
				isLoadingHistory={isLoadingHistory}
				criticalCount={criticalCount}
				historyFailure={historyFailure}
				hasAiReport={Boolean(currentScan?.aiReport)}
				onUploadClick={() => fileInputRef.current?.click()}
				onPrintClick={() => currentScan && printAiScanReport(currentScan)}
				onClearClick={handleClear}
				currentImage={currentImageUrl}
				activeScan={currentScan}
				hasActiveScan={Boolean(currentScan || currentImageUrl)}
			/>

			<div style={{ padding: "6px 8px" }}>
				<input
					type="file"
					accept="image/*"
					ref={fileInputRef}
					style={{ display: "none" }}
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) processFile(f);
					}}
				/>

				{/* Drop Zone */}
				{!currentScan && (
					<VisiographDropzone
						dropRef={dropRef}
						fileInputRef={fileInputRef}
						isDragOver={isDragOver}
						setIsDragOver={setIsDragOver}
						isAnalyzing={isAnalyzing}
						onDrop={handleDrop}
						onConnectRvg={onConnectRvg}
						onUploadDicom={onUploadDicom}
						onReferToRadiology={onReferToRadiology}
						toothCode={toothCode}
						effectivePatientId={effectivePatientId}
						demoScanButton={
							<span
								role="button"
								tabIndex={0}
								data-testid="btn-load-demo-scan"
								onClick={(e) => {
									e.stopPropagation();
									handleLoadDemoScan();
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.stopPropagation();
										handleLoadDemoScan();
									}
								}}
								style={demoScanButtonStyle}
							>
								Показать демо-снимок
							</span>
						}
					/>
				)}

				{/* Alerts */}
				<VisiographStatusAlerts
					error={error}
					onClearError={() => setError(null)}
					openFailure={openFailure}
					onClearOpenFailure={() => setOpenFailure(null)}
					saveFailure={saveFailure}
					formulaFailure={formulaFailure}
					applyNotice={applyNotice}
					hasCurrentScan={Boolean(currentScan)}
				/>

				{/* Result View */}
				{currentScan && (
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						{currentImageUrl && (
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								<VisiographToolbarControls
									quickPreset={quickPreset}
									setQuickPreset={setQuickPreset}
									isStudioMode={isStudioMode}
									onToggleStudio={() => setIsStudioMode((prev) => !prev)}
									onOpenApexRuler={() => {
										setInitialStudioTool("root_canal");
										setIsStudioMode(true);
									}}
									isNormaApplied={isNormaApplied}
									onApplyNormaTo043={handleApplyNormaTo043}
									isAnalyzing={isAnalyzing}
									onRunAiAnalysis={handleRunAiAnalysis}
									hasAiReport={Boolean(currentScan.aiReport)}
									onOpenSensorViewer={() => setIsSensorViewerOpen(true)}
								/>

								<VisiographCanvasViewport
									isStudioMode={isStudioMode}
									currentImageUrl={currentImageUrl}
									effectivePatientId={effectivePatientId}
									currentScan={currentScan}
									initialStudioTool={initialStudioTool}
									quickPreset={quickPreset}
									onCloseStudio={() => setIsStudioMode(false)}
									filmstripItems={filmstripItems}
									onSelectStudy={handleSelectFilmstripStudy}
									onDoubleClickStudy={handleDoubleClickFilmstripStudy}
									isSaving={isSaving}
								/>
							</div>
						)}

						<VisiographMeasurementPanel
							toothStatesArray={toothStatesArray}
							appliedToothCodes={appliedToothCodes}
							isHistoryView={isHistoryView}
							selectedFindingCodes={selectedFindingCodes}
							onToggleFindingCode={(code) => {
								const next = new Set(selectedFindingCodes);
								if (next.has(code)) next.delete(code);
								else next.add(code);
								setSelectedFindingCodes(next);
							}}
							onToggleSelectAll={() => {
								const allCodes = toothStatesArray.map((t) => t.code);
								if (selectedFindingCodes.size === allCodes.length) {
									setSelectedFindingCodes(new Set());
								} else {
									setSelectedFindingCodes(new Set(allCodes));
								}
							}}
							isApplyingToChart={isApplyingToChart}
							onApplyFindingsToChart={handleApplyFindingsToChart}
							aiReport={currentScan?.aiReport}
							capturedAt={currentScan?.capturedAt}
							onInsertReportToProtocol={handleInsertReportToProtocol}
							currentScan={currentScan}
							deletingScanId={deletingScanId}
							onClear={handleClear}
							onDeleteScan={(s) => void deleteScan(s)}
							toothCode={toothCode}
							calibration={calibration}
							workingLengthMm={workingLengthMm}
							onMeasureWorkingLength={handleMeasureWorkingLength}
						/>
					</div>
				)}

				{/* History Drawer */}
				<VisiographHistoryDrawer
					scanHistory={scanHistory as XrayHistoryItem[]}
					isLoadingHistory={isLoadingHistory}
					historyFailure={historyFailure}
					historyPhase={historyPhase}
					effectivePatientId={effectivePatientId}
					onLoadHistoryScan={(s) => void loadHistoryScan(s as XrayScan)}
					onDeleteScan={(s) => void deleteScan(s as XrayScan)}
					deletingScanId={deletingScanId}
					deleteFailure={deleteFailure}
					onRetry={() => effectivePatientId && loadHistory(effectivePatientId)}
				/>
			</div>

			{/* EzDent-i 2D Fullscreen Sensor Modal Viewer (Screenshot 24) */}
			{isSensorViewerOpen && (
				<div className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col">
					<SensorStudyViewer
						initialImageUrl={currentImageUrl || undefined}
						studiesHistory={filmstripItems}
						study={
							filmstripItems.find((s) => s.id === currentScan?.id) ||
							filmstripItems[0]
						}
						patientName={patientFullName}
						medicalCardNumber={effectivePatientId || undefined}
						toothFdiCode={currentScan?.toothCode || toothCode || "16"}
						onInsertToProtocol={onInsertToProtocol}
						onClose={() => setIsSensorViewerOpen(false)}
					/>
				</div>
			)}
		</div>
	);
}
