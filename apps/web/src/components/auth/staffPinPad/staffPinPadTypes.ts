import type { StaffUnlockMember } from "../staffUnlockState";

export type StaffUser = StaffUnlockMember & {
	fullName?: string | undefined;
	role?: string | undefined;
	organizationId?: string | undefined;
	email?: string | undefined;
	phone?: string | undefined;
	[key: string]: unknown;
};

export function demoStaffToStaffUser(staff: {
	id: string;
	organizationId?: string | undefined;
	fullName?: string | undefined;
	role?: string | undefined;
	email?: string | undefined;
	phone?: string | undefined;
	active?: boolean | undefined;
	color?: string | undefined;
}): StaffUser {
	return {
		id: staff.id,
		organizationId: staff.organizationId,
		fullName: staff.fullName,
		role: staff.role,
		email: staff.email,
		phone: staff.phone,
		active: staff.active,
		color: staff.color,
	};
}

export interface StaffPinPadProps {
	/**
	 * Список сотрудников КАК ПРИШЁЛ, без подстановок.
	 * Тип `unknown`, а не `any[]`. Отсутствие списка обязано доехать сюда как отсутствие.
	 */
	staffMembers: unknown;
	/** Сводка клиники ещё едет: список отсутствует закономерно, это не отказ. */
	staffListLoading: boolean;
	/**
	 * Код ответа, по которому не удалось прочитать список; `null` — до сервера не дошли вовсе.
	 */
	staffListStatus: number | null;
	onUnlockSuccess: (user: StaffUser) => void;
	onClinicLogout: () => void;
	/** Перечитать данные клиники: единственный способ повторить, кроме перезахода. */
	onRetryStaffList: () => void;
}
