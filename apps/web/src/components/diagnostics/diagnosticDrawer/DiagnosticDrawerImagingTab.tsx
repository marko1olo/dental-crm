import React, { useState } from "react";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { DirectRvgCaptureModal } from "../../radiology/DirectRvgCaptureModal";
import { showToast } from "../../GlobalToast";
import { DiagnosticImagingMetricsGrid } from "./DiagnosticImagingMetricsGrid";
import { DiagnosticImagingSensorsList } from "./DiagnosticImagingSensorsList";

export const DiagnosticDrawerImagingTab: React.FC = () => {
	const [isPhotoOpen, setIsPhotoOpen] = useState(false);
	const [isRvgOpen, setIsRvgOpen] = useState(false);
	const [isCheckingSensors, setIsCheckingSensors] = useState(false);
	const [sensorStatus, setSensorStatus] = useState<string>("Готов к захвату (Auto-Trigger)");

	const handleCheckSensors = () => {
		setIsCheckingSensors(true);
		setTimeout(() => {
			setIsCheckingSensors(false);
			setSensorStatus("Vatech EzSensor Classic — Активен (USB 3.0 / Hot Folder)");
			showToast("Датчики RVG и папка Hot Folder проверены: активно", "success", 3000);
		}, 300);
	};

	return (
		<div className="dente-diagnostic-imaging-tab" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DiagnosticImagingMetricsGrid
				sensorStatus={sensorStatus}
				isCheckingSensors={isCheckingSensors}
				onOpenPhoto={() => setIsPhotoOpen(true)}
				onOpenRvg={() => setIsRvgOpen(true)}
				onCheckSensors={handleCheckSensors}
			/>

			<DiagnosticImagingSensorsList />

			{isPhotoOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={true}
					onClose={() => setIsPhotoOpen(false)}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_patient_diag"
					doctorName="Д-р Воронов Алексей Владимирович"
				/>
			)}

			{isRvgOpen && (
				<DirectRvgCaptureModal
					isOpen={true}
					onClose={() => setIsRvgOpen(false)}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_patient_diag"
					initialToothFdi="16"
					doctorName="Д-р Воронов Алексей Владимирович"
				/>
			)}
		</div>
	);
};

export default DiagnosticDrawerImagingTab;
