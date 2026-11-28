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
import { authTokenSecret } from "../security/authSecret.js";
import {
	getRequestIdentity,
	resolveIdentityFromTokens,
} from "../security/identity.js";
import { recordMedicalRecordAccessAudit } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import {
	hashPortalToken,
	isPortalTokenRevokedInDb,
	portalRevokedBeforeByPatient,
	revokedPortalTokenHashes,
	revokedPortalTokens,
} from "./portal/portalAuthStore.js";
import { PORTAL_TOKEN_KIND } from "./portal/types.js";

/** Сколько ждать кадр AUTH перед закрытием соединения. */
const AUTH_TIMEOUT_MS = 10_000;

/** Коды закрытия из приватного диапазона 4000-4999. */
const CLOSE_AUTH_TIMEOUT = 4408;
const CLOSE_UNAUTHORIZED = 4401;

/**
 * Определяет организацию по токенам из кадра AUTH.
 *
 * Переиспользуется resolveIdentityFromTokens, а не переписывается проверка подписи:
 * там уже реализованы правила, которые легко потерять при копировании —
 * токен сотрудника обязан относиться к той же организации, что и токен
 * кабинета, а послабление x-organization-id включается только явным
 * DENTE_DEV_ALLOW_HEADER_ORG. Заголовок организации сюда намеренно не
 * передаётся, поэтому этой лазейки у сокета нет даже в разработке.
 */
function identityFromTokens(clinicToken: unknown, staffToken: unknown) {
	const cToken =
		typeof clinicToken === "string" && clinicToken.trim()
			? clinicToken.trim()
			: null;
	const sToken =
		typeof staffToken === "string" && staffToken.trim()
			? staffToken.trim()
			: null;
	return resolveIdentityFromTokens(cToken, sToken);
}

/**
 * Проверяет подлинность токена пациента (портал / мобильный кабинет).
 * Гарантирует привязку сокета строго к verified organizationId и patientId из токена.
 */
async function verifyPortalAuthToken(token: unknown): Promise<{ organizationId: string; patientId: string } | null> {
	if (typeof token !== "string" || !token.trim()) return null;
	const trimmed = token.trim();
	if (revokedPortalTokens.has(trimmed) || revokedPortalTokenHashes.has(hashPortalToken(trimmed))) {
		return null;
	}
	let secret: string;
	try {
		secret = authTokenSecret();
	} catch {
		return null;
	}
	const payload = verifyToken(trimmed, secret);
	if (
		!payload ||
		payload.kind !== PORTAL_TOKEN_KIND ||
		typeof payload.sub !== "string" ||
		typeof payload.organizationId !== "string"
	) {
		return null;
	}
	const revokedBefore = portalRevokedBeforeByPatient.get(payload.sub);
	if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
		return null;
	}
	if (await isPortalTokenRevokedInDb(trimmed, payload.organizationId)) {
		return null;
	}
	return { organizationId: payload.organizationId, patientId: payload.sub };
}

