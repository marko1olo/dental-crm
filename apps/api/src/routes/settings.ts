import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { getRequestIdentity } from "../security/identity.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import {
  getClinicSettingsFromDb,
  getUiPreferencesFromDb,
  saveUiPreferencesInDb,
  updateClinicModeInDb,
  updateClinicProfileInDb,
  createStaffMemberInDb,
  updateStaffWorkingHoursInDb,
  updateStaffCredentialsInDb,
  updateStaffMemberProfileInDb,
  deactivateStaffMemberInDb,
  createChairInDb,
  updateChairWorkingHoursInDb,
  updateChairProfileInDb,
  deactivateChairInDb,
  listDoctorCommissionRatesInDb,
  setDoctorCommissionRateInDb
} from "../db/settingsQuery.js";
import { hashCredential } from "../utils/cryptoHelper.js";
import {
  chairSchema,
  clinicSettingsSchema,
  createChairSchema,
  createStaffMemberSchema,
  staffMemberSchema,
  uiPreferencesInputSchema,
  uiPreferencesSchema,
  updateClinicModeSchema,
  updateClinicProfileSchema,
  updateChairWorkingHoursSchema,
  updateStaffWorkingHoursSchema,
  staffRoleSchema
} from "@dental/shared";
import { z } from "zod";

import { repairMojibakeDeep } from "../text/repairMojibake.js";

/**
 * Правка карточки сотрудника: PUT /api/settings/staff/:staffId.
 *
 * Все поля необязательны — интерфейс шлет частичное обновление. Принимаются
 * только те поля, которые реально хранятся в таблице users И возвращаются
 * назад в getClinicSettingsFromDb. Расписание сюда не входит: у него отдельный
 * адрес /working-hours, и только там проверяются активные записи за пределами
 * нового графика.
 */
const updateStaffMemberProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(240).optional(),
  role: staffRoleSchema.optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(240).nullable().optional(),
  active: z.boolean().optional()
});

/**
 * Ставка врача: PUT /api/settings/staff/:staffId/commission.
 *
 * Процент от кассы, по которому клиника платит врачу. Границы взяты из
 * колонки: doctor_commissions.commission_pct — numeric(5,2), поэтому больше
 * 100 % записать нельзя, и это не произвольный предел, а форма хранения.
 * Ноль допустим: врач на окладе — реальная договорённость, и запрещать её
 * значило бы заставлять клинику держать выдуманный процент.
 */
const updateDoctorCommissionSchema = z.object({
  commissionPct: z.number().min(0).max(100)
});

/**
 * Правка кресла: PUT /api/settings/chairs/:chairId. В таблице chairs из
 * карточки кресла хранятся только название и признак активности.
 */
const updateChairProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional()
});

type SettingsPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false; error?: { format: () => unknown } };
};

const denteAdminSecretHeader = "x-dente-admin-secret";
const uiPreferencesValidationMessage =
  "Настройки интерфейса не сохранены: проверьте выбранную роль, разделы, фильтры и параметры рабочего места.";
const clinicModeValidationMessage = "Режим клиники не сохранен: выберите допустимый режим работы клиники.";
const clinicProfileValidationMessage =
  "Профиль клиники не сохранен: проверьте название, реквизиты, лицензию, часовой пояс и рабочий график.";
const staffCreateValidationMessage =
  "Сотрудник не создан: заполните ФИО, роль, специальности и контактные данные в допустимом формате.";
const staffWorkingHoursValidationMessage =
  "Расписание сотрудника не сохранено: проверьте рабочие дни, начало и окончание смены.";
const chairCreateValidationMessage =
  "Кресло не создано: заполните название, кабинет, оснащение и специализацию в допустимом формате.";
const chairWorkingHoursValidationMessage =
  "Расписание кресла не сохранено: проверьте рабочие дни, начало и окончание смены.";
const clinicProfileTimezoneMessage = "Профиль клиники не сохранен: выберите реальный часовой пояс клиники.";
const clinicProfileScheduleConflictMessage =
  "Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники.";
const clinicProfileMutationRejectedMessage =
  "Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники.";
