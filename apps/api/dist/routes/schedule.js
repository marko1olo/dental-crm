import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { createAppointmentSchema, dashboardSchema, updateAppointmentSchema } from "@dental/shared";
import { repairMojibakeText } from "../text/repairMojibake.js";
const denteAdminSecretHeader = "x-dente-admin-secret";
const appointmentCreateValidationMessage = "Запись не создана: выберите пациента, врача, кресло, дату и время приема.";
const appointmentUpdateValidationMessage = "Запись не обновлена: проверьте статус, время, врача, кресло и пациента.";
const appointmentMissingRouteMessage = "Запись не выбрана. Откройте актуальную строку расписания и повторите действие.";
const appointmentNotFoundMessage = "Запись не найдена. Обновите расписание и выберите актуальную строку.";
const appointmentCreateFallbackMessage = "Запись не создана: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentUpdateFallbackMessage = "Запись не обновлена: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentReferenceMissingCreateMessage = "Запись не создана: выберите активного пациента, врача, ассистента и кресло.";
const appointmentReferenceMissingUpdateMessage = "Запись не обновлена: выберите активного пациента, врача, ассистента и кресло.";
const appointmentTimeInvalidCreateMessage = "Запись не создана: время окончания должно быть позже времени начала.";
const appointmentTimeInvalidUpdateMessage = "Запись не обновлена: время окончания должно быть позже времени начала.";
const appointmentActiveVisitLockedMessage = "Запись не обновлена: у нее открыт прием, поэтому нельзя менять пациента или переводить запись в закрывающий статус.";
const appointmentResourceMissingCreateMessage = "Запись не создана: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceMissingUpdateMessage = "Запись не обновлена: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceOverlapCreateMessage = "Запись не создана: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentResourceOverlapUpdateMessage = "Запись не обновлена: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentOutsideHoursCreateMessage = "Запись не создана: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";
const appointmentOutsideHoursUpdateMessage = "Запись не обновлена: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";
function parseSchedulePayload(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        return null;
    return parsed.data;
}
function normalizedAppointmentException(error) {
    if (!(error instanceof Error))
        return "";
    return repairMojibakeText(error.message).trim();
}
function classifyAppointmentRejection(error) {
    const message = normalizedAppointmentException(error);
    if (message === "Запись не найдена")
        return "appointment_not_found";
    if (message.includes("не найден") || message.includes("не активен"))
        return "reference_missing";
    if (message.includes("Время окончания записи должно быть позже времени начала"))
        return "time_invalid";
    if (message.includes("Нельзя закрыть") || message.includes("Нельзя менять пациента"))
        return "active_visit_locked";
    if (message.includes("нужно выбрать") || message.includes("нужен активный пациент"))
        return "resource_missing";
    if (message.includes("уже есть запись") || message.includes("уже занято"))
        return "resource_overlap";
    if (message.startsWith("Запись вне расписания"))
        return "outside_operational_hours";
    return "mutation_rejected";
}
function appointmentRejectionMessage(reason, operation) {
    if (reason === "appointment_not_found")
        return appointmentNotFoundMessage;
    if (reason === "reference_missing") {
        return operation === "create" ? appointmentReferenceMissingCreateMessage : appointmentReferenceMissingUpdateMessage;
    }
    if (reason === "time_invalid")
        return operation === "create" ? appointmentTimeInvalidCreateMessage : appointmentTimeInvalidUpdateMessage;
    if (reason === "active_visit_locked")
        return appointmentActiveVisitLockedMessage;
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
function appointmentRejectionResponse(operation, error) {
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
function sendAppointmentRejection(reply, rejection) {
    return reply.code(rejection.statusCode).send({
        code: rejection.code,
        reason: rejection.reason,
        message: rejection.message
    });
}
function configuredScheduleAdminSecret() {
    return process.env.DENTE_SCHEDULE_ADMIN_SECRET?.trim() || null;
}
function scheduleUnguardedMutationsAllowed() {
    return process.env.NODE_ENV !== "production" && process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS === "1";
}
async function requireScheduleMutationAccess(request, reply) {
    const adminSecret = configuredScheduleAdminSecret();
    if (!adminSecret) {
        if (scheduleUnguardedMutationsAllowed())
            return true;
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
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { createAppointmentInDb, updateAppointmentInDb } from "../db/appointmentsQuery.js";
export async function registerScheduleRoutes(app) {
    app.post("/api/appointments", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        const input = parseSchedulePayload(createAppointmentSchema, request.body);
        if (!input) {
            return reply.code(400).send({ code: "AppointmentValidationError", message: appointmentCreateValidationMessage });
        }
        try {
            await createAppointmentInDb(orgId, input);
            const dashboard = await getDashboardFromDb(orgId);
            return reply.code(201).send(dashboardSchema.parse(dashboard));
        }
        catch (error) {
            return sendAppointmentRejection(reply, appointmentRejectionResponse("create", error));
        }
    });
    async function updateAppointmentHandler(request, reply) {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        const params = request.params;
        if (!params.appointmentId) {
            return reply.code(400).send({ code: "AppointmentRouteValidationError", message: appointmentMissingRouteMessage });
        }
        const input = parseSchedulePayload(updateAppointmentSchema, request.body);
        if (!input) {
            return reply.code(400).send({ code: "AppointmentValidationError", message: appointmentUpdateValidationMessage });
        }
        try {
            await updateAppointmentInDb(orgId, params.appointmentId, input);
            const dashboard = await getDashboardFromDb(orgId);
            return dashboardSchema.parse(dashboard);
        }
        catch (error) {
            return sendAppointmentRejection(reply, appointmentRejectionResponse("update", error));
        }
    }
    app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
    app.put("/api/schedule/appointments/:appointmentId", updateAppointmentHandler);
}
