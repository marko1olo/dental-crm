import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { captureLeadFromIncomingCall } from "../telephonyAttribution";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useLeadsStore } from "../../../store/leadsStore";

describe("Telephony 1-Click Lead Capture Action", () => {
	beforeEach(() => {
		useTelephonyStore.setState({
			activeCall: null,
			callHistory: [],
		});
		useLeadsStore.setState({
			leads: [],
		});
	});

	it("2.1. captureLeadFromIncomingCall creates lead and updates telephony store", async () => {
		const originalFetch = global.fetch;
		let sentUrl = "";
		let sentBody: Record<string, unknown> = {};

		global.fetch = (async (url: string | URL, init?: RequestInit) => {
			sentUrl = String(url);
			if (init?.body) {
				sentBody = JSON.parse(String(init.body));
			}
			return {
				ok: true,
				status: 201,
				json: async () => ({
					id: "lead-new-123",
					name: sentBody.name,
					phone: sentBody.phone,
					source: sentBody.source,
					status: "new",
					notes: sentBody.notes,
				}),
			} as Response;
		}) as unknown as typeof fetch;

		try {
			const call: IncomingCallPayload = {
				callId: "call-xyz-777",
				phone: "+79997771122",
				patientId: null,
				patientName: "Неизвестный номер",
				provider: "uis",
				utmSource: "yandex_direct",
				utmCampaign: "retargeting",
				virtualNumber: "+74951112233",
			};

			useTelephonyStore.setState({ activeCall: call });

			const res = await captureLeadFromIncomingCall(call, {
				customName: "Сергей Николаевич",
				customNotes: "Интересуется керамическими винирами E.max",
			});

			assert.strictEqual(res.success, true);
			assert.strictEqual(sentUrl, "/api/leads");
			assert.strictEqual(sentBody.name, "Сергей Николаевич");
			assert.strictEqual(sentBody.phone, "+79997771122");
			assert.strictEqual(sentBody.source, "yandex_direct");
			assert.strictEqual(sentBody.status, "new");
			assert.ok(String(sentBody.notes).includes("Яндекс.Директ"));
			assert.ok(String(sentBody.notes).includes("винирами E.max"));

			const active = useTelephonyStore.getState().activeCall;
			assert.strictEqual(active?.leadId, "lead-new-123");
			assert.strictEqual(active?.isLeadCaptured, true);
		} finally {
			global.fetch = originalFetch;
		}
	});

	it("2.2. Handles server failure gracefully without unhandled rejection", async () => {
		const originalFetch = global.fetch;
		global.fetch = (async () => {
			return {
				ok: false,
				status: 500,
				json: async () => ({ message: "Ошибка базы данных" }),
			} as Response;
		}) as unknown as typeof fetch;

		try {
			const call: IncomingCallPayload = {
				phone: "+79990001122",
				patientId: null,
				patientName: "Неизвестный",
			};

			const res = await captureLeadFromIncomingCall(call);
			assert.strictEqual(res.success, false);
			assert.strictEqual(res.message, "Ошибка базы данных");
		} finally {
			global.fetch = originalFetch;
		}
	});
});
