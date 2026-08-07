/**
 * websocket.ts — эндпоинт живых обновлений /api/ws/schedule.
 *
 * ЧТО БЫЛО СЛОМАНО
 * Плагин @fastify/websocket нигде не регистрировался, маршрута /api/ws/schedule
 * не существовало (проверено: HTTP 404 на рукопожатии), а wsBroker.addClient
 * не вызывался ни из одного файла. То есть набор клиентов в брокере всегда был
 * пуст, и все 27 вызовов wsBroker.broadcast* в 11 файлах ничего никому не
 * отправляли. Живых обновлений в продукте не было вообще, хотя интерфейс на
 * них рассчитан: баланс семейного кошелька, расписание, канбан заявок,
 * одонтограмма и омниканальный инбокс подписаны на сообщения брокера.
 *
 * Практическое следствие для клиники: два администратора, работающие в
 * расписании одновременно, не видят действий друг друга до перезагрузки
 * страницы — прямой путь к двойной записи на один слот.
 *
 * КАК ЗДЕСЬ РЕШЕНА АВТОРИЗАЦИЯ
 * Браузерный WebSocket не умеет ставить заголовки, поэтому обычные
 * x-dente-clinic-token / x-dente-staff-token в рукопожатие не попадают.
 * Токен НЕ передаётся в query-строке: строка запроса попадает в журналы
 * доступа, в историю браузера и в Referer, а по правилам проекта токены
 * нигде не должны сохраняться. Вместо этого клиент после открытия сокета
 * присылает первым кадром сообщение AUTH с токенами, и организация
 * определяется тем же проверенным путём, что и в HTTP — getRequestIdentity
 * по подписанным токенам. До успешной авторизации соединение ничего не
 * получает и закрывается по таймауту.
 */
import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { getRequestIdentity } from "../security/identity.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Регистрация WebSocket-маршрута с приведением типа.
 *
 * @fastify/websocket 11 расширяет интерфейс RouteShorthandOptions, объявляя
 * его с ОДНИМ параметром типа, тогда как fastify 5.8 объявляет его с восемью.
 * Слияние объявлений при разном числе параметров не происходит, поэтому опция
 * `websocket: true` компилятору не видна, а обработчик он считает обычным
 * HTTP-обработчиком с (request, reply). Рантайм при этом полностью рабочий.
 *
 * Приведение локализовано здесь одной строкой, чтобы сам обработчик ниже
 * оставался типизированным (socket: WebSocket, request: FastifyRequest), а не
 * превращался в набор any.
 */
type WebsocketRouteRegistrar = (
	path: string,
	options: { websocket: true },
	handler: (socket: WebSocket, request: FastifyRequest) => void,
) => void;

/** Сколько ждать кадр AUTH перед закрытием соединения. */
const AUTH_TIMEOUT_MS = 10_000;

/** Коды закрытия из приватного диапазона 4000-4999. */
const CLOSE_AUTH_TIMEOUT = 4408;
const CLOSE_UNAUTHORIZED = 4401;

/**
 * Определяет организацию по токенам из кадра AUTH.
 *
 * Переиспользуется getRequestIdentity, а не переписывается проверка подписи:
 * там уже реализованы правила, которые легко потерять при копировании —
 * токен сотрудника обязан относиться к той же организации, что и токен
 * кабинета, а послабление x-organization-id включается только явным
 * DENTE_DEV_ALLOW_HEADER_ORG. Заголовок организации сюда намеренно не
 * передаётся, поэтому этой лазейки у сокета нет даже в разработке.
 */
function identityFromTokens(clinicToken: unknown, staffToken: unknown) {
	const headers: Record<string, string> = {};
	if (typeof clinicToken === "string" && clinicToken.trim()) {
		headers["x-dente-clinic-token"] = clinicToken.trim();
	}
	if (typeof staffToken === "string" && staffToken.trim()) {
		headers["x-dente-staff-token"] = staffToken.trim();
	}
	return getRequestIdentity({ headers } as unknown as FastifyRequest);
}

export async function registerWebsocketRoutes(app: FastifyInstance) {
	await app.register(fastifyWebsocket, {
		options: {
			// Кадры здесь маленькие (JSON-уведомления), большой лимит не нужен
			// и только расширяет поверхность для злоупотреблений.
			maxPayload: 64 * 1024,
		},
	});

	// Приводится САМ app, а не вынимается app.get в переменную: fastify
	// внутри route() читает this[kSupportedHTTPMethods], поэтому оторванный
	// от объекта метод падает с «Cannot read properties of undefined
	// (reading Symbol(fastify.acceptedHTTPMethods))».
	const wsApp = app as unknown as { get: WebsocketRouteRegistrar };

	wsApp.get("/api/ws/schedule", { websocket: true }, (socket, request) => {
		let authorized = false;

		const authTimer = setTimeout(() => {
			if (!authorized) socket.close(CLOSE_AUTH_TIMEOUT, "auth timeout");
		}, AUTH_TIMEOUT_MS);

		const finish = () => clearTimeout(authTimer);
		socket.on("close", finish);
		socket.on("error", finish);

		socket.on("message", (raw) => {
			const text = raw.toString();

			// Клиент шлёт PING текстом каждые 30 секунд, чтобы держать
			// соединение через прокси. Отвечаем PONG — хук useWebsocket его
			// уже умеет отфильтровывать.
			if (text === "PING") {
				if (socket.readyState === 1) socket.send("PONG");
				return;
			}

			// После авторизации входящие команды не предусмотрены: сокет
			// односторонний, сервер только рассылает уведомления.
			if (authorized) return;

			let message: { type?: unknown; payload?: Record<string, unknown> };
			try {
				message = JSON.parse(text);
			} catch (err) {
				app.log.error(err, 'Failed to parse incoming WebSocket JSON message');
				return;
			}
			if (message?.type !== "AUTH") return;

			const payload = message.payload ?? {};
			const identity = identityFromTokens(
				payload.clinicToken,
				payload.staffToken,
			);
			if (!identity.organizationId) {
				socket.close(CLOSE_UNAUTHORIZED, "unauthorized");
				return;
			}

			const patientId =
				typeof payload.patientId === "string" && payload.patientId.trim()
					? payload.patientId.trim()
					: undefined;

			wsBroker.addClient(socket, identity.organizationId, patientId);
			authorized = true;
			clearTimeout(authTimer);

			// Подтверждение нужно клиенту, чтобы отличать «сокет открыт» от
			// «сокет открыт и подписан»: до AUTH_OK обновления не придут.
			socket.send(
				JSON.stringify({
					type: "AUTH_OK",
					payload: { organizationId: identity.organizationId },
				}),
			);
			request.log.debug(
				{ organizationId: identity.organizationId, patientId },
				"websocket client subscribed",
			);
		});
	});
}
