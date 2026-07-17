import type {
	ClinicMode,
	ClinicProfile,
	ClinicSettings,
	CreateChairInput,
	CreateStaffMemberInput,
	UiPreferences,
	UpdateClinicProfileInput,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

// Dummy fallback for legacy UI preferences if multiple users exist
export async function getUiPreferencesFromDb(
	organizationId: string,
): Promise<UiPreferences | null> {
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId))
		.limit(1);
	if (!user || !user.uiPreferences) return null;
	return user.uiPreferences as UiPreferences;
}

export async function saveUiPreferencesInDb(
	organizationId: string,
	prefs: UiPreferences,
): Promise<void> {
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId))
		.limit(1);
	if (!user) throw new Error("No users found to save preferences to.");
	await db
		.update(schema.users)
		.set({ uiPreferences: prefs })
		.where(
			and(
				eq(schema.users.id, user.id),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

export async function getClinicSettingsFromDb(
	organizationId: string,
): Promise<ClinicSettings> {
	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) throw new Error("Organization not found");

	const [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);

	const staff = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId));
	const chairs = await db
		.select()
		.from(schema.clinicChairs)
		.where(eq(schema.clinicChairs.organizationId, organizationId));

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
		mode: (() => {
			const mode = org.clinicMode || "one_chair";
			if (mode === "demo") return "one_chair";
			if (mode === "single") return "one_chair";
			if (mode === "network") return "network_clinic";
			return mode as any;
		})(),
		timezone: clinic?.timezone || "Europe/Samara",
		defaultVisitMinutes: (() => {
			const saved = (org.clinicSchedule as any)?.defaultVisitMinutes;
			if (typeof saved === "number") return saved;
			const mode = org.clinicMode;
			if (mode === "solo_doctor") return 60;
			if (mode === "network_clinic") return 30;
			return 45;
		})(),
		scheduleDefaults: (org.clinicSchedule as any) || {
			monday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			tuesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			wednesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			thursday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			friday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			saturday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
			sunday: { isWorking: false, startsAt: "08:00", endsAt: "20:00" },
		},
		networkEnabled: false,
		egiszEnabled: false,
		updatedAt: org.updatedAt.toISOString(),
		specializations: (org.specializations as any) || [],
		workingHours: (org.workingHours as any) || null,
		currency: org.currency && org.currency !== "???" ? org.currency : "₽",
		themeColor: org.themeColor || "teal",
		logoUrl: org.logoUrl || undefined,
		stampUrl: org.stampUrl || undefined,
		marketingData: org.marketingData as any,
		hasAssistants: (org as any).hasAssistants ?? true,
		hasMultipleChairs: (org as any).hasMultipleChairs ?? true,
		hasDentalLab: (org as any).hasDentalLab ?? true,
		hasInsuranceCoPay: (org as any).hasInsuranceCoPay ?? true,
		hasInstallments: (org as any).hasInstallments ?? true,
		hasOrthodontics: (org as any).hasOrthodontics ?? true,
		hasTasks: (org as any).hasTasks ?? true,
		hasReclamations: (org as any).hasReclamations ?? true,
		workspacePreset: (org as any).workspacePreset ?? "enterprise",
		onboardingCompleted: (org as any).onboardingCompleted ?? false,
		hasPediatricMode: (org as any).hasPediatricMode ?? false,
		isOmniRole: (org as any).isOmniRole ?? false,
	};

	return {
		profile,
		staff: staff.map((s) => ({
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
			workingHours: (() => {
				const wh = s.workingHours as any;
				if (!wh) return null;
				if (Array.isArray(wh)) return wh;
				if (wh && Array.isArray(wh.workingHours)) return wh.workingHours;
				return null;
			})(),
			createdAt: s.createdAt.toISOString(),
			updatedAt: s.createdAt.toISOString(),
		})),
		chairs: chairs.map((c) => ({
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
			workingHours: (() => {
				const wh = c.workingHours as any;
				if (!wh) return null;
				if (Array.isArray(wh)) return wh;
				if (wh && Array.isArray(wh.workingHours)) return wh.workingHours;
				return null;
			})(),
		})),
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [
			{
				role: "doctor",
				title: "Врач",
				scope: "personal",
				defaultSection: "schedule",
				canRead: ["schedule", "patients", "visit", "documents", "imaging"],
				canWrite: ["patients", "visit", "documents", "imaging"],
				restricted: ["finance", "settings"],
				requiresApprovalFor: ["delete_patient", "change_price"],
				auditEvents: ["login", "view_patient"],
			},
			{
				role: "administrator",
				title: "Администратор",
				scope: "clinic",
				defaultSection: "schedule",
				canRead: ["schedule", "patients", "finance", "communications"],
				canWrite: ["schedule", "patients", "finance", "communications"],
				restricted: ["settings", "visit", "imaging"],
				requiresApprovalFor: ["delete_patient", "refund"],
				auditEvents: ["login", "create_patient", "delete_patient"],
			},
			{
				role: "owner",
				title: "Владелец",
				scope: "clinic",
				defaultSection: "schedule",
				canRead: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
				canWrite: ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"],
				restricted: [],
				requiresApprovalFor: [],
				auditEvents: ["login"],
			}
		],
		modeHints: [],
		soloDoctorMode: false,
	};
}

