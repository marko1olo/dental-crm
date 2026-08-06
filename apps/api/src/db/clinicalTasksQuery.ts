import { sql } from "drizzle-orm";
import { db } from "./client.js";

/**
 * Доступ к таблице `clinical_tasks`.
 *
 * БЫЛО: таблица `clinical_tasks` физически существует в базе с самой первой
 * миграции (apps/api/drizzle/0000_freezing_randall_flagg.sql:210), но за всё
 * время в неё не записали ни одной строки — в TypeScript не было ни модели,
 * ни слоя доступа. Единственное место, которое собиралось её заполнять,
 * services/clinical/ClinicalRouter.ts, вместо записи держало комментарий
 * «Mocking db imports» и возвращало задачу вызывающему. Передача пациента
 * между этапами лечения существовала только внутри одного вызова функции:
 * следующий врач не видел её никогда.
 *
 * ПОЧЕМУ ЗДЕСЬ ЯВНЫЙ SQL, А НЕ DRIZZLE-МОДЕЛЬ: в `db/schema.ts` таблицы
 * `clinicalTasks` нет, а добавление модели в схему затрагивает генерацию
 * миграций и должно ехать отдельной миграционной задачей со своим
 * доказательством. Таблица уже создана, поэтому параметризованный SQL через
 * общий пул — единственный способ начать писать в неё, ничего не мигрируя.
 *
 * Раньше здесь стояла ссылка на db/patientServiceLineagesQuery.ts как на второй
 * пример того же приёма. Тот модуль удалён: он читал таблицу
 * patient_service_lineages, в которую никто никогда не писал, и панель над ним
 * не могла заполниться. Разница принципиальная и стоит того, чтобы её назвать:
 * явный SQL оправдан ровно тогда, когда в таблицу есть кому писать. Здесь
 * писатель есть — insertClinicalTaskInDb ниже.
 */

export const CLINICAL_TASK_STATUSES = [
	"pending",
	"in_progress",
	"completed",
	"cancelled",
] as const;
export type ClinicalTaskStatus = (typeof CLINICAL_TASK_STATUSES)[number];

/** Статусы, при которых задача считается ещё не отработанной. */
const OPEN_CLINICAL_TASK_STATUSES: readonly ClinicalTaskStatus[] = [
	"pending",
	"in_progress",
];

/**
 * Список открытых статусов для `IN (...)`.
 *
 * Массив в шаблон `sql` подставлять нельзя: drizzle разворачивает JS-массив в
 * перечисление плейсхолдеров `($1, $2)`, и `($1, $2)::clinical_task_status[]`
 * PostgreSQL читает как приведение записи к массиву — ошибка 42846
 * «cannot cast type record to clinical_task_status[]». Поэтому собираем
 * параметры поштучно из той же константы, без второго списка литералов.
 */
const openClinicalTaskStatusList = sql.join(
	OPEN_CLINICAL_TASK_STATUSES.map(
		(status) => sql`${status}::clinical_task_status`,
	),
	sql`, `,
);

export interface ClinicalTaskRecord {
	id: string;
	organizationId: string;
	patientId: string;
	treatmentPlanId: string | null;
	assignedDoctorId: string | null;
	taskType: string;
	status: ClinicalTaskStatus;
	title: string;
	description: string | null;
	dueAt: string | null;
	createdAt: string;
}

export interface NewClinicalTask {
	patientId: string;
	taskType: string;
	title: string;
	description?: string | null;
	/** Не подставляем сюда ничего «по умолчанию»: неизвестный план лечения — это NULL, а не выдуманный UUID. */
	treatmentPlanId?: string | null;
	assignedDoctorId?: string | null;
	dueAt?: Date | string | null;
	status?: ClinicalTaskStatus;
}

/** Ссылка на строку чужой клиники: вызывающий должен ответить 404, а не 500. */
export class ClinicalTaskOwnershipError extends Error {
	public readonly field: "patientId" | "treatmentPlanId" | "assignedDoctorId";

	constructor(
		field: "patientId" | "treatmentPlanId" | "assignedDoctorId",
		message: string,
	) {
		super(message);
		this.name = "ClinicalTaskOwnershipError";
		this.field = field;
	}
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

function timestampToIso(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

function mapClinicalTaskRow(row: Record<string, unknown>): ClinicalTaskRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		patientId: String(row.patient_id),
		treatmentPlanId:
			row.treatment_plan_id === null || row.treatment_plan_id === undefined
				? null
				: String(row.treatment_plan_id),
		assignedDoctorId:
			row.assigned_doctor_id === null || row.assigned_doctor_id === undefined
				? null
				: String(row.assigned_doctor_id),
		taskType: String(row.task_type),
		status: String(row.status) as ClinicalTaskStatus,
		title: String(row.title),
		description:
			row.description === null || row.description === undefined
				? null
				: String(row.description),
		dueAt: timestampToIso(row.due_at),
		createdAt: timestampToIso(row.created_at) ?? "",
	};
}

/**
 * Внешние ключи таблицы проверяют только существование строки, но не её
 * принадлежность организации. Без этой проверки клиника А смогла бы завести
 * задачу на пациента клиники Б, подставив чужой UUID: организация в строке
 * была бы своя, пациент — чужой, а FK молча пропустил бы такую запись.
 */
