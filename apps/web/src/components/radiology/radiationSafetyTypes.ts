import type { DentalRadiologyStudyType } from "@dental/shared";

export interface RadiationSafetyRecord {
	id: string;
	studyDate: string;
	studyType: DentalRadiologyStudyType;
	anatomicalArea: string;
	apparatusName: string;
	effectiveDoseMsv: number;
	effectiveDoseMicrosv: number;
	doctorName: string;
}

export interface RadiationSafetyRegistryModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	patientBirthDate?: string | undefined;
	initialRecords?: RadiationSafetyRecord[] | undefined;
}
