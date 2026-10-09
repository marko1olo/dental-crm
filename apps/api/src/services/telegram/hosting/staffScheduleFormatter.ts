import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { appointments, chairs } from "../../../db/schema.js";
import type { BuildScheduleParams, BuildScheduleResult } from "./types.js";

/**
 * Модуль формирования защищенного расписания персонала клиники для Telegram (Layer 2).
 * Обеспечивает отображение графика приемов без разглашения ПДн пациентов (ст. 13 323-ФЗ).
 */
export class TelegramStaffScheduleFormatter {
	/**
	 * Формирование ответа с расписанием врача на сегодня или завтра.
	 */
	static async buildStaffScheduleReply(
		params: BuildScheduleParams,
	): Promise<BuildScheduleResult> {
		const targetDate = new Date();
		targetDate.setDate(targetDate.getDate() + (params.dayOffset || 0));

		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		const dateTitle =
			params.dayOffset === 1
				? "завтра"
				: targetDate.toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "long",
						weekday: "short",
					});

		// Выбираем приёмы врача из PostgreSQL
		const appts = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				chairId: appointments.chairId,
				reason: appointments.reason,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, params.organizationId),
					eq(appointments.doctorUserId, params.staffUserId),
					sql`${appointments.startsAt} >= ${startOfDay} AND ${appointments.startsAt} <= ${endOfDay}`,
				),
			)
			.orderBy(sql`${appointments.startsAt} ASC`);

		if (appts.length === 0) {
			return {
				text: `DENTE: Расписание на ${dateTitle} свободно. Запланированных приёмов нет.`,
				appointmentCount: 0,
			};
		}

		// Загружаем названия кресел
		const chairRows = await db
			.select({ id: chairs.id, name: chairs.name })
			.from(chairs)
			.where(eq(chairs.organizationId, params.organizationId));

		const chairMap = new Map(chairRows.map((c) => [c.id, c.name]));

		const statusIcons: Record<string, string> = {
			confirmed: "✅ Подтверждён",
			planned: "⏳ Запланирован",
			in_progress: "🩺 На приёме",
			completed: "🏁 Завершён",
			cancelled: "❌ Отменён",
			no_show: "⚠️ Не явился",
		};

		const lines: string[] = [
			`📅 Расписание приёмов на ${dateTitle}:`,
			`Всего визитов: ${appts.length}`,
			"━━━━━━━━━━━━━━━━━━",
		];

		for (const apt of appts) {
			const timeStr = new Date(apt.startsAt).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
			const endTimeStr = new Date(apt.endsAt).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
			const chairName = (apt.chairId && chairMap.get(apt.chairId)) || "Кабинет";
			const statusLabel = statusIcons[apt.status] || apt.status;

			lines.push(`⏰ ${timeStr}–${endTimeStr} · ${chairName}`);
			lines.push(`   Статус: ${statusLabel}`);
			lines.push("");
		}

		lines.push(
			"🔒 Внимание: в соответствии со ст. 13 323-ФЗ ФИО пациентов и диагнозы доступны только в защищённой CRM.",
		);

		return {
			text: lines.join("\n"),
			appointmentCount: appts.length,
		};
	}
}
