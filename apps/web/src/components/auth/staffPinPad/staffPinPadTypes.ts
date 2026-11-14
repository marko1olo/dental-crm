import type { StaffUnlockMember } from "../staffUnlockState";

export type StaffUser = StaffUnlockMember & {
	fullName?: string;
	role?: string;
	organizationId?: string;
	email?: string;
	phone?: string;
	[key: string]: unknown;
};

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
