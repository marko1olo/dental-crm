import {
	type ClinicalTaskRecord,
	getClinicalTasksFromDb,
	insertClinicalTaskInDb,
} from "../../db/clinicalTasksQuery.js";

/**
 * Маршрутизация пациента между клиническими этапами.
 *
 * БЫЛО: файл открывался комментарием «Mocking db imports to keep it simple and
 * compileable in the backend», объявлял собственный интерфейс ClinicalTask
 * вместо модели БД и заканчивался строкой
 * `// In a real implementation, we would insert into the DB via Drizzle`.
 * Задача передачи собиралась в памяти, печаталась в console.log и возвращалась
 * вызывающему. Передача между этапами, которая существует только в возвращаемом
 * значении, — это передача, которой не произошло: следующий врач, открывая
 * карту пациента, не видел ничего. Класс к тому же не был подключён ни к одному
 * роуту, то есть до сих пор не выполнялся вообще нигде, кроме своего же теста.
 *
 * СТАЛО: задача пишется в таблицу `clinical_tasks`, которая существует в базе
 * с первой миграции, и читается обратно тем же сервисом.
 */

export const CLINICAL_PHASE_CODES = [
	"PHASE_1_THERAPY",
	"PHASE_2_SURGERY",
] as const;
export type ClinicalPhaseCode = (typeof CLINICAL_PHASE_CODES)[number];

export function isClinicalPhaseCode(
	value: unknown,
): value is ClinicalPhaseCode {
	return (
		typeof value === "string" &&
		(CLINICAL_PHASE_CODES as readonly string[]).includes(value)
	);
}

interface PhaseHandoffSpec {
	/** Тип задачи, попадающий в колонку task_type. */
	readonly taskType: string;
	readonly title: string;
	/** Что именно закончилось — первая фраза описания. */
	readonly completedStage: string;
	/** Что делать дальше — последняя фраза описания. */
	readonly nextStep: string;
}

/**
 * Тексты русские, как и все остальные сообщения этого API
 * (см. security/identity.ts:137, routes/clinical.ts:18). Библиотеки i18n в
 * проекте нет — на серверной стороне словарей подписей не существует вовсе,
 * поэтому строки лежат здесь. Это осознанный вклад в общий долг локализации,
 * а не заявка на то, что перевод работает.
 */
const PHASE_HANDOFFS: Readonly<Record<ClinicalPhaseCode, PhaseHandoffSpec>> = {
	PHASE_1_THERAPY: {
		taskType: "prosthetics_handoff",
		title: "Этап II: передача в ортопедию",
		completedStage: "Терапевтический этап завершён",
		nextStep: "Требуется осмотр ортопедом перед протезированием.",
	},
	PHASE_2_SURGERY: {
		taskType: "prosthetics_handoff",
		title: "Этап II: передача в ортопедию после хирургии",
		completedStage: "Хирургический этап завершён",
		nextStep: "Протезирование — после заживления.",
	},
};

export interface PhaseCompletionInput {
	patientId: string;
	completedPhaseCode: string;
	/** Комментарий врача. Пустой комментарий в описание не попадает — пустых разделов не пишем. */
	notes?: string | null;
	toothCodes?: readonly string[];
	treatmentPlanId?: string | null;
	assignedDoctorId?: string | null;
}

/**
 * Собирает описание из тех частей, которые реально известны.
 *
 * БЫЛО: описание склеивалось шаблоном без проверок, поэтому завершение этапа
 * без указанных зубов и без комментария давало врачу строку вида
 * «...for teeth: . Handoff notes: . Please review...» — пустые разделы,
 * выглядящие как потерянные данные.
 */
function buildHandoffDescription(
	spec: PhaseHandoffSpec,
	toothCodes: readonly string[],
	notes: string,
): string {
	const teeth = toothCodes
		.map((code) => code.trim())
		.filter((code) => code !== "");
	const sentences: string[] = [
		teeth.length > 0
			? `${spec.completedStage} по зубам: ${teeth.join(", ")}.`
			: `${spec.completedStage}.`,
	];
	const trimmedNotes = notes.trim();
	if (trimmedNotes !== "") {
		sentences.push(
			trimmedNotes.endsWith(".")
				? `Комментарий: ${trimmedNotes}`
				: `Комментарий: ${trimmedNotes}.`,
		);
	}
	sentences.push(spec.nextStep);
	return sentences.join(" ");
}

export class ClinicalRouter {
	/**
	 * Фиксирует завершение клинического этапа и СОХРАНЯЕТ задачу для следующего
	 * этапа. Возвращает сохранённую строку `clinical_tasks` — с настоящим id и
	 * created_at из базы, а не сгенерированными в памяти.
	 *
	 * Возвращает null, если для указанного этапа передача не предусмотрена:
	 * это не ошибка, а «дальше по этому этапу никого звать не надо».
	 *
	 * Бросает ClinicalTaskOwnershipError, если пациент, план лечения или врач
	 * принадлежат другой клинике.
	 */
	public async handlePhaseCompletion(
		organizationId: string,
		input: PhaseCompletionInput,
	): Promise<ClinicalTaskRecord | null> {
		if (!isClinicalPhaseCode(input.completedPhaseCode)) return null;
		const spec = PHASE_HANDOFFS[input.completedPhaseCode];

		return await insertClinicalTaskInDb(organizationId, {
			patientId: input.patientId,
			taskType: spec.taskType,
			title: spec.title,
			description: buildHandoffDescription(
				spec,
				input.toothCodes ?? [],
				input.notes ?? "",
			),
			treatmentPlanId: input.treatmentPlanId ?? null,
			assignedDoctorId: input.assignedDoctorId ?? null,
		});
	}

	/** Задачи клиники; при указанном пациенте — только его. Это и есть то, что видит следующий врач. */
	public async listTasks(
		organizationId: string,
		patientId?: string,
	): Promise<ClinicalTaskRecord[]> {
		return await getClinicalTasksFromDb(organizationId, patientId);
	}
}
