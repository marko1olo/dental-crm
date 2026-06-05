import type { FastifyInstance, FastifyReply } from "fastify";
import { createPatientSchema, patientSchema, updatePatientAdministrativeProfileSchema, updatePatientSchema } from "@dental/shared";
import { createPatient, patients, updatePatient, updatePatientAdministrativeProfile } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

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

function findPatientDuplicate(input: PatientDuplicateInput, ignoredPatientId?: string) {
  const inputName = normalizePatientNameForDuplicate(input.fullName);
  const inputBirthDate = (input.birthDate ?? "").trim();
  const inputPhone = normalizePatientPhoneForDuplicate(input.phone);
  if (!inputName && !inputBirthDate && !inputPhone) return null;

  return (
    patients.find((patient) => {
      if (patient.id === ignoredPatientId || patient.status !== "active") return false;
      const sameName = Boolean(inputName) && inputName === normalizePatientNameForDuplicate(patient.fullName);
      const sameBirthDate = Boolean(inputBirthDate) && inputBirthDate === (patient.birthDate ?? "");
      const samePhone = Boolean(inputPhone) && inputPhone === normalizePatientPhoneForDuplicate(patient.phone);
      return (sameName && sameBirthDate) || (sameName && samePhone) || (sameBirthDate && samePhone);
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

export async function registerPatientRoutes(app: FastifyInstance) {
  app.get("/api/patients", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "patient list"))) return;
    return patients.map((patient) => patientSchema.parse(patient));
  });

  app.post("/api/patients", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient create"))) return;
    const input = parsePatientPayload(createPatientSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientCreateValidationMessage });
    }
    if (findPatientDuplicate(input)) return sendPatientDuplicate(reply);
    const patient = createPatient(input);
    return reply.code(201).send(patientSchema.parse(patient));
  });

  app.put("/api/patients/:patientId", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient update"))) return;
    const params = request.params as { patientId?: string };
    if (!params.patientId) return sendPatientRouteValidationError(reply);
    const input = parsePatientPayload(updatePatientSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientUpdateValidationMessage });
    }
    const currentPatient = patients.find((patient) => patient.id === params.patientId);
    if (!currentPatient) return sendPatientNotFound(reply);
    const duplicateInput = {
      fullName: input.fullName ?? currentPatient.fullName,
      birthDate: input.birthDate !== undefined ? input.birthDate : currentPatient.birthDate,
      phone: input.phone !== undefined ? input.phone : currentPatient.phone
    };
    if (findPatientDuplicate(duplicateInput, currentPatient.id)) return sendPatientDuplicate(reply);
    try {
      const patient = updatePatient(params.patientId, input);
      return patientSchema.parse(patient);
    } catch {
      return sendPatientNotFound(reply);
    }
  });

  app.put("/api/patients/:patientId/administrative-profile", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient administrative profile update"))) return;
    const params = request.params as { patientId?: string };
    if (!params.patientId) return sendPatientRouteValidationError(reply);
    const input = parsePatientPayload(updatePatientAdministrativeProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientAdministrativeValidationMessage });
    }
    const currentPatient = patients.find((patient) => patient.id === params.patientId);
    if (!currentPatient) return sendPatientNotFound(reply);
    const representativeInput = {
      legalRepresentativeFullName:
        input.legalRepresentativeFullName !== undefined
          ? input.legalRepresentativeFullName
          : currentPatient.administrativeProfile?.legalRepresentativeFullName,
      legalRepresentativeRelationship:
        input.legalRepresentativeRelationship !== undefined
          ? input.legalRepresentativeRelationship
          : currentPatient.administrativeProfile?.legalRepresentativeRelationship,
      legalRepresentativeIdentityDocument:
        input.legalRepresentativeIdentityDocument !== undefined
          ? input.legalRepresentativeIdentityDocument
          : currentPatient.administrativeProfile?.legalRepresentativeIdentityDocument,
      legalRepresentativePhone:
        input.legalRepresentativePhone !== undefined
          ? input.legalRepresentativePhone
          : currentPatient.administrativeProfile?.legalRepresentativePhone,
      preferredDocumentRecipient:
        input.preferredDocumentRecipient !== undefined
          ? input.preferredDocumentRecipient
          : currentPatient.administrativeProfile?.preferredDocumentRecipient
    };
    if (hasIncompleteRepresentativeIdentity(representativeInput)) {
      return reply.code(400).send({ error: "PatientValidationError", message: patientRepresentativeValidationMessage });
    }
    try {
      const patient = updatePatientAdministrativeProfile(params.patientId, input);
      return patientSchema.parse(patient);
    } catch {
      return sendPatientNotFound(reply);
    }
  });
}
