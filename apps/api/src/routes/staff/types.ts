import type { StaffProfileExtended } from "@dental/shared";

export interface ExtendedHrProfileStorage {
	inn?: string | null | undefined;
	medicalBookNumber?: string | null | undefined;
	medicalBookCheckupDate?: string | null | undefined;
	minzdravAccreditationDate?: string | null | undefined;
	minzdravAccreditationSpecialty?: string | null | undefined;
	clinicalNotes?: string | null | undefined;
	managementNotes?: string | null | undefined;
	assignedBranches?: string[] | undefined;
	assignedCabinetRooms?: string[] | undefined;
	assignedChairIds?: string[] | undefined;
	priceCategory?: string | undefined;
	baseSalaryRub?: number | undefined;
	passwordEntropyBits?: number | undefined;
}

export interface StaffAuthContext {
	orgId: string;
	/**
	 * Роль из ПОДПИСАННОГО токена сотрудника. null — токен кабинета без входа
	 * конкретного человека: у такого запроса нет личности, а значит нет и прав
	 * «владельца по умолчанию». Все проверки ниже обязаны закрываться на null.
	 */
	callerRole: string | null;
	callerUserId: string | null;
}

export interface StaffSessionTelemetry {
	sessionId: string;
	ipAddress: string;
	userAgent: string;
	status: string;
	connectedAt: string;
	lastActivityAt: string;
}

export interface StaffSessionsReport {
	staffId: string;
	fullName: string;
	hasActiveSession: boolean;
	sessions: StaffSessionTelemetry[];
}
