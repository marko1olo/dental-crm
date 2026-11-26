import type {
	ClinicMode,
	ClinicProfile,
	ClinicScheduleDefaults,
	ClinicSettings,
	DentalSpecialty,
	StaffMember,
	StaffWorkingHours,
	UpdateClinicProfileInput,
} from "@dental/shared";
import {
	clinicModeSchema,
	clinicScheduleDefaultsSchema,
	dentalSpecialtySchema,
	isDateLikeString,
	staffRoleSchema,
	staffWorkingHoursSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import {
	buildClinicSettings as getClinicSettingsInMemory,
	updateClinicMode as updateClinicModeInMemory,
	updateClinicProfile as updateClinicProfileInMemory,
} from "../../sampleData.js";
import {
	integrationPresets,
	modeHints,
	workspaceProfiles,
} from "../../sampleData/integrationPresets.js";
import { roleAccessPolicies } from "../../sampleData/staff.js";
import { staffAuthorityFlags } from "../../security/permissions.js";
import { type TenantDb, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import { useInMemory } from "./types.js";

export { applyClinicScalePresetInDb } from "./clinicScalePresetQueries.js";
export {
	getUiPreferencesFromDb,
	saveUiPreferencesInDb,
	stampedUiPreferencesSavedAt,
	uiPreferencesSaveIsSuperseded,
} from "./uiPreferencesQueries.js";

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

function narrowStaffSpecialties(raw: unknown): DentalSpecialty[] {
	if (!Array.isArray(raw)) return ["universal"];
	const valid: DentalSpecialty[] = [];
	for (const entry of raw) {
		const parsed = dentalSpecialtySchema.safeParse(entry);
		if (parsed.success && !valid.includes(parsed.data)) {
			valid.push(parsed.data);
		}
	}
	return valid.length > 0 ? valid : ["universal"];
}

function narrowChairSpecialization(value: string | null | undefined): DentalSpecialty | null {
	if (!value || !value.trim()) return null;
	const direct = dentalSpecialtySchema.safeParse(value.trim());
	if (direct.success) return direct.data;
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) {
			for (const entry of parsed) {
				const item = dentalSpecialtySchema.safeParse(entry);
				if (item.success) return item.data;
			}
		}
	} catch {
		// Non-JSON legacy text
	}
	return "universal";
}

function narrowEmail(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function narrowLicenseDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return isDateLikeString(trimmed) ? trimmed : null;
}

