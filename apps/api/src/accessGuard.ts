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

/**
 * Режимы, в которых вообще допустимо обсуждать обход охраны клинических данных.
 * Список ЗАКРЫТЫЙ и перечисляет режимы по имени.
 */
const namedDevelopmentModes = new Set(["development", "test"]);

/**
 * namedDevelopmentModeActive — включён ли ЯВНО НАЗВАННЫЙ режим разработки.
 *
 * ПОЧЕМУ БЕЛЫЙ СПИСОК, А НЕ `NODE_ENV !== "production"`.
 * Прежнее условие было `process.env.NODE_ENV !== "production"`, и оно истинно,
 * когда NODE_ENV НЕ ЗАДАН ВОВСЕ. Безопасность по умолчанию была перевёрнута:
 * охраняло не наличие запрета, а наличие правильно выставленной настройки.
 * Пустое окружение — типовое состояние production-развёртывания: `apps/api/package.json`
 * объявляет `"start": "node dist/server.js"` и NODE_ENV не задаёт, ни один Dockerfile
 * тоже. То есть на настоящем сервере условие «мы не в production» было ИСТИННЫМ,
 * и от раздачи карт пациентов без секрета администратора защищало только то, что
 * второй флаг где-то не выставлен. Система держалась на отсутствии второго условия,
 * а не на первом.
 *
 * Теперь обход требует ЯВНОГО разрешения с двух сторон: названный режим разработки
 * ПЛЮС флаг. Незаданный, пустой или незнакомый NODE_ENV ("staging", "prod", "qa",
 * опечатка в имени) больше не разрешает ничего — он просто не режим разработки.
 * Ошибка в имени режима теперь закрывает доступ, а не открывает его.
 *
 * ЭКСПОРТИРУЕТСЯ НАМЕРЕННО. Тот же перевёрнутый предикат скопирован ещё в четыре
 * места, и каждое даёт обход секрета администратора:
 *   apps/api/src/routes/imaging.ts   — dicomWebSettingsUnguardedAllowed
 *   apps/api/src/routes/schedule.ts  — scheduleUnguardedMutationsAllowed
 *   apps/api/src/routes/settings.ts  — settingsUnguardedMutationsAllowed
 *   apps/api/src/routes/telegram.ts  — isExplicitlyUnguardedControlPlaneAllowed
 * Их должен переписать владелец соответствующих файлов — на этот предикат, а не на
 * пятую копию. Пять копий условия безопасности — это то, как следующая инверсия
 * проникает незамеченной: правку внесут в одну, а остальные останутся открытыми.
 */
export function namedDevelopmentModeActive(): boolean {
  const mode = process.env.NODE_ENV?.trim().toLowerCase();
  return mode !== undefined && namedDevelopmentModes.has(mode);
}

/**
 * unguardedBypassAllowed — единственная законная форма проверки «разрешено ли
 * работать без секрета администратора»: названный режим разработки ПЛЮС явно
 * выставленный флаг.
 *
 * Имя переменной окружения передаётся строкой, чтобы одно и то же условие
 * обслуживало все участки и нигде не переписывалось заново. Опечатка в имени
 * флага здесь безопасна: неизвестная переменная читается как undefined, условие
 * становится ложным и доступ ЗАКРЫВАЕТСЯ. Ошибка в этой функции не может открыть
 * данные, только закрыть — направление отказа выбрано осознанно.
 */
export function unguardedBypassAllowed(flagEnvironmentVariable: string): boolean {
  return namedDevelopmentModeActive() && process.env[flagEnvironmentVariable] === "1";
}

function clinicalMutationsUnguardedAllowed(): boolean {
  return unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS");
}

function clinicalReadsUnguardedAllowed(): boolean {
  return unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_READS");
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
 * Контекст защищённого обработчика: и гейт пройден, и арендатор определён.
 *
 * ЗАЧЕМ: requireClinicalReadAccess/requireClinicalMutationAccess возвращают
 * boolean (пройден ли гейт), а organizationId приходит из другого источника —
 * подписанного токена. Их легко перепутать: в routes/analytics.ts результат
 * гейта присвоили переменной orgId, дальше проверили `typeof orgId !== "string"`
 * — условие всегда истинно, и дашборд молча отдавал пустой ответ. Компилятор
 * такое не ловит: сравнение typeof у boolean легально.
 *
 * Эти две функции соединяют оба шага и возвращают либо готовый организационный
 * идентификатор, либо null (ответ клиенту уже отправлен). Перепутать нечего:
 * возвращается ровно то, что нужно обработчику.
 */
export async function requireClinicalReadContext(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "clinical read",
): Promise<{ organizationId: string } | null> {
  if (!(await requireClinicalReadAccess(request, reply, protectedArea))) return null;
  const organizationId = await requireVerifiedOrganizationId(request, reply);
  if (!organizationId) return null;
  return { organizationId };
}

export async function requireClinicalMutationContext(
  request: FastifyRequest,
  reply: FastifyReply,
  protectedArea = "clinical mutation",
): Promise<{ organizationId: string } | null> {
  if (!(await requireClinicalMutationAccess(request, reply, protectedArea))) return null;
  const organizationId = await requireVerifiedOrganizationId(request, reply);
  if (!organizationId) return null;
  return { organizationId };
}

/**
 * requireNonDoctorAccess — allows any authenticated non-doctor (admin, staff)
 * through. Doctors are restricted from certain write routes.
 *
 * ТЕКСТ ОТКАЗА. Раньше здесь стояло
 * `Доктора не могут выполнять это действие: ${protectedArea}`, а protectedArea —
 * это машинная метка участка (`non-doctor mutation`). Врач получал латинский
 * хвост вместо следующего шага, и вдобавок латинское слово из шести и более букв
 * целиком гасит фразу фильтром клиента (`apps/web/src/AppHelpers.tsx`,
 * `technicalWorkflowFailurePattern` под флагом `/i`) — на экране не оставалось
 * ничего, кроме подсказки по коду 403 «войдите в смену заново», которая врачу не
 * поможет никогда: повторный вход роль не меняет.
 *
 * Метка участка не выброшена, а вынесена в отдельное машинное поле — она нужна в
 * журнале и разработчику, но не человеку. Причина в тексте названа ровно та,
 * которую сервер знает: действие закрыто для роли «врач». Обещать, что у
 * администратора оно точно пройдёт, нельзя — за этой проверкой стоит ещё секрет
 * администратора клиники, поэтому текст просит обратиться, а не гарантирует
 * успех.
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
      protectedArea,
      message:
        "Врачам это действие в программе клиники закрыто. " +
        "Попросите администратора ресепшена, управляющего или владельца клиники выполнить его.",
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
