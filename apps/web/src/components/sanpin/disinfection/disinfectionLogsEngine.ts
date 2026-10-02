/**
 * ============================================================================
 * DISINFECTION & GENERAL CLEANING LOGS ENGINE (САНПИН 3.3686-21 & 2.1.3684-21)
 * Честный математический расчет расхода дезинфицирующих средств, контроль
 * 7-дневного графика генеральных уборок, замачивания инструментов и печать А4.
 * ============================================================================
 */

export type DisinfectionRoomType =
	| "surgical"
	| "therapeutic"
	| "orthopedic"
	| "sterilization_cso"
	| "xray";

export type DisinfectionApplicationMethod = "wiping" | "spraying" | "immersion";

export interface DisinfectantConcentrationPreset {
	readonly percent: number;
	readonly exposureMinutes: number;
	readonly targetRegimeRu: string;
	readonly recommendedUsageRu: string;
}

export interface DisinfectantBrandPreset {
	readonly id: string;
	readonly nameRu: string;
	readonly activeIngredientRu: string;
	readonly standardWipingRateMlPerM2: number; // 100 мл/м2 per СанПиН
	readonly standardSprayingRateMlPerM2: number; // 200 мл/м2 per СанПиН
	readonly standardImmersionLitersPerSet: number; // 2.0 л на набор инструментов
	readonly availableConcentrations: readonly DisinfectantConcentrationPreset[];
}

export interface DisinfectionSolutionCalculationResult {
	readonly treatedAreaM2: number;
	readonly rateMlPerM2: number;
	readonly totalSolutionVolumeLiters: number;
	readonly requiredConcentrateVolumeMl: number;
	readonly requiredWaterVolumeLiters: number;
	readonly concentrationPercent: number;
	readonly exposureMinutes: number;
	readonly applicationMethod: DisinfectionApplicationMethod;
}

export interface ToolImmersionCalculationResult {
	readonly instrumentSetsCount: number;
	readonly litersPerSet: number;
	readonly totalSolutionVolumeLiters: number;
	readonly requiredConcentrateVolumeMl: number;
	readonly requiredWaterVolumeLiters: number;
	readonly concentrationPercent: number;
	readonly exposureMinutes: number;
}

export interface GeneralCleaningScheduleStatus {
	readonly roomName: string;
	readonly roomType: DisinfectionRoomType;
	readonly lastCleaningDate: string; // YYYY-MM-DD
	readonly nextPlannedDate: string; // YYYY-MM-DD
	readonly daysElapsed: number;
	readonly daysRemaining: number;
	readonly isOverdue: boolean;
	readonly status: "optimal" | "approaching_limit" | "overdue";
	readonly statusMessageRu: string;
}

export interface DisinfectionJournalRecord {
	readonly id: string;
	readonly logDate: string; // YYYY-MM-DD or ISO
	readonly roomName: string;
	readonly roomType: DisinfectionRoomType;
	readonly cleaningType: "general" | "current_routine";
	readonly treatedAreaM2: number;
	readonly applicationMethod: DisinfectionApplicationMethod;
	readonly disinfectantName: string;
	readonly activeIngredient: string;
	readonly concentrationPercent: number;
	readonly solutionVolumeLiters: number;
	readonly concentrateVolumeMl: number;
	readonly waterVolumeLiters: number;
	readonly exposureMinutes: number;
	readonly uvIrradiationMinutes: number;
	readonly ventilationMinutes: number;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly isInspectorVerified: boolean;
	readonly inspectorStaffFullName?: string | undefined;
	readonly notes?: string | undefined;
}

/**
 * Нормативные пресеты зарегистрированных дезинфицирующих средств для стоматологии
 */
