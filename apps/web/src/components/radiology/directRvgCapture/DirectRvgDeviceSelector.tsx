import React from "react";
import { UploadCloud } from "lucide-react";
import { DirectRvgSensorTelemetryHeader } from "../DirectRvgSensorTelemetryHeader";
import type { DirectRvgDeviceSelectorProps } from "./types";

export const DirectRvgDeviceSelector: React.FC<DirectRvgDeviceSelectorProps> = ({
	modalId,
	patientName,
	patientCardNumber,
	doctorName,
	onClose,
	sensorStatus,
	acquisitionProgress,
	selectedSensorModel,
	onSelectSensorModel,
	availableSensors,
	onTriggerCapture,
	onAutoDetectSensor,
	onTestSensorConnection,
	isDetectingSensor,
	sensorStatusMessage,
	fileInputRef,
	onFileInputChange,
}) => {
	const uploadActionSlot = (
		<>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className="rvg-trigger-btn rvg-trigger-btn-secondary"
				data-testid="rvg-upload-file-btn"
				title="Загрузить снимок с диска (DICOM, TIFF, PNG, JPG)"
			>
				<UploadCloud className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
				<span>Загрузить</span>
			</button>
			<input
				ref={fileInputRef}
				type="file"
				accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"
				className="hidden"
				onChange={onFileInputChange}
				data-testid="rvg-file-input"
			/>
		</>
	);

	return (
		<DirectRvgSensorTelemetryHeader
			modalId={modalId}
			patientName={patientName}
			patientCardNumber={patientCardNumber}
			doctorName={doctorName}
			onClose={onClose}
			sensorStatus={sensorStatus}
			acquisitionProgress={acquisitionProgress}
			selectedSensorModel={selectedSensorModel}
			onSelectSensorModel={onSelectSensorModel}
			availableSensors={availableSensors}
			onTriggerCapture={onTriggerCapture}
			onAutoDetectSensor={onAutoDetectSensor}
			onTestSensorConnection={onTestSensorConnection}
			isDetectingSensor={isDetectingSensor}
			sensorStatusMessage={sensorStatusMessage}
			uploadAction={uploadActionSlot}
		/>
	);
};

export default DirectRvgDeviceSelector;
