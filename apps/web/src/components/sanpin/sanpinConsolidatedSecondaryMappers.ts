import type {
	BactericidalEquipmentRecord,
	BactericidalSessionRecord,
	GeneralCleaningJournalRecord,
	TemperatureHumidityLogRecord,
} from "@dental/shared";

export function mapRawBactericidalData(
	rawBacEquip: any[],
	rawBacLogs: any[],
	ctx: any,
): { bactericidalEquipments: BactericidalEquipmentRecord[]; bactericidalSessions: BactericidalSessionRecord[] } {
	const bactericidalEquipments: BactericidalEquipmentRecord[] = rawBacEquip.map((eq: any) => ({
		id: eq.id,
		roomName: eq.roomName,
		roomVolumeM3: Number(eq.roomVolumeM3) || 50,
		deviceBrand: eq.deviceBrand,
		serialNumber: eq.serialNumber,
		deviceType: eq.deviceType || "recirculator_closed",
		lampType: eq.lampType || "TUV 30W",
		lampCount: Number(eq.lampCount) || 2,
		maxLampHours: Number(eq.maxLampHours) || 8000,
		totalOperatingHours: Number(eq.totalOperatingHours) || 0,
		remainingLampHours: Number(eq.remainingLampHours) || (Number(eq.maxLampHours) - Number(eq.totalOperatingHours)),
		remainingLampPercent: Number(eq.remainingLampPercent) || 100,
		lampStatus: eq.lampStatus || "normal",
		isLampCritical: Boolean(eq.isLampCritical),
		lastLampReplacementDate: eq.lastLampReplacementDate || undefined,
		notes: eq.notes || undefined,
	}));

	const bactericidalSessions: BactericidalSessionRecord[] = rawBacLogs.map((l: any, idx: number) => ({
		id: l.id || `sess-${idx + 1}`,
		equipmentId: l.equipmentId,
		roomName: l.roomName || "Кабинет",
		deviceBrand: l.deviceBrand || "Дезар-Кронт",
		date: l.date,
		sessionStartTime: l.sessionStartTime || "08:00",
		sessionEndTime: l.sessionEndTime || "08:30",
		durationMinutes: Number(l.durationMinutes) || 30,
		durationHours: Number(l.durationHours) || Number((Number(l.durationMinutes) / 60).toFixed(2)) || 0.5,
		operatingMode: (l.operatingMode as any) || "pre_op_preparation",
		cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession) || 0,
		operatorStaffFullName: l.operatorName || ctx.appLogic?.activeDoctor?.fullName || "Оператор / Медсестра",
	}));

	return { bactericidalEquipments, bactericidalSessions };
}

export function mapRawCleaningAndTemp(
	rawCleaning: any[],
	rawTempLogs: any[],
): { generalCleanings: GeneralCleaningJournalRecord[]; temperatureLogs: TemperatureHumidityLogRecord[] } {
	const generalCleanings: GeneralCleaningJournalRecord[] = rawCleaning.map((r: any, idx: number) => ({
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
		status: (r.status as any) || "completed",
		notes: r.notes || undefined,
	}));

	const temperatureLogs: TemperatureHumidityLogRecord[] = rawTempLogs.map((t: any, idx: number) => ({
		id: t.id || `temp-${idx + 1}`,
		measurementDate: t.measurementDate,
		measurementPeriod: (t.measurementPeriod as any) || "morning",
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
