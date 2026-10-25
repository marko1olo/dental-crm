import type { ImagingStudy } from "@dental/shared";
import type { RadiologyTactileFilterState } from "../../../radiology/RadiologyPatientSearchModal";

export interface PatientRadiologyModalsProps {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	cardNumber?: string | null | undefined;
	active2dStudy: ImagingStudy | null;
	setActive2dStudy: (s: ImagingStudy | null) => void;
	activeScan3dStudy: ImagingStudy | null;
	setActiveScan3dStudy: (s: ImagingStudy | null) => void;
	showHotFolder: boolean;
	setShowHotFolder: (show: boolean) => void;
	activeControlStudy: ImagingStudy | null;
	setActiveControlStudy: (s: ImagingStudy | null) => void;
	handleStudyUpdated: (s: ImagingStudy) => void;
	showTactileSearch: boolean;
	setShowTactileSearch: (show: boolean) => void;
	tactileFilters: RadiologyTactileFilterState;
	setTactileFilters: (f: RadiologyTactileFilterState) => void;
	sortedStudies: ImagingStudy[];
	filteredStudies: ImagingStudy[];
	showCtSelector: boolean;
	setShowCtSelector: (show: boolean) => void;
	handleOpen3d: (study: ImagingStudy) => void;
	loadPatientStudies: () => void;
}
