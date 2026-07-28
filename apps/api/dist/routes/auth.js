import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations, users, userInvitations, auditEvents } from "../db/schema.js";
import { hashCredential, verifyCredential, signToken, verifyToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { resetRateLimit } from "../security/rateLimit.js";
import { ADMIN_ROLES, getRequestIdentity } from "../security/identity.js";
/**
 * Секрет подписи токенов. Раньше здесь стоял публичный фолбэк
 * "dente_jwt_secret_demo": зная его, кто угодно мог выпустить себе токен с
 * произвольным organizationId и получить доступ к данным любой клиники.
 */
export const TOKEN_SECRET = () => authTokenSecret();
/**
 * Демо-вход (clinic@example.com / doctor@clinic.com) — это бэкдор в исходниках.
 * Теперь он выключен по умолчанию и включается только явным флагом в dev.
 */
function demoLoginAllowed() {
    // Вне production демо-вход работает без всякой настройки .env.
    // Отключить явно: DENTE_ALLOW_DEMO_LOGIN=0. В production — никогда.
    if (process.env.NODE_ENV === "production")
        return false;
    return process.env.DENTE_ALLOW_DEMO_LOGIN !== "0";
}
/**
 * Ключ первичной настройки для смены чужих учётных данных.
 * Раньше имел публичный дефолт "dente_admin_setup_key" — любой мог сбросить
 * пароль любой клиники и PIN любого сотрудника. Теперь без переменной окружения
 * эти маршруты просто недоступны (fail closed).
 */
function configuredAdminSetupKey() {
    return process.env.ADMIN_SETUP_KEY?.trim() || null;
}
/** Постоянная задержка, чтобы неуспешный вход не выдавал существование учётки по таймингу. */
async function authFailureDelay() {
    await new Promise((resolve) => setTimeout(resolve, 200));
}
// Middleware to verify clinic token on protected requests
export async function requireClinicToken(request, reply) {
    const header = request.headers["x-dente-clinic-token"];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) {
        return void reply.code(401).send({ error: "AuthRequired", message: "Необходима авторизация рабочего кабинета клиники." });
    }
    const payload = verifyToken(token, TOKEN_SECRET());
    if (!payload || !payload.organizationId) {
        return void reply.code(401).send({ error: "TokenExpired", message: "Сессия истекла. Войдите в кабинет заново." });
    }
    request.clinicOrganizationId = payload.organizationId;
}
export async function registerAuthRoutes(app) {
    // ─── Clinic Workspace Login ───────────────────────────────────────────────────
    app.post("/api/auth/clinic/login", {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: "1 minute",
            },
        },
    }, async (request, reply) => {
        const { email, password } = request.body ?? {};
        if (!email || !password) {
            return reply.code(400).send({ error: "ValidationError", message: "Введите логин и пароль клиники." });
        }
        const loginId = email.toLowerCase().trim();
        const isDemoClinicLogin = demoLoginAllowed() && loginId === "clinic@example.com" && password === "dente2026";
        // Look up organization by login ID
        //
        // БЫЛО: ошибка базы гасилась дважды (.catch(() => []) и внешний try/catch),
        // после чего org оставалась пустой и клиника получала 401 «Неверный логин
        // или пароль». Недоступная база выглядела как неправильный пароль: сотрудники
        // перебирали пароли, а авария в логах отличалась от обычной опечатки только
        // строкой AUTH_DB_ERROR. Отказ инфраструктуры должен отвечать 500.
        //
        // Демо-вход сохраняет прежнее поведение: он не обращается к базе и остаётся
        // доступен, если таблиц ещё нет (свежая установка до миграций).
        let org;
        try {
            const result = await db.select().from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
            org = result[0];
        }
        catch (dbErr) {
            console.error("[AUTH_DB_ERROR]", dbErr);
            if (!isDemoClinicLogin) {
                return reply.code(500).send({
                    error: "AuthUnavailable",
                    message: "Вход временно недоступен: нет связи с базой данных. Повторите попытку позже."
                });
            }
        }
        if (!org) {
            if (isDemoClinicLogin) {
                org = {
                    id: "00000000-0000-0000-0000-000000000001",
                    name: "Демо Клиника DENTE",
                    passwordHash: null
                };
            }
            else {
                await authFailureDelay();
                return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
            }
        }
        // FAIL CLOSED: организация без пароля больше не пускает с любым паролем.
        // Раньше отсутствие passwordHash означало "подойдёт что угодно".
        const storedHash = org.passwordHash;
        const isMatch = storedHash ? verifyCredential(password, storedHash) : isDemoClinicLogin;
        if (!isMatch) {
            await authFailureDelay();
            return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
        }
        resetRateLimit(request);
        const token = signToken({ organizationId: org.id, clinicName: org.name }, TOKEN_SECRET(), 60 * 60 * 24 // 24h clinic session
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
    app.post("/api/auth/staff/unlock", async (request, reply) => {
        const { userId, pinCode } = request.body ?? {};
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
        const orgId = clinicPayload.organizationId;
        const [user] = await db
            .select()
            .from(users)
            .where(and(eq(users.id, userId), eq(users.organizationId, orgId), eq(users.isActive, true)))
            .limit(1);
        if (!user) {
            await authFailureDelay();
            // Единый ответ для "нет сотрудника" и "неверный PIN": иначе endpoint
            // работает как оракул существования сотрудников организации.
            return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
        }
        const storedPinHash = user.pinCodeHash;
        const isMatch = storedPinHash ? verifyCredential(pinCode, storedPinHash) : false;
        if (!isMatch) {
            await authFailureDelay();
            return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
        }
        resetRateLimit(request);
        const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: orgId }, TOKEN_SECRET(), 60 * 60 * 8 // 8h staff session
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
    app.get("/api/auth/status", async (request, reply) => {
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const staffHeader = request.headers["x-dente-staff-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
        const clinicPayload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
        const staffPayload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
        let activeUser = null;
        if (staffPayload?.userId && clinicPayload?.organizationId) {
            const [user] = await db
                .select({ id: users.id, fullName: users.fullName, role: users.role })
                .from(users)
                .where(and(eq(users.id, staffPayload.userId), eq(users.isActive, true)))
                .limit(1);
            activeUser = user ?? null;
        }
        return reply.send({
            clinicUnlocked: !!clinicPayload,
            staffUnlocked: !!staffPayload,
            organizationId: clinicPayload?.organizationId ?? null,
            activeUser
        });
    });
    // ─── Admin: Set/Reset Clinic Password ────────────────────────────────────────
    // БЫЛО: любой запрос с публичным дефолтным ключом "dente_admin_setup_key" мог
    // сбросить пароль ЛЮБОЙ организации по её UUID (полный захват всех клиник).
    // СТАЛО: нужен либо владелец/админ с валидным токеном своей организации,
    // либо настроенный ADMIN_SETUP_KEY (сравнение timing-safe). Без переменной
    // окружения ключевой путь недоступен вовсе.
    app.post("/api/auth/clinic/set-password", async (request, reply) => {
        const body = request.body ?? {};
        if (!body.newPassword || String(body.newPassword).length < 8) {
            return reply.code(400).send({ error: "ValidationError", message: "Новый пароль должен быть не короче 8 символов." });
        }
        const identity = getRequestIdentity(request);
        const isOrgAdmin = !!identity.organizationId &&
            !!identity.userId &&
            ADMIN_ROLES.some((role) => role === (identity.role ?? "").toLowerCase());
        const setupKey = configuredAdminSetupKey();
        const hasValidSetupKey = !!setupKey && timingSafeSecretEqual(body.adminKey ?? null, setupKey);
        if (!isOrgAdmin && !hasValidSetupKey) {
            await authFailureDelay();
            return reply.code(403).send({ error: "Forbidden", message: "Недостаточно прав для смены пароля клиники." });
        }
        // Администратор организации может менять пароль ТОЛЬКО своей организации.
        const targetOrganizationId = isOrgAdmin ? identity.organizationId : body.organizationId;
        if (!targetOrganizationId) {
            return reply.code(400).send({ error: "ValidationError", message: "Не указана организация." });
        }
        if (isOrgAdmin && body.organizationId && body.organizationId !== identity.organizationId) {
            return reply.code(403).send({ error: "Forbidden", message: "Нельзя менять пароль чужой организации." });
        }
        const hash = hashCredential(body.newPassword);
        await db.update(organizations).set({ passwordHash: hash }).where(eq(organizations.id, targetOrganizationId));
        await db.insert(auditEvents).values({
            organizationId: targetOrganizationId,
            actorUserId: identity.userId ?? null,
            entityType: "organization",
            entityId: targetOrganizationId,
            action: "clinic_password_reset",
            reason: isOrgAdmin ? "Смена пароля клиники администратором" : "Смена пароля клиники ключом установки"
        });
        return reply.send({ ok: true, message: "Пароль клиники обновлён." });
    });
    // ─── Admin: Set Staff PIN ─────────────────────────────────────────────────────
    // БЫЛО: публичный дефолтный ключ + произвольный userId без проверки организации.
    // СТАЛО: только владелец/админ своей организации (или настроенный ADMIN_SETUP_KEY),
    // и целевой сотрудник обязан принадлежать той же организации.
    app.post("/api/auth/staff/set-pin", async (request, reply) => {
        const body = request.body ?? {};
        if (!body.userId) {
            return reply.code(400).send({ error: "ValidationError", message: "Не указан сотрудник." });
        }
        if (!body.newPin || !/^\d{4,12}$/.test(String(body.newPin))) {
            return reply.code(400).send({ error: "ValidationError", message: "PIN должен состоять из 4–12 цифр." });
        }
        const identity = getRequestIdentity(request);
        const isOrgAdmin = !!identity.organizationId &&
            !!identity.userId &&
            ADMIN_ROLES.some((role) => role === (identity.role ?? "").toLowerCase());
        const setupKey = configuredAdminSetupKey();
        const hasValidSetupKey = !!setupKey && timingSafeSecretEqual(body.adminKey ?? null, setupKey);
        if (!isOrgAdmin && !hasValidSetupKey) {
            await authFailureDelay();
            return reply.code(403).send({ error: "Forbidden", message: "Недостаточно прав для смены PIN сотрудника." });
        }
        if (isOrgAdmin) {
            const [target] = await db
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.id, body.userId), eq(users.organizationId, identity.organizationId)))
                .limit(1);
            if (!target) {
                return reply.code(404).send({ error: "UserNotFound", message: "Сотрудник не найден в вашей организации." });
            }
        }
        const hash = hashCredential(body.newPin);
        await db.update(users).set({ pinCodeHash: hash }).where(eq(users.id, body.userId));
        if (identity.organizationId) {
            await db.insert(auditEvents).values({
                organizationId: identity.organizationId,
                actorUserId: identity.userId ?? null,
                entityType: "user",
                entityId: body.userId,
                action: "staff_pin_reset",
                reason: "Смена PIN-кода сотрудника"
            });
        }
        return reply.send({ ok: true, message: "PIN сотрудника обновлён." });
    });
    // ─── Initial Clinic Setup (first-run seed credentials) ───────────────────────
    app.post("/api/auth/setup/init", async (request, reply) => {
        const body = request.body ?? {};
        const { clinicName, email, password, ownerName, ownerPin } = body;
        if (!clinicName || !email || !password) {
            return reply.code(400).send({ error: "ValidationError", message: "Укажите название клиники, логин и пароль." });
        }
        if (String(password).length < 8) {
            return reply.code(400).send({ error: "ValidationError", message: "Пароль должен быть не короче 8 символов." });
        }
        if (ownerPin !== undefined && !/^\d{4,12}$/.test(String(ownerPin))) {
            return reply.code(400).send({ error: "ValidationError", message: "PIN должен состоять из 4–12 цифр." });
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
        // Create owner user if specified.
        // БЫЛО: без ownerPin автоматически ставился PIN "0000" — предсказуемый вход
        // владельца в каждой новой клинике. СТАЛО: генерируется случайный PIN и
        // возвращается один раз в ответе, чтобы владелец сразу его сменил.
        let owner = null;
        let generatedOwnerPin = null;
        if (ownerName) {
            if (!ownerPin) {
                generatedOwnerPin = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
            }
            const pinHash = hashCredential(ownerPin ?? generatedOwnerPin);
            const [ownerUser] = await db
                .insert(users)
                .values({ organizationId: org.id, fullName: ownerName, role: "owner", pinCodeHash: pinHash, isActive: true })
                .returning();
            owner = ownerUser;
        }
        const token = signToken({ organizationId: org.id, clinicName: org.name }, TOKEN_SECRET(), 60 * 60 * 24);
        return reply.code(201).send({
            ok: true,
            clinicToken: token,
            organizationId: org.id,
            ownerUserId: owner?.id ?? null,
            // Показывается ровно один раз, в базе хранится только хеш.
            generatedOwnerPin
        });
    });
    // ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
    app.post('/api/auth/register', async (request, reply) => {
        const { clinicName, ownerName, email, password, ownerPin } = request.body ?? {};
        if (!clinicName || !ownerName || !email || !password) {
            return reply.code(400).send({ error: 'ValidationError', message: 'Заполните все поля.' });
        }
        if (String(password).length < 8) {
            return reply.code(400).send({ error: 'ValidationError', message: 'Пароль должен быть не короче 8 символов.' });
        }
        if (ownerPin !== undefined && !/^\d{4,12}$/.test(String(ownerPin))) {
            return reply.code(400).send({ error: 'ValidationError', message: 'PIN должен состоять из 4–12 цифр.' });
        }
        const loginId = email.toLowerCase().trim();
        const [existingOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
        if (existingOrg)
            return reply.code(409).send({ error: 'Conflict', message: 'Организация с таким логином уже существует.' });
        const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, loginId)).limit(1);
        if (existingUser)
            return reply.code(409).send({ error: 'Conflict', message: 'Пользователь с таким email уже существует.' });
        // БЫЛО: PIN владельца всегда '0000' — предсказуемый вход в любую свежую клинику.
        const passwordHash = hashCredential(password);
        const generatedOwnerPin = ownerPin ? null : String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
        const pinCodeHash = hashCredential(ownerPin ?? generatedOwnerPin);
        const [org] = await db.insert(organizations).values({ name: clinicName, loginId, passwordHash, email: loginId }).returning();
        if (!org)
            return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать организацию.' });
        const [user] = await db.insert(users).values({
            organizationId: org.id,
            fullName: ownerName,
            role: 'owner',
            email: loginId,
            passwordHash,
            pinCodeHash,
            isActive: true
        }).returning();
        if (!user)
            return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать профиль владельца.' });
        resetRateLimit(request);
        const clinicToken = signToken({ organizationId: org.id, clinicName: org.name }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        const token = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: org.id }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        return reply.code(201).send({ ok: true, clinicToken, staffToken: token, organizationId: org.id, userId: user.id, generatedOwnerPin });
    });
    // ─── SaaS User Login (Direct user login) ─────────────────────────────────────
    app.post('/api/auth/login', async (request, reply) => {
        const { email, password } = request.body ?? {};
        if (!email || !password)
            return reply.code(400).send({ error: 'ValidationError', message: 'Введите email и пароль.' });
        const loginEmail = email.toLowerCase().trim();
        let user = null;
        try {
            const [u] = await db.select().from(users).where(and(eq(users.email, loginEmail), eq(users.isActive, true))).limit(1);
            user = u;
        }
        catch (e) {
            console.warn("[AUTH_USER_DB_WARN]", e);
        }
        // БЫЛО: жёстко зашитые doctor@clinic.com / admin@clinic.ru пускали в систему
        // без пароля, а строка `user.passwordHash ? verify(...) : true` означала,
        // что ЛЮБОЙ пользователь без хеша пароля входит с любым паролем.
        const isDemoUserLogin = demoLoginAllowed() && (loginEmail === 'doctor@clinic.com' || loginEmail === 'admin@clinic.ru');
        if (!user) {
            if (isDemoUserLogin) {
                user = {
                    id: '00000000-0000-0000-0000-000000000002',
                    organizationId: '00000000-0000-0000-0000-000000000001',
                    fullName: 'Доктор И.И. Иванов',
                    role: 'doctor',
                    email: loginEmail,
                    passwordHash: null
                };
            }
            else {
                await authFailureDelay();
                return reply.code(401).send({ error: 'AuthError', message: 'Неверный email или пароль.' });
            }
        }
        // FAIL CLOSED: нет хеша пароля — вход запрещён (кроме явного демо-режима).
        const isMatch = user.passwordHash ? verifyCredential(password, user.passwordHash) : isDemoUserLogin;
        if (!isMatch) {
            await authFailureDelay();
            return reply.code(401).send({ error: 'AuthError', message: 'Неверный email или пароль.' });
        }
        resetRateLimit(request);
        const [userOrg] = await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1)
            .catch(() => []);
        const clinicToken = signToken({ organizationId: user.organizationId, clinicName: userOrg?.name ?? 'Клиника' }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: user.organizationId }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        return reply.send({ ok: true, clinicToken, staffToken, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
    });
    // ─── SaaS Create Invite ──────────────────────────────────────────────────────
    app.post('/api/auth/invites/create', async (request, reply) => {
        const { email, role } = request.body ?? {};
        const staffHeader = request.headers['x-dente-staff-token'];
        const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
        const staffPayload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
        if (!staffPayload?.organizationId || (staffPayload.role !== 'owner' && staffPayload.role !== 'admin')) {
            return reply.code(403).send({ error: 'Forbidden', message: 'Нет прав на приглашение сотрудников.' });
        }
        if (!email || !role)
            return reply.code(400).send({ error: 'ValidationError', message: 'Укажите email и роль.' });
        const tokenUuid = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.insert(userInvitations).values({
            organizationId: staffPayload.organizationId,
            email: email.toLowerCase().trim(),
            role,
            inviteToken: tokenUuid,
            expiresAt,
            status: 'pending'
        });
        return reply.send({ ok: true, inviteLink: `/#/auth/accept-invite?token=${tokenUuid}` });
    });
    // ─── SaaS Accept Invite ──────────────────────────────────────────────────────
    app.post('/api/auth/invites/accept', async (request, reply) => {
        const { token, fullName, password, pinCode } = request.body ?? {};
        if (!token || !fullName || !password || !pinCode)
            return reply.code(400).send({ error: 'ValidationError', message: 'Заполните все поля.' });
        if (String(password).length < 8) {
            return reply.code(400).send({ error: 'ValidationError', message: 'Пароль должен быть не короче 8 символов.' });
        }
        if (!/^\d{4,12}$/.test(String(pinCode))) {
            return reply.code(400).send({ error: 'ValidationError', message: 'PIN должен состоять из 4–12 цифр.' });
        }
        const [invite] = await db.select().from(userInvitations).where(and(eq(userInvitations.inviteToken, token), eq(userInvitations.status, 'pending'))).limit(1);
        if (!invite || new Date() > invite.expiresAt)
            return reply.code(400).send({ error: 'InvalidToken', message: 'Приглашение недействительно или истекло.' });
        // Приглашение одноразовое: помечаем принятым ДО создания пользователя, чтобы
        // параллельные запросы с одной ссылкой не создали несколько учётных записей.
        const claimed = await db
            .update(userInvitations)
            .set({ status: 'accepted' })
            .where(and(eq(userInvitations.id, invite.id), eq(userInvitations.status, 'pending')))
            .returning({ id: userInvitations.id });
        if (!claimed.length) {
            return reply.code(400).send({ error: 'InvalidToken', message: 'Приглашение уже использовано.' });
        }
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
        if (!user) {
            // Откатываем пометку, чтобы приглашение не сгорело из-за сбоя вставки.
            await db.update(userInvitations).set({ status: 'pending' }).where(eq(userInvitations.id, invite.id));
            return reply.code(500).send({ error: 'InternalError', message: 'Не удалось создать пользователя.' });
        }
        const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, user.organizationId)).limit(1);
        const clinicToken = signToken({ organizationId: user.organizationId, clinicName: org?.name ?? 'Clinic' }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: user.organizationId }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
        return reply.send({ ok: true, clinicToken, staffToken, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
    });
    // ─── SaaS User Profile: Get Current User ──────────────────────────────────────
    app.get('/api/auth/user/me', async (request, reply) => {
        const staffHeader = request.headers['x-dente-staff-token'];
        const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
        const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
        if (!payload?.userId)
            return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
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
            .where(and(eq(users.id, payload.userId), eq(users.isActive, true)))
            .limit(1);
        if (!user)
            return reply.code(404).send({ error: 'NotFound', message: 'Пользователь не найден.' });
        return reply.send({ ok: true, user });
    });
    // ─── SaaS User Profile: Update Password ───────────────────────────────────────
    app.post('/api/auth/user/update-password', async (request, reply) => {
        const { oldPassword, newPassword } = request.body ?? {};
        const staffHeader = request.headers['x-dente-staff-token'];
        const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
        const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
        if (!payload?.userId)
            return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
        if (!oldPassword || !newPassword)
            return reply.code(400).send({ error: 'ValidationError', message: 'Введите старый и новый пароль.' });
        if (String(newPassword).length < 8) {
            return reply.code(400).send({ error: 'ValidationError', message: 'Новый пароль должен быть не короче 8 символов.' });
        }
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
        if (!user || !user.passwordHash)
            return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или пароль не установлен.' });
        if (!verifyCredential(oldPassword, user.passwordHash)) {
            return reply.code(401).send({ error: 'AuthError', message: 'Старый пароль неверен.' });
        }
        const newPasswordHash = hashCredential(newPassword);
        await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));
        return reply.send({ ok: true, message: 'Пароль успешно изменен.' });
    });
    // ─── SaaS User Profile: Update PIN ───────────────────────────────────────────
    app.post('/api/auth/user/update-pin', async (request, reply) => {
        const { oldPin, newPin } = request.body ?? {};
        const staffHeader = request.headers['x-dente-staff-token'];
        const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
        const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;
        if (!payload?.userId)
            return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
        if (!oldPin || !newPin)
            return reply.code(400).send({ error: 'ValidationError', message: 'Введите старый и новый PIN-код.' });
        if (!/^\d{4,12}$/.test(String(newPin))) {
            return reply.code(400).send({ error: 'ValidationError', message: 'PIN должен состоять из 4–12 цифр.' });
        }
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
        if (!user || !user.pinCodeHash)
            return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или PIN не установлен.' });
        if (!verifyCredential(oldPin, user.pinCodeHash)) {
            return reply.code(401).send({ error: 'AuthError', message: 'Старый PIN-код неверен.' });
        }
        const newPinHash = hashCredential(newPin);
        await db.update(users).set({ pinCodeHash: newPinHash }).where(eq(users.id, user.id));
        return reply.send({ ok: true, message: 'PIN-код успешно изменен.' });
    });
}
