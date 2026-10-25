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
import { getRequestIdentity } from "../../security/identity.js";
import { repairMojibakeDeep } from "../../text/repairMojibake.js";
import type { ExtendedHrProfileStorage, StaffAuthContext } from "./types.js";

export async function resolveOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<StaffAuthContext | null> {
	/*
	 * ЧТО БЫЛО. Три ветки, из которых две открывали кадровые данные без входа:
	 *   1. подписанный токен: роль по умолчанию «owner», если в токене нет
	 *      личности (кабинетный токен) — зарплаты и ПДн коллег раскрывались
	 *      любой стойке с токеном кабинета;
	 *   2. неподписанная организация: та же роль «owner» по умолчанию;
	 *   3. ВООБЩЕ БЕЗ ТОКЕНА: первая организация из базы + callerRole «owner»
	 *      (комментарий обещал «Fallback for development», но проверки режима
	 *      не было никакой). Запрос без единого заголовка получал список всех
	 *      сотрудников с окладами и мог менять чужие карточки, роли и ставки —
	 *      тот же безгардный паттерн, что был закрыт в diary/shifts.
	 *
	 * ЧТО ЗДЕСЬ. Организация — ТОЛЬКО из identity (подписанный токен либо
	 * dev-заголовок, который security/identity.ts сам ограничивает по режиму и
	 * методу запроса). Роль передаётся как есть: null означает «человека нет»,
	 * и все проверки прав ниже на null закрываются (fail closed).
	 */
	const identity = getRequestIdentity(request);
	if (identity.organizationId) {
		return {
			orgId: identity.organizationId,
			callerRole: identity.role,
			callerUserId: identity.userId,
		};
	}

	reply.code(401);
	reply.send({
		error: "Unauthorized",
		message:
			"Не удалось определить организацию клиники: поддельный или отсутствующий токен.",
	});
	return null;
}

export function assembleStaffProfile(
	// biome-ignore lint/suspicious/noExplicitAny: DB row representation
	user: any,
	// biome-ignore lint/suspicious/noExplicitAny: DB commission row
	commissionRow: any,
	callerRole: string | null,
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
