/**
 * identity.ts — единая точка определения "кто прислал запрос".
 *
 * ПРОБЛЕМА, КОТОРУЮ ЭТО РЕШАЕТ
 * До этого файла organizationId брался из заголовка x-organization-id, который
 * присылает сам клиент. Любой человек мог отправить чужой UUID организации и
 * прочитать/изменить карты пациентов другой клиники (нарушение мультитенантности,
 * IDOR). Теперь организация определяется ТОЛЬКО из подписанного токена.
 *
 * Заголовок x-organization-id остаётся рабочим лишь как локальное удобство
 * разработки и только когда явно включён DENTE_DEV_ALLOW_HEADER_ORG=1 и
 * NODE_ENV !== production.
 *
 * ПОЧЕМУ ПОЛЕ verified ТЕПЕРЬ ДЕЙСТВИТЕЛЬНО ПРОВЕРЯЕТСЯ
 * Поле verified заводилось вместе с этим файлом, но не читал его никто: во всём
 * apps/api/src единственным чтением было утверждение в тесте. То есть организация
 * из dev-заголовка помечалась «непроверенной» и после этого допускалась ровно
 * туда же, куда организация из подписанного токена. При DENTE_DEV_ALLOW_HEADER_ORG=1
 * запрос вообще без токена, с одним лишь x-organization-id, создавал клинические
 * записи в названной им самим клинике (201 Created, воспроизведено ревизором).
 * Теперь непроверенная организация действует только на чтение, если процесс
 * принимает соединения из сети.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "./authSecret.js";

export const CLINIC_TOKEN_HEADER = "x-dente-clinic-token";
export const STAFF_TOKEN_HEADER = "x-dente-staff-token";
export const ORGANIZATION_HEADER = "x-organization-id";

export type StaffRole = "owner" | "admin" | "administrator" | "doctor" | "assistant" | "manager" | string;

export interface RequestIdentity {
  organizationId: string | null;
  userId: string | null;
  role: StaffRole | null;
  fullName: string | null;
  /** true, если организация получена из проверенного токена, а не из dev-заголовка. */
  verified: boolean;
}

const EMPTY_IDENTITY: RequestIdentity = {
  organizationId: null,
  userId: null,
  role: null,
  fullName: null,
  verified: false,
};

function headerValue(request: FastifyRequest, name: string): string | null {
  const raw = request.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Заголовок x-organization-id принимается ТОЛЬКО при явном
 * DENTE_DEV_ALLOW_HEADER_ORG=1 и NODE_ENV !== production.
 *
 * БЫЛО: послабление действовало по умолчанию везде, где NODE_ENV !== "production".
 * Это опасно не только в разработке: `npm start` (node dist/server.js) не
 * выставляет NODE_ENV вовсе, поэтому боевой запуск без явной переменной попадал
 * ровно в эту ветку — и клиент мог назвать себя любой клиникой сам.
 * Умолчание переведено в opt-in: чтобы включить, нужно осознанное действие.
 */
function devHeaderOrgAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DENTE_DEV_ALLOW_HEADER_ORG === "1";
}

/** HTTP-методы, которые не меняют состояние. Всё остальное считается записью. */
const READ_ONLY_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Меняет ли запрос состояние.
 *
 * Метод — единственный признак, доступный до разбора тела и до выбора
 * обработчика, поэтому POST-«превью» и POST-«evaluate» тоже считаются записью.
 * Ошибка в сторону отказа стоит разработчику одного логина; ошибка в сторону
 * разрешения стоит клинике чужих записей в карте. Неизвестный метод — запись.
 */
function isStateChangingRequest(request: FastifyRequest): boolean {
  const method = typeof request.method === "string" ? request.method.trim().toUpperCase() : "";
  if (!method) return true;
  return !READ_ONLY_METHODS.has(method);
}

/**
 * Принимает ли процесс соединения из сети.
 *
 * ЗАЧЕМ ИМЕННО ЭТО: непроверенная организация приходит из заголовка, то есть её
 * выбирает сам отправитель запроса. Пока http-сервер не слушает порт, отправитель
 * может быть только внутрипроцессным (app.inject в тестах и smoke-скриптах) —
 * посторонний физически не может прислать заголовок. Как только сервер поднят,
 * отправителем становится кто угодно, кто дотянулся до порта, и заголовку верить
 * нельзя. Ни request.ip, ни NODE_ENV этого различия не дают: при app.inject
 * request.ip равен 127.0.0.1 ровно так же, как у локального curl (проверено).
 * Неизвестное состояние трактуется как сетевое.
 */
function serverAcceptsNetworkConnections(request: FastifyRequest): boolean {
  const httpServer = (request as unknown as { server?: { server?: { listening?: unknown } } }).server?.server;
  if (!httpServer || typeof httpServer.listening !== "boolean") return true;
  return httpServer.listening;
}

/**
 * Единственное место, где решается судьба непроверенной организации:
 * чтение — можно, запись — только если запрос не мог прийти из сети.
 */
function unverifiedOrganizationUsable(request: FastifyRequest): boolean {
  if (!isStateChangingRequest(request)) return true;
  return !serverAcceptsNetworkConnections(request);
}

/**
 * Причина, по которой организация запроса была отброшена. Нужна только для
 * внятного ответа клиенту: решение принимается в unverifiedOrganizationUsable,
 * здесь ничего не решается.
 */
const UNVERIFIED_MUTATION_REJECTION = "unverified-organization-cannot-mutate";

type IdentityRejection = typeof UNVERIFIED_MUTATION_REJECTION;

function identityRejectionOf(request: FastifyRequest): IdentityRejection | null {
  return (request as unknown as { __denteIdentityRejection?: IdentityRejection }).__denteIdentityRejection ?? null;
}

