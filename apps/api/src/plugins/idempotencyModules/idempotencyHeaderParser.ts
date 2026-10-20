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
 */
export function extractTenantId(request: FastifyRequest): string | null {
	// biome-ignore lint/suspicious/noExplicitAny: request decorations
	const req = request as any;
	if (typeof req.tenantId === "string" && req.tenantId.trim()) {
		return req.tenantId.trim();
	}
	if (typeof req.user?.organizationId === "string" && req.user.organizationId.trim()) {
		return req.user.organizationId.trim();
	}
	try {
		const identity = getRequestIdentity(request);
		if (identity?.organizationId && typeof identity.organizationId === "string" && identity.organizationId.trim()) {
			return identity.organizationId.trim();
		}
	} catch {}
	const headerOrg = request.headers["x-organization-id"];
	const orgStr = Array.isArray(headerOrg) ? headerOrg[0] : headerOrg;
	if (typeof orgStr === "string" && orgStr.trim()) {
		return orgStr.trim();
	}
	if (req.params && typeof req.params.organizationId === "string" && req.params.organizationId.trim()) {
		return req.params.organizationId.trim();
	}
	if (req.body && typeof req.body === "object") {
		if (typeof req.body.organizationId === "string" && req.body.organizationId.trim()) {
			return req.body.organizationId.trim();
		}
		if (typeof req.body.clinicId === "string" && req.body.clinicId.trim()) {
			return req.body.clinicId.trim();
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
		const customVal = request.headers[customHeader.toLowerCase()];
		const valStr = Array.isArray(customVal) ? customVal[0] : customVal;
		if (typeof valStr === "string" && valStr.trim()) {
			return valStr.trim();
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

	// Fallback to request body fields (idempotencyKey or clientMutationId)
	if (request.body && typeof request.body === "object") {
		const b = request.body as Record<string, unknown>;
		if (typeof b.idempotencyKey === "string" && b.idempotencyKey.trim()) {
			return b.idempotencyKey.trim();
		}
		if (typeof b.clientMutationId === "string" && b.clientMutationId.trim()) {
			return b.clientMutationId.trim();
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
