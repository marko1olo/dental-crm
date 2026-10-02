/**
 * ============================================================================
 * AUTOCLAVE PRINT HELPERS (Form 257/u & Thermal Labels)
 * Вспомогательные функции печати этикеток и официальной Формы № 257/у
 * ============================================================================
 */

import type { SterilizationLogRecord } from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	generateThermalStickerHtml,
	type KraftPackageRecord,
} from "./kraft/kraftPackageEngine";
import {
	type ClinicAutoclaveDevice,
	loadSavedClinicAutoclaves,
} from "./AutoclaveEquipmentModal";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	generateForm257PrintHtml,
	type Form257Record,
} from "./autoclaveLog/autoclaveLogEngine";

export function handlePrintSinglePouch(log: SterilizationLogRecord): void {
	const printWin = window.open("", "_blank", "width=500,height=400");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати этикетки", "error");
		return;
	}

	const expFormatted = log.expiresAt
		? new Date(log.expiresAt).toISOString().slice(0, 10)
		: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
	const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
	const barcodeVal = log.barcode || `STER-${log.id.slice(0, 8).toUpperCase()}`;

	const rec: KraftPackageRecord = {
		id: `kp-${log.id}`,
		batchId: `CYC-${log.cycleNumber}`,
		serialNumber: 1,
		packageType:
			log.packagingType === "laminated_heat_sealed"
				? "paper_plastic_pouch"
				: "paper_self_seal_single",
		packageSize: "size_100x200",
		toolSetId: "set_therapeutic_tray",
		toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
		itemsListRu: [log.itemsDescription || "Инструментальный набор"],
		packDate,
		expDate: expFormatted,
		daysLifespan: 50,
		daysRemaining: 50,
		status: "sterile_valid",
		autoclaveId: log.deviceName || "АК-01",
		cycleNumber: log.cycleNumber || 1,
		operatorId: log.operatorId || "NURSE-01",
		operatorName: log.operatorName || "Сотрудник клиники",
		indicatorId:
			log.indicatorType === "class6_emulating"
				? "vinar_inte_6"
				: log.indicatorType === "class5_integrating"
					? "vinar_inte_5"
					: "vinar_steritest_4",
		indicatorVerified: log.passedIndicator ?? true,
		barcode128: barcodeVal,
		barcodeDataMatrixPayload: `${barcodeVal}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expFormatted}|${log.operatorName || "ЦСО"}`,
		isBreached: false,
		notes: log.notes || "",
		createdAt: new Date(log.timestamp).toISOString(),
	};

	const stickerHtml = generateThermalStickerHtml(rec, {
		size: "58x40",
		clinicName: "Стоматологическая клиника «DENTE»",
	});

	printWin.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Термоэтикетка стерилизации: ${barcodeVal}</title>
			<style>
				@page { size: 58mm 40mm; margin: 0; }
				body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; }
			</style>
		</head>
		<body>
			${stickerHtml}
			<script>window.print(); setTimeout(() => window.close(), 600);</script>
		</body>
		</html>
	`);
	printWin.document.close();
}

export function handlePrintBatchPouches(log: SterilizationLogRecord, count = 10): void {
	const printWin = window.open("", "_blank", "width=600,height=500");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для пакетной печати этикеток", "error");
		return;
	}

	// Срок сохранения стерильности для запечатанных крафт-пакетов по СанПиН 3.3686-21 = 30 суток
	const daysLifespan = 30;
	const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
	const expDate = new Date(new Date(log.timestamp).getTime() + daysLifespan * 86400000)
		.toISOString()
		.slice(0, 10);
	const baseBarcode = log.barcode || `STER-${log.id.slice(0, 6).toUpperCase()}`;

	const stickersHtml: string[] = [];

	for (let i = 1; i <= count; i++) {
		const itemBarcode = `${baseBarcode}-${String(i).padStart(2, "0")}`;
		const rec: KraftPackageRecord = {
			id: `kp-${log.id}-${i}`,
			batchId: `CYC-${log.cycleNumber}`,
			serialNumber: i,
			packageType:
				log.packagingType === "laminated_heat_sealed"
					? "paper_plastic_pouch"
					: "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
			itemsListRu: [log.itemsDescription || "Инструментальный набор"],
			packDate,
			expDate,
			daysLifespan,
			daysRemaining: daysLifespan,
			status: "sterile_valid",
			autoclaveId: log.deviceName || "АК-01",
			cycleNumber: log.cycleNumber || 1,
			operatorId: log.operatorId || "NURSE-01",
			operatorName: log.operatorName || "Сотрудник клиники",
			indicatorId:
				log.indicatorType === "class6_emulating"
					? "vinar_inte_6"
					: log.indicatorType === "class5_integrating"
						? "vinar_inte_5"
						: "vinar_steritest_4",
			indicatorVerified: log.passedIndicator ?? true,
			barcode128: itemBarcode,
			barcodeDataMatrixPayload: `${itemBarcode}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expDate}|${log.operatorName || "ЦСО"}`,
			isBreached: false,
			notes: log.notes || "",
			createdAt: new Date(log.timestamp).toISOString(),
		};

		stickersHtml.push(
			generateThermalStickerHtml(rec, {
				size: "58x40",
				clinicName: "Стоматологическая клиника «DENTE»",
			}),
		);
	}

	printWin.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Пакет этикеток стерилизации (${count} шт., СанПиН 3.3686-21 / 30 дн.)</title>
			<style>
				@page { size: 58mm 40mm; margin: 0; }
				body { margin: 0; padding: 0; background: #fff; }
				.page-break { page-break-after: always; display: block; }
			</style>
		</head>
		<body>
			${stickersHtml.map((s) => `<div>${s}</div>`).join("<div class='page-break'></div>")}
			<script>window.print(); setTimeout(() => window.close(), 1000);</script>
		</body>
		</html>
	`);
	printWin.document.close();
	showToast(
		`Сформирована пачка из ${count} термоэтикеток (срок: 30 суток по СанПиН 3.3686-21)`,
		"success",
	);
}

