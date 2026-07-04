import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations, users, auditEvents } from "../db/schema.js";
import { configuredClinicalAccessSecret } from "../accessGuard.js";
import { hashCredential, verifyCredential, signToken, verifyToken } from "../utils/cryptoHelper.js";
import { recordAuditEvent } from "../sampleData.js";

const TOKEN_SECRET = () => process.env.AUTH_TOKEN_SECRET ?? configuredClinicalAccessSecret() ?? "dente_fallback_secret_change_me";

interface ClinicLoginBody {
  email?: string;
  password?: string;
}

interface StaffUnlockBody {
  userId?: string;
  pinCode?: string;
}

interface SetupInitBody {
  clinicName?: string;
  email?: string;
  password?: string;
  ownerName?: string;
  ownerPin?: string;
}

// Middleware to verify clinic token on protected requests
export async function requireClinicToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers["x-dente-clinic-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) {
    return void reply.code(401).send({ error: "AuthRequired", message: "Необходима авторизация рабочего кабинета клиники." });
  }
  const payload = verifyToken(token, TOKEN_SECRET());
  if (!payload || !payload.organizationId) {
    return void reply.code(401).send({ error: "TokenExpired", message: "Сессия истекла. Войдите в кабинет заново." });
  }
  (request as any).clinicOrganizationId = payload.organizationId;
}