const staffWorkingHoursRouteValidationMessage = "Расписание сотрудника не сохранено: выберите сотрудника.";
const staffWorkingHoursNotFoundMessage = "Расписание сотрудника не сохранено: сотрудник не найден.";
const staffWorkingHoursConflictMessage =
  "Расписание сотрудника не сохранено: есть активная запись за пределами нового расписания.";
const staffWorkingHoursRejectedMessage =
  "Расписание сотрудника не сохранено: проверьте рабочие дни и активные записи.";
const chairWorkingHoursRouteValidationMessage = "Расписание кресла не сохранено: выберите кресло.";
const chairWorkingHoursNotFoundMessage = "Расписание кресла не сохранено: кресло не найдено.";
const chairWorkingHoursConflictMessage =
  "Расписание кресла не сохранено: есть активная запись за пределами нового расписания.";
const chairWorkingHoursRejectedMessage =
  "Расписание кресла не сохранено: проверьте рабочие дни и активные записи.";
const staffProfileRouteValidationMessage = "Карточка сотрудника не сохранена: выберите сотрудника.";
const staffProfileValidationMessage =
  "Карточка сотрудника не сохранена: проверьте ФИО, роль, телефон и почту в допустимом формате.";
const staffProfileEmptyUpdateMessage =
  "Карточка сотрудника не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
const staffProfileNotFoundMessage = "Карточка сотрудника не сохранена: сотрудник не найден в этой клинике.";
const staffProfileRejectedMessage = "Карточка сотрудника не сохранена: проверьте переданные поля.";
const staffDeactivateRouteValidationMessage = "Сотрудник не отключен: выберите сотрудника.";
const staffDeactivateNotFoundMessage = "Сотрудник не отключен: сотрудник не найден в этой клинике.";
const staffDeactivateRejectedMessage = "Сотрудник не отключен: проверьте выбранного сотрудника.";
const chairProfileRouteValidationMessage = "Карточка кресла не сохранена: выберите кресло.";
const chairProfileValidationMessage = "Карточка кресла не сохранена: проверьте название кресла.";
const chairProfileEmptyUpdateMessage =
  "Карточка кресла не сохранена: не переданы поля для изменения. Расписание меняется отдельным адресом.";
const chairProfileNotFoundMessage = "Карточка кресла не сохранена: кресло не найдено в этой клинике.";
const chairProfileRejectedMessage = "Карточка кресла не сохранена: проверьте переданные поля.";
const doctorCommissionRouteValidationMessage = "Ставка врача не сохранена: выберите сотрудника.";
const doctorCommissionValidationMessage =
  "Ставка врача не сохранена: укажите процент от кассы числом от 0 до 100.";
const doctorCommissionNotFoundMessage = "Ставка врача не сохранена: сотрудник не найден в этой клинике.";
const doctorCommissionRejectedMessage = "Ставка врача не сохранена: проверьте выбранного сотрудника и процент.";
const chairDeactivateRouteValidationMessage = "Кресло не отключено: выберите кресло.";
const chairDeactivateNotFoundMessage = "Кресло не отключено: кресло не найдено в этой клинике.";
const chairDeactivateRejectedMessage = "Кресло не отключено: проверьте выбранное кресло.";

function parseSettingsPayload<T>(schema: SettingsPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    console.error("SMOKE TEST DEBUG: parseSettingsPayload failed validation:", parsed.error?.format());
    return null;
  }
  return parsed.data;
}

function settingsDomainMessage(error: unknown): string {
  if (!(error instanceof Error)) return "";
  return repairMojibakeDeep(error.message);
}

function hasActiveScheduleConflict(message: string): boolean {
  return message.includes("активная запись") || message.includes("активные записи");
}

// Экспортируется ради теста settings.test.ts: он импортирует эту функцию, а она
// была объявлена без export, и весь файл теста падал при загрузке с
// «does not provide an export named 'clinicProfileMutationRejection'».
export function clinicProfileMutationRejection(reply: FastifyReply, error: unknown) {
  const message = settingsDomainMessage(error);
  if (message.includes("часовой пояс")) {
    return reply.code(409).send({
      error: "ClinicProfileMutationRejected",
      reason: "clinic_time_zone_invalid",
      message: clinicProfileTimezoneMessage
    });
  }
  if (hasActiveScheduleConflict(message)) {
    return reply.code(409).send({
      error: "ClinicProfileMutationRejected",
      reason: "active_schedule_conflict",
      message: clinicProfileScheduleConflictMessage
    });
  }
  return reply.code(409).send({
    error: "ClinicProfileMutationRejected",
    reason: "clinic_profile_rejected",
    message: clinicProfileMutationRejectedMessage
  });
}

