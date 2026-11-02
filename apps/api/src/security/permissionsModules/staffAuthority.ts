/**
 * staffAuthority.ts — расчет флагов полномочий сотрудника в клинике.
 *
 * Флаги передаются клиенту в карточке сотрудника (staffMemberSchema:
 * canSignMedicalRecords, canManageMoney, canManageImports).
 *
 * Источник истины — матрица ROLE_PERMISSIONS:
 *  • canSignMedicalRecords → clinical.write (владелец, admin, врач)
 *  • canManageMoney → finance.write (владелец, admin, управляющий, администратор, врач — Мандаты 8e/8n: соло-врач)
 *  • canManageImports → settings.write (владелец и admin)
 *
 * Для соло-врача (isSoloDoctor: true) все три флага активируются безусловно (Мандат 8n).
 */

import { roleHasPermission } from "./permissionChecks.js";

export interface StaffAuthorityFlags {
	canSignMedicalRecords: boolean;
	canManageMoney: boolean;
	canManageImports: boolean;
}

export function staffAuthorityFlags(
	role: string | null | undefined,
	isSoloDoctor?: boolean,
): StaffAuthorityFlags {
	const isSolo =
		Boolean(isSoloDoctor) &&
		(role?.toLowerCase() === "doctor" || role?.toLowerCase() === "owner");
	return {
		canSignMedicalRecords: isSolo || roleHasPermission(role, "clinical.write"),
		canManageMoney: isSolo || roleHasPermission(role, "finance.write"),
		canManageImports: isSolo || roleHasPermission(role, "settings.write"),
	};
}
