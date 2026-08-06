/**
 * Таблицы, относящиеся к разбору дублей пациентов (миграция 0128).
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ db/schema.ts
 * schema.ts — файл на две с лишним тысячи строк, который правят одновременно
 * несколько работ; каждая правка в нём рискует захватить чужое. Drizzle не
 * требует держать все таблицы в одном модуле.
 *
 * ПОЧЕМУ НЕ ИСПОЛЬЗУЕТСЯ patient_duplicate_merge_queues
 * В живой базе та таблица собрана из двух поколений колонок одновременно:
 * primary_patient_name / duplicate_patient_name / match_confidence_percent /
 * merge_status (их читает виджет) и source_patient_id / target_patient_id /
 * match_score / status (их объявляет ORM). Маршрута между ними нет вовсе —
 * /api/crm/patient-duplicate-merge-queues отвечает 404. Дописывать третье
 * поколение в ту же таблицу значит закрепить путаницу.
 */

import {
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, patients, users } from "./schema.js";

export const patientDuplicateDecisions = pgTable(
	"patient_duplicate_decisions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		/**
		 * Пара в устойчивом порядке: меньший идентификатор слева. Иначе одно и то
		 * же решение записалось бы дважды в обратном порядке и продолжало
		 * предлагаться.
		 */
		/*
		 * onDelete: cascade — так в живой базе после миграции 0130. Решение о паре
		 * бессмысленно без одной из сторон, и без каскада запись держала пациента:
		 * удалить его не могли ни очистка тестовых данных, ни удаление по
		 * требованию субъекта персональных данных.
		 */
		leftPatientId: uuid("left_patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		rightPatientId: uuid("right_patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		/** dismissed — «это разные люди»; merged — карточки объединены. */
		decision: text("decision").notNull(),
		/** Слияние медицинских карт должно быть объяснимо: кто и когда. */
		decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
		decidedAt: timestamp("decided_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		reason: text("reason"),
		/** Что именно перенесено: таблица → число строк, в виде JSON. */
		movedRowsJson: text("moved_rows_json"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			pairUnique: unique("patient_duplicate_decisions_pair_unique").on(
				table.organizationId,
				table.leftPatientId,
				table.rightPatientId,
			),
			orgIdx: index("patient_duplicate_decisions_org_idx").on(
				table.organizationId,
				table.decidedAt,
			),
		};
	},
);
