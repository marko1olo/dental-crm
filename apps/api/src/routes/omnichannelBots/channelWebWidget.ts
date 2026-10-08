import type { FastifyReply, FastifyRequest } from "fastify";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel, BotInboundMessage } from "../../services/bots/types.js";
import { sendOperatorMessageSchema, testIncomingMessageSchema } from "./schemas.js";

/**
 * Отправка сообщения оператором клиники пациенту.
 * При отправке диалог автоматически перехватывается оператором.
 */
export async function handleSendOperatorMessage(
	request: FastifyRequest,
	reply: FastifyReply,
	orgId: string,
): Promise<void> {
	const parse = sendOperatorMessageSchema.safeParse(request.body);
	if (!parse.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры сообщения оператора.",
			details: parse.error.format(),
		});
	}

	const body = parse.data;
	const operatorName = body.operatorName || (request as any).user?.name || "Оператор клиники";

	const result = await omnichannelBotEngine.sendOperatorMessage({
		channel: body.channel,
		organizationId: orgId,
		senderId: body.senderId,
		message: body.message,
		operatorName,
	});

	if (!result.ok) {
		return reply.code(400).send({
			error: "SendMessageFailed",
			message: result.error || "Ошибка отправки сообщения.",
		});
	}

	// Автоматически перехватываем чат, чтобы бот не перебивал оператора
	omnichannelBotEngine.takeoverChat(body.channel, orgId, body.senderId, operatorName);

	return reply.send({ ok: true, messageId: result.messageId });
}

/**
 * Ручной перехват диалога оператором (ставит бота на паузу).
 */
export function handleTakeoverChat(
	channel: BotChannel,
	orgId: string,
	senderId: string,
	operatorName: string,
) {
	return omnichannelBotEngine.takeoverChat(channel, orgId, senderId, operatorName);
}

/**
 * Возврат диалога боту (снимает паузу с автоответчика).
 */
export function handleReleaseChat(
	channel: BotChannel,
	orgId: string,
	senderId: string,
) {
	return omnichannelBotEngine.releaseChat(channel, orgId, senderId);
}

/**
 * Симуляция входящего сообщения (для тестирования и онлайн-виджета).
 */
export async function handleTestIncomingMessage(
	request: FastifyRequest,
	reply: FastifyReply,
	orgId: string,
): Promise<void> {
	const parse = testIncomingMessageSchema.safeParse(request.body || {});
	if (!parse.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры тестового сообщения.",
		});
	}

	const data = parse.data;
	const inbound: BotInboundMessage = {
		channel: data.channel,
		organizationId: orgId,
		botConfigId: "default",
		senderId: data.senderId,
		senderName: data.senderName,
		messageId: `sim-${Date.now()}`,
		text: data.text,
		payload: data.payload || null,
		timestamp: Date.now(),
		rawEvent: { simulated: true, ...data },
	};

	const result = await omnichannelBotEngine.dispatchInboundMessage(inbound);
	return reply.send({ ok: true, result });
}
