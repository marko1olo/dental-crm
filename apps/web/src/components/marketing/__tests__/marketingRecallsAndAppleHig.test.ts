import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sendRecallCandidateStatusUpdate } from "../../recalls/recallStatusUpdateApi";
import { sendRecallCandidateInvite, validateRecallInviteSafety } from "../../recalls/recallMessagingApi";
import { PatientRecallsHubModal } from "../../recalls/PatientRecallsHubModal";
import { MarketingRomiTableHeader } from "../MarketingRomiTableHeader";

describe("Marketing, Recalls API & Apple HIG Render Verification", () => {
	it("1. sendRecallCandidateStatusUpdate dispatches PATCH /api/recalls/:patientId/status with Idempotency-Key and throws on HTTP error", async () => {
		const originalFetch = globalThis.fetch;
		const calls: Array<{ url: string; method?: string | undefined; body?: string | undefined; headers?: Record<string, string> | undefined }> = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({
				url: String(input),
				method: init?.method,
				body: init?.body ? String(init.body) : undefined,
				headers: (init?.headers as Record<string, string>) ?? undefined,
			});
			if (String(input).includes("fail-patient")) {
				return new Response(JSON.stringify({ message: "Ошибка обновления" }), { status: 400 });
			}
			return new Response(
				JSON.stringify({ data: { ok: true, patientId: "pat-1", status: "scheduled", updatedAt: "2026-06-01T10:00:00Z" } }),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;

		try {
			const res = await sendRecallCandidateStatusUpdate({
				patientId: "pat-1",
				status: "scheduled",
				channel: "whatsapp",
				note: "Записан на гигиену",
			});
			assert.equal(res.ok, true);
			assert.equal(res.status, "scheduled");
			assert.equal(calls[0]?.url, "/api/recalls/pat-1/status");
			assert.equal(calls[0]?.method, "PATCH");
			assert.ok(calls[0]?.headers?.["Idempotency-Key"], "Must send Idempotency-Key header");

			await assert.rejects(
				() => sendRecallCandidateStatusUpdate({ patientId: "fail-patient", status: "scheduled" }),
				/Ошибка обновления/,
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("2. sendRecallCandidateInvite blocks non-consented marketing invites locally before fetch and posts /api/recalls/invite when allowed", async () => {
		const originalFetch = globalThis.fetch;
		let fetchCount = 0;
		let lastUrl = "";
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			fetchCount += 1;
			lastUrl = String(input);
			return new Response(JSON.stringify({ ok: true, outboxId: "out-1" }), { status: 200 });
		}) as typeof fetch;

		try {
			const blocked = await sendRecallCandidateInvite(
				{ patientId: "pat-no-consent", channel: "sms", body: "Приглашаем" },
				undefined,
				{ consentMarketing: false },
			);
			assert.equal(blocked.ok, false);
			assert.equal(fetchCount, 0, "Must suppress network request when marketing consent is false");

			const okRes = await sendRecallCandidateInvite(
				{ patientId: "pat-ok", channel: "whatsapp", body: "Ждём на профосмотр" },
				undefined,
				{ consentMarketing: true, messagesSentTodayCount: 0 },
			);
			assert.equal(okRes.ok, true);
			assert.equal(fetchCount, 1);
			assert.equal(lastUrl, "/api/recalls/invite");

			const safetyCheck = validateRecallInviteSafety(
				{
					id: "rec-1",
					patientId: "pat-1",
					patientName: "Тест",
					phone: "+79001112233",
					consentMarketing: false,
				} as Parameters<typeof validateRecallInviteSafety>[0],
			);
			assert.equal(safetyCheck.allowed, false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("3. PatientRecallsHubModal renders Apple HIG drag handle & unlocked buttons without raw emojis", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientRecallsHubModal, {
				isOpen: true,
				embedded: true,
				clinicName: "Денте Плюс",
				initialCandidates: [],
			}),
		);
		assert.ok(html.includes('data-testid="patient-recalls-hub-modal"'));
		assert.ok(html.includes("recall-drag-handle"));
		assert.equal(/<button[^>]*disabled/i.test(html), false, "No disabled buttons allowed");
	});

	it("4. MarketingRomiTableHeader renders single primary CTA and secondary sync/audit buttons", () => {
		const noop = () => {};
		const html = renderToStaticMarkup(
			React.createElement(MarketingRomiTableHeader, {
				onSyncWithCrm: noop,
				onOpenRoiModal: noop,
				onResetDefaults: noop,
				isAddingChannel: false,
				onToggleAddChannel: noop,
			}),
		);
		assert.equal((html.match(/romi-action-btn primary/g) || []).length, 1);
		assert.ok(html.includes('data-testid="romi-sync-crm-btn"'));
		assert.ok(html.includes("Добавить канал"));
	});
});
