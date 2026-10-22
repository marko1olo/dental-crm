import type {
	PackagingTypeId,
	SterilizationRegimeId,
} from "../autoclaveLogPresets.js";

export interface ChamberPointEvaluation {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly indicatorId: string;
	readonly indicatorTradeNameRu: string;
	readonly status: "passed" | "failed" | "untested";
	readonly initialColorRu: string;
	readonly actualColorRu: string;
	readonly notes?: string | undefined;
}

export interface PhysicalSensorsData {
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
}

export interface SterilizationCycleCompliance {
	readonly isCompliant: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly tempDelta: number;
	readonly pressureDelta: number;
	readonly timeDelta: number;
	readonly failureReasons: readonly string[];
}

export type CycleComplianceEvaluation = SterilizationCycleCompliance;

export interface BiologicalControlTestRecord {
	readonly id: string;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly datePlaced: string;
	readonly dateReadout: string;
	readonly bioIndicatorId: string;
	readonly sporeCultureNameRu: string;
	readonly lotNumber: string;
	readonly incubationHours: number;
	readonly incubationTempCelsius: number;
	readonly testPointIndex: 1 | 2 | 3 | 4 | 5;
	readonly result: "sterile_passed" | "growth_failed" | "pending";
	readonly laboratoryName: string;
	readonly protocolNumber: string;
	readonly responsibleSpecialistFullName: string;
	readonly notes?: string | undefined;
}

export interface Form257Record {
	readonly id: string;
	readonly date: string;
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly sterilizerSerialNumber: string;
	readonly regimeId: SterilizationRegimeId;
	readonly regimeNameRu: string;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly bixNumber?: string | undefined;
	readonly packagingType: PackagingTypeId;
	readonly packagingNameRu: string;
	readonly shelfLifeDays: number;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly areAllPointsPassed: boolean;
	readonly chemicalIndicatorNameRu: string;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly isCyclePassed: boolean;
	readonly status: "sterile_passed" | "rejected_defect" | "quarantine";
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified: boolean;
	readonly verificationTimestamp?: string | undefined;
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly barcode?: string | undefined;
	readonly sensors?: {
		readonly actualTemperatureCelsius: number;
		readonly actualPressureBar: number;
		readonly actualExposureMinutes: number;
	} | undefined;
	readonly createdAt: string;
}

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
}
