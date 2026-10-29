/**
 * apps/web/src/components/sanpin/sanpinCatalogData.ts
 *
 * SSOT справочников СанПиН 3.3686-21, программ стерилизации и предстерилизационной очистки:
 * - Программы автоклавирования: 134°C универсальная, 121°C деликатная, 134°C экспресс.
 * - Параметры очистки: азопирамовая и фенолфталеиновая пробы (100% норма по умолчанию).
 * - Обеззараживание воздуха: учет бактерицидных рециркуляторов (Дезар-4 / Дезар-7).
 * - Автоматическое пакетное списание расходников со склада (Мандат 8n: Soft Negative Stock).
 * - Размер строго 200–300 строк (Мандат 8b Sweet Spot). Живой язык без птичьих номеров (Мандат 8x).
 */

export interface AutoclaveProgram {
	readonly id: "standard_134" | "delicate_121" | "flash_134";
	readonly name: string;
	readonly description: string;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly dryingMinutes: number;
	readonly indicatorClass: string;
	readonly suitableFor: string;
}

export interface PsoQualityParameters {
	readonly azopyramResult: "negative" | "positive";
	readonly phenolphthaleinResult: "negative" | "positive";
	readonly samplePercentage: number;
	readonly minItemsCount: number;
	readonly azopyramDescription: string;
	readonly phenolphthaleinDescription: string;
}

