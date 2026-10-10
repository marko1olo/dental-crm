import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import type { OpenVisitForAppointmentResult } from "./types.js";

export async function getVisitByIdInDb(organizationId: string, id: string) {
	const [res] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, id),
			),
		)
		.limit(1);
	return res || null;
}

/**
 * ЗАЧЕМ ЭТА ФУНКЦИЯ СУЩЕСТВУЕТ.
 *
 * До неё в apps/api не было НИ ОДНОГО боевого маршрута, создающего строку в
 * `visits`. Вставки жили только в разовом переносе состояния
 * (scripts/migrateStateToDb.ts), демо-пресете мастера первого запуска
 * (routes/workspaceProfile.ts), посеве для снимков
 * (scripts/seedOpsScreenshotDemo.ts) и импорте из чужой системы
 * (migration/loader.ts). То есть карта приёма в продукте не открывалась ничем:
 * клиент берёт `dashboard.activeVisit`, а это «последний ЧЕРНОВИК клиники,
 * иначе последний визит любого статуса» (db/domainStateHydration.ts,
 * applyActiveVisit). На живой базе там оказывался ПОДПИСАННЫЙ визит, и
 * автосохранение черновика отвечало 404/409 — врач у кресла не мог записать
 * приём вовсе, а текст отказа предлагал «выберите актуальный прием», которого
 * не существовало.
 *
 * Отсюда же тянулась касса: оплата отклонялась, если открытый приём принадлежит
 * другому пациенту (apps/web/src/hooks/domains/usePatientLogic.ts), а сменить
 * открытый приём было нечем. Теперь способ есть: открыть приём по записи
 * расписания того пациента, которому принимают оплату.
 *
 * ИДЕМПОТЕНТНОСТЬ ОБЯЗАТЕЛЬНА. Повторное нажатие «Открыть приём» не смеет
 * создавать второй визит по одной записи: второй визит увёл бы за собой
 * `activeVisit`, ЭМК врача осталась бы в первом, а `payments.visit_id`
 * указывал бы на пустой второй — деньги перестали бы относиться к лечению.
 * Поэтому существующий визит записи возвращается как есть, а строка записи
 * блокируется `for update`: два кресла, нажавшие одновременно, выстраиваются в
 * очередь, и второй вызов видит визит первого.
 */
export async function openVisitForAppointmentInDb(
	organizationId: string,
	appointmentId: string,
): Promise<OpenVisitForAppointmentResult> {
	return db.transaction(async (tx) => {
		const [appointment] = await tx
			.select({
				id: schema.appointments.id,
				patientId: schema.appointments.patientId,
				status: schema.appointments.status,
			})
			.from(schema.appointments)
			.where(
				and(
					eq(schema.appointments.id, appointmentId),
					eq(schema.appointments.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);
		if (!appointment) throw new Error("Запись не найдена");
		if (!appointment.patientId) throw new Error("У записи нет пациента");
		// Отменённый приём и неявку лечить нечем: открытый по ним визит стал бы
		// носителем ЭМК и денег по приёму, которого не было.
		if (
			appointment.status === "cancelled" ||
			appointment.status === "no_show"
		) {
			throw new Error("Запись отменена");
		}

		const [existing] = await tx
			.select()
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.appointmentId, appointmentId),
					eq(schema.visits.organizationId, organizationId),
				),
			)
			.orderBy(schema.visits.createdAt)
			.limit(1);
		if (existing) {
			return {
				visit: {
					id: existing.id,
					organizationId: existing.organizationId,
					patientId: existing.patientId,
					appointmentId: existing.appointmentId,
					status: existing.status,
					createdAt: existing.createdAt.toISOString(),
					updatedAt: existing.updatedAt.toISOString(),
				},
				created: false,
			};
		}

		const [created] = await tx
			.insert(schema.visits)
			.values({
				organizationId,
				patientId: appointment.patientId,
				appointmentId,
				status: "draft",
				revision: 1,
			})
			.returning();
		if (!created) throw new Error("Прием не открыт");

		return {
			visit: {
				id: created.id,
				organizationId: created.organizationId,
				patientId: created.patientId,
				appointmentId: created.appointmentId,
				status: created.status,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString(),
			},
			created: true,
		};
	});
}
