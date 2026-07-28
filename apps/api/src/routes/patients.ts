/**
 * ПОЧЕМУ ЗДЕСЬ НЕ ОБЩИЕ ХЕЛПЕРЫ ИЗ accessGuard.ts.
 *
 * Отсюда были удалены импорты requireClinicalMutationAccess и
 * requireClinicalReadAccess: они не вызывались ни в одном обработчике, а по
 * строке импорта файл выглядел защищённым общим гейтом. Каждый обработчик ниже
 * проверяет подпись токена кабинета сам и берёт организацию ТОЛЬКО из
 * проверенной подписью полезной нагрузки.
 *
 * Свести это на общий путь нельзя, пока не закрыты два расхождения:
 *
 * 1. security/identity.ts:112-115 (unverifiedOrganizationUsable) для любого
 *    нечитающего метода возвращает true, поэтому requireOrganizationId на GET
 *    отдаёт организацию, названную самим клиентом в заголовке x-organization-id
 *    (identity.ts:174-180), если включён DENTE_DEV_ALLOW_HEADER_ORG=1. Запись
 *    этой дырой уже закрыта, чтение — нет. Здесь три GET-обработчика, и они
 *    отдают картотеку, историю звонков и переписки, запрет записи. Токен-only
 *    проверка ниже такой заголовок не принимает ни при какой переменной среды.
 *
 * 2. requireClinicalReadAccess/requireClinicalMutationAccess (accessGuard.ts:26,
 *    accessGuard.ts:56) — это гейт секрета администратора клиники
 *    (x-dente-admin-secret), а не гейт арендатора. Пока DENTE_CLINICAL_ADMIN_SECRET
 *    не задан, они пропускают всех; как только он задан, они отвечают 403. Ни один
 *    вызов карточки пациента этот заголовок не присылает: AppHelpers.tsx:6143-6156
 *    добавляет его только когда adminSecret передан явно, а все вызовы к
 *    /api/patients/** передают лишь токен кабинета. То есть переход на общий гейт
 *    отдал бы 403 на весь раздел «Пациенты» в первой же установке с секретом.
 *
 * Чинить нужно общий путь, а не эти обработчики: строгий код сносить нельзя.
 */
import type { FastifyInstance, FastifyReply } from "fastify";
import { createPatientSchema, patientSchema, updatePatientAdministrativeProfileSchema, updatePatientSchema } from "@dental/shared";

type PatientPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const patientCreateValidationMessage = "Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.";
const patientUpdateValidationMessage = "Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты.";
const patientAdministrativeValidationMessage =
  "Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя.";
const patientRepresentativeValidationMessage =
  "Данные представителя не сохранены: если указаны телефон, документ или получатель представителя, заполните ФИО и основание представительства.";
const patientMissingRouteMessage = "Пациент не выбран. Откройте актуальную карту пациента и повторите действие.";
const patientNotFoundMessage = "Пациент не найден. Обновите список пациентов и выберите актуальную карту.";
const patientDuplicateMessage =
  "Похожая карта пациента уже есть. Найдите пациента по ФИО или телефону и обновите существующую карточку.";

/**
 * Идентификатор карты пациента в адресе. Колонки patients.id и
 * communication_events.patient_id объявлены как uuid, поэтому строка вида
 * "undefined" или "null" — а интерфейс такие подставлял, когда пациент ещё не
 * выбран — доходит до PostgreSQL и возвращается ошибкой разбора типа. Оператор
 * видел «сбой чтения» там, где на самом деле не выбрана карта.
 */
const PATIENT_ID_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PatientDuplicateInput = {
  birthDate?: string | null | undefined;
  fullName?: string | null | undefined;
  phone?: string | null | undefined;
};

type PatientRepresentativeInput = {
  legalRepresentativeFullName?: string | null | undefined;
  legalRepresentativeIdentityDocument?: string | null | undefined;
  legalRepresentativePhone?: string | null | undefined;
  legalRepresentativeRelationship?: string | null | undefined;
  preferredDocumentRecipient?: string | null | undefined;
};

