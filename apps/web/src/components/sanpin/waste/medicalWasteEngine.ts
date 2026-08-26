/**
 * ============================================================================
 * MEDICAL WASTE ACCOUNTING & TRANSPORT TRANSFER ACT ENGINE
 * Математический и учетный движок расчета веса (брутто, тара, нетто), генерации
 * штрихкодов СанПиН, контроля сроков хранения и формирования актов передачи.
 * ============================================================================
 */

import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
	type DecontaminationMethodType,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";

export interface MedicalWasteJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly wasteClass: MedicalWasteClassId;
	readonly departmentNameRu: string;
	readonly packageType: MedicalWastePackagingTypeId;
	readonly packageCount: number;
	readonly grossWeightKg: number;
	readonly tareWeightKg: number;
	readonly netWeightKg: number;
	readonly sealNumber?: string | undefined;
	readonly barcode: string;
	readonly decontaminationMethod: DecontaminationMethodType;
	readonly decontamDisinfectantName?: string | undefined;
	readonly decontamAutoclaveCycleId?: string | undefined;
	readonly storageLocation: WasteStorageLocationId;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly status: "accumulating" | "transferred_for_disposal";
	readonly transferActNumber?: string | undefined;
	readonly notes?: string | undefined;
}

export interface MedicalWasteTransferAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly clinicInfo: {
		readonly name: string;
		readonly inn: string;
		readonly ogrn: string;
		readonly address: string;
		readonly responsiblePerson: string;
		readonly responsiblePosition: string;
	};
	readonly disposalCompanyInfo: {
		readonly name: string;
		readonly inn: string;
		readonly licenseNumber: string;
		readonly contractNumber: string;
		readonly contractDate: string;
		readonly driverFullName: string;
		readonly vehiclePlateNumber: string;
	};
	readonly transferredRecords: readonly MedicalWasteJournalRecord[];
	readonly totalsByClass: Record<
		MedicalWasteClassId,
		{ count: number; totalNetWeightKg: number; totalGrossWeightKg: number }
	>;
	readonly totalNetWeightKg: number;
	readonly totalPackagesCount: number;
}

export interface StorageValidationResult {
	readonly isExpired: boolean;
	readonly hoursElapsed: number;
	readonly hoursRemaining: number;
	readonly maxHoursAllowed: number;
	readonly status: "optimal" | "warning_approaching_limit" | "expired";
	readonly statusMessageRu: string;
}

/**
 * 1. Расчет веса нетто с точностью до 0.01 кг
 */
export function calculateWasteNetWeight(grossKg: number, tareKg: number): number {
	const g = Math.max(0, Number(grossKg) || 0);
	const t = Math.max(0, Number(tareKg) || 0);
	const net = Math.max(0, g - t);
	return Math.round(net * 100) / 100;
}

/**
 * Расчет полной весовой структуры пакета/контейнера
 */
export function calculateWasteWeights(
	grossKg: number,
	packagingType: MedicalWastePackagingTypeId,
	customTareKg?: number | undefined,
): {
	grossKg: number;
	tareKg: number;
	netKg: number;
} {
	const packaging = getMedicalWastePackaging(packagingType);
	const tareKg = customTareKg !== undefined && customTareKg >= 0
		? customTareKg
		: packaging.defaultTareWeightKg;

	const g = Math.round(Math.max(0, Number(grossKg) || 0) * 100) / 100;
	const t = Math.round(tareKg * 100) / 100;
	const netKg = calculateWasteNetWeight(g, t);

	return {
		grossKg: g,
		tareKg: t,
		netKg,
	};
}

/**
 * 2. Генератор номера одноразовой пломбы-стяжки (СанПиН 2.1.3684-21)
 */
export function generateWasteSealNumber(
	wasteClass: MedicalWasteClassId,
	counter: number = Math.floor(1000 + Math.random() * 9000),
	year: number = new Date().getFullYear(),
): string {
	const letter =
		wasteClass === "class_A"
			? "А"
			: wasteClass === "class_B"
				? "Б"
				: wasteClass === "class_V"
					? "В"
					: "Г";
	const padded = counter.toString().padStart(5, "0");
	return `ПЛ-${letter}-${year}-${padded}`;
}

