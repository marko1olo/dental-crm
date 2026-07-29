import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createAppointmentSchema, dashboardSchema, updateAppointmentSchema } from "@dental/shared";
import {
  clinicSessionMissingMessage,
  clinicSessionRejectedMessage
} from "../utils/clinicSessionRefusal.js";

import { repairMojibakeText } from "../text/repairMojibake.js";

type SchedulePayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

type AppointmentMutationCode = "AppointmentCreateRejected" | "AppointmentUpdateRejected" | "AppointmentNotFound";
type AppointmentRejectionReason =
  | "appointment_not_found"
  | "reference_missing"
  | "time_invalid"
  | "active_visit_locked"
  | "resource_missing"
  | "resource_overlap"
  | "outside_operational_hours"
  | "patient_blacklisted"
  | "mutation_rejected";

type AppointmentRejectionResponse = {
  statusCode: 404 | 409;
  code: AppointmentMutationCode;
  reason: AppointmentRejectionReason;
  message: string;
};

const denteAdminSecretHeader = "x-dente-admin-secret";
const appointmentBlacklistedMessage = "Запись не создана: выбранный пациент внесен в черный список и заблокирован для записи.";
const appointmentCreateValidationMessage =
  "Запись не создана: выберите пациента, врача, кресло, дату и время приема.";
const appointmentUpdateValidationMessage =
  "Запись не обновлена: проверьте статус, время, врача, кресло и пациента.";
const appointmentMissingRouteMessage = "Запись не выбрана. Откройте актуальную строку расписания и повторите действие.";
const appointmentNotFoundMessage = "Запись не найдена. Обновите расписание и выберите актуальную строку.";
const appointmentCreateFallbackMessage =
  "Запись не создана: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentUpdateFallbackMessage =
  "Запись не обновлена: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentReferenceMissingCreateMessage = "Запись не создана: выберите активного пациента, врача, ассистента и кресло.";
const appointmentReferenceMissingUpdateMessage = "Запись не обновлена: выберите активного пациента, врача, ассистента и кресло.";
const appointmentTimeInvalidCreateMessage = "Запись не создана: время окончания должно быть позже времени начала.";
const appointmentTimeInvalidUpdateMessage = "Запись не обновлена: время окончания должно быть позже времени начала.";
const appointmentActiveVisitLockedMessage =
  "Запись не обновлена: у нее открыт прием, поэтому нельзя менять пациента или переводить запись в закрывающий статус.";
const appointmentResourceMissingCreateMessage =
  "Запись не создана: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceMissingUpdateMessage =
  "Запись не обновлена: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceOverlapCreateMessage = "Запись не создана: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentResourceOverlapUpdateMessage = "Запись не обновлена: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentOutsideHoursCreateMessage =
  "Запись не создана: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";
const appointmentOutsideHoursUpdateMessage =
  "Запись не обновлена: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";

