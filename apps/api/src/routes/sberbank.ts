import { eq, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { sberbankTransactions } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";

export async function registerSberbankRoutes(app: FastifyInstance) {
	app.post(
		"/api/sberbank/pay",
		{
			schema: {
				body: {
					type: "object",
					required: ["patientId", "amount"],
					properties: {
						patientId: { type: "string", format: "uuid" },
						amount: { type: "integer", minimum: 1 },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const { patientId, amount } = request.body as {
				patientId: string;
				amount: number;
			};

			/*
			 * ИНТЕГРАЦИИ СО СБЕРБАНКОМ В ПРОЕКТЕ НЕТ. Проверено 2026-08-07 по трём
			 * направлениям: обращений к `payment/rest/*` или к любому хосту банка нет
			 * ни одного (единственные совпадения — комментарии этого же файла);
			 * переменных окружения Сбербанка нет в контракте `env/requiredEnv.ts`;
			 * тестов на маршрут нет ни одного.
			 *
			 * ПОЧЕМУ ОТКАЗ, А НЕ ЗАПИСЬ «pending». Прежний код писал строку и отвечал
			 * `{ success: true, orderId }`, ничего никуда не отправив, а обработчик
			 * состояния затем БЕЗУСЛОВНО переводил `pending` → `success`. То есть
			 * система докладывала о поступлении денег, которых не было, и счёт
			 * помечался оплаченным. Для клиники это расхождение кассы с фактом.
			 *
			 * Такой же приём — зашитый `{ success: true }` без сетевого вызова — уже
			 * изымали из этого репозитория осознанно вместе с `syncDaemon`
			 * (пакет P3-syncdaemon, коммит 8c87dcd93). Здесь остаётся тот же класс.
			 *
			 * 501 выбран вместо удаления маршрута намеренно: клиент получает честный
			 * отказ вместо ложного успеха, а точка расширения сохраняется. Когда
			 * появятся учётные данные банка, сюда встаёт настоящий вызов, а ниже —
			 * запись строки по его фактическому ответу.
			 */
			void patientId;
			void amount;
			void db;
			void sberbankTransactions;
			return reply.status(501).send({
				error: "PaymentGatewayNotConfigured",
				message:
					"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
			});
		},
	);

	app.get(
		"/api/sberbank/status/:orderId",
		{
			schema: {
				params: {
					type: "object",
					required: ["orderId"],
					properties: {
						orderId: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;
			const { orderId } = request.params as { orderId: string };
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			const [transaction] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.orderId, orderId),
						eq(sberbankTransactions.organizationId, orgId),
					),
				)
				.limit(1);

			if (!transaction) {
				return reply.status(404).send({ error: "Transaction not found" });
			}

			/*
			 * СОСТОЯНИЕ ОТДАЁТСЯ КАК ХРАНИТСЯ. Прежде здесь стоял безусловный перевод
			 * `pending` → `success` с комментарием «Simulate external Sberbank API»:
			 * любой запрос состояния объявлял платёж успешным, не спросив банк. Тот
			 * же `UPDATE` фильтровался ТОЛЬКО по `orderId`, без `organizationId`, —
			 * а `orderId` собирался из `Date.now()` и `Math.random()*1000`, где
			 * столкновение правдоподобно, значит запись могла уйти чужой клинике.
			 *
			 * Подтверждение состояния обязано приходить от банка: обращением к
			 * `getOrderStatusExtended` либо его уведомлением (callback). Пока
			 * интеграции нет, выдумывать успех нельзя — см. обработчик оплаты выше.
			 */
			return {
				success: true,
				status: transaction.status,
				amount: transaction.amount,
			};
		},
	);
}
