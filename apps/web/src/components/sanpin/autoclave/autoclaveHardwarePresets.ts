import type { AutoclaveCycleId } from "./autoclaveStandardCycles.js";

export type AutoclaveDeviceClass = 'class_b' | 'class_s' | 'class_n';

export interface AutoclaveApparatusInfo {
	id: string;
	brand: string;
	model: string;
	serialNumber: string;
	chamberVolumeLiters: number;
	deviceClass: AutoclaveDeviceClass;
	isCalibrated: boolean;
	lastMaintenanceDate: string;
	nextMaintenanceDate: string;
	firmwareVersion: string;
	supportedCycles: AutoclaveCycleId[];
}

export const CLINIC_AUTOCLAVES_PRESETS: AutoclaveApparatusInfo[] = [
	{
		id: 'AUTO-MELAG-01',
		brand: 'Melag',
		model: 'Vacuklav 23 B+',
		serialNumber: '2023-V23B-9841',
		chamberVolumeLiters: 22,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-06-15',
		nextMaintenanceDate: '2026-12-15',
		firmwareVersion: 'v4.18',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	},
	{
		id: 'AUTO-WH-02',
		brand: 'W&H',
		model: 'Lisa 500 EcoDry',
		serialNumber: 'WH-LISA-44129',
		chamberVolumeLiters: 17,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-07-01',
		nextMaintenanceDate: '2027-01-01',
		firmwareVersion: 'v5.02',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	},
	{
		id: 'AUTO-EURONDA-03',
		brand: 'Euronda',
		model: 'E9 Next',
		serialNumber: 'EU-E9N-88120',
		chamberVolumeLiters: 24,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-05-10',
		nextMaintenanceDate: '2026-11-10',
		firmwareVersion: 'v3.85',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	}
];
