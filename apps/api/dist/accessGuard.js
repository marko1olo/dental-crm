import "dotenv/config";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";
import { authTokenSecret, clinicalAdminSecret } from "./security/authSecret.js";
import { getRequestIdentity, requireOrganizationId as requireVerifiedOrganizationId } from "./security/identity.js";
export const denteAdminSecretHeader = "x-dente-admin-secret";
export function configuredClinicalAccessSecret() {
    return clinicalAdminSecret();
}
export function configuredClinicalMutationSecret() {
    return configuredClinicalAccessSecret();
}
function clinicalMutationsUnguardedAllowed() {
    return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
}
function clinicalReadsUnguardedAllowed() {
    return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS === "1";
}
export async function requireClinicalMutationAccess(request, reply, protectedArea = "clinical mutation") {
    const adminSecret = configuredClinicalMutationSecret();
    if (!adminSecret) {
        if (clinicalMutationsUnguardedAllowed())
            return true;
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
export async function requireClinicalReadAccess(request, reply, protectedArea = "clinical read") {
    const adminSecret = configuredClinicalAccessSecret();
    if (!adminSecret) {
        if (clinicalReadsUnguardedAllowed())
            return true;
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
export async function resolveOrganizationId(request) {
    return getRequestIdentity(request).organizationId;
}
/**
 * Возвращает organizationId из проверенного токена либо отправляет 401.
 */
export async function requireResolvedOrganizationId(request, reply, _protectedArea) {
    return requireVerifiedOrganizationId(request, reply);
}
/**
 * requireResolvedStaffOrAdminOrganizationId — как requireResolvedOrganizationId,
 * но дополнительно требует авторизованного сотрудника (не только токен кабинета).
 */
export async function requireResolvedStaffOrAdminOrganizationId(request, reply, _protectedArea) {
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
export async function requireClinicalReadContext(request, reply, protectedArea = "clinical read") {
    if (!(await requireClinicalReadAccess(request, reply, protectedArea)))
        return null;
    const organizationId = await requireVerifiedOrganizationId(request, reply);
    if (!organizationId)
        return null;
    return { organizationId };
}
export async function requireClinicalMutationContext(request, reply, protectedArea = "clinical mutation") {
    if (!(await requireClinicalMutationAccess(request, reply, protectedArea)))
        return null;
    const organizationId = await requireVerifiedOrganizationId(request, reply);
    if (!organizationId)
        return null;
    return { organizationId };
}
/**
 * requireNonDoctorAccess — allows any authenticated non-doctor (admin, staff)
 * through. Doctors are restricted from certain write routes.
 */
export async function requireNonDoctorAccess(request, reply, protectedArea = "non-doctor mutation") {
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
export function requireAuthTokenSecret() {
    return authTokenSecret();
}
