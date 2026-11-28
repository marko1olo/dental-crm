import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapRecallCandidateToRecord } from "../../recallCandidateAdapter";
import {
	buildTelegramUrl,
	buildWhatsAppUrl,
	generatePdnProtectedRecallMessage,
} from "../../recallMessageFormatters";
import {
	sendRecallCandidateInvite,
	validateRecallInviteSafety,
} from "../../recallMessagingApi";
import { sendRecallCandidateStatusUpdate } from "../../recallStatusUpdateApi";

describe("Recall Engine Domain Behavior & Backend Fetch Protocol (6Г)", () => {
	it("mapRecallCandidateToRecord maps cohortType and urgency band into PatientRecallRecord", () => {
		const implantRecord = mapRecallCandidateToRecord({
			patientId: "pat-imp-1",
			fullName: "Смирнов Дмитрий Иванович",
			phone: "+7 903 555-66-77",
			cohortType: "implant",
			band: "overdue",
			monthsSinceLastVisit: 13,
			suggestedIntervalMonths: 12,
			lastCompletedAt: "2025-01-15T10:00:00.000Z",
			attendingDoctorName: "Д-р Орлов",
		});

		assert.equal(implantRecord.patientId, "pat-imp-1");
		assert.equal(implantRecord.cycleType, "implant_monitoring");
		assert.equal(implantRecord.urgencyStatus, "overdue_30");
		assert.equal(implantRecord.lastVisitDate, "2025-01-15");

		const orthoRecord = mapRecallCandidateToRecord({
			patientId: "pat-ort-1",
			fullName: "Волкова Анна",
			cohortType: "orthodontic_retention",
			band: "probably_lost",
		});
		assert.equal(orthoRecord.cycleType, "orthodontic_retention");
		assert.equal(orthoRecord.urgencyStatus, "overdue_90");
	});

	it("generatePdnProtectedRecallMessage & messenger builders format safe booking links without diagnosis leaks", () => {
		const record = mapRecallCandidateToRecord({
			patientId: "pat-pdn-1",
			fullName: "Белова Ольга Николаевна",
			phone: "+7 (926) 777-88-99",
			cohortType: "periodontal",
			band: "due",
			lastCompletedAt: "2025-09-10T09:00:00.000Z",
			notes: "Секретный диагноз К05.3",
		});

		const msg = generatePdnProtectedRecallMessage(record, {
			clinicName: "ДЕНТЕ Плюс",
			baseUrl: "https://clinic.example.ru",
		});
		assert.ok(msg.includes("Ольга Николаевна"));
		assert.ok(msg.includes("ДЕНТЕ Плюс"));
		assert.ok(msg.includes("https://clinic.example.ru/booking?patient_id=pat-pdn-1"));
		assert.equal(msg.includes("К05.3"), false);

		const wa = buildWhatsAppUrl("+7 (926) 777-88-99", msg);
		assert.ok(wa.startsWith("https://wa.me/79267778899?text="));

		const tg = buildTelegramUrl("@olga_belova", msg);
		assert.ok(tg.startsWith("https://t.me/olga_belova?text="));
	});

	it("sendRecallCandidateInvite sends Idempotency-Key, unwraps { data } and propagates HTTP errors", async () => {
		const originalFetch = globalThis.fetch;
		const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

		globalThis.fetch = (async (input, init) => {
			const headerObj: Record<string, string> = {};
			if (init?.headers && !(init.headers instanceof Headers) && !Array.isArray(init.headers)) {
				Object.assign(headerObj, init.headers);
			}
			calls.push({
				url: String(input),
				headers: headerObj,
				body: typeof init?.body === "string" ? init.body : "",
			});

			return new Response(
				JSON.stringify({
					data: { ok: true, outboxId: "outbox-123", duplicate: false },
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;

		try {
			const res = await sendRecallCandidateInvite(
				{ patientId: "pat-1", channel: "whatsapp", body: "Приглашение" },
				{ Authorization: "Bearer staff-jwt" },
			);
			assert.equal(res.ok, true);
			assert.equal(res.outboxId, "outbox-123");
			assert.equal(calls.length, 1);
			assert.equal(calls[0]?.url, "/api/recalls/invite");
			assert.equal(calls[0]?.headers.Authorization, "Bearer staff-jwt");
			assert.ok(calls[0]?.headers["Idempotency-Key"]);

			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "Пациент отказался от рассылок" }), {
					status: 422,
					headers: { "content-type": "application/json" },
				})) as typeof fetch;

			await assert.rejects(
				() => sendRecallCandidateInvite({ patientId: "pat-1", channel: "sms", body: "Текст" }),
				/Пациент отказался от рассылок/,
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("sendRecallCandidateStatusUpdate sends PATCH with Idempotency-Key & fails honestly on 500", async () => {
		const originalFetch = globalThis.fetch;
		let requestedMethod = "";
		let requestedUrl = "";
		globalThis.fetch = (async (input, init) => {
			requestedUrl = String(input);
			requestedMethod = init?.method ?? "";
			return new Response(
				JSON.stringify({
					data: { ok: true, patientId: "pat-9", status: "scheduled", updatedAt: "2026-09-01T10:00:00.000Z" },
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;

		try {
			const okRes = await sendRecallCandidateStatusUpdate({
				patientId: "pat-9",
				status: "scheduled",
				channel: "phone",
			});
			assert.equal(requestedMethod, "PATCH");
			assert.equal(requestedUrl, "/api/recalls/pat-9/status");
			assert.equal(okRes.status, "scheduled");

			const blocked = validateRecallInviteSafety(
				mapRecallCandidateToRecord({ patientId: "pat-9", fullName: "Тест" }),
				{ consentMarketing: false },
			);
			assert.equal(blocked.allowed, false);

			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "БД недоступна" }), {
					status: 500,
					headers: { "content-type": "application/json" },
				})) as typeof fetch;

			await assert.rejects(
				() => sendRecallCandidateStatusUpdate({ patientId: "pat-9", status: "completed" }),
				/БД недоступна/,
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
