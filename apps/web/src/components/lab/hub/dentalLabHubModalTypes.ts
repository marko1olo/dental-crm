/**
 * dentalLabHubModalTypes.ts — Типы данных и пропсов для единого хаба ЗТЛ.
 * Мандат 8b: < 60 строк.
 */

import type { LabStageId } from "../labCatalogData";

export interface DentalLabHubOrder {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientName: string;
	readonly patientId?: string | undefined;
	readonly doctorName: string;
	readonly toothFdi: string;
	readonly constructionTitle: string;
	readonly material: string;
	readonly shadeVita: string;
	readonly shadeStump?: string | undefined;
	readonly labName: string;
	readonly stageId: LabStageId;
	readonly createdAt: string;
	readonly trialDate: string;
	readonly dueDate: string;
	readonly labCostKopecks: number;
	readonly patientPriceKopecks: number;
	readonly isWarranty?: boolean | undefined;
	readonly clinicalNotes?: string | undefined;
}

export interface DentalLabOrdersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabHubOrder[] | DentalLabHubOrder[] | any[];
	readonly onSaveOrder?: (order: DentalLabHubOrder) => void;
	readonly currentDoctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: string | number | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly initialTab?: "orders" | "create" | "print" | undefined;
}

export type DentalLabHubModalProps = DentalLabOrdersHubModalProps;

export const SAMPLE_LABS = [
	"Арт-Дент Лаб (CAD/CAM фрезерный центр)",
	"Орто-Мастер ЗТЛ (Высокоточная ортопедия)",
	"Премиум-Смайл Лаб (Эстетическая керамика)",
	"Собственная лаборатория клиники",
] as const;
