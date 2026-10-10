import type {
	CreateSterilizerEquipmentDto,
	PopularSterilizerBrandPreset,
	SterilizerDeviceClass,
	SterilizerEquipment,
	SterilizerEquipmentStatus,
	SterilizationDeviceType,
	UpdateSterilizerEquipmentDto,
} from "@dental/shared";

export type {
	CreateSterilizerEquipmentDto,
	PopularSterilizerBrandPreset,
	SterilizerDeviceClass,
	SterilizerEquipment,
	SterilizerEquipmentStatus,
	SterilizationDeviceType,
	UpdateSterilizerEquipmentDto,
};

export type SterilizerTabId = "passport" | "cycles" | "maintenance";

export interface SterilizerEquipmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	editingEquipment?: SterilizerEquipment | null;
}

export interface SterilizerFormData {
	name: string;
	brandModel: string;
	serialNumber: string;
	inventoryNumber: string;
	deviceType: SterilizationDeviceType;
	deviceClass: SterilizerDeviceClass;
	chamberVolumeLiters: number;
	locationRoom: string;
	verificationExpiryDate: string;
	lastMaintenanceDate: string;
	nextMaintenanceDate: string;
	commissioningDate: string;
	status: SterilizerEquipmentStatus;
	notes: string;
}

export interface SterilizerCycleLogItem {
	id: string;
	cycleNumber: number;
	timestamp: string;
	regimeName: string;
	tempC: number;
	pressureBar: number;
	exposureMin: number;
	indicatorResult: string;
	testType: "bowie_dick" | "helix" | "class_5_integrator" | "class_4_indicator";
	packsCount: number;
	operatorName: string;
	status: "sterile_passed" | "rejected";
	barcode?: string;
}

export interface SterilizerMaintenanceTask {
	id: string;
	title: string;
	intervalMonths: number;
	description: string;
	statutoryNorm: string;
	lastPerformedDate?: string;
	isOverdue?: boolean;
}
