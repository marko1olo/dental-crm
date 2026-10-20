import type { FastifyRequest } from "fastify";

export const CLINIC_TOKEN_HEADER = "x-dente-clinic-token";
export const STAFF_TOKEN_HEADER = "x-dente-staff-token";
export const ORGANIZATION_HEADER = "x-organization-id";

export type StaffRole =
	| "owner"
	| "admin"
	| "administrator"
	| "doctor"
	| "assistant"
	| "manager"
	| string;

export interface RequestIdentity {
	organizationId: string | null;
	userId: string | null;
	role: StaffRole | null;
	fullName: string | null;
	sessionId: string | null;
	/** true, если организация получена из проверенного токена, а не из dev-заголовка. */
	verified: boolean;
}

export const EMPTY_IDENTITY: RequestIdentity = {
	organizationId: null,
	userId: null,
	role: null,
	fullName: null,
	sessionId: null,
	verified: false,
};

/** Контекст активной сессии рабочего кабинета клиники */
export interface ClinicSession {
	organizationId: string;
	clinicName: string;
	createdAt?: number;
	expiresAt?: number;
}

/** Контекст авторизованного сотрудника клиники */
export interface StaffMemberContext {
	userId: string;
	fullName: string;
	role: StaffRole;
	organizationId: string;
	sessionId: string | null;
}

/** Роли, которым разрешены административные действия. */
export const ADMIN_ROLES = ["owner", "admin", "administrator"] as const;

/** Метка отказа: попытка мутации данных под непроверенным заголовком */
export const UNVERIFIED_MUTATION_REJECTION = "unverified-organization-cannot-mutate";
export type IdentityRejection = typeof UNVERIFIED_MUTATION_REJECTION;