function parsePatientPayload<T>(schema: PatientPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

function sendPatientRouteValidationError(reply: FastifyReply) {
  return reply.code(400).send({
    error: "PatientRouteValidationError",
    message: patientMissingRouteMessage
  });
}

function sendPatientNotFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: "PatientNotFound",
    message: patientNotFoundMessage
  });
}

function normalizePatientNameForDuplicate(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function normalizePatientPhoneForDuplicate(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 5 ? digits : "";
}

function findPatientDuplicate(patientsList: any[], input: PatientDuplicateInput, ignoredPatientId?: string) {
  const inputName = normalizePatientNameForDuplicate(input.fullName);
  const inputBirthDate = (input.birthDate ?? "").trim();
  const inputPhone = normalizePatientPhoneForDuplicate(input.phone);
  if (!inputName && !inputBirthDate && !inputPhone) return null;

  return (
    patientsList.find((patient) => {
      if (patient.id === ignoredPatientId || patient.status !== "active") return false;
      const sameName = Boolean(inputName) && inputName === normalizePatientNameForDuplicate(patient.fullName);
      const sameBirthDate = Boolean(inputBirthDate) && inputBirthDate === (patient.birthDate ?? "");
      const samePhone = Boolean(inputPhone) && inputPhone === normalizePatientPhoneForDuplicate(patient.phone);
      // БЫЛО: пара «дата рождения + телефон» БЕЗ сравнения имени считалась
      // дублем. Близнецы с телефоном матери и супруги с одной датой рождения
      // на общем номере получали жёсткий отказ при регистрации без возможности
      // подтвердить, что это разные люди. Совпадение имени теперь обязательно:
      // это оставляет защиту от настоящих дублей (один человек заведён дважды),
      // но перестаёт блокировать разных людей одной семьи.
      return (sameName && sameBirthDate) || (sameName && samePhone);
    }) ?? null
  );
}

function sendPatientDuplicate(reply: FastifyReply) {
  return reply.code(409).send({
    error: "PatientDuplicateError",
    message: patientDuplicateMessage
  });
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasIncompleteRepresentativeIdentity(value: PatientRepresentativeInput): boolean {
  const hasRepresentativeFact =
    hasText(value.legalRepresentativeFullName) ||
    hasText(value.legalRepresentativeRelationship) ||
    hasText(value.legalRepresentativeIdentityDocument) ||
    hasText(value.legalRepresentativePhone) ||
    /представител|опекун|родител|довер/i.test(value.preferredDocumentRecipient ?? "");

  if (!hasRepresentativeFact) return false;
  return !hasText(value.legalRepresentativeFullName) || !hasText(value.legalRepresentativeRelationship);
}

/**
 * Строка таблицы patient_archive_reasons_and_blacklists в том минимуме, который
 * нужен для отбора по пациенту. patient_id пустой у строк, созданных до
 * миграции drizzle/0136_patient_archive_patient_id.sql: колонка там объявлена
 * nullable намеренно, потому что старым строкам связь с пациентом взять негде.
 */
type PatientArchiveRowLike = {
  isBookingBlocked: boolean;
  patientId: string | null;
  patientName: string | null;
};

/**
 * Оставляет из строк архива и черного списка клиники только те, что относятся к
 * указанному пациенту.
 *
 * БЫЛО: GET /api/patients/:patientId/archive-status отдавал строки ВСЕЙ клиники.
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:7 принимает пациента под именем
 * `_patientId` и не использует его вовсе, а маршрут отправлял результат как есть.
 * Оба виджета карточки читают ответ как статус выбранного пациента:
 * components/patients/PatientArchiveAndBlacklistWidget.tsx:86 берёт
 * reasons[0].isBookingBlocked, а components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx:106
 * печатает каждую строку с ФИО и причиной. Достаточно одного человека в черном
 * списке, чтобы карточка КАЖДОГО пациента клиники показала «Запись на прием
 * заблокирована», предложила кнопку «Восстановить из черного списка» — и заодно
 * показала ФИО и причину блокировки посторонних людей. Это ровно тот же дефект,
 * что уже был исправлен ниже для communication-timelines.
 *
 * Связь по имени применяется ТОЛЬКО к строкам без patient_id. Строку с чужим
 * patient_id тезка не забирает: иначе снятие блокировки у однофамильца снимало
 * бы её у настоящего нарушителя.
 */
export function selectPatientArchiveRows<T extends PatientArchiveRowLike>(
  rows: readonly T[],
  patientId: string,
  patientFullName: string | null | undefined
): T[] {
  const normalizedPatientName = normalizePatientNameForDuplicate(patientFullName);
  return rows.filter((row) => {
    if (row.patientId) return row.patientId === patientId;
    if (!normalizedPatientName) return false;
    return normalizePatientNameForDuplicate(row.patientName) === normalizedPatientName;
  });
}

/**
 * Запрещена ли пациенту запись по его строкам архива. Учитывается флаг
 * is_booking_blocked, а не сам факт наличия строки — так же, как в
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:isPatientBookingBlocked,
 * который решает запрет при записи на приём. Иначе карточка утверждала бы одно,
 * а расписание делало другое.
 */
export function patientArchiveRowsBlockBooking(rows: readonly PatientArchiveRowLike[]): boolean {
  return rows.some((row) => row.isBookingBlocked === true);
}

import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";
import {
  getPatientsFromDb,
  getPatientByIdFromDb,
  createPatientInDb,
  updatePatientInDb,
  updatePatientAdministrativeProfileInDb
} from "../db/patientsQuery.js";

export async function registerPatientRoutes(app: FastifyInstance) {
  app.get("/api/patients", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });

    const orgId = payload.organizationId as string;
    
    try {
      const dbPatients = await getPatientsFromDb(orgId);
      return dbPatients.map((patient) => patientSchema.parse(patient));
    } catch (e) {
      console.error("[Patients] Error fetching from DB:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });

  app.post("/api/patients", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;

    const input = parsePatientPayload(createPatientSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientCreateValidationMessage });
    }
    const dbPatients = await getPatientsFromDb(orgId);
    const duplicate = findPatientDuplicate(dbPatients, input);
    if (duplicate) return sendPatientDuplicate(reply);
    try {
      const patient = await createPatientInDb(orgId, input);
      return reply.code(201).send(patientSchema.parse(patient));
    } catch (e) {
      console.error("[Patients] Create error:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });

  app.put("/api/patients/:patientId", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;

    const params = request.params as { patientId?: string };
    if (!params.patientId) return sendPatientRouteValidationError(reply);
    const input = parsePatientPayload(updatePatientSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientUpdateValidationMessage });
    }
    
    try {
      const dbPatients = await getPatientsFromDb(orgId);
      const duplicate = findPatientDuplicate(dbPatients, input, params.patientId);
      if (duplicate) return sendPatientDuplicate(reply);

      const patient = await updatePatientInDb(orgId, params.patientId, input);
      if (!patient) return sendPatientNotFound(reply);
      return patientSchema.parse(patient);
    } catch (e) {
      // БЫЛО: любой сбой внутри try отвечал 404 «Пациент не найден» — включая
      // ошибку разбора ответа patientSchema.parse ПОСЛЕ успешной записи в базу.
      // Оператор видел «пациент не найден», считал, что данные не сохранились,
      // и заводил карточку заново — появлялись дубли уже сохранённых пациентов.
      request.log.error({ err: e }, "[Patients] Ошибка обновления пациента");
      return reply.code(500).send({
        error: "PatientUpdateFailed",
        message: "Не удалось сохранить изменения. Данные могли быть записаны — обновите карточку перед повторным вводом."
      });
    }
  });

  app.put("/api/patients/:patientId/administrative-profile", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;

    const params = request.params as { patientId?: string };
    if (!params.patientId) return sendPatientRouteValidationError(reply);
    const input = parsePatientPayload(updatePatientAdministrativeProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientAdministrativeValidationMessage });
    }

    const sanitizeDigitsAndSpaces = (val?: string | null, maxLen: number = 80) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const cleaned = val.trim().replace(/[^\d\s\-\.]/g, "");
      return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
    };

    if (input.snils !== undefined && input.snils !== null) {
      input.snils = sanitizeDigitsAndSpaces(input.snils, 20);
    }
    if (input.identityDocument !== undefined && input.identityDocument !== null) {
      input.identityDocument = input.identityDocument.trim().slice(0, 240);
    }

    try {
      const existingPatient = await getPatientByIdFromDb(orgId, params.patientId);
      if (!existingPatient) return sendPatientNotFound(reply);
      const existingProfile = (existingPatient.administrativeProfile as Record<string, unknown>) ?? {};
      const mergedProfile = { ...existingProfile, ...input };

      if (hasIncompleteRepresentativeIdentity(mergedProfile)) {
        return reply.code(400).send({
          error: "PatientValidationError",
          message: patientRepresentativeValidationMessage,
        });
      }

      const patient = await updatePatientAdministrativeProfileInDb(orgId, params.patientId, input);
      if (!patient) return sendPatientNotFound(reply);
      return patientSchema.parse(patient);
    } catch (e) {
      // См. комментарий выше: 404 после успешной записи вводил оператора в
      // заблуждение и приводил к повторному вводу тех же данных.
      request.log.error({ err: e }, "[Patients] Ошибка обновления профиля пациента");
      return reply.code(500).send({
        error: "PatientProfileUpdateFailed",
        message: "Не удалось сохранить профиль. Данные могли быть записаны — обновите карточку перед повторным вводом."
      });
    }
  });

  /**
   * Журнал обращений пациента: звонки и сообщения, прошедшие через клинику.
   *
   * БЫЛО ДВА ДЕФЕКТА, ОБА ИСПРАВЛЕНЫ ЗДЕСЬ.
   *
   * 1. Параметр :patientId сначала не читался вовсе — в карточке КАЖДОГО
   *    пациента показывалась переписка ВСЕХ пациентов клиники. Это раскрытие
   *    персональных данных внутри интерфейса.
   * 2. Затем он читался, но источником была patient_communication_timelines —
   *    таблица без единого писателя в проекте и без колонки patient_id: связь с
   *    карточкой делалась сравнением ФИО строкой. То есть обе панели карточки
   *    отвечали «звонков и сообщений нет» ВСЕГДА. Администратор звонил второй
   *    раз или не звонил вовсе, считая, что коллега отработал.
   *
   * Теперь читается communication_events — единственный живой источник со
   * связью по uuid и пятью настоящими писателями по пяти каналам. Подробности и
   * границы утверждения — в services/patients/patientCommunicationLog.ts.
   */
  app.get("/api/patients/:patientId/communication-timelines", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;

    const { patientId } = request.params as { patientId?: string };
    // Проверка формата до обращения к базе: patients.id и
    // communication_events.patient_id — колонки типа uuid, и на строке
    // «undefined» PostgreSQL отвечает ошибкой разбора. Она превратилась бы в 500
    // «сбой чтения» вместо понятного «карта не выбрана».
    if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
      return sendPatientRouteValidationError(reply);
    }

    const requestedLimit = (request.query as { limit?: unknown } | null | undefined)?.limit;

    try {
      const { findPatientCommunicationLog } = await import("../services/patients/patientCommunicationLog.js");
      const log = await findPatientCommunicationLog(orgId, patientId.trim(), { limit: requestedLimit });
      // Пациента нет в этой клинике — это 404, а не пустой журнал. Пустой журнал
      // оператор читает как «с человеком не связывались»; отсутствие карты и
      // отсутствие обращений — разные ответы, и путать их нельзя (тот же приём,
      // что в archive-status ниже).
      if (!log) return sendPatientNotFound(reply);
      return reply.status(200).send(log);
    } catch (e) {
      // Отказ базы не выдаётся за пустой журнал: это самая дорогая ошибка на
      // этом экране. Сообщение обязано назвать и причину, и что делать.
      request.log.error({ err: e }, "[Patients] Ошибка чтения журнала обращений пациента");
      return reply.code(500).send({
        error: "PatientCommunicationLogUnavailable",
        message:
          "Не удалось прочитать звонки и сообщения по этой карте. Не считайте, что обращений не было: повторите чтение, а до этого проверьте раздел «Общение»."
      });
    }
  });

  // COMPETITOR FEATURE #20: пациенты::архив_причин_и_черный_список
  app.get("/api/patients/:patientId/archive-status", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;
    const { patientId } = request.params as { patientId?: string };
    if (!patientId) return sendPatientRouteValidationError(reply);

    try {
      // Карточка чужого или удалённого пациента раньше отвечала пустым списком,
      // то есть «этот человек не заблокирован». Отсутствие пациента и отсутствие
      // блокировки — разные ответы, и путать их нельзя.
      const patient = await getPatientByIdFromDb(orgId, patientId);
      if (!patient) return sendPatientNotFound(reply);

      const { getPatientArchiveReasonsAndBlacklistsFromDb } = await import("../db/patientArchiveReasonsAndBlacklistsQuery.js");
      const clinicRows = await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId);
      return reply.status(200).send(selectPatientArchiveRows(clinicRows, patientId, patient.fullName));
    } catch (e) {
      // Пустой список вместо отказа читается виджетом как «пациент чист», и
      // администратор запишет на приём того, кому запись запрещена.
      request.log.error({ err: e }, "[Patients] Ошибка чтения архива и черного списка");
      return reply.code(500).send({
        error: "PatientArchiveStatusUnavailable",
        message:
          "Не удалось прочитать запрет записи по этой карте. Не считайте пациента разрешённым к записи: повторите чтение перед записью на приём."
      });
    }
  });

  app.post("/api/patients/:patientId/archive-status", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });
    const orgId = payload.organizationId as string;
    const { patientId } = request.params as { patientId?: string };
    if (!patientId) return sendPatientRouteValidationError(reply);

    const body = request.body as { isBlacklisted?: unknown } | null | undefined;
    if (!body || typeof body.isBlacklisted !== "boolean") {
      // БЫЛО: «isBlacklisted boolean is required» — имя поля запроса на экране
      // администратора вместо того, что от него требуется.
      return reply.code(400).send({
        error: "ValidationError",
        message: "Не указано действие: запретить пациенту запись на приём или снять запрет."
      });
    }
    const requestedBlacklisted = body.isBlacklisted;

    try {
      const { getPatientArchiveReasonsAndBlacklistsFromDb, setPatientArchiveStatusInDb } = await import(
        "../db/patientArchiveReasonsAndBlacklistsQuery.js"
      );
      const patient = await getPatientByIdFromDb(orgId, patientId);
      if (!patient) return sendPatientNotFound(reply);

      const rowsBefore = selectPatientArchiveRows(
        await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
        patientId,
        patient.fullName
      );
      // Повторное нажатие кнопки не должно плодить строки: setPatientArchiveStatusInDb
      // вставляет запись безусловно, а карточка после отправки перечитывает статус
      // и снова показывает ту же кнопку.
      if (patientArchiveRowsBlockBooking(rowsBefore) === requestedBlacklisted) {
        return reply.status(200).send({ success: true, isBlacklisted: requestedBlacklisted });
      }

      await setPatientArchiveStatusInDb(orgId, patientId, requestedBlacklisted, patient.fullName);

      // БЫЛО: маршрут отвечал { success: true } сразу после вызова записи, а
      // setPatientArchiveStatusInDb гасит ЛЮБУЮ ошибку базы в пустой catch и
      // оставляет запрет только в памяти процесса. Карточка показывала «Пациент
      // добавлен в черный список. Запись на прием заблокирована», запрет исчезал
      // при перезапуске сервера, и никто об этом не узнавал. Отвечаем успехом
      // только после того, как база подтвердила новое состояние.
      const rowsAfter = selectPatientArchiveRows(
        await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
        patientId,
        patient.fullName
      );
      if (patientArchiveRowsBlockBooking(rowsAfter) !== requestedBlacklisted) {
        return reply.code(500).send({
          error: "PatientArchiveStatusNotSaved",
          message: requestedBlacklisted
            ? "Запрет записи не сохранён в базе. Пациент по-прежнему доступен для записи на приём — повторите действие."
            : "Снятие запрета не сохранено в базе. Пациенту по-прежнему запрещена запись на приём — повторите действие."
        });
      }

      return reply.status(200).send({ success: true, isBlacklisted: requestedBlacklisted });
    } catch (e) {
      request.log.error({ err: e }, "[Patients] Ошибка сохранения запрета записи");
      return reply.code(500).send({
        error: "PatientArchiveStatusNotSaved",
        message:
          "Не удалось сохранить запрет записи. Откройте карту заново и проверьте текущий запрет перед повторной попыткой."
      });
    }
  });
}
