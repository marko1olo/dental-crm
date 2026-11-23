/**
 * idempotencyHeaderParser.ts — Pure Request Header & Identity Parsers for Idempotency (Layer 1).
 */

import type { FastifyRequest } from "fastify";
import { getRequestIdentity } from "../../security/identity.js";

export function isValidUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		id,
	);
}

/**
 * Extracts organization/tenant ID from Fastify request identity.
 * For authenticated requests, tenantId is strictly bound to session/token (user.organizationId or request.tenantId).
 * Disallows untrusted body/header overrides for authenticated users.
 */
export function extractTenantId(request: FastifyRequest): string | null {
	if (typeof request.tenantId === "string" && request.tenantId.trim()) {
		return request.tenantId.trim();
	}
	if (typeof request.user?.organizationId === "string" && request.user.organizationId.trim()) {
		return request.user.organizationId.trim();
	}
	try {
		const identity = getRequestIdentity(request);
		if (identity?.organizationId && typeof identity.organizationId === "string" && identity.organizationId.trim()) {
			return identity.organizationId.trim();
		}
	} catch {}

	// If request has authenticated user context, strictly deny falling back to untrusted headers or body
	if (request.user) {
		return null;
	}

	const headerOrg = request.headers["x-organization-id"];
	const orgStr = Array.isArray(headerOrg) ? headerOrg[0] : headerOrg;
	if (typeof orgStr === "string" && orgStr.trim()) {
		return orgStr.trim();
	}
	const params = request.params as Record<string, unknown> | undefined;
	if (params && typeof params.organizationId === "string" && params.organizationId.trim()) {
		return params.organizationId.trim();
	}
	const body = request.body as Record<string, unknown> | undefined;
	if (body && typeof body === "object") {
		if (typeof body.organizationId === "string" && body.organizationId.trim()) {
			return body.organizationId.trim();
		}
		if (typeof body.clinicId === "string" && body.clinicId.trim()) {
			return body.clinicId.trim();
		}
	}
	return null;
}

/**
 * Extracts idempotency key from request headers or body with case-insensitive normalization.
 */
export function extractIdempotencyKey(
	request: FastifyRequest,
	customHeader?: string,
): string | null {
	if (customHeader) {
		const customLower = customHeader.toLowerCase();
		const customVal = request.headers[customLower];
		const valStr = Array.isArray(customVal) ? customVal[0] : customVal;
		if (typeof valStr === "string" && valStr.trim()) {
			return valStr.trim();
		}
		for (const [k, v] of Object.entries(request.headers)) {
			if (k.toLowerCase() === customLower) {
				const val = Array.isArray(v) ? v[0] : v;
				if (typeof val === "string" && val.trim()) {
					return val.trim();
				}
			}
		}
	}

	const standardVal =
		request.headers["x-idempotency-key"] ||
		request.headers["idempotency-key"] ||
		request.headers["x-idempotence-key"];
	const str = Array.isArray(standardVal) ? standardVal[0] : standardVal;
	if (typeof str === "string" && str.trim()) {
		return str.trim();
	}

	// Case-insensitive check over all request headers
	for (const [k, v] of Object.entries(request.headers)) {
		const lower = k.toLowerCase();
		if (
			lower === "x-idempotency-key" ||
			lower === "idempotency-key" ||
			lower === "x-idempotence-key"
		) {
			const val = Array.isArray(v) ? v[0] : v;
			if (typeof val === "string" && val.trim()) {
				return val.trim();
			}
		}
	}

	// Fallback to request body fields (idempotencyKey or clientMutationId)
	if (request.body && typeof request.body === "object") {
		const b = request.body as Record<string, unknown>;
		if (typeof b.idempotencyKey === "string" && b.idempotencyKey.trim()) {
			return b.idempotencyKey.trim();
		}
		if (typeof b.idempotency_key === "string" && b.idempotency_key.trim()) {
			return b.idempotency_key.trim();
		}
		if (typeof b.clientMutationId === "string" && b.clientMutationId.trim()) {
			return b.clientMutationId.trim();
		}
		if (typeof b.client_mutation_id === "string" && b.client_mutation_id.trim()) {
			return b.client_mutation_id.trim();
		}
	}

	return null;
}

export function extractPgErrorCode(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	const candidate = error as { code?: unknown; cause?: unknown };
	if (typeof candidate.code === "string") return candidate.code;
	if (candidate.cause) return extractPgErrorCode(candidate.cause);
	return null;
}