function staffWorkingHoursRejection(reply: FastifyReply, error: unknown) {
  const message = settingsDomainMessage(error);
  if (message === "Сотрудник не найден.") {
    return reply.code(404).send({
      error: "StaffScheduleNotFound",
      reason: "staff_not_found",
      message: staffWorkingHoursNotFoundMessage
    });
  }
  if (hasActiveScheduleConflict(message)) {
    return reply.code(409).send({
      error: "StaffScheduleRejected",
      reason: "active_schedule_conflict",
      message: staffWorkingHoursConflictMessage
    });
  }
  return reply.code(409).send({
    error: "StaffScheduleRejected",
    reason: "schedule_rejected",
    message: staffWorkingHoursRejectedMessage
  });
}

function chairWorkingHoursRejection(reply: FastifyReply, error: unknown) {
  const message = settingsDomainMessage(error);
  if (message === "Кресло не найдено.") {
    return reply.code(404).send({
      error: "ChairScheduleNotFound",
      reason: "chair_not_found",
      message: chairWorkingHoursNotFoundMessage
    });
  }
  if (hasActiveScheduleConflict(message)) {
    return reply.code(409).send({
      error: "ChairScheduleRejected",
      reason: "active_schedule_conflict",
      message: chairWorkingHoursConflictMessage
    });
  }
  return reply.code(409).send({
    error: "ChairScheduleRejected",
    reason: "schedule_rejected",
    message: chairWorkingHoursRejectedMessage
  });
}

/**
 * Отказы для карточек сотрудника и кресла. Отдельные тексты на правку и на
 * отключение: оператору важно видеть, какое именно действие не прошло, а не
 * общее «ошибка сервера».
 */
function staffMutationRejection(
  reply: FastifyReply,
  error: unknown,
  notFoundMessage: string,
  rejectedMessage: string,
  errorCode: string
) {
  const message = settingsDomainMessage(error);
  if (message === "Сотрудник не найден.") {
    return reply.code(404).send({
      error: `${errorCode}NotFound`,
      reason: "staff_not_found",
      message: notFoundMessage
    });
  }
  return reply.code(409).send({
    error: `${errorCode}Rejected`,
    reason: "staff_mutation_rejected",
    message: rejectedMessage
  });
}

function chairMutationRejection(
  reply: FastifyReply,
  error: unknown,
  notFoundMessage: string,
  rejectedMessage: string,
  errorCode: string
) {
  const message = settingsDomainMessage(error);
  if (message === "Кресло не найдено.") {
    return reply.code(404).send({
      error: `${errorCode}NotFound`,
      reason: "chair_not_found",
      message: notFoundMessage
    });
  }
  return reply.code(409).send({
    error: `${errorCode}Rejected`,
    reason: "chair_mutation_rejected",
    message: rejectedMessage
  });
}

function configuredSettingsAdminSecret(): string | null {
  return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

function settingsUnguardedMutationsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS === "1";
}

