import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { patientCtPlannings, patients } from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { clinicSessionMissingMessage } from "../utils/clinicSessionRefusal.js";

/**
 * РАЗМЕТКА ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ: ХРАНЕНИЕ.
 *
 * Врач обводит зубную дугу на КЛКТ инструментом «Дуга (Spline)» и расставляет
 * импланты — это разметка, вокруг которой планируется операция. Эти два адреса
 * были дописаны до конца (отбор по организации, upsert по паре
 * пациент + исследование), но НЕ ВЫЗЫВАЛИСЬ КЛИЕНТОМ НИ РАЗУ: замерено поиском по
 * всему дереву. Разметка жила в памяти экрана и умирала при уходе с него.
 * Клиентская половина теперь есть — `apps/web/src/components/dicom/ctPlanningPersistence.ts`.
 *
 * ТРИ ВЕЩИ, ИСПРАВЛЕННЫЕ ЗДЕСЬ ПРИ СШИВАНИИ.
 *
 * 1. РАЗБОР КОЛОНОК БЫЛ СБИТ РАСХОЖДЕНИЕМ СХЕМЫ С БАЗОЙ. `db/schema.ts:1901-1903`
 *    объявляет `spline_points_json`, `nerve_points_json`, `implants_json` типом
 *    `jsonb`. Миграция, создавшая таблицу, объявила их
 *    `text DEFAULT '[]' NOT NULL` (`drizzle/0000_freezing_randall_flagg.sql:828-830`),
 *    и в живой базе они `text` — миграция 0118 их не переписывала, она лишь
 *    добавила четыре других столбца. Расходится именно `schema.ts`.
 *
 *    Цена расхождения ИЗМЕРЕНА независимым psql, а не выведена из кода. У drizzle
 *    класс `jsonb` при записи делает `JSON.stringify`
 *    (`drizzle-orm/pg-core/columns/jsonb.js:22`), поэтому строка `[{"x":1}]`
 *    ложилась в текстовую колонку как `"[{\"x\":1}]"` — с внешними кавычками и
 *    экранированием. При чтении тот же класс делает `JSON.parse` (`:24-33`), так
 *    что круг сходился и дефект был невидим снаружи. Но:
 *      • в базе лежал текст в двойной кодировке, то есть ни отчётом, ни запросом
 *        разметку прочитать было нельзя;
 *      • строка, оставленная значением колонки по умолчанию (`'[]'`),
 *        возвращалась МАССИВОМ, а записанная маршрутом — СТРОКОЙ. Одна колонка,
 *        два разных типа на выходе, и клиент обязан был угадывать.
 *    Обход здесь местный и явный: три колонки читаются и пишутся с приведением к
 *    тексту, минуя сбитый разбор. `db/schema.ts` занят другой волной, поэтому
 *    правка типа колонки уходит следующей волне; приведение к тексту верно и для
 *    `text` (сегодня), и для `jsonb` (если схема когда-нибудь победит) на чтении.
 *
 * 2. ЛЮБОЙ ПРОМАХ РАЗБОРА ТЕЛА ОТВЕЧАЛ 500 «Internal server error». Схема
 *    вызывалась через `parse`, её исключение ловил общий `catch`, и врач читал
 *    ошибку запроса как поломку сервера — то есть повторял действие, которое не
 *    могло удаться. Теперь `safeParse` и 400 с русской причиной.
 *
 * 3. ОТКАЗ «НЕТ КАБИНЕТА» БЫЛ ФРАЗОЙ БЕЗ ДЕЙСТВИЯ. Общий путь
 *    (`security/identity.ts:234-237`) отвечает «Требуется авторизация рабочего
 *    кабинета клиники.» — что произошло есть, что делать нет, а врач в этот момент
 *    уже обвёл дугу и должен услышать, что обведённое не потеряно. Текст берётся из
 *    общего дома `utils/clinicSessionRefusal.ts`. Проверка личности перед
 *    `requireResolvedOrganizationId` только ПОДМЕНЯЕТ ТЕКСТ на состоянии «клиники в
 *    запросе нет вовсе»: сам страж по-прежнему вызывается и по-прежнему решает
 *    судьбу непроверенной организации, поэтому отбор по клинике не ослаблен.
 *
 * ИМЕНА ПОЛЕЙ ИССЛЕДОВАНИЯ НЕСИММЕТРИЧНЫ И ОСТАВЛЕНЫ КАК ЕСТЬ: сохранение
 * принимает `studyInstanceUid` в теле, чтение — `studyUid` в строке запроса.
 * Переименование сломало бы клиента ради красоты; вместо этого разница записана
 * ровно в одном месте на клиенте, в `ctPlanningLoadUrl`.
 */

const savePlanningSchema = z.object({
	patientId: z.string().uuid(),
	studyInstanceUid: z.string().min(1),
	splinePointsJson: z.string().optional(),
	nervePointsJson: z.string().optional(),
	implantsJson: z.string().optional(),
});

const loadPlanningQuerySchema = z.object({
	studyUid: z.string().min(1),
	patientId: z.string().uuid(),
});

const CLINIC_UNKNOWN_SAVE_MESSAGE = clinicSessionMissingMessage(
	"разметка планирования имплантации сохраняется только из кабинета, обведённая дуга остаётся на экране",
);

const CLINIC_UNKNOWN_LOAD_MESSAGE = clinicSessionMissingMessage(
	"сохранённая разметка планирования имплантации открывается только из кабинета",
);

const PATIENT_NOT_FOUND_SAVE_MESSAGE =
	"Разметка не сохранена — карточки этого пациента в вашей клинике нет. " +
	"Откройте снимок из карточки пациента и повторите действие, обведённая дуга остаётся на экране.";

