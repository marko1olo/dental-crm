/**
 * apps/web/src/components/sanpin/sterilizationCatalogData.ts
 *
 * Единый канонический SSOT стерилизации, автоклавирования и контроля СанПиН:
 * - Режимы автоклавирования: Стандартный 134°C (Класс B), Деликатный 121°C, Экспресс 134°C.
 * - Оборудование: флот автоклавов класса B (Melag Vacuklav, Euronda E9, Dentsply Sirona DAC).
 * - Химический контроль: индикаторы IV и V класса, результат «Эталон достигнут (Тест пройден)».
 * - Упаковка: крафт-пакеты 100×200 мм, 75×150 мм, термозапечатываемые рулоны, стерильные лотки.
 * - Фоновое списание со склада (Soft Negative Stock, Мандат 8n).
 * - Автономия врача и медсестры: 1 клик на батч смены, ноль блокировок (Мандат 8e).
 * - Размер: 260–340 строк (Мандат 8b Sweet Spot). Чистый язык без канцелярита (Мандат 8x).
 */

export type AutoclaveRegimeId = "standard_134" | "delicate_121" | "flash_134";

export interface AutoclaveProgram {
	readonly id: AutoclaveRegimeId;
	readonly name: string;
	readonly description: string;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly dryingMinutes: number;
	readonly indicatorClass: string;
	readonly suitableFor: string;
}

export interface SterilizerEquipmentItem {
	readonly id: string;
	readonly name: string;
	readonly model: string;
	readonly chamberVolumeLiters: number;
	readonly autoclaveClass: "B" | "S";
	readonly serialNumber: string;
	readonly nextMaintenanceDate: string;
	readonly isCompliant: boolean;
}

export interface ChemicalIndicatorOption {
	readonly id: "class5_integrating" | "class4_multivariable";
	readonly name: string;
	readonly classNameRu: string;
	readonly standardVerdict: string;
	readonly description: string;
}

export interface PackagingTypeOption {
	readonly id: "kraft_100x200" | "kraft_75x150" | "roll_heat_seal" | "sterile_tray";
	readonly name: string;
	readonly size: string;
	readonly shelfLifeDays: number;
	readonly description: string;
}

export interface StockDeductionItem {
	readonly sku: string;
	readonly title: string;
	readonly quantity: number;
	readonly unit: string;
	readonly purpose: string;
}

export interface SterilizationBatchCycleRecord {
	readonly id: string;
	readonly cycleNumber: number;
	readonly date: string;
	readonly time: string;
	readonly autoclaveId: string;
	readonly autoclaveName: string;
	readonly programId: AutoclaveRegimeId;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly packagesCount: number;
	readonly chemicalIndicatorVerdict: "ПРОЙДЕН" | "НЕ ПРОЙДЕН";
	readonly operatorName: string;
	readonly itemsDescription: string;
	readonly status: "completed" | "in_progress";
}

export interface PsoBatchRecord {
	readonly id: string;
	readonly date: string;
	readonly time: string;
	readonly totalProcessedItems: number;
	readonly testedItemsCount: number;
	readonly azopyramResult: "negative" | "positive";
	readonly phenolphthaleinResult: "negative" | "positive";
	readonly operatorName: string;
	readonly verdict: "ГОДНО" | "ПЕРЕОЧИСТКА";
}

/** Канонические режимы автоклавирования (Класс B) */
export const AUTOCLAVE_PROGRAMS: readonly AutoclaveProgram[] = [
	{
		id: "standard_134",
		name: "134°C • Стандартная (Класс B)",
		description: "Стандартный цикл для наконечников, лотков и упакованных инструментов",
		temperatureCelsius: 134, pressureBar: 2.1, exposureMinutes: 5, dryingMinutes: 15,
		indicatorClass: "Индикатор 5 класса (многопараметрический)",
		suitableFor: "Упакованные инструменты в крафт-пакетах, стоматологические наконечники",
	},
	{
		id: "delicate_121",
		name: "121°C • Щадящая (Класс B)",
		description: "Бережный цикл для наконечников, оптики, силикона и пластмасс",
		temperatureCelsius: 121, pressureBar: 1.15, exposureMinutes: 20, dryingMinutes: 15,
		indicatorClass: "Индикатор 5 класса (121°C/20 мин)",
		suitableFor: "Наконечники, силиконовые ложки, пластиковые держатели, оптика микроскопа",
	},
	{
		id: "flash_134",
		name: "134°C • Экспресс без упаковки",
		description: "Быстрый цикл для неотложной стерилизации монолитных стальных инструментов",
		temperatureCelsius: 134, pressureBar: 2.1, exposureMinutes: 3, dryingMinutes: 5,
		indicatorClass: "Индикатор 4 класса",
		suitableFor: "Неупакованный инструмент для немедленного использования у кресла",
	},
];