/**
 * 3. Генератор штрихкода для маркировки бирки пакета/контейнера
 * Формат: WASTE-<CLASS>-<DEPT>-<YYYYMMDD>-<ID>
 */
export function generateWasteBarcode(
	wasteClass: MedicalWasteClassId,
	departmentCode = "TER",
	dateStr: string = new Date().toISOString().slice(0, 10),
	uniqueSeq?: number | undefined,
): string {
	const classPart =
		wasteClass === "class_A"
			? "CLASS_A"
			: wasteClass === "class_B"
				? "CLASS_B"
				: wasteClass === "class_V"
					? "CLASS_V"
					: "CLASS_G";
	const cleanDept = departmentCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "CAB1";
	const datePart = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	const seq = uniqueSeq ?? Math.floor(1000 + Math.random() * 9000);
	return `WASTE-${classPart}-${cleanDept}-${datePart}-${seq}`;
}

/**
 * Парсер и валидатор штрихкода отходов
 */
export function parseWasteBarcode(barcode: string): {
	isValid: boolean;
	wasteClass?: MedicalWasteClassId | undefined;
	departmentCode?: string | undefined;
	dateStr?: string | undefined;
	sequenceId?: string | undefined;
} {
	const trimmed = barcode.trim();
	const match = trimmed.match(/^WASTE-(CLASS_A|CLASS_B|CLASS_V|CLASS_G)-([A-Z0-9]{2,6})-(\d{8})-(\d+)$/);
	if (!match) {
		return { isValid: false };
	}

	const classPart = match[1];
	const dept = match[2];
	const rawDate = match[3];
	const seq = match[4];

	let wasteClass: MedicalWasteClassId = "class_B";
	if (classPart === "CLASS_A") wasteClass = "class_A";
	else if (classPart === "CLASS_V") wasteClass = "class_V";
	else if (classPart === "CLASS_G") wasteClass = "class_G";

	const formattedDate = rawDate
		? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
		: undefined;

	return {
		isValid: true,
		wasteClass,
		departmentCode: dept,
		dateStr: formattedDate,
		sequenceId: seq,
	};
}

/**
 * 4. Контроль сроков временного накопления отходов по СанПиН 2.1.3684-21
 */
export function validateStorageDuration(
	accumulationTimestamp: string,
	storageLocation: WasteStorageLocationId,
	checkTimestamp: string = new Date().toISOString(),
): StorageValidationResult {
	const startMs = new Date(accumulationTimestamp).getTime();
	const checkMs = new Date(checkTimestamp).getTime();

	if (Number.isNaN(startMs) || Number.isNaN(checkMs)) {
		return {
			isExpired: false,
			hoursElapsed: 0,
			hoursRemaining: 24,
			maxHoursAllowed: 24,
			status: "optimal",
			statusMessageRu: "Некорректная дата накопления",
		};
	}

	const locationDef = getWasteStorageLocation(storageLocation);
	const maxHoursAllowed = locationDef.maxAllowedStorageHours;

	const hoursElapsed = Math.max(0, Math.round(((checkMs - startMs) / (1000 * 60 * 60)) * 10) / 10);
	const hoursRemaining = Math.round((maxHoursAllowed - hoursElapsed) * 10) / 10;
	const isExpired = hoursElapsed > maxHoursAllowed;

	let status: "optimal" | "warning_approaching_limit" | "expired" = "optimal";
	let statusMessageRu = `Срок накопления в норме (осталось ${hoursRemaining} ч)`;

	if (isExpired) {
		status = "expired";
		statusMessageRu = `ВНИМАНИЕ! Превышен нормативный срок накопления на ${Math.abs(hoursRemaining)} ч! Требуется немедленный вывоз или перемещение в холодильник (СанПиН 2.1.3684-21 п. 174).`;
	} else if (hoursRemaining <= maxHoursAllowed * 0.25 || hoursRemaining <= 4) {
		status = "warning_approaching_limit";
		statusMessageRu = `Предупреждение: до истечения срока накопления осталось ${hoursRemaining} ч (режим: ${locationDef.nameRu})`;
	}

	return {
		isExpired,
		hoursElapsed,
		hoursRemaining,
		maxHoursAllowed,
		status,
		statusMessageRu,
	};
}

