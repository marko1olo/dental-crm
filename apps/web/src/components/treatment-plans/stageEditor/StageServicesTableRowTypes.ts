import type { TreatmentPlanDoctorOption, TreatmentPlanItem } from "../types";

export interface StageServicesTableRowProps {
	readonly item: TreatmentPlanItem;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAssignDoctorToItem?: ((
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null
	) => void) | undefined;
}
