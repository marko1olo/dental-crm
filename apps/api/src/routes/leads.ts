import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { crmLeads, appointments, patients, users, clinicChairs } from "../db/schema.js";
import { requireResolvedOrganizationId, requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { createAppointmentInDb } from "../db/appointmentsQuery.js";
import { wsBroker } from "../services/websocketBroker.js";

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  source: z.string().optional(),
  expectedRevenue: z.string().optional()
});

const convertLeadSchema = z.object({
  appointmentStart: z.string().datetime(),
  appointmentEnd: z.string().datetime(),
  chairId: z.string().uuid(),
  doctorId: z.string().uuid(),
  organizationId: z.string().uuid().optional()
});

export async function registerLeadsRoutes(app: FastifyInstance) {
  app.get("/api/leads", async (req, reply) => {
    const organizationId = await requireResolvedOrganizationId(req, reply, "leads read");
    if (!organizationId) return;

    const leads = await db.select().from(crmLeads).where(eq(crmLeads.organizationId, organizationId));
    return leads;
  });

  app.post("/api/leads", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "lead create");
    if (!organizationId) return;

    const data = leadSchema.parse(req.body);
    const [lead] = await db.insert(crmLeads).values({ ...data, organizationId }).returning() as any;
    wsBroker.broadcastToOrganization(organizationId, { type: "LEAD_CREATED", payload: lead });
    return lead;
  });

  app.patch("/api/leads/:id/status", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "lead status update");
    if (!organizationId) return;

    const { id } = req.params as { id: string };
    const { status } = z.object({ status: z.enum(["new", "contacted", "consult_booked", "no_answer", "trash"]) }).parse(req.body);

    const [lead] = await db
      .update(crmLeads)
      .set({ status })
      .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
      .returning();
    if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
    wsBroker.broadcastToOrganization(organizationId, { type: "LEAD_UPDATED", payload: lead });
    return lead;
  });

  app.put("/api/leads/:id", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "lead update");
    if (!organizationId) return;

    const { id } = req.params as { id: string };
    const data = leadSchema.parse(req.body);

    const [lead] = await db
      .update(crmLeads)
      .set(data)
      .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
      .returning();
    if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
    wsBroker.broadcastToOrganization(organizationId, { type: "LEAD_UPDATED", payload: lead });
    return lead;
  });

  app.delete("/api/leads/:id", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "lead delete");
    if (!organizationId) return;

    const { id } = req.params as { id: string };

    const [lead] = await db
      .delete(crmLeads)
      .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
      .returning();
    if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
    wsBroker.broadcastToOrganization(organizationId, { type: "LEAD_DELETED", payload: { id } });
    return { success: true };
  });

  app.post("/api/leads/:id/convert", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "lead convert");
    if (!organizationId) return;

    const { id } = req.params as { id: string };
    const payload = convertLeadSchema.parse(req.body);

    const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId))).limit(1);
    if (!lead) return reply.status(404).send({ error: "Lead not found" });

    const [doctor] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, payload.doctorId), eq(users.organizationId, organizationId), eq(users.isActive, true))).limit(1);
    if (!doctor) return reply.code(400).send({ error: "DoctorNotFound" });
    const [chair] = await db.select({ id: clinicChairs.id }).from(clinicChairs).where(and(eq(clinicChairs.id, payload.chairId), eq(clinicChairs.organizationId, organizationId))).limit(1);
    if (!chair) return reply.code(400).send({ error: "ChairNotFound" });

    // Transaction for Lead conversion
    const result = await db.transaction(async (tx) => {
      // 1. Create Patient from Lead
      const resultPatient = await tx.insert(patients).values({
        organizationId,
        fullName: lead.name,
        phone: lead.phone,
        status: "active"
      }).returning() as any;
      const patient = resultPatient[0];
      if (!patient) throw new Error("PatientCreateFailed");

      // 2. Create Appointment via protected business logic
      const appointment = await createAppointmentInDb(organizationId, {
        patientId: patient.id,
        doctorUserId: payload.doctorId,
        chairId: payload.chairId,
        startsAt: payload.appointmentStart,
        endsAt: payload.appointmentEnd,
        status: "planned"
      }, tx);

      // 3. Mark lead as booked
      await tx.update(crmLeads).set({ status: "consult_booked" }).where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)));

      return { patient, appointment };
    });

    wsBroker.broadcastToOrganization(organizationId, { type: "LEAD_UPDATED", payload: { id, organizationId, status: "consult_booked" } });
    wsBroker.broadcastToOrganization(organizationId, { type: "APPOINTMENT_CREATED", payload: result.appointment });

    return result;
  });
}
