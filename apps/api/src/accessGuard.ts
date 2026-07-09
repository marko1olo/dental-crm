import "dotenv/config";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";
import { verifyToken } from "./utils/cryptoHelper.js";
import { db } from "./db/client.js";
import { organizations } from "./db/schema.js";
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

const TOKEN_SECRET = () => process.env.AUTH_TOKEN_SECRET ?? configuredClinicalAccessSecret() ?? "dente_fallback_secret_change_me";

export async function resolveOrganizationId(request: FastifyRequest): Promise<string | null> {
  const clinicHeader = request.headers["x-dente-clinic-token"];
  const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
  if (clinicToken) {
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (payload?.organizationId) return payload.organizationId as string;
  }
  
  const staffHeader = request.headers["x-dente-staff-token"];
  const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
  if (staffToken) {
    const payload = verifyToken(staffToken, TOKEN_SECRET());
    if (payload?.organizationId) return payload.organizationId as string;
  }
  
  const adminSecret = configuredClinicalMutationSecret();
  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (adminSecret && timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? null;
  }

  if (clinicalMutationsUnguardedAllowed() || clinicalReadsUnguardedAllowed()) {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? null;
  }

  return null;
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
