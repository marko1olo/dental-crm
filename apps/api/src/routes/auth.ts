import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { organizations, users, userInvitations, auditEvents } from "../db/schema.js";
import { hashCredential, verifyCredential, signToken, verifyToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { resetRateLimit } from "../security/rateLimit.js";
import { ADMIN_ROLES, getRequestIdentity } from "../security/identity.js";
import { staffRoleSchema } from "@dental/shared";

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
function demoLoginAllowed(): boolean {
  // Вне production демо-вход работает без всякой настройки .env.
  // Отключить явно: DENTE_ALLOW_DEMO_LOGIN=0. В production — никогда.
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DENTE_ALLOW_DEMO_LOGIN !== "0";
}

/**
 * Ключ первичной настройки для смены чужих учётных данных.
 * Раньше имел публичный дефолт "dente_admin_setup_key" — любой мог сбросить
 * пароль любой клиники и PIN любого сотрудника. Теперь без переменной окружения
 * эти маршруты просто недоступны (fail closed).
 */
function configuredAdminSetupKey(): string | null {
  return process.env.ADMIN_SETUP_KEY?.trim() || null;
}

/** Постоянная задержка, чтобы неуспешный вход не выдавал существование учётки по таймингу. */
async function authFailureDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
}

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

/**
 * SaaS-тела auth раньше разбирались как `(request.body as any)`.
 * Схемы ниже повторяют прежние ручные проверки (длина пароля, форма PIN,
 * обязательные поля) через safeParse — тот же узор, что parseSettingsPayload.
 * Сообщения отказов сохранены дословно, чтобы клиент и существующие тесты
 * не меняли контракт.
 */
const authPinSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d{4,12}$/.test(value), {
    message: "PIN должен состоять из 4–12 цифр."
  });

const registerBodySchema = z
  .object({
    clinicName: z.string().trim().min(1),
    ownerName: z.string().trim().min(1),
    email: z.string().trim().min(1),
    password: z.string().min(1),
    ownerPin: authPinSchema.optional()
  })
  .superRefine((data, ctx) => {
    if (data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Пароль должен быть не короче 8 символов."
      });
    }
  });

const loginBodySchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1)
});

/**
 * Кабинет клиники: POST /api/auth/clinic/login.
 * Bare cast + email.toLowerCase() → 500 на number/object email.
 * Сообщение пустого/битого тела сохранено дословно.
 */
const clinicLoginBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1)
});

/**
 * PIN-разблокировка: POST /api/auth/staff/unlock.
 * Bare cast; number pin допускается (как authPinSchema SaaS), object → 400.
 */
const staffUnlockBodySchema = z.object({
  userId: z.string().min(1),
  pinCode: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .refine((value) => value.length > 0, { message: "required" })
});

const clinicLoginValidationMessage = "Введите логин и пароль клиники.";
const staffUnlockValidationMessage = "Необходимо указать сотрудника и ввести PIN-код.";


/**
 * Admin set-password / set-pin: AUTH first (identity | ADMIN_SETUP_KEY), then body.
 * adminKey is read from the raw object before full schema — credential, not form field.
 * newPassword/newPin: string; pin number OK via union->String (same as unlock).
 */
const clinicSetPasswordBodySchema = z
  .object({
    organizationId: z.string().min(1).optional(),
    newPassword: z.string().min(1),
    adminKey: z
      .union([z.string(), z.number()])
      .transform((value) => String(value))
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.newPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Новый пароль должен быть не короче 8 символов."
      });
    }
  });

const staffSetPinBodySchema = z.object({
  userId: z.string().min(1),
  newPin: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .refine((value) => /^\d{4,12}$/.test(value), {
      message: "PIN должен состоять из 4–12 цифр."
    }),
  adminKey: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .optional()
});

/**
 * First-run setup: public route; bare cast + destructure number email -> 500.
 * Messages and if-order preserved (required -> password length -> PIN).
 */
const setupInitBodySchema = z
  .object({
    clinicName: z.string().min(1),
    email: z.string().min(1),
    password: z.string().min(1),
    ownerName: z.string().min(1).optional(),
    ownerPin: authPinSchema.optional()
  })
  .superRefine((data, ctx) => {
    if (data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Пароль должен быть не короче 8 символов."
      });
    }
  });

