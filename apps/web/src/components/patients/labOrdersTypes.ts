export interface LabOrder {
	id: string;
	patientId: string;
	patientName?: string | null;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken: string;
	toothFdi?: string | null;
	teethFdi?: string | null;
	material?: string | null;
	colorVita?: string | null;
	shadeCode?: string | null;
	constructionType?: string | null;
	status: string;
	stage?: string | null;
	techStage?: string | null;
	dueDate?: string | null;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	priceRub?: number | null;
	labCostRub?: number | null;
	costRub?: number | null;
	priceKopecks?: number | null;
	amountKopecks?: number | null;
	labCostKopecks?: number | null;
	costKopecks?: number | null;
	isWarranty?: boolean | null;
	isLockedInstalled?: boolean | null;
	orderNumber?: string | null;
	gostOrderNumber?: string | null;
	createdAt: string;
	updatedAt?: string;
}

export type LabOrderFilterKey = "all" | "active" | "fitting" | "ready" | "completed";
