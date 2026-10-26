import React from "react";
import { demoScanButtonStyle, visiographContainerStyle } from "../VisiographAnalyzerStyles.js";
import { VisiographHeaderBar } from "../VisiographHeaderBar.js";
import { VisiographDropzone } from "../VisiographDropzone.js";
import { VisiographStatusAlerts } from "../VisiographStatusAlerts.js";
import { VisiographHistoryDrawer, type XrayHistoryItem } from "../VisiographHistoryDrawer.js";
import { printAiScanReport } from "../VisiographPrint.js";
import type { XrayScan } from "../VisiographScanHelpers.js";
import type { VisiographAnalyzerProps } from "./types.js";
import { useVisiographAnalyzer } from "./useVisiographAnalyzer.js";
import { VisiographActiveScanView } from "./VisiographActiveScanView.js";
import { VisiographSensorModal } from "./VisiographSensorModal.js";

export type { XrayScan };
export * from "./types.js";
export * from "./useVisiographAnalyzer.js";
export * from "./VisiographToolbarControls.js";
export * from "./VisiographCanvasViewport.js";
export * from "./VisiographMeasurementPanel.js";

export function VisiographAnalyzer(props: VisiographAnalyzerProps = {}) {
	const { onInsertToProtocol, toothCode, onConnectRvg, onUploadDicom, onReferToRadiology } = props;
	const a = useVisiographAnalyzer(props);

	return (
		<div className="visiograph-analyzer-container" data-testid="visiograph-analyzer-container" style={visiographContainerStyle}>
			<VisiographHeaderBar
				scanHistoryCount={a.scanHistory.length}
				isLoadingHistory={a.isLoadingHistory}
				criticalCount={a.criticalCount}
				historyFailure={a.historyFailure}
				hasAiReport={Boolean(a.currentScan?.aiReport)}
				onUploadClick={() => a.fileInputRef.current?.click()}
				onPrintClick={() => a.currentScan && printAiScanReport(a.currentScan)}
				onClearClick={a.handleClear}
				currentImage={a.currentImageUrl}
				activeScan={a.currentScan}
				hasActiveScan={Boolean(a.currentScan || a.currentImageUrl)}
			/>
			<div style={{ padding: "6px 8px" }}>
				<input
					type="file"
					accept="image/*"
					ref={a.fileInputRef}
					style={{ display: "none" }}
					onChange={(e) => { const f = e.target.files?.[0]; if (f) a.processFile(f); }}
				/>
				{!a.currentScan && (
					<VisiographDropzone
						dropRef={a.dropRef}
						fileInputRef={a.fileInputRef}
						isDragOver={a.isDragOver}
						setIsDragOver={a.setIsDragOver}
						isAnalyzing={a.isAnalyzing}
						onDrop={a.handleDrop}
						onConnectRvg={onConnectRvg}
						onUploadDicom={onUploadDicom}
						onReferToRadiology={onReferToRadiology}
						toothCode={toothCode}
						effectivePatientId={a.effectivePatientId}
						demoScanButton={
							<span
								role="button"
								tabIndex={0}
								data-testid="btn-load-demo-scan"
								onClick={(e) => { e.stopPropagation(); a.handleLoadDemoScan(); }}
								onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); a.handleLoadDemoScan(); } }}
								style={demoScanButtonStyle}
							>
								Показать демо-снимок
							</span>
						}
					/>
				)}
				<VisiographStatusAlerts
					error={a.error}
					onClearError={() => a.setError(null)}
					openFailure={a.openFailure}
					onClearOpenFailure={() => a.setOpenFailure(null)}
					saveFailure={a.saveFailure}
					formulaFailure={a.formulaFailure}
					applyNotice={a.applyNotice}
					hasCurrentScan={Boolean(a.currentScan)}
				/>
				{a.currentScan && (
					<VisiographActiveScanView analyzer={a} toothCode={toothCode} onInsertToProtocol={onInsertToProtocol} />
				)}
				<VisiographHistoryDrawer
					scanHistory={a.scanHistory as XrayHistoryItem[]}
					isLoadingHistory={a.isLoadingHistory}
					historyFailure={a.historyFailure}
					historyPhase={a.historyPhase}
					effectivePatientId={a.effectivePatientId}
					onLoadHistoryScan={(s) => void a.loadHistoryScan(s as XrayScan)}
					onDeleteScan={(s) => void a.deleteScan(s as XrayScan)}
					deletingScanId={a.deletingScanId}
					deleteFailure={a.deleteFailure}
					onRetry={() => a.effectivePatientId && a.loadHistory(a.effectivePatientId)}
				/>
			</div>
			<VisiographSensorModal
				isOpen={a.isSensorViewerOpen}
				onClose={() => a.setIsSensorViewerOpen(false)}
				currentImageUrl={a.currentImageUrl}
				filmstripItems={a.filmstripItems}
				currentScanId={a.currentScan?.id}
				patientFullName={a.patientFullName}
				effectivePatientId={a.effectivePatientId}
				toothFdiCode={a.currentScan?.toothCode || toothCode || undefined}
				onInsertToProtocol={onInsertToProtocol}
			/>
		</div>
	);
}