/**
 * 5. Формирование Акта приема-передачи медицинских отходов лицензированной компании
 */
export function generateMedicalWasteTransferAct(params: {
	actNumber: string;
	actDate?: string | undefined;
	records: readonly MedicalWasteJournalRecord[];
	clinicInfo?: {
		name?: string | undefined;
		inn?: string | undefined;
		ogrn?: string | undefined;
		address?: string | undefined;
		responsiblePerson?: string | undefined;
		responsiblePosition?: string | undefined;
	} | undefined;
	disposalCompanyInfo?: {
		name?: string | undefined;
		inn?: string | undefined;
		licenseNumber?: string | undefined;
		contractNumber?: string | undefined;
		contractDate?: string | undefined;
		driverFullName?: string | undefined;
		vehiclePlateNumber?: string | undefined;
	} | undefined;
}): MedicalWasteTransferAct {
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);

	const defaultClinic = {
		name: params.clinicInfo?.name || "ООО «Стоматологическая клиника ДЕНТЕ»",
		inn: params.clinicInfo?.inn || "7701234567",
		ogrn: params.clinicInfo?.ogrn || "1027700123456",
		address: params.clinicInfo?.address || "г. Москва, ул. Клиническая, д. 10",
		responsiblePerson: params.clinicInfo?.responsiblePerson || "Смирнова Анна Викторовна",
		responsiblePosition: params.clinicInfo?.responsiblePosition || "Главная медицинская сестра",
	};

	const defaultDisposal = {
		name: params.disposalCompanyInfo?.name || "ООО «ЭкоМедУтилизация-Сервис»",
		inn: params.disposalCompanyInfo?.inn || "7709876543",
		licenseNumber: params.disposalCompanyInfo?.licenseNumber || "№ Л020-00113-77/00154892 от 14.02.2023",
		contractNumber: params.disposalCompanyInfo?.contractNumber || "ДОГ-УТИЛ-2026/08-ДЕНТЕ",
		contractDate: params.disposalCompanyInfo?.contractDate || "2026-01-15",
		driverFullName: params.disposalCompanyInfo?.driverFullName || "Кузнецов Михаил Сергеевич",
		vehiclePlateNumber: params.disposalCompanyInfo?.vehiclePlateNumber || "А 784 МЕ 777 (спецавтомобиль)",
	};

	const totalsByClass: Record<
		MedicalWasteClassId,
		{ count: number; totalNetWeightKg: number; totalGrossWeightKg: number }
	> = {
		class_A: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_B: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_V: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
		class_G: { count: 0, totalNetWeightKg: 0, totalGrossWeightKg: 0 },
	};

	let totalNetWeightKg = 0;
	let totalPackagesCount = 0;

	for (const rec of params.records) {
		const entry = totalsByClass[rec.wasteClass];
		if (entry) {
			entry.count += rec.packageCount;
			entry.totalNetWeightKg = Math.round((entry.totalNetWeightKg + rec.netWeightKg) * 100) / 100;
			entry.totalGrossWeightKg = Math.round((entry.totalGrossWeightKg + rec.grossWeightKg) * 100) / 100;
		}
		totalNetWeightKg = Math.round((totalNetWeightKg + rec.netWeightKg) * 100) / 100;
		totalPackagesCount += rec.packageCount;
	}

	return {
		actNumber: params.actNumber,
		actDate,
		clinicInfo: defaultClinic,
		disposalCompanyInfo: defaultDisposal,
		transferredRecords: params.records,
		totalsByClass,
		totalNetWeightKg,
		totalPackagesCount,
	};
}

