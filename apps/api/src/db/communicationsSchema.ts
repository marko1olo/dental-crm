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

import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import {
	appointments,
	clinics,
	communicationChannel,
	communicationConsentScope,
	communicationTemplates,
	organizations,
	users
} from "./schema.js";

export const communicationCampaignStatus = pgEnum("communication_campaign_status", [
	"draft",
	"scheduled",
	"running",
	"completed",
	"cancelled"
]);

export const communicationCampaigns = pgTable(
	"communication_campaigns",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicId: uuid("clinic_id").references(() => clinics.id),
		title: text("title").notNull(),
		templateId: uuid("template_id").references(() => communicationTemplates.id),
		channel: communicationChannel("channel").notNull(),
		/**
		 * По умолчанию рекламная: «приходите на чистку со скидкой» — реклама, и
		 * без согласия пациента она не уйдёт (ФЗ «О рекламе» ст. 18 ч. 1).
		 */
		scope: communicationConsentScope("scope").notNull().default("marketing"),
		status: communicationCampaignStatus("status").notNull().default("draft"),
		/** Условия отбора: закрытый набор признаков, не произвольный SQL. */
		audienceJson: text("audience_json").notNull().default("{}"),
		/**
		 * Кто попал в рассылку и кто отсеян, с причинами, на момент запуска.
		 * Пересчитать это позже нельзя: пациенты успеют прийти на приём,
		 * оплатить долг и отозвать согласие, и выборка даст другой ответ.
		 */
		audienceSnapshotJson: text("audience_snapshot_json"),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
		launchedAt: timestamp("launched_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdByUserId: uuid("created_by_user_id").references(() => users.id),
		launchedByUserId: uuid("launched_by_user_id").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			campaignOrgCreatedIdx: index("communication_campaigns_org_created_idx").on(table.organizationId, table.createdAt)
		};
	}
);

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
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			// Один активный код на пару «приём + действие», чтобы прошлые
			// напоминания не расходились с текущим.
			appointmentActionUnique: unique("appointment_action_codes_appointment_action_unique").on(
				table.appointmentId,
				table.action
			)
		};
	}
);