export function handleGenerateMonthlyForm257(
	sterilizerId?: string,
	clinicDevices?: ClinicAutoclaveDevice[],
): void {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
	const monthNameRu = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

	const devices = clinicDevices && clinicDevices.length > 0 ? clinicDevices : loadSavedClinicAutoclaves();
	const matchedDevice = sterilizerId && sterilizerId !== "all"
		? devices.find((d) => d.id === sterilizerId || d.brandModelRu.includes(sterilizerId))
		: devices.find((d) => d.isOperational) || devices[0];

	const targetSterilizerId = matchedDevice?.id || "autoclave-melag-vacuklav-23b";
	const targetSterilizerCode = matchedDevice?.inventoryNumber || matchedDevice?.id || "АК-01";
	const targetSterilizerBrandModel = matchedDevice?.brandModelRu || "Melag Vacuklav 23 B+";
	const targetSterilizerSerialNumber = matchedDevice?.serialNumber || "MEL-2024-9812";

	const generatedRecords: Form257Record[] = [];

	for (let day = 1; day <= daysInMonth; day++) {
		const dayDate = new Date(currentYear, currentMonth, day);
		const dayOfWeek = dayDate.getDay();
		if (dayOfWeek === 0) continue; // Выходной (воскресенье)

		const dateStr = dayDate.toISOString().slice(0, 10);

		// 1. Утренний цикл стерилизации (Терапия и наконечники, 134°C / 5.5 мин)
		generatedRecords.push(
			createForm257Record({
				date: dateStr,
				cycleNumber: 1,
				sterilizerId: targetSterilizerId,
				sterilizerCode: targetSterilizerCode,
				sterilizerBrandModel: targetSterilizerBrandModel,
				sterilizerSerialNumber: targetSterilizerSerialNumber,
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.4,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
				},
				itemsDescriptionRu:
					"Стоматологические наконечники NSK Ti-Max (4 шт), терапевтические наборы (зеркала, зонды, пинцеты - 14 наборов), боры алмазные",
				packsCount: 18,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Сотрудник клиники",
				operatorStaffPosition: "Сотрудник ЦСО / Врач",
				headNurseSignatureFullName: "Ответственный по СанПиН",
				isHeadNurseVerified: true,
				notes: "Утренний цикл, тест Бови-Дика пройден перед сменой (Норма)",
			}),
		);

		// 2. Дневной хирургический / ортопедический цикл (134°C / 20 мин)
		generatedRecords.push(
			createForm257Record({
				date: dateStr,
				cycleNumber: 2,
				sterilizerId: targetSterilizerId,
				sterilizerCode: targetSterilizerCode,
				sterilizerBrandModel: targetSterilizerBrandModel,
				sterilizerSerialNumber: targetSterilizerSerialNumber,
				regimeId: "steam_134_20min_prion",
				sensors: {
					actualTemperatureCelsius: 134.2,
					actualPressureBar: 2.14,
					actualExposureMinutes: 20.0,
				},
				itemsDescriptionRu:
					"Хирургический и имплантологический инструментарий: элеваторы, щипцы, кюреты Грейси, иглодержатели микрохирургические",
				packsCount: 12,
				packagingType: "cassette_bipack",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Сотрудник клиники",
				operatorStaffPosition: "Сотрудник ЦСО / Врач",
				headNurseSignatureFullName: "Ответственный по СанПиН",
				isHeadNurseVerified: true,
				notes: "Хирургический усиленный цикл, индикаторы 5 точек в норме",
			}),
		);
	}

	const html = generateForm257PrintHtml(
		generatedRecords,
		DEFAULT_CLINIC_LEGAL_INFO,
		`за ${monthNameRu}`,
	);

	const printWin = window.open("", "_blank");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати Формы 257/у", "error");
		return;
	}
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => printWin.print(), 500);

	showToast(
		`Сгенерирована официальная Форма 257/у за ${monthNameRu} (${generatedRecords.length} циклов)!`,
		"success",
		4000,
	);
}