/**
 * 6. Экспорт Технологического журнала учета отходов в CSV (RFC 4180 c UTF-8 BOM)
 */
export function exportWasteJournalToCsv(records: readonly MedicalWasteJournalRecord[]): string {
	const headers = [
		"№ п/п",
		"Дата и время накопления",
		"Класс отходов",
		"Подразделение",
		"Тип тары",
		"Кол-во упаковок",
		"Вес брутто, кг",
		"Вес тары, кг",
		"Вес нетто, кг",
		"Номер пломбы",
		"Штрихкод",
		"Метод обеззараживания",
		"Место накопления",
		"Ответственное лицо",
		"Статус",
		"№ Акта передачи",
	];

	const rows = records.map((r, index) => {
		const classDef = getMedicalWasteClass(r.wasteClass);
		const packDef = getMedicalWastePackaging(r.packageType);
		const decontamDef = getDecontaminationMethod(r.decontaminationMethod);
		const storageDef = getWasteStorageLocation(r.storageLocation);

		return [
			(index + 1).toString(),
			r.timestamp,
			`"${classDef.nameRu}"`,
			`"${r.departmentNameRu}"`,
			`"${packDef.nameRu}"`,
			r.packageCount.toString(),
			r.grossWeightKg.toFixed(2),
			r.tareWeightKg.toFixed(2),
			r.netWeightKg.toFixed(2),
			`"${r.sealNumber || ""}"`,
			`"${r.barcode}"`,
			`"${decontamDef.nameRu}${r.decontamDisinfectantName ? ` (${r.decontamDisinfectantName})` : ""}"`,
			`"${storageDef.nameRu}"`,
			`"${r.operatorStaffFullName}, ${r.operatorStaffPosition}"`,
			r.status === "accumulating" ? "Накопление" : "Передано на вывоз",
			`"${r.transferActNumber || ""}"`,
		];
	});

	const totalNet = records.reduce((acc, r) => acc + r.netWeightKg, 0);
	const totalPackages = records.reduce((acc, r) => acc + r.packageCount, 0);

	const totalRow = [
		"ИТОГО ПО ЖУРНАЛУ",
		"",
		"",
		"",
		"",
		totalPackages.toString(),
		"",
		"",
		totalNet.toFixed(2),
		"",
		"",
		"",
		"",
		"",
		"",
		"",
	];

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";")), totalRow.join(";")].join("\r\n");

	return `\uFEFF${csvContent}`;
}

/**
 * 7. Генератор официального печатного Акта приема-передачи медицинских отходов (HTML для А4)
 */
