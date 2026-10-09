import type {
	BotInstance,
	BotPoolMetrics,
	BotRuntimeStatus,
} from "./types.js";

/**
 * Реестр и пул активных инстансов Telegram-ботов (Layer 2).
 * Обеспечивает строгую изоляцию тенантов по organizationId и управление жизненным циклом:
 * - Регистрация и получение инстансов
 * - Мониторинг статусов (running, polling, webhook, error, rate_limited)
 * - Метрики пула
 * - Graceful shutdown при остановке ноды
 */
export class TelegramBotInstancePool {
	private static instances = new Map<string, BotInstance>();

	private static makeKey(organizationId: string, botConfigId = "default"): string {
		return `${organizationId}:${botConfigId}`;
	}

	/**
	 * Регистрация или обновление инстанса бота в пуле
	 */
	static registerInstance(instance: BotInstance): void {
		const key = this.makeKey(instance.organizationId, instance.botConfigId);
		this.instances.set(key, { ...instance });
	}

	/**
	 * Получение инстанса бота по организации и конфигурации
	 */
	static getInstance(
		organizationId: string,
		botConfigId = "default",
	): BotInstance | undefined {
		const key = this.makeKey(organizationId, botConfigId);
		return this.instances.get(key);
	}

	/**
	 * Получение всех инстансов определенной клиники
	 */
	static getOrganizationInstances(organizationId: string): BotInstance[] {
		const result: BotInstance[] = [];
		for (const instance of this.instances.values()) {
			if (instance.organizationId === organizationId) {
				result.push({ ...instance });
			}
		}
		return result;
	}

	/**
	 * Получение всех инстансов пула
	 */
	static getAllInstances(): BotInstance[] {
		return Array.from(this.instances.values()).map((inst) => ({ ...inst }));
	}

	/**
	 * Обновление рантайм-статуса инстанса
	 */
	static updateInstanceStatus(
		organizationId: string,
		botConfigId: string,
		status: BotRuntimeStatus,
		error?: string | null,
	): boolean {
		const key = this.makeKey(organizationId, botConfigId);
		const existing = this.instances.get(key);
		if (!existing) return false;

		existing.status = status;
		existing.lastHealthCheck = new Date();
		if (error !== undefined) {
			existing.error = error;
		}
		return true;
	}

	/**
	 * Удаление инстанса из пула
	 */
	static unregisterInstance(
		organizationId: string,
		botConfigId = "default",
	): boolean {
		const key = this.makeKey(organizationId, botConfigId);
		return this.instances.delete(key);
	}

	/**
	 * Сброс пула (для тестов и перезапуска)
	 */
	static clear(): void {
		this.instances.clear();
	}

	/**
	 * Безопасная остановка всех активных инстансов
	 */
	static async shutdownAll(): Promise<void> {
		for (const [key, instance] of this.instances.entries()) {
			instance.status = "stopped";
			this.instances.delete(key);
		}
	}

	/**
	 * Метрики пула ботов
	 */
	static getMetrics(): BotPoolMetrics {
		let active = 0;
		let polling = 0;
		let webhook = 0;
		let errors = 0;
		let rateLimited = 0;

		for (const inst of this.instances.values()) {
			if (inst.status === "running") active++;
			if (inst.status === "polling") polling++;
			if (inst.status === "webhook") webhook++;
			if (inst.status === "error") errors++;
			if (inst.status === "rate_limited") rateLimited++;
		}

		return {
			totalInstances: this.instances.size,
			activeInstances: active,
			pollingInstances: polling,
			webhookInstances: webhook,
			errorInstances: errors,
			rateLimitedInstances: rateLimited,
		};
	}
}