export async function registerWebsocketRoutes(app: FastifyInstance) {
	if (!app.hasRequestDecorator("ws")) {
		await app.register(fastifyWebsocket, {
			options: {
				// Кадры здесь маленькие (JSON-уведомления), большой лимит не нужен
				// и только расширяет поверхность для злоупотреблений.
				maxPayload: 1024 * 1024,
			},
		});
	}

	wsBroker.startHeartbeat(30_000);
	app.addHook("onClose", () => {
		wsBroker.clear();
	});

	const handleSecureWsConnection = (socket: WebSocket, request: FastifyRequest) => {
		let authorized = false;
		let currentOrganizationId: string | undefined;
		let currentIdentity: ReturnType<typeof identityFromTokens> | undefined;
		let isPatientSocket = false;

		const authTimer = setTimeout(() => {
			if (!authorized) socket.close(CLOSE_AUTH_TIMEOUT, "auth timeout");
		}, AUTH_TIMEOUT_MS);
		authTimer.unref();

		const finish = () => {
			clearTimeout(authTimer);
			wsBroker.removePresence(socket);
		};
		socket.on("close", finish);
		socket.on("error", finish);

		socket.on("message", async (raw) => {
			const text = raw.toString();

			// Клиент шлёт PING текстом каждые 30 секунд, чтобы держать
			// соединение через прокси. Отвечаем PONG — хук useWebsocket его
			// уже умеет отфильтровывать.
			if (text === "PING") {
				if (socket.readyState === 1) {
					try {
						socket.send("PONG");
					} catch (err) {
						app.log.warn({ err }, "Failed to send PONG frame");
					}
				}
				return;
			}

			let message: { type?: unknown; payload?: Record<string, unknown> };
			try {
				message = JSON.parse(text);
			} catch (err) {
				app.log.error(err, "Failed to parse incoming WebSocket JSON message");
				return;
			}

			// 1. До авторизации разрешен только кадр AUTH
			if (!authorized) {
				if (message?.type !== "AUTH") return;

				const payload = message.payload ?? {};

				// А) Проверяем токен пациента (портал / мобильный кабинет пациента)
				const portalTokenCandidate =
					typeof payload.portalToken === "string"
						? payload.portalToken
						: typeof payload.patientToken === "string"
							? payload.patientToken
							: typeof payload.token === "string"
								? payload.token
								: null;

				const portalAuth = portalTokenCandidate
					? await verifyPortalAuthToken(portalTokenCandidate)
					: null;

				let verifiedOrgId: string | null = null;
				let verifiedUserId: string | undefined = undefined;
				let verifiedPatientId: string | undefined = undefined;
				let isClinical = false;
				let role = "patient";
				let branchId: string | undefined = undefined;

				if (portalAuth) {
					// Авторизован пациент: patientId и organizationId берутся СТРОГО из подписанного токена!
					verifiedOrgId = portalAuth.organizationId;
					verifiedPatientId = portalAuth.patientId;
					verifiedUserId = portalAuth.patientId;
					isPatientSocket = true;
					isClinical = false;
					role = "patient";
				} else {
					// Б) Авторизован сотрудник клиники
					const clinicToken = payload.clinicToken ?? (typeof payload.token === "string" ? payload.token : null);
					const staffToken = payload.staffToken ?? (typeof payload.token === "string" ? payload.token : null);
					const identity = identityFromTokens(clinicToken, staffToken);

					// Строгая проверка: организация и личность обязаны быть проверены (verified = true)
					if (!identity.organizationId || !identity.verified) {
						socket.close(CLOSE_UNAUTHORIZED, "unauthorized");
						return;
					}

					verifiedOrgId = identity.organizationId;
					verifiedUserId = identity.userId ?? undefined;
					currentIdentity = identity;
					role = identity.role ?? "staff";
					isPatientSocket = false;

					// Проверка активной сессии в базе данных при наличии sessionId в токене
					if (identity.sessionId && identity.userId) {
						const checkedUserId = identity.userId;
						const checkedOrgId = identity.organizationId;
						try {
							const { withTenantReadCtx } = await import("../db/rls.js");
							const { users } = await import("../db/schema.js");
							const { eq, and } = await import("drizzle-orm");
							const [user] = await withTenantReadCtx(checkedOrgId, async (tx) =>
								tx
									.select({ currentSessionId: users.currentSessionId })
									.from(users)
									.where(and(eq(users.id, checkedUserId), eq(users.organizationId, checkedOrgId)))
									.limit(1),
							);

							if (!user?.currentSessionId || user.currentSessionId !== identity.sessionId) {
								socket.close(CLOSE_UNAUTHORIZED, "invalid_session");
								return;
							}
						} catch (sessionErr) {
							request.log.warn({ sessionErr }, "Failed to verify session id against database");
							socket.close(CLOSE_UNAUTHORIZED, "session_check_failed");
							return;
						}
					}

					if (socket.readyState !== 1) {
						return;
					}

					// Сотрудник может отслеживать обновления конкретного пациента у кресла
					verifiedPatientId =
						typeof payload.patientId === "string" && payload.patientId.trim()
							? payload.patientId.trim()
							: undefined;

					branchId =
						typeof payload.branchId === "string" && payload.branchId.trim()
							? payload.branchId.trim()
							: undefined;

					const evalResult = evaluateClinicalAccess(identity.role, {
						clinicalRole: identity.clinicalRole,
						canSignMedicalRecords: identity.canSignMedicalRecords,
						specialties: identity.specialties,
					});
					isClinical = evalResult.hasClinicalAccess;
				}

				if (!verifiedOrgId) {
					socket.close(CLOSE_UNAUTHORIZED, "unauthorized");
					return;
				}

				currentOrganizationId = verifiedOrgId;

				wsBroker.addClient(
					socket,
					verifiedOrgId,
					verifiedPatientId,
					isClinical ? true : (isPatientSocket ? "patient" : role),
					branchId,
					verifiedUserId,
					isPatientSocket,
				);
				authorized = true;
				clearTimeout(authTimer);

				// Подтверждение нужно клиенту, чтобы отличать «сокет открыт» от
				// «сокет открыт и подписан»: до AUTH_OK обновления не придут.
				if (socket.readyState === 1) {
					try {
						socket.send(
							JSON.stringify({
								type: "AUTH_OK",
								payload: {
									organizationId: verifiedOrgId,
									role,
									...(verifiedPatientId ? { patientId: verifiedPatientId } : {}),
									...(branchId ? { branchId } : {}),
								},
							}),
						);
					} catch (err) {
						request.log.warn({ err }, "Failed to send AUTH_OK frame");
					}
				}
				request.log.debug(
					{ organizationId: verifiedOrgId, patientId: verifiedPatientId, userId: verifiedUserId, isPatient: isPatientSocket },
					"websocket client subscribed and verified",
				);
				return;
			}

			// 2. Двусторонние команды после успешной авторизации
			const payload = message.payload ?? {};

			// А) Честное измерение сетевой задержки RTT (Zero Math.random)
			if (message.type === "PING_LATENCY") {
				if (socket.readyState === 1) {
					try {
						socket.send(
							JSON.stringify({
								type: "PONG_LATENCY",
								payload: {
									clientTime: payload.clientTime ?? 0,
									serverTime: Date.now(),
								},
							}),
						);
					} catch (err) {
						request.log.warn({ err }, "Failed to send PONG_LATENCY frame");
					}
				}
				return;
			}

			// Б) Мягкое присутствие (Soft Presence) персонала в карточке приема
			if (
				message.type === "STAFF_PRESENCE_HEARTBEAT" ||
				message.type === "STAFF_PRESENCE"
			) {
				if (currentOrganizationId && !isPatientSocket) {
					// Безопасность: данные сотрудника берутся строго из проверенной identity (запрет подделки через payload)
					const staffId = currentIdentity?.userId || "staff-user";
					const staffName = currentIdentity?.fullName || "Сотрудник клиники";
					const role = currentIdentity?.role || "staff";
					const visitId =
						typeof payload.visitId === "string" && payload.visitId.trim()
							? payload.visitId.trim()
							: undefined;
					const patientId =
						typeof payload.patientId === "string" && payload.patientId.trim()
							? payload.patientId.trim()
							: undefined;
					const action = payload.action === "editing" ? "editing" : "viewing";

					wsBroker.updatePresence(socket, currentOrganizationId, {
						staffId,
						staffName,
						role,
						visitId,
						patientId,
						action,
					});
				}
				return;
			}

			if (message.type === "STAFF_PRESENCE_LEAVE") {
				if (!isPatientSocket) {
					wsBroker.removePresence(socket);
				}
				return;
			}

			if (message.type === "STAFF_PRESENCE_QUERY") {
				if (currentOrganizationId && !isPatientSocket && socket.readyState === 1) {
					const vId =
						typeof payload.visitId === "string" && payload.visitId.trim()
							? payload.visitId.trim()
							: undefined;
					const pId =
						typeof payload.patientId === "string" && payload.patientId.trim()
							? payload.patientId.trim()
							: undefined;
					const peers = wsBroker.getPresence(currentOrganizationId, {
						visitId: vId,
						patientId: pId,
					});
					try {
						socket.send(
							JSON.stringify({
								type: "STAFF_PRESENCE_LIST",
								payload: {
									visitId: vId,
									patientId: pId,
									peers,
								},
							}),
						);
					} catch (err) {
						request.log.warn({ err }, "Failed to send STAFF_PRESENCE_LIST");
					}
				}
				return;
			}

			// В) Пакетная синхронизация буфера аудита действий персонала (152-ФЗ)
			if (message.type === "CLIENT_AUDIT_BATCH") {
				if (currentOrganizationId && Array.isArray(payload.events)) {
					for (const evt of payload.events) {
						if (evt && typeof evt === "object") {
							const castEvt = evt as Record<string, unknown>;
							void recordMedicalRecordAccessAudit({
								organizationId: currentOrganizationId,
								patientId:
									typeof castEvt.patientId === "string"
										? castEvt.patientId
										: null,
								actorUserId: currentIdentity?.userId ?? null,
								actorLogin: currentIdentity?.fullName ?? null,
								actorRole: currentIdentity?.role ?? (isPatientSocket ? "patient" : null),
								action:
									typeof castEvt.actionType === "string"
										? castEvt.actionType
										: typeof castEvt.action === "string"
											? castEvt.action
											: "CLIENT_ACTION",
								eventType:
									typeof castEvt.entityType === "string"
										? castEvt.entityType
										: "STAFF_ACTIVITY",
								metadata: (castEvt.details ?? castEvt.metadata ?? {}) as Record<
									string,
									unknown
								>,
							}).catch((err) => {
								request.log.warn(
									{ err },
									"Failed to persist client audit batch event over websocket",
								);
							});
						}
					}

					if (socket.readyState === 1) {
						try {
							socket.send(
								JSON.stringify({
									type: "CLIENT_AUDIT_BATCH_ACK",
									payload: {
										count: payload.events.length,
										status: "accepted",
										syncedAt: new Date().toISOString(),
									},
								}),
							);
						} catch (err) {
							request.log.warn(
								{ err },
								"Failed to send CLIENT_AUDIT_BATCH_ACK frame",
							);
						}
					}
				}
				return;
			}
		});
	};

	app.get(
		"/api/ws/schedule",
		{ websocket: true },
		handleSecureWsConnection,
	);
	app.get(
		"/api/ws/telephony",
		{ websocket: true },
		handleSecureWsConnection,
	);
}
