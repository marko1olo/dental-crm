import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import { dashboardSchema, staffRoleSchema, type Dashboard } from "@dental/shared";
import { buildDashboard as buildDashboardInMemory } from "../sampleData.js";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

function safeParseJsonArray(jsonString: string | null | undefined): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseJsonObject<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

export async function getDashboardFromDb(organizationId: string): Promise<Dashboard> {
  if (useInMemory()) {
    return buildDashboardInMemory();
  }
  let org: typeof schema.organizations.$inferSelect | undefined = undefined;
  let users: (typeof schema.users.$inferSelect)[] = [];
  let patients: (typeof schema.patients.$inferSelect)[] = [];
  let appointments: (typeof schema.appointments.$inferSelect)[] = [];
  let documents: (typeof schema.generatedDocuments.$inferSelect)[] = [];
  let imagingStudies: (typeof schema.imagingStudies.$inferSelect)[] = [];
  let chairs: (typeof schema.chairs.$inferSelect)[] = [];
  let serviceCatalog: (typeof schema.services.$inferSelect)[] = [];
  let clinicalRules: (typeof schema.clinicalRules.$inferSelect)[] = [];

  try {
    const result = await db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).limit(1);
    org = result[0];
    if (org) {
      users = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId)).catch(() => []);
      patients = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId)).catch(() => []);
      appointments = await db.select().from(schema.appointments).where(eq(schema.appointments.organizationId, organizationId)).catch(() => []);
      documents = await db.select().from(schema.generatedDocuments).where(eq(schema.generatedDocuments.organizationId, organizationId)).catch(() => []);
      imagingStudies = await db.select().from(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, organizationId)).catch(() => []);
      chairs = await db.select().from(schema.chairs).where(eq(schema.chairs.organizationId, organizationId)).catch(() => []);
      serviceCatalog = await db.select().from(schema.services).where(eq(schema.services.organizationId, organizationId)).catch(() => []);
      clinicalRules = await db.select().from(schema.clinicalRules).where(eq(schema.clinicalRules.organizationId, organizationId)).catch(() => []);
    }
  } catch (e) {
    console.warn("[DashboardQuery] Database query fallback triggered:", e);
  }

  const effectiveOrgId = org?.id ?? organizationId;
  const effectiveOrgName = org?.name ?? "Демо Клиника DENTE";

  return dashboardSchema.parse({
    clinicName: effectiveOrgName,
    todayIso: new Date().toISOString().split("T")[0]!,
    clinicSettings: {
      profile: {
        id: effectiveOrgId,
        organizationId: effectiveOrgId,
        clinicName: effectiveOrgName,
        legalName: effectiveOrgName,
        inn: "1234567890",
        taxId: "",
        licenseNumber: "",
        address: "Default Address",
        phone: "+70000000000",
        timezone: "Europe/Samara",
        mode: "one_chair",
        defaultVisitMinutes: 45,
        scheduleDefaults: {
          workingDays: [1, 2, 3, 4, 5],
          workdayStart: "09:00",
          workdayEnd: "20:00",
          appointmentBufferMinutes: 15
        },
        networkEnabled: false,
        egiszEnabled: false,
        updatedAt: new Date().toISOString()
      },
      staff: users.map((u) => ({
        id: u.id,
        organizationId: u.organizationId,
        fullName: u.fullName,
        role: staffRoleSchema.catch("doctor").parse(u.role),
        phone: u.phone ?? null,
        email: u.email ?? null,
        active: u.isActive,
        specialties: [],
        canSignMedicalRecords: u.role === "doctor",
        canManageMoney: u.role === "owner" || u.role === "administrator",
        canManageImports: u.role === "owner" || u.role === "administrator",
        color: "#1e293b",
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.createdAt.toISOString()
      })),
      chairs: chairs.map((c) => ({
        id: c.id,
        organizationId: c.organizationId,
        name: c.name,
        room: "",
        specialization: "therapist",
        active: c.isActive,
        hasXraySensor: false,
        hasMicroscope: false,
        hasSurgeryKit: false,
        notes: null,
        workingHours: null
      })),
      integrationPresets: [],
      workspaceProfiles: [],
      roleAccessPolicies: [],
      modeHints: [],
      soloDoctorMode: false
    },
    patients: patients.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      status: p.status,
      fullName: p.fullName,
      birthDate: p.birthDate ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      notes: p.notes ?? null,
      administrativeProfile: p.administrativeProfile ?? null,
      balanceRub: 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    patientInsights: [],
    recommendedActions: [],
    appointments: appointments.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      patientId: a.patientId,
      chairId: a.chairId,
      doctorId: a.doctorUserId,
      status: a.status,
      startAt: a.startsAt.toISOString(),
      endAt: a.endsAt.toISOString(),
      plannedServiceIds: [],
      complaint: a.comment ?? "",
      note: a.comment ?? "",
      source: "manual",
      isEmergency: false,
      confirmationState: "unconfirmed",
      cdaExportStatus: "not_required",
      createdAt: a.startsAt.toISOString(),
      updatedAt: a.endsAt.toISOString()
    })),
    visits: [],
    treatmentPlans: [],
    generatedDocuments: documents.map((d) => ({
      id: d.id,
      organizationId: d.organizationId,
      patientId: d.patientId,
      kind: d.kind,
      status: d.status,
      payload: safeParseJsonObject(d.payloadJson, {}),
      schemaVersion: 1,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.createdAt.toISOString()
    })),
    imagingStudies: imagingStudies.map((s) => ({
      id: s.id,
      organizationId: s.organizationId,
      patientId: s.patientId,
      visitId: s.visitId ?? null,
      kind: s.kind,
      status: s.status,
      sourceKind: s.sourceKind,
      acquiredAt: s.createdAt.toISOString(),
      capturedAt: s.createdAt.toISOString(),
      studyDescription: s.title,
      title: s.title,
      reviewerUserId: null,
      sourceName: "",
      toothCode: null,
      region: null,
      aiSummary: null,
      previewUrl: null,
      viewerUrl: null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.createdAt.toISOString()
    })),
    serviceCatalog: serviceCatalog.map((s) => ({
      id: s.id,
      organizationId: s.organizationId,
      code: s.code,
      title: s.title,
      category: s.category,
      specialty: s.specialty,
      basePriceRub: Number(s.basePriceRub),
      priceRub: Number(s.basePriceRub),
      durationMinutes: s.durationMinutes,
      taxDeductible: s.taxDeductible,
      taxDeductionCode: null,
      aliases: [],
      active: s.active
    })),
    clinicalRules: clinicalRules.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      title: r.title,
      category: r.category,
      specialty: r.specialty,
      action: r.action,
      severity: r.severity,
      ownerRole: r.ownerRole,
      triggerServiceIds: safeParseJsonArray(r.triggerServiceIdsJson),
      requiredServiceIds: safeParseJsonArray(r.requiredServiceIdsJson),
      requiresCompletedServiceIds: safeParseJsonArray(r.requiresCompletedServiceIdsJson),
      blockedServiceIds: safeParseJsonArray(r.blockedServiceIdsJson),
      condition: r.condition ?? null,
      warningText: r.warningText,
      patientText: r.patientText,
      active: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    })),
    importBatches: [],
    speechProviders: [],
    auditEvents: [],
    complianceWarnings: [],
    protocolTemplates: [],
    treatmentPlanItems: [],
    treatmentPlanScenarios: [],
    clinicalRuleEvaluations: [],
    clinicalRuleSummary: {
      activeRules: clinicalRules.filter((r) => r.isActive).length,
      evaluatedRules: 0,
      unresolved: 0,
      blockers: 0,
      warnings: 0,
      requiredServices: 0,
      coveredRules: 0
    },
    payments: [],
    billingSummary: {
      totalPlannedRub: 0,
      totalDiscountRub: 0,
      totalPaidRub: 0,
      totalDueRub: 0,
      taxDeductionEligibleRub: 0,
      draftDocumentAmountRub: 0,
      openTreatmentItems: 0,
      unpaidDocuments: 0
    },
    communicationTemplates: [],
    communicationEvents: [],
    communicationSummary: {
      openTasks: 0,
      urgentTasks: 0,
      dueToday: 0,
      overdue: 0,
      completedToday: 0,
      appointmentConfirmations: 0,
      paymentReminders: 0,
      postVisitInstructions: 0
    },
    shiftIntelligence: {
      modeFit: {
        mode: "one_chair",
        title: "Один кабинет",
        fitScore: 100,
        blockers: [],
        upgrades: [],
        lowFrictionNextStep: "ready"
      },
      doctorLoads: [],
      assistantLoads: [],
      chairLoads: [],
      roleQueues: [],
      scheduleWarnings: []
    },
    communicationTasks: []
  });
}
