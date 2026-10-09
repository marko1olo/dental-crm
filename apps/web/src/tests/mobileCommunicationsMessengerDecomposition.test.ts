import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
	MessengerHeaderBar,
	MessageBubbleList,
	ChatTopBar,
	QuickReplyChipsBar,
	MessageInputFloatingBar,
	DialogsFeedView,
	FullscreenChatView,
	MobileMessengerView,
	useMobileMessengerLogic,
	formatLastMessageTime,
	renderChannelIcon,
	type MobileCommunicationsMessengerProps,
	type MobilePatientDialogSummary,
	type MobileChatMessageItem,
} from "../components/communications/mobileMessenger";

describe("MobileCommunicationsMessenger safe monolith decomposition", () => {
	it("экспортирует канонические компоненты и хуки с 100% обратной совместимостью", () => {
		assert.equal(typeof MobileMessengerView, "function");
		assert.equal(typeof useMobileMessengerLogic, "function");
		assert.equal(typeof MessengerHeaderBar, "function");
		assert.equal(typeof MessageBubbleList, "function");
		assert.equal(typeof ChatTopBar, "function");
		assert.equal(typeof QuickReplyChipsBar, "function");
		assert.equal(typeof MessageInputFloatingBar, "function");
		assert.equal(typeof DialogsFeedView, "function");
		assert.equal(typeof FullscreenChatView, "function");
	});

	it("чистая утилита formatLastMessageTime корректно форматирует время сообщений", () => {
		const nowIso = new Date().toISOString();
		const formattedToday = formatLastMessageTime(nowIso);
		assert.match(formattedToday, /^\d{2}:\d{2}$/);

		const oldIso = new Date("2025-01-15T10:00:00Z").toISOString();
		const formattedPast = formatLastMessageTime(oldIso);
		assert.ok(formattedPast.length > 0);
	});

	it("чистая утилита renderChannelIcon генерирует бейджи каналов", () => {
		const wa = renderChannelIcon("whatsapp");
		assert.ok(wa);
		assert.equal(wa.props.className, "mobile-avatar-channel-badge channel-badge-whatsapp");

		const tg = renderChannelIcon("telegram");
		assert.equal(tg.props.className, "mobile-avatar-channel-badge channel-badge-telegram");

		const sms = renderChannelIcon("sms");
		assert.equal(sms.props.className, "mobile-avatar-channel-badge channel-badge-sms");
	});

	it("бюджет строк соблюдён: фасад <= 150 строк, каждый файл модуля < 800 строк", () => {
		const facadePath = path.resolve(
			__dirname,
			"../components/communications/MobileCommunicationsMessenger.tsx",
		);
		const facadeContent = fs.readFileSync(facadePath, "utf8");
		const facadeLines = facadeContent.split("\n").length;
		assert.ok(
			facadeLines <= 150,
			`Фасад превысил 150 строк: ${facadeLines} строк`,
		);

		const modDir = path.resolve(
			__dirname,
			"../components/communications/mobileMessenger",
		);
		const files = fs.readdirSync(modDir);
		for (const file of files) {
			const fullPath = path.join(modDir, file);
			if (fs.statSync(fullPath).isFile()) {
				const content = fs.readFileSync(fullPath, "utf8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`Файл ${file} превысил лимит 800 строк: ${lines} строк`,
				);
			}
		}
	});

	it("все 27 тест-якорей (data-testid, aria-label) сохранены", () => {
		const modDir = path.resolve(
			__dirname,
			"../components/communications/mobileMessenger",
		);
		const files = fs.readdirSync(modDir);
		let combinedContent = "";
		for (const file of files) {
			const fullPath = path.join(modDir, file);
			if (fs.statSync(fullPath).isFile()) {
				combinedContent += fs.readFileSync(fullPath, "utf8") + "\n";
			}
		}

		const requiredTestIds = [
			"mobile-communications-messenger",
			"btn-mobile-messenger-search-toggle",
			"btn-mobile-messenger-schedule",
			"tab-mobile-dialogs",
			"tab-mobile-tasks",
			"tab-mobile-journal",
			"tab-mobile-bots",
			"mobile-bots-operator-section",
			"mobile-chat-fullscreen",
			"btn-mobile-chat-back",
			"btn-mobile-chat-takeover",
			"mobile-chat-messages-area",
			"mobile-chat-bot-banner",
			"btn-mobile-banner-takeover",
			"mobile-chat-templates-bar",
			"input-mobile-chat-message",
			"btn-mobile-chat-send",
		];

		for (const testId of requiredTestIds) {
			assert.ok(
				combinedContent.includes(`data-testid="${testId}"`),
				`Потерян testid: ${testId}`,
			);
		}

		const requiredAriaLabels = [
			"Поиск диалогов",
			"Перейти в расписание",
			"Разделы коммуникаций",
			"Фильтр каналов",
			"Назад к списку диалогов",
			"Перехватить диалог",
			"Позвонить пациенту",
			"Быстрые клинические шаблоны",
			"Прикрепить снимок",
			"Отправить сообщение",
		];

		for (const label of requiredAriaLabels) {
			assert.ok(
				combinedContent.includes(`aria-label="${label}"`),
				`Потерян aria-label: ${label}`,
			);
		}
	});
});
