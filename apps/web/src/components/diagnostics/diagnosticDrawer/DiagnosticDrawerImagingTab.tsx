import React, { useState } from "react";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { DirectRvgCaptureModal } from "../../radiology/DirectRvgCaptureModal";
import { VisiographStudyViewer } from "../../radiology/VisiographStudyViewer";
import { showToast } from "../../GlobalToast";
import { detectConnectedSensors } from "../../radiology/sensorGateway/hardwareDetection";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import { DiagnosticImagingMetricsGrid } from "./DiagnosticImagingMetricsGrid";
import { DiagnosticImagingSensorsList } from "./DiagnosticImagingSensorsList";

export const DiagnosticDrawerImagingTab: React.FC = () => {
	const [isPhotoOpen, setIsPhotoOpen] = useState(false);
	const [isRvgOpen, setIsRvgOpen] = useState(false);
	const [isViewerOpen, setIsViewerOpen] = useState(false);
	const [isCheckingSensors, setIsCheckingSensors] = useState(false);
	const [sensorStatus, setSensorStatus] = useState<string>("Готов к захвату (Auto-Trigger)");

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);

	const patientName = patientCoreDraft.fullName?.trim() || (selectedPatientId ? `Пациент #${selectedPatientId}` : "Пациент не выбран");
	const patientId = selectedPatientId || undefined;
	const activeTooth = activeToothNumber ? String(activeToothNumber) : undefined;

	const handleCheckSensors = async () => {
		setIsCheckingSensors(true);
		try {
			const res = await detectConnectedSensors();
			setIsCheckingSensors(false);
			if (res.isDetected) {
				setSensorStatus(`${res.sensorModelName} — Активен (${res.calibratedResolution})`);
				showToast(`Обнаружен датчик: ${res.sensorModelName}`, "success", 3000);
			} else {
				setSensorStatus("Датчик не обнаружен (USB / Hot Folder)");
				showToast("Аппаратный датчик визиографа не обнаружен", "info", 3000);
			}
		} catch {
			setIsCheckingSensors(false);
			setSensorStatus("Датчик не обнаружен");
			showToast("Ошибка опроса оборудования", "warning", 3000);
		}
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
							patientName={patientName}
							patientId={patientId}
							initialTooth={activeTooth || "11"}
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
					patientName={patientName}
					patientId={patientId || "pat_walkin"}
					doctorName="Лечащий врач"
				/>
			)}

			{isRvgOpen && (
				<DirectRvgCaptureModal
					isOpen={true}
					onClose={() => setIsRvgOpen(false)}
					patientName={patientName}
					patientId={patientId || "pat_walkin"}
					initialToothFdi={activeTooth}
					doctorName="Лечащий врач"
				/>
			)}
		</div>
	);
};

export default DiagnosticDrawerImagingTab;