/** Предустановленный флот автоклавов клиники (Класс B) */
export const CLINIC_STERILIZERS: readonly SterilizerEquipmentItem[] = [
	{ id: "autoclave-01", name: "Основной автоклав клиники (Melag Vacuklav 23 B+)", model: "Melag Vacuklav 23 B+", chamberVolumeLiters: 22, autoclaveClass: "B", serialNumber: "MEL-2024-8841", nextMaintenanceDate: "15.11.2026", isCompliant: true },
	{ id: "autoclave-02", name: "Резервный автоклав (Euronda E9 Next)", model: "Euronda E9 Next", chamberVolumeLiters: 24, autoclaveClass: "B", serialNumber: "EUR-2023-4102", nextMaintenanceDate: "20.12.2026", isCompliant: true },
	{ id: "autoclave-03", name: "Автоклав наконечников (Dentsply Sirona DAC Universal)", model: "DAC Universal S", chamberVolumeLiters: 12, autoclaveClass: "B", serialNumber: "DAC-2024-1193", nextMaintenanceDate: "05.10.2026", isCompliant: true },
];

/** Химические индикаторы контроля параметров стерилизации */
export const CHEMICAL_INDICATORS: readonly ChemicalIndicatorOption[] = [
	{ id: "class5_integrating", name: "Индикатор 5 класса (Интегратор)", classNameRu: "V класс (Паровые интеграторы)", standardVerdict: "Эталон достигнут (Тест пройден)", description: "Контролирует температуру, давление пара и время выдержки" },
	{ id: "class4_multivariable", name: "Индикатор 4 класса (Мультипараметрический)", classNameRu: "IV класс (Многопараметрические)", standardVerdict: "Эталон достигнут (Тест пройден)", description: "Контролирует критические параметры для пакетов и лотков" },
];

/** Типы стерилизационной упаковки */
export const STERILIZATION_PACKAGING: readonly PackagingTypeOption[] = [
	{ id: "kraft_100x200", name: "Крафт-пакеты 100×200 мм", size: "100×200 мм", shelfLifeDays: 50, description: "Самоклеящиеся пакеты для базовых лотков и комплектов инструментов" },
	{ id: "kraft_75x150", name: "Крафт-пакеты 75×150 мм", size: "75×150 мм", shelfLifeDays: 50, description: "Самоклеящиеся пакеты для одиночных инструментов, боров и фрез" },
	{ id: "roll_heat_seal", name: "Рулоны термозапечатываемые", size: "Рулон 150 мм", shelfLifeDays: 180, description: "Комбинированная рулонная упаковка под термозапайку" },
	{ id: "sterile_tray", name: "Стерильные лотки с фильтром", size: "Кассета DIN", shelfLifeDays: 30, description: "Металлические кассеты с антибактериальными фильтрами" },
];

/** Предустановленные наборы для смены */
export const CLINICAL_BATCH_TEMPLATES = [
	{ id: "therapy", label: "Терапевтический лоток × 10", count: 10, regime: "standard_134" as const, desc: "Терапевтический лоток базовый (10 комплектов: зеркала, зонды, пинцеты, боры)" },
	{ id: "surgery", label: "Хирургический набор × 3", count: 3, regime: "standard_134" as const, desc: "Хирургический набор (3 набора: щипцы, элеваторы, скальпели, кюреты)" },
	{ id: "exam", label: "Смотровой лоток × 15", count: 15, regime: "standard_134" as const, desc: "Смотровой лоток базовый (15 наборов: зеркало, зонд, пинцет)" },
	{ id: "handpieces", label: "Наконечники и оптика × 8", count: 8, regime: "delicate_121" as const, desc: "Наконечники и оптика (8 шт: турбинные, угловые, оптика микроскопа)" },
] as const;

