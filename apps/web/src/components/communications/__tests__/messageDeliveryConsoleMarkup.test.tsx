import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { expect, mockAppContext } from "./messageDeliveryTestFixtures";

describe("MessageDeliveryConsole Markup Autonomy (Mandates 8e & 8n)", () => {
	it("1. textarea #enqueue-body is NOT disabled when enqueueChannel === 'sms' and uisQuota.remaining <= 0", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="sms" initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		expect(html).toContain('id="enqueue-body"');
		expect(html).toContain('data-testid="outbox-enqueue-body"');
		expect(html).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(html).not.toMatch(/<textarea[^>]*disabled[^>]*id="enqueue-body"/);
	});

	it("2. displays helpful warning banner suggesting WhatsApp/Telegram when SMS quota is exhausted", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="sms" initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		const expectedBannerText = "Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.";
		expect(html).toContain(expectedBannerText);
		expect(html).toContain('data-testid="sms-quota-warning-banner"');
		expect(html).toContain('role="alert"');
		expect(html).toContain("ops-notice--warn");
	});

	it("3. does NOT display SMS quota warning banner when remaining quota > 0", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="sms" initialUisQuota={{ remaining: 45, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		expect(html).toContain('id="enqueue-body"');
		expect(html).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(html).not.toContain("Лимит SMS исчерпан");
		expect(html).not.toContain('data-testid="sms-quota-warning-banner"');
	});

	it("4. does NOT display SMS quota warning banner when channel is WhatsApp or Telegram", () => {
		const htmlWA = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="whatsapp" initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		expect(htmlWA).toContain('id="enqueue-body"');
		expect(htmlWA).not.toContain("Лимит SMS исчерпан");

		const htmlTG = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="telegram" initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		expect(htmlTG).toContain('id="enqueue-body"');
		expect(htmlTG).not.toContain("Лимит SMS исчерпан");
	});

	it("7. rendered markup: outbox enqueue button is clickable without being disabled by default", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole initialEnqueueChannel="whatsapp" initialUisQuota={{ remaining: 10, smsQuotaLimit: 100 }} />
			</AppLogicProvider>,
		);
		expect(html).toContain('data-testid="outbox-enqueue-submit"');
		expect(html).not.toMatch(/<button[^>]*data-testid="outbox-enqueue-submit"[^>]*disabled/);
	});
});
