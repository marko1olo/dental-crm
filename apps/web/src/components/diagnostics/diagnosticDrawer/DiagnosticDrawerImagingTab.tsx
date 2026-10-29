import React, { useState } from "react";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { DirectRvgCaptureModal } from "../../radiology/DirectRvgCaptureModal";
import { VisiographStudyViewer } from "../../radiology/VisiographStudyViewer";
import { showToast } from "../../GlobalToast";
import { DiagnosticImagingMetricsGrid } from "./DiagnosticImagingMetricsGrid";
import { DiagnosticImagingSensorsList } from "./DiagnosticImagingSensorsList";

export const DiagnosticDrawerImagingTab: React.FC = () => {
	const [isPhotoOpen, setIsPhotoOpen] = useState(false);
	const [isRvgOpen, setIsRvgOpen] = useState(false);
	const [isViewerOpen, setIsViewerOpen] = useState(false);
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
			<div className="flex items-center justify-between pb-1">
				<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
					Радиодиагностика и снимки
				</span>
				<button
					type="button"
					onClick={() => setIsViewerOpen(true)}
					className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs transition-all"
					data-testid="btn-open-study-viewer"
				>
					Открыть 2D просмотрщик
				</button>
			</div>

			<DiagnosticImagingMetricsGrid
				sensorStatus={sensorStatus}
				isCheckingSensors={isCheckingSensors}
				onOpenPhoto={() => setIsPhotoOpen(true)}
				onOpenRvg={() => setIsRvgOpen(true)}
				onCheckSensors={handleCheckSensors}
			/>

			<DiagnosticImagingSensorsList />

			{isViewerOpen && (
				<div
					className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-in fade-in"
					data-testid="modal-visiograph-study-viewer"
				>
					<div className="w-full max-w-4xl h-[620px] max-h-[90vh]">
						<VisiographStudyViewer
							studyTitle="Прицельная радиовизиография"
							patientName="Захаров Иван Дмитриевич"
							initialTooth="16"
							modality="rvg"
							onClose={() => setIsViewerOpen(false)}
							onSaveToVisit={() => {
								showToast("Снимок и доза 0.02 мЗв сохранены в дневник приёма", "success", 3000);
								setIsViewerOpen(false);
							}}
						/>
					</div>
				</div>
			)}

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
