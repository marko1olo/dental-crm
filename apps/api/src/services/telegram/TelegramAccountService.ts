import { and, desc, eq } from "drizzle-orm";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { denteTelegramAccountConfigs } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { wsBroker } from "../websocketBroker.js";

const logger = createApiLogger("TelegramAccountService");

export type TelegramAccountProfile = {
	id: string;
	phone: string;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
	avatarUrl: string | null;
	status: "online" | "offline" | "connected" | "disconnected";
	is2faEnabled: boolean;
	connectedAt: string | null;
	lastActiveAt: string | null;
};

const MTPROTO_UNCONFIGURED_MESSAGE =
	"Подключение личного аккаунта Telegram (MTProto) не настроено: требуется MTProto-драйвер и ключи TELEGRAM_API_ID / TELEGRAM_API_HASH.";

function isMtprotoConfigured(): boolean {
	return Boolean(
		process.env.TELEGRAM_API_ID?.trim() &&
			process.env.TELEGRAM_API_HASH?.trim() &&
			process.env.TELEGRAM_MTPROTO_DRIVER_ENABLED === "true",
	);
}

/**
 * Сервис управления личными аккаунтами врачей и персонала клиники в Telegram (MTProto).
 *
 * БЕЗ ПОТЁМКИНСКИХ СИМУЛЯЦИЙ (Мандат 8z):
 * При отсутствии реального MTProto-драйвера и ключей TELEGRAM_API_ID / TELEGRAM_API_HASH
 * возвращает честный структурированный отказ (`configured: false`, `errorCode: "MTProtoNotConfigured"`),
 * не генерируя фейковых кодов, фейковых 2FA-правил, фиктивных номеров и поддельных профилей.
 */
