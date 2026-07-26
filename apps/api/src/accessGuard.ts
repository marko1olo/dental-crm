import "dotenv/config";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authTokenSecret, clinicalAdminSecret } from "./security/authSecret.js";
import { getRequestIdentity, requireOrganizationId as requireVerifiedOrganizationId } from "./security/identity.js";

export const denteAdminSecretHeader = "x-dente-admin-secret";

export function configuredClinicalAccessSecret(): string | null {
  return clinicalAdminSecret();
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
 * Определяет организацию запроса.
 *
 * БЕЗОПАСНОСТЬ: организация берётся ТОЛЬКО из подписанного токена
 * (x-dente-clinic-token / x-dente-staff-token). Заголовок x-organization-id
 * больше не является источником истины — раньше любой клиент мог подставить
 * чужой UUID и прочитать карты пациентов другой клиники (IDOR / нарушение
 * изоляции арендаторов). Заголовок работает только в dev при явном
 * DENTE_DEV_ALLOW_HEADER_ORG=1 (см. security/identity.ts).
 */
export async function resolveOrganizationId(request: FastifyRequest): Promise<string | null> {
  return getRequestIdentity(request).organizationId;
}

/**
 * Возвращает organizationId из проверенного токена либо отправляет 401.
 */
export async function requireResolvedOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  _protectedArea?: string,
): Promise<string | null> {
  return requireVerifiedOrganizationId(request, reply);
}

/**
 * requireResolvedStaffOrAdminOrganizationId — как requireResolvedOrganizationId,
 * но дополнительно требует авторизованного сотрудника (не только токен кабинета).
 */
export async function requireResolvedStaffOrAdminOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  _protectedArea?: string,
): Promise<string | null> {
  const identity = getRequestIdentity(request);
  if (!identity.organizationId) {
    reply.code(401).send({ error: "AuthRequired", message: "Требуется авторизация рабочего кабинета клиники." });
    return null;
  }
  if (!identity.userId) {
    reply.code(401).send({ error: "StaffAuthRequired", message: "Требуется вход сотрудника." });
    return null;
  }
  return identity.organizationId;
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
  const identity = getRequestIdentity(request);
  if (identity.role === "doctor") {
    reply.code(403).send({
      error: "DoctorsNotAllowed",
      message: `Доктора не могут выполнять это действие: ${protectedArea}`,
    });
    return false;
  }
  return requireClinicalMutationAccess(request, reply, protectedArea);
}

/**
 * Секрет подписи токенов. Делегирует в единственный источник истины
 * (security/authSecret.ts), который падает в production, если секрет не задан.
 * Раньше здесь был публичный литерал "dente-fallback-secret-2026", позволявший
 * подделать токен любой клиники.
 */
export function requireAuthTokenSecret(): string {
  return authTokenSecret();
}
