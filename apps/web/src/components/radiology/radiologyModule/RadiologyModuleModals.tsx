import React from "react";
import { createPortal } from "react-dom";
import { DicomViewerModal } from "../../imaging/DicomViewerModal.js";
import { SensorStudyViewer } from "../SensorStudyViewer.js";
import { RadiologyConsultationSplit } from "../RadiologyConsultationSplit.js";
import { CbctMprImplantStudioModal } from "../CbctMprImplantStudioModal.js";
import { CbctImplantModal } from "../CbctImplantModal.js";
import { DirectRvgCaptureModal } from "../DirectRvgCaptureModal.js";
import { RadiationSafetyRegistryModal } from "../RadiationSafetyRegistryModal.js";
import { RadiologyReportStudioModal } from "../RadiologyReportStudioModal.js";
import { HotFolderIntakeModal } from "../HotFolderIntakeModal.js";
import { CtSelectorModal } from "../CtSelectorModal.js";
import { RadiologyReferralModal } from "../RadiologyReferralModal.js";
import { RadiologyPatientSearchModal, type RadiologyTactileFilterState } from "../RadiologyPatientSearchModal.js";
import { convertImagingStudyToRadiologyStudy } from "../archive/radiologyStudyAdapter.js";
import { applyRadiologyProtocolToForm043 } from "../radiologyProtocols.js";
import type { ImagingStudy } from "@dental/shared";

export interface RadiologyModuleModalsProps {
	modals: {
		showReferral: boolean; setShowReferral: (v: boolean) => void;
		show3dStudio: boolean; setShow3dStudio: (v: boolean) => void;
		showDicomViewer: boolean; setShowDicomViewer: (v: boolean) => void;
		showSensorViewer: boolean; setShowSensorViewer: (v: boolean) => void;
		showRvgCapture: boolean; setShowRvgCapture: (v: boolean) => void;
		showDoseSheet: boolean; setShowDoseSheet: (v: boolean) => void;
		showHotFolder: boolean; setShowHotFolder: (v: boolean) => void;
		showImplant: boolean; setShowImplant: (v: boolean) => void;
		showConsultation: boolean; setShowConsultation: (v: boolean) => void;
		showReportStudio: boolean; setShowReportStudio: (v: boolean) => void;
		showTactileSearch: boolean; setShowTactileSearch: (v: boolean) => void;
		showCtSelector: boolean; setShowCtSelector: (v: boolean) => void;
	};
	tactileFilters: RadiologyTactileFilterState;
	setTactileFilters: (f: RadiologyTactileFilterState) => void;
	setActiveView: (view: "archive" | "hub") => void;
	patient: any; patientName: string; cardNum: string; docName: string;
	doctorSpecialty?: string | null | undefined; clinicName?: string | null | undefined;
	activeToothFdi?: string | number | null | undefined;
	selectedStudyForStudio: ImagingStudy | null; setSelectedStudyForStudio: (s: ImagingStudy | null) => void;
	selectedStudyForViewer: ImagingStudy | null; setSelectedStudyForViewer: (s: ImagingStudy | null) => void;
	selectedStudyForSensorViewer: ImagingStudy | null; setSelectedStudyForSensorViewer: (s: ImagingStudy | null) => void;
}