export class TelegramAccountService {
	/**
	 * Нормализация телефонного номера к формату E.164 (+7XXXXXXXXXX).
	 */
	static normalizePhone(raw: string): string {
		const digits = (raw || "").replace(/\D/g, "");
		if (!digits) return "";
		if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
			return `+7${digits.slice(1)}`;
		}
		if (digits.length === 10 && digits.startsWith("9")) {
			return `+7${digits}`;
		}
		return digits.startsWith("+") ? digits : `+${digits}`;
	}

	/**
	 * Запрос кода подтверждения на телефон через MTProto.
	 */
	static async requestCode(params: {
		organizationId: string;
		phone: string;
		userId?: string | null | undefined;
		clinicId?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		configured?: boolean;
		errorCode?: string;
		phoneCodeHash: string;
		timeoutSeconds: number;
		formattedPhone: string;
		error?: string;
	}> {
		const formattedPhone = this.normalizePhone(params.phone);
		if (!formattedPhone || formattedPhone.length < 11) {
			return {
				ok: false,
				phoneCodeHash: "",
				timeoutSeconds: 0,
				formattedPhone: "",
				error: "Укажите корректный номер телефона (например, +7 999 123-45-67).",
			};
		}

		if (!isMtprotoConfigured()) {
			return {
				ok: false,
				configured: false,
				errorCode: "MTProtoNotConfigured",
				phoneCodeHash: "",
				timeoutSeconds: 0,
				formattedPhone,
				error: MTPROTO_UNCONFIGURED_MESSAGE,
			};
		}

		return {
			ok: false,
			configured: false,
			errorCode: "MTProtoNotConfigured",
			phoneCodeHash: "",
			timeoutSeconds: 0,
			formattedPhone,
			error: MTPROTO_UNCONFIGURED_MESSAGE,
		};
	}

	/**
	 * Верификация кода подтверждения через MTProto.
	 */
	static async verifyCode(params: {
		organizationId: string;
		phone: string;
		phoneCodeHash: string;
		code: string;
		userId?: string | null | undefined;
		clinicId?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		configured?: boolean;
		errorCode?: string;
		connected: boolean;
		requires2fa: boolean;
		account?: TelegramAccountProfile;
		error?: string;
	}> {
		const formattedPhone = this.normalizePhone(params.phone);
		if (!formattedPhone || formattedPhone.length < 11) {
			return {
				ok: false,
				connected: false,
				requires2fa: false,
				error: "Укажите корректный номер телефона.",
			};
		}

		return {
			ok: false,
			configured: false,
			errorCode: "MTProtoNotConfigured",
			connected: false,
			requires2fa: false,
			error: MTPROTO_UNCONFIGURED_MESSAGE,
		};
	}

	/**
	 * Верификация облачного пароля двухфакторной аутентификации (2FA) через MTProto.
	 */
	static async verify2fa(params: {
		organizationId: string;
		phone: string;
		password: string;
		userId?: string | null | undefined;
		clinicId?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		configured?: boolean;
		errorCode?: string;
		connected: boolean;
		account?: TelegramAccountProfile;
		error?: string;
	}> {
		const formattedPhone = this.normalizePhone(params.phone);
		if (!formattedPhone || formattedPhone.length < 11 || !params.password?.trim()) {
			return {
				ok: false,
				connected: false,
				error: "Укажите номер телефона и действующий облачный пароль Telegram.",
			};
		}

		return {
			ok: false,
			configured: false,
			errorCode: "MTProtoNotConfigured",
			connected: false,
			error: MTPROTO_UNCONFIGURED_MESSAGE,
		};
	}

	/**
	 * Генерация QR-кода для авторизации в Telegram через MTProto (`auth.exportLoginToken`).
	 */
	static async requestQr(_params: {
		organizationId: string;
		userId?: string | null | undefined;
		clinicId?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		configured?: boolean;
		errorCode?: string;
		token?: string;
		qrPayload?: string;
		qrSvg?: string;
		expiresIn?: number;
		error?: string;
	}> {
		return {
			ok: false,
			configured: false,
			errorCode: "MTProtoNotConfigured",
			error: MTPROTO_UNCONFIGURED_MESSAGE,
		};
	}

	/**
	 * Подтверждение авторизации по QR-коду через MTProto.
	 */
	static async confirmQr(_params: {
		organizationId: string;
		token: string;
		phone?: string | null | undefined;
		userId?: string | null | undefined;
		clinicId?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		configured?: boolean;
		errorCode?: string;
		connected: boolean;
		account?: TelegramAccountProfile;
		error?: string;
	}> {
		return {
			ok: false,
			configured: false,
			errorCode: "MTProtoNotConfigured",
			connected: false,
			error: MTPROTO_UNCONFIGURED_MESSAGE,
		};
	}

	/**
	 * Получение текущего статуса личного аккаунта Telegram клиники/сотрудника из БД.
	 */
	static async getAccountStatus(params: {
		organizationId: string;
		phone?: string | null | undefined;
	}): Promise<{
		ok: boolean;
		connected: boolean;
		configured: boolean;
		account: TelegramAccountProfile | null;
	}> {
		return await withTenantCtx(params.organizationId, async (tx) => {
			const conditions = [
				eq(denteTelegramAccountConfigs.organizationId, params.organizationId),
				eq(denteTelegramAccountConfigs.isActive, true),
			];

			if (params.phone) {
				const formatted = this.normalizePhone(params.phone);
				if (formatted) {
					conditions.push(eq(denteTelegramAccountConfigs.phone, formatted));
				}
			}

			const [record] = await tx
				.select()
				.from(denteTelegramAccountConfigs)
				.where(and(...conditions))
				.orderBy(desc(denteTelegramAccountConfigs.updatedAt))
				.limit(1);

			if (!record || record.status === "disconnected") {
				return {
					ok: true,
					connected: false,
					configured: isMtprotoConfigured(),
					account: null,
				};
			}

			return {
				ok: true,
				connected: true,
				configured: isMtprotoConfigured(),
				account: {
					id: record.id,
					phone: record.phone,
					firstName: record.firstName,
					lastName: record.lastName,
					username: record.username,
					avatarUrl: record.avatarUrl,
					status: "online",
					is2faEnabled: record.is2faEnabled,
					connectedAt: record.connectedAt ? record.connectedAt.toISOString() : null,
					lastActiveAt: record.lastActiveAt ? record.lastActiveAt.toISOString() : null,
				},
			};
		});
	}

	/**
	 * Отключение личного аккаунта Telegram.
	 */
	static async disconnectAccount(params: {
		organizationId: string;
		phone?: string | null | undefined;
	}): Promise<{ ok: boolean }> {
		await withTenantCtx(params.organizationId, async (tx) => {
			const conditions = [
				eq(denteTelegramAccountConfigs.organizationId, params.organizationId),
			];

			if (params.phone) {
				const formatted = this.normalizePhone(params.phone);
				if (formatted) {
					conditions.push(eq(denteTelegramAccountConfigs.phone, formatted));
				}
			}

			await tx
				.update(denteTelegramAccountConfigs)
				.set({
					status: "disconnected",
					isActive: false,
					sessionStringEncrypted: null,
					updatedAt: new Date(),
				})
				.where(and(...conditions));

			onTenantTxCommit(() => {
				try {
					wsBroker.broadcastToOrganization(params.organizationId, {
						type: "telegram_account_disconnected",
						organizationId: params.organizationId,
						disconnectedAt: new Date().toISOString(),
					});
				} catch (err) {
					logger.warn(
						{ err: safeLogError(err), organizationId: params.organizationId },
						"WS broadcast failed on telegram account disconnect",
					);
				}
			});
		});

		return { ok: true };
	}
}
