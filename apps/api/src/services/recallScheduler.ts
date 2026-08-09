import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	communicationTasks,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";

/**
 * ДАТА ЧЕРЕЗ N КАЛЕНДАРНЫХ МЕСЯЦЕВ. МЕСЯЦ — НЕ 30 ДНЕЙ И НЕ ОДИНАКОВОЙ ДЛИНЫ.
 *
 * ЧТО БЫЛО СЛОМАНО. Срок приживления считался как
 * `healingDate.setMonth(healingDate.getMonth() + healingMonths)`. `setMonth` не
 * проверяет, существует ли текущее число в целевом месяце, и переполнение
 * молча уносит дату в следующий месяц. Измерено:
 *   31 августа + 6 месяцев → «31 февраля» → 3 марта (правильно 28 февраля, +3 дня)
 *   30 ноября  + 3 месяца  → «30 февраля» → 2 марта (правильно 28 февраля, +2 дня)
 *   31 августа + 3 месяца  → «31 ноября»  → 1 декабря (правильно 30 ноября, +1 день)
 *
 * НАПРАВЛЕНИЕ СНОСА — ВСЕГДА ВПЕРЁД. Переполнение может только добавить дни,
 * поэтому приглашение на 3-й этап имплантации уходит на 1-3 дня ПОЗЖЕ срока
 * приживления, а не раньше. Клинически это безопаснее обратного случая, но
 * дефект настоящий: у имплантов, поставленных в конце длинного месяца, срок
 * съезжает в другой месяц, и очередь напоминаний расходится с планом лечения.
 *
 * Приём тот же, что уже применён в `routes/analytics.ts:51-62`: сначала первое
 * число (перескок становится невозможен), потом месяц, потом число, прижатое к
 * длине целевого месяца. Время суток сохраняется — сравнение `now >= healingDate`
 * идёт по мгновению.
 */
interface RecallItem {
	patientId: string;
	planName: string;
	planId: string;
	toothNumber: number | null;
	itemDate: Date | null;
	patientFullName: string;
	organizationId: string;
}

function buildRecallTask(
	item: RecallItem,
	now: Date,
): typeof communicationTasks.$inferInsert | null {
	if (!item.toothNumber) return null;
	// Без даты плана срок приживления не отсчитать. Раньше здесь было
	// new Date(item.itemDate) при itemDate === null, что даёт 1 января
	// 1970 года: условие now >= healingDate выполнялось всегда, и на
	// каждый имплант без даты создавалась задача «пригласить на 3-й
	// этап», хотя приживление ещё не прошло.
	if (!item.itemDate) return null;

	const isUpperJaw = item.toothNumber < 30;
	const healingMonths = isUpperJaw ? 6 : 3;

	const healingDate = addCalendarMonths(new Date(item.itemDate), healingMonths);

	if (now >= healingDate) {
		return {
			id: randomUUID(),
			organizationId: item.organizationId,
			patientId: item.patientId,
			assignedRole: "admin",
			channel: "whatsapp",
			intent: "recall",
			status: "queued",
			priority: "high",
			dueAt: new Date(Date.now() + 86400000),
			title: `Пригласить пациента на 3-й этап (зуб ${item.toothNumber})`,
			body: `Пациент: ${item.patientFullName}. Прошло необходимое время приживления. План: ${item.planName}.`,
		};
	}

	return null;
}

export function addCalendarMonths(from: Date, months: number): Date {
	const shifted = new Date(from.getTime());
	if (Number.isNaN(shifted.getTime())) return shifted;

	// Первое число целевого месяца: с него переполнение невозможно.
	shifted.setDate(1);
	shifted.setMonth(shifted.getMonth() + months);

	// День 0 следующего месяца — последний день целевого.
	const lastDayOfTargetMonth = new Date(
		shifted.getFullYear(),
		shifted.getMonth() + 1,
		0,
	).getDate();
	shifted.setDate(Math.min(from.getDate(), lastDayOfTargetMonth));
	return shifted;
}

// biome-ignore lint/complexity/noStaticOnlyClass: automated suppression
export class RecallScheduler {
	/**
	 * Run this periodically (e.g., via node-cron or setInterval)
	 * Scans for completed surgical phases and triggers recall if the waiting period is over.
	 */
	static async processOsteointegrationRecalls() {
		console.log("[RecallScheduler] Scanning for osteointegration recalls...");

		try {
			const readyForCrown = await db
				.select({
					patientId: treatmentPlans.patientId,
					planName: treatmentPlans.name,
					planId: treatmentPlans.id,
					toothNumber: treatmentPlanItemsNew.toothNumber,
					itemDate: treatmentPlans.updatedAt,
					patientFullName: patients.fullName,
					organizationId: patients.organizationId,
				})
				.from(treatmentPlanItemsNew)
				.innerJoin(
					treatmentPlans,
					eq(treatmentPlans.id, treatmentPlanItemsNew.planId),
				)
				.innerJoin(patients, eq(patients.id, treatmentPlans.patientId))
				.where(
					and(
						eq(treatmentPlanItemsNew.phase, 2), // Surgery phase
					),
				);

			const tasksToInsert: (typeof communicationTasks.$inferInsert)[] = [];
			const now = new Date();

			for (const item of readyForCrown) {
				const task = buildRecallTask(item, now);
				if (task) {
					tasksToInsert.push(task);
				}
			}

			if (tasksToInsert.length > 0) {
				await db.insert(communicationTasks).values(tasksToInsert);
				console.log(
					`[RecallScheduler] Created ${tasksToInsert.length} recall tasks for admin.`,
				);
			}
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (e: any) {
			console.warn("[RecallScheduler notice]:", e?.message || e);
		}
	}
}
