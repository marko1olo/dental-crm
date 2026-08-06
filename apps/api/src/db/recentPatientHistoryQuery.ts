import { and, desc, eq, notInArray } from "drizzle-orm";
import { db } from "./client.js";
import { patients, recentPatientHistory } from "./schema.js";

/**
 * Сколько карточек помним на сотрудника.
 *
 * Виджет обещает «ТОП 10», и обещание держится на стороне базы, а не нарезкой
 * в разметке: иначе таблица растёт без предела, а на экран всё равно попадают
 * десять.
 */
const KEEP_PER_USER = 10;

/**
 * Недавно открытые карточки конкретного сотрудника.
 *
 * Раньше выборка шла по всей организации и без порядка: сотрудник видел бы
 * чужие просмотры вперемешку, в том порядке, в каком база вернула строки.
 * Значения это не имело, потому что писать в таблицу было некому — она пуста
 * с самого создания, и виджет всегда показывал «История просмотров пуста».
 */
export async function getRecentPatientHistoryFromDb(
	orgId: string,
	userId: string,
) {
	return db
		.select()
		.from(recentPatientHistory)
		.where(
			and(
				eq(recentPatientHistory.organizationId, orgId),
				eq(recentPatientHistory.userId, userId),
			),
		)
		.orderBy(desc(recentPatientHistory.lastViewedAt))
		.limit(KEEP_PER_USER);
}

/**
 * Отметить, что сотрудник открыл карточку пациента.
 *
 * Имя и телефон копируются в строку истории намеренно, а не берутся связью при
 * чтении: список должен открываться одним запросом. Пациент при этом обязан
 * существовать в этой же организации — иначе чужой идентификатор пролез бы в
 * историю прямо из тела запроса.
 *
 * Прежняя запись о том же пациенте удаляется, а не обновляется: уникального
 * ключа по тройке организация—сотрудник—пациент в таблице нет, и заводить его
 * миграцией ради одного места дороже, чем удалить строку. Снаружи разницы нет:
 * карточка в списке одна, меняется только время.
 */
export async function recordPatientViewInDb(
	orgId: string,
	userId: string,
	patientId: string,
): Promise<{ recorded: boolean }> {
	const [patient] = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
		})
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
		.limit(1);
	if (!patient) return { recorded: false };

	await db
		.delete(recentPatientHistory)
		.where(
			and(
				eq(recentPatientHistory.organizationId, orgId),
				eq(recentPatientHistory.userId, userId),
				eq(recentPatientHistory.patientId, patientId),
			),
		);

	await db.insert(recentPatientHistory).values({
		organizationId: orgId,
		userId,
		patientId,
		patientName: patient.fullName,
		phone: patient.phone ?? null,
		lastViewedAt: new Date(),
	});

	/*
	 * Хвост за пределами десятки удаляем сразу, а не по расписанию: иначе
	 * таблица растёт на строку с каждым открытием карточки и за год работы
	 * клиники превращается в журнал на сотни тысяч записей, который никто не
	 * читает.
	 */
	const keep = await db
		.select({ id: recentPatientHistory.id })
		.from(recentPatientHistory)
		.where(
			and(
				eq(recentPatientHistory.organizationId, orgId),
				eq(recentPatientHistory.userId, userId),
			),
		)
		.orderBy(desc(recentPatientHistory.lastViewedAt))
		.limit(KEEP_PER_USER);

	if (keep.length === KEEP_PER_USER) {
		await db.delete(recentPatientHistory).where(
			and(
				eq(recentPatientHistory.organizationId, orgId),
				eq(recentPatientHistory.userId, userId),
				notInArray(
					recentPatientHistory.id,
					keep.map((row) => row.id),
				),
			),
		);
	}

	return { recorded: true };
}