function parseSchedulePayload<T>(schema: SchedulePayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

function normalizedAppointmentException(error: unknown): string {
  if (!(error instanceof Error)) return "";
  return repairMojibakeText(error.message).trim();
}

function classifyAppointmentRejection(error: unknown): AppointmentRejectionReason {
  const message = normalizedAppointmentException(error);
  if (message.includes("черный список") || message.includes("черном списке") || message.includes("Запись заблокирована")) return "patient_blacklisted";
  if (message === "Запись не найдена") return "appointment_not_found";
  if (message.includes("не найден") || message.includes("не активен")) return "reference_missing";
  if (message.includes("Время окончания записи должно быть позже времени начала")) return "time_invalid";
  if (message.includes("Нельзя закрыть") || message.includes("Нельзя менять пациента")) return "active_visit_locked";
  if (message.includes("нужно выбрать") || message.includes("нужен активный пациент")) return "resource_missing";
  if (message.includes("уже есть запись") || message.includes("уже занято")) return "resource_overlap";
  if (message.includes("Запись вне расписания") || message.includes("вне расписания") || message.includes("вне работы")) return "outside_operational_hours";
  return "mutation_rejected";
}

function appointmentRejectionMessage(reason: AppointmentRejectionReason, operation: "create" | "update"): string {
  if (reason === "patient_blacklisted") return appointmentBlacklistedMessage;
  if (reason === "appointment_not_found") return appointmentNotFoundMessage;
  if (reason === "reference_missing") {
    return operation === "create" ? appointmentReferenceMissingCreateMessage : appointmentReferenceMissingUpdateMessage;
  }
  if (reason === "time_invalid") return operation === "create" ? appointmentTimeInvalidCreateMessage : appointmentTimeInvalidUpdateMessage;
  if (reason === "active_visit_locked") return appointmentActiveVisitLockedMessage;
  if (reason === "resource_missing") {
    return operation === "create" ? appointmentResourceMissingCreateMessage : appointmentResourceMissingUpdateMessage;
  }
  if (reason === "resource_overlap") {
    return operation === "create" ? appointmentResourceOverlapCreateMessage : appointmentResourceOverlapUpdateMessage;
  }
  if (reason === "outside_operational_hours") {
    return operation === "create" ? appointmentOutsideHoursCreateMessage : appointmentOutsideHoursUpdateMessage;
  }
  return operation === "create" ? appointmentCreateFallbackMessage : appointmentUpdateFallbackMessage;
}

function appointmentRejectionResponse(operation: "create" | "update", error: unknown): AppointmentRejectionResponse {
  const reason = classifyAppointmentRejection(error);
  if (reason === "appointment_not_found") {
    return {
      statusCode: 404,
      code: "AppointmentNotFound",
      reason,
      message: appointmentNotFoundMessage
    };
  }
  return {
    statusCode: 409,
    code: operation === "create" ? "AppointmentCreateRejected" : "AppointmentUpdateRejected",
    reason,
    message: appointmentRejectionMessage(reason, operation)
  };
}

function sendAppointmentRejection(reply: FastifyReply, rejection: AppointmentRejectionResponse) {
  return reply.code(rejection.statusCode).send({
    code: rejection.code,
    reason: rejection.reason,
    message: rejection.message
  });
}

function configuredScheduleAdminSecret(): string | null {
  return process.env.DENTE_SCHEDULE_ADMIN_SECRET?.trim() || null;
}

function scheduleUnguardedMutationsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS === "1";
}

async function requireScheduleMutationAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const adminSecret = configuredScheduleAdminSecret();
  if (!adminSecret) {
    if (scheduleUnguardedMutationsAllowed()) return true;
    reply.code(503).send({
      error: "ScheduleAdminSecretMissing",
      message: "На сервере не задан секрет администратора клиники для изменения расписания."
    });
    return false;
  }
  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return true;
  }
  reply.code(403).send({
    error: "ScheduleAdminSecretRequired",
    message: "Для изменения расписания нужен действующий секрет администратора клиники."
  });
  return false;
}

import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";

/**
 * ОТКАЗ ЗАПИСИ НА ПРИЁМ БЕЗ ЕДИНОГО СЛОВА ДЛЯ ЧЕЛОВЕКА.
 *
 * ЧТО БЫЛО. Оба обработчика расписания начинались одной и той же
 * пятистрочной преамбулой и отвечали телом `{"error":"AuthRequired"}` и
 * `{"error":"AuthExpired"}` — без поля `message`. Доказано запросом в процессе
 * (`app.inject`, не дев-сервер): четыре ветки, четыре тела без текста.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Это самое частое действие администратора за день:
 * поставить пациента в сетку и перенести приём. Экран
 * (`apps/web/src/hooks/domains/useScheduleLogic.ts:758` и `:657`) строит текст
 * через `responseErrorMessage(response, "Запись не создана")`, а тот берёт
 * `message`, и только если его нет — подпись по коду ответа. То есть
 * администратор получал «Запись не создана» и ни слова о том, что дело в
 * истёкшем входе в кабинет: ни причины, ни следующего шага. Он повторяет
 * нажатие, потом звонит в поддержку, а пациент в это время стоит у стойки. При
 * этом сервер причину ЗНАЕТ точно и различает два состояния — токена нет и
 * токен не принят, — потому что `verifyToken` вызывается только когда токен
 * вообще пришёл.
 *
 * ЧТО ИЗМЕНИЛОСЬ, А ЧТО НЕТ. Коды ответа и значения поля `error` сохранены
 * дословно, оба 401: интерфейс по ним ветвится, и ломать машинное поле, чтобы
 * поставить в него человеческую фразу, значило бы поставить фасад вместо
 * починки. Добавлено поле `message`.
 *
 * ПОЧЕМУ ПРЕАМБУЛА СВЕДЕНА В ОДНУ ФУНКЦИЮ. Две копии одной проверки — это две
 * копии одного текста, и следующая правка попала бы в одну из них. Текст берётся
 * из общего дома `utils/clinicSessionRefusal.ts` по той же причине.
 */
