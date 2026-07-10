import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import type { Dashboard } from "@dental/shared";

// Temporary naive mapper to replace sampleData buildDashboard
export async function getDashboardFromDb(organizationId: string): Promise<Dashboard> {
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).limit(1);
  if (!org) throw new Error("Organization not found");

  const users = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId));
  const patients = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
  const appointments = await db.select().from(schema.appointments).where(eq(schema.appointments.organizationId, organizationId));
  const documents = await db.select().from(schema.generatedDocuments).where(eq(schema.generatedDocuments.organizationId, organizationId));
  const imagingStudies = await db.select().from(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, organizationId));
  const chairs = await db.select().from(schema.clinicChairs).where(eq(schema.clinicChairs.organizationId, organizationId));
  const serviceCatalog = await db.select().from(schema.serviceCatalogItems).where(eq(schema.serviceCatalogItems.organizationId, organizationId));
  const clinicalRules = await db.select().from(schema.clinicalRules).where(eq(schema.clinicalRules.organizationId, organizationId));

  // Default skeleton matching the expected structure
  return {
    clinicName: org.name,
    todayIso: new Date().toISOString().split("T")[0],
    clinicSettings: {
      profile: {
        id: org.id,
        organizationId: org.id,
        clinicName: org.name,
        legalName: org.name,
        inn: "1234567890",
        taxId: "",
        licenseNumber: "",
        address: "Default Address",
        phone: "+70000000000",
        timezone: "Europe/Samara",
        mode: "one_chair",
        defaultVisitMinutes: 45,
        scheduleDefaults: {
          workingDays: [1,2,3,4,5],
          workdayStart: "09:00",
          workdayEnd: "20:00",
          appointmentBufferMinutes: 15
        },
        networkEnabled: false,
        egiszEnabled: false,
        updatedAt: new Date().toISOString()
      },
      staff: users.map(u => ({
        id: u.id,
        organizationId: u.organizationId,
        fullName: u.fullName,
        role: u.role as any,
        phone: u.phone,
        email: u.email,
        active: u.isActive,
        specialties: [],
        canSignMedicalRecords: u.role === "doctor",
        canManageMoney: u.role === "owner" || u.role === "administrator",
        canManageImports: u.role === "owner" || u.role === "administrator",
        color: "#1e293b",
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.createdAt.toISOString()
      })),
      chairs: chairs.map(c => ({
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
    // 
    patients: patients.map(p => ({
      id: p.id,
      organizationId: p.organizationId,
      status: p.status,
      fullName: p.fullName,
      birthDate: p.birthDate,
      phone: p.phone,
      email: p.email,
      notes: p.notes,
      administrativeProfile: p.administrativeProfile as any,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    patientInsights: [],
    recommendedActions: [],
    appointments: appointments.map(a => ({
      id: a.id,
      organizationId: a.organizationId,
      patientId: a.patientId,
      doctorUserId: a.doctorUserId,
      assistantUserId: a.assistantUserId,
      chairId: a.chairId,
      status: a.status,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      reason: a.reason,
      comment: a.comment
    })),
    appointmentReadiness: [],
    scheduleSuggestions: [],
    activeVisit: {
      id: "00000000-0000-0000-0000-000000000000",
      organizationId: organizationId,
      patientId: "00000000-0000-0000-0000-000000000000",
      appointmentId: null,
      status: "draft",
      revision: 1,
      complaint: null,
      anamnesis: null,
      objectiveStatus: null,
      diagnosis: null,
      treatmentPlan: null,
      doctorSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    visitCloseChecklist: {
      visitId: "00000000-0000-0000-0000-000000000000",
      readyToSign: false,
      score: 0,
      nextAction: "review",
      blockingItems: 0,
      items: []
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
    protocolTemplates: [],
    treatmentPlanItems: [],
    treatmentPlanScenarios: [],
    clinicalRuleEvaluations: [],
    clinicalRuleSummary: {
      activeRules: 0,
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
    importBatches: [],
    speechProviders: [],
    auditEvents: [],
    complianceWarnings: [],
    documents: documents.map(d => ({
      id: d.id,
      organizationId: d.organizationId,
      patientId: d.patientId,
      kind: d.kind as any,
      status: d.status as any,
      payload: d.payloadJson ? JSON.parse(d.payloadJson) : {},
      schemaVersion: 1,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.createdAt.toISOString()
    })) as any,
    imagingStudies: imagingStudies.map(s => ({
      id: s.id,
      organizationId: s.organizationId,
      patientId: s.patientId,
      visitId: s.visitId,
      kind: s.kind as any,
      status: s.status as any,
      sourceKind: s.sourceKind as any,
      acquiredAt: s.createdAt.toISOString(),
      capturedAt: s.createdAt.toISOString(),
      studyDescription: s.title,
      title: s.title,
      reviewerUserId: null,
      sourceName: "",
      toothCode: null,
      region: null,
      aiSummary: null,
      previewUrl: undefined,
      viewerUrl: undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.createdAt.toISOString()
    })),
    serviceCatalog: serviceCatalog.map(s => ({
      id: s.id,
      organizationId: s.organizationId,
      code: s.code,
      title: s.title,
      category: s.category as any,
      specialty: s.specialty as any,
      basePriceRub: s.basePriceRub,
      priceRub: s.priceRub,
      durationMinutes: s.durationMinutes,
      taxDeductible: s.taxDeductible,
      taxDeductionCode: s.taxDeductionCode,
      aliases: [],
      active: s.isActive
    })),
    clinicalRules: clinicalRules.map(r => ({
      id: r.id,
      organizationId: r.organizationId,
      title: r.title,
      category: r.category,
      specialty: r.specialty,
      action: r.action,
      severity: r.severity,
      ownerRole: r.ownerRole as any,
      triggerServiceIds: JSON.parse(r.triggerServiceIdsJson || "[]"),
      requiredServiceIds: JSON.parse(r.requiredServiceIdsJson || "[]"),
      requiresCompletedServiceIds: JSON.parse(r.requiresCompletedServiceIdsJson || "[]"),
      blockedServiceIds: JSON.parse(r.blockedServiceIdsJson || "[]"),
      condition: r.condition,
      warningText: r.warningText,
      patientText: r.patientText,
      active: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    })),
    communicationTasks: []
  } as unknown as Dashboard;
}
