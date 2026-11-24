import type { ConsolidatedSanpinJournalData } from "@dental/shared";
import {
	mapRawPsoRecords,
	mapRawSterilizersAndCycles,
	type RawPsoRecordDto,
	type RawSterilizerEquipmentDto,
	type RawSterilizationCycleDto,
} from "./sanpinConsolidatedMappers.js";
import {
	mapRawBactericidalData,
	mapRawCleaningAndTemp,
	type RawBactericidalEquipmentDto,
	type RawBactericidalLogDto,
	type RawGeneralCleaningDto,
	type RawTemperatureLogDto,
} from "./sanpinConsolidatedSecondaryMappers.js";

export interface SanpinAppLogicDoctorContext {
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
}

export interface SanpinAppLogicClinicContext {
	readonly clinicName?: string | null | undefined;
	readonly legalEntityName?: string | null | undefined;
	readonly ogrn?: string | null | undefined;
	readonly inn?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly licenseNumber?: string | null | undefined;
}

export interface SanpinAppLogicContext {
	readonly activeDoctor?: SanpinAppLogicDoctorContext | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinic?: SanpinAppLogicClinicContext | null | undefined;
	readonly clinicInfo?: {
		readonly name?: string | null | undefined;
		readonly address?: string | null | undefined;
	} | null | undefined;
}

export interface SanpinAuthContext {
	denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>;
	denteClinicalMutationHeaders?: (extra?: Record<string, string>) => Record<string, string>;
}

export interface FetchSanpinContext {
	readonly auth?: SanpinAuthContext | null | undefined;
	readonly appLogic?: SanpinAppLogicContext | null | undefined;
}

export interface SanpinRegisterSummary {
	readonly date?: string | undefined;
	readonly pso?: {
		readonly totalToday: number;
		readonly approvedToday: number;
	} | undefined;
	readonly sterilization?: {
		readonly totalCyclesToday: number;
		readonly passedToday: number;
		readonly activeDevices?: number | undefined;
		readonly fleet?: {
			readonly totalEquipments: number;
			readonly activeEquipments: number;
			readonly inMaintenance: number;
			readonly decommissioned: number;
			readonly verificationExpired: number;
		} | undefined;
	} | undefined;
	readonly bactericidal?: {
		readonly totalEquipments: number;
		readonly warningLamps: number;
		readonly expiredLamps: number;
	} | undefined;
	readonly wasteMonth?: readonly {
		readonly wasteClass: string;
		readonly totalKg: number;
		readonly totalPackages: number;
	}[] | undefined;
	readonly waste?: {
		readonly totalKgToday?: number | string | undefined;
	} | undefined;
	readonly temperature?: {
		readonly totalChecksToday: number;
		readonly deviationsToday: number;
	} | undefined;
	readonly biohazard?: {
		readonly totalIncidents: number;
		readonly criticalArvPending: number;
	} | undefined;
}

function isRawPsoRecordDto(item: unknown): item is RawPsoRecordDto {
	return typeof item === "object" && item !== null;
}

function isRawSterilizationCycleDto(item: unknown): item is RawSterilizationCycleDto {
	return typeof item === "object" && item !== null;
}

function isRawSterilizerEquipmentDto(item: unknown): item is RawSterilizerEquipmentDto {
	return typeof item === "object" && item !== null && "id" in item && typeof (item as { id: unknown }).id === "string";
}

function isRawBactericidalLogDto(item: unknown): item is RawBactericidalLogDto {
	return typeof item === "object" && item !== null;
}

function isRawBactericidalEquipmentDto(item: unknown): item is RawBactericidalEquipmentDto {
	return typeof item === "object" && item !== null && "id" in item && typeof (item as { id: unknown }).id === "string";
}

function isRawGeneralCleaningDto(item: unknown): item is RawGeneralCleaningDto {
	return typeof item === "object" && item !== null;
}

function isRawTemperatureLogDto(item: unknown): item is RawTemperatureLogDto {
	return typeof item === "object" && item !== null;
}

async function extractJsonList<T>(
	res: PromiseSettledResult<Response>,
	guard: (item: unknown) => item is T,
): Promise<T[]> {
	if (res.status === "fulfilled" && res.value.ok) {
		try {
			const data: unknown = await res.value.json();
			if (Array.isArray(data)) {
				return data.filter(guard);
			}
		} catch {
			return [];
		}
	}
	return [];
}

export async function fetchLiveConsolidatedSanpinData(ctx: FetchSanpinContext): Promise<ConsolidatedSanpinJournalData> {
	const headers: Record<string, string> = ctx.auth
		? ctx.auth.denteClinicalReadHeaders()
		: { "Content-Type": "application/json" };

	const [
		psoRes,
		sterilizationRes,
		sterilizersRes,
		bacLogsRes,
		bacEquipRes,
		cleaningRes,
		tempLogsRes,
	] = await Promise.allSettled([
		fetch("/api/registers/pso", { headers }),
		fetch("/api/sanpin/sterilization", { headers }),
		fetch("/api/sanpin/sterilization/equipments", { headers }),
		fetch("/api/registers/bactericidal/logs", { headers }),
		fetch("/api/registers/bactericidal/equipments", { headers }),
		fetch("/api/registers/cleaning", { headers }),
		fetch("/api/registers/temperature-humidity/logs", { headers }),
	]);

	const rawPso = await extractJsonList(psoRes, isRawPsoRecordDto);
	const rawSterilization = await extractJsonList(sterilizationRes, isRawSterilizationCycleDto);
	const rawSterilizers = await extractJsonList(sterilizersRes, isRawSterilizerEquipmentDto);
	const rawBacLogs = await extractJsonList(bacLogsRes, isRawBactericidalLogDto);
	const rawBacEquip = await extractJsonList(bacEquipRes, isRawBactericidalEquipmentDto);
	const rawCleaning = await extractJsonList(cleaningRes, isRawGeneralCleaningDto);
	const rawTempLogs = await extractJsonList(tempLogsRes, isRawTemperatureLogDto);

	const psoRecords = mapRawPsoRecords(rawPso, ctx);
	const { sterilizerEquipments, form257Records } = mapRawSterilizersAndCycles(rawSterilizers, rawSterilization, ctx);
	const { bactericidalEquipments, bactericidalSessions } = mapRawBactericidalData(rawBacEquip, rawBacLogs, ctx);
	const { generalCleanings, temperatureLogs } = mapRawCleaningAndTemp(rawCleaning, rawTempLogs);

	const now = new Date();
	const monthStart = `01.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
	const periodLabelRu = `за период с ${monthStart} по ${now.toLocaleDateString("ru-RU")}`;

	return {
		clinicInfo: {
			name: ctx.appLogic?.clinicName || ctx.appLogic?.clinic?.clinicName || "Стоматологическая клиника",
			ogrn: ctx.appLogic?.clinic?.ogrn || "",
			inn: ctx.appLogic?.clinic?.inn || "",
			address: ctx.appLogic?.clinic?.address || "",
			chiefDoctor: "Главный врач",
			headNurse: "Главная медсестра",
			licenseNumber: ctx.appLogic?.clinic?.licenseNumber || "",
			volumeNumber: 1,
		},
		periodLabelRu,
		psoRecords,
		form257Records,
		sterilizerEquipments,
		bactericidalSessions,
		bactericidalEquipments,
		generalCleanings,
		temperatureLogs,
	};
}
