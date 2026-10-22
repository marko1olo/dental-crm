import type { FastifyReply, FastifyRequest } from "fastify";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { unguardedBypassAllowed } from "../accessGuard.js";
import { repairMojibakeText } from "../text/repairMojibake.js";
import {
	clinicSessionMissingMessage,
	clinicSessionRejectedMessage,
} from "../utils/clinicSessionRefusal.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { TOKEN_SECRET } from "./auth.js";

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

/**
 * Валидация токена организации клиники из заголовка.
 */
export function requireClinicOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;
	if (typeof clinicToken !== "string" || !clinicToken) {
		reply.code(401).send({
			error: "AuthRequired",
			message: clinicSessionMissingMessage(
				"расписание клиники ведётся только из кабинета",
			),
		});
		return null;
	}
	if (
		clinicToken.startsWith("demo-showcase-token") ||
		clinicToken.startsWith("demo-showcase-clinic-token")
	) {
		return DEMO_SHOWCASE_ORG_ID;
	}
	const payload = verifyToken(clinicToken, TOKEN_SECRET());
	if (!payload?.organizationId) {
		reply
			.code(401)
			.send({ error: "AuthExpired", message: clinicSessionRejectedMessage });
		return null;
	}
	return payload.organizationId as string;
}

/**
 * Проверка доступа для изменяющих операций расписания (Мандаты 8e & 8n).
 * Врач или администратор с валидным токеном кабинета клиники управляет
 * расписанием свободно, без требования ввода админского секрета.
 */
export async function requireScheduleMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "schedule mutation",
): Promise<boolean> {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;
	if (
		typeof clinicToken === "string" &&
		(clinicToken.startsWith("demo-showcase-token") ||
			clinicToken.startsWith("demo-showcase-clinic-token"))
	) {
		return true;
	}

	// Мандаты 8e & 8n: Авторизованный персонал клиники с токеном кабинета
	// имеет полный суверенный доступ к расписанию без бюрократических паролей.
	if (typeof clinicToken === "string" && clinicToken.trim().length > 0) {
		const payload = verifyToken(clinicToken, TOKEN_SECRET());
		if (payload?.organizationId) {
			return true;
		}
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