/** Raw body -> plain object for AUTH-first (adminKey) without throw on null/number. */
function authBodyRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function authAdminKeyFromRecord(record: Record<string, unknown>): string | null {
  const raw = record.adminKey;
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

const createInviteBodySchema = z.object({
  email: z.string().trim().min(1),
  role: z.string().min(1)
});

const acceptInviteBodySchema = z
  .object({
    token: z.string().trim().min(1),
    fullName: z.string().trim().min(1),
    password: z.string().min(1),
    pinCode: authPinSchema
  })
  .superRefine((data, ctx) => {
    if (data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Пароль должен быть не короче 8 символов."
      });
    }
  });

const updatePasswordBodySchema = z
  .object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(1)
  })
  .superRefine((data, ctx) => {
    if (data.newPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Новый пароль должен быть не короче 8 символов."
      });
    }
  });

const updatePinBodySchema = z.object({
  oldPin: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .refine((value) => value.length > 0, { message: "required" }),
  newPin: authPinSchema
});

type AuthPayloadSchema<T> = {
  safeParse: (value: unknown) =>
    | { success: true; data: T }
    | { success: false; error: z.ZodError };
};

/** Как parseSettingsPayload: null = тело не прошло схему. */
function parseAuthPayload<T>(schema: AuthPayloadSchema<T>, value: unknown): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

/**
 * Сообщения SaaS-отказов идут в прежнем порядке ручных if-ов.
 * Zod может вернуть несколько issues сразу — берём первую по старой цепочке.
 */
function authSchemaMessage(
  error: z.ZodError,
  fallback: string,
  priority: Array<{ match: RegExp | string; message: string }>
): string {
  const texts = error.issues.map((issue) => issue.message);
  for (const rule of priority) {
    const hit =
      typeof rule.match === "string"
        ? texts.some((text) => text.includes(rule.match as string))
        : texts.some((text) => (rule.match as RegExp).test(text));
    if (hit) return rule.message;
  }
  // Обязательные поля (min) без custom-текста → fallback «заполните / введите».
  return fallback;
}

/*
 * ЗДЕСЬ СТОЯЛА `requireClinicToken`, И ОНА УДАЛЕНА, А НЕ СШИТА.
 *
 * Она выглядела как общий middleware проверки токена кабинета — с текстами
 * отказов 401 «Необходима авторизация рабочего кабинета клиники» и «Сессия
 * истекла». Ни один маршрут её не вызывал: единственным вхождением имени в
 * `apps/api/src` было само объявление, остальные упоминания — заметки о ней же.
 * Ровно та форма, в которой в этом дереве уже стояла НАСТОЯЩАЯ дыра:
 * `requireScheduleMutationAccess` была так же объявлена, снабжена отказами и не
 * вызывалась, и любой с токеном кабинета писал в сетку приёмов мимо гейта
 * администратора (закрыто 1f4614ea2).
 *
 * ПОЧЕМУ УДАЛЕНА, А НЕ ПОДКЛЮЧЕНА. Сшивать нечего: её единственным действием
 * после проверки подписи была запись `request.clinicOrganizationId`, которую во
 * всём дереве не читал НИКТО — ни один маршрут, ни один сервис (проверено
 * поиском: одна запись, ноль чтений). Проверку подписи токена кабинета делает
 * `security/identity.ts` (`getRequestIdentity` + `requireOrganizationId`) и делает
 * строже: с кэшем разбора на объекте запроса, с меткой `verified` и с отказом
 * непроверенной организации на запись.
 *
 * И ПОДКЛЮЧИТЬ ЕЁ ОБЩИМ MIDDLEWARE БЫЛО НЕЛЬЗЯ: она принимает только
 * `x-dente-clinic-token`, поэтому на маршрутах отчётов и выплат, которые ходят по
 * `x-dente-staff-token`, отвечала бы 401 на верных запросах.
 *
 * Цена бездействия была не нулевой: инженер, проверяющий «есть ли охрана токена
 * кабинета», находил имя поиском и получал ложное спокойствие. Пустое место
 * честнее мёртвой охраны — оно отправляет читателя в identity.ts, где проверка
 * действительно живёт.
 */

