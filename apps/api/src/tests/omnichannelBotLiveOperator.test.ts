import assert from "node:assert";
import { describe, test } from "node:test";
import { OmnichannelBotEngine } from "../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../services/bots/types.js";

describe("Omnichannel Bot Live Operator Desk & Takeover Inquisition", () => {
	const orgIdA = "00000000-0000-4000-8000-000000000001";
	const orgIdB = "00000000-0000-4000-8000-000000000002";
	const patientTgId = "tg_patient_998877";
	const patientVkId = "vk_patient_554433";
	const patientWaId = "79991234567";

	test("1. Перехват диалога оператором (Takeover) ставит бота на паузу", async () => {
		const engine = new OmnichannelBotEngine();
		engine.registerBot({
			channel: "telegram",
			organizationId: orgIdA,
			token: "test_token_123",
			isActive: true,
		});

		// До перехвата: бот не перехвачен
		assert.strictEqual(
			engine.isChatIntercepted("telegram", orgIdA, patientTgId),
			false,
			"Изначально диалог не должен быть перехвачен",
		);

		// Оператор перехватывает диалог
		const takeoverRes = engine.takeoverChat("telegram", orgIdA, patientTgId, "Администратор Анна");
		assert.strictEqual(takeoverRes.success, true);
		assert.strictEqual(takeoverRes.interceptedBy, "Администратор Анна");

		// Проверяем статус в реестре
		const info = engine.getChatInterceptInfo("telegram", orgIdA, patientTgId);
		assert.strictEqual(info.isIntercepted, true);
		assert.strictEqual(info.interceptedBy, "Администратор Анна");

		// При поступлении сообщения от пациента — автоответчик бота спит!
		const inbound: BotInboundMessage = {
			channel: "telegram",
			organizationId: orgIdA,
			botConfigId: "default",
			senderId: patientTgId,
			text: "Здравствуйте, подскажите стоимость пломбы?",
			timestamp: Date.now(),
		};

		const dispatchRes = await engine.dispatchInboundMessage(inbound);
		assert.strictEqual(dispatchRes.ok, true);
		assert.strictEqual(
			dispatchRes.handledByPlugin,
			"human_operator_intercepted",
			"Перехваченный диалог обязан помечаться как human_operator_intercepted",
		);
		assert.strictEqual(
			dispatchRes.reply,
			null,
			"Бот не должен генерировать автоматический ответ, пока оператор на связи",
		);
	});

	test("2. Возврат диалога боту (Release) возобновляет работу автоответчика", async () => {
		const engine = new OmnichannelBotEngine();
		engine.registerBot({
			channel: "whatsapp",
			organizationId: orgIdA,
			token: "test_wa_token",
			isActive: true,
		});

		// Перехватываем
		engine.takeoverChat("whatsapp", orgIdA, patientWaId, "Оператор Игорь");
		assert.strictEqual(engine.isChatIntercepted("whatsapp", orgIdA, patientWaId), true);

		// Возвращаем боту
		const releaseRes = engine.releaseChat("whatsapp", orgIdA, patientWaId);
		assert.strictEqual(releaseRes.success, true);
		assert.strictEqual(engine.isChatIntercepted("whatsapp", orgIdA, patientWaId), false);

		// Теперь входящее сообщение обрабатывается ботом
		const inbound: BotInboundMessage = {
			channel: "whatsapp",
			organizationId: orgIdA,
			botConfigId: "default",
			senderId: patientWaId,
			text: "Здравствуйте!",
			timestamp: Date.now(),
		};

		const dispatchRes = await engine.dispatchInboundMessage(inbound);
		assert.strictEqual(dispatchRes.ok, true);
		assert.notStrictEqual(
			dispatchRes.handledByPlugin,
			"human_operator_intercepted",
			"После снятия перехвата плагины бота обязаны обрабатывать запрос",
		);
		assert.ok(dispatchRes.reply !== null, "Бот обязан предоставить ответ пациенту");
	});

	test("3. Изоляция перехвата по каналам и организациям (Cross-channel & Tenant Isolation)", () => {
		const engine = new OmnichannelBotEngine();

		// Перехватываем в Telegram для клиники A
		engine.takeoverChat("telegram", orgIdA, patientTgId, "Оператор 1");

		// ВКонтакте для того же контакта не должен быть перехвачен
		assert.strictEqual(engine.isChatIntercepted("vk", orgIdA, patientTgId), false);

		// Та же строка senderId в чужой клинике B не должна быть перехвачена
		assert.strictEqual(engine.isChatIntercepted("telegram", orgIdB, patientTgId), false);

		// Список перехваченных чатов фильтруется строго по organizationId
		const interceptedA = engine.listInterceptedChats(orgIdA);
		assert.strictEqual(interceptedA.length, 1);
		assert.strictEqual(interceptedA[0]?.channel, "telegram");
		assert.strictEqual(interceptedA[0]?.senderId, patientTgId);

		const interceptedB = engine.listInterceptedChats(orgIdB);
		assert.strictEqual(interceptedB.length, 0);
	});

	test("4. Проверка врачебной тайны (152-ФЗ / 323-ФЗ ст. 13) при отправке сообщений", async () => {
		const engine = new OmnichannelBotEngine();

		// Попытка отправить сообщение с разглашением врачебной тайны (диагноз)
		const leakResult = await engine.sendOperatorMessage({
			channel: "telegram",
			organizationId: orgIdA,
			senderId: patientTgId,
			message: "Уважаемый пациент, напоминаем о лечении ВИЧ-инфекции и гепатита C.",
			operatorName: "Оператор клиники",
		});

		assert.strictEqual(leakResult.ok, false, "Сообщение с диагнозом должно быть заблокировано");
		assert.ok(
			leakResult.error?.includes("152-ФЗ") || leakResult.error?.includes("323-ФЗ"),
			"Ошибка обязана ссылаться на 152-ФЗ / 323-ФЗ ст. 13",
		);

		// Пустое сообщение не должно проходить валидацию
		const emptyResult = await engine.sendOperatorMessage({
			channel: "telegram",
			organizationId: orgIdA,
			senderId: patientTgId,
			message: "   ",
		});
		assert.strictEqual(emptyResult.ok, false);
		assert.ok(emptyResult.error?.includes("пустым"));
	});
});
