import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeliveryEnqueueForm } from "../deliveryConsole/DeliveryEnqueueForm";
import { DeliveryTemplatesSection } from "../deliveryConsole/DeliveryTemplatesSection";

const noop = () => {};
const noopAsync = async () => {};

describe("MessageDeliveryConsole Render Autonomy (Mandate 8e — Zero Disabled Inputs/CTAs)", () => {
	it("1. DeliveryEnqueueForm renders unlocked textarea #enqueue-body and submit CTA even when inputs are empty and SMS quota is 0", () => {
		const html = renderToStaticMarkup(
			React.createElement(DeliveryEnqueueForm, {
				enqueueChannel: "sms",
				setEnqueueChannel: noop,
				enqueueIntent: "appointment_reminder",
				setEnqueueIntent: noop,
				enqueueScope: "service",
				setEnqueueScope: noop,
				enqueueRecipient: "",
				setEnqueueRecipient: noop,
				enqueueSubject: "",
				setEnqueueSubject: noop,
				enqueueTemplateId: "",
				setEnqueueTemplateId: noop,
				enqueueBody: "",
				setEnqueueBody: noop,
				enqueueBusy: false,
				enqueueMessage: noopAsync,
				enqueueTemplates: [],
				uisQuota: { remaining: 0, smsQuotaLimit: 100 },
			}),
		);

		assert.ok(html.includes('id="enqueue-body"'), "Must render textarea#enqueue-body");
		assert.ok(!/<textarea[^>]*id="enqueue-body"[^>]*disabled/i.test(html), "Textarea must never be disabled");
		assert.ok(html.includes('data-testid="outbox-enqueue-submit"'), "Must render enqueue submit CTA");
		assert.ok(!/<button[^>]*data-testid="outbox-enqueue-submit"[^>]*disabled/i.test(html), "Submit button must never be disabled by empty recipient/body");
		assert.ok(html.includes('data-testid="sms-quota-warning-banner"'), "Must display non-blocking SMS quota banner");
	});

	it("2. DeliveryEnqueueForm omits #enqueue-body only when a template is selected, keeping submit CTA unlocked", () => {
		const html = renderToStaticMarkup(
			React.createElement(DeliveryEnqueueForm, {
				enqueueChannel: "whatsapp",
				setEnqueueChannel: noop,
				enqueueIntent: "appointment_reminder",
				setEnqueueIntent: noop,
				enqueueScope: "service",
				setEnqueueScope: noop,
				enqueueRecipient: "+79001112233",
				setEnqueueRecipient: noop,
				enqueueSubject: "",
				setEnqueueSubject: noop,
				enqueueTemplateId: "tpl-1",
				setEnqueueTemplateId: noop,
				enqueueBody: "",
				setEnqueueBody: noop,
				enqueueBusy: false,
				enqueueMessage: noopAsync,
				enqueueTemplates: [
					{
						id: "tpl-1",
						title: "Напоминание",
						channel: "whatsapp",
						intent: "appointment_reminder",
						body: "Ждём вас",
						variables: [],
					},
				],
				uisQuota: null,
			}),
		);

		assert.equal(html.includes('id="enqueue-body"'), false);
		assert.ok(!/<button[^>]*disabled/i.test(html), "No disabled button should be rendered");
	});

	it("3. DeliveryTemplatesSection renders unlocked 'Создать шаблон' CTA even with empty draft title/body", () => {
		const html = renderToStaticMarkup(
			React.createElement(DeliveryTemplatesSection, {
				templates: [],
				draftTitle: "",
				setDraftTitle: noop,
				draftChannel: "whatsapp",
				setDraftChannel: noop,
				draftIntent: "appointment_reminder",
				setDraftIntent: noop,
				draftBody: "",
				setDraftBody: noop,
				editingId: null,
				setEditingId: noop,
				preview: null,
				previewError: null,
				variableCatalog: [],
				busy: false,
				saveTemplate: noopAsync,
				resetDraft: noop,
				insertTemplateVariable: noop,
			}),
		);

		assert.ok(html.includes("Создать шаблон"), "Save template CTA must render");
		assert.ok(!/<button[^>]*disabled/i.test(html), "Template save CTA must not be disabled by empty draft");
	});
});
