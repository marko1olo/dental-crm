/**
 * Таблицы рассылок (миграция 0125).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ db/schema.ts
 * schema.ts — файл на две с лишним тысячи строк, который правят одновременно
 * несколько работ. Drizzle не требует держать все таблицы в одном модуле:
 * `pgTable` возвращает самостоятельный объект, а ссылки на соседние таблицы —
 * обычный импорт. Новые таблицы одной предметной области живут здесь, и правка
 * рассылок больше не задевает общий файл.
 *
 * Замечание про db.query: клиент собран как `drizzle(pool, { schema })`, то есть
 * реляционный API `db.query.X` знает только таблицы из schema.ts. Здесь
 * используется обычный построитель запросов (`db.select().from(...)`), которому
 * достаточно самого объекта таблицы.
 */

import {
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import {
	appointments,
	clinics,
	communicationCampaigns,
	communicationCampaignStatus,
	communicationChannel,
	communicationConsentScope,
	communicationTemplates,
	organizations,
	users,
} from "./schema.js";

export { communicationCampaigns, communicationCampaignStatus };

/**
 * Короткие коды для ссылок «подтвердить» и «отменить» приём (миграция 0127).
 *
 * ПОЧЕМУ КОД, А НЕ ПОДПИСАННЫЙ ТОКЕН В АДРЕСЕ. Первая версия несла HMAC-токен на
 * 300 символов. Fastify не сопоставляет параметр маршрута длиннее 100 знаков
 * (maxParamLength по умолчанию), поэтому ссылка отвечала 404 у каждого пациента.
 * И даже с поднятым пределом 300 символов в SMS — это пять лишних сегментов
 * сверх текста: кириллица даёт 70 знаков на сегмент, и напоминание стоило бы
 * клинике в шесть раз дороже.
 *
 * Таблица взамен даёт то, чего у самодостаточного токена нет: ссылку можно
 * отозвать, и видно, когда по ней перешли.
 */
export const appointmentActionCodes = pgTable(
	"appointment_action_codes",
	{
		/** Алфавит без похожих знаков: ссылку иногда перенабирают с экрана. */
		code: text("code").primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		appointmentId: uuid("appointment_id")
			.notNull()
			.references(() => appointments.id, { onDelete: "cascade" }),
		/** confirm | cancel — действие в коде, а не в адресе: ссылка короче. */
		action: text("action").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		/**
		 * Одноразовость не требуется: пациент открывает ссылку дважды и должен
		 * увидеть понятный ответ, а не «ссылка недействительна».
		 */
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			// Один активный код на пару «приём + действие», чтобы прошлые
			// напоминания не расходились с текущим.
			appointmentActionUnique: unique(
				"appointment_action_codes_appointment_action_unique",
			).on(table.appointmentId, table.action),
		};
	},
);
