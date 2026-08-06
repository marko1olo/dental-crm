import Fastify, { type FastifyInstance } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";

/**
 * ЭКЗЕМПЛЯР FASTIFY ДЛЯ ТЕСТА ПО ЖИВОЙ БАЗЕ — С ТЕМ ЖЕ ТЕНАНТ-КОНТЕКСТОМ,
 * КОТОРЫЙ ДАЁТ БОЕВОЙ СЕРВЕР.
 *
 * ЧТО БЫЛО СЛОМАНО. Тесты маршрутов собирают приложение сами: `Fastify()` плюс
 * `registerXxxRoutes(app)`. Мимо такой сборки проходят ДВА хука, которые
 * `server.ts` вешает на настоящее приложение (`createDenteApiApp`, разделы
 * «Глобальная изоляция арендаторов» и `onRequest`):
 *
 *   1. `onRequest` разбирает токены запроса и кладёт организацию в
 *      `request.tenantId`;
 *   2. `onRoute` оборачивает КАЖДЫЙ обработчик в `withTenantCtx(tenantId, …)`.
 *
 * Именно на втором держится вся работа маршрутов с базой: только 10 файлов из
 * 73 в `src/routes/` зовут `withTenantCtx` сами, остальные — включая
 * `reports.ts` и `patients.ts` — полагаются на глобальную обёртку и обращаются
 * к базе через прокси `db`.
 *
 * Под FORCE RLS (миграции 0157–0161) запрос без `app.current_tenant` возвращает
 * НОЛЬ СТРОК и ошибки не даёт. Поэтому маршрут, поднятый в тесте на голом
 * `Fastify()`, отвечал 200 с пустым телом на данные, которые фикстура только что
 * засеяла: `body.totalRub` = 0 вместо 10 000, список пациентов пуст, сводка
 * нулевая. Тест краснел на ассерте, и это выглядело как расхождение в подсчётах,
 * хотя маршрут просто не видел базу.
 *
 * ПОЧЕМУ НЕ `createDenteApiApp` ИЗ `server.ts`. Она поднимает всё приложение
 * целиком — 70+ наборов маршрутов, прокси, туннели, ограничение частоты. Тест
 * одного маршрута получил бы вместе с ним чужие обработчики, чужие хуки и чужие
 * побочные эффекты, а время сборки выросло бы на порядок. Здесь нужен ровно тот
 * контур изоляции, который есть у боевого сервера, и ничего больше.
 *
 * ЭТО НЕ ОСЛАБЛЕНИЕ ИЗОЛЯЦИИ, А ЕЁ ВОСПРОИЗВЕДЕНИЕ. Контекст выставляется по
 * той же `getRequestIdentity`, что и в бою: организация берётся из ПОДПИСАННОГО
 * токена (или из заголовка `x-organization-id`, но только когда включён
 * `DENTE_DEV_ALLOW_HEADER_ORG`, — это решение принимает сама `identity.ts`, а не
 * этот файл). Запроса без опознанной организации обёртка не касается вовсе:
 * такой обработчик по-прежнему идёт без контекста и по-прежнему видит ноль
 * строк — то есть проверки «сессия несуществующей клиники» и «чужой арендатор»
 * продолжают проверять именно то, что проверяли.
 */
export function createTenantTestApp(): FastifyInstance {
	const app = Fastify();

	// Порядок обязателен: `onRoute` срабатывает в момент РЕГИСТРАЦИИ маршрута,
	// поэтому хук должен стоять до `registerXxxRoutes(app)`. Хук, повешенный
	// после, не обернёт ни одного уже зарегистрированного обработчика и молча
	// ничего не сделает.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
		const carrier = request as unknown as Record<string, unknown>;
		const identity = carrier.user as
			| { organizationId?: string | null }
			| undefined;
		if (identity?.organizationId) {
			carrier.tenantId = identity.organizationId;
		}
	});

	app.addHook("onRoute", (routeOptions) => {
		const originalHandler = routeOptions.handler;
		if (!originalHandler) return;
		routeOptions.handler = async function (request, reply) {
			const carrier = request as unknown as Record<string, unknown>;
			const tenantId = carrier.tenantId;
			if (typeof tenantId === "string" && tenantId.length > 0) {
				return withTenantCtx(tenantId, async () =>
					originalHandler.call(this, request, reply),
				);
			}
			return originalHandler.call(this, request, reply);
		};
	});

	return app;
}
