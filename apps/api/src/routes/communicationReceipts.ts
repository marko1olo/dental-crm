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
	parseSmscReceipt,
	parseSmsRuReceipts,
	readReceiptSecret,
	receiptSecretMatches,
} from "../services/communications/deliveryReceipts.js";

/** Секрет принимается и заголовком, и параметром: шлюзы умеют разное. */
function extractSecret(request: FastifyRequest): unknown {
	const header = request.headers["x-dente-receipt-secret"];
	if (typeof header === "string") return header;
	const query = asRecord(request.query);
	return query?.secret;
}

function guardReceiptCall(
	request: FastifyRequest,
	reply: FastifyReply,
): boolean {
	const expected = readReceiptSecret();
	if (!expected) {
		/*
		 * Имя переменной окружения ушло из тела ответа в журнал сервера.
		 * Маршрут вызывается ИЗВНЕ и без авторизации — до появления секрета его
		 * ответ доступен кому угодно, и называть в нём внутренние настройки сервера
		 * значит выдавать их первому, кто постучится. Тому, кто настраивает
		 * обратный вызов, имя нужно, но он читает журнал сервера, а не тело
		 * чужого ответа.
		 */
		request.log.error(
			{ requiredEnv: ["DENTE_COMMUNICATION_RECEIPT_SECRET"] },
			"Квитанция о доставке отклонена: секрет обратного вызова не задан в окружении сервера",
		);
		reply.code(503).send({
			error: "ReceiptsNotConfigured",
			message:
				"Приём квитанций о доставке на этом сервере не настроен. " +
				"Без секрета обратного вызова квитанции не принимаются, иначе статусы доставки можно подделать.",
		});
		return false;
	}
	if (!receiptSecretMatches(extractSecret(request), expected)) {
		reply.code(401).send({
			error: "ReceiptSecretMismatch",
			message: "Неверный секрет обратного вызова.",
		});
		return false;
	}
	return true;
}

/**
 * Тело/query приходят form-urlencoded или JSON. Bare cast на non-object
 * (null/array/string) давал бы TypeError при индексе — как у max/whatsapp:
 * non-object → пустые поля, не 500.
 */
function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
}

/** Тело приходит и как form-urlencoded, и как JSON — берём из обоих. */
function fieldFrom(request: FastifyRequest, name: string): unknown {
	const body = asRecord(request.body);
	if (body && body[name] !== undefined) return body[name];
	const query = asRecord(request.query);
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
			err: fieldFrom(request, "err"),
		};
		const receipt = parseSmscReceipt(params);
		if (!receipt)
			return {
				accepted: 0,
				note: "Квитанция не разобрана: нет идентификатора или состояния.",
			};

		const report = await applyReceipts([receipt]);
		return { accepted: 1, ...report };
	};

	// SMSC вызывает обратный адрес методом GET или POST в зависимости от
	// настройки в личном кабинете, поэтому объявлены оба.
	app.get("/api/communications/receipts/smsc", handleSmsc);
	app.post("/api/communications/receipts/smsc", handleSmsc);
}

export default registerCommunicationReceiptRoutes;
