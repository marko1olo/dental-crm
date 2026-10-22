import type {
	OrthopedicWorkTypeId,
	LabWorkflowStatus,
} from "../dentalLabWorkflowEngine";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";
import type { DentalLabCreateOrderModalProps } from "./labOrderCreateTypes";

export interface LabOrderCreateSubmitContext {
	props: DentalLabCreateOrderModalProps;
	newPatientName: string;
	newChartNumber: string;
	newDoctorName: string;
	newLabName: string;
	newWorkType: OrthopedicWorkTypeId;
	newTeethInput: string;
	newShade: string;
	newStumpShade: string;
	newPriceRub: number;
	newCostRub: number;
	newDoctorPercent: number;
	newInitialStatus: LabWorkflowStatus;
	newExpectedLabDate: string;
	newFittingDate: string;
	autoBookFitting: boolean;
	newAppointmentId: string;
	newClinicalNotes: string;
	newImplantPlatform: ImplantPlatformType | "";
	newAbutmentType: AbutmentCategoryType | "";
	newFixationType: FixationType | "";
	newTechStage: LabTechnologicalStageId;
}