export function generateWasteTransferActHtml(act: MedicalWasteTransferAct): string {
	const rowsHtml = act.transferredRecords
		.map((r, i) => {
			const classDef = getMedicalWasteClass(r.wasteClass);
			const packDef = getMedicalWastePackaging(r.packageType);
			const decontamDef = getDecontaminationMethod(r.decontaminationMethod);

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.timestamp}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">Класс ${classDef.letterCode}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.departmentNameRu}</td>
				<td style="border: 1px solid #000; padding: 4px;">${packDef.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.packageCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.netWeightKg.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.sealNumber || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${decontamDef.nameRu}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт приема-передачи медицинских отходов № ${act.actNumber}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.3; color: #000; }
		.header { text-align: center; font-weight: bold; margin-bottom: 12px; }
		.title { font-size: 13pt; text-transform: uppercase; margin-bottom: 4px; }
		.parties { margin-bottom: 12px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
		th { border: 1px solid #000; padding: 5px; background: #f0f0f0; font-size: 9pt; }
		.totals { margin-bottom: 16px; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; }
		.sign-col { width: 46%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="title">АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ № ${act.actNumber}</div>
		<div>к Договору на оказание услуг по сбору, транспортированию и обезвреживанию отходов № ${act.disposalCompanyInfo.contractNumber} от ${act.disposalCompanyInfo.contractDate} г.</div>
		<div style="margin-top: 6px;">Дата составления: <strong>${act.actDate} г.</strong></div>
	</div>

	<div class="parties">
		<strong>Сдал (Клиника):</strong> ${act.clinicInfo.name}, ИНН ${act.clinicInfo.inn}, ОГРН ${act.clinicInfo.ogrn}, адрес: ${act.clinicInfo.address}, в лице ${act.clinicInfo.responsiblePosition} ${act.clinicInfo.responsiblePerson}.<br>
		<strong>Принял (Спецоператор):</strong> ${act.disposalCompanyInfo.name}, ИНН ${act.disposalCompanyInfo.inn}, Лицензия ${act.disposalCompanyInfo.licenseNumber}, водитель/экспедитор ${act.disposalCompanyInfo.driverFullName}, автотранспорт: ${act.disposalCompanyInfo.vehiclePlateNumber}.
	</div>

	<p>В соответствии с требованиями СанПиН 2.1.3684-21 Стороны подтверждают передачу следующей партии медицинских отходов:</p>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Дата накопления</th>
				<th>Класс</th>
				<th>Подразделение</th>
				<th>Вид тары</th>
				<th>Мест</th>
				<th>Масса нетто (кг)</th>
				<th>№ пломбы</th>
				<th>Метод обеззараживания</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="5" style="border: 1px solid #000; padding: 5px; text-align: right;">ВСЕГО ПЕРЕДАНО:</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: center;">${act.totalPackagesCount}</td>
				<td style="border: 1px solid #000; padding: 5px; text-align: right;">${act.totalNetWeightKg.toFixed(2)}</td>
				<td colspan="2" style="border: 1px solid #000; padding: 5px;"></td>
			</tr>
		</tbody>
	</table>

	<div class="totals">
		Сводка по классам опасности:<br>
		- Класс А (эпидемиологически безопасные): ${act.totalsByClass.class_A.count} мест, масса ${act.totalsByClass.class_A.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс Б (эпидемиологически опасные): ${act.totalsByClass.class_B.count} мест, масса ${act.totalsByClass.class_B.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс В (чрезвычайно опасные): ${act.totalsByClass.class_V.count} мест, масса ${act.totalsByClass.class_V.totalNetWeightKg.toFixed(2)} кг.<br>
		- Класс Г (токсикологически опасные): ${act.totalsByClass.class_G.count} мест, масса ${act.totalsByClass.class_G.totalNetWeightKg.toFixed(2)} кг.<br>
		<strong>Общая масса нетто: ${act.totalNetWeightKg.toFixed(2)} кг (${act.totalPackagesCount} упаковочных мест/контейнеров).</strong>
	</div>

	<p>Претензий по целостности тары, пломбировке и маркировке Спецоператор не имеет. Отходы транспортируются на специализированный объект обезвреживания.</p>

	<div class="signatures">
		<div class="sign-col">
			<strong>СДАЛ:</strong><br>
			${act.clinicInfo.responsiblePosition}<br>
			________________ / ${act.clinicInfo.responsiblePerson} /<br>
			М.П.
		</div>
		<div class="sign-col">
			<strong>ПРИНЯЛ:</strong><br>
			Водитель-экспедитор Спецоператора<br>
			________________ / ${act.disposalCompanyInfo.driverFullName} /<br>
			М.П.
		</div>
	</div>
</body>
</html>`;
}

/**
 * 8. Генератор термоэтикетки (58x40 мм) для маркировки пакетов/баков медотходов СанПиН 2.1.3684-21
 */
export interface WasteThermalStickerOptions {
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly disposalContractNo?: string;
}

export function generateWasteThermalStickerHtml(
	record: MedicalWasteJournalRecord,
	options: WasteThermalStickerOptions = {},
): string {
	const classDef = getMedicalWasteClass(record.wasteClass);
	const packDef = getMedicalWastePackaging(record.packageType);
	const decontamDef = getDecontaminationMethod(record.decontaminationMethod);
	const clinic = options.clinicName || "ООО «ДЕНТЕ КЛИНИК»";
	const contract = options.disposalContractNo || "ДОГ-МЕД-2026/04";

	const bagColorText =
		record.wasteClass === "class_B"
			? "ЖЕЛТЫЙ ПАКЕТ / БАК"
			: record.wasteClass === "class_V"
				? "КРАСНЫЙ ПАКЕТ / БАК"
				: record.wasteClass === "class_A"
					? "БЕЛЫЙ ПАКЕТ"
					: "ЧЕРНЫЙ СПЕЦКОНТЕЙНЕР";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Этикетка 58x40 мм СанПиН ${record.barcode}</title>
	<style>
		@page {
			size: 58mm 40mm;
			margin: 0;
		}
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			width: 58mm;
			height: 40mm;
			font-family: 'Arial', sans-serif;
			font-size: 7pt;
			line-height: 1.15;
			color: #000;
			padding: 1.5mm 2mm;
			background: #fff;
			overflow: hidden;
		}
		.header {
			font-size: 6.5pt;
			font-weight: bold;
			text-align: center;
			border-bottom: 1px solid #000;
			padding-bottom: 1px;
			margin-bottom: 1px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.class-badge {
			font-size: 8.5pt;
			font-weight: 900;
			text-align: center;
			border: 1.5px solid #000;
			padding: 1px 0;
			margin: 1px 0;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.grid-info {
			display: flex;
			justify-content: space-between;
			margin: 1px 0;
		}
		.field-label {
			font-size: 6pt;
			color: #333;
		}
		.field-val {
			font-size: 7.5pt;
			font-weight: bold;
		}
		.barcode-box {
			text-align: center;
			margin-top: 1px;
			border-top: 0.5px dashed #000;
			padding-top: 1px;
		}
		.barcode-font {
			font-family: 'Courier New', monospace;
			font-size: 7.5pt;
			font-weight: bold;
			letter-spacing: 0.5px;
		}
		.barcode-bars {
			height: 4.5mm;
			letter-spacing: -1px;
			font-size: 11pt;
			font-family: 'Libre Barcode 128', 'Courier New', monospace;
			overflow: hidden;
			line-height: 1;
		}
		.footer {
			font-size: 5.5pt;
			display: flex;
			justify-content: space-between;
			margin-top: 1px;
		}
	</style>
</head>
<body onload="window.print()">
	<div class="header">${clinic} • СанПиН 2.1.3684-21</div>
	<div class="class-badge">ОТХОДЫ КЛАСС ${classDef.letterCode} (${bagColorText})</div>

	<div class="grid-info">
		<div>
			<div class="field-label">Подразделение:</div>
			<div class="field-val" style="max-width: 32mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${record.departmentNameRu}</div>
		</div>
		<div style="text-align: right;">
			<div class="field-label">Масса НЕТТО:</div>
			<div class="field-val" style="font-size: 8.5pt;">${record.netWeightKg.toFixed(2)} кг</div>
		</div>
	</div>

	<div class="grid-info">
		<div>
			<div class="field-label">Дата/время:</div>
			<div class="field-val">${record.timestamp.replace("T", " ")}</div>
		</div>
		<div style="text-align: right;">
			<div class="field-label">Пломба / Мест:</div>
			<div class="field-val">${record.sealNumber || "Б/П"} (${record.packageCount} шт)</div>
		</div>
	</div>

	<div style="font-size: 5.8pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
		<strong>Обезвреживание:</strong> ${decontamDef.nameRu.split("(")[0]}
	</div>

	<div class="barcode-box">
		<div class="barcode-bars">||||| | |||| || |||||| | ||||| ||||</div>
		<div class="barcode-font">${record.barcode}</div>
	</div>

	<div class="footer">
		<span>Отв: ${record.operatorStaffFullName}</span>
		<span>${contract}</span>
	</div>
</body>
</html>`;
}