const PATIENT_NOT_FOUND_LOAD_MESSAGE =
	"Сохранённую разметку открыть нельзя — карточки этого пациента в вашей клинике нет. " +
	"Откройте снимок из карточки пациента.";

const BAD_SAVE_BODY_MESSAGE =
	"Разметка не сохранена — запрос пришёл без пациента или без номера исследования. " +
	"Откройте снимок заново из карточки пациента и повторите действие.";

const BAD_LOAD_QUERY_MESSAGE =
	"Сохранённую разметку открыть нельзя — запрос пришёл без пациента или без номера исследования. " +
	"Откройте снимок заново из карточки пациента.";

const SAVE_FAILED_MESSAGE =
	"Разметка не сохранена — сервер не смог записать её в базу. " +
	"Повторите через минуту, обведённая дуга остаётся на экране.";

const LOAD_FAILED_MESSAGE =
	"Сохранённую разметку прочитать не удалось — сервер ответил ошибкой. " +
	"Откройте снимок заново через минуту.";

/**
 * Значение для трёх текстовых колонок разметки, минуя разбор `jsonb` из
 * `schema.ts`. Без приведения drizzle обернул бы уже готовый текст ещё в один
 * `JSON.stringify` — см. пункт 1 в шапке файла.
 */
function markupText(json: string | undefined) {
	return sql`${json ?? "[]"}::text`;
}

/**
 * Поля строки разметки для ответа клиенту. Три колонки разметки читаются
 * приведением к тексту по той же причине, по которой пишутся: иначе значение
 * колонки по умолчанию вернулось бы массивом, а записанное маршрутом — строкой.
 */
const planningSelection = {
	id: patientCtPlannings.id,
	patientId: patientCtPlannings.patientId,
	studyInstanceUid: patientCtPlannings.studyInstanceUid,
	splinePointsJson: sql<string>`${patientCtPlannings.splinePointsJson}::text`,
	nervePointsJson: sql<string>`${patientCtPlannings.nervePointsJson}::text`,
	implantsJson: sql<string>`${patientCtPlannings.implantsJson}::text`,
	updatedAt: patientCtPlannings.updatedAt,
	createdAt: patientCtPlannings.createdAt,
} as const;

export async function registerImagingPlanningRoutes(app: FastifyInstance) {
	// POST /api/imaging/planning/save
	app.post("/api/imaging/planning/save", async (request, reply) => {
		try {
			if (!getRequestIdentity(request).organizationId) {
				return reply
					.status(401)
					.send({ error: "AuthRequired", message: CLINIC_UNKNOWN_SAVE_MESSAGE });
			}
			const orgId = await requireResolvedOrganizationId(request, reply, "save ct planning");
			if (!orgId) return;

			const parsed = savePlanningSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "InvalidPlanningPayload", message: BAD_SAVE_BODY_MESSAGE });
			}
			const {
				patientId,
				studyInstanceUid,
				splinePointsJson,
				nervePointsJson,
				implantsJson,
			} = parsed.data;

			// Verify patient belongs to organization
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return reply
					.status(404)
					.send({ error: "Patient not found", message: PATIENT_NOT_FOUND_SAVE_MESSAGE });
			}

			// Check if planning already exists
			const [existing] = await db
				.select({ id: patientCtPlannings.id })
				.from(patientCtPlannings)
				.where(
					and(
						eq(patientCtPlannings.organizationId, orgId),
						eq(patientCtPlannings.patientId, patientId),
						eq(patientCtPlannings.studyInstanceUid, studyInstanceUid),
					),
				)
				.limit(1);

			if (existing) {
				await db
					.update(patientCtPlannings)
					.set({
						splinePointsJson: markupText(splinePointsJson),
						nervePointsJson: markupText(nervePointsJson),
						implantsJson: markupText(implantsJson),
						updatedAt: new Date(),
					})
					.where(eq(patientCtPlannings.id, existing.id));
			} else {
				await db.insert(patientCtPlannings).values({
					organizationId: orgId,
					patientId,
					studyInstanceUid,
					splinePointsJson: markupText(splinePointsJson),
					nervePointsJson: markupText(nervePointsJson),
					implantsJson: markupText(implantsJson),
				});
			}

			return reply.status(200).send({ success: true });
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ error: "Internal server error", message: SAVE_FAILED_MESSAGE });
		}
	});

	// GET /api/imaging/planning/load
	app.get("/api/imaging/planning/load", async (request, reply) => {
		try {
			if (!getRequestIdentity(request).organizationId) {
				return reply
					.status(401)
					.send({ error: "AuthRequired", message: CLINIC_UNKNOWN_LOAD_MESSAGE });
			}
			const orgId = await requireResolvedOrganizationId(request, reply, "load ct planning");
			if (!orgId) return;

			const parsed = loadPlanningQuerySchema.safeParse(request.query);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "InvalidPlanningQuery", message: BAD_LOAD_QUERY_MESSAGE });
			}
			const { studyUid, patientId } = parsed.data;

			// Verify patient belongs to organization
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return reply
					.status(404)
					.send({ error: "Patient not found", message: PATIENT_NOT_FOUND_LOAD_MESSAGE });
			}

			const [planning] = await db
				.select(planningSelection)
				.from(patientCtPlannings)
				.where(
					and(
						eq(patientCtPlannings.organizationId, orgId),
						eq(patientCtPlannings.patientId, patientId),
						eq(patientCtPlannings.studyInstanceUid, studyUid),
					),
				)
				.limit(1);

			if (planning) {
				return reply.send({ success: true, planning });
			}
			return reply.send({ success: true, planning: null });
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ error: "Internal server error", message: LOAD_FAILED_MESSAGE });
		}
	});
}
