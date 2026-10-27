import type { StaffAuthorityFlagKey, StaffAuthorityFlagsDto } from "@dental/shared";

export type StaffMemberLite = {
	id?: string;
	fullName?: string;
	role?: string;
	active?: boolean;
	canSignMedicalRecords?: boolean;
	canManageMoney?: boolean;
	canManageImports?: boolean;
};

export type Flags = StaffAuthorityFlagsDto;

export type RowState = {
	staffId: string;
	name: string;
	role: string;
	roleDerived: Flags;
	effective: Flags;
	grants: Flags | null;
};

export type SaveState =
	| { kind: "idle" }
	| { kind: "saving"; staffId: string; flag: StaffAuthorityFlagKey }
	| { kind: "failed"; message: string };

export const FLAG_TITLES: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "Подпись медкарты (ЭМК)",
	canManageMoney: "Касса и приём оплат",
	canManageImports: "Перенос базы и настройки",
};

export const FLAG_HINTS: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "Право подписывать дневники приёма, ставить диагнозы и завершать приём.",
	canManageMoney: "Проводить наличные и безналичные оплаты, кассовые чеки и возвраты.",
	canManageImports: "Перенос базы пациентов и прайса из других программ.",
};

export function flagsFromMember(member: StaffMemberLite): Flags {
	return {
		canSignMedicalRecords: Boolean(member.canSignMedicalRecords),
		canManageMoney: Boolean(member.canManageMoney),
		canManageImports: Boolean(member.canManageImports),
	};
}
