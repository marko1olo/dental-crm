import { eq } from "drizzle-orm";
import { withSuperuserBypass } from "../../db/rls.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import type { DenteTelegramOutboxRuntimeScope } from "./telegramCanonicalStore.js";
import { telegramMultiTenantSupervisor } from "../../services/telegram/TelegramMultiTenantSupervisor.js";
import { resolveTelegramRuntimeContext } from "./telegramRuntimeResolver.js";
import type { TelegramRuntimeContext } from "./types.js";
import { parseTelegramOutboxRuntimeScopeQuery } from "./telegramUtils.js";

const logger = createApiLogger("telegramOutboxScope");

export function denteTelegramOutboxRuntimeScope(
	runtime: TelegramRuntimeContext,
): DenteTelegramOutboxRuntimeScope {
	return {
		settings: runtime.settings,
		botTokenConfigured: runtime.tokenConfigured,
		botConfigId: runtime.botConfigId,
		clinicId: runtime.clinicId,
	};
}

export type TelegramResolvedOutboxRuntime = {
	context: TelegramRuntimeContext;
	runtimeScope: DenteTelegramOutboxRuntimeScope;
};

export function denteTelegramResolvedOutboxRuntime(
	runtime: TelegramRuntimeContext,
): TelegramResolvedOutboxRuntime {
	return {
		context: runtime,
		runtimeScope: denteTelegramOutboxRuntimeScope(runtime),
	};
}

export function resolveTelegramOutboxRuntimeScopeFromQuery(
	query: unknown,
):
	| { ok: true; runtime: TelegramResolvedOutboxRuntime }
	| { ok: false; statusCode: number; error: string; message: string } {
	const scope = parseTelegramOutboxRuntimeScopeQuery(query);
	const runtimeResult = resolveTelegramRuntimeContext(
		scope.organizationId,
		scope.botConfigId,
	);
	if (!runtimeResult.ok) return runtimeResult;
	return {
		ok: true,
		runtime: denteTelegramResolvedOutboxRuntime(runtimeResult.context),
	};
}

/**
 * Мультитенантное обнаружение всех активных ботов клиник для Outbox-воркера.
 * Предотвращает голодание (Tenant Starvation) клиник кроме дефолтной.
 */
export async function resolveAllTelegramOutboxRuntimes(): Promise<
	TelegramResolvedOutboxRuntime[]
> {
	const runtimes: TelegramResolvedOutboxRuntime[] = [];
	const seenKeys = new Set<string>();

	// 1. Из физической БД: все активные конфигурации ботов (кросс-тенантный опрос под superuser bypass до входа в TX клиники)
	try {
		const configs = await withSuperuserBypass(async (tx) =>
			tx
				.select({
					organizationId: denteTelegramBotConfigs.organizationId,
					botConfigId: denteTelegramBotConfigs.botConfigId,
					mode: denteTelegramBotConfigs.mode,
				})
				.from(denteTelegramBotConfigs)
				.where(eq(denteTelegramBotConfigs.isActive, true)),
		);

		for (const cfg of configs) {
			if (cfg.mode === "disabled") continue;
			const key = `${cfg.organizationId}:${cfg.botConfigId}`;
			if (seenKeys.has(key)) continue;
			seenKeys.add(key);

			const resolved = resolveTelegramRuntimeContext(
				cfg.organizationId,
				cfg.botConfigId,
			);
			if (resolved.ok) {
				runtimes.push(denteTelegramResolvedOutboxRuntime(resolved.context));
			}
		}
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err) },
			"Failed to load Telegram bot configs from DB during outbox runtime discovery",
		);
	}

	// 2. Из Multi-Tenant Supervisor (динамически зарегистрированные боты)
	const supervisorBots = telegramMultiTenantSupervisor.listBots();
	for (const bot of supervisorBots) {
		const key = `${bot.organizationId}:${bot.botConfigId}`;
		if (seenKeys.has(key)) continue;
		seenKeys.add(key);

		const resolved = resolveTelegramRuntimeContext(
			bot.organizationId,
			bot.botConfigId,
		);
		if (resolved.ok) {
			runtimes.push(denteTelegramResolvedOutboxRuntime(resolved.context));
		}
	}

	// 3. Fallback к дефолтной конфигурации (для изоляции тестов)
	if (runtimes.length === 0) {
		const defaultResult = resolveTelegramOutboxRuntimeScopeFromQuery({});
		if (defaultResult.ok) {
			runtimes.push(defaultResult.runtime);
		}
	}

	return runtimes;
}
