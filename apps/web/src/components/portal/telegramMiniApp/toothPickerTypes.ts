/**
 * Telegram Interactive Tooth Picker Types
 * (DOMAIN: TELEGRAM MINI APP - LAYER 0 TYPES)
 */

export type ToothComplaintType =
	| "acute_throbbing"
	| "fracture_filling"
	| "food_impaction_caries"
	| "temperature_sensitivity"
	| "crown_implant";

export interface ToothComplaint {
	readonly toothNumber: number;
	readonly complaintType: ToothComplaintType;
	readonly symptomLabel: string;
	readonly painLevel: number; // 1-5
	readonly notes?: string | undefined;
	readonly cito: boolean;
}

export interface TelegramInteractiveToothPickerProps {
	readonly selectedComplaints: readonly ToothComplaint[];
	readonly onSaveComplaint: (complaint: ToothComplaint) => void;
	readonly onRemoveComplaint: (toothNumber: number) => void;
	readonly onProceedToBooking?: () => void;
}
