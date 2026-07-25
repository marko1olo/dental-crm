import "dotenv/config";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export const denteAdminSecretHeader = "x-dente-admin-secret";

export function configuredClinicalAccessSecret(): string | null {
  return process.env.DENTE_CLINICAL_ADMIN_SECRET?.trim() || null;
}

export function configuredClinicalMutationSecret(): string | null {
  return configuredClinicalAccessSecret();
}

function clinicalMutationsUnguardedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
}

function clinicalReadsUnguardedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS === "1";
}


export async function requireClinicalMutationAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "clinical mutation"
): Promise<boolean> {
  const adminSecret = configuredClinicalMutationSecret();
  if (!adminSecret) {
    if (clinicalMutationsUnguardedAllowed()) return true;
    reply.code(503).send({
      error: "ClinicalAdminSecretMissing",
      message: "На сервере не задан секрет администратора клиники для изменения защищенных данных.",
      protectedArea
    });
    return false;
  }

  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return true;
  }

  reply.code(403).send({
    error: "ClinicalAdminSecretRequired",
    message: "Нужен действующий секрет администратора клиники для изменения защищенных данных.",
    protectedArea
  });
  return false;
}

export async function requireClinicalReadAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "clinical read"
): Promise<boolean> {
  const adminSecret = configuredClinicalAccessSecret();
  if (!adminSecret) {
    if (clinicalReadsUnguardedAllowed()) return true;
    reply.code(503).send({
      error: "ClinicalReadSecretMissing",
      message: "На сервере не задан секрет администратора клиники для просмотра защищенных данных.",
      protectedArea
    });
    return false;
  }

  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return true;
  }

  reply.code(403).send({
    error: "ClinicalReadSecretRequired",
    message: "Нужен действующий секрет администратора клиники для просмотра защищенных данных.",
    protectedArea
  });
  return false;
}

/**
 * Resolves the organization ID from the incoming request.
 * Checks (in order):
 *  1. JWT / session user.organizationId
 *  2. x-organization-id header
 *  3. Returns null if neither present
 */
export async function resolveOrganizationId(request: FastifyRequest): Promise<string | null> {
  const user = (request as any).user;
  if (user?.organizationId && typeof user.organizationId === "string") {
    return user.organizationId;
  }
  const headerValue = request.headers["x-organization-id"];
  const normalized = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof normalized === "string" && normalized.trim().length > 0) {
    return normalized.trim();
  }
  return null;
}

/**
 * Requires that requireResolvedOrganizationId is set on the request.
 * Returns the orgId or sends a 403 and returns null.
 */
export async function requireResolvedOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  _protectedArea?: string,
): Promise<string | null> {
  const orgId = await resolveOrganizationId(request);
  if (!orgId) {
    reply.code(403).send({ error: "OrganizationIdRequired", message: "Organization ID required." });
    return null;
  }
  return orgId;
}

/**
 * requireResolvedStaffOrAdminOrganizationId — alias of requireResolvedOrganizationId
 * for routes that require staff or admin role in addition to org context.
 * Role check is delegated to the calling route.
 */
export async function requireResolvedStaffOrAdminOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  _protectedArea?: string,
): Promise<string | null> {
  return requireResolvedOrganizationId(request, reply);
}

/**
 * requireNonDoctorAccess — allows any authenticated non-doctor (admin, staff)
 * through. Doctors are restricted from certain write routes.
 */
export async function requireNonDoctorAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "non-doctor mutation",
): Promise<boolean> {
  const user = (request as any).user;
  if (user?.role === "doctor") {
    reply.code(403).send({
      error: "DoctorsNotAllowed",
      message: `Доктора не могут выполнять это действие: ${protectedArea}`,
    });
    return false;
  }
  return requireClinicalMutationAccess(request, reply, protectedArea);
}
