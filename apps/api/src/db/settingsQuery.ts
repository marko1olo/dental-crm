import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { ClinicSettings, UiPreferences, CreateStaffMemberInput, CreateChairInput, UpdateClinicProfileInput, ClinicProfile, ClinicMode, ClinicScheduleDefaults, StaffWorkingHours } from "@dental/shared";
import { clinicModeSchema, clinicScheduleDefaultsSchema, staffWorkingHoursSchema, staffRoleSchema } from "@dental/shared";
import type { StaffMember } from "@dental/shared";
import {
  buildClinicSettings as getClinicSettingsInMemory,
  updateClinicProfile as updateClinicProfileInMemory,
  createStaffMember as createStaffMemberInMemory,
  updateStaffWorkingHours as updateStaffWorkingHoursInMemory,
  createChair as createChairInMemory,
  updateChairWorkingHours as updateChairWorkingHoursInMemory,
  updateClinicMode as updateClinicModeInMemory
} from "../sampleData.js";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

// The DB columns are looser than the DTO: clinic_mode is free `text` (legacy rows
// hold "demo"/"single"/"network"), and clinic_schedule / working_hours are untyped
// jsonb. Validate at the read boundary through the shared Zod schemas so an invalid
// stored value falls back to a well-formed default instead of an `as any` lie.
const DEFAULT_SCHEDULE_DEFAULTS: ClinicScheduleDefaults = {
  workdayStart: "08:00",
  workdayEnd: "20:00",
  workingDays: [1, 2, 3, 4, 5],
  appointmentBufferMinutes: 15,
};

function narrowClinicMode(value: unknown): ClinicMode {
  const parsed = clinicModeSchema.safeParse(value);
  return parsed.success ? parsed.data : "solo_doctor";
}

function narrowScheduleDefaults(value: unknown): ClinicScheduleDefaults {
  const parsed = clinicScheduleDefaultsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SCHEDULE_DEFAULTS;
}

function narrowWorkingHours(value: unknown): StaffWorkingHours | null {
  if (value == null) return null;
  const parsed = staffWorkingHoursSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function narrowStaffRole(value: unknown): StaffMember["role"] {
  const parsed = staffRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : "assistant";
}

const memoryUiPreferences = new Map<string, UiPreferences>();

export async function getUiPreferencesFromDb(organizationId: string): Promise<UiPreferences | null> {
  if (useInMemory()) return memoryUiPreferences.get(organizationId) ?? null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId)).limit(1);
  if (!user || !user.uiPreferences) return null;
  return user.uiPreferences as UiPreferences;
}

export async function saveUiPreferencesInDb(organizationId: string, prefs: UiPreferences): Promise<void> {
  if (useInMemory()) {
    memoryUiPreferences.set(organizationId, prefs);
    return;
  }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId)).limit(1);
  if (!user) throw new Error("No users found to save preferences to.");
  await db.update(schema.users).set({ uiPreferences: prefs }).where(eq(schema.users.id, user.id));
}

export async function getClinicSettingsFromDb(organizationId: string): Promise<ClinicSettings> {
  if (useInMemory()) {
    return getClinicSettingsInMemory();
  }
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
    mode: narrowClinicMode(org.clinicMode),
    timezone: clinic?.timezone || "Europe/Samara",
    defaultVisitMinutes: 60,
    scheduleDefaults: narrowScheduleDefaults(org.clinicSchedule),
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
      role: narrowStaffRole(s.role),
      specialties: ["universal"],
      active: s.isActive,
      canSignMedicalRecords: true,
      canManageMoney: true,
      canManageImports: true,
      color: "#000000",
      phone: s.phone || null,
      email: s.email || null,
      workingHours: narrowWorkingHours(s.workingHours),
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
      workingHours: narrowWorkingHours(c.workingHours)
    })),
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false
  };
}

export async function updateClinicModeInDb(organizationId: string, mode: ClinicMode) {
  if (useInMemory()) return updateClinicModeInMemory(mode);
  await db.update(schema.organizations).set({ clinicMode: mode }).where(eq(schema.organizations.id, organizationId));
}

export async function updateClinicProfileInDb(organizationId: string, input: UpdateClinicProfileInput) {
  if (useInMemory()) return updateClinicProfileInMemory(input);
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
  if (useInMemory()) return createStaffMemberInMemory(input);
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
  if (useInMemory()) return updateStaffWorkingHoursInMemory(staffId, workingHours);
  await db.update(schema.users).set({ workingHours }).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

export async function updateStaffCredentialsInDb(
  organizationId: string,
  staffId: string,
  updates: { email?: string; passwordHash?: string; pinCodeHash?: string }
) {
  if (useInMemory()) return;
  await db.update(schema.users).set(updates).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

export async function createChairInDb(organizationId: string, input: CreateChairInput) {
  if (useInMemory()) return createChairInMemory(input);
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
  if (useInMemory()) return updateChairWorkingHoursInMemory(chairId, workingHours);
  await db.update(schema.chairs).set({ workingHours }).where(and(eq(schema.chairs.id, chairId), eq(schema.chairs.organizationId, organizationId)));
}
