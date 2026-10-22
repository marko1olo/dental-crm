/**
 * clinicalTabTypes.ts — Props and types for EgiszClinicalTab
 */

import type {
	EgiszDentalSemdCode,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";

export interface EgiszClinicalTabProps {
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly onSemdDocCodeChange: (code: EgiszDentalSemdCode) => void;
	readonly patient: EgiszPatientInfo;
	readonly onPatientChange: (patient: EgiszPatientInfo) => void;
	readonly doctor: EgiszDoctorInfo;
	readonly onDoctorChange: (doctor: EgiszDoctorInfo) => void;
	readonly complaints: string;
	readonly onComplaintsChange: (complaints: string) => void;
	readonly anamnesisMorbi: string;
	readonly onAnamnesisMorbiChange: (anamnesis: string) => void;
	readonly selectedTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly toothStates: Record<number, string>;
	readonly onUpdateToothStatus: (tooth: number, status: string) => void;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly onAddDiagnosis: () => void;
	readonly onRemoveDiagnosis: (index: number) => void;
	readonly procedures: readonly EgiszProcedureItem[];
	readonly onAddProcedure: () => void;
	readonly onRemoveProcedure: (index: number) => void;
}
