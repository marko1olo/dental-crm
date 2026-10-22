import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export interface DentalLabOrdersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabWorkflowOrder[] | undefined;
	readonly onSaveOrder?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
}

export const SAMPLE_LABS = [
	"CAD/CAM Центр Дентал-Мастер",
	"ArtDent Премиум Лаб",
	"ZirconLab Pro",
	"Центральная ЗТЛ",
] as const;
