/**
 * Обратные вызовы провайдеров: квитанции о доставке.
 *
 * ЗАЧЕМ: статус `sent` означает «шлюз принял сообщение», а не «пациент получил».
 * Разницу видно только из квитанции, которую провайдер присылает отдельным
 * запросом. Без этого напоминание, не дошедшее до выключенного телефона,
 * выглядит в журнале доставленным.
 *
 * ДОСТУП. Это единственные маршруты раздела, вызываемые не из интерфейса, а
 * извне, и подписи запроса у SMS.RU и SMSC нет. Поэтому проверяется секрет из
 * адреса обратного вызова, и без настроенного секрета обработчик отказывает:
 * открытый эндпоинт позволил бы кому угодно помечать сообщения доставленными,
 * то есть скрывать недоставку.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	applyReceipts,
	parseSmsRuReceipts,
	parseSmscReceipt,
	readReceiptSecret,
	receiptSecretMatches
} from "../services/communications/deliveryReceipts.js";

/** Секрет принимается и заголовком, и параметром: шлюзы умеют разное. */
function extractSecret(request: FastifyRequest): unknown {
	const header = request.headers["x-dente-receipt-secret"];
	if (typeof header === "string") return header;
	const query = request.query as Record<string, unknown> | undefined;
	return query?.secret;
}

function guardReceiptCall(request: FastifyRequest, reply: FastifyReply): boolean {
	const expected = readReceiptSecret();
	if (!expected) {
		reply.code(503).send({
			error: "ReceiptsNotConfigured",
			message:
				"Приём квитанций не настроен: не задан DENTE_COMMUNICATION_RECEIPT_SECRET. " +
				"Без секрета обработчик не принимает вызовы, иначе статусы доставки можно подделать."
		});
		return false;
	}
	if (!receiptSecretMatches(extractSecret(request), expected)) {
		reply.code(401).send({ error: "ReceiptSecretMismatch", message: "Неверный секрет обратного вызова." });
		return false;
	}
	return true;
}

/** Тело приходит и как form-urlencoded, и как JSON — берём из обоих. */
function fieldFrom(request: FastifyRequest, name: string): unknown {
	const body = request.body as Record<string, unknown> | undefined;
	if (body && body[name] !== undefined) return body[name];
	const query = request.query as Record<string, unknown> | undefined;
	return query?.[name];
}

export async function registerCommunicationReceiptRoutes(app: FastifyInstance) {
	/**
	 * SMS.RU присылает параметр `data` со строками `<id>=<код>`; одним запросом
	 * может прийти несколько квитанций.
	 */
	app.post("/api/communications/receipts/smsru", async (request, reply) => {
		if (!guardReceiptCall(request, reply)) return;

		const receipts = parseSmsRuReceipts(fieldFrom(request, "data"));
		if (receipts.length === 0) {
			// 200, а не ошибка: шлюз при отказе будет повторять запрос, а разбирать
			// в нём нечего. Пустой разбор — не сбой доставки.
			return { accepted: 0, note: "Квитанций в запросе не найдено." };
		}

		const report = await applyReceipts(receipts);
		return { accepted: receipts.length, ...report };
	});

	/** SMSC присылает по одной квитанции: `id`, `status`, при отказе — `err`. */
	const handleSmsc = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!guardReceiptCall(request, reply)) return;

		const params: Record<string, unknown> = {
			id: fieldFrom(request, "id"),
			status: fieldFrom(request, "status"),
			err: fieldFrom(request, "err")
		};
		const receipt = parseSmscReceipt(params);
		if (!receipt) return { accepted: 0, note: "Квитанция не разобрана: нет идентификатора или состояния." };

		const report = await applyReceipts([receipt]);
		return { accepted: 1, ...report };
	};

	// SMSC вызывает обратный адрес методом GET или POST в зависимости от
	// настройки в личном кабинете, поэтому объявлены оба.
	app.get("/api/communications/receipts/smsc", handleSmsc);
	app.post("/api/communications/receipts/smsc", handleSmsc);
}

export default registerCommunicationReceiptRoutes;
