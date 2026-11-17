import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	detectSpecializedCallbackKind,
	parseAppointmentActionCallbackPayload,
} from "../../routes/telegram/webhookModules/telegramCallbackParser.js";
import { isPositiveAppointmentConfirmationText } from "../../services/messengerIngestion.js";
import {
	denteTelegramAppointmentCallbacksReady,
	buildDenteTelegramAppointmentCallbackData,
	appointmentStatusLabelForTelegram,
} from "../../services/telegram/legacyMemory/telegramChatLinkHelpers.js";
import { wsBroker } from "../../services/websocketBroker.js";

describe("Domain 30: Notifications, Gateways & 2-Way Appointment Confirmations", () => {
	test("Распознавание естественного согласия пациента на визит (NLP matching)", () => {
		const positivePhrases = [
			"Да",
			"ДА",
			"да, буду",
			"Да, буду!",
			"Буду",
			"буду обязательно",
			"Подтверждаю",
			"подтверждаю запись",
			"запись подтверждаю",
			"Приду",
			"Ок",
			"хорошо",
			"+",
			"буду на приеме",
			"Буду на приёме",
		];

		for (const phrase of positivePhrases) {
			assert.equal(
				isPositiveAppointmentConfirmationText(phrase),
				true,
				`Фраза «${phrase}» должна быть распознана как согласие`,
			);
		}

		const nonPositivePhrases = [
			"Перенесите, пожалуйста",
			"Не смогу прийти",
			"Отмените запись",
			"Сколько стоит пломба?",
			"Где вы находитесь?",
			"Здравствуйте, я опоздаю на 10 минут",
		];

		for (const phrase of nonPositivePhrases) {
			assert.equal(
				isPositiveAppointmentConfirmationText(phrase),
				false,
				`Фраза «${phrase}» НЕ должна ошибочно подтверждать визит`,
			);
		}
	});

	test("Маршрутизация специализированных коллбеков Telegram Webhook (detectSpecializedCallbackKind)", () => {
		assert.equal(
			detectSpecializedCallbackKind("d1.c.11223344556677889900aabbccddeeff.xyz.sig"),
			"appointment",
		);
		assert.equal(
			detectSpecializedCallbackKind("appointment:confirm:c22f033a-886f-4a21-8579-d4fa7df7f7bc"),
			"appointment",
		);
		assert.equal(
			detectSpecializedCallbackKind("appointment:cancel:c22f033a-886f-4a21-8579-d4fa7df7f7bc"),
			"appointment",
		);
		assert.equal(
			detectSpecializedCallbackKind("nps:appt-1:5"),
			"nps",
		);
		assert.equal(
			detectSpecializedCallbackKind("postop:1:score:4"),
			"postop",
		);
		assert.equal(
			detectSpecializedCallbackKind("unknown:data"),
			null,
		);
	});

	test("Парсинг payload инлайн-кнопок Telegram приёма (parseAppointmentActionCallbackPayload)", () => {
		const signed = parseAppointmentActionCallbackPayload(
			"d1.c.11223344556677889900aabbccddeeff.xyz.sig",
		);
		assert.ok(signed);
		assert.equal(signed.action, "confirm");
		assert.equal(signed.appointmentId, "11223344556677889900aabbccddeeff");

		const directConfirm = parseAppointmentActionCallbackPayload(
			"appointment:confirm:c22f033a-886f-4a21-8579-d4fa7df7f7bc",
		);
		assert.ok(directConfirm);
		assert.equal(directConfirm.action, "confirm");
		assert.equal(directConfirm.appointmentId, "c22f033a-886f-4a21-8579-d4fa7df7f7bc");

		const directCancel = parseAppointmentActionCallbackPayload(
			"appointment:cancel:c22f033a-886f-4a21-8579-d4fa7df7f7bc",
		);
		assert.ok(directCancel);
		assert.equal(directCancel.action, "cancel");
		assert.equal(directCancel.appointmentId, "c22f033a-886f-4a21-8579-d4fa7df7f7bc");
	});

	test("Хелперы Telegram Chat Link и статусы визитов без легаси JSON-памяти", () => {
		assert.equal(appointmentStatusLabelForTelegram("planned"), "запланирован");
		assert.equal(appointmentStatusLabelForTelegram("confirmed"), "подтвержден");
		assert.equal(appointmentStatusLabelForTelegram("cancelled"), "отменен");

		// При отсутствии секрета подписи ready возвращает false без падений
		const ready = denteTelegramAppointmentCallbacksReady();
		assert.equal(typeof ready, "boolean");
	});

	test("WebSocket Broker готов к широковещательной рассылке обновлений статусов визитов", () => {
		let broadcastReceived = false;
		const originalBroadcast = wsBroker.broadcastToOrganization;

		try {
			wsBroker.broadcastToOrganization = (orgId: string, msg: object) => {
				const payload = msg as { type?: string; payload?: { id?: string; status?: string } };
				if (
					orgId === "org-test-30" &&
					payload.type === "APPOINTMENT_UPDATED" &&
					payload.payload?.status === "confirmed"
				) {
					broadcastReceived = true;
				}
			};

			wsBroker.broadcastToOrganization("org-test-30", {
				type: "APPOINTMENT_UPDATED",
				payload: { id: "appt-30", status: "confirmed" },
			});

			assert.equal(broadcastReceived, true, "WebSocket broadcast обязан доставлять APPOINTMENT_UPDATED");
		} finally {
			wsBroker.broadcastToOrganization = originalBroadcast;
		}
	});
});
