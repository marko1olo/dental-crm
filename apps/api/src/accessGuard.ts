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
