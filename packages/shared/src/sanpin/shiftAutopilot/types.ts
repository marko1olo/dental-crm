/**
 * packages/shared/src/sanpin/shiftAutopilot/types.ts
 * Типы данных пакетного автопилота смены стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import type {
	BactericidalSessionRecord,
	ClinicLegalInfo,
	DisinfectantJournalRecord,
	Form257Record,
	GeneralCleaningJournalRecord,
	PsoJournalRecord,
} from "../sanpinRegistryEngine.js";

export interface SanpinShiftAutopilotOptions {
	date?: string;
	operatorFullName?: string;
	operatorPosition?: string;
	headNurseFullName?: string;
	clinicInfo?: Partial<ClinicLegalInfo>;
	shiftNumber?: number;
}

export interface ShiftAutopilotWasteRecord {
	id: string;
	date: string;
	wasteClass: "class_B";
	wasteDescription: string;
	packageType: "yellow_sharps_container" | "yellow_bag";
	packageCount: number;
	weightKg: number;
	disinfectionMethod: "chemical_soaking";
	disinfectantUsed: string;
	responsibleStaffFullName: string;
}

export interface ShiftAutopilotTemperatureRecord {
	id: string;
	measurementDate: string;
	measurementPeriod: "morning" | "evening";
	equipmentName: string;
	location: string;
	meterDeviceName: string;
	meterSerialNumber: string;
	temperatureCelsius: number;
	relativeHumidityPercent: number;
	targetTempMinCelsius: number;
	targetTempMaxCelsius: number;
	isWithinNorm: boolean;
	operatorStaffFullName: string;
}

export interface SanpinShiftAutopilotBundle {
	date: string;
	timestamp: string;
	operatorFullName: string;
	operatorPosition: string;
	headNurseFullName: string;
	clinicInfo: ClinicLegalInfo;
	psoRecords: PsoJournalRecord[];
	form257Records: Form257Record[];
	bactericidalSessions: BactericidalSessionRecord[];
	cleaningRecords: GeneralCleaningJournalRecord[];
	disinfectantRecords: DisinfectantJournalRecord[];
	temperatureRecords: ShiftAutopilotTemperatureRecord[];
	wasteRecords: ShiftAutopilotWasteRecord[];
	summary: {
		totalPsoBatches: number;
		totalPsoItems: number;
		totalPsoSamplesTested: number;
		totalSterilizationCycles: number;
		totalSterilePacks: number;
		totalBactericidalMinutes: number;
		totalCleanings: number;
		totalTempChecks: number;
		totalWasteKg: number;
		allProtocolsCompliant: boolean;
		complianceStatementRu: string;
	};
}