export async function registerAuthRoutes(app: FastifyInstance) {

  // ─── Clinic Workspace Login ───────────────────────────────────────────────────
  app.post("/api/auth/clinic/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = (request.body as ClinicLoginBody) ?? {};

    if (!email || !password) {
      return reply.code(400).send({ error: "ValidationError", message: "Введите логин и пароль клиники." });
    }

    const loginId = email.toLowerCase().trim();

    // Look up organization by login ID
    const [org] = await db.select().from(organizations).where(eq(organizations.loginId, loginId)).limit(1);

    if (!org) {
      // Timing-safe: delay even on missing to prevent enumeration
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));
      return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
    }

    const storedHash = org.passwordHash;
    const isMatch = storedHash ? verifyCredential(password, storedHash) : false;

    if (!isMatch) {
      return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
    }

    const token = signToken(
      { organizationId: org.id, clinicName: org.name },
      TOKEN_SECRET(),
      60 * 60 * 24 // 24h clinic session
    );

    await db.insert(auditEvents).values({
      organizationId: org.id,
      entityType: "organization",
      entityId: org.id,
      action: "clinic_login_success",
      reason: `Открыт рабочий кабинет: ${org.name}`
    });

    return reply.send({
      ok: true,
      clinicToken: token,
      clinicProfile: { organizationId: org.id, clinicName: org.name }
    });
  });

  // ─── Staff PIN Unlock ─────────────────────────────────────────────────────────
  app.post("/api/auth/staff/unlock", async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, pinCode } = (request.body as StaffUnlockBody) ?? {};

    if (!userId || !pinCode) {
      return reply.code(400).send({ error: "ValidationError", message: "Необходимо указать сотрудника и ввести PIN-код." });
    }

    // Verify clinic token is present so we know the org context
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    const clinicPayload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;

    if (!clinicPayload?.organizationId) {
      return reply.code(401).send({ error: "ClinicAuthRequired", message: "Сначала выполните вход в кабинет клиники." });
    }

    const orgId = clinicPayload.organizationId as string;

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organizationId, orgId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 100));
      return reply.code(404).send({ error: "UserNotFound", message: "Сотрудник не найден или заблокирован." });
    }

    const storedPinHash = user.pinCodeHash;
    const isMatch = storedPinHash ? verifyCredential(pinCode, storedPinHash) : false;

    if (!isMatch) {
      return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
    }

    const staffToken = signToken(
      { userId: user.id, fullName: user.fullName, role: user.role, organizationId: orgId },
      TOKEN_SECRET(),
      60 * 60 * 8 // 8h staff session
    );

    await db.insert(auditEvents).values({
      organizationId: orgId,
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "staff_unlock_success",
      reason: `Сотрудник ${user.fullName} начал сессию.`
    });

    return reply.send({
      ok: true,
      staffToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        email: user.email
      }
    });
  });

  // ─── Session Status Check ─────────────────────────────────────────────────────
  app.get("/api/auth/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const staffHeader = request.headers["x-dente-staff-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;

    const clinicPayload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
    const staffPayload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    let activeUser: any = null;
    if (staffPayload?.userId && clinicPayload?.organizationId) {
      const [user] = await db
        .select({ id: users.id, fullName: users.fullName, role: users.role })
        .from(users)
        .where(and(eq(users.id, staffPayload.userId as string), eq(users.isActive, true)))
        .limit(1);
      activeUser = user ?? null;
    }

    return reply.send({
      clinicUnlocked: !!clinicPayload,
      staffUnlocked: !!staffPayload,
      organizationId: (clinicPayload?.organizationId as string) ?? null,
      activeUser
    });
  });

  // ─── Admin: Set/Reset Clinic Password ────────────────────────────────────────
  app.post("/api/auth/clinic/set-password", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { organizationId: string; newPassword: string; adminKey: string };
    const adminKey = process.env.ADMIN_SETUP_KEY ?? "dente_admin_setup_key";

    if (body.adminKey !== adminKey) {
      return reply.code(403).send({ error: "Forbidden", message: "Неверный admin key." });
    }

    const hash = hashCredential(body.newPassword);
    await db.update(organizations).set({ passwordHash: hash }).where(eq(organizations.id, body.organizationId));

    return reply.send({ ok: true, message: "Пароль клиники обновлён." });
  });

  // ─── Admin: Set Staff PIN ─────────────────────────────────────────────────────
  app.post("/api/auth/staff/set-pin", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { userId: string; newPin: string; adminKey: string };
    const adminKey = process.env.ADMIN_SETUP_KEY ?? "dente_admin_setup_key";

    if (body.adminKey !== adminKey) {
      return reply.code(403).send({ error: "Forbidden", message: "Неверный admin key." });
    }

    const hash = hashCredential(body.newPin);
    await db.update(users).set({ pinCodeHash: hash }).where(eq(users.id, body.userId));

    return reply.send({ ok: true, message: "PIN сотрудника обновлён." });
  });

  // ─── Initial Clinic Setup (first-run seed credentials) ───────────────────────
  app.post("/api/auth/setup/init", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as SetupInitBody) ?? {};
    const { clinicName, email, password, ownerName, ownerPin } = body;

    if (!clinicName || !email || !password) {
      return reply.code(400).send({ error: "ValidationError", message: "Укажите название клиники, логин и пароль." });
    }

    const loginId = email.toLowerCase().trim();

    // Check if org with this loginId already exists
    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
    if (existing) {
      return reply.code(409).send({ error: "Conflict", message: "Организация с таким логином уже существует." });
    }

    const passwordHash = hashCredential(password);

    const [org] = await db
      .insert(organizations)
      .values({ name: clinicName, loginId, passwordHash, email })
      .returning();

    if (!org) {
      return reply.code(500).send({ error: "InternalError", message: "Не удалось создать организацию." });
    }

    // Create owner user if specified
    let owner: any = null;
    if (ownerName) {
      const pinHash = ownerPin ? hashCredential(ownerPin) : hashCredential("0000");
      const [ownerUser] = await db
        .insert(users)
        .values({ organizationId: org.id, fullName: ownerName, role: "owner", pinCodeHash: pinHash, isActive: true })
        .returning();
      owner = ownerUser;
    }

    const token = signToken(
      { organizationId: org.id, clinicName: org.name },
      TOKEN_SECRET(),
      60 * 60 * 24
    );

    return reply.code(201).send({
      ok: true,
      clinicToken: token,
      organizationId: org.id,
      ownerUserId: owner?.id ?? null
    });
  });
}
