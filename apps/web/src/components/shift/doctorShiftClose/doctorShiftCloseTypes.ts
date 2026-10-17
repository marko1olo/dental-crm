import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";

export type DoctorShiftCompensationModel = "piece_rate" | "chair_rental" | "salary_plus_bonus";

export interface DoctorShiftCashSummary {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly totalRevenueRub: number;
}

export interface DoctorShiftEmrSummary {
	readonly signedCount: number;
	readonly pendingSignatureCount: number;
	readonly draftCount: number;
}

export interface DoctorShiftCloseModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmClose: (data?: {
		countedCashRub?: number;
		printZReport?: boolean;
		fiscalDocNumber?: string;
		compensationModel?: DoctorShiftCompensationModel;
		calculatedPayoutRub?: number;
	}) => void | Promise<void>;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly shiftDateLabel?: string | undefined;
	readonly shiftStats: DoctorShiftStats;
	readonly cashSummary?: DoctorShiftCashSummary | undefined;
	readonly emrSummary?: DoctorShiftEmrSummary | undefined;
	readonly clinicName?: string | undefined;
	readonly cashboxName?: string | undefined;
}
