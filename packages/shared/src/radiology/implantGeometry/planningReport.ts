/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — SURGICAL PLANNING REPORT (LAYER 3)
 * ═══════════════════════════════════════════════════════════════════════════
 * Official Russian A4 surgical implant protocol (Form 043/u, Star standards):
 * - Passport data, implant dimensions & coordinates
 * - 3D safety margins, Misch bone classification & drilling recommendations
 * - Clean plain-text formatting, zero emojis (Mandate 8d)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3, ImplantPlanningReportInput } from "./types.js";
import { normalize3 } from "./mathVectors.js";
import { getMischBoneClinicalGuidance, type BoneClass } from "../boneQualityEngine.js";

function f1(val: number): string { return Number.isFinite(val) ? val.toFixed(1) : "Н/Д"; }
function f2(val: number): string { return Number.isFinite(val) ? val.toFixed(2) : "Н/Д"; }

export function formatImplantPlanningReportA4(input: ImplantPlanningReportInput): string {
	const patientName = input.patientName ?? "Пациент не указан";
	const birthDate = input.patientBirthDate ?? "Не указана";
	const medRecord = input.medicalRecordNumber ?? "б/н";
	const doctorName = input.doctorName ?? "Врач-стоматолог хирург-имплантолог";
	const clinicName = input.clinicName ?? "Стоматологический Центр DENTE";
	const studyDate = input.studyDate ?? new Date().toISOString().slice(0, 10);
	const toothNumber = input.toothNumber ?? input.placement.toothNumber ?? 36;
	const implantModel = input.implantModel ?? input.placement.implantModel ?? "Dente BioImplant Ti Grade 4";

	const { dimensions, placement, safetyCheck } = input;
	const dir = normalize3(placement.direction);
	const apex: Vec3 = [
		placement.position[0] + dir[0] * dimensions.lengthMm,
		placement.position[1] + dir[1] * dimensions.lengthMm,
		placement.position[2] + dir[2] * dimensions.lengthMm,
	];

	const lines: string[] = [
		"================================================================================",
		"РЕГЛАМЕНТНЫЙ ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ",
		"(КЛКТ 3D, МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО ФОРМА 043/У, СТАР)",
		"================================================================================",
		`Медицинская организация            : ${clinicName}`,
		`Дата формирования протокола        : ${studyDate}`,
		"",
		"--------------------------------------------------------------------------------",
		"1. ПАСПОРТНАЯ ЧАСТЬ И АМБУЛАТОРНАЯ КАРТА (ФОРМА 043/У)",
		"--------------------------------------------------------------------------------",
		`ФИО Пациента                       : ${patientName}`,
		`Дата рождения                      : ${birthDate}`,
		`Номер медицинской карты (043/у)    : ${medRecord}`,
		`Лечащий хирург-имплантолог         : ${doctorName}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. СПЕЦИФИКАЦИЯ И ГЕОМЕТРИЯ ПЛАНИРУЕМОГО ИМПЛАНТАТА",
		"--------------------------------------------------------------------------------",
		`Анатомическая позиция (зуб по FDI) : Зуб ${toothNumber}`,
		`Модель имплантата                  : ${implantModel}`,
		`Общая длина тела (L)               : ${f1(dimensions.lengthMm)} мм`,
		`Диаметр тела имплантата (D)        : ${f1(dimensions.diameterMm)} мм`,
		`Диаметр ортопедической платформы   : ${f1(dimensions.platformDiameterMm)} мм`,
		`Диаметр апикальной части           : ${f1(dimensions.apexDiameterMm)} мм`,
		`Шаг макрорезьбы (pitch)            : ${f2(dimensions.threadPitchMm)} мм`,
		"",
		"--------------------------------------------------------------------------------",
		"3. ПРОСТРАНСТВЕННАЯ 3D ОРИЕНТАЦИЯ И КООРДИНАТЫ ЛОЖА",
		"--------------------------------------------------------------------------------",
		`Точка входа платформы (Entry)      : [${f1(placement.position[0])}, ${f1(placement.position[1])}, ${f1(placement.position[2])}] мм`,
		`Вершина апекса (Apex)              : [${f1(apex[0])}, ${f1(apex[1])}, ${f1(apex[2])}] мм`,
		`Вектор оси установки (Unit Dir)    : [${f2(dir[0])}, ${f2(dir[1])}, ${f2(dir[2])}]`,
		`Осевой крен (Roll)                 : ${placement.rollDeg !== undefined ? f1(placement.rollDeg) + "°" : "0.0°"}`,
		"",
		"--------------------------------------------------------------------------------",
		"4. ОЦЕНКА ЗОН БЕЗОПАСНОСТИ И АНАТОМИЧЕСКИХ КЛИРЕНСОВ",
		"--------------------------------------------------------------------------------",
		`Зазор до нижнечелюстного канала    : ${f2(safetyCheck.minCanalDistanceMm)} мм (Порог безопасности: >= 2.00 мм)`,
		`Зазор до корней соседних зубов     : ${f2(safetyCheck.minAdjacentDistanceMm)} мм (Порог безопасности: >= 1.50 мм)`,
		`Толщина кортикальной пластинки     : ${f2(safetyCheck.corticalClearanceMm)} мм (Порог безопасности: >= 1.00 мм)`,
		`Клинический статус безопасности    : ${safetyCheck.isSafe ? "[БЕЗОПАСНО: ВСЕ ЗАЗОРЫ СОБЛЮДЕНЫ]" : "[ВНИМАНИЕ: ОБНАРУЖЕНЫ НАРУШЕНИЯ ЗОН БЕЗОПАСНОСТИ]"}`,
	];

	if (safetyCheck.violations.length > 0) {
		lines.push("");
		lines.push("Обнаруженные анатомические конфликты:");
		for (let i = 0; i < safetyCheck.violations.length; i++) {
			lines.push(`  ${i + 1}. [НАРУШЕНИЕ] ${safetyCheck.violations[i]}`);
		}
	} else {
		lines.push("Анатомические структуры интактны. Коридор безопасности гарантирован.");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("5. ДЕНСИТОМЕТРИЯ И СТРУКТУРА КОСТНОЙ ТКАНИ (CARL MISCH)");
	lines.push("--------------------------------------------------------------------------------");

	if (input.boneDensityHU !== undefined || input.boneClass) {
		const density = input.boneDensityHU !== undefined ? `${f1(input.boneDensityHU)} HU` : "Н/Д";
		const bClass = (input.boneClass ?? "D2") as BoneClass;
		const guidance = getMischBoneClinicalGuidance(bClass);
		lines.push(`Оптическая плотность костного ложа : ${density}`);
		lines.push(`Классификация плотности кости      : ${guidance.classNameRu}`);
		lines.push(`Тактильная плотность костной ткани : ${guidance.tactileFeelRu}`);
		lines.push(`Анатомическая локализация          : ${guidance.anatomicLocationRu}`);
		lines.push(`Рекомендуемый протокол препарирования: ${guidance.drillingProtocolRu}`);
		lines.push(`Целевой торк первичной стабильности: ${guidance.recommendedTorqueNcm.target} Н*см (диапазон ${guidance.recommendedTorqueNcm.min}-${guidance.recommendedTorqueNcm.max} Н*см)`);
		lines.push(`Срок остеоинтеграции (прогноз)     : НЧ: ${guidance.healingMonths.mandible} мес. / ВЧ: ${guidance.healingMonths.maxilla} мес.`);
	} else {
		lines.push("Денситометрический расчет костного ложа не проводился.");
	}

	if (input.surgicalNotes) {
		lines.push("");
		lines.push("--------------------------------------------------------------------------------");
		lines.push("6. ОСОБЫЕ ХИРУРГИЧЕСКИЕ ПРИМЕЧАНИЯ");
		lines.push("--------------------------------------------------------------------------------");
		lines.push(input.surgicalNotes);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("7. ИТОГОВЫЙ КЛИНИЧЕСКИЙ ВЕРДИКТ");
	lines.push("--------------------------------------------------------------------------------");

	if (safetyCheck.isSafe) {
		lines.push("Заключение: План дентальной имплантации одобрен к клинической реализации.");
		lines.push("Позиция имплантата строго выверена по анатомическим ориентирам КЛКТ,");
		lines.push("критические сосудисто-нервные пучки и корни соседних зубов защищены.");
		lines.push("Рекомендовано изготовление индивидуального хирургического навигационного шаблона.");
	} else {
		lines.push("Заключение: План дентальной имплантации ТРЕБУЕТ КОРРЕКЦИИ.");
		lines.push("Установка имплантата по текущим координатам сопряжена с риском травмы");
		lines.push("сосудисто-нервного пучка или периодонта соседних зубов. Требуется изменение");
		lines.push("длины, диаметра или ангуляции имплантата до устранения всех коллизий.");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("8. ЮРИДИЧЕСКАЯ ВЕРИФИКАЦИЯ И ПОДПИСИ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("Протокол проверен и заверен врачом-стоматологом хирургом-имплантологом");
	lines.push("в соответствии со стандартами клинических рекомендаций СтАР.");
	lines.push("");
	lines.push(`Врач хирург-имплантолог: ____________________ / ${doctorName} /`);
	lines.push("");
	lines.push("М.П. Клиники");
	lines.push("================================================================================");

	return lines.join("\n");
}