export const STATUTORY_DISINFECTANTS_CATALOG: readonly DisinfectantBrandPreset[] = [
	{
		id: "alaminol",
		nameRu: "Аламинол",
		activeIngredientRu: "ЧАС (алкилдиметилбензиламмоний хлорид 5%) + Глутаровый альдегид (8%)",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 200,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{
				percent: 1.0,
				exposureMinutes: 60,
				targetRegimeRu: "Бактерицидный (текущие уборки)",
				recommendedUsageRu: "Поверхности мебели, полы, сантехоборудование при бактериальных инфекциях",
			},
			{
				percent: 3.0,
				exposureMinutes: 60,
				targetRegimeRu: "Вирулицидный (генеральные уборки терапии)",
				recommendedUsageRu: "Обработка поверхностей в терапевтических кабинетах, гепатиты, ВИЧ, герпес",
			},
			{
				percent: 5.0,
				exposureMinutes: 60,
				targetRegimeRu: "Генеральная уборка операционной / хирургии",
				recommendedUsageRu: "СанПиН норматив для хирургических и стерилизационных блоков, туберкулоцидный режим",
			},
			{
				percent: 8.0,
				exposureMinutes: 30,
				targetRegimeRu: "Усиленный режим экспресс-обработки",
				recommendedUsageRu: "Сокращенная экспозиция при генеральной уборке операционных блоков",
			},
		],
	},
	{
		id: "brilliant_classic",
		nameRu: "Бриллиант Классик",
		activeIngredientRu: "ЧАС (алкилдиметилбензиламмоний хлорид) + Глутаровый альдегид + ПАВ",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 150,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{
				percent: 1.0,
				exposureMinutes: 60,
				targetRegimeRu: "Бактерицидный / Текущая уборка",
				recommendedUsageRu: "Полы, стены, оборудование, терапевтический кабинет",
			},
			{
				percent: 2.0,
				exposureMinutes: 60,
				targetRegimeRu: "Вирулицидный режим генеральной уборки",
				recommendedUsageRu: "Генеральная уборка кабинетов терапевтической и ортопедической стоматологии",
			},
			{
				percent: 3.0,
				exposureMinutes: 30,
				targetRegimeRu: "Хирургический блок / Экспресс",
				recommendedUsageRu: "Поверхности хирургического кабинета, экспресс-экспозиция 30 мин",
			},
		],
	},
	{
		id: "septolit_tetra",
		nameRu: "Септолит Тетра",
		activeIngredientRu: "Третичные амины + ЧАС + Полигексаметиленгуанидин (ПГМГ)",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 150,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{
				percent: 0.5,
				exposureMinutes: 60,
				targetRegimeRu: "Бактерицидный режим",
				recommendedUsageRu: "Текущие влажные уборки кабинетов",
			},
			{
				percent: 1.0,
				exposureMinutes: 60,
				targetRegimeRu: "Вирулицидный режим (СанПиН 3.3686-21)",
				recommendedUsageRu: "Генеральные уборки всех видов стоматологических кабинетов",
			},
			{
				percent: 2.0,
				exposureMinutes: 30,
				targetRegimeRu: "Усиленный противотуберкулезный режим",
				recommendedUsageRu: "Хирургия, имплантология, ЦСО",
			},
		],
	},
	{
		id: "avansept",
		nameRu: "Авансепт",
		activeIngredientRu: "Полигексаметиленбигуанидин гидрохлорид + ЧАС",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 200,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{
				percent: 1.0,
				exposureMinutes: 60,
				targetRegimeRu: "Стандартный вирулицидный",
				recommendedUsageRu: "Генеральные уборки стоматологических кабинетов",
			},
			{
				percent: 2.0,
				exposureMinutes: 30,
				targetRegimeRu: "Хирургический блок",
				recommendedUsageRu: "Повышенная инфекционная безопасность",
			},
		],
	},
];

/**
 * 1. Честный расчет расхода дезинфицирующего средства на обработку помещения:
 * V_раствора = Площадь (м2) * Норма (л/м2)
 * V_концентрата = V_раствора * (Концентрация% / 100%)
 * V_воды = V_раствора - V_концентрата
 */
export function calculateDisinfectantForRoom(params: {
	treatedAreaM2: number;
	applicationMethod?: DisinfectionApplicationMethod;
	concentrationPercent: number;
	exposureMinutes?: number;
	customRateMlPerM2?: number;
}): DisinfectionSolutionCalculationResult {
	const area = Math.max(0, Math.round(Number(params.treatedAreaM2) * 100) / 100);
	const method = params.applicationMethod || "wiping";

	// Норма расхода per СанПиН 3.3686-21:
	// При протирании ветошью — 100 мл/м2
	// При орошении (распылении) — 150-200 мл/м2
	const defaultRate = method === "spraying" ? 200 : 100;
	const rateMlPerM2 = params.customRateMlPerM2 !== undefined && params.customRateMlPerM2 > 0
		? params.customRateMlPerM2
		: defaultRate;

	const totalSolutionMl = area * rateMlPerM2;
	const totalSolutionVolumeLiters = Math.round((totalSolutionMl / 1000) * 100) / 100;

	const concPercent = Math.max(0.01, Number(params.concentrationPercent) || 1.0);

	// V_концентрата (мл) = V_раствора (мл) * (C% / 100)
	const requiredConcentrateVolumeMl = Math.round(totalSolutionMl * (concPercent / 100) * 10) / 10;

	// V_воды (л) = (V_раствора - V_концентрата) / 1000
	const requiredWaterVolumeLiters = Math.max(
		0,
		Math.round(((totalSolutionMl - requiredConcentrateVolumeMl) / 1000) * 100) / 100,
	);

	const exposureMinutes = params.exposureMinutes !== undefined && params.exposureMinutes > 0
		? params.exposureMinutes
		: 60;

	return {
		treatedAreaM2: area,
		rateMlPerM2,
		totalSolutionVolumeLiters,
		requiredConcentrateVolumeMl,
		requiredWaterVolumeLiters,
		concentrationPercent: concPercent,
		exposureMinutes,
		applicationMethod: method,
	};
}

