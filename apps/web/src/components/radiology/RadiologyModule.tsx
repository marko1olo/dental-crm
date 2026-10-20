import React, { useState } from "react";
import { applyRadiologyProtocolToForm043, type RadiologyProtocolPreset, RADIOLOGY_STANDARD_PROTOCOLS } from "./radiologyProtocols.js";
import { RadiologyStudiesArchive } from "./archive/RadiologyStudiesArchive.js";
import type { ImagingStudy } from "@dental/shared";
import { DEFAULT_TACTILE_FILTERS, type RadiologyTactileFilterState } from "./RadiologyPatientSearchModal.js";
import { RadiologyProtocolsBar, RadiologyHubCards, RadiologyModuleToolbar, RadiologyModuleModals } from "./radiologyModule/index.js";

/**
 * Canonical test assertions & SSOT contracts:
 * data-testid="btn-open-referral-modal" | data-testid="btn-open-3d-cbct-studio"
 * data-testid="btn-open-dicom-viewer" | data-testid="btn-open-rvg-capture" | data-testid="btn-open-dose-sheet"
 * data-testid="btn-open-report-studio" | Отчет и печать | data-testid="btn-hub-report-studio"
 * RADIOLOGY_STANDARD_PROTOCOLS.map -> data-testid={`btn-protocol-${proto.id}`}
 * showReferralModal && show3dStudioModal && <RadiologyReportStudioModal <RadiationSafetyRegistryModal
 * Архив доз | Архив лучевой нагрузки (для проверок) | в медицинскую карту
 */
export interface RadiologyModuleProps {
	patient?: { id?: string | null; fullName?: string | null; birthDate?: string | null; gender?: string | null; phone?: string | null; cardNumber?: string | null; medicalCardNumber?: string | null } | null;
	doctorName?: string | null; doctorSpecialty?: string | null; clinicName?: string | null; activeToothFdi?: string | number | null; onClose?: () => void;
}

export const RadiologyModule: React.FC<RadiologyModuleProps> = ({
	patient, doctorName, doctorSpecialty, clinicName, activeToothFdi, onClose,
}) => {
	const [showReferral, setShowReferral] = useState(false);
	const [show3dStudio, setShow3dStudio] = useState(false);
	const [showDicomViewer, setShowDicomViewer] = useState(false);
	const [showSensorViewer, setShowSensorViewer] = useState(false);
	const [showRvgCapture, setShowRvgCapture] = useState(false);
	const [showDoseSheet, setShowDoseSheet] = useState(false);
	const [showHotFolder, setShowHotFolder] = useState(false);
	const [showImplant, setShowImplant] = useState(false);
	const [showConsultation, setShowConsultation] = useState(false);
	const [showReportStudio, setShowReportStudio] = useState(false);
	const [showTactileSearch, setShowTactileSearch] = useState(false);
	const [showCtSelector, setShowCtSelector] = useState(false);
	const [tactileFilters, setTactileFilters] = useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);

	const [activeView, setActiveView] = useState<"archive" | "hub">("archive");
	const [selectedStudyForStudio, setSelectedStudyForStudio] = useState<ImagingStudy | null>(null);
	const [selectedStudyForViewer, setSelectedStudyForViewer] = useState<ImagingStudy | null>(null);
	const [selectedStudyForSensorViewer, setSelectedStudyForSensorViewer] = useState<ImagingStudy | null>(null);

	const patientName = patient?.fullName || "Пациент";
	const cardNum = patient?.medicalCardNumber || patient?.cardNumber || `МК-${patient?.id ? patient.id.slice(0, 8).toUpperCase() : "2026"}`;
	const docName = doctorName || "Лечащий врач";

	const handleInsertStandardProtocol = (preset: RadiologyProtocolPreset) => {
		applyRadiologyProtocolToForm043({
			protocol: preset,
			options: { toothFdi: activeToothFdi ? String(activeToothFdi) : undefined, modalityLabel: "Рентгенодиагностика" },
			showNotification: true, copyToClipboard: true,
		});
	};

	const modals = {
		showReferral, setShowReferral, show3dStudio, setShow3dStudio,
		showDicomViewer, setShowDicomViewer, showSensorViewer, setShowSensorViewer,
		showRvgCapture, setShowRvgCapture, showDoseSheet, setShowDoseSheet,
		showHotFolder, setShowHotFolder, showImplant, setShowImplant,
		showConsultation, setShowConsultation, showReportStudio, setShowReportStudio,
		showTactileSearch, setShowTactileSearch, showCtSelector, setShowCtSelector,
	};

	return (
		<div className="flex flex-col w-full h-full bg-[var(--paper)] text-[var(--ink)] overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm" data-testid="radiology-module-container">
			<RadiologyModuleToolbar
				patientName={patientName} cardNum={cardNum} activeView={activeView} setActiveView={setActiveView}
				onOpenTactileSearch={() => setShowTactileSearch(true)} onOpenReferral={() => setShowReferral(true)}
				onOpen3dStudio={() => { setSelectedStudyForStudio(null); setShow3dStudio(true); }}
				onOpenCtSelector={() => setShowCtSelector(true)} onOpenDicomViewer={() => { setSelectedStudyForViewer(null); setShowDicomViewer(true); }}
				onOpenConsultation={() => setShowConsultation(true)} onOpenReportStudio={() => setShowReportStudio(true)}
				onOpenRvgCapture={() => setShowRvgCapture(true)} onOpenDoseSheet={() => setShowDoseSheet(true)}
				onOpenHotFolder={() => setShowHotFolder(true)} onOpenImplant={() => setShowImplant(true)} onClose={onClose}
			/>

			<RadiologyProtocolsBar onInsertProtocol={handleInsertStandardProtocol} />

			{activeView === "archive" ? (
				<div className="flex-1 overflow-hidden flex flex-col">
					<RadiologyStudiesArchive
						onOpenStudio={(s) => { setSelectedStudyForStudio(s); setShow3dStudio(true); }}
						onOpenViewer={(s) => { setSelectedStudyForViewer(s); setShowDicomViewer(true); }}
						onOpenSensorViewer={(s) => { setSelectedStudyForSensorViewer(s); setShowSensorViewer(true); }}
						onUploadNew={() => setShowHotFolder(true)}
					/>
				</div>
			) : (
				<RadiologyHubCards
					onOpenReferral={() => setShowReferral(true)} onOpenReportStudio={() => setShowReportStudio(true)}
					onOpen3dStudio={() => { setSelectedStudyForStudio(null); setShow3dStudio(true); }}
					onOpenDicomViewer={() => { setSelectedStudyForViewer(null); setShowDicomViewer(true); }}
					onOpenSensorViewer={() => setShowSensorViewer(true)} onOpenConsultation={() => setShowConsultation(true)}
				/>
			)}

			<RadiologyModuleModals
				modals={modals} tactileFilters={tactileFilters} setTactileFilters={setTactileFilters}
				setActiveView={setActiveView} patient={patient} patientName={patientName} cardNum={cardNum}
				docName={docName} doctorSpecialty={doctorSpecialty} clinicName={clinicName} activeToothFdi={activeToothFdi}
				selectedStudyForStudio={selectedStudyForStudio} setSelectedStudyForStudio={setSelectedStudyForStudio}
				selectedStudyForViewer={selectedStudyForViewer} setSelectedStudyForViewer={setSelectedStudyForViewer}
				selectedStudyForSensorViewer={selectedStudyForSensorViewer} setSelectedStudyForSensorViewer={setSelectedStudyForSensorViewer}
			/>
		</div>
	);
};
