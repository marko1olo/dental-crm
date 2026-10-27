import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapRecallCandidateToRecord } from "../../PatientRecallsHubModal";
import { sendRecallCandidateInvite } from "../../patientRecallEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("5 & 6. CSS Tokens & Fastify Protocol", () => {
	it("verifies zero hardcoded hex colors in recalls.css", () => {
		const cssPath = path.resolve(process.cwd(), "apps/web/src/components/recalls/recalls.css");
		const cssContent = fs.readFileSync(cssPath, "utf8");
		const hexMatches = cssContent.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.strictEqual(hexMatches, null);
	});

	it("verifies zero untokenized rgba/rgb backgrounds or borders in recalls.css", () => {
		const cssPath = path.resolve(process.cwd(), "apps/web/src/components/recalls/recalls.css");
		const lines = fs.readFileSync(cssPath, "utf8").split("\n");
		const violations: string[] = [];
		lines.forEach((line, idx) => {
			if (/(color|background|border|box-shadow):/i.test(line)) {
				if (/rgba?\([0-9,\s.]+\)/i.test(line) && !line.includes("var(")) {
					violations.push(`Line ${idx + 1}: ${line.trim()}`);
				}
			}
		});
		assert.deepStrictEqual(violations, []);
	});

	it("verifies zero hardcoded hex colors in recallsKanban.css", () => {
		const cssPath = path.resolve(process.cwd(), "apps/web/src/components/recalls/recallsKanban.css");
		const cssContent = fs.readFileSync(cssPath, "utf8");
		const hexMatches = cssContent.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.strictEqual(hexMatches, null);
	});

	it("mapRecallCandidateToRecord correctly maps PostgreSQL 18 RecallCandidate to PatientRecallRecord", () => {
		const candidate = {
			patientId: "pat-sql-99",
			fullName: "Смирнов Алексей Викторович",
			phone: "+79161234567",
			email: "smirnov@example.com",
			lastCompletedAt: "2026-03-01T10:00:00.000Z",
			monthsSinceLastVisit: 6,
			band: "due" as const,
			reason: "Полгода без осмотра — пора на профилактику.",
		};
		const record = mapRecallCandidateToRecord(candidate);
		assert.strictEqual(record.id, "pat-sql-99");
		assert.strictEqual(record.patientId, "pat-sql-99");
		assert.strictEqual(record.fullName, "Смирнов Алексей Викторович");
		assert.strictEqual(record.lastVisitDate, "2026-03-01");
		assert.strictEqual(record.dueDate, "2026-09-01");
		assert.strictEqual(record.urgencyStatus, "due_now");
		assert.strictEqual(record.status, "due_now");
	});

	it("sendRecallCandidateInvite connects to Fastify endpoint", async () => {
		assert.strictEqual(typeof sendRecallCandidateInvite, "function");
		const originalFetch = globalThis.fetch;
		let calledUrl = "";
		let calledMethod = "";
		let calledBody: any = null;

		globalThis.fetch = (async (url: any, init: any) => {
			calledUrl = String(url);
			calledMethod = init?.method ?? "GET";
			calledBody = JSON.parse(init?.body as string);
			return {
				ok: true,
				status: 200,
				json: async () => ({
					ok: true,
					outboxId: "outbox-test-123",
					duplicate: false,
					message: "Приглашение поставлено в очередь.",
				}),
			} as any;
		}) as any;

		try {
			const result = await sendRecallCandidateInvite(
				{ patientId: "pat-test-uuid", channel: "whatsapp", body: "Здравствуйте! Пора на осмотр." },
				{ "x-organization-id": "org-test-uuid" },
			);
			assert.ok(calledUrl === "/api/recalls/invite" || calledUrl === "/api/patients/recall-candidates/invite");
			assert.strictEqual(calledMethod, "POST");
			assert.strictEqual(calledBody.patientId, "pat-test-uuid");
			assert.strictEqual(result.ok, true);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