export async function updateClinicModeInDb(
	organizationId: string,
	mode: ClinicMode,
) {
	const [org] = await db
		.select({
			clinicMode: schema.organizations.clinicMode,
			clinicSchedule: schema.organizations.clinicSchedule,
		})
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);

	let modeFlags: any = {};
	if (mode === "solo_doctor") {
		modeFlags = {
			hasAssistants: false,
			hasMultipleChairs: false,
			hasDentalLab: false,
			hasInsuranceCoPay: false,
			hasInstallments: false,
			hasOrthodontics: false,
			hasTasks: true,
			hasReclamations: false,
			hasPayrollModule: false,
			hasMarketingModule: false,
			hasAnalyticsModule: false,
			hasInventoryModule: false,
			workspacePreset: "solo_therapist",
		};
	} else if (mode === "one_chair") {
		modeFlags = {
			hasAssistants: true,
			hasMultipleChairs: false,
			hasDentalLab: false,
			hasInsuranceCoPay: false,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPayrollModule: false,
			hasMarketingModule: false,
			hasAnalyticsModule: false,
			hasInventoryModule: true,
			workspacePreset: "prosthodontist",
		};
	} else if (mode === "small_clinic") {
		modeFlags = {
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPayrollModule: true,
			hasMarketingModule: false,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			workspacePreset: "family_clinic",
		};
	} else if (mode === "network_clinic") {
		modeFlags = {
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			workspacePreset: "enterprise",
		};
	}

	if (org) {
		const currentMode = org.clinicMode;
		const currentSchedule = (org.clinicSchedule as any) || {};
		const savedDuration = currentSchedule.defaultVisitMinutes;

		const currentModePreset =
			currentMode === "solo_doctor"
				? 60
				: currentMode === "network_clinic"
					? 30
					: 45;
		const nextModePreset =
			mode === "solo_doctor" ? 60 : mode === "network_clinic" ? 30 : 45;

		const isUsingPreset =
			savedDuration === undefined || savedDuration === currentModePreset;

		const updateData: any = {
			clinicMode: mode,
			...modeFlags,
		};
		if (isUsingPreset) {
			updateData.clinicSchedule = {
				...currentSchedule,
				defaultVisitMinutes: nextModePreset,
			};
		}

		await db
			.update(schema.organizations)
			.set(updateData)
			.where(eq(schema.organizations.id, organizationId));
	} else {
		await db
			.update(schema.organizations)
			.set({
				clinicMode: mode,
				...modeFlags,
			})
			.where(eq(schema.organizations.id, organizationId));
	}
}

