import type { ConsolidatedSanpinJournalData } from "@dental/shared";
import { mapRawPsoRecords, mapRawSterilizersAndCycles } from "./sanpinConsolidatedMappers.js";
import { mapRawBactericidalData, mapRawCleaningAndTemp } from "./sanpinConsolidatedSecondaryMappers.js";

export interface FetchSanpinContext {
	auth?: {
		denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>;
	} | null;
	appLogic?: any;
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
		fetch("/api/registers/sterilization", { headers }),
		fetch("/api/registers/sterilizers/equipments", { headers }),
		fetch("/api/registers/bactericidal/logs", { headers }),
		fetch("/api/registers/bactericidal/equipments", { headers }),
		fetch("/api/registers/cleaning", { headers }),
		fetch("/api/registers/temperature-humidity/logs", { headers }),
	]);

	const rawPso: any[] = psoRes.status === "fulfilled" && psoRes.value.ok ? await psoRes.value.json().catch(() => []) : [];
	const rawSterilization: any[] = sterilizationRes.status === "fulfilled" && sterilizationRes.value.ok ? await sterilizationRes.value.json().catch(() => []) : [];
	const rawSterilizers: any[] = sterilizersRes.status === "fulfilled" && sterilizersRes.value.ok ? await sterilizersRes.value.json().catch(() => []) : [];
	const rawBacLogs: any[] = bacLogsRes.status === "fulfilled" && bacLogsRes.value.ok ? await bacLogsRes.value.json().catch(() => []) : [];
	const rawBacEquip: any[] = bacEquipRes.status === "fulfilled" && bacEquipRes.value.ok ? await bacEquipRes.value.json().catch(() => []) : [];
	const rawCleaning: any[] = cleaningRes.status === "fulfilled" && cleaningRes.value.ok ? await cleaningRes.value.json().catch(() => []) : [];
	const rawTempLogs: any[] = tempLogsRes.status === "fulfilled" && tempLogsRes.value.ok ? await tempLogsRes.value.json().catch(() => []) : [];

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
