import type { FastifyReply, FastifyRequest } from "fastify";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { isDemoShowcaseMode, unguardedBypassAllowed } from "../accessGuard.js";
import { getRequestIdentity, verifyActiveStaffSession } from "../security/identity.js";
import { repairMojibakeText } from "../text/repairMojibake.js";
import {
	clinicSessionMissingMessage,
	clinicSessionRejectedMessage,
} from "../utils/clinicSessionRefusal.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

export const denteAdminSecretHeader = "x-dente-admin-secret";

export const scheduleSecretMissingInRequestMessage =
	"Требуется секрет администратора клиники — расписание меняется только с ним, а в запросе секрет не пришёл. " +
	"Введите секрет администратора в окне расписания и повторите действие; если секрета у вас нет, его выдаёт администратор клиники.";

export const scheduleSecretMismatchMessage =
	"Секрет администратора клиники не принят — присланный секрет не совпал с тем, что задан на сервере этой клиники. " +
	"Проверьте раскладку и регистр, введите секрет заново и повторите действие; если он не подходит, возьмите действующий секрет у администратора клиники.";

export const scheduleSecretNotConfiguredMessage =
	"На сервере клиники не задан секрет администратора для изменения расписания — без него сервер не может проверить право на правку и отказывает. " +
	"Вводить секрет в окне расписания бесполезно, его задаёт в настройках сервера тот, кто устанавливал программу — обратитесь к нему.";

export function configuredScheduleAdminSecret(): string | null {
	return process.env.DENTE_SCHEDULE_ADMIN_SECRET?.trim() || null;
}

export function scheduleUnguardedMutationsAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS");
}

function hasDemoClinicTokenHeader(request: FastifyRequest): boolean {
	if (!isDemoShowcaseMode()) return false;
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
	return (
		typeof clinicToken === "string" &&
		(clinicToken.startsWith("demo-showcase-token") ||
			clinicToken.startsWith("demo-showcase-clinic-token"))
	);
}

function hasAnyAuthTokenHeader(request: FastifyRequest): boolean {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
	return (
		Boolean(clinicToken && typeof clinicToken === "string" && clinicToken.trim()) ||
		Boolean(request.headers.authorization) ||
		Boolean(request.headers["x-dente-staff-token"])
	);
}

/**
 * Валидация контекста организации клиники из токенов запроса (кабинет, сотрудник, Bearer).
 * Интегрирован с каноническим getRequestIdentity (Мандаты 8e & 8n).
 */
export function requireClinicOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	if (hasDemoClinicTokenHeader(request)) {
		return DEMO_SHOWCASE_ORG_ID;
	}

	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		return identity.organizationId;
	}

	if (hasAnyAuthTokenHeader(request)) {
		reply.code(401).send({
			error: "AuthExpired",
			message: clinicSessionRejectedMessage,
		});
		return null;
	}

	reply.code(401).send({
		error: "AuthRequired",
		message: clinicSessionMissingMessage(
			"расписание клиники ведётся только из кабинета",
		),
	});
	return null;
}

/**
 * Асинхронный гард чтения расписания: проверяет токен организации и, при наличии userId,
 * валидирует актуальность сессии сотрудника в БД через verifyActiveStaffSession.
 */
export async function requireScheduleReadContext(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<{ organizationId: string } | null> {
	if (hasDemoClinicTokenHeader(request)) {
		return { organizationId: DEMO_SHOWCASE_ORG_ID };
	}

	const organizationId = requireClinicOrganizationId(request, reply);
	if (!organizationId) return null;

	const identity = getRequestIdentity(request);
	if (identity.userId) {
		const sessionOk = await verifyActiveStaffSession(
			request,
			reply,
			organizationId,
			identity.userId,
			identity.sessionId,
		);
		if (!sessionOk) return null;
	}

	return { organizationId };
}

/**
 * Проверка доступа для изменяющих операций расписания (Мандаты 8e & 8n).
 * Врач или администратор с валидной авторизацией клиники (и активной сессией сотрудника)
 * управляет расписанием свободно, без требования ввода админского секрета.
 */
export async function requireScheduleMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "schedule mutation",
): Promise<boolean> {
	if (hasDemoClinicTokenHeader(request)) {
		return true;
	}

	// Мандаты 8e & 8n: Авторизованный персонал клиники (токен кабинета, staff-токен, Bearer)
	// имеет полный суверенный доступ к расписанию без бюрократических паролей,
	// но при наличии staff-токена (userId) сессия обязана быть активной (не отозванной).
	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		if (identity.userId) {
			return await verifyActiveStaffSession(
				request,
				reply,
				identity.organizationId,
				identity.userId,
				identity.sessionId,
			);
		}
		return true;
	}

	if (hasAnyAuthTokenHeader(request)) {
		reply.code(401).send({
			error: "AuthExpired",
			message: clinicSessionRejectedMessage,
		});
		return false;
	}

	// Лазейка для локальной разработки / тестов
	if (scheduleUnguardedMutationsAllowed()) {
		return true;
	}

	const adminSecret = configuredScheduleAdminSecret();
	if (adminSecret) {
		const providedHeader = request.headers[denteAdminSecretHeader];
		const providedSecret = Array.isArray(providedHeader)
			? providedHeader[0]
			: providedHeader;
		const providedSecretText =
			typeof providedSecret === "string"
				? repairMojibakeText(providedSecret)
				: null;
		if (timingSafeSecretEqual(providedSecretText, adminSecret)) {
			return true;
		}
		reply.code(403).send({
			error: "ScheduleAdminSecretRequired",
			message:
				providedSecretText === null || providedSecretText.trim() === ""
					? scheduleSecretMissingInRequestMessage
					: scheduleSecretMismatchMessage,
			protectedArea,
		});
		return false;
	}

	reply.code(401).send({
		error: "AuthRequired",
		message: clinicSessionMissingMessage(
			"расписание клиники ведётся только из кабинета",
		),
		protectedArea,
	});
	return false;
}

/**
 * Единый шлюз проверки авторизации и контекста организации для мутаций расписания.
 */
export async function requireScheduleMutationContext(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "schedule mutation",
): Promise<{ organizationId: string } | null> {
	const organizationId = requireClinicOrganizationId(request, reply);
	if (!organizationId) return null;
	if (!(await requireScheduleMutationAccess(request, reply, protectedArea)))
		return null;
	return { organizationId };
}