export async function updateClinicProfileInDb(
	organizationId: string,
	input: UpdateClinicProfileInput,
) {
	const [org] = await db
		.select({ clinicSchedule: schema.organizations.clinicSchedule })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	const currentSchedule = (org?.clinicSchedule as any) || {};

	const [clinic] = await db
		.select({ timezone: schema.clinics.timezone })
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);
	const timezone = input.timezone || clinic?.timezone || "Europe/Samara";

	if (input.scheduleDefaults !== undefined) {
		const mergedSchedule = {
			...currentSchedule,
			...input.scheduleDefaults,
		};
		await assertClinicScheduleDefaultsCoverExistingAppointments(
			organizationId,
			mergedSchedule,
			timezone,
		);
	}

	const updateData: any = { updatedAt: new Date() };
	if (input.legalName !== undefined) updateData.name = input.legalName;
	if (input.inn !== undefined) updateData.inn = input.inn;
	if (input.kpp !== undefined) updateData.kpp = input.kpp;
	if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
	if (input.address !== undefined) updateData.legalAddress = input.address;
	if (input.email !== undefined) updateData.email = input.email;
	if (input.website !== undefined) updateData.website = input.website;
	if (input.medicalLicenseNumber !== undefined)
		updateData.medicalLicenseNumber = input.medicalLicenseNumber;
	if (input.medicalLicenseIssuedAt !== undefined)
		updateData.medicalLicenseIssuedAt = input.medicalLicenseIssuedAt;
	if (input.medicalLicenseIssuer !== undefined)
		updateData.medicalLicenseIssuer = input.medicalLicenseIssuer;
	if (input.bankDetails !== undefined)
		updateData.bankDetails = input.bankDetails;
	if (input.signatoryName !== undefined)
		updateData.signatoryName = input.signatoryName;
	if (input.signatoryTitle !== undefined)
		updateData.signatoryTitle = input.signatoryTitle;
	if (input.marketingData !== undefined)
		updateData.marketingData = input.marketingData;

	if (
		input.scheduleDefaults !== undefined ||
		input.defaultVisitMinutes !== undefined
	) {
		updateData.clinicSchedule = {
			...currentSchedule,
			...(input.scheduleDefaults !== undefined ? input.scheduleDefaults : {}),
			...(input.defaultVisitMinutes !== undefined
				? { defaultVisitMinutes: input.defaultVisitMinutes }
				: {}),
		};
	}

	await db
		.update(schema.organizations)
		.set(updateData)
		.where(eq(schema.organizations.id, organizationId));

	const clinicUpdateData: any = {};
	if (input.clinicName !== undefined) clinicUpdateData.name = input.clinicName;
	if (input.phone !== undefined) clinicUpdateData.phone = input.phone;
	if (input.timezone !== undefined) clinicUpdateData.timezone = input.timezone;

	if (Object.keys(clinicUpdateData).length > 0) {
		await db
			.update(schema.clinics)
			.set(clinicUpdateData)
			.where(eq(schema.clinics.organizationId, organizationId));
	}
}

export async function createStaffMemberInDb(
	organizationId: string,
	input: CreateStaffMemberInput,
) {
	await db.transaction(async (tx) => {
		const result = await tx.insert(schema.users).values({
			organizationId,
			fullName: input.fullName,
			role: input.role,
			phone: input.phone || null,
			email: input.email || null,
			isActive: true,
			workingHours: input.workingHours,
		}).returning({ id: schema.users.id });
		
		const user = result[0];

		if (user && input.commissionRate !== undefined) {
			await tx.insert(schema.doctorCommissions).values({
				organizationId,
				userId: user.id,
				specialty: "universal",
				serviceCategory: "therapy",
				commissionPct: input.commissionRate,
				isActive: true,
			});
		}
	});
}

export async function updateStaffMemberInDb(
	organizationId: string,
	staffId: string,
	updates: Partial<{
		fullName: string | undefined;
		role: string | undefined;
		specialties: string[] | undefined;
		phone: string | null | undefined;
		email: string | null | undefined;
		active: boolean | undefined;
		canSignMedicalRecords: boolean | undefined;
		canManageMoney: boolean | undefined;
		canManageImports: boolean | undefined;
		color: string | undefined;
		commissionRate: number | undefined;
	}>,
) {
	const { commissionRate, ...userUpdates } = updates;
	await db.transaction(async (tx) => {
		if (Object.keys(userUpdates).length > 0) {
			await tx
				.update(schema.users)
				.set({ ...userUpdates, updatedAt: sql`now()` })
				.where(
					and(
						eq(schema.users.id, staffId),
						eq(schema.users.organizationId, organizationId),
					),
				);
		}

		if (commissionRate !== undefined) {
			const existing = await tx.select({ id: schema.doctorCommissions.id }).from(schema.doctorCommissions).where(
				and(
					eq(schema.doctorCommissions.userId, staffId),
					eq(schema.doctorCommissions.organizationId, organizationId),
				)
			).limit(1);

			if (existing.length > 0 && existing[0]) {
				await tx.update(schema.doctorCommissions)
					.set({ commissionPct: commissionRate, isActive: true })
					.where(eq(schema.doctorCommissions.id, existing[0].id));
			} else {
				await tx.insert(schema.doctorCommissions).values({
					organizationId,
					userId: staffId,
					specialty: "universal",
					serviceCategory: "therapy",
					commissionPct: commissionRate,
					isActive: true,
				});
			}
		}
	});
}

