import {
	canAccessFullPatientPii,
	canEditManagementNotes,
	canManageStaffAuthority,
	canViewAllDoctorPayrolls,
	canViewManagementNotes,
	canViewOwnPayroll,
	formatStaffSnils,
	maskRussianPhone,
	maskRussianSnils,
	type StaffProfileExtended,
	type StaffRole,
	validateStaffInn,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { repairMojibakeDeep } from "../../text/repairMojibake.js";
import type { ExtendedHrProfileStorage, StaffAuthContext } from "./types.js";

export async function resolveOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<StaffAuthContext | null> {
	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		return {
			orgId: identity.organizationId,
			callerRole: identity.role || "owner",
			callerUserId: identity.userId,
		};
	}

	if (identity.organizationId) {
		return {
			orgId: identity.organizationId,
			callerRole: identity.role || "owner",
			callerUserId: identity.userId,
		};
	}

	// Fallback for development if no token provided
	const [firstOrg] = await db
		.select({ id: schema.organizations.id })
		.from(schema.organizations)
		.limit(1);

	if (firstOrg?.id) {
		return {
			orgId: firstOrg.id,
			callerRole: "owner",
			callerUserId: null,
		};
	}

	reply.code(401);
	reply.send({
		error: "Unauthorized",
		message: "Не удалось определить организацию клиники: поддельный или отсутствующий токен.",
	});
	return null;
}

export function assembleStaffProfile(
	// biome-ignore lint/suspicious/noExplicitAny: DB row representation
	user: any,
	// biome-ignore lint/suspicious/noExplicitAny: DB commission row
	commissionRow: any,
	callerRole: string,
	callerUserId?: string | null,
): StaffProfileExtended {
	const uiPrefs = (user.uiPreferences as Record<string, unknown>) || {};
	const hr = (uiPrefs.hrProfile as ExtendedHrProfileStorage) || {};

	const isSelf = Boolean(callerUserId && callerUserId === user.id);
	const allowManagementNotes = canViewManagementNotes(callerRole);
	const allowPayrolls = canViewAllDoctorPayrolls(callerRole) || (isSelf && canViewOwnPayroll(callerRole));
	const allowFullPii = canAccessFullPatientPii(callerRole) || isSelf;

	const rawCommissionPct = commissionRow?.commissionPct
		? Number(commissionRow.commissionPct)
		: commissionRow?.commissionPercent
			? Number(commissionRow.commissionPercent)
			: 25;
	const rawMaterialCostDeductionPct = commissionRow?.materialCostDeductionPct
		? Number(commissionRow.materialCostDeductionPct)
		: 0;
	const rawLabCostDeductionPct = commissionRow?.labCostDeductionPct
		? Number(commissionRow.labCostDeductionPct)
		: 0;

	// Финансовая изоляция (Мандаты 8e, 8n): ставки и оклады скрыты для рядового персонала
	const commissionPct = allowPayrolls ? rawCommissionPct : 0;
	const materialCostDeductionPct = allowPayrolls ? rawMaterialCostDeductionPct : 0;
	const labCostDeductionPct = allowPayrolls ? rawLabCostDeductionPct : 0;
	const baseSalaryRub = allowPayrolls ? (hr.baseSalaryRub || 0) : 0;

	// 152-ФЗ: маскирование личных телефонов и СНИЛС коллег в списках для защиты от утечек
	const rawPhone = user.phone ? repairMojibakeDeep(user.phone) : null;
	const displayPhone = allowFullPii ? rawPhone : (rawPhone ? maskRussianPhone(rawPhone) : null);
	const rawSnils = user.snils ? formatStaffSnils(user.snils) : null;
	const displaySnils = allowFullPii ? rawSnils : (rawSnils ? maskRussianSnils(rawSnils) : null);
	const rawInn = hr.inn ? (validateStaffInn(hr.inn).formatted || hr.inn) : null;
	const displayInn = allowFullPii ? rawInn : (rawInn ? "••••••••••" + String(rawInn).slice(-2) : null);

	return {
		id: user.id,
		organizationId: user.organizationId,
		fullName: repairMojibakeDeep(user.fullName),
		role: (user.role as StaffRole) || "doctor",
		specialties: Array.isArray(user.specialties) ? user.specialties : ["universal"],
		phone: displayPhone,
		email: user.email ? repairMojibakeDeep(user.email) : null,
		active: user.isActive ?? true,
		color: "#3b82f6",
		avatarUrl: null,

		// Колонка 1: Реквизиты
		snils: displaySnils,
		inn: displayInn,
		medicalBookNumber: hr.medicalBookNumber ? repairMojibakeDeep(hr.medicalBookNumber) : null,
		medicalBookCheckupDate: hr.medicalBookCheckupDate || null,
		minzdravAccreditationDate: hr.minzdravAccreditationDate || null,
		minzdravAccreditationSpecialty: hr.minzdravAccreditationSpecialty
			? repairMojibakeDeep(hr.minzdravAccreditationSpecialty)
			: null,
		clinicalNotes: hr.clinicalNotes ? repairMojibakeDeep(hr.clinicalNotes) : null,
		managementNotes: allowManagementNotes
			? hr.managementNotes
				? repairMojibakeDeep(hr.managementNotes)
				: null
			: null,

		// Колонка 2: Назначения и тарификация
		assignedBranches: Array.isArray(hr.assignedBranches) ? hr.assignedBranches : [],
		assignedCabinetRooms: Array.isArray(hr.assignedCabinetRooms) ? hr.assignedCabinetRooms : [],
		assignedChairIds: Array.isArray(hr.assignedChairIds) ? hr.assignedChairIds : [],
		priceCategory: hr.priceCategory || "standard",
		baseSalaryRub,
		commissionPct,
		materialCostDeductionPct,
		labCostDeductionPct,

		// Колонка 3: Безопасность
		canSignMedicalRecords: Boolean(user.canSignMedicalRecords),
		canManageMoney: Boolean(user.canManageMoney),
		canManageImports: Boolean(user.canManageImports),
		hasPinCode: Boolean(user.pinCodeHash),
		hasPassword: Boolean(user.passwordHash),
		passwordEntropyBits:
			hr.passwordEntropyBits !== undefined
				? hr.passwordEntropyBits
				: user.passwordHash
					? 64
					: 0,
		lastLoginAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : null,
		currentSessionIp: user.currentSessionId ? "127.0.0.1 (активно)" : null,
		currentSessionUserAgent: user.currentSessionId ? "DENTE Clinic Workstation" : null,
		isSessionActive: Boolean(user.currentSessionId),

		createdAt: user.createdAt?.toISOString
			? user.createdAt.toISOString()
			: new Date().toISOString(),
		updatedAt: user.createdAt?.toISOString
			? user.createdAt.toISOString()
			: new Date().toISOString(),
	};
}
