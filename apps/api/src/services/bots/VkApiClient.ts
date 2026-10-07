import crypto from "node:crypto";

export interface VkGroupProfile {
	id: number;
	name: string;
	screen_name: string;
	photo_200?: string;
	is_closed?: number;
	type?: string;
}

export interface VkUserProfile {
	id: number;
	first_name: string;
	last_name: string;
	screen_name?: string;
	photo_100?: string;
	photo_200?: string;
}

export interface VkApiResponse<T> {
	response?: T;
	error?: {
		error_code: number;
		error_msg: string;
		request_params?: Array<{ key: string; value: string }>;
	};
}

export class VkApiError extends Error {
	public errorCode?: number | undefined;

	constructor(message: string, errorCode?: number | undefined) {
		super(message);
		this.name = "VkApiError";
		this.errorCode = errorCode;
	}
}

/**
 * VkApiClient — Интеграционный клиент API ВКонтакте.
 *
 * Обеспечивает:
 * 1. Валидацию токена сообщества (groups.getById).
 * 2. Валидацию токена личной страницы доктора / администратора (users.get).
 * 3. Генерацию Callback API секретов и URL подтверждения.
 * 4. Поддержку детерминированных тестовых токенов (mock_vk_*) для CI/CD без сетевых зависимостей (Мандат 8af).
 */
export class VkApiClient {
	private static readonly API_VERSION = "5.199";
	private static readonly API_BASE = "https://api.vk.com/method";
	private static readonly REQUEST_TIMEOUT_MS = 8000;

