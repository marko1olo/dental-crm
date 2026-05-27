import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createAppointmentSchema, dashboardSchema, updateAppointmentSchema } from "@dental/shared";
import { buildDashboard, createAppointment, updateAppointment } from "../sampleData.js";

const denteAdminSecretHeader = "x-dente-admin-secret";

function configuredScheduleAdminSecret(): string | null {
  return (
    process.env.DENTE_SCHEDULE_ADMIN_SECRET?.trim() ||
    process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() ||
    process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() ||
    null
  );
}

function scheduleUnguardedMutationsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS === "1";
}

function timingSafeSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function requireScheduleMutationAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const adminSecret = configuredScheduleAdminSecret();
  if (!adminSecret) {
    if (scheduleUnguardedMutationsAllowed()) return true;
    reply.code(503).send({
      error: "ScheduleAdminSecretMissing",
      message: "DENTE_SCHEDULE_ADMIN_SECRET, DENTE_SETTINGS_ADMIN_SECRET или DENTE_TELEGRAM_ADMIN_SECRET обязателен для изменения расписания."
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
    message: "Для изменения расписания нужен действующий x-dente-admin-secret."
  });
  return false;
}

export async function registerScheduleRoutes(app: FastifyInstance) {
  app.post("/api/appointments", async (request, reply) => {
    if (!(await requireScheduleMutationAccess(request, reply))) return;
    const input = createAppointmentSchema.parse(request.body);
    try {
      createAppointment(input);
      return reply.code(201).send(dashboardSchema.parse(buildDashboard()));
    } catch (error) {
      return reply.code(409).send({
        code: "AppointmentCreateRejected",
        message: error instanceof Error ? error.message : "Запись не создана"
      });
    }
  });

  async function updateAppointmentHandler(request: FastifyRequest<{ Params: { appointmentId?: string } }>, reply: FastifyReply) {
    if (!(await requireScheduleMutationAccess(request, reply))) return;
    const params = request.params as { appointmentId?: string };
    if (!params.appointmentId) return reply.code(400).send({ code: "MissingAppointmentId", message: "Не указан appointmentId записи" });
    const input = updateAppointmentSchema.parse(request.body);
    try {
      updateAppointment(params.appointmentId, input);
      return dashboardSchema.parse(buildDashboard());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Запись не обновлена";
      return reply.code(message === "Запись не найдена" ? 404 : 409).send({
        code: "AppointmentUpdateRejected",
        message: error instanceof Error ? error.message : "Запись не обновлена"
      });
    }
  }

  app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
  app.put("/api/schedule/appointments/:appointmentId", updateAppointmentHandler);
}