export interface BactericidalDeviceItem {
	readonly id: string;
	readonly name: string;
	readonly roomName: string;
	readonly lampModel: string;
	readonly operatingHours: number;
	readonly maxResourceHours: number;
	readonly isCompliant: boolean;
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
	readonly programId: "standard_134" | "delicate_121" | "flash_134";
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

export const AUTOCLAVE_PROGRAMS: readonly AutoclaveProgram[] = [
	{
		id: "standard_134",
		name: "134°C • Универсальная (Класс B)",
		description: "Стандартный цикл для наконечников, лотков и упакованных инструментов",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		exposureMinutes: 5,
		dryingMinutes: 15,
		indicatorClass: "Индикатор 5 класса (многопараметрический)",
		suitableFor: "Упакованные инструменты в крафт-пакетах, стоматологические наконечники",
	},
	{
		id: "delicate_121",
		name: "121°C • Деликатная (Класс B)",
		description: "Бережный цикл для термолабильных изделий, оптики, силикона и пластмасс",
		temperatureCelsius: 121,
		pressureBar: 1.15,
		exposureMinutes: 20,
		dryingMinutes: 15,
		indicatorClass: "Индикатор 5 класса (121°C/20 мин)",
		suitableFor: "Силиконовые оттискные ложки, пластиковые держатели, оптика",
	},
	{
		id: "flash_134",
		name: "134°C • Экспресс без упаковки",
		description: "Быстрый цикл для неотложной стерилизации монолитных стальных инструментов",
		temperatureCelsius: 134,
		pressureBar: 2.1,
		exposureMinutes: 3,
		dryingMinutes: 5,
		indicatorClass: "Индикатор 4 класса",
		suitableFor: "Неупакованный инструментарий для немедленного использования у кресла",
	},
];

export const PSO_QUALITY_STANDARD: PsoQualityParameters = {
	azopyramResult: "negative",
	phenolphthaleinResult: "negative",
	samplePercentage: 1,
	minItemsCount: 3,
	azopyramDescription: "Отрицательная (окрашивание отсутствует, скрытые следы крови не обнаружены)",
	phenolphthaleinDescription: "Отрицательная (розового окрашивания нет, щелочные моющие средства отмыты)",
};

export const BACTERICIDAL_STANDARD_DEVICES: readonly BactericidalDeviceItem[] = [
	{
		id: "uv-01",
		name: "Рециркулятор Дезар-4",
		roomName: "Кабинет терапевтической стоматологии №1",
		lampModel: "Philips TUV 15W (безозоновая, 3 шт.)",
		operatingHours: 1420,
		maxResourceHours: 8000,
		isCompliant: true,
	},
	{
		id: "uv-02",
		name: "Рециркулятор Дезар-7",
		roomName: "Центральное стерилизационное отделение (ЦСО)",
		lampModel: "Philips TUV 30W (безозоновая, 2 шт.)",
		operatingHours: 2150,
		maxResourceHours: 8000,
		isCompliant: true,
	},
];

export const CLINIC_STERILIZERS = [
	{ id: "autoclave-01", name: "Основной автоклав Melag Vacuklav 23 B+ (Класс B)" },
	{ id: "autoclave-02", name: "Резервный автоклав W&H Lisa 500 (Класс B)" },
] as const;

/**
 * Расчет автоматического пакетного списания расходников со склада в зависимости от размера партии.
 * Реализует Мандат 8n: списание расходников пакетом в бэке (Soft Negative Stock).
 */
export function calculateBatchStockDeduction(packagesCount: number): StockDeductionItem[] {
	const safeCount = Math.max(1, packagesCount);
	return [
		{
			sku: "KRAFT-100X200",
			title: "Крафт-пакеты самоклеящиеся 100×200 мм",
			quantity: safeCount,
			unit: "шт",
			purpose: "Индивидуальная герметичная упаковка лотков инструментов",
		},
		{
			sku: "IND-CLASS5-MEDIS",
			title: "Химический индикатор стерилизации 5 класса",
			quantity: Math.max(2, Math.ceil(safeCount / 4)),
			unit: "полосок",
			purpose: "Контроль критических параметров (температура, пар, время) в контрольных точках",
		},
		{
			sku: "AZOPYRAM-REAGENT",
			title: "Реактив Азопирам-Комплект",
			quantity: 2,
			unit: "мл",
			purpose: "Контроль качества очистки от скрытых следов крови (проба ПСО)",
		},
		{
			sku: "PHENOLPHTHALEIN-SOL",
			title: "Спиртовой раствор фенолфталеина 1%",
			quantity: 1,
			unit: "мл",
			purpose: "Контроль качества отмывки от остатков щелочных моющих средств",
		},
	];
}

/**
 * Создание пакетного цикла стерилизации и предстерилизационной очистки в 1 клик.
 */
export function createOneClickShiftBatch(options?: {
	packagesCount?: number;
	operatorName?: string;
	autoclaveName?: string;
	programId?: "standard_134" | "delicate_121" | "flash_134";
}): {
	sterilizationCycle: SterilizationBatchCycleRecord;
	psoRecord: PsoBatchRecord;
	deductedStock: StockDeductionItem[];
} {
	const now = new Date();
	const dateStr = now.toLocaleDateString("ru-RU");
	const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	const count = options?.packagesCount ?? 12;
	const operator = options?.operatorName || "Иванова Е. С., ассистент ЦСО";
	const program: AutoclaveProgram = AUTOCLAVE_PROGRAMS.find((p) => p.id === options?.programId) ?? AUTOCLAVE_PROGRAMS[0]!;
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

	const testedPso = Math.max(3, Math.ceil(count * 0.05));
	const psoRecord: PsoBatchRecord = {
		id: `pso-${Date.now()}`,
		date: dateStr,
		time: timeStr,
		totalProcessedItems: count * 4,
		testedItemsCount: testedPso,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		operatorName: operator,
		verdict: "ГОДНО",
	};

	const deductedStock = calculateBatchStockDeduction(count);

	return { sterilizationCycle, psoRecord, deductedStock };
}

/**
 * Изоляция моков: при isDemo === false возвращается честный пустой список (0% выдуманных данных).
 */
export function getSanpinBatchRecords(isDemo = false): SterilizationBatchCycleRecord[] {
	if (!isDemo) return [];

	return [
		{
			id: "demo-cycle-1",
			cycleNumber: 1,
			date: new Date().toLocaleDateString("ru-RU"),
			time: "09:30",
			autoclaveId: "autoclave-01",
			autoclaveName: "Основной автоклав Melag Vacuklav 23 B+",
			programId: "standard_134",
			temperatureCelsius: 134,
			pressureBar: 2.1,
			exposureMinutes: 5,
			packagesCount: 14,
			chemicalIndicatorVerdict: "ПРОЙДЕН",
			operatorName: "Иванова Е. С., ассистент ЦСО",
			itemsDescription: "Наборы терапевтические (4 шт.), наборы смотровые (6 шт.), наконечники (4 шт.)",
			status: "completed",
		},
		{
			id: "demo-cycle-2",
			cycleNumber: 2,
			date: new Date().toLocaleDateString("ru-RU"),
			time: "14:15",
			autoclaveId: "autoclave-01",
			autoclaveName: "Основной автоклав Melag Vacuklav 23 B+",
			programId: "delicate_121",
			temperatureCelsius: 121,
			pressureBar: 1.15,
			exposureMinutes: 20,
			packagesCount: 8,
			chemicalIndicatorVerdict: "ПРОЙДЕН",
			operatorName: "Иванова Е. С., ассистент ЦСО",
			itemsDescription: "Силиконовые оттискные ложки, пластиковые держатели снимков, оптика",
			status: "completed",
		},
	];
}

/**
 * Генерация чистого HTML бланка журнала стерилизации для печати на А4.
 * Мандат 8x: Человеческий русский язык без сырых советских шифров.
 */
export function generateSanpinPrintHtml(records: readonly SterilizationBatchCycleRecord[]): string {
	const rows = records.map((r) => `
		<tr style="border-bottom: 1px solid #cbd5e1;">
			<td style="padding: 8px; text-align: center;">${r.date} ${r.time}</td>
			<td style="padding: 8px; text-align: center;">№${r.cycleNumber}</td>
			<td style="padding: 8px;">${r.autoclaveName}</td>
			<td style="padding: 8px; text-align: center;">${r.temperatureCelsius}°C / ${r.pressureBar} бар / ${r.exposureMinutes} мин</td>
			<td style="padding: 8px; text-align: center;">${r.packagesCount} шт</td>
			<td style="padding: 8px; text-align: center; color: #047857; font-weight: 600;">${r.chemicalIndicatorVerdict}</td>
			<td style="padding: 8px;">${r.itemsDescription}</td>
			<td style="padding: 8px;">${r.operatorName}</td>
		</tr>
	`).join("");

	return `
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="utf-8" />
			<title>Журнал контроля стерилизации инструментов</title>
			<style>
				@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
				body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
				h1 { font-size: 18px; margin-bottom: 4px; }
				p { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
				table { width: 100%; border-collapse: collapse; font-size: 12px; }
				th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
			</style>
		</head>
		<body>
			<h1>Журнал контроля стерилизации инструментов и автоклавирования</h1>
			<p>Производственный контроль стоматологической клиники. Выгрузка от ${new Date().toLocaleDateString("ru-RU")}</p>
			<table>
				<thead>
					<tr>
						<th style="text-align: center;">Дата и время</th>
						<th style="text-align: center;">Цикл</th>
						<th>Аппарат</th>
						<th style="text-align: center;">Режим</th>
						<th style="text-align: center;">Пакетов</th>
						<th style="text-align: center;">Индикатор 5 кл.</th>
						<th>Стерилизуемый материал</th>
						<th>Ответственный сотрудник</th>
					</tr>
				</thead>
				<tbody>
					${rows || "<tr><td colspan='8' style='text-align: center; padding: 20px;'>Записи циклов стерилизации отсутствуют</td></tr>"}
				</tbody>
			</table>
		</body>
		</html>
	`;
}