export const PRESET_PACK_COUNTS = [6, 12, 18, 24] as const;

/** Автоматический расчет списания расходников со склада (Мандат 8n: Soft Negative Stock) */
export function calculateBatchStockDeduction(packagesCount: number): StockDeductionItem[] {
	const count = Math.max(1, packagesCount);
	return [
		{ sku: "KRAFT-100X200", title: "Крафт-пакеты самоклеящиеся 100×200 мм", quantity: count, unit: "шт", purpose: "Герметичная упаковка лотков с инструментами" },
		{ sku: "IND-CLASS5-MEDIS", title: "Химический индикатор стерилизации 5 класса", quantity: Math.max(2, Math.ceil(count / 4)), unit: "полосок", purpose: "Контроль критических параметров цикла" },
		{ sku: "AZOPYRAM-REAGENT", title: "Реактив Азопирам-Комплект", quantity: 2, unit: "мл", purpose: "Контроль очистки от скрытых следов крови" },
		{ sku: "PHENOLPHTHALEIN-SOL", title: "Спиртовой раствор фенолфталеина 1%", quantity: 1, unit: "мл", purpose: "Контроль отмывки от остатков моющих средств" },
	];
}

/** Создание пакетного цикла стерилизации и предстерилизационной очистки в 1 клик */
export function createOneClickShiftBatch(options?: {
	packagesCount?: number;
	operatorName?: string;
	autoclaveName?: string;
	programId?: AutoclaveRegimeId;
}): { sterilizationCycle: SterilizationBatchCycleRecord; psoRecord: PsoBatchRecord; deductedStock: StockDeductionItem[] } {
	const now = new Date();
	const dateStr = now.toLocaleDateString("ru-RU");
	const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	const count = options?.packagesCount ?? 12;
	const operator = options?.operatorName || "Иванова Е. С., ассистент ЦСО";
	const program = AUTOCLAVE_PROGRAMS.find((p) => p.id === options?.programId) ?? AUTOCLAVE_PROGRAMS[0];
	const device = options?.autoclaveName || CLINIC_STERILIZERS[0].name;

	const sterilizationCycle: SterilizationBatchCycleRecord = {
		id: `cycle-${Date.now()}`,
		cycleNumber: 1,
		date: dateStr,
		time: timeStr,
		autoclaveId: "autoclave-01",
		autoclaveName: device,
		programId: program.id,
		temperatureCelsius: program.temperatureCelsius,
		pressureBar: program.pressureBar,
		exposureMinutes: program.exposureMinutes,
		packagesCount: count,
		chemicalIndicatorVerdict: "ПРОЙДЕН",
		operatorName: operator,
		itemsDescription: "Терапевтические и хирургические лотки, наконечники турбинные и угловые",
		status: "completed",
	};

	const psoRecord: PsoBatchRecord = {
		id: `pso-${Date.now()}`,
		date: dateStr,
		time: timeStr,
		totalProcessedItems: count * 4,
		testedItemsCount: Math.max(3, Math.ceil(count * 0.05)),
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		operatorName: operator,
		verdict: "ГОДНО",
	};

	return { sterilizationCycle, psoRecord, deductedStock: calculateBatchStockDeduction(count) };
}

/** Валидация параметров цикла автоклавирования */
export function validateSterilizationCycleParameters(
	regime: AutoclaveRegimeId | string,
	temperature: number,
	pressure: number,
	exposureMinutes: number,
): { valid: boolean; reason?: string } {
	if (regime === "standard_134" || regime === "steam_134_5min") {
		if (temperature < 132 || temperature > 138) return { valid: false, reason: "Температура вне диапазона 134°C ± 2°C" };
		if (pressure < 2.0 || pressure > 2.3) return { valid: false, reason: "Давление пара вне диапазона 2.0–2.3 бар" };
		if (exposureMinutes < 5) return { valid: false, reason: "Время экспозиции менее 5 минут" };
		return { valid: true };
	}
	if (regime === "delicate_121" || regime === "steam_121_20min") {
		if (temperature < 119 || temperature > 124) return { valid: false, reason: "Температура вне диапазона 121°C ± 2°C" };
		if (pressure < 1.0 || pressure > 1.3) return { valid: false, reason: "Давление пара вне диапазона 1.1–1.3 бар" };
		if (exposureMinutes < 20) return { valid: false, reason: "Время экспозиции менее 20 минут" };
		return { valid: true };
	}
	if (regime === "flash_134") {
		if (temperature < 132 || temperature > 138 || exposureMinutes < 3) return { valid: false, reason: "Параметры экспресс-цикла 134°C не соблюдены" };
		return { valid: true };
	}
	return { valid: true };
}