export function RadiologyModuleModals(p: RadiologyModuleModalsProps) {
	const { modals, patient, patientName, cardNum, docName, doctorSpecialty, clinicName, activeToothFdi } = p;
	return (
		<>
			{modals.showReferral && (
				<RadiologyReferralModal isOpen={modals.showReferral} onClose={() => modals.setShowReferral(false)} patient={patient} doctorName={docName} doctorSpecialty={doctorSpecialty} clinicName={clinicName} initialTeeth={activeToothFdi ? [String(activeToothFdi)] : undefined} />
			)}
			{modals.show3dStudio && (
				<CbctMprImplantStudioModal isOpen={modals.show3dStudio} onClose={() => { modals.setShow3dStudio(false); p.setSelectedStudyForStudio(null); }} study={p.selectedStudyForStudio ? convertImagingStudyToRadiologyStudy(p.selectedStudyForStudio) : undefined} patientName={p.selectedStudyForStudio?.patientFullName || patientName} patientId={p.selectedStudyForStudio?.patientId || patient?.id || undefined} />
			)}
			{modals.showDicomViewer && (
				<DicomViewerModal isOpen={modals.showDicomViewer} onClose={() => { modals.setShowDicomViewer(false); p.setSelectedStudyForViewer(null); }} imageSrc={p.selectedStudyForViewer?.previewUrl || undefined} title={p.selectedStudyForViewer?.title || "Дентальный снимок"} patientName={p.selectedStudyForViewer?.patientFullName || patientName} patientId={p.selectedStudyForViewer?.patientId || patient?.id || undefined} toothFdiCode={p.selectedStudyForViewer?.toothCode || undefined} />
			)}
			{modals.showSensorViewer && (
				<div className="fixed inset-0 z-50 bg-black flex flex-col">
					<SensorStudyViewer onClose={() => { modals.setShowSensorViewer(false); p.setSelectedStudyForSensorViewer(null); }} study={p.selectedStudyForSensorViewer ? convertImagingStudyToRadiologyStudy(p.selectedStudyForSensorViewer) : undefined} patientName={p.selectedStudyForSensorViewer?.patientFullName || patientName} medicalCardNumber={cardNum} patientBirthDate={patient?.birthDate || undefined} toothFdiCode={p.selectedStudyForSensorViewer?.toothCode || (activeToothFdi ? String(activeToothFdi) : undefined)} />
				</div>
			)}
			{modals.showRvgCapture && (
				<DirectRvgCaptureModal isOpen={modals.showRvgCapture} onClose={() => modals.setShowRvgCapture(false)} patientId={patient?.id || undefined} patientName={patientName} patientCardNumber={cardNum} doctorName={docName} initialToothFdi={activeToothFdi ? String(activeToothFdi) : "16"} />
			)}
			{modals.showDoseSheet && (
				<RadiationSafetyRegistryModal isOpen={modals.showDoseSheet} onClose={() => modals.setShowDoseSheet(false)} patientName={patientName} patientCardNumber={cardNum} patientBirthDate={patient?.birthDate || undefined} />
			)}
			{modals.showReportStudio && (
				<RadiologyReportStudioModal isOpen={modals.showReportStudio} onClose={() => modals.setShowReportStudio(false)} patientName={patientName} patientCardNumber={cardNum} patientAge={patient?.birthDate ? undefined : "58Y"} patientGender={patient?.gender === "female" ? "Жен." : "Муж."} clinicName={clinicName || "Стоматологическая клиника DENTE"} />
			)}
			{modals.showHotFolder && (
				<HotFolderIntakeModal isOpen={modals.showHotFolder} onClose={() => modals.setShowHotFolder(false)} patientId={patient?.id || undefined} patientName={patient?.fullName || undefined} patientCardNumber={patient?.medicalCardNumber || patient?.cardNumber || undefined} patientBirthDate={patient?.birthDate || undefined} />
			)}
			{modals.showImplant && (
				<CbctImplantModal isOpen={modals.showImplant} onClose={() => modals.setShowImplant(false)} patientId={patient?.id || undefined} patientName={patientName} toothFdi={activeToothFdi ? Number(activeToothFdi) : 46} />
			)}
			{modals.showConsultation && typeof document !== "undefined" && createPortal(
				<div className="fixed inset-0 z-50 bg-[#020617] flex flex-col" data-testid="radiology-consultation-modal-portal">
					<RadiologyConsultationSplit patientName={patientName} patientCardNumber={cardNum} patientAge={patient?.birthDate ? undefined : "58Y"} patientGender="Жен." activeToothFdi={activeToothFdi || undefined} initialLeftStudy={p.selectedStudyForViewer ? convertImagingStudyToRadiologyStudy(p.selectedStudyForViewer) : undefined} onInsertProtocol={(note) => applyRadiologyProtocolToForm043({ protocol: { id: "consultation-note", titleRu: "Консультация сплит", shortLabel: "Консультация", text: note, category: "norma" }, options: { toothFdi: activeToothFdi ? String(activeToothFdi) : undefined, modalityLabel: "Консультация (Сплит)" }, showNotification: true, copyToClipboard: true })} onClose={() => modals.setShowConsultation(false)} />
				</div>,
				document.body
			)}
			<RadiologyPatientSearchModal isOpen={modals.showTactileSearch} onClose={() => modals.setShowTactileSearch(false)} initialFilters={p.tactileFilters} onApply={(f) => { p.setTactileFilters(f); p.setActiveView("archive"); }} onReset={() => p.setTactileFilters({} as any)} />
			{modals.showCtSelector && (
				<CtSelectorModal isOpen={modals.showCtSelector} onClose={() => modals.setShowCtSelector(false)} patientId={patient?.id || undefined} patientName={patientName} cardNumber={cardNum} onOpenCbctStudio={(s) => { if (s) p.setSelectedStudyForStudio(s); modals.setShowCtSelector(false); modals.setShow3dStudio(true); }} onImagesLoaded={(_ids, meta) => { if (meta) p.setSelectedStudyForStudio(meta); modals.setShowCtSelector(false); modals.setShow3dStudio(true); }} />
			)}
		</>
	);
}
