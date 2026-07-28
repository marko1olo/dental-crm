-- Рекламации и осложнения по пациенту.
--
-- ЗАЧЕМ. Экран карточки пациента уже год обещает журнал рекламаций:
-- apps/web/src/components/patients/PatientReclamationsWidget.tsx умеет
-- фиксировать жалобу, назначать врача-автора работы, помечать инцидент
-- урегулированным и удалять запись. Кода экрана там на 588 строк, он честно
-- разводит загрузку, отказ и пустоту — а сервера под ним не было вовсе. Живая
-- проверка сети (scratch/probe-failed-requests.mjs) показала на карточке
-- пациента 404 GET /api/patients/:id/reclamations: врач нажимал
-- «Зафиксировать в карту», получал отказ и не имел ни одного способа сохранить
-- претензию. Рекламация — основание для гарантии, возврата и переделки, то есть
-- прямые деньги и разбор с врачом.
--
-- Долг был записан в apps/api/src/tests/webCallsExistingRoutes.test.ts со
-- словами «таблицы есть, маршрутов нет». Это оказалось неправдой: ни таблицы, ни
-- маршрута. Комментарий исправлен вместе с этой миграцией.
--
-- РЕШЕНИЯ ПО СТОЛБЦАМ. Имена полей повторяют то, что уже отправляет и читает
-- экран (complicationDetails, proposedAction, doctorId, status, resolvedAt) —
-- выдумывать свой контракт поверх работающего клиента значило бы сломать его.
-- organization_id обязателен и с внешним ключом: изоляция клиники здесь не
-- удобство, а сохранность врачебной тайны.
CREATE TABLE IF NOT EXISTS "patient_reclamations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	-- Врач-автор работы. Без внешнего ключа намеренно: сотрудника могут удалить
	-- из штата, а разбор по его работе обязан остаться в карте. Экран уже умеет
	-- показывать «Неизвестный врач», если сотрудник не найден.
	"doctor_id" uuid,
	"complication_details" text NOT NULL,
	"proposed_action" text,
	-- Ровно два значения, которыми пользуется экран: под рассмотрением и
	-- урегулировано. Ограничение стоит в базе, чтобы третье значение не пришло
	-- мимо проверки на сервере и не осталось навсегда невидимым в интерфейсе.
	"status" text NOT NULL DEFAULT 'under_review',
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_reclamations_status_check" CHECK ("status" IN ('under_review', 'resolved'))
);

-- Журнал всегда читают по одной карте и всегда в порядке «свежие сверху».
CREATE INDEX IF NOT EXISTS "patient_reclamations_patient_idx"
	ON "patient_reclamations" ("organization_id", "patient_id", "created_at" DESC);