async function requireSettingsAccess(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const adminSecret = configuredSettingsAdminSecret();
  let hasAccess = false;
  
  if (!adminSecret) {
    if (settingsUnguardedMutationsAllowed()) hasAccess = true;
    else {
      reply.code(503).send({
        error: "SettingsAdminSecretMissing",
        message: "На сервере не задан секрет администратора клиники для изменения настроек клиники."
      });
      return null;
    }
  } else {
    const providedSecret = request.headers[denteAdminSecretHeader];
    const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
    if (timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
      hasAccess = true;
    } else {
      reply.code(403).send({
        error: "SettingsAdminSecretRequired",
        message: "Для изменения настроек клиники нужен действующий секрет администратора клиники."
      });
      return null;
    }
  }

  // Организация запроса: сначала подписанный токен. Раньше здесь всегда бралась
  // ПЕРВАЯ строка таблицы organizations — при нескольких клиниках в одной базе
  // это означало, что настройки одной клиники правились от имени другой.
  const tokenOrganizationId = getRequestIdentity(request).organizationId;
  if (tokenOrganizationId) return tokenOrganizationId;

  if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
    return "00000000-0000-0000-0000-000000000001";
  }

  // Фолбэк для однокликовой установки MVP: единственная организация в базе.
  const orgs = await db.select({ id: schema.organizations.id }).from(schema.organizations).limit(2);
  if (orgs.length > 1) {
    reply.code(401).send({
      error: "AuthRequired",
      message: "В базе несколько клиник — войдите в кабинет, чтобы изменить настройки."
    });
    return null;
  }
  const org = orgs[0];
  if (!org) {
    reply.code(500).send({ error: "NoOrganizationFound", message: "Не найдена организация в базе данных." });
    return null;
  }
  return org.id;
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/api/settings/clinic", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const settings = await getClinicSettingsFromDb(orgId);
    return clinicSettingsSchema.parse(settings);
  });

  app.get("/api/settings/preferences", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const prefs = await getUiPreferencesFromDb(orgId);
    return { preferences: prefs ? uiPreferencesSchema.parse(prefs) : null };
  });

  app.put("/api/settings/preferences", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const input = parseSettingsPayload(uiPreferencesInputSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: uiPreferencesValidationMessage });
    }
    const savedAt = input.savedAt ?? new Date().toISOString();
    const updated = { ...input, version: 1 as const, savedAt };
    await saveUiPreferencesInDb(orgId, updated);
    return uiPreferencesSchema.parse(updated);
  });

  app.post("/api/settings/clinic/mode", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const input = parseSettingsPayload(updateClinicModeSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: clinicModeValidationMessage });
    }
    await updateClinicModeInDb(orgId, input.mode);
    const settings = await getClinicSettingsFromDb(orgId);
    return clinicSettingsSchema.parse(settings);
  });

  app.put("/api/settings/clinic/profile", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const input = parseSettingsPayload(updateClinicProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicProfileValidationFailed", message: clinicProfileValidationMessage });
    }
    try {
      await updateClinicProfileInDb(orgId, input);
      const settings = await getClinicSettingsFromDb(orgId);
      return clinicSettingsSchema.parse(settings);
    } catch (error) {
      return clinicProfileMutationRejection(reply, error);
    }
  });

  app.post("/api/settings/staff", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const input = parseSettingsPayload(createStaffMemberSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: staffCreateValidationMessage });
    }
    await createStaffMemberInDb(orgId, input);
    const settings = await getClinicSettingsFromDb(orgId);
    // Find the newly created staff to return (for simplicity, we just return the full staff member object from settings list)
    // Actually, createStaffMemberSchema expects the created object, but frontend might just refetch. We'll return the last one matching.
    const created = settings.staff.find(s => s.fullName === input.fullName);
    return reply.code(201).send(staffMemberSchema.parse(created));
  });

  app.post("/api/settings/staff/:staffId/credentials", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) {
      return reply.code(400).send({ error: "SettingsRouteValidationError", message: "ID сотрудника обязателен." });
    }
    
    const { email, password, pinCode } = (request.body as { email?: string; password?: string; pinCode?: string }) ?? {};
    if (!email && !password && !pinCode) {
      return reply.code(400).send({ error: "SettingsValidationError", message: "Не переданы данные для обновления." });
    }

    const updates: { email?: string; passwordHash?: string; pinCodeHash?: string } = {};
    if (email) updates.email = email.toLowerCase().trim();
    if (password) updates.passwordHash = hashCredential(password);
    if (pinCode) updates.pinCodeHash = hashCredential(pinCode);

    try {
      await updateStaffCredentialsInDb(orgId, params.staffId, updates);
      return reply.code(200).send({ ok: true });
    } catch (err: unknown) {
      return reply.code(500).send({ error: "InternalError", message: "Не удалось обновить доступы." });
    }
  });

  app.put("/api/settings/staff/:staffId/working-hours", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: staffWorkingHoursRouteValidationMessage
      });
    }
    const input = parseSettingsPayload(updateStaffWorkingHoursSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: staffWorkingHoursValidationMessage });
    }
    try {
      await updateStaffWorkingHoursInDb(orgId, params.staffId, input);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.staff.find(s => s.id === params.staffId);
      if (!updated) throw new Error("Сотрудник не найден.");
      return staffMemberSchema.parse(updated);
    } catch (error) {
      return staffWorkingHoursRejection(reply, error);
    }
  });

  /**
   * Правка карточки сотрудника. Интерфейс зовет этот адрес из
   * updateStaffMember (apps/web/src/useAppLogic.tsx): метод PUT, тело —
   * частичный набор полей карточки. Маршрута не было вовсе, на сервере жили
   * только вложенные /credentials и /working-hours, поэтому правка сотрудника
   * из интерфейса отвечала 404.
   *
   * Организация берется из подписанного токена через requireSettingsAccess, а
   * не из тела запроса, и каждый запрос к базе фильтруется по ней.
   */
  app.put("/api/settings/staff/:staffId", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: staffProfileRouteValidationMessage
      });
    }
    const input = parseSettingsPayload(updateStaffMemberProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: staffProfileValidationMessage });
    }
    // Пустое тело и тело из одних неизвестных полей неотличимы после разбора:
    // схема отбрасывает лишние ключи. Молча отвечать 200 на запрос, который
    // ничего не меняет, нельзя — оператор решит, что правка сохранена.
    if (Object.keys(input).length === 0) {
      return reply.code(400).send({ error: "SettingsValidationError", message: staffProfileEmptyUpdateMessage });
    }
    try {
      await updateStaffMemberProfileInDb(orgId, params.staffId, input);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.staff.find(s => s.id === params.staffId);
      if (!updated) throw new Error("Сотрудник не найден.");
      return staffMemberSchema.parse(updated);
    } catch (error) {
      return staffMutationRejection(
        reply,
        error,
        staffProfileNotFoundMessage,
        staffProfileRejectedMessage,
        "StaffProfile"
      );
    }
  });

  /**
   * Отключение сотрудника. Это НЕ физическое удаление: на users.id ссылаются
   * приемы (doctor_user_id, assistant_user_id) и медицинские записи, поэтому
   * строка сохраняется, а признак users.is_active становится false. Сотрудник
   * возвращается в ответе с active: false, история лечения остается с автором.
   */
  app.delete("/api/settings/staff/:staffId", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: staffDeactivateRouteValidationMessage
      });
    }
    try {
      await deactivateStaffMemberInDb(orgId, params.staffId);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.staff.find(s => s.id === params.staffId);
      if (!updated) throw new Error("Сотрудник не найден.");
      return staffMemberSchema.parse(updated);
    } catch (error) {
      return staffMutationRejection(
        reply,
        error,
        staffDeactivateNotFoundMessage,
        staffDeactivateRejectedMessage,
        "StaffDeactivate"
      );
    }
  });

  /**
   * Действующие ставки врачей. Отдельный адрес, а не поле в карточке
   * сотрудника: ставка лежит в другой таблице (doctor_commissions), у неё своя
   * дата начала действия и своя история отключённых строк, и втискивать её в
   * staffMemberSchema значило бы показывать процент без даты, с которой он
   * действует.
   */
  app.get("/api/settings/staff/commissions", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const commissions = await listDoctorCommissionRatesInDb(orgId);
    return { commissions };
  });

  /**
   * Назначение ставки врачу — процента от кассы, по которому клиника платит за
   * лечение.
   *
   * До этого маршрута ставку не задавал ни один достижимый экран: писали её
   * только недостижимый мастер первого запуска и routes/diary.ts, который при
   * первом закрытии приёма молча вставляет 30 %. Экран выплат печатал «не
   * задана», владелец шёл исправлять и не находил куда — и клиника платила по
   * проценту, которого никто не согласовывал.
   */
  app.put("/api/settings/staff/:staffId/commission", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: doctorCommissionRouteValidationMessage
      });
    }
    const input = parseSettingsPayload(updateDoctorCommissionSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: doctorCommissionValidationMessage });
    }
    try {
      const saved = await setDoctorCommissionRateInDb(orgId, params.staffId, input.commissionPct);
      return saved;
    } catch (error) {
      // Отключённое хранение — это не ошибка оператора: процент вводить некуда,
      // потому что ставки живут только в базе. Отвечать 409 «проверьте поля»
      // значило бы послать владельца искать опечатку там, где её нет.
      const message = settingsDomainMessage(error);
      if (message.includes("DENTAL_STATE_PERSISTENCE")) {
        return reply.code(503).send({
          error: "DoctorCommissionStorageUnavailable",
          reason: "state_persistence_off",
          message
        });
      }
      // Причина уходит в журнал сервера целиком: наружу идёт текст для
      // оператора, но без записи здесь отказ по ставке был бы неотличим от
      // опечатки в проценте, и разбирать его было бы нечем.
      console.error("[настройки] ставка врача не сохранена:", error);
      return staffMutationRejection(
        reply,
        error,
        doctorCommissionNotFoundMessage,
        doctorCommissionRejectedMessage,
        "DoctorCommission"
      );
    }
  });

  app.post("/api/settings/chairs", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const input = parseSettingsPayload(createChairSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: chairCreateValidationMessage });
    }
    await createChairInDb(orgId, input);
    const settings = await getClinicSettingsFromDb(orgId);
    const created = settings.chairs.find(c => c.name === input.name);
    return reply.code(201).send(chairSchema.parse(created));
  });

  app.put("/api/settings/chairs/:chairId/working-hours", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { chairId?: string };
    if (!params.chairId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: chairWorkingHoursRouteValidationMessage
      });
    }
    const input = parseSettingsPayload(updateChairWorkingHoursSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: chairWorkingHoursValidationMessage });
    }
    try {
      await updateChairWorkingHoursInDb(orgId, params.chairId, input);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.chairs.find(c => c.id === params.chairId);
      if (!updated) throw new Error("Кресло не найдено.");
      return chairSchema.parse(updated);
    } catch (error) {
      return chairWorkingHoursRejection(reply, error);
    }
  });

  /**
   * Правка кресла. Принимаются только название и признак активности: больше
   * ничего из карточки кресла таблица chairs не хранит, а кабинет,
   * специализация и оснащение читаются из базы как пустые значения. Принять их
   * значило бы ответить 200 и молча потерять ввод оператора.
   */
  app.put("/api/settings/chairs/:chairId", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { chairId?: string };
    if (!params.chairId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: chairProfileRouteValidationMessage
      });
    }
    const input = parseSettingsPayload(updateChairProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: chairProfileValidationMessage });
    }
    if (Object.keys(input).length === 0) {
      return reply.code(400).send({ error: "SettingsValidationError", message: chairProfileEmptyUpdateMessage });
    }
    try {
      await updateChairProfileInDb(orgId, params.chairId, input);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.chairs.find(c => c.id === params.chairId);
      if (!updated) throw new Error("Кресло не найдено.");
      return chairSchema.parse(updated);
    } catch (error) {
      return chairMutationRejection(
        reply,
        error,
        chairProfileNotFoundMessage,
        chairProfileRejectedMessage,
        "ChairProfile"
      );
    }
  });

  /**
   * Отключение кресла. Интерфейс зовет этот адрес из deleteChair
   * (apps/web/src/useAppLogic.tsx): метод DELETE, тела нет. Физического
   * удаления не происходит — на chairs.id ссылаются приемы
   * (appointments.chair_id), поэтому строка сохраняется, а chairs.is_active
   * становится false. Уже назначенные приемы не теряют привязку к кабинету.
   */
  app.delete("/api/settings/chairs/:chairId", async (request, reply) => {
    const orgId = await requireSettingsAccess(request, reply);
    if (!orgId) return;
    const params = request.params as { chairId?: string };
    if (!params.chairId) {
      return reply.code(400).send({
        error: "SettingsRouteValidationError",
        message: chairDeactivateRouteValidationMessage
      });
    }
    try {
      await deactivateChairInDb(orgId, params.chairId);
      const settings = await getClinicSettingsFromDb(orgId);
      const updated = settings.chairs.find(c => c.id === params.chairId);
      if (!updated) throw new Error("Кресло не найдено.");
      return chairSchema.parse(updated);
    } catch (error) {
      return chairMutationRejection(
        reply,
        error,
        chairDeactivateNotFoundMessage,
        chairDeactivateRejectedMessage,
        "ChairDeactivate"
      );
    }
  });

  app.post("/api/settings/reset-demo", async (request, reply) => {
    return { success: true, message: "Демонстрационный режим больше не поддерживается (используется Postgres)." };
  });

  app.post("/api/settings/reset-zero", async (request, reply) => {
    return { success: true, message: "Очистка базы больше не поддерживается (используется Postgres)." };
  });
}