/**
 * 2. Честный расчет объема дезраствора для замачивания и дезинфекции инструментов
 * По СанПиН 3.3686-21 п. 3582: полное погружение, толщина слоя раствора над изделиями не менее 1 см,
 * норматив: не менее 2 литров на 1 лоток/комплект инструментов.
 */
export function calculateDisinfectantForToolImmersion(params: {
	instrumentSetsCount: number;
	concentrationPercent: number;
	exposureMinutes?: number;
	litersPerSet?: number;
}): ToolImmersionCalculationResult {
	const setsCount = Math.max(1, Math.round(Number(params.instrumentSetsCount) || 1));
	const litersPerSet = params.litersPerSet !== undefined && params.litersPerSet > 0
		? params.litersPerSet
		: 2.0;

	const totalSolutionVolumeLiters = Math.round(setsCount * litersPerSet * 100) / 100;
	const totalSolutionMl = totalSolutionVolumeLiters * 1000;

	const concPercent = Math.max(0.01, Number(params.concentrationPercent) || 2.0);
	const requiredConcentrateVolumeMl = Math.round(totalSolutionMl * (concPercent / 100) * 10) / 10;
	const requiredWaterVolumeLiters = Math.max(
		0,
		Math.round(((totalSolutionMl - requiredConcentrateVolumeMl) / 1000) * 100) / 100,
	);

	const exposureMinutes = params.exposureMinutes !== undefined && params.exposureMinutes > 0
		? params.exposureMinutes
		: 60;

	return {
		instrumentSetsCount: setsCount,
		litersPerSet,
		totalSolutionVolumeLiters,
		requiredConcentrateVolumeMl,
		requiredWaterVolumeLiters,
		concentrationPercent: concPercent,
		exposureMinutes,
	};
}

/**
 * 3. Расчет даты следующей генеральной уборки (строго 1 раз в 7 дней per СанПиН 3.3686-21)
 */
export function calculateNextGeneralCleaningDate(lastCleaningDateStr: string): string {
	const lastDate = new Date(lastCleaningDateStr);
	if (Number.isNaN(lastDate.getTime())) {
		const fallback = new Date();
		fallback.setDate(fallback.getDate() + 7);
		return fallback.toISOString().slice(0, 10);
	}
	const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
	return nextDate.toISOString().slice(0, 10);
}

/**
 * 4. Контроль интервала генеральных уборок (не реже 1 раза в 7 дней)
 */
