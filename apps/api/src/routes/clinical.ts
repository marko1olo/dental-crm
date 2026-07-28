import type { FastifyInstance } from "fastify";
import {
  clinicalRuleEvaluationInputSchema,
  clinicalRuleEvaluationResponseSchema,
  clinicalRuleSchema,
  createClinicalRuleSchema,
  updateClinicalRuleSchema
} from "@dental/shared";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import { requireOrganizationId, requireStaffIdentity } from "../security/identity.js";
import { evaluateClinicalRulesInDb, createClinicalRuleInDb, updateClinicalRuleInDb } from "../db/clinicalQuery.js";
import { ClinicalTaskOwnershipError } from "../db/clinicalTasksQuery.js";
import { CLINICAL_PHASE_CODES, ClinicalRouter, isClinicalPhaseCode } from "../services/clinical/ClinicalRouter.js";

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

/**
 * Колонки clinical_tasks имеют тип uuid: строка неверного формата доходит до
 * PostgreSQL и возвращается пятисоткой «invalid input syntax for type uuid».
 * Проверяем формат заранее, чтобы клиент получил внятные 400, а не 500.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalUuid(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return undefined;
  return value;
}

const clinicalPhaseCompletionValidationMessage = `Ошибка валидации: нужен patientId в формате UUID и completedPhaseCode из списка: ${CLINICAL_PHASE_CODES.join(", ")}.`;

export async function registerClinicalRoutes(app: FastifyInstance) {
  app.post("/api/clinical/rules/evaluate", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinical rule evaluate"))) return;
    const input = parseClinicalPayload(clinicalRuleEvaluationInputSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleEvaluationValidationMessage });
    }
    // БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»
    // без учёта того, кто прислал запрос. Клиника Б проверяла противопоказания
    // по НАБОРУ ПРАВИЛ КЛИНИКИ А: её собственное правило «аллергия на артикаин —
    // блокирующее» в выборку не попадало, blocker не находился, и укол
    // с противопоказанием проходил проверку.
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    const evaluation = await evaluateClinicalRulesInDb(orgId, input);
    const blockingRule = evaluation.evaluations.find(
      (e) => !e.resolved && e.severity === "blocker"
    );
    if (blockingRule && input.enforceBlockers) {
      return reply.code(400).send({
        code: "ClinicalRuleBlocker",
        error: "ClinicalRuleBlocker",
        message: `Клиническое противопоказание: ${blockingRule.message}`,
        ruleId: blockingRule.ruleId,
        evaluation: blockingRule,
      });
    }
    return clinicalRuleEvaluationResponseSchema.parse(evaluation);
  });

  app.post("/api/clinical/rules", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule create"))) return;
    const input = parseClinicalPayload(createClinicalRuleSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
    }
    // См. выше: правило создавалось в чужой организации.
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
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
    // См. выше: правило редактировалось в чужой организации.
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    return clinicalRuleSchema.parse(await updateClinicalRuleInDb(orgId, input));
  });

  /**
   * Завершение клинического этапа и передача пациента следующему врачу.
   *
   * БЫЛО: роута не существовало. Сервис ClinicalRouter собирал задачу-передачу
   * в памяти, печатал её в консоль и возвращал вызывающему, которого не было:
   * класс не был подключён ни к одному эндпоинту. Передача между этапами
   * лечения не доходила ни до базы, ни до следующего врача.
   */
  app.post("/api/clinical/phase-completions", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical phase completion"))) return;
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;

    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const patientId = typeof body.patientId === "string" && UUID_PATTERN.test(body.patientId) ? body.patientId : null;
    const treatmentPlanId = optionalUuid(body.treatmentPlanId);
    const assignedDoctorId = optionalUuid(body.assignedDoctorId);
    const toothCodesRaw = body.toothCodes;
    const toothCodesValid =
      toothCodesRaw === undefined || (Array.isArray(toothCodesRaw) && toothCodesRaw.every((c) => typeof c === "string"));
    const notesValid = body.notes === undefined || body.notes === null || typeof body.notes === "string";

    if (
      !patientId ||
      !isClinicalPhaseCode(body.completedPhaseCode) ||
      treatmentPlanId === undefined ||
      assignedDoctorId === undefined ||
      !toothCodesValid ||
      !notesValid
    ) {
      return reply
        .code(400)
        .send({ error: "ClinicalPhaseValidationError", message: clinicalPhaseCompletionValidationMessage });
    }

    try {
      const task = await new ClinicalRouter().handlePhaseCompletion(orgId, {
        patientId,
        completedPhaseCode: body.completedPhaseCode,
        notes: typeof body.notes === "string" ? body.notes : null,
        toothCodes: (toothCodesRaw as string[] | undefined) ?? [],
        treatmentPlanId,
        assignedDoctorId,
      });
      if (!task) {
        return reply
          .code(400)
          .send({ error: "ClinicalPhaseValidationError", message: clinicalPhaseCompletionValidationMessage });
      }
      return reply.code(201).send(task);
    } catch (error) {
      if (error instanceof ClinicalTaskOwnershipError) {
        return reply.code(404).send({ error: "ClinicalTaskReferenceNotFound", message: error.message, field: error.field });
      }
      throw error;
    }
  });

  /** Задачи, созданные передачей между этапами. Это то, что видит следующий врач, открывая карту. */
  app.get("/api/clinical/tasks", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinical tasks read"))) return;
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    const { patientId } = request.query as { patientId?: string };
    if (patientId !== undefined && !UUID_PATTERN.test(patientId)) {
      return reply
        .code(400)
        .send({ error: "ClinicalTaskValidationError", message: "Ошибка валидации: patientId должен быть UUID." });
    }
    return reply.code(200).send(await new ClinicalRouter().listTasks(orgId, patientId));
  });

	/*
	 * Маршруты «пользовательские справочники бланков» и «формы осмотра без выбора
	 * зубов» удалены вместе со своими блоками с экрана приёма: обе таблицы
	 * отвечали пустым списком всегда — писателя нет ни у одной, экрана настройки
	 * этих форм тоже нет. ДОЛГ: пользовательские формы осмотра требуют модели
	 * полей и экрана редактора; возвращать блоки имеет смысл вместе с ними.
	 */

	// COMPETITOR FEATURE #34: план_лечения::управление_этапами_и_автоархивация
	app.get("/api/documents/treatment-plan-stages", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getTreatmentPlanStagesFromDb } = await import("../db/treatmentPlanStagesAutoArchiveQuery.js");
		return reply.status(200).send(await getTreatmentPlanStagesFromDb(orgId));
	});

	// COMPETITOR FEATURE #37: расписание::резервирование_времени_в_сетке
	app.get("/api/schedule/time-reservations", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getScheduleTimeReservationsFromDb } = await import("../db/scheduleTimeReservationsQuery.js");
		return reply.status(200).send(await getScheduleTimeReservationsFromDb(orgId));
	});

	/*
	 * Маршрут «находки Diagnocat» удалён вместе со своим блоком: таблица пуста
	 * всегда, потому что интеграции нет — ни ключей, ни единого вызова API
	 * Diagnocat в проекте. ДОЛГ: подключение внешнего анализа снимков.
	 *
	 * Маршрут «расширенные состояния зубов» удалён по другой причине: зубная
	 * формула в системе РАБОТАЕТ, но живёт в одонтограмме (/api/odontogram/*) и
	 * показывается на том же экране приёма выше. Пустой блок рядом с работающей
	 * формулой — это второй, ложный источник правды о состоянии зубов.
	 */


	/*
	 * Шесть маршрутов удалены вместе со своими модулями доступа. Их таблицы
	 * никто в приложении не наполняет — ни одной вставки, ноль строк в живой
	 * базе — а интерфейс их вообще не звал: ни одного вызова в apps/web.
	 * Это были адреса, которые могли вернуть только пустой список и которые
	 * никто не спрашивал. Перепись: scripts/census-hollow-query-modules.mjs.
	 *
	 * /api/schedule/clipboard-items                      schedule_clipboard_items
	 * /api/communications/email-dispatch-logs            crm_email_dispatch_logs
	 * /api/integrations/prodoctorov-sync                 prodoctorov_sync_exports
	 * /api/communications/uis-omni-messenger-queues      uis_omni_messenger_queues
	 * /api/communications/quick-appointment-confirmations quick_appointment_confirmations
	 * /api/documents/alternative-treatment-plans         alternative_treatment_plans
	 *
	 * ДОЛГ, а не потеря: буфер обмена в расписании, отправка планов на почту,
	 * синхронизация отзывов «ПроДокторов», очередь мультимессенджера, быстрое
	 * подтверждение приёма и альтернативные планы лечения — реальные задачи.
	 * Каждая требует того, чего нет: писателя в таблицу и экрана, с которого
	 * этот писатель вызывается. Возвращать их имеет смысл вместе с ними.
	 */

	// COMPETITOR FEATURE #54: кадры::справедливое_распределение_конверсии_повторной_записи
	app.get("/api/hr/rebooking-conversion-rules", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getRebookingConversionRulesFromDb } = await import("../db/rebookingConversionRulesQuery.js");
		return reply.status(200).send(await getRebookingConversionRulesFromDb(orgId));
	});

	// COMPETITOR FEATURE #57: кадры::блокировка_параллельного_входа_под_одной_учетной_записью
	app.get("/api/system/single-session-enforcements", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getSingleSessionEnforcementsFromDb } = await import("../db/singleSessionEnforcementsQuery.js");
		return reply.status(200).send(await getSingleSessionEnforcementsFromDb(orgId));
	});

	// COMPETITOR FEATURE #60: интеграции::геокодирование_адресов_через_dadata
	app.get("/api/integrations/dadata-addresses", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getDadataGeocodedAddressesFromDb } = await import("../db/dadataGeocodedAddressesQuery.js");
		return reply.status(200).send(await getDadataGeocodedAddressesFromDb(orgId));
	});

	/*
	 * Маршрут «начисления врачам по прайсу» удалён вместе со своим экраном.
	 * Он читал таблицу pricelist_doctor_payrolls, в которую в приложении никто
	 * не пишет, и обещал поля «процент врача» и «маржа клиники» — таких данных
	 * нет ни у сотрудника, ни в прайсе, нигде. Считать начисление не из чего.
	 * Выработку врача из настоящих платежей и приёмов считает
	 * services/reports/managerReports.ts (doctorPerformance).
	 * ДОЛГ: расчёт зарплаты врача требует поля процента у сотрудника.
	 */

	/*
	 * История последних открытых карточек.
	 *
	 * Была только выборка. В таблицу recent_patient_history не писал никто и
	 * никогда — ни одной вставки во всём сервере, ноль строк в живой базе. Виджет
	 * «Недавние» в шапке рабочего места показывал «История просмотров пуста»
	 * каждому пользователю каждый день с момента появления, и выглядело это как
	 * «функция есть, просто ещё не накопилось».
	 *
	 * История личная: сотрудник видит свои открытия, а не чужие, поэтому нужен
	 * не только идентификатор клиники, но и подписанный вход сотрудника.
	 */
	app.get("/api/hr/recent-patients", async (request, reply) => {
		const identity = requireStaffIdentity(request, reply);
		if (!identity) return;
		const { getRecentPatientHistoryFromDb } = await import("../db/recentPatientHistoryQuery.js");
		return reply
			.status(200)
			.send(await getRecentPatientHistoryFromDb(identity.organizationId!, identity.userId!));
	});

	/*
	 * Отметка об открытии карточки — недостающая половина той же функции.
	 *
	 * Идентификатор пациента принимается из тела, но проверяется по организации
	 * из подписанного токена: подставить чужого пациента нельзя. Неизвестный
	 * пациент — 404, а не молчаливое согласие: иначе в историю попадали бы
	 * записи о карточках, которых нет.
	 */
	app.post("/api/hr/recent-patients", async (request, reply) => {
		const identity = requireStaffIdentity(request, reply);
		if (!identity) return;
		const body = request.body as { patientId?: unknown } | undefined;
		const patientId = typeof body?.patientId === "string" ? body.patientId : "";
		if (!patientId) {
			return reply.status(400).send({
				error: "PatientIdRequired",
				message: "Не указан пациент, карточку которого открыли.",
			});
		}
		const { recordPatientViewInDb } = await import("../db/recentPatientHistoryQuery.js");
		const result = await recordPatientViewInDb(
			identity.organizationId!,
			identity.userId!,
			patientId,
		);
		if (!result.recorded) {
			return reply.status(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}
		return reply.status(200).send({ recorded: true });
	});

	// COMPETITOR FEATURE #47: crm::конструктор_типов_задач_без_привязки_к_визиту
	app.get("/api/crm/custom-task-types", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getCustomCrmTaskTypesFromDb } = await import("../db/customCrmTaskTypesQuery.js");
		return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
	});

	// COMPETITOR FEATURE #56: расписание::двухуровневые_причины_отмены_клиника_пациент
	app.get("/api/schedule/cancellation-reasons-two-level", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getCancellationReasonsTwoLevelFromDb } = await import("../db/cancellationReasonsTwoLevelQuery.js");
		return reply.status(200).send(await getCancellationReasonsTwoLevelFromDb(orgId));
	});

	/*
	 * Маршрут «закрепление авансов» удалён вместе со своим экраном: таблица
	 * advance_deposit_taggings не наполняется ничем. Часть кассовой темы 54-ФЗ,
	 * которой в системе нет; см. долг в apps/web/src/FinanceView.tsx.
	 */

	// COMPETITOR FEATURE #52: план_лечения::конструктор_планов_лечения_2_0
	app.get("/api/documents/treatment-plan-lock-tokens", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getTreatmentPlanLockTokensFromDb } = await import("../db/treatmentPlanLockTokensQuery.js");
		return reply.status(200).send(await getTreatmentPlanLockTokensFromDb(orgId));
	});

	// COMPETITOR FEATURE: документы::печать_одонтограммы_в_плане_лечения
	app.get("/api/documents/treatment-plan-print-odontogram", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getTreatmentPlanPrintOdontogramsFromDb } = await import("../db/treatmentPlanPrintOdontogramsQuery.js");
		return reply.status(200).send(await getTreatmentPlanPrintOdontogramsFromDb(orgId));
	});


	/*
	 * Маршрут «отправка электронных чеков» удалён вместе со своим экраном:
	 * таблица digital_receipt_dispatches пуста всегда, чеки никуда не уходят —
	 * драйвера кассы в системе нет. Показывать журнал отправки чеков, которых не
	 * было, — прямая неправда в финансовом разделе.
	 */

	// COMPETITOR FEATURE #55: пациенты::вкладка_приемы_рабочий_стол_администратора
	app.get("/api/crm/patient-service-lineages", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.query as { patientId?: string };
		const { getPatientServiceLineagesFromDb } = await import("../db/patientServiceLineagesQuery.js");
		return reply.status(200).send(await getPatientServiceLineagesFromDb(orgId, patientId));
	});

	// COMPETITOR FEATURE #54: маркетинг::маппинг_полей_лендингов_и_лид_форм
	app.get("/api/integrations/landing-field-mappings", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getLandingFieldMappingsFromDb } = await import("../db/landingFieldMappingsQuery.js");
		return reply.status(200).send(await getLandingFieldMappingsFromDb(orgId));
	});

	// COMPETITOR FEATURE #47: crm::пользовательские_типы_задач_для_администраторов
	app.get("/api/crm/custom-crm-task-types", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getCustomCrmTaskTypesFromDb } = await import("../db/customCrmTaskTypesQuery.js");
		return reply.status(200).send(await getCustomCrmTaskTypesFromDb(orgId));
	});

	// COMPETITOR FEATURE #58: пациенты::геокодинг_адресов_через_dadata
	app.get("/api/integrations/dadata-geocoded-addresses", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getDadataGeocodedAddressesFromDb } = await import("../db/dadataGeocodedAddressesQuery.js");
		return reply.status(200).send(await getDadataGeocodedAddressesFromDb(orgId));
	});


	// COMPETITOR FEATURE #63: финансы::автоматическое_указание_меры_количества_в_kkm
	/*
	 * Маршрут «единицы измерения для ККМ» удалён вместе со своим экраном: часть
	 * кассовой темы 54-ФЗ, таблица kkm_item_quantity_units не наполняется ничем.
	 */

	// Второй адрес того же удалённого экрана начислений убран вместе с первым.


	// COMPETITOR FEATURE #6: маркетинг::фильтр_потерянных_пациентов_в_отчете
	app.get("/api/analytics/lost-patients-filters", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getLostPatientsFiltersFromDb } = await import("../db/lostPatientsFiltersQuery.js");
		return reply.status(200).send(await getLostPatientsFiltersFromDb(orgId));
	});

	// COMPETITOR FEATURE #21: расписание::виджет_срочные_обращения_под_календарем
	app.get("/api/schedule/urgent-schedule-requests", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getUrgentScheduleRequestsFromDb } = await import("../db/urgentScheduleRequestsQuery.js");
		return reply.status(200).send(await getUrgentScheduleRequestsFromDb(orgId));
	});

	// COMPETITOR FEATURE #23: аналитика::отчет_эффективность_подтверждения_приемов
	app.get("/api/analytics/confirmation-performance-reports", async (request, reply) => {
		// Организация берётся из подписанного токена, а не из заголовка клиента.
		// Раньше здесь принимался x-organization-id без всякой аутентификации:
		// любой мог подставить UUID чужой клиники и читать её медицинские данные.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { getConfirmationPerformanceReportsFromDb } = await import("../db/confirmationPerformanceReportsQuery.js");
		return reply.status(200).send(await getConfirmationPerformanceReportsFromDb(orgId));
	});

}