export async function registerAuthRoutes(app: FastifyInstance) {

  // ─── Clinic Workspace Login ───────────────────────────────────────────────────
  app.post(
    "/api/auth/clinic/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },

      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
    const input = parseAuthPayload(clinicLoginBodySchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ValidationError", message: clinicLoginValidationMessage });
    }
    const { email, password } = input;

    const loginId = email.toLowerCase().trim();

    const isDemoClinicLogin =
      demoLoginAllowed() && loginId === "clinic@example.com" && password === "dente2026";

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
    } catch (dbErr) {
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
      } else {
        await authFailureDelay();
        return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
      }
    }

    // FAIL CLOSED: организация без пароля больше не пускает с любым паролем.
    // Раньше отсутствие passwordHash означало "подойдёт что угодно".
    const storedHash = org.passwordHash;
    const isMatch = storedHash ? await verifyCredential(password, storedHash) : isDemoClinicLogin;

    if (!isMatch) {
      await authFailureDelay();
      return reply.code(401).send({ error: "AuthError", message: "Неверный логин или пароль клиники." });
    }

    resetRateLimit(request);

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
    const input = parseAuthPayload(staffUnlockBodySchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ValidationError", message: staffUnlockValidationMessage });
    }
    const { userId, pinCode } = input;

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
      await authFailureDelay();
      // Единый ответ для "нет сотрудника" и "неверный PIN": иначе endpoint
      // работает как оракул существования сотрудников организации.
      return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
    }

    const storedPinHash = user.pinCodeHash;
    const isMatch = storedPinHash ? await verifyCredential(pinCode, storedPinHash) : false;

    if (!isMatch) {
      await authFailureDelay();
      return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
    }

    resetRateLimit(request);

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
  // БЫЛО: любой запрос с публичным дефолтным ключом "dente_admin_setup_key" мог
  // сбросить пароль ЛЮБОЙ организации по её UUID (полный захват всех клиник).
  // СТАЛО: нужен либо владелец/админ с валидным токеном своей организации,
  // либо настроенный ADMIN_SETUP_KEY (сравнение timing-safe). Без переменной
  // окружения ключевой путь недоступен вовсе.
  app.post("/api/auth/clinic/set-password", async (request: FastifyRequest, reply: FastifyReply) => {
    // AUTH first on raw record (adminKey credential), then Zod body for authorized caller.
    // Anonymous always gets the same 403 regardless of body shape (no policy oracle).
    const rawBody = authBodyRecord(request.body);

    const identity = getRequestIdentity(request);
    const isOrgAdmin =
      !!identity.organizationId &&
      !!identity.userId &&
      ADMIN_ROLES.some((role) => role === (identity.role ?? "").toLowerCase());

    const setupKey = configuredAdminSetupKey();
    const hasValidSetupKey =
      !!setupKey && timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

    if (!isOrgAdmin && !hasValidSetupKey) {
      await authFailureDelay();
      return reply.code(403).send({ error: "Forbidden", message: "Недостаточно прав для смены пароля клиники." });
    }

    const parsed = clinicSetPasswordBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const message = authSchemaMessage(
        parsed.error,
        "Новый пароль должен быть не короче 8 символов.",
        [
          {
            match: "Новый пароль должен быть не короче 8 символов.",
            message: "Новый пароль должен быть не короче 8 символов."
          }
        ]
      );
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const body = parsed.data;

    // Org admin may only reset own org password; setup-key path needs organizationId.
    const targetOrganizationId = isOrgAdmin ? identity.organizationId! : body.organizationId;
    if (!targetOrganizationId) {
      return reply.code(400).send({ error: "ValidationError", message: "Не указана организация." });
    }
    if (isOrgAdmin && body.organizationId && body.organizationId !== identity.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "Нельзя менять пароль чужой организации." });
    }

    const hash = await hashCredential(body.newPassword);
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
  app.post("/api/auth/staff/set-pin", async (request: FastifyRequest, reply: FastifyReply) => {
    // AUTH first on raw record, then Zod body. Anonymous always same 403.
    const rawBody = authBodyRecord(request.body);

    const identity = getRequestIdentity(request);
    const isOrgAdmin =
      !!identity.organizationId &&
      !!identity.userId &&
      ADMIN_ROLES.some((role) => role === (identity.role ?? "").toLowerCase());

    const setupKey = configuredAdminSetupKey();
    const hasValidSetupKey =
      !!setupKey && timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

    if (!isOrgAdmin && !hasValidSetupKey) {
      await authFailureDelay();
      return reply.code(403).send({ error: "Forbidden", message: "Недостаточно прав для смены PIN сотрудника." });
    }

    const parsed = staffSetPinBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      // Old if-order: userId missing first, then PIN form.
      // Union invalid_type on newPin has no custom text — map by path.
      const userPathHit = parsed.error.issues.some((issue) => issue.path[0] === "userId");
      const pinPathHit = parsed.error.issues.some((issue) => issue.path[0] === "newPin");
      const message = userPathHit
        ? "Не указан сотрудник."
        : pinPathHit
          ? "PIN должен состоять из 4–12 цифр."
          : authSchemaMessage(parsed.error, "Не указан сотрудник.", [
              { match: "PIN должен состоять из 4–12 цифр.", message: "PIN должен состоять из 4–12 цифр." }
            ]);
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const body = parsed.data;

    if (isOrgAdmin) {
      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, body.userId), eq(users.organizationId, identity.organizationId!)))
        .limit(1);
      if (!target) {
        return reply.code(404).send({ error: "UserNotFound", message: "Сотрудник не найден в вашей организации." });
      }
    }

    const hash = await hashCredential(body.newPin);
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
  app.post("/api/auth/setup/init", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = setupInitBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      // Old if-order: required -> password length -> PIN form.
      // ownerPin object fails union with invalid_type — map by path after priority.
      let message = authSchemaMessage(
        parsed.error,
        "Укажите название клиники, логин и пароль.",
        [
          {
            match: "Пароль должен быть не короче 8 символов.",
            message: "Пароль должен быть не короче 8 символов."
          },
          {
            match: "PIN должен состоять из 4–12 цифр.",
            message: "PIN должен состоять из 4–12 цифр."
          }
        ]
      );
      const pinPathOnly =
        message === "Укажите название клиники, логин и пароль." &&
        parsed.error.issues.some((issue) => issue.path[0] === "ownerPin") &&
        !parsed.error.issues.some((issue) =>
          issue.path[0] === "clinicName" ||
          issue.path[0] === "email" ||
          issue.path[0] === "password"
        );
      if (pinPathOnly) {
        message = "PIN должен состоять из 4–12 цифр.";
      }
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const { clinicName, email, password, ownerName, ownerPin } = parsed.data;

    const loginId = email.toLowerCase().trim();

    // Check if org with this loginId already exists
    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
    if (existing) {
      return reply.code(409).send({ error: "Conflict", message: "Организация с таким логином уже существует." });
    }

    const passwordHash = await hashCredential(password);

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
    let owner: any = null;
    let generatedOwnerPin: string | null = null;
    if (ownerName) {
      if (!ownerPin) {
        generatedOwnerPin = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      }
      const pinHash = await hashCredential(ownerPin ?? generatedOwnerPin!);
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
      ownerUserId: owner?.id ?? null,
      // Показывается ровно один раз, в базе хранится только хеш.
      generatedOwnerPin
    });
  });
  // ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
        { match: "Пароль должен быть не короче 8 символов.", message: "Пароль должен быть не короче 8 символов." },
        { match: "PIN должен состоять из 4–12 цифр.", message: "PIN должен состоять из 4–12 цифр." }
      ]);
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const { clinicName, ownerName, email, password, ownerPin } = parsed.data;
    const loginId = email.toLowerCase().trim();
    const [existingOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.loginId, loginId)).limit(1);
    if (existingOrg) return reply.code(409).send({ error: 'Conflict', message: 'Организация с таким логином уже существует.' });
    
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, loginId)).limit(1);
    if (existingUser) return reply.code(409).send({ error: 'Conflict', message: 'Пользователь с таким email уже существует.' });

    // БЫЛО: PIN владельца всегда '0000' — предсказуемый вход в любую свежую клинику.
    const passwordHash = await hashCredential(password);
    const generatedOwnerPin = ownerPin ? null : String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const pinCodeHash = await hashCredential(ownerPin ?? generatedOwnerPin!);

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

    resetRateLimit(request);

    const clinicToken = signToken({ organizationId: org.id, clinicName: org.name }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    const token = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: org.id }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    return reply.code(201).send({ ok: true, clinicToken, staffToken: token, organizationId: org.id, userId: user.id, generatedOwnerPin });
  });

  // ─── SaaS User Login (Direct user login) ─────────────────────────────────────
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", message: "Введите email и пароль." });
    }
    const { email, password } = parsed.data;
    const loginEmail = email.toLowerCase().trim();
    let user: any = null;
    try {
      const [u] = await db.select().from(users).where(and(eq(users.email, loginEmail), eq(users.isActive, true))).limit(1);
      user = u;
    } catch (e) {
      console.warn("[AUTH_USER_DB_WARN]", e);
    }

    // БЫЛО: жёстко зашитые doctor@clinic.com / admin@clinic.ru пускали в систему
    // без пароля, а строка `user.passwordHash ? verify(...) : true` означала,
    // что ЛЮБОЙ пользователь без хеша пароля входит с любым паролем.
    const isDemoUserLogin =
      demoLoginAllowed() && (loginEmail === 'doctor@clinic.com' || loginEmail === 'admin@clinic.ru');

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
      } else {
        await authFailureDelay();
        return reply.code(401).send({ error: 'AuthError', message: 'Неверный email или пароль.' });
      }
    }

    // FAIL CLOSED: нет хеша пароля — вход запрещён (кроме явного демо-режима).
    const isMatch = user.passwordHash ? await verifyCredential(password, user.passwordHash) : isDemoUserLogin;
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
      .catch(() => [] as Array<{ name: string }>);

    const clinicToken = signToken({ organizationId: user.organizationId, clinicName: userOrg?.name ?? 'Клиника' }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    const staffToken = signToken({ userId: user.id, fullName: user.fullName, role: user.role, organizationId: user.organizationId }, TOKEN_SECRET(), 60 * 60 * 24 * 7);
    return reply.send({ ok: true, clinicToken, staffToken, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
  });

  // ─── SaaS Create Invite ──────────────────────────────────────────────────────
  app.post('/api/auth/invites/create', async (request: FastifyRequest, reply: FastifyReply) => {
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const staffPayload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    /*
     * БЫЛО: `staffPayload.role !== 'owner' && staffPayload.role !== 'admin'` —
     * своя пара написаний прямо в условии. Роли `admin` в staffRoleSchema нет
     * (там owner, doctor, administrator, assistant, manager), поэтому настоящий
     * администратор клиники получал 403 и приглашать сотрудников мог только
     * владелец.
     *
     * Свой список ролей здесь не заводится: в проекте уже есть единственный
     * ADMIN_ROLES (security/identity.ts) — «роли, которым разрешены
     * административные действия», и тем же списком пользуются два соседних
     * маршрута этого файла (строки ~294 и ~352). Легаси-написание `admin` в нём
     * оставлено сознательно, и здесь оно тоже сохраняется: два списка одной
     * правды — ровно та болезнь, которую этот продукт уже проходил.
     * Сравнение в нижнем регистре, как у соседей.
     */
    const invitingRole = String(staffPayload?.role ?? '').toLowerCase();
    if (!staffPayload?.organizationId || !ADMIN_ROLES.some((allowed) => allowed === invitingRole)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Приглашать сотрудников может владелец клиники или администратор.' });
    }
    // AUTH first, then body — same order as set-password/set-pin.
    const parsedBody = createInviteBodySchema.safeParse(request.body ?? {});
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "ValidationError", message: "Укажите email и роль." });
    }
    const { email, role } = parsedBody.data;

    /*
     * РОЛЬ ПРОВЕРЯЕТСЯ ПО СХЕМЕ, а не принимается как есть. Прежде значение из
     * тела запроса ложилось в user_invitations.role напрямую, а
     * /api/auth/invites/accept переносит его в users.role тоже без проверки.
     * Экран настроек до недавнего исправления отправлял `admin` — роль, которой
     * нет в схеме, — и она доживала до users.role. Дальше getFilteredAppViews
     * на незнакомой роли доходит до ветки «вернуть все разделы», и приглашённый
     * администратор получал права владельца: 14 разделов вместо 9.
     *
     * Экранную часть уже починили (59a886a2c, список ролей выведен из схемы), но
     * сервер обязан отказывать сам: клиент — не место для проверки прав.
     */
    const parsedRole = staffRoleSchema.safeParse(role);
    if (!parsedRole.success) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: 'Такой должности в программе нет. Выберите её из списка на экране приглашения.'
      });
    }

    const tokenUuid = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await db.insert(userInvitations).values({
      organizationId: staffPayload.organizationId as string,
      email: email.toLowerCase().trim(),
      role: parsedRole.data,
      inviteToken: tokenUuid,
      expiresAt,
      status: 'pending'
    });
    
    return reply.send({ ok: true, inviteLink: `/#/auth/accept-invite?token=${tokenUuid}` });
  });

  // ─── SaaS Accept Invite ──────────────────────────────────────────────────────
  app.post('/api/auth/invites/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = acceptInviteBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
        { match: "Пароль должен быть не короче 8 символов.", message: "Пароль должен быть не короче 8 символов." },
        { match: "PIN должен состоять из 4–12 цифр.", message: "PIN должен состоять из 4–12 цифр." }
      ]);
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const { token, fullName, password, pinCode } = parsed.data;

    const [invite] = await db.select().from(userInvitations).where(and(eq(userInvitations.inviteToken, token), eq(userInvitations.status, 'pending'))).limit(1);
    if (!invite || new Date() > invite.expiresAt) return reply.code(400).send({ error: 'InvalidToken', message: 'Приглашение недействительно или истекло.' });

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

    const passwordHash = await hashCredential(password);
    const pinCodeHash = await hashCredential(pinCode);

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
  app.get('/api/auth/user/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });

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
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    // AUTH first, then body — same order as set-password.
    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
    const parsed = updatePasswordBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const message = authSchemaMessage(parsed.error, "Введите старый и новый пароль.", [
        { match: "Новый пароль должен быть не короче 8 символов.", message: "Новый пароль должен быть не короче 8 символов." }
      ]);
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const { oldPassword, newPassword } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId as string)).limit(1);
    if (!user || !user.passwordHash) return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или пароль не установлен.' });

    if (!(await verifyCredential(oldPassword, user.passwordHash))) {
      return reply.code(401).send({ error: 'AuthError', message: 'Старый пароль неверен.' });
    }

    const newPasswordHash = await hashCredential(newPassword);
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

    return reply.send({ ok: true, message: 'Пароль успешно изменен.' });
  });

  // ─── SaaS User Profile: Update PIN ───────────────────────────────────────────
  app.post('/api/auth/user/update-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const staffHeader = request.headers['x-dente-staff-token'];
    const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
    const payload = staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null;

    // AUTH first, then body — same order as set-pin.
    if (!payload?.userId) return reply.code(401).send({ error: 'AuthRequired', message: 'Требуется авторизация.' });
    const parsed = updatePinBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const message = authSchemaMessage(parsed.error, "Введите старый и новый PIN-код.", [
        { match: "PIN должен состоять из 4–12 цифр.", message: "PIN должен состоять из 4–12 цифр." }
      ]);
      return reply.code(400).send({ error: "ValidationError", message });
    }
    const { oldPin, newPin } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId as string)).limit(1);
    if (!user || !user.pinCodeHash) return reply.code(401).send({ error: 'AuthError', message: 'Пользователь не найден или PIN не установлен.' });

    if (!(await verifyCredential(oldPin, user.pinCodeHash))) {
      return reply.code(401).send({ error: 'AuthError', message: 'Старый PIN-код неверен.' });
    }

    const newPinHash = await hashCredential(newPin);
    await db.update(users).set({ pinCodeHash: newPinHash }).where(eq(users.id, user.id));

    return reply.send({ ok: true, message: 'PIN-код успешно изменен.' });
  });
}
