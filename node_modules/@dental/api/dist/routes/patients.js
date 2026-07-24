import { createPatientSchema, patientSchema, updatePatientAdministrativeProfileSchema, updatePatientSchema } from "@dental/shared";
const patientCreateValidationMessage = "Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.";
const patientUpdateValidationMessage = "Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты.";
const patientAdministrativeValidationMessage = "Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя.";
const patientRepresentativeValidationMessage = "Данные представителя не сохранены: если указаны телефон, документ или получатель представителя, заполните ФИО и основание представительства.";
const patientMissingRouteMessage = "Пациент не выбран. Откройте актуальную карту пациента и повторите действие.";
const patientNotFoundMessage = "Пациент не найден. Обновите список пациентов и выберите актуальную карту.";
const patientDuplicateMessage = "Похожая карта пациента уже есть. Найдите пациента по ФИО или телефону и обновите существующую карточку.";
function parsePatientPayload(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        return null;
    return parsed.data;
}
function sendPatientRouteValidationError(reply) {
    return reply.code(400).send({
        error: "PatientRouteValidationError",
        message: patientMissingRouteMessage
    });
}
function sendPatientNotFound(reply) {
    return reply.code(404).send({
        error: "PatientNotFound",
        message: patientNotFoundMessage
    });
}
function normalizePatientNameForDuplicate(value) {
    return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}
function normalizePatientPhoneForDuplicate(value) {
    const digits = (value ?? "").replace(/\D/g, "");
    return digits.length >= 5 ? digits : "";
}
function findPatientDuplicate(patientsList, input, ignoredPatientId) {
    const inputName = normalizePatientNameForDuplicate(input.fullName);
    const inputBirthDate = (input.birthDate ?? "").trim();
    const inputPhone = normalizePatientPhoneForDuplicate(input.phone);
    if (!inputName && !inputBirthDate && !inputPhone)
        return null;
    return (patientsList.find((patient) => {
        if (patient.id === ignoredPatientId || patient.status !== "active")
            return false;
        const sameName = Boolean(inputName) && inputName === normalizePatientNameForDuplicate(patient.fullName);
        const sameBirthDate = Boolean(inputBirthDate) && inputBirthDate === (patient.birthDate ?? "");
        const samePhone = Boolean(inputPhone) && inputPhone === normalizePatientPhoneForDuplicate(patient.phone);
        return (sameName && sameBirthDate) || (sameName && samePhone) || (sameBirthDate && samePhone);
    }) ?? null);
}
function sendPatientDuplicate(reply) {
    return reply.code(409).send({
        error: "PatientDuplicateError",
        message: patientDuplicateMessage
    });
}
function hasText(value) {
    return Boolean(value?.trim());
}
function hasIncompleteRepresentativeIdentity(value) {
    const hasRepresentativeFact = hasText(value.legalRepresentativeFullName) ||
        hasText(value.legalRepresentativeRelationship) ||
        hasText(value.legalRepresentativeIdentityDocument) ||
        hasText(value.legalRepresentativePhone) ||
        /представител|опекун|родител|довер/i.test(value.preferredDocumentRecipient ?? "");
    if (!hasRepresentativeFact)
        return false;
    return !hasText(value.legalRepresentativeFullName) || !hasText(value.legalRepresentativeRelationship);
}
import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";
import { getPatientsFromDb, createPatientInDb, updatePatientInDb, updatePatientAdministrativeProfileInDb } from "../db/patientsQuery.js";
export async function registerPatientRoutes(app) {
    app.get("/api/patients", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        try {
            const dbPatients = await getPatientsFromDb(orgId);
            return dbPatients.map((patient) => patientSchema.parse(patient));
        }
        catch (e) {
            console.error("[Patients] Error fetching from DB:", e);
            return reply.code(500).send({ error: "DatabaseError" });
        }
    });
    app.post("/api/patients", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        const input = parsePatientPayload(createPatientSchema, request.body);
        if (!input) {
            return reply.code(400).send({ error: "PatientValidationError", message: patientCreateValidationMessage });
        }
        const dbPatients = await getPatientsFromDb(orgId);
        const duplicate = findPatientDuplicate(dbPatients, input);
        if (duplicate)
            return sendPatientDuplicate(reply);
        try {
            const patient = await createPatientInDb(orgId, input);
            return reply.code(201).send(patientSchema.parse(patient));
        }
        catch (e) {
            console.error("[Patients] Create error:", e);
            return reply.code(500).send({ error: "DatabaseError" });
        }
    });
    app.put("/api/patients/:patientId", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        const params = request.params;
        if (!params.patientId)
            return sendPatientRouteValidationError(reply);
        const input = parsePatientPayload(updatePatientSchema, request.body);
        if (!input) {
            return reply.code(400).send({ error: "PatientValidationError", message: patientUpdateValidationMessage });
        }
        try {
            const patient = await updatePatientInDb(orgId, params.patientId, input);
            if (!patient)
                return sendPatientNotFound(reply);
            return patientSchema.parse(patient);
        }
        catch (e) {
            console.error("[Patients] Update error:", e);
            return sendPatientNotFound(reply);
        }
    });
    app.put("/api/patients/:patientId/administrative-profile", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        if (!clinicToken)
            return reply.code(401).send({ error: "AuthRequired" });
        const payload = verifyToken(clinicToken, TOKEN_SECRET());
        if (!payload || !payload.organizationId)
            return reply.code(401).send({ error: "AuthExpired" });
        const orgId = payload.organizationId;
        const params = request.params;
        if (!params.patientId)
            return sendPatientRouteValidationError(reply);
        const input = parsePatientPayload(updatePatientAdministrativeProfileSchema, request.body);
        if (!input) {
            return reply.code(400).send({ error: "PatientValidationError", message: patientAdministrativeValidationMessage });
        }
        try {
            const patient = await updatePatientAdministrativeProfileInDb(orgId, params.patientId, input);
            if (!patient)
                return sendPatientNotFound(reply);
            return patientSchema.parse(patient);
        }
        catch (e) {
            console.error("[Patients] Update profile error:", e);
            return sendPatientNotFound(reply);
        }
    });
}
