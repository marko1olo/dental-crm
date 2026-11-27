import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	executePaperConsentConfirm,
	executeDocumentIssueAndSign,
	applyDocumentIssueSuccess,
	type UseDocumentStudioSignAndIssueOptions,
} from "../hooks/useDocumentStudioSignAndIssue.js";
import { useOfflineStore } from "../../../store/offlineStore.js";

function createTestOptions(overrides: Partial<UseDocumentStudioSignAndIssueOptions> = {}) {
	const signedFlags: boolean[] = [];
	const signedPayloads: unknown[] = [];
	const docSignedPayloads: unknown[] = [];
	const consentSignedPayloads: unknown[] = [];
	const localConsents: Array<{ key: string; iso: string }> = [];
	const toasts: Array<{ msg: string; type?: string }> = [];

	const options: UseDocumentStudioSignAndIssueOptions = {
		activePackage: "informed_consent",
		activeConsentSubKind: "general",
		currentConsentKey: "consent_general",
		isSignPadOpen: true,
		effectivePatientId: "pat-test-1",
		effectiveDoctorName: "Др. Смирнов",
		patient: {
			fullName: "Петров Алексей",
			birthDate: "1990-01-15",
			phone: "+79001112233",
			address: "Москва",
			passportSeriesNumber: "4500 123456",
			passportIssuedBy: "УФМС",
			inn: "",
		},
		clinicRequisites: {
			name: "Клиника Денте",
			inn: "7701234567",
			license: "ЛО-77-01-000001",
			address: "Москва, ул. Тестовая, 1",
			phone: "+74951234567",
		},
		currentDate: "27.11.2026",
		taxYear: 2026,
		totalAmountKopecks: 150000,
		taxTotalAmountKopecks: 150000,
		taxCode01Kopecks: 150000,
		taxCode02Kopecks: 0,
		taxReceiptItems: [],
		renderedDocumentText: "Текст согласия",
		legalContext: {
			documentNumber: "ДОГ-2026/001",
			legalDateStr: "27.11.2026",
			patientFullName: "Петров Алексей",
			doctorFullName: "Др. Смирнов",
			clinicTitle: "Клиника Денте",
			clinicInn: "7701234567",
			clinicLicense: "ЛО-77-01-000001",
		},
		getSignatureDataUrl: () => "data:image/svg+xml;utf8,<svg></svg>",
		recordConsentLocally: (key, iso) => localConsents.push({ key, iso }),
		setHasSigned: (val) => signedFlags.push(val),
		showToast: (msg, type) => toasts.push({ msg, type }),
		onSigned: (p) => signedPayloads.push(p),
		onDocumentSigned: (p) => docSignedPayloads.push(p),
		onConsentSigned: (p) => consentSignedPayloads.push(p),
		...overrides,
	};

	return {
		options,
		signedFlags,
		signedPayloads,
		docSignedPayloads,
		consentSignedPayloads,
		localConsents,
		toasts,
	};
}

const originalFetch = globalThis.fetch;