	/**
	 * Проверка доступа к сообществу ВКонтакте и получение информации о группе.
	 */
	static async getGroupById(groupId: string, token: string): Promise<VkGroupProfile> {
		const cleanGroupId = groupId.trim().replace(/^club|^public/, "");
		const cleanToken = token.trim();

		if (!cleanGroupId) {
			throw new VkApiError("Не указан ID или короткое имя сообщества ВКонтакте.");
		}
		if (!cleanToken) {
			throw new VkApiError("Не указан ключ доступа (Access Token) сообщества.");
		}

		// Детерминированный мок для тестов и CI/CD
		if (cleanToken.startsWith("mock_vk_group_token") || cleanToken.startsWith("mock_vk_token")) {
			const numericId = Number.parseInt(cleanGroupId.replace(/\D/g, ""), 10) || 220000000;
			return {
				id: numericId,
				name: "Стоматологическая клиника ДЕНТЕ",
				screen_name: cleanGroupId.startsWith("http") ? "dente_clinic" : cleanGroupId,
				photo_200: "https://vk.com/images/community_200.png",
				is_closed: 0,
				type: "group",
			};
		}

		const params = new URLSearchParams({
			group_id: cleanGroupId,
			access_token: cleanToken,
			v: this.API_VERSION,
		});

		try {
			const response = await fetch(`${this.API_BASE}/groups.getById?${params.toString()}`, {
				signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
			});

			if (!response.ok) {
				throw new VkApiError(`Ошибка HTTP сервера ВКонтакте: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as VkApiResponse<VkGroupProfile[] | { groups: VkGroupProfile[] }>;

			if (data.error) {
				const errMsg = this.translateVkError(data.error.error_code, data.error.error_msg);
				throw new VkApiError(errMsg, data.error.error_code);
			}

			const groups = Array.isArray(data.response)
				? data.response
				: (data.response as { groups?: VkGroupProfile[] })?.groups;

			const firstGroup = groups?.[0];
			if (!firstGroup) {
				throw new VkApiError("Сообщество ВКонтакте с указанным идентификатором не найдено.");
			}

			return firstGroup;
		} catch (err: unknown) {
			if (err instanceof VkApiError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new VkApiError(`Не удалось связаться с серверами ВКонтакте: ${message}`);
		}
	}

	/**
	 * Проверка доступа к личному аккаунту ВКонтакте и получение профиля пользователя.
	 */
	static async getUserProfile(token: string, vkUserId?: string): Promise<VkUserProfile> {
		const cleanToken = token.trim();
		if (!cleanToken) {
			throw new VkApiError("Не указан токен личной страницы ВКонтакте.");
		}

		// Детерминированный мок для тестов и CI/CD
		if (cleanToken.startsWith("mock_vk_user_token") || cleanToken.startsWith("mock_user_token")) {
			const numericId = vkUserId ? Number.parseInt(vkUserId.replace(/\D/g, ""), 10) || 77889900 : 77889900;
			return {
				id: numericId,
				first_name: "Александр",
				last_name: "Иванов",
				screen_name: "dr_ivanov_dente",
				photo_100: "https://vk.com/images/camera_100.png",
				photo_200: "https://vk.com/images/camera_200.png",
			};
		}

		const queryRecord: Record<string, string> = {
			fields: "photo_100,photo_200,screen_name",
			access_token: cleanToken,
			v: this.API_VERSION,
		};
		if (vkUserId && vkUserId.trim()) {
			queryRecord.user_ids = vkUserId.trim().replace(/^id/, "");
		}

		const params = new URLSearchParams(queryRecord);

		try {
			const response = await fetch(`${this.API_BASE}/users.get?${params.toString()}`, {
				signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
			});

			if (!response.ok) {
				throw new VkApiError(`Ошибка HTTP сервера ВКонтакте: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as VkApiResponse<VkUserProfile[]>;

			if (data.error) {
				const errMsg = this.translateVkError(data.error.error_code, data.error.error_msg);
				throw new VkApiError(errMsg, data.error.error_code);
			}

			const firstUser = data.response?.[0];
			if (!firstUser) {
				throw new VkApiError("Профиль пользователя ВКонтакте не найден.");
			}

			return firstUser;
		} catch (err: unknown) {
			if (err instanceof VkApiError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new VkApiError(`Не удалось связаться с серверами ВКонтакте: ${message}`);
		}
	}

	/**
	 * Автоматическая генерация надежного Callback API секретного ключа (Secret Key).
	 */
	static generateSecretKey(length = 24): string {
		return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
	}

	/**
	 * Автоматическая генерация строкового токена подтверждения сервера (Confirmation Code).
	 */
	static generateConfirmationCode(length = 8): string {
		return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
	}

	/**
	 * Построение постоянного адреса Callback API вебхука клиники.
	 */
	static buildWebhookUrl(originOrHost: string, organizationId: string): string {
		let base = originOrHost.trim();
		if (!base.startsWith("http://") && !base.startsWith("https://")) {
			base = `https://${base}`;
		}
		// Убираем хвостовой слэш если есть
		base = base.replace(/\/+$/, "");
		return `${base}/api/public/${organizationId}/vk/webhook`;
	}

	/**
	 * Перевод типовых кодов ошибок API ВКонтакте на понятный русский язык.
	 */
	private static translateVkError(code: number, originalMsg: string): string {
		switch (code) {
			case 5:
				return "Недействительный или отозванный ключ доступа (Access Token) ВКонтакте.";
			case 15:
				return "Доступ запрещен: у токена отсутствуют необходимые права (нужен доступ к сообщениям и сообществу).";
			case 100:
				return "Передан неверный параметр запроса (проверьте ID сообщества или пользователя).";
			case 260:
				return "Группа ВКонтакте отключила Callback API или доступ к сообщениям.";
			case 901:
				return "Пользователь запретил отправку сообщений от имени сообщества.";
			default:
				return `Ошибка ВКонтакте (#${code}): ${originalMsg}`;
		}
	}

	/**
	 * Отправка сообщения пользователю от имени сообщества ВКонтакте.
	 */
	static async sendMessage(token: string, recipientVkId: string | number, text: string): Promise<{ ok: boolean; messageId: number }> {
		const cleanToken = token.trim();
		const cleanRecipient = String(recipientVkId).trim().replace(/^id/, "");

		if (!cleanRecipient) {
			throw new VkApiError("Не указан получатель (VK ID).");
		}
		if (!text.trim()) {
			throw new VkApiError("Текст сообщения не может быть пустым.");
		}

		// Детерминированный мок для тестов и CI/CD
		if (cleanToken.startsWith("mock_vk_group_token") || cleanToken.startsWith("mock_vk_token")) {
			return { ok: true, messageId: 101 };
		}

		const params = new URLSearchParams({
			user_id: cleanRecipient,
			message: text.trim(),
			random_id: String(Math.floor(Math.random() * 1e9)),
			access_token: cleanToken,
			v: this.API_VERSION,
		});

		try {
			const response = await fetch(`${this.API_BASE}/messages.send?${params.toString()}`, {
				signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
			});

			if (!response.ok) {
				throw new VkApiError(`Ошибка HTTP сервера ВКонтакте: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as VkApiResponse<number>;
			if (data.error) {
				const errMsg = this.translateVkError(data.error.error_code, data.error.error_msg);
				throw new VkApiError(errMsg, data.error.error_code);
			}

			return { ok: true, messageId: typeof data.response === "number" ? data.response : 101 };
		} catch (err: unknown) {
			if (err instanceof VkApiError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new VkApiError(`Не удалось отправить сообщение ВКонтакте: ${message}`);
		}
	}
}
