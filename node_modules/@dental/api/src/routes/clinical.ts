import type { FastifyInstance } from "fastify";
import {
  clinicalRuleEvaluationInputSchema,
  clinicalRuleEvaluationResponseSchema,
  clinicalRuleSchema,
  createClinicalRuleSchema,
  updateClinicalRuleSchema
} from "@dental/shared";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import { evaluateClinicalRulesInDb, createClinicalRuleInDb, updateClinicalRuleInDb } from "../db/clinicalQuery.js";
import { getDefaultOrganizationId } from "../db/pricelistQuery.js";

type ClinicalPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const clinicalRuleEvaluationValidationMessage =
  "Ошибка валидации: запрос не соответствует формату.";
const clinicalRuleMutationValidationMessage =
  "Ошибка валидации: данные правила некорректны.";

function parseClinicalPayload<T>(schema: ClinicalPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function registerClinicalRoutes(app: FastifyInstance) {
  app.post("/api/clinical/rules/evaluate", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinical rule evaluate"))) return;
    const input = parseClinicalPayload(clinicalRuleEvaluationInputSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleEvaluationValidationMessage });
    }
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
    }
    return clinicalRuleEvaluationResponseSchema.parse(await evaluateClinicalRulesInDb(orgId, input));
  });

  app.post("/api/clinical/rules", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule create"))) return;
    const input = parseClinicalPayload(createClinicalRuleSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
    }
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
    }
    return clinicalRuleSchema.parse(await createClinicalRuleInDb(orgId, input));
  });

  app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule update"))) return;
    const params = request.params as { ruleId: string };
    const body = request.body && typeof request.body === "object" ? request.body : {};
    const input = parseClinicalPayload(updateClinicalRuleSchema, { ...body, id: params.ruleId });
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
    }
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
    }
    return clinicalRuleSchema.parse(await updateClinicalRuleInDb(orgId, input));
  });

	// COMPETITOR FEATURE #19: прием::пользовательские_справочники_бланков_форма_043у
	app.get("/api/clinical/custom-examination-form-catalogs", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getCustomExaminationFormCatalogsFromDb } = await import("../db/customExaminationFormCatalogsQuery.js");
		return reply.status(200).send(await getCustomExaminationFormCatalogsFromDb(orgId));
	});

	// COMPETITOR FEATURE #31: прием::случаи_обслуживания_без_выбора_зубов
	app.get("/api/clinical/non-dental-examination-forms", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getNonDentalExaminationFormsFromDb } = await import("../db/nonDentalExaminationFormsQuery.js");
		return reply.status(200).send(await getNonDentalExaminationFormsFromDb(orgId));
	});

	// COMPETITOR FEATURE #34: план_лечения::управление_этапами_и_автоархивация
	app.get("/api/documents/treatment-plan-stages", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getTreatmentPlanStagesFromDb } = await import("../db/treatmentPlanStagesAutoArchiveQuery.js");
		return reply.status(200).send(await getTreatmentPlanStagesFromDb(orgId));
	});

	// COMPETITOR FEATURE #37: расписание::резервирование_времени_в_сетке
	app.get("/api/schedule/time-reservations", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getScheduleTimeReservationsFromDb } = await import("../db/scheduleTimeReservationsQuery.js");
		return reply.status(200).send(await getScheduleTimeReservationsFromDb(orgId));
	});

	// COMPETITOR FEATURE #39: интеграции::diagnocat_ии_анализ_снимков_и_автоформула
	app.get("/api/integrations/diagnocat-findings", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getDiagnocatAiFindingsFromDb } = await import("../db/diagnocatAiFindingsQuery.js");
		return reply.status(200).send(await getDiagnocatAiFindingsFromDb(orgId));
	});

	// COMPETITOR FEATURE #40: прием::зубная_формула_пломба_кариес_и_детская_формула
	app.get("/api/clinical/extended-odontogram-states", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getExtendedOdontogramStatesFromDb } = await import("../db/extendedOdontogramStatesQuery.js");
		return reply.status(200).send(await getExtendedOdontogramStatesFromDb(orgId));
	});

	// COMPETITOR FEATURE #48: расписание::буфер_обмена_в_расписании_для_быстрого_переноса
	app.get("/api/schedule/clipboard-items", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getScheduleClipboardItemsFromDb } = await import("../db/scheduleClipboardItemsQuery.js");
		return reply.status(200).send(await getScheduleClipboardItemsFromDb(orgId));
	});

	// COMPETITOR FEATURE #54: кадры::справедливое_распределение_конверсии_повторной_записи
	app.get("/api/hr/rebooking-conversion-rules", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getRebookingConversionRulesFromDb } = await import("../db/rebookingConversionRulesQuery.js");
		return reply.status(200).send(await getRebookingConversionRulesFromDb(orgId));
	});

	// COMPETITOR FEATURE #57: кадры::блокировка_параллельного_входа_под_одной_учетной_записью
	app.get("/api/system/single-session-enforcements", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getSingleSessionEnforcementsFromDb } = await import("../db/singleSessionEnforcementsQuery.js");
		return reply.status(200).send(await getSingleSessionEnforcementsFromDb(orgId));
	});

	// COMPETITOR FEATURE #60: интеграции::геокодирование_адресов_через_dadata
	app.get("/api/integrations/dadata-addresses", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getDadataGeocodedAddressesFromDb } = await import("../db/dadataGeocodedAddressesQuery.js");
		return reply.status(200).send(await getDadataGeocodedAddressesFromDb(orgId));
	});

	// COMPETITOR FEATURE #62: финансы::отображение_суммы_начислений_врачам_в_прайс_листе
	app.get("/api/finance/pricelist-payrolls", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getPricelistDoctorPayrollsFromDb } = await import("../db/pricelistDoctorPayrollsQuery.js");
		return reply.status(200).send(await getPricelistDoctorPayrollsFromDb(orgId));
	});

	// COMPETITOR FEATURE #46: рабочее_место::история_последних_просмотренных_карточек
	app.get("/api/hr/recent-patients", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getRecentPatientHistoryFromDb } = await import("../db/recentPatientHistoryQuery.js");
		return reply.status(200).send(await getRecentPatientHistoryFromDb(orgId));
	});

	// COMPETITOR FEATURE #47: crm::конструктор_типов_задач_без_привязки_к_визиту
	app.get("/api/crm/custom-task-types", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getCustomCrmTaskTypesFromDb } = await import("../db/customCrmTaskTypesQuery.js");
		return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
	});

	// COMPETITOR FEATURE #50: crm::прямая_отправка_планов_лечения_и_счетов_на_email
	app.get("/api/communications/email-dispatch-logs", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getCrmEmailDispatchLogsFromDb } = await import("../db/crmEmailDispatchLogsQuery.js");
		return reply.status(200).send(await getCrmEmailDispatchLogsFromDb(orgId));
	});

	// COMPETITOR FEATURE #56: расписание::двухуровневые_причины_отмены_клиника_пациент
	app.get("/api/schedule/cancellation-reasons-two-level", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getCancellationReasonsTwoLevelFromDb } = await import("../db/cancellationReasonsTwoLevelQuery.js");
		return reply.status(200).send(await getCancellationReasonsTwoLevelFromDb(orgId));
	});

	// COMPETITOR FEATURE #58: финансы::принудительное_закрепление_авансов_за_врачами_и_услугами
	app.get("/api/finance/advance-deposit-taggings", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getAdvanceDepositTaggingsFromDb } = await import("../db/advanceDepositTaggingsQuery.js");
		return reply.status(200).send(await getAdvanceDepositTaggingsFromDb(orgId));
	});

	// COMPETITOR FEATURE #52: план_лечения::конструктор_планов_лечения_2_0
	app.get("/api/documents/treatment-plan-lock-tokens", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getTreatmentPlanLockTokensFromDb } = await import("../db/treatmentPlanLockTokensQuery.js");
		return reply.status(200).send(await getTreatmentPlanLockTokensFromDb(orgId));
	});

	// COMPETITOR FEATURE #53: финансы::отправка_электронных_кассовых_чеков_на_email_или_смс
	app.get("/api/finance/digital-receipt-dispatches", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getDigitalReceiptDispatchesFromDb } = await import("../db/digitalReceiptDispatchesQuery.js");
		return reply.status(200).send(await getDigitalReceiptDispatchesFromDb(orgId));
	});

	// COMPETITOR FEATURE #55: пациенты::вкладка_приемы_рабочий_стол_администратора
	app.get("/api/crm/patient-service-lineages", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getPatientServiceLineagesFromDb } = await import("../db/patientServiceLineagesQuery.js");
		return reply.status(200).send(await getPatientServiceLineagesFromDb(orgId));
	});

	// COMPETITOR FEATURE #61: интеграции::конструктор_лендингов_flexbe_и_сопоставление_полей
	app.get("/api/integrations/landing-field-mappings", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getLandingFieldMappingsFromDb } = await import("../db/landingFieldMappingsQuery.js");
		return reply.status(200).send(await getLandingFieldMappingsFromDb(orgId));
	});

	// COMPETITOR FEATURE #63: финансы::автоматическое_указание_меры_количества_в_kkm
	app.get("/api/finance/kkm-item-quantity-units", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getKkmItemQuantityUnitsFromDb } = await import("../db/kkmItemQuantityUnitsQuery.js");
		return reply.status(200).send(await getKkmItemQuantityUnitsFromDb(orgId));
	});

	// COMPETITOR FEATURE #59: коммуникации::мультимессенджер_uis_omni
	app.get("/api/communications/uis-omni-messenger-queues", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getUisOmniMessengerQueuesFromDb } = await import("../db/uisOmniMessengerQueuesQuery.js");
		return reply.status(200).send(await getUisOmniMessengerQueuesFromDb(orgId));
	});

	// COMPETITOR FEATURE #6: маркетинг::фильтр_потерянных_пациентов_в_отчете
	app.get("/api/analytics/lost-patients-filters", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getLostPatientsFiltersFromDb } = await import("../db/lostPatientsFiltersQuery.js");
		return reply.status(200).send(await getLostPatientsFiltersFromDb(orgId));
	});

	// COMPETITOR FEATURE #9: коммуникации::подтверждение_приема_при_обработке_обращения
	app.get("/api/communications/quick-appointment-confirmations", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getQuickAppointmentConfirmationsFromDb } = await import("../db/quickAppointmentConfirmationsQuery.js");
		return reply.status(200).send(await getQuickAppointmentConfirmationsFromDb(orgId));
	});

	// COMPETITOR FEATURE #21: расписание::виджет_срочные_обращения_под_календарем
	app.get("/api/schedule/urgent-schedule-requests", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getUrgentScheduleRequestsFromDb } = await import("../db/urgentScheduleRequestsQuery.js");
		return reply.status(200).send(await getUrgentScheduleRequestsFromDb(orgId));
	});

	// COMPETITOR FEATURE #23: аналитика::отчет_эффективность_подтверждения_приемов
	app.get("/api/analytics/confirmation-performance-reports", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getConfirmationPerformanceReportsFromDb } = await import("../db/confirmationPerformanceReportsQuery.js");
		return reply.status(200).send(await getConfirmationPerformanceReportsFromDb(orgId));
	});

	// COMPETITOR FEATURE #43: план_лечения::альтернативные_планы_лечения
	app.get("/api/documents/alternative-treatment-plans", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") return reply.status(400).send({ error: "Invalid organization ID" });
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getAlternativeTreatmentPlansFromDb } = await import("../db/alternativeTreatmentPlansQuery.js");
		return reply.status(200).send(await getAlternativeTreatmentPlansFromDb(orgId));
	});
}