async function assertBelongsToOrganization(
	table: "patients" | "treatment_plans" | "users",
	field: "patientId" | "treatmentPlanId" | "assignedDoctorId",
	id: string,
	organizationId: string,
	humanName: string,
): Promise<void> {
	const tableRef =
		table === "patients"
			? sql`patients`
			: table === "treatment_plans"
				? sql`treatment_plans`
				: sql`users`;
	const found = await db.execute(
		sql`SELECT 1 FROM ${tableRef} WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid LIMIT 1`,
	);
	if ((found.rows ?? []).length === 0) {
		throw new ClinicalTaskOwnershipError(
			field,
			`${humanName} не найден в этой клинике.`,
		);
	}
}

/**
 * Записывает клиническую задачу и возвращает сохранённую строку.
 *
 * Повторная отправка того же завершения этапа не плодит дубли: если у пациента
 * уже висит незакрытая задача с тем же типом, заголовком и текстом, возвращается
 * она же. Это защита от двойного нажатия, а не транзакционная гарантия —
 * уникального индекса на таблице нет, и при двух одновременных запросах гонка
 * всё ещё возможна. Индекс требует миграции и вынесен в долг.
 */
export async function insertClinicalTaskInDb(
	organizationId: string,
	input: NewClinicalTask,
): Promise<ClinicalTaskRecord> {
	await assertBelongsToOrganization(
		"patients",
		"patientId",
		input.patientId,
		organizationId,
		"Пациент",
	);
	if (input.treatmentPlanId) {
		await assertBelongsToOrganization(
			"treatment_plans",
			"treatmentPlanId",
			input.treatmentPlanId,
			organizationId,
			"План лечения",
		);
	}
	if (input.assignedDoctorId) {
		await assertBelongsToOrganization(
			"users",
			"assignedDoctorId",
			input.assignedDoctorId,
			organizationId,
			"Врач",
		);
	}

	const description = input.description ?? null;
	const treatmentPlanId = input.treatmentPlanId ?? null;
	const assignedDoctorId = input.assignedDoctorId ?? null;
	const dueAt = toIsoOrNull(input.dueAt);
	const status: ClinicalTaskStatus = input.status ?? "pending";

	const inserted = await db.execute(sql`
    INSERT INTO clinical_tasks (
      organization_id, patient_id, treatment_plan_id, assigned_doctor_id,
      task_type, status, title, description, due_at
    )
    SELECT
      ${organizationId}::uuid, ${input.patientId}::uuid, ${treatmentPlanId}::uuid, ${assignedDoctorId}::uuid,
      ${input.taskType}::text, ${status}::clinical_task_status, ${input.title}::text,
      ${description}::text, ${dueAt}::timestamptz
    WHERE NOT EXISTS (
      SELECT 1 FROM clinical_tasks existing
      WHERE existing.organization_id = ${organizationId}::uuid
        AND existing.patient_id = ${input.patientId}::uuid
        AND existing.task_type = ${input.taskType}::text
        AND existing.title = ${input.title}::text
        AND existing.description IS NOT DISTINCT FROM ${description}::text
        AND existing.status IN (${openClinicalTaskStatusList})
    )
    RETURNING *
  `);

	const insertedRow = (inserted.rows ?? [])[0];
	if (insertedRow)
		return mapClinicalTaskRow(insertedRow as Record<string, unknown>);

	const existing = await db.execute(sql`
    SELECT * FROM clinical_tasks
    WHERE organization_id = ${organizationId}::uuid
      AND patient_id = ${input.patientId}::uuid
      AND task_type = ${input.taskType}::text
      AND title = ${input.title}::text
      AND description IS NOT DISTINCT FROM ${description}::text
      AND status IN (${openClinicalTaskStatusList})
    ORDER BY created_at ASC
    LIMIT 1
  `);
	const existingRow = (existing.rows ?? [])[0];
	if (!existingRow) {
		throw new Error(
			"Клиническая задача не записана и не найдена повторно — вставка была отменена условием защиты от дублей, но открытой задачи в базе нет.",
		);
	}
	return mapClinicalTaskRow(existingRow as Record<string, unknown>);
}

/** Читает задачи организации; при указанном пациенте — только его. */
export async function getClinicalTasksFromDb(
	organizationId: string,
	patientId?: string,
): Promise<ClinicalTaskRecord[]> {
	const query = patientId
		? sql`SELECT * FROM clinical_tasks WHERE organization_id = ${organizationId}::uuid AND patient_id = ${patientId}::uuid ORDER BY created_at DESC`
		: sql`SELECT * FROM clinical_tasks WHERE organization_id = ${organizationId}::uuid ORDER BY created_at DESC`;
	const res = await db.execute(query);
	// `row: unknown`, а не выведенный any: у сырого SQL через db.execute тип строки
	// неизвестен, и приведение к Record<string, unknown> уже стоит внутри вызова.
	// Аннотация делает это явным для noImplicitAny и не меняет поведения.
	return (res.rows ?? []).map((row: unknown) =>
		mapClinicalTaskRow(row as Record<string, unknown>),
	);
}
