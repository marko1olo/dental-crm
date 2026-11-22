import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { appointments, communicationOutbox } from "../../../db/schema.js";
import type { ReminderEffectGroup, ReminderEffectReport, ReportScope } from "./types.js";

const RELIABLE_GROUP_SIZE = 30;

/**
 * Эффект напоминаний (Мандат 8ap).
 * Приём считается напомненным, если хотя бы одно напоминание по нему получило
 * состояние «отправлено» или «доставлено».
 */
export async function reminderEffect(
	scope: ReportScope,
): Promise<ReminderEffectReport> {
	const reminded = db.$with("reminded").as(
		db
			.select({
				appointmentId:
					sql<string>`split_part(${communicationOutbox.dedupeKey}, ':', 2)::uuid`.as(
						"appointment_id",
					),
			})
			.from(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, scope.organizationId),
					sql`${communicationOutbox.dedupeKey} LIKE 'reminder:%'`,
					sql`${communicationOutbox.status} IN ('sent', 'delivered')`,
					sql`split_part(${communicationOutbox.dedupeKey}, ':', 2) ~ '^[0-9a-fA-F-]{36}$'`,
				),
			)
			.groupBy(sql`split_part(${communicationOutbox.dedupeKey}, ':', 2)`),
	);

	const rows = await db
		.with(reminded)
		.select({
			wasReminded:
				sql<boolean>`(${appointments.id} IN (SELECT appointment_id FROM reminded))`.as(
					"was_reminded",
				),
			status: appointments.status,
			total: sql<number>`count(*)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(sql`was_reminded`, appointments.status);

	const empty = (): {
		appointments: number;
		completed: number;
		cancelled: number;
		noShow: number;
	} => ({
		appointments: 0,
		completed: 0,
		cancelled: 0,
		noShow: 0,
	});
	const tally = { reminded: empty(), notReminded: empty() };

	for (const row of rows) {
		const bucket = row.wasReminded ? tally.reminded : tally.notReminded;
		const count = Number(row.total);
		bucket.appointments += count;
		if (row.status === "completed") bucket.completed += count;
		if (row.status === "cancelled") bucket.cancelled += count;
		if (row.status === "no_show") bucket.noShow += count;
	}

	const finish = (bucket: ReturnType<typeof empty>): ReminderEffectGroup => {
		const lost = bucket.cancelled + bucket.noShow;
		return {
			...bucket,
			lost,
			lostRate: bucket.appointments > 0 ? lost / bucket.appointments : null,
		};
	};

	const remindedGroup = finish(tally.reminded);
	const notRemindedGroup = finish(tally.notReminded);
	const comparable =
		remindedGroup.lostRate !== null && notRemindedGroup.lostRate !== null;
	const smallestGroupSize = Math.min(
		remindedGroup.appointments,
		notRemindedGroup.appointments,
	);
	const enoughData = smallestGroupSize >= RELIABLE_GROUP_SIZE;

	const caveat = enoughData
		? "Это сравнение групп, а не доказательство причины: напоминание не уходит пациентам без телефона, " +
			"без согласия и записанным на сегодня, а они и без напоминаний приходят иначе."
		: `Данных мало: в меньшей группе ${smallestGroupSize} приём(ов), а разница становится осмысленной ` +
			`примерно от ${RELIABLE_GROUP_SIZE}. Одна неявка здесь меняет вывод на противоположный — ` +
			"смотрите на состав групп, а не на разницу долей.";

	return {
		reminded: remindedGroup,
		notReminded: notRemindedGroup,
		lostRateDifference: comparable
			? (notRemindedGroup.lostRate as number) -
				(remindedGroup.lostRate as number)
			: null,
		caveat,
		smallestGroupSize,
		enoughData,
		isEmpty: remindedGroup.appointments + notRemindedGroup.appointments === 0,
	};
}