export async function getClinicSettingsFromDb(
	organizationId: string,
	externalTx?: TenantDb | undefined,
): Promise<ClinicSettings> {
	if (useInMemory()) return getClinicSettingsInMemory();

	const run = async (tx: TenantDb): Promise<ClinicSettings> => {
		const [org] = await tx
			.select()
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		if (!org) throw new Error("Организация не найдена в базе данных");

		const [clinic] = await tx
			.select()
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, organizationId))
			.limit(1);

		const staff = await tx
			.select()
			.from(schema.users)
			.where(eq(schema.users.organizationId, organizationId));
		const chairs = await tx
			.select()
			.from(schema.chairs)
			.where(eq(schema.chairs.organizationId, organizationId));

		const orgFlags = (org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
		const rawSchedule = (org.clinicSchedule as Record<string, unknown> | null) ?? {};
		const logoUrl = typeof orgFlags.logoUrl === "string" ? orgFlags.logoUrl : null;
		const stampUrl = typeof orgFlags.stampUrl === "string" ? orgFlags.stampUrl : null;
		const savedDefaultVisitMinutes =
			typeof orgFlags.defaultVisitMinutes === "number" && orgFlags.defaultVisitMinutes > 0
				? orgFlags.defaultVisitMinutes
				: typeof rawSchedule.defaultVisitMinutes === "number" &&
					  rawSchedule.defaultVisitMinutes > 0
					? rawSchedule.defaultVisitMinutes
					: 60;
		const savedEgiszEnabled =
			typeof orgFlags.egiszEnabled === "boolean" ? orgFlags.egiszEnabled : false;
		const savedEgiszAutonomousMode =
			typeof orgFlags.egiszAutonomousMode === "boolean"
				? orgFlags.egiszAutonomousMode
				: !savedEgiszEnabled;
		const resolvedMode = narrowClinicMode(org.clinicMode);

		const profile: ClinicProfile = {
			organizationId: org.id,
			clinicName: clinic?.name || org.name,
			legalName: org.name,
			inn: org.inn || null,
			kpp: org.kpp || null,
			ogrn: org.ogrn || null,
			address: org.legalAddress || clinic?.address || null,
			phone: clinic?.phone || null,
			email: narrowEmail(org.email),
			website: org.website || null,
			medicalLicenseNumber: org.medicalLicenseNumber || null,
			medicalLicenseIssuedAt: narrowLicenseDate(org.medicalLicenseIssuedAt),
			medicalLicenseIssuer: org.medicalLicenseIssuer || null,
			bankDetails: org.bankDetails || null,
			signatoryName: org.signatoryName || null,
			signatoryTitle: org.signatoryTitle || null,
			mode: resolvedMode,
			timezone: clinic?.timezone || "Europe/Samara",
			defaultVisitMinutes: savedDefaultVisitMinutes,
			scheduleDefaults: narrowScheduleDefaults(org.clinicSchedule),
			networkEnabled:
				resolvedMode === "network_clinic" || Boolean(orgFlags.hasMultipleChairs),
			egiszEnabled: savedEgiszEnabled,
			egiszAutonomousMode: savedEgiszAutonomousMode,
			logoUrl,
			stampUrl,
			updatedAt: org.updatedAt.toISOString(),
		};

		const mode = narrowClinicMode(org.clinicMode);
		const activeDoctors = staff.filter(
			(s) => s.isActive && (s.role === "doctor" || narrowStaffRole(s.role) === "doctor"),
		);
		const activeChairs = chairs.filter((c) => c.isActive);
		const isSoloDoctor =
			mode === "solo_doctor" ||
			mode === "one_chair" ||
			activeChairs.length <= 1 ||
			activeDoctors.length <= 1;

		return {
			profile,
			staff: staff.map((s) => ({
				id: s.id,
				organizationId: s.organizationId,
				fullName: s.fullName,
				role: narrowStaffRole(s.role),
				specialties: narrowStaffSpecialties(s.specialties),
				active: s.isActive,
				...staffAuthorityFlags(s.role, isSoloDoctor),
				color: "#000000",
				phone: s.phone || null,
				email: narrowEmail(s.email),
				workingHours: narrowWorkingHours(s.workingHours),
				createdAt: s.createdAt.toISOString(),
				updatedAt: s.createdAt.toISOString(),
			})),
			chairs: chairs.map((c) => {
				const eqText = c.equipment || "";
				const roomMatch = eqText.match(/Кабинет:\s*([^,]+)/);
				const colorMatch = eqText.match(/Цвет:\s*([^,]+)/);
				const defaultDoctorMatch = eqText.match(/Врач:\s*([^,]+)/);
				return {
					id: c.id,
					organizationId: c.organizationId,
					name: c.name,
					room: c.room || roomMatch?.[1]?.trim() || null,
					color: c.color || colorMatch?.[1]?.trim() || null,
					defaultDoctorId: c.defaultDoctorId || defaultDoctorMatch?.[1]?.trim() || null,
					specialization: narrowChairSpecialization(c.specializations),
					active: c.isActive,
					hasXraySensor:
						eqText.toLowerCase().includes("рентген") ||
						eqText.toLowerCase().includes("xray"),
					hasMicroscope:
						eqText.toLowerCase().includes("микроскоп") ||
						eqText.toLowerCase().includes("microscope"),
					hasSurgeryKit:
						eqText.toLowerCase().includes("хирург") ||
						eqText.toLowerCase().includes("surgery"),
					notes: eqText || null,
					workingHours: narrowWorkingHours(c.workingHours),
				};
			}),
			integrationPresets: integrationPresets ?? [],
			workspaceProfiles: workspaceProfiles ?? [],
			roleAccessPolicies: roleAccessPolicies ?? [],
			modeHints: (modeHints && modeHints[resolvedMode]) ?? modeHints?.solo_doctor ?? [],
			soloDoctorMode: isSoloDoctor,
		};
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

export async function updateClinicModeInDb(
	organizationId: string,
	mode: ClinicMode,
	externalTx?: TenantDb | undefined,
) {
	if (useInMemory()) return updateClinicModeInMemory(mode);
	const run = async (tx: TenantDb) => {
		await tx
			.update(schema.organizations)
			.set({ clinicMode: mode })
			.where(eq(schema.organizations.id, organizationId));
	};
	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

export async function updateClinicProfileInDb(
	organizationId: string,
	input: UpdateClinicProfileInput,
	externalTx?: TenantDb | undefined,
) {
	if (useInMemory()) return updateClinicProfileInMemory(input);
	const updateData: Partial<typeof schema.organizations.$inferInsert> = { updatedAt: new Date() };
	if (input.legalName !== undefined && input.legalName !== null) updateData.name = input.legalName;
	if (input.inn !== undefined) updateData.inn = input.inn;
	if (input.kpp !== undefined) updateData.kpp = input.kpp;
	if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
	if (input.address !== undefined) updateData.legalAddress = input.address;
	if (input.email !== undefined) updateData.email = input.email;
	if (input.website !== undefined) updateData.website = input.website;
	if (input.medicalLicenseNumber !== undefined) {
		updateData.medicalLicenseNumber = input.medicalLicenseNumber;
	}
	if (input.medicalLicenseIssuedAt !== undefined) {
		updateData.medicalLicenseIssuedAt = input.medicalLicenseIssuedAt;
	}
	if (input.medicalLicenseIssuer !== undefined) {
		updateData.medicalLicenseIssuer = input.medicalLicenseIssuer;
	}
	if (input.bankDetails !== undefined) updateData.bankDetails = input.bankDetails;
	if (input.signatoryName !== undefined) updateData.signatoryName = input.signatoryName;
	if (input.signatoryTitle !== undefined) updateData.signatoryTitle = input.signatoryTitle;
	if (input.scheduleDefaults !== undefined) {
		updateData.clinicSchedule = input.scheduleDefaults;
	}

	const run = async (tx: TenantDb) => {
		if (
			input.logoUrl !== undefined ||
			input.stampUrl !== undefined ||
			input.defaultVisitMinutes !== undefined ||
			input.egiszEnabled !== undefined ||
			input.egiszAutonomousMode !== undefined
		) {
			const [currentOrg] = await tx
				.select({ flags: schema.organizations.workspaceFeatureFlags })
				.from(schema.organizations)
				.where(eq(schema.organizations.id, organizationId))
				.limit(1);
			const existingFlags =
				(currentOrg?.flags as Record<string, unknown> | null) ?? {};
			const updatedFlags = { ...existingFlags };
			if (input.logoUrl !== undefined) updatedFlags.logoUrl = input.logoUrl;
			if (input.stampUrl !== undefined) updatedFlags.stampUrl = input.stampUrl;
			if (input.defaultVisitMinutes !== undefined) {
				updatedFlags.defaultVisitMinutes = input.defaultVisitMinutes;
			}
			if (input.egiszEnabled !== undefined) {
				updatedFlags.egiszEnabled = input.egiszEnabled;
			}
			if (input.egiszAutonomousMode !== undefined) {
				updatedFlags.egiszAutonomousMode = input.egiszAutonomousMode;
			}
			updateData.workspaceFeatureFlags = updatedFlags;
		}

		await tx
			.update(schema.organizations)
			.set(updateData)
			.where(eq(schema.organizations.id, organizationId));

		const clinicUpdateData: Partial<typeof schema.clinics.$inferInsert> = {};
		if (input.clinicName !== undefined) clinicUpdateData.name = input.clinicName;
		if (input.address !== undefined) clinicUpdateData.address = input.address;
		if (input.phone !== undefined) clinicUpdateData.phone = input.phone;
		if (input.timezone !== undefined) clinicUpdateData.timezone = input.timezone;

		if (Object.keys(clinicUpdateData).length > 0) {
			const targetId = input.branchId || input.clinicId;
			const query = targetId
				? and(eq(schema.clinics.id, targetId), eq(schema.clinics.organizationId, organizationId))
				: eq(schema.clinics.organizationId, organizationId);

			const existingClinic = await tx
				.select({ id: schema.clinics.id })
				.from(schema.clinics)
				.where(query)
				.limit(1);

			const firstClinic = existingClinic[0];
			if (firstClinic) {
				await tx
					.update(schema.clinics)
					.set(clinicUpdateData)
					.where(
						and(
							eq(schema.clinics.id, firstClinic.id),
							eq(schema.clinics.organizationId, organizationId),
						),
					);
			} else {
				await tx.insert(schema.clinics).values({
					organizationId,
					name: input.clinicName ?? "Клиника",
					address: input.address ?? null,
					phone: input.phone ?? null,
					timezone: input.timezone ?? "Europe/Samara",
				});
			}
		}
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
