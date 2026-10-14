import type { FastifyRequest } from "fastify";
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
} from "@dental/shared";
import { authTokenSecret, clinicalAdminSecret } from "../authSecret.js";
import { namedDevelopmentModeActive, unguardedBypassAllowed } from "../bypass.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import {
	ORGANIZATION_HEADER,
	UNVERIFIED_MUTATION_REJECTION,
	type IdentityRejection,
	type RequestIdentity,
} from "./identityTypes.js";

export function headerValue(request: FastifyRequest, name: string): string | null {
	const raw = request.headers[name];
	const value = Array.isArray(raw) ? raw[0] : raw;
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function devHeaderOrgAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_DEV_ALLOW_HEADER_ORG");
}

const READ_ONLY_METHODS: ReadonlySet<string> = new Set([
	"GET",
	"HEAD",
	"OPTIONS",
]);

export function isStateChangingRequest(request: FastifyRequest): boolean {
	const method =
		typeof request.method === "string"
			? request.method.trim().toUpperCase()
			: "";
	if (!method) return true;
	return !READ_ONLY_METHODS.has(method);
}

export function serverAcceptsNetworkConnections(request: FastifyRequest): boolean {
	const httpServer = (
		request as unknown as { server?: { server?: { listening?: unknown } } }
	).server?.server;
	if (!httpServer || typeof httpServer.listening !== "boolean") return true;
	return httpServer.listening;
}

export function unverifiedOrganizationUsable(request: FastifyRequest): boolean {
	if (!isStateChangingRequest(request)) return true;
	return !serverAcceptsNetworkConnections(request);
}

export function identityRejectionOf(
	request: FastifyRequest,
): IdentityRejection | null {
	return (
		(request as unknown as { __denteIdentityRejection?: IdentityRejection })
			.__denteIdentityRejection ?? null
	);
}

export function setIdentityRejection(
	request: FastifyRequest,
	rejection: IdentityRejection,
): void {
	(
		request as unknown as { __denteIdentityRejection?: IdentityRejection }
	).__denteIdentityRejection = rejection;
}

export function resolveDemoTokenIdentity(
	clinicToken: string | null,
	staffToken: string | null,
): Partial<RequestIdentity> | null {
	const isDemoClinicToken =
		typeof clinicToken === "string" &&
		(clinicToken.startsWith("demo-showcase-token") ||
			clinicToken.startsWith("demo-showcase-clinic-token"));
	const isDemoStaffToken =
		typeof staffToken === "string" &&
		(staffToken.startsWith("demo-showcase-staff-token") ||
			staffToken.startsWith("demo-token-"));

	if (!isDemoClinicToken && !isDemoStaffToken) {
		return null;
	}

	const roleHint = (
		(isDemoStaffToken
			? (staffToken ?? "")
					.replace("demo-showcase-staff-token-", "")
					.replace("demo-token-", "")
			: "") ||
		(isDemoClinicToken
			? (clinicToken ?? "")
					.replace("demo-showcase-token-", "")
					.replace("demo-showcase-clinic-token", "")
			: "")
	)
		.toLowerCase()
		.trim();

	let userId = DEMO_DOCTOR_1_ID;
	let role = "doctor";
	let fullName = "Д-р Соколов А. В.";

	if (roleHint === "orthopedist") {
		userId = DEMO_DOCTOR_ORTHOPEDIST_ID;
		role = "doctor";
		fullName = "Д-р Орлов А. В.";
	} else if (roleHint === "orthodontist") {
		userId = DEMO_DOCTOR_2_ID;
		role = "doctor";
		fullName = "Д-р Морозова Е. И.";
	} else if (roleHint === "surgeon") {
		userId = DEMO_DOCTOR_SURGEON_ID;
		role = "doctor";
		fullName = "Д-р Громов К. Д.";
	} else if (roleHint === "owner") {
		userId = DEMO_OWNER_ID;
		role = "owner";
		fullName = "Д-р Воронов М. С.";
	} else if (roleHint === "admin" || roleHint === "administrator") {
		userId = DEMO_ADMIN_ID;
		role = "administrator";
		fullName = "Смирнова А. П.";
	} else if (roleHint === "marketer" || roleHint === "marketing") {
		userId = "01a00000-0000-0000-0003-000000000006";
		role = "marketer";
		fullName = "Маркетолог Демо";
	} else if (roleHint === "receptionist") {
		userId = "01a00000-0000-0000-0003-000000000007";
		role = "receptionist";
		fullName = "Регистратор Демо";
	}

	return {
		organizationId: DEMO_SHOWCASE_ORG_ID,
		userId,
		role,
		fullName,
		sessionId: null,
		verified: true,
	};
}

export function applyAdminSecretBypass(
	request: FastifyRequest,
	identity: RequestIdentity,
): void {
	const adminSecretHeader =
		headerValue(request, "x-dente-admin-secret") ??
		headerValue(request, "x-admin-secret");

	if (!adminSecretHeader) return;

	const configuredSecret = clinicalAdminSecret();
	const isDev = namedDevelopmentModeActive();
	const isValidAdminSecret =
		(configuredSecret &&
			timingSafeSecretEqual(adminSecretHeader, configuredSecret)) ||
		(isDev &&
			(adminSecretHeader === "dente-local-dev-secret" ||
				adminSecretHeader === "dev-secret" ||
				adminSecretHeader === "synthetic-clinical-secret" ||
				adminSecretHeader === "synthetic-schedule-secret" ||
				adminSecretHeader === "test_secret_or_allow"));

	if (isValidAdminSecret) {
		if (!identity.organizationId) {
			const headerOrg = devHeaderOrgAllowed()
				? headerValue(request, ORGANIZATION_HEADER)
				: null;
			if (headerOrg) {
				identity.organizationId = headerOrg;
				identity.verified = true;
			}
		}
		if (!identity.role && identity.organizationId) {
			identity.role = "owner";
			identity.userId = identity.userId ?? DEMO_OWNER_ID;
			identity.fullName = identity.fullName ?? "Администратор клиники";
		}
	}
}
