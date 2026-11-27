import Fastify, { type FastifyInstance } from "fastify";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { getRequestIdentity } from "../../security/identity.js";

/**
 * ЭКЗЕМПЛЯР FASTIFY ДЛЯ ТЕСТА ПО ЖИВОЙ БАЗЕ — С ТЕМ ЖЕ ТЕНАНТ-КОНТЕКСТОМ,
 * КОТОРЫЙ ДАЁТ БОЕВОЙ СЕРВЕР.
 *
 * После 100% перевода маршрутов на типизированные фабрики `routeFactories.ts`
 * глобальный хук `onRoute` отключён и здесь, и в `lifecycleHooks.ts`:
 * маршруты сами открывают `withTenantReadCtx` / `withTenantWriteCtx`, а хук
 * `onRequest` выставляет `request.tenantId` из подписанного токена.
 */
export const activeTenantTestApps = new Set<FastifyInstance>();

/**
 * Гарантированное закрытие всех активных тестовых экземпляров Fastify.
 * Предотвращает утечки таймеров, открытых сокетов и дескрипторов между прогонами.
 */
export async function closeAllTenantTestApps(): Promise<void> {
	const apps = Array.from(activeTenantTestApps);
	activeTenantTestApps.clear();
	await Promise.allSettled(
		apps.map(async (app) => {
			try {
				await app.close();
			} catch {
				// Экземпляр мог быть закрыт тестом явно через after()
			}
		}),
	);
}

export function createTenantTestApp(): FastifyInstance {
	const app = Fastify();
	activeTenantTestApps.add(app);
	app.addHook("onClose", () => {
		activeTenantTestApps.delete(app);
	});

	// Порядок обязателен: `onRoute` срабатывает в момент РЕГИСТРАЦИИ маршрута,
	// поэтому хук должен стоять до `registerXxxRoutes(app)`. Хук, повешенный
	// после, не обернёт ни одного уже зарегистрированного обработчика и молча
	// ничего не сделает.
	app.addHook("onRequest", async (request) => {
		const identity = getRequestIdentity(request);
		const carrier = request as unknown as Record<string, unknown>;
		if (identity?.organizationId) {
			carrier.tenantId = identity.organizationId;
		}
		if (identity?.userId) {
			carrier.user = {
				id: identity.userId,
				role: identity.role,
				organizationId: identity.organizationId,
				fullName: identity.fullName,
				sessionId: identity.sessionId,
			};
		}
	});

	return app;
}

export async function createIdempotentTenantTestApp(): Promise<FastifyInstance> {
	const app = createTenantTestApp();
	await app.register(idempotencyPlugin);
	return app;
}