export async function updateStaffWorkingHoursInDb(
	organizationId: string,
	staffId: string,
	workingHours: any,
) {
	const [clinic] = await db
		.select({ timezone: schema.clinics.timezone })
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);
	const timezone = clinic?.timezone || "Europe/Samara";

	await assertStaffScheduleCoversExistingAppointments(
		organizationId,
		staffId,
		workingHours,
		timezone,
	);

	await db
		.update(schema.users)
		.set({ workingHours })
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

export async function updateStaffCredentialsInDb(
	organizationId: string,
	staffId: string,
	updates: { email?: string; passwordHash?: string; pinCodeHash?: string },
) {
	await db
		.update(schema.users)
		.set(updates)
		.where(
			and(
				eq(schema.users.id, staffId),
				eq(schema.users.organizationId, organizationId),
			),
		);
}

export async function createChairInDb(
	organizationId: string,
	input: CreateChairInput,
) {
	const [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);
	if (!clinic) throw new Error("Clinic not found");

	await db.insert(schema.clinicChairs).values({
		organizationId,
		clinicId: clinic.id,
		name: input.name,
		isActive: true,
		workingHours: input.workingHours,
	});
}

export async function updateChairWorkingHoursInDb(
	organizationId: string,
	chairId: string,
	workingHours: any,
) {
	const [clinic] = await db
		.select({ timezone: schema.clinics.timezone })
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);
	const timezone = clinic?.timezone || "Europe/Samara";

	await assertChairScheduleCoversExistingAppointments(
		organizationId,
		chairId,
		workingHours,
		timezone,
	);

	await db
		.update(schema.clinicChairs)
		.set({ workingHours })
		.where(
			and(
				eq(schema.clinicChairs.id, chairId),
				eq(schema.clinicChairs.organizationId, organizationId),
			),
		);
}

