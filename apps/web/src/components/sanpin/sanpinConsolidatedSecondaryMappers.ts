import type {
	BactericidalEquipmentRecord,
	BactericidalSessionRecord,
	GeneralCleaningJournalRecord,
	TemperatureHumidityLogRecord,
} from "@dental/shared";
import type { FetchSanpinContext } from "./sanpinConsolidatedFetcher.js";

export interface RawBactericidalEquipmentDto {
	readonly id: string;
	readonly roomName: string;
	readonly roomVolumeM3?: number | string | null | undefined;
	readonly deviceBrand: string;
	readonly serialNumber: string;
	readonly deviceType?: string | null | undefined;
	readonly lampType?: string | null | undefined;
	readonly lampCount?: number | string | null | undefined;
	readonly maxLampHours?: number | string | null | undefined;
	readonly totalOperatingHours?: number | string | null | undefined;
	readonly remainingLampHours?: number | string | null | undefined;
	readonly remainingLampPercent?: number | string | null | undefined;
	readonly lampStatus?: string | null | undefined;
	readonly isLampCritical?: boolean | null | undefined;
	readonly lastLampReplacementDate?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RawBactericidalLogDto {
	readonly id?: string | null | undefined;
	readonly equipmentId: string;
	readonly roomName?: string | null | undefined;
	readonly deviceBrand?: string | null | undefined;
	readonly date: string;
	readonly sessionStartTime?: string | null | undefined;
	readonly sessionEndTime?: string | null | undefined;
	readonly durationMinutes?: number | string | null | undefined;
	readonly durationHours?: number | string | null | undefined;
	readonly operatingMode?: string | null | undefined;
	readonly cumulativeHoursAfterSession?: number | string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RawGeneralCleaningDto {
	readonly id?: string | null | undefined;
	readonly roomName: string;
	readonly scheduledDate: string;
	readonly actualDateTime: string;
	readonly treatedAreaM2?: number | string | null | undefined;
	readonly disinfectantName: string;
	readonly activeIngredient?: string | null | undefined;
	readonly solutionConcentrationPercent?: number | string | null | undefined;
	readonly applicationMethod?: string | null | undefined;
	readonly exposureTimeMinutes?: number | string | null | undefined;
	readonly uvIrradiationMinutes?: number | string | null | undefined;
	readonly ventilationMinutes?: number | string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly inspectorName?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RawTemperatureLogDto {
	readonly id?: string | null | undefined;
	readonly measurementDate: string;
	readonly measurementPeriod?: string | null | undefined;
	readonly equipmentName?: string | null | undefined;
	readonly location?: string | null | undefined;
	readonly equipmentType?: string | null | undefined;
	readonly temperatureCelsius?: number | string | null | undefined;
	readonly relativeHumidityPercent?: number | string | null | undefined;
	readonly targetTempMin?: number | string | null | undefined;
	readonly targetTempMax?: number | string | null | undefined;
	readonly isWithinNorm?: boolean | null | undefined;
	readonly deviationReason?: string | null | undefined;
	readonly correctiveAction?: string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

function normalizeBactericidalDeviceType(
	val: string | null | undefined,
): "recirculator_closed" | "irradiator_open" | "combined" {
	if (val === "irradiator_open" || val === "combined") {
		return val;
	}
	return "recirculator_closed";
}

function normalizeLampStatus(
	val: string | null | undefined,
): "normal" | "warning_replace_soon" | "expired_replace_now" {
	if (val === "warning_replace_soon" || val === "expired_replace_now") {
		return val;
	}
	return "normal";
}

function normalizeOperatingMode(
	val: string | null | undefined,
): "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent" {
	if (val === "continuous_presence" || val === "post_cleaning" || val === "intermittent") {
		return val;
	}
	return "pre_op_preparation";
}

function normalizeCleaningStatus(
	val: string | null | undefined,
): "completed" | "verified_by_inspector" | "rescheduled" {
	if (val === "verified_by_inspector" || val === "rescheduled") {
		return val;
	}
	return "completed";
}

function normalizeMeasurementPeriod(val: string | null | undefined): "morning" | "evening" {
	if (val === "evening") {
		return "evening";
	}
	return "morning";
}

export function mapRawBactericidalData(
	rawBacEquip: readonly RawBactericidalEquipmentDto[],
	rawBacLogs: readonly RawBactericidalLogDto[],
	ctx: FetchSanpinContext,
): { bactericidalEquipments: BactericidalEquipmentRecord[]; bactericidalSessions: BactericidalSessionRecord[] } {
	const bactericidalEquipments: BactericidalEquipmentRecord[] = rawBacEquip.map((eq: RawBactericidalEquipmentDto) => ({
		id: eq.id,
		roomName: eq.roomName,
		roomVolumeM3: Number(eq.roomVolumeM3) || 50,
		deviceBrand: eq.deviceBrand,
		serialNumber: eq.serialNumber,
		deviceType: normalizeBactericidalDeviceType(eq.deviceType),
		lampType: eq.lampType || "TUV 30W",
		lampCount: Number(eq.lampCount) || 2,
		maxLampHours: Number(eq.maxLampHours) || 8000,
		totalOperatingHours: Number(eq.totalOperatingHours) || 0,
		remainingLampHours: Number(eq.remainingLampHours) || (Number(eq.maxLampHours || 8000) - Number(eq.totalOperatingHours || 0)),
		remainingLampPercent: Number(eq.remainingLampPercent) || 100,
		lampStatus: normalizeLampStatus(eq.lampStatus),
		isLampCritical: Boolean(eq.isLampCritical),
		lastLampReplacementDate: eq.lastLampReplacementDate || undefined,
		notes: eq.notes || undefined,
	}));

	const bactericidalSessions: BactericidalSessionRecord[] = rawBacLogs.map((l: RawBactericidalLogDto, idx: number) => ({
		id: l.id || `sess-${idx + 1}`,
		equipmentId: l.equipmentId,
		roomName: l.roomName || "Кабинет",
		deviceBrand: l.deviceBrand || "Дезар-Кронт",
		date: l.date,
		sessionStartTime: l.sessionStartTime || "08:00",
		sessionEndTime: l.sessionEndTime || "08:30",
		durationMinutes: Number(l.durationMinutes) || 30,
		durationHours: Number(l.durationHours) || Number((Number(l.durationMinutes || 30) / 60).toFixed(2)) || 0.5,
		operatingMode: normalizeOperatingMode(l.operatingMode),
		cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession) || 0,
		operatorStaffFullName: l.operatorName || ctx.appLogic?.activeDoctor?.fullName || "Оператор / Медсестра",
	}));

	return { bactericidalEquipments, bactericidalSessions };
}

export function mapRawCleaningAndTemp(
	rawCleaning: readonly RawGeneralCleaningDto[],
	rawTempLogs: readonly RawTemperatureLogDto[],
): { generalCleanings: GeneralCleaningJournalRecord[]; temperatureLogs: TemperatureHumidityLogRecord[] } {
	const generalCleanings: GeneralCleaningJournalRecord[] = rawCleaning.map((r: RawGeneralCleaningDto, idx: number) => ({
		id: r.id || `clean-${idx + 1}`,
		roomType: "surgical",
		roomName: r.roomName,
		scheduledDate: r.scheduledDate,
		actualDateTime: r.actualDateTime,
		treatedAreaM2: Number(r.treatedAreaM2) || 32.5,
		disinfectantName: r.disinfectantName,
		activeIngredient: r.activeIngredient || "ЧАС + Альдегиды",
		solutionConcentrationPercent: Number(r.solutionConcentrationPercent) || 1.5,
		applicationMethodRu: r.applicationMethod === "spraying" ? "Орошение" : "Двукратное протирание",
		exposureTimeMinutes: Number(r.exposureTimeMinutes) || 60,
		uvIrradiationMinutes: Number(r.uvIrradiationMinutes) || 60,
		ventilationMinutes: Number(r.ventilationMinutes) || 15,
		operatorStaffFullName: r.operatorName || "Медсестра / Санитар",
		inspectorStaffFullName: r.inspectorName || undefined,
		isInspectorVerified: Boolean(r.inspectorName || r.status === "verified_by_inspector"),
		status: normalizeCleaningStatus(r.status),
		notes: r.notes || undefined,
	}));

	const temperatureLogs: TemperatureHumidityLogRecord[] = rawTempLogs.map((t: RawTemperatureLogDto, idx: number) => ({
		id: t.id || `temp-${idx + 1}`,
		measurementDate: t.measurementDate,
		measurementPeriod: normalizeMeasurementPeriod(t.measurementPeriod),
		equipmentName: t.equipmentName || "Фармацевтический холодильник Pozis",
		location: t.location || "ЦСО / Процедурный кабинет",
		meterDeviceName: t.equipmentType || "Термометр ТМН-1",
		meterSerialNumber: undefined,
		temperatureCelsius: Number(t.temperatureCelsius) || 4.0,
		relativeHumidityPercent: t.relativeHumidityPercent ? Number(t.relativeHumidityPercent) : undefined,
		targetTempMinCelsius: Number(t.targetTempMin) || 2,
		targetTempMaxCelsius: Number(t.targetTempMax) || 8,
		isWithinNorm: t.isWithinNorm ?? true,
		deviationReason: t.deviationReason || undefined,
		correctiveAction: t.correctiveAction || undefined,
		operatorStaffFullName: t.operatorName || "Оператор ЦСО",
		notes: t.notes || undefined,
	}));

	return { generalCleanings, temperatureLogs };
}
