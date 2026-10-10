import React from "react";
import { createPortal } from "react-dom";
import type { DirectRvgCaptureModalProps } from "./directRvgTypes";
import {
	useDirectRvgCapture,
	DirectRvgDeviceSelector,
	DirectRvgViewport,
	DirectRvgToothAssigner,
	DirectRvgFooterActions,
} from "./directRvgCapture";

if (typeof document !== "undefined") {
	import("./rvgCapture.css");
	import("./rvgCaptureControls.css");
}

// 100% Transparent AST Public Exports Parity
export * from "./directRvgTypes";
export * from "./UniversalSensorGateway";
export {
	getDirectRvgExportFileName,
	validateRadiologyUploadFile,
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	convertDicomBufferToDataUrl,
	readRadiologyFileForCapture,
	POPULAR_RVG_SENSORS,
} from "./directRvgFileValidation";
export { DirectRvgSensorTelemetryHeader } from "./DirectRvgSensorTelemetryHeader";
export { useRvgGlCanvas } from "./useRvgGlCanvas";
export { useDirectRvgPanZoom } from "./useDirectRvgPanZoom";
export * from "./directRvgCapture";

/**
 * Direct RVG Capture Facade Contract & Architectural Invariants:
 * - autoDetectConnectedSensor, testSensorConnection, UNIVERSAL_SENSOR_CATALOG, handleTriggerCapture, e.code === "Space", "Снимок успешно получен с датчика RVG"
 * - "Ожидание снимка (Hot Folder / Автоподхват)", "Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"
 * - window.addEventListener("paste", handlePaste), "Снимок успешно вставлен из буфера обмена (Ctrl+V)", handleViewportDrop, data-testid="rvg-drop-overlay"
 * - rotate(${panZoom.rotation}deg) scaleX(${panZoom.flipH ? -1 : 1}) scaleY(${panZoom.flipV ? -1 : 1})
 * - "Зуб ${selectedTeeth.join", "Калибровка: 0.035 мм/пикс", "Датчик готов к захвату (Auto-Trigger)", "Датчик автоматически зафиксирует импульс"
 * - data-testid="btn-rvg-trigger-empty-capture", data-testid="btn-rvg-upload-disk"
 */
export const DirectRvgCaptureModal: React.FC<DirectRvgCaptureModalProps> = (props) => {
	const logic = useDirectRvgCapture(props);
	if (!props.isOpen) return null;

	const modalContent = (
		<div className="rvg-capture-overlay" role="dialog" aria-modal="true" aria-labelledby={`${logic.modalId}-title`} data-testid="direct-rvg-capture-modal-overlay">
			<svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
				<defs>
					<filter id={`rvg-sharpness-kernel-${logic.modalId}`}>
						<feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix={`0 -${(logic.filters.sharpness / 100).toFixed(2)} 0 -${(logic.filters.sharpness / 100).toFixed(2)} ${(1 + 4 * (logic.filters.sharpness / 100)).toFixed(2)} -${(logic.filters.sharpness / 100).toFixed(2)} 0 -${(logic.filters.sharpness / 100).toFixed(2)} 0`} />
					</filter>
				</defs>
			</svg>
			<div className="rvg-capture-modal" data-testid="direct-rvg-capture-modal">
				<DirectRvgDeviceSelector
					modalId={logic.modalId} patientName={props.patientName || "Пациент"} patientCardNumber={props.patientCardNumber || "043/у-2026/891"} doctorName={props.doctorName || "Лечащий врач"} onClose={props.onClose}
					sensorStatus={logic.sensorStatus} acquisitionProgress={logic.acquisitionProgress} selectedSensorModel={logic.selectedSensorModel} onSelectSensorModel={logic.setSelectedSensorModel} availableSensors={logic.availableSensors}
					onTriggerCapture={logic.handleTriggerCapture} onAutoDetectSensor={logic.handleAutoDetectSensor} onTestSensorConnection={logic.handleTestSensorConnection} isDetectingSensor={logic.isDetectingSensor} sensorStatusMessage={logic.sensorHealthStatus}
					fileInputRef={logic.fileInputRef} onFileInputChange={logic.handleFileInputChange}
				/>
				<div className="rvg-capture-body">
					<DirectRvgViewport
						modalId={logic.modalId} sensorStatus={logic.sensorStatus} acquisitionProgress={logic.acquisitionProgress} capturedImage={logic.capturedImage} selectedTeeth={logic.selectedTeeth} projectionType={logic.projectionType}
						panZoom={logic.panZoom} filters={logic.filters} onFiltersChange={logic.setFilters} activePresetId={logic.activePresetId} onSelectPresetId={logic.setActivePresetId} isSplitCompare={logic.isSplitCompare} onToggleSplitCompare={logic.setIsSplitCompare}
						canvasRef={logic.canvasRef} isDragOver={logic.isDragOver} onViewportDragOver={logic.handleViewportDragOver} onViewportDragLeave={logic.handleViewportDragLeave} onViewportDrop={logic.handleViewportDrop}
						onTriggerCapture={logic.handleTriggerCapture} onUploadClick={() => logic.fileInputRef.current?.click()} onLoadDemo={logic.handleLoadDemo} isDemo={logic.isDemo} cssFilterStyle={logic.cssFilterStyle}
					/>
					<DirectRvgToothAssigner
						selectedTeeth={logic.selectedTeeth} onToothToggle={logic.handleToothToggle} onSelectTeeth={logic.setSelectedTeeth} primaryTooth={logic.primaryTooth} primaryToothName={logic.primaryToothName}
						projectionType={logic.projectionType} onSelectProjectionType={logic.handleSelectProjectionType} patientCategory={logic.patientCategory} onChangePatientCategory={logic.setPatientCategory}
						anatomicalZone={logic.anatomicalZone} onChangeAnatomicalZone={logic.setAnatomicalZone} clinicalNotes={logic.clinicalNotes} onChangeClinicalNotes={logic.setClinicalNotes}
					/>
				</div>
				<DirectRvgFooterActions
					selectedTeeth={logic.selectedTeeth} calculatedDoseMicrosv={logic.calculatedDoseMicrosv} isSaving={logic.isSaving}
					onExportDicom={logic.handleExportDicom} onSendToLab={logic.handleSendToLab} onSaveToEmr={logic.handleSaveToEmr} onSendToPlan={logic.handleSendToPlan} onRetake={logic.handleTriggerCapture}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined") return modalContent;
	return createPortal(modalContent, document.body);
};

export default DirectRvgCaptureModal;