function requireClinicOrganizationId(request: FastifyRequest, reply: FastifyReply): string | null {
  const clinicHeader = request.headers["x-dente-clinic-token"];
  const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
  if (typeof clinicToken !== "string" || !clinicToken) {
    reply.code(401).send({
      error: "AuthRequired",
      message: clinicSessionMissingMessage("расписание клиники ведётся только из кабинета")
    });
    return null;
  }
  const payload = verifyToken(clinicToken, TOKEN_SECRET());
  if (!payload || !payload.organizationId) {
    reply.code(401).send({ error: "AuthExpired", message: clinicSessionRejectedMessage });
    return null;
  }
  return payload.organizationId as string;
}

import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { createAppointmentInDb, updateAppointmentInDb } from "../db/appointmentsQuery.js";
import { wsBroker } from "../services/websocketBroker.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";

export async function registerScheduleRoutes(app: FastifyInstance) {
  app.post("/api/appointments", async (request, reply) => {
    const orgId = requireClinicOrganizationId(request, reply);
    if (!orgId) return reply;

    const input = parseSchedulePayload(createAppointmentSchema, request.body);
    if (!input) {
      return reply.code(400).send({ code: "AppointmentValidationError", message: appointmentCreateValidationMessage });
    }
    try {
      const created = await createAppointmentInDb(orgId, input);
      const dashboard = await getDashboardFromDb(orgId);
      // Раньше маршрут расписания не рассылал НИЧЕГО, хотя эндпоинт живых
      // обновлений так и называется — /api/ws/schedule. Два администратора,
      // работающие в расписании одновременно, не видели действий друг друга
      // до перезагрузки страницы: прямой путь к двойной записи на один слот.
      wsBroker.broadcastToOrganization(orgId, {
        type: "APPOINTMENT_CREATED",
        payload: { appointmentId: created?.id ?? null, startsAt: created?.startsAt ?? null }
      });
      return reply.code(201).send(dashboardSchema.parse(dashboard));
    } catch (error) {
      return sendAppointmentRejection(reply, appointmentRejectionResponse("create", error));
    }
  });

  async function updateAppointmentHandler(request: FastifyRequest<{ Params: { appointmentId?: string } }>, reply: FastifyReply) {
    const orgId = requireClinicOrganizationId(request, reply);
    if (!orgId) return reply;

    const params = request.params as { appointmentId?: string };
    if (!params.appointmentId) {
      return reply.code(400).send({ code: "AppointmentRouteValidationError", message: appointmentMissingRouteMessage });
    }
    const input = parseSchedulePayload(updateAppointmentSchema, request.body);
    if (!input) {
      return reply.code(400).send({ code: "AppointmentValidationError", message: appointmentUpdateValidationMessage });
    }
    try {
      await updateAppointmentInDb(orgId, params.appointmentId, input);

      // Напоминание ставится в очередь заранее и несёт в тексте дату и время.
      // После переноса или отмены оно стало неверным: пациент получил бы
      // «ждём вас 12 августа в 14:30» на приём, которого в это время уже нет.
      // Снимаем неотправленные — планировщик поставит новое с верным временем.
      await invalidateAppointmentReminders(
        orgId,
        params.appointmentId,
        "Приём изменён администратором"
      ).catch((error: unknown) => {
        // Сбой снятия не должен отменять сам перенос: администратор уже видит
        // новое время, и падение маршрута выглядело бы как непринятая правка.
        request.log.error({ err: error }, "Не удалось снять устаревшие напоминания о приёме");
      });

      const dashboard = await getDashboardFromDb(orgId);
      // Перенос и отмена приёма — то же самое: без рассылки коллега видит
      // слот занятым, хотя он уже освобождён, и наоборот.
      wsBroker.broadcastToOrganization(orgId, {
        type: "APPOINTMENT_UPDATED",
        payload: { appointmentId: params.appointmentId }
      });
      return dashboardSchema.parse(dashboard);
    } catch (error) {
      return sendAppointmentRejection(reply, appointmentRejectionResponse("update", error));
    }
  }

  app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
  app.put("/api/schedule/appointments/:appointmentId", updateAppointmentHandler);
}

