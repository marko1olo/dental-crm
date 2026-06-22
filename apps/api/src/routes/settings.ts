import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
  updateStaffWorkingHoursSchema
} from "@dental/shared";
import {
  buildClinicSettings,
  createChair,
  createStaffMember,
  getUiPreferences,
  saveUiPreferences,
  updateClinicMode,
  updateClinicProfile,
  updateChairWorkingHours,
  updateStaffWorkingHours
} from "../sampleData.js";
import { repairMojibakeDeep } from "../text/repairMojibake.js";

type SettingsPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
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

function parseSettingsPayload<T>(schema: SettingsPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

function settingsDomainMessage(error: unknown): string {
  if (!(error instanceof Error)) return "";
  return repairMojibakeDeep(error.message);
}

function hasActiveScheduleConflict(message: string): boolean {
  return message.includes("активная запись") || message.includes("активные записи");
}

function clinicProfileMutationRejection(reply: FastifyReply, error: unknown) {
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

function configuredSettingsAdminSecret(): string | null {
  return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

function settingsUnguardedMutationsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS === "1";
}

async function requireSettingsAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const adminSecret = configuredSettingsAdminSecret();
  if (!adminSecret) {
    if (settingsUnguardedMutationsAllowed()) return true;
    reply.code(503).send({
      error: "SettingsAdminSecretMissing",
      message: "На сервере не задан секрет администратора клиники для изменения настроек клиники."
    });
    return false;
  }
  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return true;
  }
  reply.code(403).send({
    error: "SettingsAdminSecretRequired",
    message: "Для изменения настроек клиники нужен действующий секрет администратора клиники."
  });
  return false;
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/api/settings/clinic", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    return clinicSettingsSchema.parse(buildClinicSettings());
  });

  app.get("/api/settings/preferences", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    return {
      preferences: getUiPreferences() ? uiPreferencesSchema.parse(getUiPreferences()) : null
    };
  });

  app.put("/api/settings/preferences", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    const input = parseSettingsPayload(uiPreferencesInputSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: uiPreferencesValidationMessage });
    }
    return uiPreferencesSchema.parse(saveUiPreferences(input));
  });

  app.post("/api/settings/clinic/mode", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    const input = parseSettingsPayload(updateClinicModeSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: clinicModeValidationMessage });
    }
    return clinicSettingsSchema.parse(updateClinicMode(input.mode));
  });

  app.put("/api/settings/clinic/profile", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    const input = parseSettingsPayload(updateClinicProfileSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicProfileValidationFailed", message: clinicProfileValidationMessage });
    }
    try {
      return clinicSettingsSchema.parse(updateClinicProfile(input));
    } catch (error) {
      return clinicProfileMutationRejection(reply, error);
    }
  });

  app.post("/api/settings/staff", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    const input = parseSettingsPayload(createStaffMemberSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: staffCreateValidationMessage });
    }
    const member = createStaffMember(input);
    return reply.code(201).send(staffMemberSchema.parse(member));
  });

  app.put("/api/settings/staff/:staffId/working-hours", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
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
      return staffMemberSchema.parse(repairMojibakeDeep(updateStaffWorkingHours(params.staffId, input)));
    } catch (error) {
      return staffWorkingHoursRejection(reply, error);
    }
  });

  app.post("/api/settings/chairs", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
    const input = parseSettingsPayload(createChairSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "SettingsValidationError", message: chairCreateValidationMessage });
    }
    const chair = createChair(input);
    return reply.code(201).send(chairSchema.parse(chair));
  });

  app.put("/api/settings/chairs/:chairId/working-hours", async (request, reply) => {
    if (!(await requireSettingsAccess(request, reply))) return;
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
      return chairSchema.parse(repairMojibakeDeep(updateChairWorkingHours(params.chairId, input)));
    } catch (error) {
      return chairWorkingHoursRejection(reply, error);
    }
  });
}
