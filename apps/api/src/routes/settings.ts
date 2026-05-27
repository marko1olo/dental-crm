import { timingSafeEqual } from "node:crypto";
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
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import { repairMojibakeDeep } from "../text/repairMojibake.js";

const denteAdminSecretHeader = "x-dente-admin-secret";

function configuredSettingsAdminSecret(): string | null {
  return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() || null;
}

function settingsUnguardedMutationsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS === "1";
}

function timingSafeSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function requireSettingsMutationAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const adminSecret = configuredSettingsAdminSecret();
  if (!adminSecret) {
    if (settingsUnguardedMutationsAllowed()) return true;
    reply.code(503).send({
      error: "SettingsAdminSecretMissing",
      message: "DENTE_SETTINGS_ADMIN_SECRET или DENTE_TELEGRAM_ADMIN_SECRET обязателен для изменения настроек клиники."
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
    message: "Для изменения настроек клиники нужен действующий x-dente-admin-secret."
  });
  return false;
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/api/settings/clinic", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinic settings"))) return;
    return clinicSettingsSchema.parse(buildClinicSettings());
  });

  app.get("/api/settings/preferences", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "ui preferences"))) return;
    return {
      preferences: getUiPreferences() ? uiPreferencesSchema.parse(getUiPreferences()) : null
    };
  });

  app.put("/api/settings/preferences", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "ui preferences"))) return;
    const input = uiPreferencesInputSchema.parse(request.body);
    return uiPreferencesSchema.parse(saveUiPreferences(input));
  });

  app.post("/api/settings/clinic/mode", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const input = updateClinicModeSchema.parse(request.body);
    return clinicSettingsSchema.parse(updateClinicMode(input.mode));
  });

  app.put("/api/settings/clinic/profile", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const parsed = updateClinicProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "ClinicProfileValidationFailed",
        message: repairMojibakeDeep(parsed.error.issues.map((issue) => issue.message).join("; "))
      });
    }
    const input = parsed.data;
    try {
      return clinicSettingsSchema.parse(updateClinicProfile(input));
    } catch (error) {
      return reply
        .code(409)
        .send({ error: repairMojibakeDeep(error instanceof Error ? error.message : "Профиль клиники не сохранен") });
    }
  });

  app.post("/api/settings/staff", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const input = createStaffMemberSchema.parse(request.body);
    const member = createStaffMember(input);
    return reply.code(201).send(staffMemberSchema.parse(member));
  });

  app.put("/api/settings/staff/:staffId/working-hours", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const params = request.params as { staffId?: string };
    if (!params.staffId) return reply.code(400).send({ error: "Не указан staffId сотрудника" });
    const input = updateStaffWorkingHoursSchema.parse(request.body);
    try {
      return staffMemberSchema.parse(repairMojibakeDeep(updateStaffWorkingHours(params.staffId, input)));
    } catch (error) {
      const message = repairMojibakeDeep(error instanceof Error ? error.message : "Расписание сотрудника не сохранено.");
      return reply.code(message === "Сотрудник не найден." ? 404 : 409).send({ error: message });
    }
  });

  app.post("/api/settings/chairs", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const input = createChairSchema.parse(request.body);
    const chair = createChair(input);
    return reply.code(201).send(chairSchema.parse(chair));
  });

  app.put("/api/settings/chairs/:chairId/working-hours", async (request, reply) => {
    if (!(await requireSettingsMutationAccess(request, reply))) return;
    const params = request.params as { chairId?: string };
    if (!params.chairId) return reply.code(400).send({ error: "Не указан chairId кресла" });
    const input = updateChairWorkingHoursSchema.parse(request.body);
    try {
      return chairSchema.parse(repairMojibakeDeep(updateChairWorkingHours(params.chairId, input)));
    } catch (error) {
      const message = repairMojibakeDeep(error instanceof Error ? error.message : "Расписание кресла не сохранено.");
      return reply.code(message === "Кресло не найдено." ? 404 : 409).send({ error: message });
    }
  });
}