export function validateGeneralCleaningSchedule(
	lastCleaningDateStr: string,
	roomName: string = "Хирургический кабинет № 1",
	roomType: DisinfectionRoomType = "surgical",
	checkDateStr: string = new Date().toISOString().slice(0, 10),
): GeneralCleaningScheduleStatus {
	const lastDate = new Date(lastCleaningDateStr);
	const checkDate = new Date(checkDateStr);

	if (Number.isNaN(lastDate.getTime()) || Number.isNaN(checkDate.getTime())) {
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate: calculateNextGeneralCleaningDate(lastCleaningDateStr),
			daysElapsed: 0,
			daysRemaining: 7,
			isOverdue: false,
			status: "optimal",
			statusMessageRu: "Некорректная дата уборки",
		};
	}

	const diffMs = checkDate.getTime() - lastDate.getTime();
	const daysElapsed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
	const daysRemaining = 7 - daysElapsed;
	const nextPlannedDate = calculateNextGeneralCleaningDate(lastCleaningDateStr);

	if (daysElapsed > 7) {
		const overdueDays = daysElapsed - 7;
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate,
			daysElapsed,
			daysRemaining,
			isOverdue: true,
			status: "overdue",
			statusMessageRu: `ВНИМАНИЕ! Просрочена генеральная уборка на ${overdueDays} дн.! (СанПиН 3.3686-21 требует проведение генеральной уборки не реже 1 раза в 7 дней).`,
		};
	}

	if (daysRemaining <= 1) {
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate,
			daysElapsed,
			daysRemaining,
			isOverdue: false,
			status: "approaching_limit",
			statusMessageRu: `Срок проведения генеральной уборки наступает ${daysRemaining === 0 ? "СЕГОДНЯ" : "ЗАВТРА"}. Интервал: 7 дней.`,
		};
	}

	return {
		roomName,
		roomType,
		lastCleaningDate: lastCleaningDateStr,
		nextPlannedDate,
		daysElapsed,
		daysRemaining,
		isOverdue: false,
		status: "optimal",
		statusMessageRu: `График генеральных уборок в норме (до следующей уборки ${daysRemaining} дн.).`,
	};
}

/**
 * 5. Генератор официального печатного Журнала учета дезинфекции и генеральных уборок (А4)
 * Без серых пятен при печати: 100% чистый белый фон, четкие черные линии border: 1px solid #000.
 */
export function generateGeneralCleaningPrintHtml(params: {
	records: readonly DisinfectionJournalRecord[];
	clinicName?: string;
	chiefDoctor?: string;
	headNurse?: string;
	periodLabel?: string;
}): string {
	const clinic = params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const chief = params.chiefDoctor || "Главный врач";
	const nurse = params.headNurse || "Главная медицинская сестра";
	const period = params.periodLabel || `Текущий период (${new Date().getFullYear()} г.)`;

	const rows = params.records.map((r, index) => {
		const typeLabel = r.cleaningType === "general" ? "Генеральная" : "Текущая";
		const methodLabel = r.applicationMethod === "spraying"
			? "Орошение"
			: r.applicationMethod === "immersion"
				? "Погружение"
				: "Протирание";

		return `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.logDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${typeLabel}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.treatedAreaM2.toFixed(1)} м²</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.concentrationPercent}%)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.solutionVolumeLiters.toFixed(1)} л (${r.concentrateVolumeMl.toFixed(0)} мл конц.)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${methodLabel}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">${r.isInspectorVerified ? "Заверено" : "Подпись"}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал генеральных уборок и дезинфекционного режима</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm 12mm 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; background: #fff; }
		.header { text-align: center; margin-bottom: 10px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; background: transparent; }
		th { border: 1px solid #000; padding: 4px 2px; background: #fff; font-size: 8pt; font-weight: bold; text-align: center; }
		td { border: 1px solid #000; padding: 3px 4px; background: #fff; }
		.footer { display: flex; justify-content: space-between; margin-top: 25px; font-size: 9pt; }
		.signature-box { width: 45%; }
		@media print {
			body { background: #fff !important; color: #000 !important; }
			table, th, td { border: 1px solid #000 !important; background: #fff !important; color: #000 !important; }
		}
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold; font-size: 10pt;">${clinic}</div>
		<div class="title">ЖУРНАЛ УЧЕТА ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИОННОГО РЕЖИМА</div>
		<div style="font-size: 8pt; color: #000;">В соответствии с требованиями СанПиН 3.3686-21 • Период: ${period}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 65px;">Дата</th>
				<th>Наименование кабинета / блока</th>
				<th style="width: 75px;">Вид уборки</th>
				<th style="width: 55px;">Площадь</th>
				<th>Дезсредство (концентрация %)</th>
				<th style="width: 90px;">Расход раствора</th>
				<th style="width: 70px;">Способ</th>
				<th style="width: 45px;">Эксп.</th>
				<th style="width: 45px;">УФ</th>
				<th style="width: 110px;">Исполнитель</th>
				<th style="width: 60px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${rows || '<tr><td colspan="12" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи в журнале отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="footer">
		<div class="signature-box">
			Ответственный за дезинфекционный режим:<br>
			${nurse} ________________ / ________________ /<br>
			М.П.
		</div>
		<div class="signature-box" style="text-align: right;">
			Утверждаю:<br>
			${chief} ________________ / ________________ /<br>
			М.П.
		</div>
	</div>
</body>
</html>`;
}
