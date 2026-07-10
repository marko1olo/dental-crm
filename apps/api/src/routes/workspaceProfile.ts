/**
 * Workspace Profile Routes
 * GET  /api/workspace/profile        — load feature flags for current org
 * POST /api/workspace/profile        — save feature flags (individual toggles)
 * POST /api/workspace/preset/:name   — apply a named preset + seed demo data
 * POST /api/workspace/onboarding/complete — mark onboarding as done
 */
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { resolveOrganizationId } from "../accessGuard.js";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface WorkspaceFeatureFlags {
  hasAssistants: boolean;
  hasMultipleChairs: boolean;
  hasDentalLab: boolean;
  hasInsuranceCoPay: boolean;
  hasInstallments: boolean;
  hasPediatricMode: boolean;
  isOmniRole: boolean;
  workspacePreset: string;
  onboardingCompleted: boolean;
}

export type PresetName =
  | "solo_therapist"
  | "prosthodontist"
  | "pediatric"
  | "orthodontic"
  | "surgery_center"
  | "implant_center"
  | "family_clinic"
  | "multi_specialty"
  | "enterprise"
  | "custom";

// ──────────────────────────────────────────────────────────────────────────────
// Preset definitions
// ──────────────────────────────────────────────────────────────────────────────
export const WORKSPACE_PRESETS: Record<Exclude<PresetName, "custom">, WorkspaceFeatureFlags> = {
  solo_therapist: {
    hasAssistants: false,
    hasMultipleChairs: false,
    hasDentalLab: false,
    hasInsuranceCoPay: false,
    hasInstallments: true,
    hasPediatricMode: false,
    isOmniRole: true,
    workspacePreset: "solo_therapist",
    onboardingCompleted: true,
  },
  prosthodontist: {
    hasAssistants: true,
    hasMultipleChairs: false,
    hasDentalLab: true,
    hasInsuranceCoPay: false,
    hasInstallments: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "prosthodontist",
    onboardingCompleted: true,
  },
  pediatric: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: false,
    hasInsuranceCoPay: true,
    hasInstallments: false,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "pediatric",
    onboardingCompleted: true,
  },
  orthodontic: {
    hasAssistants: true,
    hasMultipleChairs: false,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "orthodontic",
    onboardingCompleted: true,
  },
  surgery_center: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: false,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "surgery_center",
    onboardingCompleted: true,
  },
  implant_center: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "implant_center",
    onboardingCompleted: true,
  },
  family_clinic: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "family_clinic",
    onboardingCompleted: true,
  },
  multi_specialty: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "multi_specialty",
    onboardingCompleted: true,
  },
  enterprise: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "enterprise",
    onboardingCompleted: true,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Demo seeding data per preset (uses actual schema field names: birthDate)
