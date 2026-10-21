import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface ServicePricelistManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly ServicePricelistItem[];
	readonly onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicLicense?: string;
	readonly chiefDoctorName?: string;
	readonly adminSecret?: string;
}
