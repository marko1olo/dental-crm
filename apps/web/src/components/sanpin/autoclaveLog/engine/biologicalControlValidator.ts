import type { BiologicalControlTestRecord } from "./types.js";

/**
 * Оценка результата бактериологического контроля стерилизатора.
 * СанПиН 3.3686-21: рост тест-культуры свидетельствует о неэффективности стерилизации.
 */
export function evaluateBioControlResult(record: BiologicalControlTestRecord): {
	readonly isCompliant: boolean;
	readonly statusRu: string;
	readonly conclusionRu: string;
} {
	if (record.result === "pending") {
		return {
			isCompliant: false,
			statusRu: "В процессе инкубации",
			conclusionRu: `Посевы в термостате (${record.incubationHours} ч при ${record.incubationTempCelsius}°C). Результат ожидается ${record.dateReadout}.`,
		};
	}

	if (record.result === "growth_failed") {
		return {
			isCompliant: false,
			statusRu: "БРАК (ОБНАРУЖЕН РОСТ МИКРООРГАНИЗМОВ)",
			conclusionRu: `Аварийная ситуация: обнаружен рост тест-культуры ${record.sporeCultureNameRu}. Стерилизатор ${record.sterilizerCode} подлежит немедленному выводу из эксплуатации и внеплановому ТО.`,
		};
	}

	return {
		isCompliant: true,
		statusRu: "СТЕРИЛЬНО (РОСТ ОТСУТСТВУЕТ)",
		conclusionRu: `Эффективность стерилизации подтверждена. Рост тест-культуры ${record.sporeCultureNameRu} отсутствует. Стерилизатор ${record.sterilizerCode} допущен к эксплуатации.`,
	};
}

/**
 * Проверка сроков планового бактериологического контроля (1 раз в 6 месяцев по СанПиН 3.3686-21).
 */
export function checkNextBioControlDeadline(
	lastBioTestDateStr: string,
	currentDate: Date = new Date(),
): {
	readonly nextDueDate: string;
	readonly isOverdue: boolean;
	readonly daysRemaining: number;
	readonly statusDescriptionRu: string;
} {
	const lastDate = new Date(lastBioTestDateStr);
	if (Number.isNaN(lastDate.getTime())) {
		return {
			nextDueDate: "Не определено",
			isOverdue: true,
			daysRemaining: -999,
			statusDescriptionRu: "Дата предыдущего биоконтроля не указана (ТРЕБУЕТСЯ СРОЧНЫЙ БИОКОНТРОЛЬ)",
		};
	}

	const nextDueDateObj = new Date(lastDate);
	nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 6);

	const diffTime = nextDueDateObj.getTime() - currentDate.getTime();
	const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const isOverdue = daysRemaining < 0;

	const yyyy = nextDueDateObj.getFullYear();
	const mm = String(nextDueDateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(nextDueDateObj.getDate()).padStart(2, "0");
	const nextDueDate = `${yyyy}-${mm}-${dd}`;

	let statusDescriptionRu = `Плановый биоконтроль в норме (осталось ${daysRemaining} дн. до ${nextDueDate})`;
	if (isOverdue) {
		statusDescriptionRu = `ВНИМАНИЕ: Срок планового биоконтроля истек (${Math.abs(daysRemaining)} дн. назад, норма 1 раз в 6 мес)`;
	} else if (daysRemaining <= 14) {
		statusDescriptionRu = `ПРЕДУПРЕЖДЕНИЕ: До планового биоконтроля осталось ${daysRemaining} дн. (срок ${nextDueDate})`;
	}

	return {
		nextDueDate,
		isOverdue,
		daysRemaining,
		statusDescriptionRu,
	};
}
