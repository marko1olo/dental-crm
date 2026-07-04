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
  const chairs = await db.select().from(schema.chairs).where(eq(schema.chairs.organizationId, organizationId));
  const serviceCatalog = await db.select().from(schema.serviceCatalogItems).where(eq(schema.serviceCatalogItems.organizationId, organizationId));
  const clinicalRules = await db.select().from(schema.clinicalRules).where(eq(schema.clinicalRules.organizationId, organizationId));

  // Default skeleton matching the expected structure
  return {
    clinicName: org.name,
    todayIso: new Date().toISOString().split("T")[0],
    clinicSettings: {
      mode: "one_chair",
      timezone: "Europe/Samara",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workDays: [1,2,3,4,5],
        startHour: "09:00",
        endHour: "20:00"
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
      networkEnabled: false,
      egiszEnabled: false,
      updatedAt: new Date().toISOString()
    },
    shiftIntelligence: {
      alerts: [],
      focusItems: [],
      dailyGoal: { text: "Миграция в БД", progress: 0, target: 100 }
    },
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
    activeVisit: null,
    visitCloseChecklist: [],
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
    protocolTemplates: [],
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
