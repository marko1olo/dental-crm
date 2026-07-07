import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { ClinicSettings, UiPreferences, CreateStaffMemberInput, CreateChairInput, UpdateClinicProfileInput, ClinicProfile, ClinicMode } from "@dental/shared";

// Dummy fallback for legacy UI preferences if multiple users exist
export async function getUiPreferencesFromDb(organizationId: string): Promise<UiPreferences | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId)).limit(1);
  if (!user || !user.uiPreferences) return null;
  return user.uiPreferences as UiPreferences;
}

export async function saveUiPreferencesInDb(organizationId: string, prefs: UiPreferences): Promise<void> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId)).limit(1);
  if (!user) throw new Error("No users found to save preferences to.");
  await db.update(schema.users).set({ uiPreferences: prefs }).where(eq(schema.users.id, user.id));
}

export async function getClinicSettingsFromDb(organizationId: string): Promise<ClinicSettings> {
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).limit(1);
  if (!org) throw new Error("Organization not found");
  
  const [clinic] = await db.select().from(schema.clinics).where(eq(schema.clinics.organizationId, organizationId)).limit(1);
  
  const staff = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId));
  const chairs = await db.select().from(schema.chairs).where(eq(schema.chairs.organizationId, organizationId));

  const profile: ClinicProfile = {
    organizationId: org.id,
    clinicName: clinic?.name || org.name,
    legalName: org.name,
    inn: org.inn || null,
    kpp: org.kpp || null,
    ogrn: org.ogrn || null,
    address: org.legalAddress || null,
    phone: clinic?.phone || null,
    email: org.email || null,
    website: org.website || null,
    medicalLicenseNumber: org.medicalLicenseNumber || null,
    medicalLicenseIssuedAt: org.medicalLicenseIssuedAt || null,
    medicalLicenseIssuer: org.medicalLicenseIssuer || null,
    bankDetails: org.bankDetails || null,
    signatoryName: org.signatoryName || null,
    signatoryTitle: org.signatoryTitle || null,
    mode: (org.clinicMode as any) || "demo",
    timezone: clinic?.timezone || "Europe/Samara",
    defaultVisitMinutes: 60,
    scheduleDefaults: (org.clinicSchedule as any) || {
      monday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      tuesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      wednesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      thursday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      friday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      saturday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
      sunday: { isWorking: false, startsAt: "08:00", endsAt: "20:00" }
    },
    networkEnabled: false,
    egiszEnabled: false,
    updatedAt: org.updatedAt.toISOString()
  };

  return {
    profile,
    staff: staff.map(s => ({
      id: s.id,
      organizationId: s.organizationId,
      fullName: s.fullName,
      role: s.role as any,
      specialties: ["universal"],
      active: s.isActive,
      canSignMedicalRecords: true,
      canManageMoney: true,
      canManageImports: true,
      color: "#000000",
      phone: s.phone || null,
      email: s.email || null,
      workingHours: (s.workingHours as any) || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.createdAt.toISOString()
    })),
    chairs: chairs.map(c => ({
      id: c.id,
      organizationId: c.organizationId,
      name: c.name,
      room: null,
      specialization: null,
      active: c.isActive,
      hasXraySensor: false,
      hasMicroscope: false,
      hasSurgeryKit: false,
      notes: null,
      workingHours: (c.workingHours as any) || null
    })),
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false
  };
}

export async function updateClinicModeInDb(organizationId: string, mode: ClinicMode) {
  await db.update(schema.organizations).set({ clinicMode: mode }).where(eq(schema.organizations.id, organizationId));
}

export async function updateClinicProfileInDb(organizationId: string, input: UpdateClinicProfileInput) {
  const updateData: any = { updatedAt: new Date() };
  if (input.legalName !== undefined) updateData.name = input.legalName;
  if (input.inn !== undefined) updateData.inn = input.inn;
  if (input.kpp !== undefined) updateData.kpp = input.kpp;
  if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
  if (input.address !== undefined) updateData.legalAddress = input.address;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.medicalLicenseNumber !== undefined) updateData.medicalLicenseNumber = input.medicalLicenseNumber;
  if (input.medicalLicenseIssuedAt !== undefined) updateData.medicalLicenseIssuedAt = input.medicalLicenseIssuedAt;
  if (input.medicalLicenseIssuer !== undefined) updateData.medicalLicenseIssuer = input.medicalLicenseIssuer;
  if (input.bankDetails !== undefined) updateData.bankDetails = input.bankDetails;
  if (input.signatoryName !== undefined) updateData.signatoryName = input.signatoryName;
  if (input.signatoryTitle !== undefined) updateData.signatoryTitle = input.signatoryTitle;
  if (input.scheduleDefaults !== undefined) updateData.clinicSchedule = input.scheduleDefaults;

  await db.update(schema.organizations).set(updateData).where(eq(schema.organizations.id, organizationId));

  const clinicUpdateData: any = {};
  if (input.clinicName !== undefined) clinicUpdateData.name = input.clinicName;
  if (input.phone !== undefined) clinicUpdateData.phone = input.phone;
  if (input.timezone !== undefined) clinicUpdateData.timezone = input.timezone;

  if (Object.keys(clinicUpdateData).length > 0) {
    await db.update(schema.clinics).set(clinicUpdateData).where(eq(schema.clinics.organizationId, organizationId));
  }
}

export async function createStaffMemberInDb(organizationId: string, input: CreateStaffMemberInput) {
  await db.insert(schema.users).values({
    organizationId,
    fullName: input.fullName,
    role: input.role,
    phone: input.phone || null,
    email: input.email || null,
    isActive: true,
    workingHours: input.workingHours
  });
}

export async function updateStaffWorkingHoursInDb(organizationId: string, staffId: string, workingHours: any) {
  await db.update(schema.users).set({ workingHours }).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

export async function updateStaffCredentialsInDb(
  organizationId: string,
  staffId: string,
  updates: { email?: string; passwordHash?: string; pinCodeHash?: string }
) {
  await db.update(schema.users).set(updates).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

export async function createChairInDb(organizationId: string, input: CreateChairInput) {
  const [clinic] = await db.select().from(schema.clinics).where(eq(schema.clinics.organizationId, organizationId)).limit(1);
  if (!clinic) throw new Error("Clinic not found");
  
  await db.insert(schema.chairs).values({
    organizationId,
    clinicId: clinic.id,
    name: input.name,
    isActive: true,
    workingHours: input.workingHours
  });
}

export async function updateChairWorkingHoursInDb(organizationId: string, chairId: string, workingHours: any) {
  await db.update(schema.chairs).set({ workingHours }).where(and(eq(schema.chairs.id, chairId), eq(schema.chairs.organizationId, organizationId)));
}
