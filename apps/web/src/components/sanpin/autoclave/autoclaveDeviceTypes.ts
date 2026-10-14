/**
 * apps/web/src/components/sanpin/autoclave/autoclaveDeviceTypes.ts
 *
 * Canonical types and in-memory caches for Clinic Autoclave Devices (СанПиН 3.3686-21).
 */

export interface ClinicAutoclaveDevice {
	id: string;
	brandModelRu: string;
	serialNumber: string;
	inventoryNumber?: string;
	deviceType: "autoclave_class_b" | "autoclave_class_s" | "autoclave_class_n" | "dry_heat_air" | "glassperlen_bead";
	chamberVolumeLiters: number;
	locationRu: string;
	lastMaintenanceDate: string;
	nextMaintenanceDate: string;
	isOperational: boolean;
	notes?: string;
}

export const DEFAULT_CLINIC_DEVICES: ClinicAutoclaveDevice[] = [
	{
		id: "AUTO-01",
		brandModelRu: "Melag Vacuklav 23 B+ (Германия)",
		serialNumber: "MEL-2024-9812",
		inventoryNumber: "ИНВ-ЦСО-001",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 22,
		locationRu: "Центральное стерилизационное отделение (ЦСО)",
		lastMaintenanceDate: "2026-06-01",
		nextMaintenanceDate: "2026-12-01",
		isOperational: true,
		notes: "Класс B с фракционированным вакуумом",
	},
	{
		id: "AUTO-02",
		brandModelRu: "W&H Lina 17 (Австрия)",
		serialNumber: "WH-2023-4410",
		inventoryNumber: "ИНВ-ЦСО-002",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 17,
		locationRu: "ЦСО (Стерилизационная)",
		lastMaintenanceDate: "2026-05-15",
		nextMaintenanceDate: "2026-11-15",
		isOperational: true,
		notes: "Автоклав класса B для наконечников и инструментов",
	},
	{
		id: "AUTO-03",
		brandModelRu: "ГП-40 СПУ (Сухожаровой шкаф)",
		serialNumber: "GP-2024-089",
		inventoryNumber: "ИНВ-ЦСО-003",
		deviceType: "dry_heat_air",
		chamberVolumeLiters: 40,
		locationRu: "Стерилизационная",
		lastMaintenanceDate: "2026-07-01",
		nextMaintenanceDate: "2027-01-01",
		isOperational: true,
		notes: "Сухожаровой стерилизатор 180°C",
	},
	{
		id: "AUTO-04",
		brandModelRu: "Гласперленовый стерилизатор Термоэст (шариковый)",
		serialNumber: "GLS-2025-114",
		inventoryNumber: "ИНВ-КАБ-004",
		deviceType: "glassperlen_bead",
		chamberVolumeLiters: 0.8,
		locationRu: "Кабинет №1 (У кресла)",
		lastMaintenanceDate: "2026-08-01",
		nextMaintenanceDate: "2027-02-01",
		isOperational: true,
		notes: "Шариковый стерилизатор 240°C для быстрой обработки боров и эндо-файлов",
	},
];

let inMemoryCachedAutoclaves: ClinicAutoclaveDevice[] = [];

export function loadSavedClinicAutoclaves(): ClinicAutoclaveDevice[] {
	return inMemoryCachedAutoclaves.length > 0 ? inMemoryCachedAutoclaves : DEFAULT_CLINIC_DEVICES;
}

export function saveClinicAutoclaves(devices: ClinicAutoclaveDevice[]): void {
	inMemoryCachedAutoclaves = devices;
}
