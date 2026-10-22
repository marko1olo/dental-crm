export type SterilizerMethodType = "steam_autoclave" | "dry_heat_air" | "low_temp_plasma";

export type AutoclaveClassType = "class_b" | "class_s" | "class_n" | "dry_heat";

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_134_quick"
	| "steam_134_20min_prion"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "dry_heat_160_150min"
	| "bowie_dick_test"
	| "helix_pcd_test";

export interface SterilizerApparatusDefinition {
	readonly id: string;
	readonly code: string;
	readonly brand: string;
	readonly model: string;
	readonly serialNumber: string;
	readonly inventoryNumber: string;
	readonly methodType: SterilizerMethodType;
	readonly deviceClass: AutoclaveClassType;
	readonly chamberVolumeLiters: number;
	readonly maxTraysCount: number;
	readonly locationRoom: string;
	readonly commissionDate: string;
	readonly lastMaintenanceDate: string;
	readonly nextMaintenanceDate: string;
	readonly supportedRegimeIds: readonly SterilizationRegimeId[];
}

export const STATUTORY_STERILIZERS_CATALOG: readonly SterilizerApparatusDefinition[] = [
	{
		id: "autoclave-melag-vacuklav-23b",
		code: "АК-01",
		brand: "MELAG",
		model: "Vacuklav 23 B+ (Class B)",
		serialNumber: "2023-V23B-94812",
		inventoryNumber: "ИНВ-ЦСО-00124",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 22,
		maxTraysCount: 5,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2023-04-12",
		lastMaintenanceDate: "2026-06-15",
		nextMaintenanceDate: "2026-12-15",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_134_quick",
			"steam_134_20min_prion",
			"steam_121_20min",
			"bowie_dick_test",
			"helix_pcd_test",
		],
	},
	{
		id: "autoclave-euronda-e9-med",
		code: "АК-02",
		brand: "Euronda",
		model: "E9 Next 18L (Class B)",
		serialNumber: "EU-E9N-839210",
		inventoryNumber: "ИНВ-ЦСО-00125",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 18,
		maxTraysCount: 4,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2024-01-20",
		lastMaintenanceDate: "2026-07-01",
		nextMaintenanceDate: "2027-01-01",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_134_quick",
			"steam_134_20min_prion",
			"steam_121_20min",
			"bowie_dick_test",
			"helix_pcd_test",
		],
	},
	{
		id: "autoclave-woson-tanzo-c18",
		code: "АК-03",
		brand: "Woson",
		model: "Tanzo C18 (Class B)",
		serialNumber: "WS-TC18-55291",
		inventoryNumber: "ИНВ-ЦСО-00128",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 18,
		maxTraysCount: 3,
		locationRoom: "Стерилизационная блока хирургии",
		commissionDate: "2024-09-10",
		lastMaintenanceDate: "2026-03-10",
		nextMaintenanceDate: "2026-09-10",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_134_quick",
			"steam_121_20min",
			"bowie_dick_test",
		],
	},
	{
		id: "dryheat-gpk-gp20-spu",
		code: "СЖ-01",
		brand: "Смоленск СКТБ СПУ",
		model: "ГП-20 СПУ (Сухожаровой шкаф)",
		serialNumber: "СПУ-ГП20-77120",
		inventoryNumber: "ИНВ-ЦСО-00130",
		methodType: "dry_heat_air",
		deviceClass: "dry_heat",
		chamberVolumeLiters: 20,
		maxTraysCount: 3,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2022-11-05",
		lastMaintenanceDate: "2026-05-18",
		nextMaintenanceDate: "2026-11-18",
		supportedRegimeIds: [
			"dry_heat_180_60min", "dry_heat_160_150min",
		],
	},
];