export async function deleteChairInDb(organizationId: string, chairId: string) {
	// First check if chair exists
	const [chair] = await db
		.select()
		.from(schema.clinicChairs)
		.where(
			and(
				eq(schema.clinicChairs.id, chairId),
				eq(schema.clinicChairs.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!chair) throw new Error("Кресло не найдено.");

	// Check if any appointments exist for this chair
	const activeAppointments = await db
		.select({ id: schema.appointments.id })
		.from(schema.appointments)
		.where(
			and(
				eq(schema.appointments.chairId, chairId),
				eq(schema.appointments.organizationId, organizationId)
			)
		)
		.limit(1);

	if (activeAppointments.length > 0) {
		throw new Error("Невозможно удалить кресло, так как к нему привязаны записи пациентов.");
	}

	await db
		.delete(schema.clinicChairs)
		.where(
			and(
				eq(schema.clinicChairs.id, chairId),
				eq(schema.clinicChairs.organizationId, organizationId),
			),
		);
}

// ============================================================================
// SCHEDULE NARROWING CONFLICT VALIDATION HELPERS
// ============================================================================

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getAppointmentTimeFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = appointmentTimeFormatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	appointmentTimeFormatters.set(timeZone, formatter);
	return formatter;
}

function appointmentClinicTimeParts(
	date: Date,
	sourceTimeZone: string,
): { weekday: number; minute: number } {
	const timeZone = sourceTimeZone || "Europe/Samara";
	const formatter = getAppointmentTimeFormatter(timeZone);
	const parts = new Map(
		formatter.formatToParts(date).map((part) => [part.type, part.value]),
	);
	const year = Number.parseInt(parts.get("year") ?? "", 10);
	const month = Number.parseInt(parts.get("month") ?? "", 10);
	const day = Number.parseInt(parts.get("day") ?? "", 10);
	const hour = Number.parseInt(parts.get("hour") ?? "", 10);
	const minute = Number.parseInt(parts.get("minute") ?? "", 10);

	if (![year, month, day, hour, minute].every(Number.isFinite)) {
		return {
			weekday: date.getDay(),
			minute: date.getHours() * 60 + date.getMinutes(),
		};
	}

	return {
		weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
		minute: (hour % 24) * 60 + minute,
	};
}

function clockToMinutes(value: string): number {
	const [hours = "0", minutes = "0"] = value.split(":");
	return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

async function getActiveAppointments(organizationId: string) {
	const activeApps = await db
		.select()
		.from(schema.appointments)
		.where(eq(schema.appointments.organizationId, organizationId));

	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		try {
			const { appointments } = await import("../sampleData.js");
			for (const app of appointments) {
				if (!activeApps.some((a) => a.id === app.id)) {
					activeApps.push({
						id: app.id,
						organizationId: app.organizationId,
						patientId: app.patientId || null,
						doctorUserId: app.doctorUserId || null,
						assistantUserId: app.assistantUserId || null,
						chairId: app.chairId || null,
						status: app.status as any,
						startsAt: new Date(app.startsAt),
						endsAt: new Date(app.endsAt),
						reason: app.reason || null,
						comment: app.comment || null,
						isSynced: (app as any).isSynced ?? false,
						version: (app as any).version ?? 1,
					});
				}
			}
		} catch (e) {
			// Ignore
		}
	}

	return activeApps;
}

async function assertClinicScheduleDefaultsCoverExistingAppointments(
	organizationId: string,
	schedule: any,
	timezone: string,
) {
	if (
		!schedule ||
		!schedule.workdayStart ||
		!schedule.workdayEnd ||
		!Array.isArray(schedule.workingDays)
	) {
		return;
	}
	const opensAt = clockToMinutes(schedule.workdayStart);
	const closesAt = clockToMinutes(schedule.workdayEnd);

	const activeApps = await getActiveAppointments(organizationId);

	const blockingAppointment = activeApps.find((app) => {
		if (app.endsAt.getTime() < Date.now()) return false;
		if (
			!["planned", "confirmed", "arrived", "in_treatment"].includes(app.status)
		)
			return false;

		const startParts = appointmentClinicTimeParts(app.startsAt, timezone);
		const endParts = appointmentClinicTimeParts(app.endsAt, timezone);

		if (!schedule.workingDays.includes(startParts.weekday)) {
			return true;
		}
		if (startParts.minute < opensAt || endParts.minute > closesAt) {
			return true;
		}
		return false;
	});

	if (blockingAppointment) {
		throw new Error(
			`Нельзя сократить расписание клиники: активная запись ${blockingAppointment.id} выходит за пределы нового окна или рабочих дней`,
		);
	}
}

async function assertStaffScheduleCoversExistingAppointments(
	organizationId: string,
	staffId: string,
	workingHours: any[],
	timezone: string,
) {
	if (!Array.isArray(workingHours)) return;

	const activeApps = await getActiveAppointments(organizationId);

	const blockingAppointment = activeApps.find((app) => {
		if (app.endsAt.getTime() < Date.now()) return false;
		if (
			!["planned", "confirmed", "arrived", "in_treatment"].includes(app.status)
		)
			return false;
		if (app.doctorUserId !== staffId && app.assistantUserId !== staffId)
			return false;

		const startParts = appointmentClinicTimeParts(app.startsAt, timezone);
		const endParts = appointmentClinicTimeParts(app.endsAt, timezone);

		const workingDay = workingHours.find(
			(day) => day.weekday === startParts.weekday,
		);
		if (!workingDay || !workingDay.enabled) {
			return true;
		}
		const opensAt = clockToMinutes(workingDay.start);
		const closesAt = clockToMinutes(workingDay.end);
		if (startParts.minute < opensAt || endParts.minute > closesAt) {
			return true;
		}
		return false;
	});

	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы: есть активная запись за пределами нового расписания",
		);
	}
}

async function assertChairScheduleCoversExistingAppointments(
	organizationId: string,
	chairId: string,
	workingHours: any[],
	timezone: string,
) {
	if (!Array.isArray(workingHours)) return;

	const activeApps = await getActiveAppointments(organizationId);

	const blockingAppointment = activeApps.find((app) => {
		if (app.endsAt.getTime() < Date.now()) return false;
		if (
			!["planned", "confirmed", "arrived", "in_treatment"].includes(app.status)
		)
			return false;
		if (app.chairId !== chairId) return false;

		const startParts = appointmentClinicTimeParts(app.startsAt, timezone);
		const endParts = appointmentClinicTimeParts(app.endsAt, timezone);

		const workingDay = workingHours.find(
			(day) => day.weekday === startParts.weekday,
		);
		if (!workingDay || !workingDay.enabled) {
			return true;
		}
		const opensAt = clockToMinutes(workingDay.start);
		const closesAt = clockToMinutes(workingDay.end);
		if (startParts.minute < opensAt || endParts.minute > closesAt) {
			return true;
		}
		return false;
	});

	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы кресла: есть активная запись за пределами нового расписания",
		);
	}
}
