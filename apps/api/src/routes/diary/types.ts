import { z } from "zod";
import { clinicNotIdentifiedMessage } from "../../utils/clinicSessionRefusal.js";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

/**
 * ДНЕВНИК ПРИЁМА ОТКАЗЫВАЛ КОДОМ, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО. Доказано запросом в процессе (`app.inject`, не дев-сервер): чтение
 * дневника, чтение истории правок, сохранение дневника и его исправление
 * отвечали телом `{"error":"OrgRequired"}` — без поля `message`. Пятая ветка, в
 * подписании (`/lock`), текст имела, но СВОЙ, третьей копией той же фразы в
 * дереве.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Живой клиент подписания
 * (`apps/web/src/components/useVisitDiaryLogic.ts:530-540`) печатает поле
 * `message` тостом ДОСЛОВНО, а без него строит подсказку по коду ответа. Для 403
 * это «войдите в смену заново или попросите администратора открыть доступ» —
 * ложное указание: смена тут не при чём, не определён кабинет клиники. Дневник
 * приёма — юридический документ, и врач, не понявший отказ, либо теряет
 * набранный текст, либо переписывает его во второй записи.
 *
 * ЧЕГО СЕРВЕР НЕ ЗНАЕТ, ТОГО И НЕ УТВЕРЖДАЕТ. `resolveOrganizationId` возвращает
 * null и когда токена кабинета нет, и когда `verifyToken` его отверг
 * (`security/identity.ts`): различить эти два состояния здесь нечем. Поэтому
 * текст называет обе возможные причины и одно действие, которое лечит любую.
 *
 * Коды ответа и значения поля `error` сохранены дословно. Текст живёт в общем
 * доме `utils/clinicSessionRefusal.ts`, чтобы четвёртой копии не появилось.
 */
export const DIARY_CLINIC_UNKNOWN_READ_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не открыть",
);
export const DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE = clinicNotIdentifiedMessage(
	"историю правок дневника не показать",
);
export const DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не сохранить",
	"набранный текст остаётся на экране, не закрывайте приём",
);
export const DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE = clinicNotIdentifiedMessage(
	"подписать дневник нельзя",
	"набранный текст остаётся на экране",
);
export const DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE = clinicNotIdentifiedMessage(
	"исправить подписанный дневник нельзя",
);

/**
 * Проверяет, имеет ли пользователь право подписывать, блокировать и исправлять дневник приёма 043/у.
 * Подписание разрешено врачам всех специальностей (терапевт, хирург, ортопед, ортодонт, пародонтолог,
 * имплантолог, гигиенист, рентгенолог), главврачам (chief_doctor, head_doctor, cmo), владельцам и администраторам (Мандат 8e).
 */
export function isDoctorOrClinicalSigner(role: string): boolean {
	const normalized = (role || "").toLowerCase();
	return (
		normalized === "doctor" ||
		normalized === "admin" ||
		normalized === "owner" ||
		normalized === "head_doctor" ||
		normalized === "chief_doctor" ||
		normalized === "chiefdoctor" ||
		normalized === "cmo" ||
		normalized === "therapist" ||
		normalized === "surgeon" ||
		normalized === "orthopedist" ||
		normalized === "orthodontist" ||
		normalized === "periodontist" ||
		normalized === "implantologist" ||
		normalized === "hygienist" ||
		normalized === "radiologist"
	);
}

/**
 * «Дневника нет» на чтении истории и на исправлении. Причина у сервера
 * установлена точно: строки с таким номером в этой клинике не существует.
 * Действие названо, потому что оно есть и оно одно — открыть приём заново;
 * прежний голый 404 клиент превращал в «программа клиники обновлена не
 * полностью, сообщите администратору», то есть отправлял врача не туда.
 */
export const DIARY_NOT_FOUND_REVISIONS_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, поэтому истории правок у него нет. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и посмотрите историю ещё раз.";
export const DIARY_NOT_FOUND_REVISE_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, исправлять нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и повторите исправление.";

/**
 * Каноническое сообщение Мандата 8e при попытке повторного подписания уже заблокированного дневника.
 */
export const DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE =
	"Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий.";

export const diaryUpsertSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	anamnesis: z.string().max(65536, "Анамнез не должен превышать 64 КБ").optional(),
	statusLocalis: z.string().max(65536, "Status localis не должен превышать 64 КБ").optional(),
	diagnosisIcd10: z.string().max(200).optional(),
	diagnosisTooth: z.string().max(100).optional(),
	treatmentDescription: z.string().max(65536, "Описание лечения не должно превышать 64 КБ").optional(),
	complications: z.string().max(10000).optional(),
	comorbidities: z.string().max(10000).optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["draft", "signed"]).optional(),
	instrumentTrayBarcode: z.string().max(200).optional(),
	/**
	 * УКЭП врача. Раньше поле принимал только маршрут /lock, поэтому подпись
	 * через POST физически не могла сохранить оттиск в crypto_signature_pkcs7:
	 * дневник помечался подписанным без самой подписи.
	 */
	pkcs7Signature: z.string().optional(),
});

