export type RadiationSafetyZone = "green" | "yellow" | "red";

export interface RadiationZoneDefinition {
	zone: RadiationSafetyZone;
	minMsv: number;
	maxMsv: number;
	labelRu: string;
	statusBadgeRu: string;
	descriptionRu: string;
	recommendationRu: string;
	badgeClass: string;
	borderClass: string;
	textClass: string;
	bgClass: string;
}

export type StatutoryRadiologyModality =
	| "visiography_intraoral"
	| "optg_panoramic"
	| "cbct_segmental"
	| "cbct_full_jaws"
	| "cbct_maxillofacial"
	| "teleradiography_trg"
	| "teleradiography_trg_frontal"
	| "bitewing_intraoral"
	| "film_intraoral_legacy";

export interface StatutoryDosePreset {
	id: StatutoryRadiologyModality;
	nameRu: string;
	shortNameRu: string;
	categoryRu: string;
	typicalDoseMsv: number;
	typicalDoseMicrosv: number;
	minDoseMsv: number;
	maxDoseMsv: number;
	defaultKv: number;
	defaultMa: number;
	defaultExposureSec: number;
}

export interface DoseRecord {
	id: string;
	studyDate: string;
	modalityId: StatutoryRadiologyModality | string;
	modalityLabel: string;
	anatomicalArea: string;
	teethFdi?: string[] | undefined;
	apparatusModel?: string | undefined;
	tubeVoltageKv?: number | undefined;
	tubeCurrentMa?: number | undefined;
	exposureTimeSec?: number | undefined;
	effectiveDoseMicrosv: number;
	effectiveDoseMsv: number;
	doctorName: string;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	protectionEquipmentUsed?: string[] | undefined;
	isEmergencyJustified?: boolean | undefined;
	emergencyJustificationReason?: string | null | undefined;
	notes?: string | null | undefined;
}

export interface DoseSummary {
	annualMicrosv: number;
	annualMsv: number;
	annualStudiesCount: number;
	lifetimeMicrosv: number;
	lifetimeMsv: number;
	lifetimeStudiesCount: number;
	sanpinLimitMsv: number;
	percentOfAnnualLimit: number;
	safetyZone: RadiationSafetyZone;
	safetyZoneLabel: string;
	recommendation: string;
	alaraComplianceNotes: string;
	yearlyBreakdown: Record<
		number,
		{
			year: number;
			count: number;
			microsv: number;
			msv: number;
			percentOfLimit: number;
			zone: RadiationSafetyZone;
		}
	>;
	modalityBreakdown: Record<
		string,
		{
			modalityId: string;
			modalityLabel: string;
			count: number;
			microsv: number;
			msv: number;
			percentOfTotal: number;
		}
	>;
}

export interface DoseComplianceResult {
	status: "safe" | "warning" | "limit_exceeded";
	zone: RadiationSafetyZone;
	totalAnnualMsv: number;
	limitMsv: number;
	remainingAnnualMsv: number;
	percentOfLimit: number;
	isExceeded: boolean;
	warningMessage: string;
	protocolActionRequired: string;
	requiresDoctorClinicalJustification: boolean;
	requiresMedicalCouncilJustification: boolean;
	recommendedIntervalDays: number;
	isCaptureBlocked: boolean;
}
