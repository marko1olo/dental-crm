export interface MobilePriceDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: service item
	readonly service: any | null;
	// biome-ignore lint/suspicious/noExplicitAny: service payload
	readonly onSave: (servicePayload: any, serviceId?: string) => Promise<void>;
	readonly onDelete?: (serviceId: string) => Promise<void>;
	readonly serviceCategoryLabels?: Record<string, string>;
	readonly specialtyLabels?: Record<string, string>;
}

export const DEFAULT_CATEGORIES: Array<{ id: string; label: string }> = [
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "orthodontics", label: "Ортодонтия" },
	{ id: "hygiene", label: "Профгигиена" },
	{ id: "diagnostics", label: "Диагностика" },
	{ id: "periodontics", label: "Пародонтология" },
	{ id: "pediatric", label: "Детская" },
	{ id: "other", label: "Прочее" },
];

export const DEFAULT_SPECIALTIES: Array<{ id: string; label: string }> = [
	{ id: "therapist", label: "Терапевт" },
	{ id: "surgeon", label: "Хирург" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "hygienist", label: "Гигиенист" },
	{ id: "universal", label: "Универсал" },
];

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