/**
 * POST /api/diaries/:id/lock и /revise: тела раньше — bare cast.
 * Zod safeParse после requireClinicalMutationAccess (+ role/org gates где они
 * стоят раньше чтения полей) → 400 при non-object; поля остаются optional.
 */
export const diaryLockBodySchema = z.object({
	pkcs7Signature: z.unknown().optional(),
});

export const diaryReviseBodySchema = z.object({
	anamnesis: z.string().max(65536, "Анамнез не должен превышать 64 КБ").optional(),
	statusLocalis: z.string().max(65536, "Status localis не должен превышать 64 КБ").optional(),
	diagnosisIcd10: z.string().max(200).optional(),
	diagnosisTooth: z.string().max(100).optional(),
	treatmentDescription: z.string().max(65536, "Описание лечения не должно превышать 64 КБ").optional(),
	/*
	 * complications / comorbidities — поля visit_diaries и UI 043/у.
	 * БЫЛО: схема revise их не принимала, handler не писал. Админ правил
	 * «Осложнения»/«Сопутствующие» — после сохранения оставался старый
	 * текст; в подписанной 043/у ошибка не исправлялась.
	 */
	complications: z.string().max(10000).optional(),
	comorbidities: z.string().max(10000).optional(),
	/*
	 * instrumentTrayBarcode — элемент diary_hash и печать 043/у.
	 * БЫЛО: revise схема/handler не принимали лоток; sterilization/link
	 * при is_locked отвечал 409 «лоток можно править через
	 * ревизию», но /revise лоток не менял — неверный штрихкод в
	 * подписанной 043/у исправить было нельзя.
	 */
	instrumentTrayBarcode: z.string().max(200).optional(),
	revisionReason: z.string().max(1000).optional(),
});

export const chiefReviewBodySchema = z.object({
	verdict: z.enum(["approved", "deficiencies_found", "critical_violation"]),
	notes: z.string().optional().nullable(),
	criteriaEvaluation: z
		.object({
			informedConsentPresent: z.boolean().optional(),
			anamnesisComplete: z.boolean().optional(),
			statusLocalisComplete: z.boolean().optional(),
			icd10DiagnosisValid: z.boolean().optional(),
			treatmentPlanAdequate: z.boolean().optional(),
			instrumentTraceabilityValid: z.boolean().optional(),
		})
		.optional()
		.nullable(),
});

/**
 * Route params for e-signature diary paths.
 * БЫЛО: bare cast `req.params as { visitId|id: string }` on GET visit,
 * GET revisions, POST lock, POST revise. Non-UUID junk hit the DB and
 * returned 404 NotFound, masking bad route input as “missing diary”.
 * Zod after clinical access gates → 400 ValidationError; existing
 * 404 for well-formed unknown ids is unchanged.
 */
export const diaryVisitParamsSchema = z.object({
	visitId: z.string().uuid(),
});

export const diaryIdParamsSchema = z.object({
	id: z.string().uuid(),
});

/**
 * Кто вправе подписать дневник приёма. Один текст на два маршрута подписания
 * (POST /api/diaries со статусом «signed» и POST /api/diaries/:id/lock), потому
 * что действие человека в обоих случаях одно и то же, а расходящиеся
 * формулировки одного отказа — это тот же дефект в рассрочку.
 *
 * Перечисления «кто может» из ролевой матрицы здесь нет намеренно: право
 * проверяется прямо в этих двух маршрутах сравнением роли смены с «doctor» и
 * «admin», и фраза описывает именно это сравнение, а не матрицу
 * security/permissions.ts, которая к нему не применяется.
 */
export const DIARY_SIGNING_ROLE_MESSAGE =
	"Дневник приёма подписывает только врач или администратор клиники: у вашей смены такого права нет, и повторный вход его не добавит. Позовите врача, который вёл приём, — подписать может он.";

export const shiftsPayloadSchema = z.object({
	shifts: z.array(
		z
			.object({
				id: z.string(),
				doctorId: z.string(),
				doctorName: z.string(),
				cabinetId: z.string(),
				chairId: z.string(),
				dateIso: z.string(),
				startTime: z.string(),
				endTime: z.string(),
			})
			.passthrough(),
	),
});
