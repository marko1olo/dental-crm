import "dotenv/config";
import { randomBytes } from "node:crypto";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";
import { verifyToken } from "./utils/cryptoHelper.js";
import { eq } from "drizzle-orm";
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

let developmentAuthTokenSecret: string | null = null;

export function configuredAuthTokenSecret(): string | null {
  const explicitSecret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (explicitSecret) return explicitSecret;
  const clinicalSecret = configuredClinicalAccessSecret();
  if (clinicalSecret && process.env.NODE_ENV !== "production") return clinicalSecret;
  if (process.env.NODE_ENV !== "production") {
    developmentAuthTokenSecret ??= randomBytes(32).toString("base64url");
    return developmentAuthTokenSecret;
  }
  return null;
}

export function requireAuthTokenSecret(): string {
  const secret = configuredAuthTokenSecret();
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is required for authentication tokens in production.");
  return secret;
}

function verifyRequestToken(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  if (process.env.NODE_ENV !== "production") {
    if (token === "fake-clinic-token" || token === "fake-staff-token") {
      return { organizationId: "00000000-0000-0000-0000-000000000001", id: "u-dev", role: "admin", name: "Dev E2E" };
    }
  }
  const secret = configuredAuthTokenSecret();
  if (!secret) return null;
  return verifyToken(token, secret);
}

function clinicalMutationsUnguardedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
}

function clinicalReadsUnguardedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS === "1";
}

function headerValue(request: FastifyRequest, name: string): string | null {
  const value = request.headers[name];
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === "string" && normalized.trim() ? normalized.trim() : null;
}

function requestOrganizationHint(request: FastifyRequest): string | null {
  const headerHint = headerValue(request, "x-dente-organization-id") ?? headerValue(request, "x-dente-org-id");
  if (headerHint) return headerHint;
  const body = request.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const candidate = (body as { organizationId?: unknown }).organizationId;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

async function organizationExists(organizationId: string): Promise<boolean> {
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  return Boolean(org);
}

async function resolveAdminSecretOrganizationId(request: FastifyRequest): Promise<string | null> {
  const adminSecret = configuredClinicalMutationSecret();
  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (!adminSecret || !timingSafeSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return null;
  }

  const organizationId = requestOrganizationHint(request);
  if (!organizationId) return null;
  return (await organizationExists(organizationId)) ? organizationId : null;
}

async function resolveDevelopmentDefaultOrganizationId(): Promise<string | null> {
  if (!clinicalMutationsUnguardedAllowed() && !clinicalReadsUnguardedAllowed()) return null;
  const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
  return org?.id ?? null;
}

export async function resolveExplicitOrganizationId(request: FastifyRequest): Promise<string | null> {
  const organizationId = requestOrganizationHint(request);
  if (!organizationId) return null;
  return (await organizationExists(organizationId)) ? organizationId : null;
}

export async function resolveOrganizationId(request: FastifyRequest): Promise<string | null> {
  const clinicHeader = request.headers["x-dente-clinic-token"];
  const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
  
  if (process.env.NODE_ENV !== "production" && clinicToken === "fake-clinic-token") {
    return resolveDevelopmentDefaultOrganizationId();
  }

  if (clinicToken) {
    const payload = verifyRequestToken(clinicToken);
    if (payload?.organizationId) return payload.organizationId as string;
  }

  const staffHeader = request.headers["x-dente-staff-token"];
  const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
  if (process.env.NODE_ENV !== "production" && staffToken === "fake-staff-token") {
    return resolveDevelopmentDefaultOrganizationId();
  }
  if (staffToken) {
    const payload = verifyRequestToken(staffToken);
    if (payload?.organizationId) return payload.organizationId as string;
  }

  const adminOrganizationId = await resolveAdminSecretOrganizationId(request);
  if (adminOrganizationId) return adminOrganizationId;

  return resolveDevelopmentDefaultOrganizationId();
}

export async function resolveAuthenticatedOrganizationId(request: FastifyRequest): Promise<string | null> {
  const clinicHeader = request.headers["x-dente-clinic-token"];
  const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
  if (process.env.NODE_ENV !== "production" && clinicToken === "fake-clinic-token") {
    return resolveDevelopmentDefaultOrganizationId();
  }
  if (clinicToken) {
    const payload = verifyRequestToken(clinicToken);
    if (payload?.organizationId) return payload.organizationId as string;
  }

  const staffHeader = request.headers["x-dente-staff-token"];
  const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
  if (process.env.NODE_ENV !== "production" && staffToken === "fake-staff-token") {
    return resolveDevelopmentDefaultOrganizationId();
  }
  if (staffToken) {
    const payload = verifyRequestToken(staffToken);
    if (payload?.organizationId) return payload.organizationId as string;
  }

  return resolveAdminSecretOrganizationId(request);
}

export async function requireResolvedOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "tenant route"
): Promise<string | null> {
  const organizationId = await resolveAuthenticatedOrganizationId(request);
  if (organizationId) return organizationId;

  reply.code(401).send({
    error: "AuthRequired",
    message: "Нужна действующая сессия клиники или сотрудника; при доступе по секрету администратора передайте x-dente-organization-id.",
    protectedArea
  });
  return null;
}

export async function resolveStaffOrAdminOrganizationId(request: FastifyRequest): Promise<string | null> {
  const staffHeader = request.headers["x-dente-staff-token"];
  const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
  if (staffToken) {
    const payload = verifyRequestToken(staffToken);
    if (payload?.organizationId) return payload.organizationId as string;
  }

  return resolveAdminSecretOrganizationId(request);
}

export async function requireResolvedStaffOrAdminOrganizationId(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "tenant mutation"
): Promise<string | null> {
  const organizationId = await resolveStaffOrAdminOrganizationId(request);
  if (organizationId) return organizationId;

  reply.code(403).send({
    error: "StaffAuthRequired",
    message: "Для изменения защищенных данных нужна действующая сессия сотрудника; при доступе по секрету администратора передайте x-dente-organization-id.",
    protectedArea
  });
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
