/**
 * @file staffMutations.ts
 * @description Layer 3: Staff member creation, profile updates, working hours mutations.
 */
import { organizationId } from "./fixtureIds.js";
import { recordAuditEvent } from "./audit.js";


import type {
	CreateStaffMemberInput,
	StaffMember,
	UpdateStaffMemberProfileInput,
	UpdateStaffWorkingHoursInput,
} from "@dental/shared";
import { randomUUID } from "node:crypto";
import { normalizeStaffWorkingHours, staffMembers, permissionsForRole } from "./staff.js";
import { assertStaffWorkingHoursCoverExistingAppointments } from "./scheduleValidation.js";
import { persistMutableState } from "./stateNotifier.js";
import { nullableTrimmed } from "./types.js";

export function createStaffMember(input: CreateStaffMemberInput): StaffMember {
	const createdAt = new Date().toISOString();
	const permissions = permissionsForRole(input.role);
	const member: StaffMember = {
		id: randomUUID(),
		organizationId,
		fullName: input.fullName.trim(),
		role: input.role,
		specialties: input.specialties.length ? input.specialties : ["universal"],
		phone: nullableTrimmed(input.phone),
		email: nullableTrimmed(input.email),
		active: true,
		...permissions,
		color:
			input.role === "doctor"
				? "#0f766e"
				: input.role === "assistant"
					? "#a34f32"
					: "#b8781f",
		workingHours: normalizeStaffWorkingHours(input.workingHours ?? null),
		createdAt,
		updatedAt: createdAt,
	};
	staffMembers.unshift(member);
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_created",
		reason: `${member.fullName} добавлен как ${member.role}.`,
	});
	return member;
}

export function updateStaffWorkingHours(
	staffId: string,
	input: UpdateStaffWorkingHoursInput,
): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	const workingHours = normalizeStaffWorkingHours(input.workingHours);
	assertStaffWorkingHoursCoverExistingAppointments(member, workingHours);
	member.workingHours = workingHours;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_working_hours_updated",
		reason: `${member.fullName}: рабочее расписание обновлено.`,
	});
	return member;
}


export function updateStaffMemberProfile(
	staffId: string,
	input: UpdateStaffMemberProfileInput,
): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	if (input.fullName !== undefined) member.fullName = input.fullName.trim();
	if (input.role !== undefined) {
		member.role = input.role;
		// Права привязаны к роли. Смена роли без пересчета прав оставила бы
		// бывшему администратору доступ к кассе и импортам.
		const permissions = permissionsForRole(input.role);
		member.canSignMedicalRecords = permissions.canSignMedicalRecords;
		member.canManageMoney = permissions.canManageMoney;
		member.canManageImports = permissions.canManageImports;
	}
	if (input.phone !== undefined) member.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined) member.email = nullableTrimmed(input.email);
	if (input.active !== undefined) member.active = input.active;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_profile_updated",
		reason: `${member.fullName}: карточка сотрудника обновлена.`,
	});
	return member;
}

/**
 * Мягкое отключение сотрудника вместо физического удаления: на строку в users
 * ссылаются приемы (doctor_user_id, assistant_user_id) и медицинские записи.
 * Удаление строки либо упало бы на внешнем ключе, либо обезличило историю
 * лечения — это медицинские данные, их нельзя терять.
 */
export function deactivateStaffMember(staffId: string): StaffMember {
	const member = staffMembers.find((item) => item.id === staffId);
	if (!member) {
		throw new Error("Сотрудник не найден.");
	}
	member.active = false;
	member.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "staff_member",
		entityId: member.id,
		action: "staff_deactivated",
		reason: `${member.fullName}: сотрудник отключен, приемы и медицинские записи сохранены.`,
	});
	return member;
}

