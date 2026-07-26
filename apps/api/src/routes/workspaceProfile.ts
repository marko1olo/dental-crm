/**
 * Workspace Profile Routes
 * GET  /api/workspace/profile        — load feature flags for current org
 * POST /api/workspace/profile        — save feature flags (individual toggles)
 * POST /api/workspace/preset/:name   — apply a named preset + seed demo data
 * POST /api/workspace/onboarding/complete — mark onboarding as done
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

/**
 * БЫЛО: организация бралась из заголовка x-organization-id без всякой проверки,
 * иначе подставлялся жёстко зашитый UUID. Любой анонимный запрос мог прочитать и
 * ПЕРЕЗАПИСАТЬ настройки рабочего пространства любой клиники, а POST /preset/:name
 * ещё и засеивал/затирал демо-данные. Теперь организация только из подписанного
 * токена; при его отсутствии обработчик обязан вернуть 401.
 */
function resolveOrganizationId(req: FastifyRequest): string | null {
  return getRequestIdentity(req).organizationId;
}

// ————————————————————————————————————————————————————————————————————————————
// Types
// ————————————————————————————————————————————————————————————————————————————
export interface WorkspaceFeatureFlags {
  hasAssistants: boolean;
  hasMultipleChairs: boolean;
  hasDentalLab: boolean;
  hasInsuranceCoPay: boolean;
  hasInstallments: boolean;
  hasOrthodontics: boolean;
  hasTasks: boolean;
  hasReclamations: boolean;
  hasPediatricMode: boolean;
  isOmniRole: boolean;
  workspacePreset: string;
  onboardingCompleted: boolean;
  hasPayrollModule: boolean;
  hasMarketingModule: boolean;
  hasAnalyticsModule: boolean;
  hasInventoryModule: boolean;
  aiEnableTreatmentPlan: boolean;
  aiEnableRecommendations: boolean;
  aiEnableDocuments: boolean;
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

// ————————————————————————————————————————————————————————————————————————————
// Preset definitions
// ————————————————————————————————————————————————————————————————————————————
export const WORKSPACE_PRESETS: Record<
  Exclude<PresetName, "custom">,
  WorkspaceFeatureFlags
> = {
  solo_therapist: {
    hasAssistants: false,
    hasMultipleChairs: false,
    hasDentalLab: false,
    hasInsuranceCoPay: false,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: false,
    isOmniRole: true,
    workspacePreset: "solo_therapist",
    onboardingCompleted: true,
    hasPayrollModule: false,
    hasMarketingModule: false,
    hasAnalyticsModule: false,
    hasInventoryModule: false,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  prosthodontist: {
    hasAssistants: true,
    hasMultipleChairs: false,
    hasDentalLab: true,
    hasInsuranceCoPay: false,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "prosthodontist",
    onboardingCompleted: true,
    hasPayrollModule: false,
    hasMarketingModule: false,
    hasAnalyticsModule: false,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  pediatric: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: false,
    hasInsuranceCoPay: true,
    hasInstallments: false,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "pediatric",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  orthodontic: {
    hasAssistants: true,
    hasMultipleChairs: false,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "orthodontic",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: false,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  surgery_center: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: false,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "surgery_center",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  implant_center: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: false,
    isOmniRole: false,
    workspacePreset: "implant_center",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  family_clinic: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "family_clinic",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  multi_specialty: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "multi_specialty",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
  enterprise: {
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
    hasOrthodontics: true,
    hasTasks: true,
    hasReclamations: true,
    hasPediatricMode: true,
    isOmniRole: false,
    workspacePreset: "enterprise",
    onboardingCompleted: true,
    hasPayrollModule: true,
    hasMarketingModule: true,
    hasAnalyticsModule: true,
    hasInventoryModule: true,
    aiEnableTreatmentPlan: true,
    aiEnableRecommendations: true,
    aiEnableDocuments: true,
  },
};

// ————————————————————————————————————————————————————————————————————————————
// Demo seeding data per preset (uses actual schema field names: birthDate)
// ————————————————————————————————————————————————————————————————————————————
async function seedDemoDataForPreset(
  organizationId: string,
  preset: PresetName,
  numberOfChairs?: number,
) {
  // Safety: only seed if no patients exist yet for this org
  const existing = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.organizationId, organizationId))
    .limit(1);
  if (existing.length > 0) return; // don't double-seed

  const existingChairs = await db
    .select({ id: schema.clinicChairs.id })
    .from(schema.clinicChairs)
    .where(eq(schema.clinicChairs.organizationId, organizationId))
    .limit(1);
  if (existingChairs.length === 0) {
    const flags = WORKSPACE_PRESETS[preset as Exclude<PresetName, "custom">];
    const chairCount = numberOfChairs
      ? numberOfChairs
      : flags?.hasMultipleChairs
        ? 4
        : 1;
    const [clinic] = await db
      .select({ id: schema.clinics.id })
      .from(schema.clinics)
      .where(eq(schema.clinics.organizationId, organizationId))
      .limit(1);
    if (clinic) {
      const chairsToInsert = Array.from({ length: chairCount }).map((_, i) => ({
        organizationId,
        clinicId: clinic.id,
        name: chairCount === 1 ? "Главный кабинет" : `Кресло ${i + 1}`,
        status: "active",
      }));
      if (chairsToInsert.length > 0) {
        await db.insert(schema.clinicChairs).values(chairsToInsert);
      }
    }
  }

  if (preset === "solo_therapist") {
    const patientDefs = [
      {
        fullName: "Анна Петровна Соколова",
        birthDate: "1985-03-12",
        phone: "+79101234567",
      },
      {
        fullName: "Игорь Васильевич Ким",
        birthDate: "1978-07-22",
        phone: "+79201112233",
      },
      {
        fullName: "Ольга Сергеевна Шаль",
        birthDate: "1992-11-05",
        phone: "+79305556677",
      },
    ];
    for (const p of patientDefs) {
      const [patient] = await db
        .insert(schema.patients)
        .values({
          organizationId,
          fullName: p.fullName,
          birthDate: p.birthDate,
          phone: p.phone,
          isSynced: false,
          version: 1,
        })
        .returning({ id: schema.patients.id });
      if (!patient) continue;
      // Add a visit with caries treatment plan
      await db.insert(schema.visits).values({
        organizationId,
        patientId: patient.id,
        status: "signed",
        complaint: "Боль в нижней правой челюсти на холодное",
        diagnosis: "Средний кариес 46 зуба",
        treatmentPlan:
          "Анестезия, препарирование, пломба светового отверждения (композит).",
        doctorSummary:
          "Проведено лечение среднего кариеса 46 зуба по протоколу.",
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
      {
        fullName: "Виктор Михайлович Азаров",
        birthDate: "1960-05-18",
        phone: "+79401234567",
      },
      {
        fullName: "Наталья Ивановна Громова",
        birthDate: "1955-09-30",
        phone: "+79509876543",
      },
    ];
    for (const p of patientDefs) {
      const [patient] = await db
        .insert(schema.patients)
        .values({
          organizationId,
          fullName: p.fullName,
          birthDate: p.birthDate,
          phone: p.phone,
        })
        .returning({ id: schema.patients.id });
      if (!patient) continue;
      // Add a visit with prosthetic plan
      const [visit] = await db
        .insert(schema.visits)
        .values({
          organizationId,
          patientId: patient.id,
          status: "draft",
          complaint: "Отсутствует зуб, эстетический дефект",
          diagnosis: "Частичная вторичная адентия 24 зуба",
          treatmentPlan:
            "Снятие слепков. Изготовление коронки из диоксида циркония на имплантате 24.",
        })
        .returning({ id: schema.visits.id });

      // Add communication task for lab orders
      await db.insert(schema.communicationTasks).values({
        organizationId,
        patientId: patient.id,
        assignedRole: "doctor",
        channel: "in_person",
        intent: "general",
        status: "queued",
        priority: "normal",
        dueAt: new Date(Date.now() + 86400000 * 5),
        title: "Изготовление циркониевой коронки",
        body:
          "Цвет A2, транслуцентный край. Отправлено в фрезерный центр.",
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

// ————————————————————————————————————————————————————————————————————————————
// Route registration
// ————————————————————————————————————————————————————————————————————————————
export async function workspaceProfileRoutes(fastify: FastifyInstance) {
  // GET /api/workspace/profile
  fastify.get("/api/workspace/profile", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    return reply.send({
      hasAssistants: true,
      hasMultipleChairs: true,
      hasDentalLab: true,
      hasInsuranceCoPay: true,
      hasInstallments: true,
      hasOrthodontics: true,
      hasTasks: true,
      hasReclamations: true,
      hasPediatricMode: false,
      isOmniRole: false,
      workspacePreset: "enterprise",
      onboardingCompleted: true,
      hasPayrollModule: true,
      hasMarketingModule: true,
      hasAnalyticsModule: true,
      hasInventoryModule: true,
      aiEnableTreatmentPlan: true,
      aiEnableRecommendations: true,
      aiEnableDocuments: true,
    });
  });

  // GET /api/workspace/chairs
  fastify.get("/api/workspace/chairs", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const chairs = await db
      .select({ id: schema.chairs.id, name: schema.chairs.name })
      .from(schema.chairs)
      .where(eq(schema.chairs.organizationId, organizationId))
      .orderBy(schema.chairs.name);

    return reply.send({ success: true, data: chairs });
  });

  // POST /api/workspace/profile — save arbitrary flags
  fastify.post<{ Body: Partial<WorkspaceFeatureFlags> }>(
    "/api/workspace/profile",
    async (req, reply) => {
      const organizationId = await resolveOrganizationId(req);
      if (!organizationId)
        return reply.code(401).send({ error: "Unauthorized" });

      const {
        hasAssistants,
        hasMultipleChairs,
        hasDentalLab,
        hasInsuranceCoPay,
        hasInstallments,
        hasPediatricMode,
        isOmniRole,
        hasOrthodontics,
        hasTasks,
        hasReclamations,
        hasPayrollModule,
        hasMarketingModule,
        hasAnalyticsModule,
        hasInventoryModule,
        aiEnableTreatmentPlan,
        aiEnableRecommendations,
        aiEnableDocuments,
      } = req.body ?? {};
      await db
        .update(schema.organizations)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organizationId));

      return reply.send({ ok: true });
    },
  );

  // POST /api/workspace/preset/:name — apply preset + seed
  fastify.post<{
    Params: { name: string };
    Body?: { numberOfChairs?: number; hasPediatricMode?: boolean };
  }>("/api/workspace/preset/:name", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const presetName = req.params.name as PresetName;
    const flags =
      WORKSPACE_PRESETS[presetName as Exclude<PresetName, "custom">];
    if (!flags)
      return reply.code(400).send({ error: `Unknown preset: ${presetName}` });

    const finalFlags = { ...flags };
    if (req.body?.hasPediatricMode !== undefined) {
      finalFlags.hasPediatricMode = req.body.hasPediatricMode;
    }

    await db
      .update(schema.organizations)
      .set({ ...finalFlags, updatedAt: new Date() })
      .where(eq(schema.organizations.id, organizationId));

    // Async seeding — don't block response
    seedDemoDataForPreset(
      organizationId,
      presetName,
      req.body?.numberOfChairs,
    ).catch((e) => console.error("[workspace preset] seeding error:", e));

    return reply.send({ ok: true, preset: presetName, flags });
  });

  // POST /api/workspace/onboarding/complete
  fastify.post("/api/workspace/onboarding/complete", async (req, reply) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

    const payload = (req.body || {}) as {
      name?: string;
      legal?: { name?: string; inn?: string; ogrn?: string; address?: string };
      chairs?: number;
      workHours?: [number, number];
      specs?: string[];
      staff?: Array<{ id?: string; fullName?: string; role?: string; phone?: string; percentage?: number; commissionRatePct?: number }>;
      chairsList?: Array<{ name?: string; roomNumber?: string }>;
    };

    if (
      payload &&
      typeof payload === "object" &&
      Object.keys(payload).length > 0
    ) {
      try {
        await db.transaction(async (tx) => {
        // 1. Update organizations
        await tx
          .update(schema.organizations)
          .set({
            name: payload.name || payload.legal?.name || "Клиника DENTE",
            inn: payload.legal?.inn || null,
            ogrn: payload.legal?.ogrn || null,
            legalAddress: payload.legal?.address || null,
            clinicMode: (payload.chairs || 1) === 1 ? "single" : "network",
            clinicSchedule: {
              workHours: payload.workHours || [9, 18],
              specs: payload.specs || ["therapy"]
            },
            updatedAt: new Date()
          })
          .where(eq(schema.organizations.id, organizationId));

        // 2. Insert Staff & Commissions
        if (payload.staff && Array.isArray(payload.staff)) {
          for (const s of payload.staff) {
            const [newUser] = await tx
              .insert(schema.users)
              .values({
                organizationId,
                fullName: s.fullName || "Сотрудник",
                role: s.role || "doctor",
                isActive: true,
                email: s.id + "@clinic.local",
                phone: s.phone || null,
              })
              .returning();

            if (s.role === "Врач" || s.role === "Куратор") {
              await tx.insert(schema.doctorCommissions).values({
                organizationId,
                userId: newUser?.id as string,
                specialty: "therapist",
                serviceCategory: "consultation",

                commissionPct: (s.percentage ? Number(s.percentage) : 25).toString(),
              });
            }
          }
        }

        // 2.5 Smart Seeding: Service Catalog
        const selectedSpecs = payload.specs || ["therapy"];
        const servicesToInsert: any[] = [];
        if (selectedSpecs.includes("therapy")) {
          servicesToInsert.push({
            organizationId,
            code: "T01",
            name: "Кариес эмали",
            category: "therapy",
            basePriceRub: 3500,
            priceRub: 3500,
          });
          servicesToInsert.push({
            organizationId,
            code: "T02",
            name: "Пульпит (1 канал)",
            category: "therapy",
            basePriceRub: 7500,
            priceRub: 7500,
          });
        }
        if (selectedSpecs.includes("surgery")) {
          servicesToInsert.push({
            organizationId,
            code: "S01",
            name: "Удаление зуба сложное",
            category: "surgery",
            basePriceRub: 5500,
            priceRub: 5500,
          });
          servicesToInsert.push({
            organizationId,
            code: "S02",
            name: "Имплантат Osstem",
            category: "surgery",
            basePriceRub: 35000,
            priceRub: 35000,
          });
        }
        if (selectedSpecs.includes("orthopedics")) {
          servicesToInsert.push({
            organizationId,
            code: "O01",
            name: "Металлокерамическая коронка",
            category: "orthopedics",
            basePriceRub: 15000,
            priceRub: 15000,
          });
        }
        if (servicesToInsert.length > 0) {
          await tx.insert(schema.serviceCatalogItems).values(servicesToInsert);
        }

        // 3. Create Chairs
        const chairsCount = payload.chairs ?? 0;
        if (chairsCount > 0) {
          let existingClinic = await tx
            .select({ id: schema.clinics.id })
            .from(schema.clinics)
            .where(eq(schema.clinics.organizationId, organizationId))
            .limit(1);
          let clinicId = existingClinic[0]?.id;
          if (!clinicId) {
            const [createdClinic] = await tx
              .insert(schema.clinics)
              .values({ organizationId, name: "Главный филиал" })
              .returning({ id: schema.clinics.id });
            clinicId = createdClinic?.id ?? organizationId;
          }

          const chairs = Array.from({ length: chairsCount }).map((_, i) => ({
            organizationId,
            clinicId,
            name: `Кресло ${i + 1}`,
            isActive: true,
          }));
          await tx.insert(schema.chairs).values(chairs);
        }
      });
    } catch (txErr: any) {
        console.error("[onboarding] transaction failed, falling back:", txErr?.message);
        await db
          .update(schema.organizations)
          .set({ updatedAt: new Date() })
          .where(eq(schema.organizations.id, organizationId));
      }
    } else {
      // Fallback
      await db
        .update(schema.organizations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.organizations.id, organizationId));
    }

    // Simulate 1.5 - 2 second delay for a beautiful loading screen
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Async Seeding of templates and price list
    try {
      const existingItems = await db
        .select({ id: schema.serviceCatalogItems.id })
        .from(schema.serviceCatalogItems)
        .where(eq(schema.serviceCatalogItems.organizationId, organizationId))
        .limit(1);
      if (existingItems.length === 0) {
        // Fetch organization info
        const [org] = await db
          .select({ name: schema.organizations.name })
          .from(schema.organizations)
          .where(eq(schema.organizations.id, organizationId));
        const specs = ["therapy", "surgery"] as string[];

        type ServiceCategory =
          | "consultation"
          | "therapy"
          | "surgery"
          | "prosthetics"
          | "orthodontics"
          | "periodontology"
          | "hygiene"
          | "imaging"
          | "documents"
          | "other";
        const allServices: {
          organizationId: string;
          code: string;
          title: string;
          basePriceRub: number;
          priceRub: number;
          category: ServiceCategory;
        }[] = [
          {
            organizationId,
            code: "A16.07.000",
            title: "Установка имплантата Osstem",
            basePriceRub: 45000,
            priceRub: 45000,
            category: "surgery",
          },
          {
            organizationId,
            code: "A16.07.001",
            title: "Удаление зуба (простое)",
            basePriceRub: 2500,
            priceRub: 2500,
            category: "surgery",
          },
          {
            organizationId,
            code: "A16.07.002",
            title: "Лечение кариеса (поверхностный)",
            basePriceRub: 3500,
            priceRub: 3500,
            category: "therapy",
          },
          {
            organizationId,
            code: "A16.07.008",
            title: "Лечение пульпита (3 канала)",
            basePriceRub: 12000,
            priceRub: 12000,
            category: "therapy",
          },
          {
            organizationId,
            code: "A16.07.051",
            title: "Профессиональная гигиена",
            basePriceRub: 5000,
            priceRub: 5000,
            category: "therapy",
          },
          {
            organizationId,
            code: "A16.07.052",
            title: "Установка брекет-системы",
            basePriceRub: 80000,
            priceRub: 80000,
            category: "orthodontics",
          },
          {
            organizationId,
            code: "A16.07.053",
            title: "Коронка из диоксида циркония",
            basePriceRub: 25000,
            priceRub: 25000,
            category: "prosthetics",
          },
          {
            organizationId,
            code: "A16.07.054",
            title: "Лечение молочного зуба",
            basePriceRub: 3000,
            priceRub: 3000,
            category: "therapy",
          },
        ];

        // Filter based on selected specs (or map category to specs)
        const categoryToSpec: Record<string, string> = {
          surgery: "surgery",
          therapy: "therapy",
          orthodontics: "orthodontics",
          prosthetics: "orthopedics",
        };
        const filteredServices = allServices.filter((s) =>
          specs.includes(categoryToSpec[s.category] || s.category),
        );

        if (filteredServices.length > 0) {
          // Seed price list
          const insertedServices = await db
            .insert(schema.serviceCatalogItems)
            .values(filteredServices)
            .returning({
              id: schema.serviceCatalogItems.id,
              title: schema.serviceCatalogItems.title,
            });

          const serviceMap = Object.fromEntries(
            insertedServices.map((s) => [s.title, s.id]),
          );

          const allTemplates = [
            {
              organizationId,
              title: "Установка имплантата Osstem",
              category: "surgery" as const,
              prefilledAnamnesis:
                "Отсутствие зуба, нарушение жевательной функции.",
              prefilledObjective:
                "В области отсутствующего зуба слизистая оболочка без видимых патологических изменений. Костная ткань в достаточном объеме.",
              prefilledTreatment:
                "Анестезия инфильтрационная, разрез, отслаивание лоскута, формирование ложа, установка имплантата Osstem, наложение швов.",
              defaultIcd10: "K08.1",
              defaultIcd10Label: "Потеря зубов вследствие удаления",
              isBuiltIn: true,
              suggestedProcedureIds: [
                serviceMap["Установка имплантата Osstem"],
              ].filter(Boolean),
            },
            {
              organizationId,
              title: "Лечение пульпита (3 канала)",
              category: "therapy" as const,
              prefilledAnamnesis:
                "Самопроизвольные ноющие боли, усиливающиеся в ночное время.",
              prefilledObjective:
                "Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование резко болезненно, перкуссия безболезненная.",
              prefilledTreatment:
                "Анестезия, препарирование кариозной полости, экстирпация пульпы, механическая и медикаментозная обработка 3-х корневых каналов, пломбирование каналов гуттаперчей, постановка постоянной пломбы.",
              defaultIcd10: "K04.0",
              defaultIcd10Label: "Пульпит",
              isBuiltIn: true,
              suggestedProcedureIds: [
                serviceMap["Лечение пульпита (3 канала)"],
              ].filter(Boolean),
            },
            {
              organizationId,
              title: "Лечение кариеса",
              category: "therapy" as const,
              prefilledAnamnesis:
                "Жалобы на кратковременную боль от сладкого и холодного.",
              prefilledObjective:
                "Кариозная полость в пределах плащевого дентина. Зондирование чувствительно по эмалево-дентинной границе.",
              prefilledTreatment:
                "Анестезия, препарирование кариозной полости, медикаментозная обработка, адгезивный протокол, постановка светоотверждаемой пломбы, шлифовка, полировка.",
              defaultIcd10: "K02.1",
              defaultIcd10Label: "Кариес дентина",
              isBuiltIn: true,
              suggestedProcedureIds: [
                serviceMap["Лечение кариеса (поверхностный)"],
              ].filter(Boolean),
            },
          ];

          const filteredTemplates = allTemplates.filter((t) =>
            specs.includes(categoryToSpec[t.category] || t.category),
          );

          if (filteredTemplates.length > 0) {
            // Seed templates
            await db.insert(schema.visitTemplates).values(filteredTemplates);
          }
        }
      }
    } catch (err) {
      console.error("[workspace onboarding] async seeding error:", err);
    }

    return reply.send({ success: true });
  });
}
