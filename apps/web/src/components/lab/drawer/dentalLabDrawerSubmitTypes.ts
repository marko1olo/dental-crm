import type {
	DentalLabConstructionType,
	DentalLabOrderStatus,
} from "../dentalLabOrderEngine";
import type { DentalLabOrderDrawerProps } from "../DentalLabOrderDrawer";

export interface DrawerSubmitContext {
	props: DentalLabOrderDrawerProps;
	editingOrder: any;
	patientName: string;
	doctorName: string;
	labName: string;
	technicianName: string;
	teethInput: string;
	construction: DentalLabConstructionType;
	vitaShade: string;
	translucency: "HT" | "MT" | "LT" | "MO" | "HO";
	stumpShade: string;
	sentDate: string;
	deadlineDate: string;
	scheduledVisit: string;
	patientPriceRub: number;
	ztlCostRub: number;
	doctorPercent: number;
	clinicalNotes: string;
	attachedScanUrl: string;
	status: DentalLabOrderStatus;
}
