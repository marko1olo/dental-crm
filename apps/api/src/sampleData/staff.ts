/**
 * @file staff.ts
 * @description Layer 1: Staff members, roles, access policies, working hours defaults.
 */
import { createHash } from "node:crypto";
import { defaultClinicScheduleDefaults, clockToMinutes, isClockTime, defaultStaffWorkingHours } from "./organizations.js";


import type {
	RoleAccessPolicy,
	StaffMember,
	StaffWorkingHours,
} from "@dental/shared";
import { organizationId, doctorUserId, assistantUserId, nowIso } from "./fixtureIds.js";

const staffMembers: StaffMember[] = [
	{
		id: "e44d32ca-7777-4c00-a001-c88f01b92e21",
		organizationId,
		fullName: "Петров Иван Иванович",
		role: "owner",
		specialties: [],
		phone: "+7 927 555-55-55",
		email: "owner@example.com",
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: true,
		canManageImports: true,
		color: "#1e293b",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: doctorUserId,
		organizationId,
		fullName: "Иванова Марина Сергеевна",
		role: "doctor",
		specialties: ["therapist", "orthopedist"],
		phone: "+7 927 111-22-33",
		email: "doctor@example.com",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney: false,
		canManageImports: false,
		color: "#0f766e",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: "93bca14f-a11d-4088-9b48-cb7a0fd4c9ef",
		organizationId,
		fullName: "Кузнецова Анна",
		role: "administrator",
		specialties: ["universal"],
		phone: "+7 927 222-10-10",
		email: "admin@example.com",
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: true,
		canManageImports: true,
		color: "#b8781f",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
	{
		id: assistantUserId,
		organizationId,
		fullName: "Садыкова Эльмира",
		role: "assistant",
		specialties: ["therapist", "surgeon"],
		phone: "+7 927 900-77-10",
		email: null,
		active: true,
		canSignMedicalRecords: false,
		canManageMoney: false,
		canManageImports: false,
		color: "#a34f32",
		createdAt: nowIso,
		updatedAt: nowIso,
	},
];

const roleAccessPolicies: RoleAccessPolicy[] = [
	{
		role: "owner",
		title: "Владелец клиники",
		scope: "network",
		defaultSection: "settings",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		canWrite: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		restricted: [],
		requiresApprovalFor: [
			"массовый импорт",
			"изменение юридических шаблонов",
			"сетевое изменение прав",
		],
		auditEvents: [
			"settings.update",
			"roles.update",
			"import.commit",
			"document.template.update",
		],
	},
	{
		role: "doctor",
		title: "Врач",
		scope: "clinic",
		defaultSection: "visit",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"communications",
		],
		canWrite: ["imaging", "visit", "documents", "communications"],
		restricted: ["finance", "settings"],
		requiresApprovalFor: [
			"подпись ЭМК",
			"изменение диагноза после закрытия",
			"игнор клинического предупреждения",
		],
		auditEvents: ["visit.sign", "clinical.override", "document.create"],
	},
	{
		role: "administrator",
		title: "Администратор",
		scope: "clinic",
		defaultSection: "schedule",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
		],
		canWrite: [
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
		],
		restricted: ["visit", "settings"],
		requiresApprovalFor: [
			"выдача медицинского документа",
			"возврат оплаты",
			"изменение персональных данных без контакта",
		],
		auditEvents: [
			"appointment.update",
			"payment.create",
			"communication.complete",
			"patient.update",
		],
	},
	{
		role: "assistant",
		title: "Ассистент",
		scope: "clinic",
		defaultSection: "shift",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"communications",
		],
		canWrite: ["shift", "imaging", "communications"],
		restricted: ["documents", "finance", "settings"],
		requiresApprovalFor: [
			"медицинская запись",
			"финансовое действие",
			"выдача документа пациенту",
		],
		auditEvents: ["chair.prepare", "communication.complete", "imaging.attach"],
	},
	{
		role: "manager",
		title: "Управляющий",
		scope: "branch",
		defaultSection: "settings",
		canRead: [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		canWrite: [
			"schedule",
			"patients",
			"imaging",
			"documents",
			"finance",
			"communications",
			"settings",
		],
		restricted: ["visit"],
		requiresApprovalFor: [
			"клиническое правило",
			"изменение подписанной ЭМК",
			"центральный шаблон сети",
		],
		auditEvents: [
			"import.commit",
			"rule.update",
			"staff.create",
			"chair.create",
		],
	},
];

function replaceCollection<T>(target: T[], source: T[] | undefined): void {
	if (!source) return;
	target.splice(0, target.length, ...source);
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}


function normalizeStaffWorkingHours(
	input?: StaffWorkingHours | null,
): StaffWorkingHours {
	const byWeekday = new Map<number, StaffWorkingHours[number]>();
	if (Array.isArray(input)) {
		input.forEach((day) => {
			if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6)
				return;
			const start = isClockTime(day.start)
				? day.start
				: defaultClinicScheduleDefaults.workdayStart;
			const requestedEnd = isClockTime(day.end)
				? day.end
				: defaultClinicScheduleDefaults.workdayEnd;
			const end =
				clockToMinutes(requestedEnd) > clockToMinutes(start)
					? requestedEnd
					: defaultClinicScheduleDefaults.workdayEnd;
			byWeekday.set(day.weekday, {
				weekday: day.weekday,
				enabled: Boolean(day.enabled),
				start,
				end,
			});
		});
	}
	return defaultStaffWorkingHours().map(
		(fallback) => byWeekday.get(fallback.weekday) ?? fallback,
	);
}

function permissionsForRole(role: StaffMember["role"]) {
	return {
		canSignMedicalRecords: role === "doctor" || role === "owner",
		canManageMoney:
			role === "administrator" || role === "manager" || role === "owner",
		canManageImports:
			role === "administrator" || role === "manager" || role === "owner",
	};
}

function nullableTrimmed(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}


export { staffMembers, normalizeStaffWorkingHours, roleAccessPolicies, permissionsForRole };