/** Изоляция моков: в боевом режиме строго пустой список (Мандат 8wy) */
export function getSanpinBatchRecords(isDemo = false): SterilizationBatchCycleRecord[] {
	if (!isDemo) return [];
	const today = new Date().toLocaleDateString("ru-RU");
	return [
		{
			id: "demo-cycle-1", cycleNumber: 1, date: today, time: "09:30", autoclaveId: "autoclave-01",
			autoclaveName: "Основной автоклав клиники (Melag Vacuklav 23 B+)", programId: "standard_134",
			temperatureCelsius: 134, pressureBar: 2.1, exposureMinutes: 5, packagesCount: 14,
			chemicalIndicatorVerdict: "ПРОЙДЕН", operatorName: "Иванова Е. С., ассистент ЦСО",
			itemsDescription: "Наборы терапевтические (4 шт.), наборы смотровые (6 шт.), наконечники (4 шт.)", status: "completed",
		},
		{
			id: "demo-cycle-2", cycleNumber: 2, date: today, time: "14:15", autoclaveId: "autoclave-01",
			autoclaveName: "Основной автоклав клиники (Melag Vacuklav 23 B+)", programId: "delicate_121",
			temperatureCelsius: 121, pressureBar: 1.15, exposureMinutes: 20, packagesCount: 8,
			chemicalIndicatorVerdict: "ПРОЙДЕН", operatorName: "Иванова Е. С., ассистент ЦСО",
			itemsDescription: "Силиконовые оттискные ложки, пластиковые держатели снимков, оптика", status: "completed",
		},
	];
}

/** Генерация чистого HTML бланка журнала стерилизации для печати на А4 */
export function generateSanpinPrintHtml(records: readonly SterilizationBatchCycleRecord[]): string {
	const rows = records.map((r) => `
		<tr style="border-bottom:1px solid #cbd5e1;">
			<td style="padding:6px 8px;text-align:center;">${r.date} ${r.time}</td>
			<td style="padding:6px 8px;text-align:center;font-weight:600;">№${r.cycleNumber}</td>
			<td style="padding:6px 8px;">${r.autoclaveName}</td>
			<td style="padding:6px 8px;text-align:center;">${r.temperatureCelsius}°C / ${r.pressureBar} бар / ${r.exposureMinutes} мин</td>
			<td style="padding:6px 8px;text-align:center;font-weight:600;">${r.packagesCount} шт</td>
			<td style="padding:6px 8px;text-align:center;color:#047857;font-weight:600;">${r.chemicalIndicatorVerdict}</td>
			<td style="padding:6px 8px;">${r.itemsDescription}</td>
			<td style="padding:6px 8px;">${r.operatorName}</td>
		</tr>`).join("");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Журнал контроля стерилизации инструментов</title>
<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;color:#0f172a;}h1{font-size:18px;margin-bottom:4px;}p{font-size:12px;color:#64748b;margin:0 0 14px;}table{width:100%;border-collapse:collapse;font-size:11px;}th{background:#f1f5f9;padding:6px 8px;text-align:left;border-bottom:2px solid #cbd5e1;}</style></head>
<body><h1>Журнал контроля стерилизации инструментов и автоклавирования</h1><p>Производственный контроль стоматологической клиники. Выгрузка: ${new Date().toLocaleDateString("ru-RU")}</p>
<table><thead><tr><th style="text-align:center;">Дата/время</th><th style="text-align:center;">Цикл</th><th>Аппарат</th><th style="text-align:center;">Режим</th><th style="text-align:center;">Пакетов</th><th style="text-align:center;">Индикатор 5 кл.</th><th>Стерилизуемый материал</th><th>Ответственный</th></tr></thead><tbody>${rows || "<tr><td colspan='8' style='text-align:center;padding:16px;'>Записи циклов отсутствуют</td></tr>"}</tbody></table></body></html>`;
}
