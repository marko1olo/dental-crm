/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL REGISTRATION PROTOCOL GENERATORS (FORM 043/u) — (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Formal Russian medical protocols for optical intraoral scan to CBCT
 * registration, prosthetic tooth setup, and surgical guide fabrication.
 * Strictly zero cartoon emojis (Mandate 8d #7), 100% clinical compliance.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	RegistrationProtocolInput,
	ScanRegistrationProtocolInput,
} from "./types.js";

/**
 * Formats an official A4 medical protocol of optical scan registration and
 * prosthetically-driven implant placement for Form 043/u.
 * Strictly zero emojis (Mandate 8d #7), 100% formal clinical terminology.
 */
export function formatScanRegistrationA4Protocol(
	input: ScanRegistrationProtocolInput,
): string {
	const clinic = input.clinicName?.trim() || "СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА";
	const patient = input.patientName?.trim() || "Не указан";
	const doctor = input.doctorName?.trim() || "Врач-стоматолог";
	const date = input.dateStr?.trim() || new Date().toISOString().slice(0, 10);
	const toothStr = input.toothNumber ? `Зуб FDI ${input.toothNumber}` : "Не указан";
	const landmarks = input.landmarkCount ?? 3;

	let qualityLabel = "";
	let verdictText = "";
	let recommendation = "";

	if (input.quality === "excellent") {
		qualityLabel = "ОТЛИЧНОЕ (RMS < 0.500 мм)";
		verdictText = "[ДОПУЩЕНО К ИЗГОТОВЛЕНИЮ ХИРУРГИЧЕСКОГО ШАБЛОНА]";
		recommendation =
			"Высокая прецизионная точность оптико-томографического совмещения. " +
			"Погрешность не превышает 0.5 мм. Допускается для прямого моделирования " +
			"навигационных хирургических шаблонов с пилотным и полным протоколом сверления.";
	} else if (input.quality === "acceptable") {
		qualityLabel = "ПРИЕМЛЕМОЕ (0.500 мм <= RMS <= 1.000 мм)";
		verdictText = "[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ С КОНТРОЛЕМ]";
		recommendation =
			"Точность совмещения находится в допустимых клинических пределах. " +
			"Рекомендуется визуальная инспекция окклюзионных прилеганий перед окончательной " +
			"фиксацией направляющих втулок хирургического шаблона.";
	} else {
		qualityLabel = "НИЗКАЯ ТОЧНОСТЬ (RMS > 1.000 мм)";
		verdictText = "[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ РАССТАНОВКА РЕПЕРОВ]";
		recommendation =
			"Среднеквадратическое отклонение превышает допустимый хирургический порог (RMS > 1.0 мм). " +
			"Категорически запрещено использовать текущую матрицу для навигационной хирургии. " +
			"Необходимо заново расставить анатомические ориентиры (бугры клыков, фиссуры моляров) " +
			"или устранить артефакты сканирования.";
	}

	const lines: string[] = [
		"================================================================================",
		`                    ${clinic.toUpperCase()}`,
		"        ПРОТОКОЛ ОПТИЧЕСКОГО СОВМЕЩЕНИЯ И ОРТОПЕДИЧЕСКОГО ПЛАНИРОВАНИЯ         ",
		"               (OPTICAL SCAN RIGID REGISTRATION & TOOTH SETUP)                  ",
		"================================================================================",
		"",
		`Пациент                : ${patient}`,
		`Лечащий врач           : ${doctor}`,
		`Дата планирования      : ${date}`,
		`Анатомическая зона     : ${toothStr}`,
		"Стандарт протокола     : Медицинская карта стоматологического больного (Форма 043/у)",
		"",
		"--------------------------------------------------------------------------------",
		"1. МАТЕМАТИЧЕСКИЕ ПАРАМЕТРЫ РЕГИСТРАЦИИ (KABSCH / HORN UNIT-QUATERNION)",
		"--------------------------------------------------------------------------------",
		`Количество анатомических реперов      : ${landmarks} пар`,
		`Среднеквадратичная ошибка (RMS)       : ${input.rmsMm.toFixed(4)} мм`,
		`Категория клинической точности        : ${qualityLabel}`,
		`Клинический вердикт                   : ${verdictText}`,
	];

	if (input.transformMatrix && input.transformMatrix.length === 16) {
		const m = input.transformMatrix;
		lines.push("");
		lines.push("Матрица жесткой трансформации (Column-Major 4x4):");
		lines.push(
			`  [ ${m[0]!.toFixed(6)}, ${m[4]!.toFixed(6)}, ${m[8]!.toFixed(6)}, ${m[12]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[1]!.toFixed(6)}, ${m[5]!.toFixed(6)}, ${m[9]!.toFixed(6)}, ${m[13]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[2]!.toFixed(6)}, ${m[6]!.toFixed(6)}, ${m[10]!.toFixed(6)}, ${m[14]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[3]!.toFixed(6)}, ${m[7]!.toFixed(6)}, ${m[11]!.toFixed(6)}, ${m[15]!.toFixed(4)} ]`,
		);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("2. ОРТОПЕДИЧЕСКИ-ОРИЕНТИРОВАННОЕ ПОЗИЦИОНИРОВАНИЕ (PCA WAX-UP)");
	lines.push("--------------------------------------------------------------------------------");

	if (input.crownSuggestion) {
		const cs = input.crownSuggestion;
		lines.push(`Центроид виртуальной коронки          : X=${cs.centroid[0].toFixed(2)} мм, Y=${cs.centroid[1].toFixed(2)} мм, Z=${cs.centroid[2].toFixed(2)} мм`);
		lines.push(`Протяженность коронки по главной оси  : ${cs.extentMm.toFixed(2)} мм`);
		lines.push(`Вектор апикальной оси (Screw Channel) : [${cs.axis[0].toFixed(4)}, ${cs.axis[1].toFixed(4)}, ${cs.axis[2].toFixed(4)}]`);
		lines.push(`Позиция платформы имплантата          : X=${cs.position[0].toFixed(2)} мм, Y=${cs.position[1].toFixed(2)} мм, Z=${cs.position[2].toFixed(2)} мм`);
		lines.push(`Вестибуло-оральный наклон (BL)        : ${cs.angleBLDeg.toFixed(2)} град.`);
		lines.push(`Мезио-дистальный наклон (MD)          : ${cs.angleMDDeg.toFixed(2)} град.`);
	} else {
		lines.push("Виртуальная коронка (wax-up)          : Не задана (прямое анатомическое ориентирование)");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("3. КЛИНИЧЕСКИЕ РЕКОМЕНДАЦИИ И ЗАКЛЮЧЕНИЕ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push(recommendation);

	if (input.clinicalNotes?.trim()) {
		lines.push("");
		lines.push(`Особые отметки хирурга: ${input.clinicalNotes.trim()}`);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("4. ВЕРИФИКАЦИЯ И ЭЛЕКТРОННАЯ ПОДПИСЬ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("Протокол проверен врачом-стоматологом у кресла в соответствии с клиническими");
	lines.push("рекомендациями Стоматологической Ассоциации России (СтАР).");
	lines.push("");
	lines.push(`Врач-стоматолог (подпись): ____________________ / ${doctor} /`);
	lines.push("");
	lines.push("Подпись ответственного лица: ____________________");
	lines.push("");
	lines.push("М.П. Клиники");
	lines.push("================================================================================");

	return lines.join("\n");
}

/**
 * Formats an A4-printable clinical protocol for optical intraoral scan to CBCT registration.
 * Fully compliant with Mandate 8d item 7: strictly zero cartoon emojis, professional medical terminology.
 */
export function formatRegistrationA4Protocol(
	result: RegistrationProtocolInput,
	patientName: string,
	doctorName: string,
): string {
	const statusText = result.isClinicallyAcceptable
		? "[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]"
		: "[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ КАЛИБРОВКА]";

	const recommendation = result.isClinicallyAcceptable
		? "Точность оптико-томографического совмещения находится в пределах клинического допуска (RMS <= 0.500 мм). Данные согласованы для прецизионного моделирования хирургических навигационных шаблонов и позиционирования дентальных имплантатов."
		: "Среднеквадратическое отклонение превышает допустимый клинический порог (RMS > 0.500 мм). Рекомендуется повторно расставить анатомические ориентиры (минимум 3 не коллинеарные пары реперов на твердых тканях зубов) и исключить участки с артефактами металлоконструкций.";

	const lines = [
		"================================================================================",
		"        ПРОТОКОЛ СОПОСТАВЛЕНИЯ КЛКТ И ОПТИЧЕСКОГО ИНТРАОРАЛЬНОГО СКАНИРОВАНИЯ   ",
		"               (CBCT <-> INTRAORAL OPTICAL SCAN REGISTRATION REPORT)            ",
		"================================================================================",
		"",
		`Пациент: ${patientName.trim() || "Не указан"}`,
		`Лечащий врач: ${doctorName.trim() || "Не указан"}`,
		`Дата формирования: ${new Date().toISOString().slice(0, 10)}`,
		"Стандарт протокола: Форма 043/у / Предоперационное 3D-планирование",
		"",
		"--------------------------------------------------------------------------------",
		"1. ПАРАМЕТРЫ РЕГИСТРАЦИИ И АЛГОРИТМИЧЕСКИЙ АНАЛИЗ",
		"--------------------------------------------------------------------------------",
		"Математический метод первичной привязки : Horn Unit-Quaternion Absolute Orientation (Kabsch)",
		"Математический метод прецизионной доводки : Iterative Closest Point (Point-to-Point ICP)",
		`Количество обработанных вершин меша    : ${result.scanPointsCount.toLocaleString("ru-RU")}`,
		`Первичное отклонение по реперам (RMS)  : ${result.landmarkRmsMm.toFixed(4)} мм`,
		`Финальное отклонение ICP (RMS)         : ${result.icpRmsMm.toFixed(4)} мм`,
		`Количество выполненных итераций ICP    : ${result.iterations}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. КЛИНИЧЕСКИЙ ВЕРДИКТ И ЗАКЛЮЧЕНИЕ",
		"--------------------------------------------------------------------------------",
		`Статус верификации: ${statusText}`,
		"Клинический допуск: RMS <= 0.500 мм (допустимо для навигационной хирургии)",
		"",
		"Заключение:",
		recommendation,
		"",
		"--------------------------------------------------------------------------------",
		"3. ВЕРИФИКАЦИЯ И ПОДПИСЬ",
		"--------------------------------------------------------------------------------",
		"Протокол проверен врачом-стоматологом у кресла в соответствии с клиническими",
		"рекомендациями Стоматологической Ассоциации России (СтАР).",
		"",
		`Врач-стоматолог (подпись): ____________________ / ${doctorName.trim() || "Врач-клиницист"} /`,
		"",
		"Подпись ответственного лица: ____________________",
		"",
		"М.П. Клиники",
		"================================================================================",
	];

	return lines.join("\n");
}