/**
 * Разбирает токены запроса. Результат кэшируется на объекте request,
 * чтобы не пересчитывать HMAC на каждой проверке внутри одного запроса.
 */
export function getRequestIdentity(request: FastifyRequest): RequestIdentity {
  const cached = (request as unknown as { __denteIdentity?: RequestIdentity }).__denteIdentity;
  if (cached) return cached;

  let identity: RequestIdentity = { ...EMPTY_IDENTITY };

  let secret: string;
  try {
    secret = authTokenSecret();
  } catch {
    // Секрет не настроен в production — токены не принимаем вовсе.
    (request as unknown as { __denteIdentity?: RequestIdentity }).__denteIdentity = identity;
    return identity;
  }

  const clinicToken = headerValue(request, CLINIC_TOKEN_HEADER);
  const staffToken = headerValue(request, STAFF_TOKEN_HEADER);

  const clinicPayload = clinicToken ? verifyToken(clinicToken, secret) : null;
  const staffPayload = staffToken ? verifyToken(staffToken, secret) : null;

  if (clinicPayload && typeof clinicPayload.organizationId === "string") {
    identity.organizationId = clinicPayload.organizationId;
    identity.verified = true;
  }

  if (staffPayload && typeof staffPayload.userId === "string") {
    // Токен сотрудника обязан относиться к той же организации, что и токен кабинета.
    const staffOrg = typeof staffPayload.organizationId === "string" ? staffPayload.organizationId : null;
    if (!identity.organizationId && staffOrg) {
      identity.organizationId = staffOrg;
      identity.verified = true;
    }
    if (!staffOrg || staffOrg === identity.organizationId) {
      identity.userId = staffPayload.userId;
      identity.role = typeof staffPayload.role === "string" ? staffPayload.role : null;
      identity.fullName = typeof staffPayload.fullName === "string" ? staffPayload.fullName : null;
    }
  }

  if (!identity.organizationId && devHeaderOrgAllowed()) {
    const headerOrg = headerValue(request, ORGANIZATION_HEADER);
    if (headerOrg) {
      identity.organizationId = headerOrg;
      identity.verified = false;
    }
  }

  // Пост-условие: метка verified проверяется здесь, а не в requireOrganizationId.
  // organizationId читают ещё accessGuard.resolveOrganizationId (diary, templates,
  // workspaceProfile), accessGuard.requireResolvedStaffOrAdminOrganizationId,
  // security/permissions.ts и request.user — если поставить проверку в один
  // аккессор, остальные продолжат получать непроверенную организацию. Правило
  // применяется к готовой личности, поэтому любой будущий источник непроверенной
  // организации попадёт под него автоматически.
  //
  // Отбрасывается только организация: userId/role/fullName приходят из подписанного
  // токена сотрудника и остаются достоверными.
  if (identity.organizationId && !identity.verified && !unverifiedOrganizationUsable(request)) {
    identity = { ...identity, organizationId: null };
    (request as unknown as { __denteIdentityRejection?: IdentityRejection }).__denteIdentityRejection =
      UNVERIFIED_MUTATION_REJECTION;
    const log = (request as unknown as { log?: { warn?: (message: string) => void } }).log;
    log?.warn?.(
      `[security] Заголовок ${ORGANIZATION_HEADER} отклонён для ${request.method} ${request.url}: ` +
        "непроверенная организация не может изменять данные на работающем сервере."
    );
  }

  (request as unknown as { __denteIdentity?: RequestIdentity }).__denteIdentity = identity;
  // Совместимость: код, читающий request.user, продолжает работать.
  if (identity.organizationId) {
    (request as unknown as { user?: unknown }).user = {
      organizationId: identity.organizationId,
      id: identity.userId,
      role: identity.role,
      fullName: identity.fullName,
    };
  }
  return identity;
}

/**
 * Возвращает organizationId запроса или отправляет 401 и возвращает null.
 * Используйте это вместо чтения заголовка x-organization-id.
 */
export function requireOrganizationId(request: FastifyRequest, reply: FastifyReply): string | null {
  const identity = getRequestIdentity(request);
  if (!identity.organizationId) {
    if (identityRejectionOf(request) === UNVERIFIED_MUTATION_REJECTION) {
      // Отдельный код ответа, чтобы разработчик не искал причину часами: заголовок
      // был прислан и принят настройкой, но на запись его не хватает.
      reply.code(401).send({
        error: "UnverifiedOrganizationCannotMutate",
        message:
          `Заголовок ${ORGANIZATION_HEADER} определяет клинику только для чтения и только в локальной разработке. ` +
          "Для изменения данных нужен подписанный токен рабочего кабинета.",
      });
      return null;
    }
    reply.code(401).send({
      error: "AuthRequired",
      message: "Требуется авторизация рабочего кабинета клиники.",
    });
    return null;
  }
  return identity.organizationId;
}

/**
 * Требует авторизованного сотрудника (не только токен кабинета).
 * Возвращает null и отправляет 401/403 при неудаче.
 */
export function requireStaffIdentity(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles?: readonly StaffRole[]
): RequestIdentity | null {
  const identity = getRequestIdentity(request);
  if (!identity.organizationId || !identity.userId) {
    reply.code(401).send({
      error: "AuthRequired",
      message: "Требуется вход сотрудника.",
    });
    return null;
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const role = (identity.role ?? "").toLowerCase();
    if (!allowedRoles.some((allowed) => allowed.toLowerCase() === role)) {
      reply.code(403).send({
        error: "Forbidden",
        message: "Недостаточно прав для этой операции.",
      });
      return null;
    }
  }
  return identity;
}

/** Роли, которым разрешены административные действия. */
export const ADMIN_ROLES = ["owner", "admin", "administrator"] as const;
