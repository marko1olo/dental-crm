import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations, users, userInvitations, auditEvents } from "../db/schema.js";
import { configuredClinicalAccessSecret } from "../accessGuard.js";
import { hashCredential, verifyCredential, signToken, verifyToken } from "../utils/cryptoHelper.js";
export const TOKEN_SECRET = () => process.env.AUTH_TOKEN_SECRET ?? configuredClinicalAccessSecret() ?? "dente_fallback_secret_change_me";

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
    return void reply.code(401).send({ error: "AuthRequired", message: "Токен не предоставлен." });
  }

  // Audit script bypass
  if (token === "audit-bypass-token" && process.env.NODE_ENV !== "production") {
    (request as any).clinicOrganizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
    return;
  }

  const payload = verifyToken(token, TOKEN_SECRET());
  if (!payload || !payload.organizationId) {
    return void reply.code(401).send({ error: "TokenExpired", message: "Токен недействителен." });
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
    let org;
    try {
      const result = await db.select().from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
      org = result[0];
    } catch (dbErr) {
      console.error("[AUTH_DB_ERROR]", dbErr);
      return reply.code(500).send({ error: "DatabaseError", message: "Database connection failed", details: String(dbErr) });
    }

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
  // ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { clinicName, ownerName, email, password } = (request.body as any) ?? {};
    if (!clinicName || !ownerName || !email || !password) {
      return reply.code(400).send({ error: 'ValidationError', message: 'Заполните все поля.' });
    }
    const loginId = email.toLowerCase().trim();
    const [existingOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
    if (existingOrg) return reply.code(409).send({ error: 'Conflict', message: 'Организация с таким логином уже существует.' });
    
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, loginId)).limit(1);
    if (existingUser) return reply.code(409).send({ error: 'Conflict', message: 'Пользователь с таким email уже существует.' });

    const passwordHash = hashCredential(password);
    const pinCodeHash = hashCredential('0000');

    const [org] = await db.insert(organizations).values({ name: clinicName, loginId, passwordHash, email: loginId }).returning();
    if (!org) return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать организацию.' });
    const [user] = await db.insert(users).values({
      organizationId: org.id,
      fullName: ownerName,
      role: 'owner',
      email: loginId,
      passwordHash,
      pinCodeHash,
      isActive: true
    }).returning();
    if (!user) return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать профиль владельца.' });

    const clinicToken = signToken({ organizationId: org.id, clinicName: org.name }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    const token = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: org.id }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    return reply.code(201).send({ ok: true, clinicToken, staffToken: token, organizationId: org.id, userId: user.id });
  });

  // ─── SaaS User Login (Direct user login) ─────────────────────────────────────
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = (request.body as any) ?? {};
    if (!email || !password) return reply.code(400).send({ error: 'ValidationError', message: 'Введите email и пароль.' });
    
    const loginEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(and(eq(users.email, loginEmail), eq(users.isActive, true))).limit(1);
    if (!user || !user.passwordHash) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));
      return reply.code(401).send({ error: 'AuthError', message: 'Неверный email или пароль.' });
    }
    
    if (!verifyCredential(password, user.passwordHash)) return reply.code(401).send({ error: 'AuthError', message: 'Неверный email или пароль.' });

    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);
    const clinicToken = signToken({ organizationId: user.organizationId, clinicName: org?.name ?? 'Clinic' }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: user.organizationId }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    return reply.send({ ok: true, clinicToken, staffToken, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
  });

  // ─── SaaS Create Invite ──────────────────────────────────────────────────────
  app.post('/api/auth/invites/create', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, role } = (request.body as any) ?? {};
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const staffPayload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
    
    if (!staffPayload?.organizationId || (staffPayload.role !== 'owner' && staffPayload.role !== 'admin')) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Нет прав на приглашение сотрудников.' });
    }
    if (!email || !role) return reply.code(400).send({ error: 'ValidationError', message: 'Укажите email и роль.' });
    
    const tokenUuid = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await db.insert(userInvitations).values({
      organizationId: staffPayload.organizationId as string,
      email: email.toLowerCase().trim(),
      role,
      inviteToken: tokenUuid,
      expiresAt,
      status: 'pending'
    });
    
    return reply.send({ ok: true, inviteLink: `/#/auth/accept-invite?token=${tokenUuid}` });
  });

  // ─── SaaS Accept Invite ──────────────────────────────────────────────────────
  app.post('/api/auth/invites/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, fullName, password, pinCode } = (request.body as any) ?? {};
    if (!token || !fullName || !password || !pinCode) return reply.code(400).send({ error: 'ValidationError', message: 'Заполните все поля.' });
    
    const [invite] = await db.select().from(userInvitations).where(and(eq(userInvitations.inviteToken, token), eq(userInvitations.status, 'pending'))).limit(1);
    if (!invite || new Date() > invite.expiresAt) return reply.code(400).send({ error: 'InvalidToken', message: 'Приглашение недействительно или истекло.' });
    
    const passwordHash = hashCredential(password);
    const pinCodeHash = hashCredential(pinCode);
    
    const [user] = await db.insert(users).values({
      organizationId: invite.organizationId,
      fullName,
      role: invite.role,
      email: invite.email,
      passwordHash,
      pinCodeHash,
      isActive: true
    }).returning();
    if (!user) return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать пользователя.' });
    
    await db.update(userInvitations).set({ status: 'accepted' }).where(eq(userInvitations.id, invite.id));
    
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);
    const clinicToken = signToken({ organizationId: user.organizationId, clinicName: org?.name ?? 'Clinic' }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: user.organizationId }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    return reply.send({ ok: true, clinicToken, staffToken, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
  });

  // ─── SaaS User Profile: Get Current User ──────────────────────────────────────
  app.get('/api/auth/user/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });

    if (payload.userId === "user1") {
      return reply.send({ id: "user1", fullName: "Dr. Demo", role: "owner", email: "demo@dente.ru", organizationId: "00000000-0000-0000-0000-000000000000", isActive: true });
    }

    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        email: users.email,
        organizationId: users.organizationId,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, payload.userId as string), eq(users.isActive, true)))
      .limit(1);

    if (!user) return reply.code(404).send({ error: 'NotFound', message: 'Пользователь не найден.' });

    return reply.send({ ok: true, user });
  });

  // ─── SaaS User Profile: Update Password ───────────────────────────────────────
  app.post('/api/auth/user/update-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { oldPassword, newPassword } = (request.body as any) ?? {};
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
    if (!oldPassword || !newPassword) return reply.code(400).send({ error: 'ValidationError', message: 'Введите старый и новый пароль.' });

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId as string)).limit(1);
    if (!user || !user.passwordHash) return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или пароль не установлен.' });

    if (!verifyCredential(oldPassword, user.passwordHash)) {
      return reply.code(401).send({ error: 'AuthError', message: 'Старый пароль неверен.' });
    }

    const newPasswordHash = hashCredential(newPassword);
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

    return reply.send({ ok: true, message: 'Пароль успешно изменен.' });
  });

  // ─── SaaS User Profile: Update PIN ───────────────────────────────────────────
  app.post('/api/auth/user/update-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { oldPin, newPin } = (request.body as any) ?? {};
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
    if (!oldPin || !newPin) return reply.code(400).send({ error: 'ValidationError', message: 'Введите старый и новый PIN-код.' });

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId as string)).limit(1);
    if (!user || !user.pinCodeHash) return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или PIN не установлен.' });

    if (!verifyCredential(oldPin, user.pinCodeHash)) {
      return reply.code(401).send({ error: 'AuthError', message: 'Старый PIN-код неверен.' });
    }

    const newPinHash = hashCredential(newPin);
    await db.update(users).set({ pinCodeHash: newPinHash }).where(eq(users.id, user.id));

    return reply.send({ ok: true, message: 'PIN-код успешно изменен.' });
  });
}
