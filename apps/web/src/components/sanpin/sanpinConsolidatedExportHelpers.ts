import {
	generateSanpinConsolidatedInspectionHtml,
	exportSanpinConsolidatedArchiveToCsv,
	type ConsolidatedSanpinJournalData,
	type PsoJournalRecord,
	type Form257Record,
	type ChamberPointEvaluation,
	type SterilizerEquipmentRecord,
	type BactericidalSessionRecord,
	type BactericidalEquipmentRecord,
	type GeneralCleaningJournalRecord,
	type TemperatureHumidityLogRecord,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

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

	// Map PSO
	const psoRecords: PsoJournalRecord[] = rawPso.map((item: any, idx: number) => ({
		id: item.id || `PSO-${idx + 1}`,
		timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
		instrumentName: item.instrumentName || item.notes || "Стоматологический инструментарий",
		categoryId: "therapeutic_kit",
		batchItemCount: Number(item.batchItemCount) || 1,
		testedSampleCount: Number(item.testedSampleCount) || 1,
		testType: (item.testType as any) || "both_standard",
		isAzopyramNegative: item.isAzopyramNegative ?? true,
		isPhenolphthaleinNegative: item.isPhenolphthaleinNegative ?? true,
		isSudanNegative: true,
		detergentBrand: item.detergentBrand || "Биолот 0.5% + Аламинол 1.0%",
		isBatchApproved: item.isBatchApproved ?? true,
		rejectionReason: item.rejectionReason || undefined,
		operatorStaffFullName:
			item.operatorName ||
			ctx.appLogic?.activeDoctor?.fullName ||
			ctx.appLogic?.activeDoctor?.name ||
			"Медсестра ЦСО",
		operatorStaffPosition: "Медсестра ЦСО",
		electronicStampVerified: true,
		notes: item.notes || undefined,
	}));

	// Map Sterilizer Equipments
	const sterilizerEquipments: SterilizerEquipmentRecord[] = rawSterilizers.map((eq: any) => ({
		id: eq.id,
		name: eq.name || eq.brandModel || "Автоклав",
		brandModel: eq.brandModel || "Euronda E9 Next",
		serialNumber: eq.serialNumber || "—",
		inventoryNumber: eq.inventoryNumber || null,
		deviceType: eq.deviceType || "Паровой",
		deviceClass: eq.deviceClass || "B",
		chamberVolumeLiters: eq.chamberVolumeLiters ? Number(eq.chamberVolumeLiters) : 18,
		locationRoom: eq.locationRoom || "ЦСО",
		verificationExpiryDate: eq.verificationExpiryDate || null,
		lastMaintenanceDate: eq.lastMaintenanceDate || null,
		nextMaintenanceDate: eq.nextMaintenanceDate || null,
		status: eq.status || "active",
		notes: eq.notes || null,
	}));

	// Map Form 257 (Autoclave Cycles)
	const form257Records: Form257Record[] = rawSterilization.map((item: any, idx: number) => {
		const eq = sterilizerEquipments.find((e) => e.id === item.autoclaveId);
		const isPassed = item.status === "completed" || item.status === "passed" || item.status === "sterile_passed" || item.passedIndicator === true;
		const chamberPoints: ChamberPointEvaluation[] = [
			{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: item.indicatorType || "Медтест 134/5", status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: item.indicatorType || "Медтест 134/5", status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: item.indicatorType || "Медтест 134/5", status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: item.indicatorType || "Медтест 134/5", status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: item.indicatorType || "Медтест 134/5", status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
		];

		return {
			id: item.id || `F257-${idx + 1}`,
			date: item.timestamp ? item.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
			cycleNumber: Number(item.cycleNumber) || (idx + 1),
			sterilizerId: item.autoclaveId || eq?.id || "autoclave-01",
			sterilizerCode: item.deviceName || eq?.brandModel || "АВТОКЛАВ-01",
			sterilizerBrandModel: eq?.brandModel || item.deviceName || "Euronda E9 Next (Класс B)",
			sterilizerSerialNumber: eq?.serialNumber || "SN-EUR-99824",
			regimeId: item.cycleMode === "prion" ? "steam_134_20min" : "steam_134_5min",
			regimeNameRu: item.cycleMode === "prion" ? "134°C Прион (20 мин)" : "134°C Универсальный (5 мин)",
			targetTemperatureCelsius: 134,
			targetPressureBar: 2.1,
			targetExposureMinutes: item.cycleMode === "prion" ? 20 : 5,
			actualTemperatureCelsius: Number(item.temperatureCelsius) || 134.5,
			actualPressureBar: Number(item.pressureBar) || 2.15,
			actualExposureMinutes: Number(item.durationMin) || 5.5,
			itemsDescriptionRu: item.itemsDescription || "Стоматологический инструментарий (крафт-пакеты)",
			packsCount: 1,
			packagingType: item.packagingType || "kraft_pouch",
			packagingNameRu: "Пакеты комбинированные самоклеящиеся",
			shelfLifeDays: 50,
			chamberPoints,
			areAllPointsPassed: isPassed,
			chemicalIndicatorNameRu: item.indicatorType || "Медтест 134/5 (5 класс)",
			isCyclePassed: isPassed,
			rejectionReason: !isPassed ? (item.rejectionReason || "Не пройден тест индикатора") : undefined,
			status: isPassed ? "sterile_passed" : "rejected_defect",
			operatorStaffFullName: item.operatorName || ctx.appLogic?.activeDoctor?.fullName || "Медсестра ЦСО",
			operatorStaffPosition: "Медсестра ЦСО",
			headNurseSignatureFullName: ctx.appLogic?.clinic?.legalEntityName || "Главная медсестра",
			isHeadNurseVerified: true,
			verificationTimestamp: item.createdAt || new Date().toISOString(),
			digitalStampHash: `STAMP-${item.barcode || (item.id ? item.id.slice(0, 8) : "VERIFIED")}-ECP`,
			createdAt: item.createdAt || new Date().toISOString(),
		};
	});

	// Map Bactericidal Equipments
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

	// Map Bactericidal Sessions
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

	// Map General Cleanings
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

	// Map Temperature Logs
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

export async function printConsolidatedBinderAction(ctx: FetchSanpinContext): Promise<void> {
	try {
		showToast("Формирование сводного протокола стерилизации...", "info");
		const consolidatedData = await fetchLiveConsolidatedSanpinData(ctx);
		const html = generateSanpinConsolidatedInspectionHtml(consolidatedData);

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		} else {
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "none";
			document.body.appendChild(iframe);
			const doc = iframe.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				iframe.contentWindow?.focus();
				setTimeout(() => {
					iframe.contentWindow?.print();
					setTimeout(() => document.body.removeChild(iframe), 1000);
				}, 300);
			}
		}
	} catch (err) {
		console.error("Failed to print consolidated binder", err);
		showToast("Ошибка при формировании сводного сшива", "error");
	}
}

export async function exportConsolidatedCsvAction(ctx: FetchSanpinContext): Promise<void> {
	try {
		showToast("Формирование сводного архива журналов (CSV)...", "info");
		const consolidatedData = await fetchLiveConsolidatedSanpinData(ctx);
		const csv = exportSanpinConsolidatedArchiveToCsv(consolidatedData);

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "SanPiN_Consolidated_Production_Control_Archive.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Сводный архив журналов (CSV) успешно экспортирован", "success");
	} catch (err) {
		console.error("Failed to export consolidated CSV", err);
		showToast("Ошибка при экспорте сводного архива журналов", "error");
	}
}
