import type { DenteTelegramOutboxRuntimeScope } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { resolveTelegramRuntimeContext } from "./telegramRuntimeResolver.js";
import type { TelegramRuntimeContext } from "./types.js";
import { parseTelegramOutboxRuntimeScopeQuery } from "./telegramUtils.js";

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
