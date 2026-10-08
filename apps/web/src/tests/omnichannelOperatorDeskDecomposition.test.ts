import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CHANNEL_CONFIGS,
	CLINICAL_QUICK_REPLIES,
	ChannelConversationList,
	LinkPatientModal,
	OmnichannelOperatorDesk,
	OmnichannelOperatorDeskView,
	OperatorInputBar,
	OperatorMessageStream,
	QuickBookingModal,
	QuickRepliesDrawer,
	SOURCE_BADGE_CONFIG,
	getSourceBadgeInfo,
	useOmnichannelOperatorDesk,
} from "../components/chat/OmnichannelOperatorDesk";
import type { InboxConversation } from "../components/chat/OmnichannelOperatorDesk";

describe("OmnichannelOperatorDesk Safe Monolith Decomposition", () => {
	it("re-exports all required types, constants and components from the canonical facade", () => {
		assert.equal(typeof OmnichannelOperatorDesk, "function");
		assert.equal(typeof OmnichannelOperatorDeskView, "function");
		assert.equal(typeof ChannelConversationList, "function");
		assert.equal(typeof OperatorMessageStream, "function");
		assert.equal(typeof QuickRepliesDrawer, "function");
		assert.equal(typeof OperatorInputBar, "function");
		assert.equal(typeof QuickBookingModal, "function");
		assert.equal(typeof LinkPatientModal, "function");
		assert.equal(typeof useOmnichannelOperatorDesk, "function");
		assert.equal(typeof getSourceBadgeInfo, "function");
		assert.ok(SOURCE_BADGE_CONFIG);
		assert.ok(CHANNEL_CONFIGS);
		assert.ok(Array.isArray(CLINICAL_QUICK_REPLIES));
	});

	it("correctly identifies channel badges and source metadata in getSourceBadgeInfo", () => {
		const tgConv: InboxConversation = {
			key: "tg:123",
			channel: "telegram",
			senderId: "123",
			senderName: "Иван",
			patientId: null,
			patientName: "Иван Иванов",
			phone: "+79991112233",
			lastMessage: "Здравствуйте",
			lastMessageAt: new Date().toISOString(),
			lastMessageDirection: "inbound",
			unreadCount: 1,
			isIntercepted: false,
			interceptedBy: null,
			leadId: null,
			leadStatus: null,
		};

		const info = getSourceBadgeInfo(tgConv);
		assert.equal(info.badge, "TG Бот");
		assert.equal(info.color, "#0284c7");

		const waConv: InboxConversation = {
			...tgConv,
			channel: "whatsapp",
			sourceType: "wa_waba",
		};
		const waInfo = getSourceBadgeInfo(waConv);
		assert.equal(waInfo.badge, "WA WABA");
		assert.equal(waInfo.color, "#16a34a");

		const maxConv: InboxConversation = {
			...tgConv,
			channel: "max",
		};
		const maxInfo = getSourceBadgeInfo(maxConv);
		assert.equal(maxInfo.badge, "MAX");
	});

	it("contains 5 verified clinical quick replies", () => {
		assert.equal(CLINICAL_QUICK_REPLIES.length, 5);
		const labels = CLINICAL_QUICK_REPLIES.map((r) => r.label);
		assert.ok(labels.includes("Ждём на приём"));
		assert.ok(labels.includes("Схема проезда"));
		assert.ok(labels.includes("Прайс на приём"));
		assert.ok(labels.includes("Перенос записи"));
		assert.ok(labels.includes("Подтверждение"));
	});
});