// ──────────────────────────────────────────────────────────────────────────────
async function seedDemoDataForPreset(organizationId: string, preset: PresetName, numberOfChairs?: number) {
  // Safety: only seed if no patients exist yet for this org
  const existing = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.organizationId, organizationId))
    .limit(1);
  if (existing.length > 0) return; // don't double-seed

  const existingChairs = await db.select({ id: schema.clinicChairs.id }).from(schema.clinicChairs).where(eq(schema.clinicChairs.organizationId, organizationId)).limit(1);
  if (existingChairs.length === 0) {
    const flags = WORKSPACE_PRESETS[preset as Exclude<PresetName, "custom">];
    const chairCount = numberOfChairs ? numberOfChairs : (flags?.hasMultipleChairs ? 4 : 1);
    const [clinic] = await db.select({ id: schema.clinics.id }).from(schema.clinics).where(eq(schema.clinics.organizationId, organizationId)).limit(1);
    if (clinic) {
      for (let i = 1; i <= chairCount; i++) {
        await db.insert(schema.clinicChairs).values({
          organizationId,
          clinicId: clinic.id,
          name: chairCount === 1 ? "Главный кабинет" : `Кресло ${i}`,
          status: "active"
        });
      }
    }
  }

  if (preset === "solo_therapist") {
    const patientDefs = [
      { fullName: "Анна Петровна Соколова", birthDate: "1985-03-12", phone: "+79101234567" },
      { fullName: "Игорь Васильевич Ким", birthDate: "1978-07-22", phone: "+79201112233" },
      { fullName: "Ольга Сергеевна Шаль", birthDate: "1992-11-05", phone: "+79305556677" },
    ];
    for (const p of patientDefs) {
      const [patient] = await db.insert(schema.patients).values({
        organizationId,
        fullName: p.fullName,
        birthDate: p.birthDate,
        phone: p.phone,
        isSynced: false,
        version: 1,
      }).returning({ id: schema.patients.id });
      if (!patient) continue;
      // Add a visit with caries treatment plan
      await db.insert(schema.visits).values({
        organizationId,
        patientId: patient.id,
        status: "signed",
        complaint: "Боль в нижнем правом зубе на холодное",
        diagnosis: "Средний кариес 46 зуба",
        treatmentPlan: "Анестезия, препарирование, пломба светового отверждения (композит).",
        doctorSummary: "Проведено лечение среднего кариеса 46 зуба по протоколу.",
      });
      // Add an appointment
      await db.insert(schema.appointments).values({
        organizationId,
        patientId: patient.id,
        status: "planned",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 86400000 + 3600000),
        reason: "Лечение кариеса 47 зуба",
      });
    }
  }

  if (preset === "prosthodontist") {
    const patientDefs = [
      { fullName: "Виктор Михайлович Азаров", birthDate: "1960-05-18", phone: "+79401234567" },
      { fullName: "Наталья Ивановна Громова", birthDate: "1955-09-30", phone: "+79509876543" },
    ];
    for (const p of patientDefs) {
      const [patient] = await db.insert(schema.patients).values({
        organizationId,
        fullName: p.fullName,
        birthDate: p.birthDate,
        phone: p.phone,
        isSynced: false,
        version: 1,
      }).returning({ id: schema.patients.id });
      if (!patient) continue;
      // Add a visit with prosthetic plan
      const [visit] = await db.insert(schema.visits).values({
        organizationId,
        patientId: patient.id,
        status: "draft",
        complaint: "Отсутствует зуб, эстетический дефект",
        diagnosis: "Частичная вторичная адентия 24 зуба",
        treatmentPlan: "Снятие слепков. Изготовление коронки из диоксида циркония на имплантате 24.",
      }).returning({ id: schema.visits.id });
      
      // Add clinical tasks for lab orders
      await db.insert(schema.clinicalTasks).values({
        organizationId,
        patientId: patient.id,
        taskType: "dental_lab_order",
        status: "in_progress",
        title: "Изготовление циркониевой коронки",
        description: "Цвет A2, транслуцентный край. Отправлено в фрезеровочный центр.",
        dueAt: new Date(Date.now() + 86400000 * 5),
      });

      // Add an appointment
      await db.insert(schema.appointments).values({
        organizationId,
        patientId: patient.id,
        status: "planned",
        startsAt: new Date(Date.now() + 86400000 * 2),
        endsAt: new Date(Date.now() + 86400000 * 2 + 3600000),
        reason: "Примерка каркаса",
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────────────────────────────────────
export async function workspaceProfileRoutes(fastify: FastifyInstance) {

  // GET /api/workspace/profile
  fastify.get("/api/workspace/profile", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const [org] = await db
      .select({
        hasAssistants: schema.organizations.hasAssistants,
        hasMultipleChairs: schema.organizations.hasMultipleChairs,
        hasDentalLab: schema.organizations.hasDentalLab,
        hasInsuranceCoPay: schema.organizations.hasInsuranceCoPay,
        hasInstallments: schema.organizations.hasInstallments,
        workspacePreset: schema.organizations.workspacePreset,
        onboardingCompleted: schema.organizations.onboardingCompleted,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))
      .limit(1);

    if (!org) return reply.code(404).send({ error: "Organization not found" });
    return reply.send(org);
  });

  // POST /api/workspace/profile — save arbitrary flags
  fastify.post<{ Body: Partial<WorkspaceFeatureFlags> }>("/api/workspace/profile", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const { hasAssistants, hasMultipleChairs, hasDentalLab, hasInsuranceCoPay, hasInstallments, hasPediatricMode, isOmniRole } = req.body ?? {};
    await db
      .update(schema.organizations)
      .set({
        ...(hasAssistants !== undefined && { hasAssistants }),
        ...(hasMultipleChairs !== undefined && { hasMultipleChairs }),
        ...(hasDentalLab !== undefined && { hasDentalLab }),
        ...(hasInsuranceCoPay !== undefined && { hasInsuranceCoPay }),
        ...(hasInstallments !== undefined && { hasInstallments }),
        ...(hasPediatricMode !== undefined && { hasPediatricMode }),
        ...(isOmniRole !== undefined && { isOmniRole }),
        workspacePreset: "custom",
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, organizationId));

    return reply.send({ ok: true });
  });

  // POST /api/workspace/preset/:name — apply preset + seed
  fastify.post<{ Params: { name: string }, Body?: { numberOfChairs?: number, hasPediatricMode?: boolean } }>("/api/workspace/preset/:name", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const presetName = req.params.name as PresetName;
    const flags = WORKSPACE_PRESETS[presetName as Exclude<PresetName, "custom">];
    if (!flags) return reply.code(400).send({ error: `Unknown preset: ${presetName}` });

    const finalFlags = { ...flags };
    if (req.body?.hasPediatricMode !== undefined) {
        finalFlags.hasPediatricMode = req.body.hasPediatricMode;
    }

    await db
      .update(schema.organizations)
      .set({ ...finalFlags, updatedAt: new Date() })
      .where(eq(schema.organizations.id, organizationId));

    // Async seeding — don't block response
    seedDemoDataForPreset(organizationId, presetName, req.body?.numberOfChairs).catch((e) =>
      console.error("[workspace preset] seeding error:", e)
    );

    return reply.send({ ok: true, preset: presetName, flags });
  });

  // POST /api/workspace/onboarding/complete
  fastify.post("/api/workspace/onboarding/complete", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    await db
      .update(schema.organizations)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(schema.organizations.id, organizationId));

    return reply.send({ ok: true });
  });
}