describe("useDocumentStudioSignAndIssue — Honest Server Confirmation (Batch B)", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("does NOT call setHasSigned(true) or sign callbacks when /api/documents returns HTTP 500", async () => {
		const ctx = createTestOptions();
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Внутренняя ошибка БД" }), { status: 500 })) as typeof fetch;

		await assert.rejects(() => executeDocumentIssueAndSign(ctx.options), /Внутренняя ошибка БД/);
		assert.equal(ctx.signedFlags.length, 0);
		assert.equal(ctx.docSignedPayloads.length, 0);
		assert.equal(ctx.consentSignedPayloads.length, 0);
		assert.equal(ctx.localConsents.length, 0);
		assert.equal(ctx.toasts.at(-1)?.type, "error");
	});

	it("does NOT fake success when /api/documents/id/issue returns HTTP 403", async () => {
		const ctx = createTestOptions();
		let step = 0;
		globalThis.fetch = (async () => {
			step++;
			if (step === 1) {
				return new Response(JSON.stringify({ data: { id: "doc-403" } }), { status: 201 });
			}
			return new Response(JSON.stringify({ message: "Доступ запрещён" }), { status: 403 });
		}) as typeof fetch;

		await assert.rejects(() => executeDocumentIssueAndSign(ctx.options), /Доступ запрещён/);
		assert.equal(ctx.signedFlags.length, 0);
		assert.equal(ctx.localConsents.length, 0);
		assert.equal(ctx.toasts.at(-1)?.type, "error");
	});

	it("enqueues offline mutation on network TypeError without calling setHasSigned(true)", async () => {
		const ctx = createTestOptions();
		const enqueued: unknown[] = [];
		const prevEnqueue = useOfflineStore.getState().enqueue;
		useOfflineStore.setState({
			enqueue: async (input) => {
				enqueued.push(input);
				return {
					id: 1,
					mutationId: input.mutationId,
					idempotencyKey: input.idempotencyKey,
					entityType: input.entityType,
					entityId: input.entityId,
					action: input.action,
					endpoint: input.endpoint,
					payload: input.payload,
					status: "pending",
					retryCount: 0,
					createdAt: new Date().toISOString(),
					hlcTimestamp: "1-0",
				};
			},
		});

		try {
			globalThis.fetch = (async () => {
				throw new TypeError("Failed to fetch");
			}) as typeof fetch;

			const res = await executeDocumentIssueAndSign(ctx.options);
			assert.equal(res.queuedOffline, true);
			assert.equal(enqueued.length, 1);

			const applied = applyDocumentIssueSuccess(ctx.options, res);
			assert.equal(applied, false);
			assert.equal(ctx.signedFlags.length, 0);
			assert.equal(ctx.signedPayloads.length, 0);
			assert.equal(ctx.toasts.at(-1)?.type, "info");
		} finally {
			useOfflineStore.setState({ enqueue: prevEnqueue });
		}
	});

	it("sets hasSigned and triggers callbacks strictly after all server mutations succeed", async () => {
		const ctx = createTestOptions();
		const requests: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
		globalThis.fetch = (async (input, init) => {
			const url = typeof input === "string" ? input : input.toString();
			const body = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
			requests.push({ url, headers: new Headers(init?.headers), body });
			if (url === "/api/documents") {
				return new Response(JSON.stringify({ data: { id: "doc-ok-1" } }), { status: 201 });
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}) as typeof fetch;

		const res = await executeDocumentIssueAndSign(ctx.options);
		assert.equal(res.queuedOffline, false);
		assert.equal(requests.length, 3);
		assert.equal(requests[0]?.body.totalAmountKopecks, 150000);
		assert.ok(requests[0]?.headers.get("Idempotency-Key"));
		assert.equal(requests[1]?.url, "/api/documents/doc-ok-1/issue");
		assert.equal(requests[2]?.url, "/api/patients/pat-test-1/consents");
		assert.equal(ctx.localConsents.length, 1);

		const applied = applyDocumentIssueSuccess(ctx.options, res);
		assert.equal(applied, true);
		assert.deepEqual(ctx.signedFlags, [true]);
		assert.equal(ctx.docSignedPayloads.length, 1);
		assert.equal(ctx.consentSignedPayloads.length, 1);
	});

	it("paper consent confirmation blocks setHasSigned(true) on HTTP 500", async () => {
		const ctx = createTestOptions();
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Ошибка сохранения согласия" }), { status: 500 })) as typeof fetch;

		const res = await executePaperConsentConfirm(ctx.options);
		assert.equal(res.ok, false);
		assert.equal(res.queuedOffline, false);
		assert.equal(ctx.signedFlags.length, 0);
		assert.equal(ctx.consentSignedPayloads.length, 0);
		assert.equal(ctx.toasts.at(-1)?.type, "error");
	});
});
