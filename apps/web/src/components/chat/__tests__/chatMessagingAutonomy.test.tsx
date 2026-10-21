/**
 * chatMessagingAutonomy.test.tsx
 *
 * Unit tests for Chat & Omnichannel Messaging Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (Send buttons are NEVER disabled on empty text; instant clinical templates).
 * - Mandate 8d & Apple HIG: Touch targets strictly >= 44x44px, mobile rounded-t-[24px], drag handle, 0px drift.
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law; instant clinical preset populates without blocking).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No bureaucracy, unblocked communication).
 * - Mandate 8wx: Fast, lightweight node:test execution with renderToString (0 recursive mock-DOM).
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { PatientOmnichannelHubModal } from "../../messaging/PatientOmnichannelHubModal";
import { TelegramBotIntegrationModal } from "../TelegramBotIntegrationModal";
import { WhatsAppChatPanel } from "../WhatsAppChatPanel";
import { WhatsAppChatView } from "../WhatsAppChatView";

const mockAppLogicContext = {
	dashboard: {
		patients: [
			{
				id: "pat-101",
				fullName: "Смирнов Алексей Викторович",
				phone: "+7 (999) 111-22-33",
			},
		],
		patientInsights: [],
		insuranceContracts: [],
		appointments: [],
		clinicSettings: {
			name: "ДЕНТЕ",
			staff: [],
		},
		todayIso: "2026-09-07",
	},
} as unknown as AppLogicContextType;

describe("Chat & Omnichannel Messaging Autonomy Suite (Mandates 8e, 8d, 8k, 8n, 8wx)", () => {
	describe("1. WhatsAppChatPanel Autonomy & Apple HIG Ergonomics", () => {
		it("send button is NOT disabled when input text is empty (disabled === false)", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<WhatsAppChatPanel
						patientId="pat-101"
						patientName="Смирнов Алексей Викторович"
						patientPhone="+7 (999) 111-22-33"
					/>
				</AppLogicProvider>,
			);

			// Assert send button exists and has aria-label
			assert.ok(html.includes('aria-label="Отправить сообщение"'), "Send button must have aria-label");

			// Assert send button is active and does NOT have disabled attribute in initial state
			const sendBtnMatch = html.match(/<button[^>]*aria-label="Отправить сообщение"[^>]*>/);
			assert.ok(sendBtnMatch, "Send button markup must be present");
			assert.ok(!/\sdisabled(?:[=>\s]|$)/.test(sendBtnMatch[0]), "Send button must NOT have disabled attribute on empty text (Mandate 8e)");
			assert.ok(!sendBtnMatch[0].includes("disabled:pointer-events-none"), "Send button must not disable pointer-events");
		});

		it("touch targets meet >= 44x44px ergonomic law (Mandate 8d & Apple HIG)", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<WhatsAppChatPanel
						patientId="pat-101"
						patientName="Смирнов Алексей Викторович"
						patientPhone="+7 (999) 111-22-33"
						onClose={() => {}}
					/>
				</AppLogicProvider>,
			);

			// Check send button touch targets
			const sendBtnMatch = html.match(/<button[^>]*aria-label="Отправить сообщение"[^>]*>/);
			assert.ok(sendBtnMatch, "Send button markup must be present");
			assert.ok(sendBtnMatch[0].includes("min-h-[44px]") && sendBtnMatch[0].includes("min-w-[44px]"), "Send button touch target must be >= 44x44px");

			// Check close button touch targets
			const closeBtnMatch = html.match(/<button[^>]*aria-label="Назад \/ Закрыть чат"[^>]*>/);
			assert.ok(closeBtnMatch, "Close button markup must be present");
			assert.ok(closeBtnMatch[0].includes("min-h-[44px]") && closeBtnMatch[0].includes("min-w-[44px]"), "Close button touch target must be >= 44x44px");
		});

		it("renders multichannel selector (WhatsApp, Telegram, SMS) and Apple HIG mobile layout", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<WhatsAppChatPanel
						patientId="pat-101"
						patientName="Смирнов Алексей Викторович"
						patientPhone="+7 (999) 111-22-33"
						onClose={() => {}}
					/>
				</AppLogicProvider>,
			);

			// Multichannel selector
			assert.ok(html.includes('data-testid="channel-select-whatsapp"'), "Must provide WhatsApp channel selector");
			assert.ok(html.includes('data-testid="channel-select-telegram"'), "Must provide Telegram channel selector");
			assert.ok(html.includes('data-testid="channel-select-sms"'), "Must provide SMS channel selector");

			// Quick preset buttons for clinical autonomy
			assert.ok(html.includes('data-testid="quick-send-appt_reminder"'), "Must provide 1-click appointment reminder preset");
			assert.ok(html.includes('data-testid="quick-send-treatment_plan"'), "Must provide 1-click treatment plan preset");
			assert.ok(html.includes('data-testid="quick-send-sbp_payment"'), "Must provide 1-click SBP payment link preset");

			// Apple HIG mobile classes
			assert.ok(html.includes("max-sm:rounded-t-[24px]"), "Must support iOS Bottom Sheet radius max-sm:rounded-t-[24px]");
			assert.ok(html.includes("overflow-x-clip"), "Must enforce overflow-x-clip to eliminate horizontal drift");
		});
	});

	describe("2. PatientOmnichannelHubModal Autonomy & Ergonomics", () => {
		it("send button is NOT disabled when message text is empty (disabled === false)", () => {
			const html = renderToString(
				<PatientOmnichannelHubModal
					isOpen={true}
					onClose={() => {}}
					initialPatientId="pat-101"
					clinicName="ДЕНТЕ"
				/>,
			);

			const sendBtnMatch = html.match(/<button[^>]*hub-btn-send[^>]*>/);
			assert.ok(sendBtnMatch, "Omnichannel hub send button must exist");
			assert.ok(!sendBtnMatch[0].includes("disabled"), "Hub send button must NOT be disabled on empty text (Mandate 8e)");
		});

		it("touch targets meet >= 44x44px ergonomic law (Mandate 8d)", () => {
			const html = renderToString(
				<PatientOmnichannelHubModal
					isOpen={true}
					onClose={() => {}}
					initialPatientId="pat-101"
					clinicName="ДЕНТЕ"
				/>,
			);

			// Send button
			const sendBtnMatch = html.match(/<button[^>]*hub-btn-send[^>]*>/);
			assert.ok(sendBtnMatch, "Send button markup must be present");
			assert.ok(sendBtnMatch[0].includes("min-h-[44px]") && sendBtnMatch[0].includes("min-w-[44px]"), "Hub send button touch target must be >= 44px");

			// Close button
			const closeBtnMatch = html.match(/<button[^>]*omnichannel-modal-close[^>]*>/);
			assert.ok(closeBtnMatch, "Close button markup must be present");
			assert.ok(closeBtnMatch[0].includes("min-h-[44px]") && closeBtnMatch[0].includes("min-w-[44px]"), "Hub close button touch target must be >= 44px");
		});
	});

	describe("3. WhatsAppChatView Canonical Reception Desk Layout", () => {
		it("renders standalone reception view with patient threads list and chat panel", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<WhatsAppChatView
						patientId="pat-101"
						patientName="Смирнов Алексей Викторович"
						patientPhone="+7 (999) 111-22-33"
						mode="standalone"
					/>
				</AppLogicProvider>,
			);

			assert.ok(html.includes('data-testid="whatsapp-chat-view"'), "Must render canonical WhatsApp chat view container");
			assert.ok(html.includes("Диалоги пациентов"), "Standalone mode must list patient conversation threads");
			assert.ok(html.includes("Смирнов Алексей Викторович"), "Must display active patient name");
		});
	});

	describe("4. TelegramBotIntegrationModal Non-Blocking Autonomy", () => {
		it("renders bot status, reminder template, and touch targets >= 44x44px", () => {
			const html = renderToString(
				<TelegramBotIntegrationModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-101"
					patientName="Смирнова Анна Сергеевна"
					patientPhone="+7 (916) 234-56-78"
				/>,
			);

			assert.ok(html.includes('data-testid="telegram-bot-integration-modal"'), "Must render telegram bot modal container");
			assert.ok(html.includes('data-testid="send-telegram-notification-btn"'), "Must render send notification button");
			assert.ok(html.includes("min-h-[44px]"), "Touch targets must enforce min-h-[44px]");
			assert.ok(html.includes("rounded-t-[24px]"), "Mobile sheet must use rounded-t-[24px]");
			assert.ok(html.includes("Смирнова Анна Сергеевна"), "Must prefill patient name");
		});
	});
});
