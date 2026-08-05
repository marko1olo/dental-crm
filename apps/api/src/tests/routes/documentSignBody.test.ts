/**
 * СТОРОЖ ТЕЛА ПОДПИСИ ДОКУМЕНТА (handwritten SVG + УКЭП PKCS#7).
 *
 * Раньше оба маршрута читали тело через bare cast:
 *   const { signatureSvg } = request.body as { signatureSvg: string }
 *   const { pkcs7Signature } = request.body as { pkcs7Signature: string }
 * При null/undefined body (POST без JSON) деструктуризация бросала TypeError → 500.
 * Zod safeParse после auth-first обязан вернуть 400 ValidationError с прежним текстом.
 *
 * Проверки: auth-first 401; empty/null body → 400 (не 500); happy-path draft+SVG → 200.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { register as registerSign } from "../../routes/documents/sign.js";
import { register as registerSignUkep } from "../../routes/documents/signUkep.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "documentSignBody";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const DRAFT_DOC_ID = fixtureUuid(NAMESPACE, 4);

const VALID_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

describe("подпись документа — Zod body (null → 400, не 500)", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	async function postSign(
		id: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			headers?: Record<string, string>;
			withAuth?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			...(opts.headers ?? {}),
		};
		if (opts.withAuth !== false) {
			headers["x-dente-staff-token"] = staffToken;
			headers["content-type"] =
				headers["content-type"] ?? "application/json";
		}
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			payload?: any;
		} = {
			method: "POST",
			url: `/api/documents/${id}/sign`,
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return { statusCode: response.statusCode, json, body: response.body };
	}

	async function postUkep(
		id: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			headers?: Record<string, string>;
			withAuth?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			...(opts.headers ?? {}),
		};
		if (opts.withAuth !== false) {
			headers["x-dente-staff-token"] = staffToken;
			headers["content-type"] =
				headers["content-type"] ?? "application/json";
		}
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			payload?: any;
		} = {
			method: "POST",
			url: `/api/documents/${id}/sign-ukep`,
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return { statusCode: response.statusCode, json, body: response.body };
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			// Без БД всё равно поднимаем app: auth/body 400/401 не требуют SQL.
		}

		if (databaseReady) {
			/*
			 * Сев идёт под тенант-контекстом. WITH CHECK у `users`, `patients` и
			 * `generated_documents` требует `organization_id = current_tenant` и не
			 * знает дизъюнкта обхода, поэтому вставка без контекста даёт 42501.
			 */
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				await db.insert(organizations).values({
					id: ORGANIZATION_ID,
					name: "Клиника сторожа тела подписи документа",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Врач сторожа подписи",
					role: "doctor",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Пациент сторожа подписи",
					status: "active",
				});
				await db.insert(generatedDocuments).values({
					id: DRAFT_DOC_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					kind: "medical_intervention_refusal",
					status: "draft",
					title: "Черновик для handwritten sign",
				});
			});
		}

		staffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_ID,
				role: "doctor",
			},
			authTokenSecret(),
		);

		// Оба хука изоляции боевого server.ts: без обёртки `withTenantCtx` вокруг
		// обработчика подпись читает НОЛЬ строк и черновик выглядит несуществующим.
		app = createTenantTestApp();
		await registerSign(app);
		await registerSignUkep(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("без токена → 401 (auth first, не 404)", async () => {
		const signRes = await postSign(DRAFT_DOC_ID, {
			withAuth: false,
			body: { signatureSvg: VALID_SVG },
		});
		assert.equal(
			signRes.statusCode,
			401,
			`sign без токена дал HTTP ${signRes.statusCode}: ${signRes.body}`,
		);

		const ukepRes = await postUkep(DRAFT_DOC_ID, {
			withAuth: false,
			body: { pkcs7Signature: "cHJvb2Y=" },
		});
		assert.equal(
			ukepRes.statusCode,
			401,
			`sign-ukep без токена дал HTTP ${ukepRes.statusCode}: ${ukepRes.body}`,
		);
	});

	test("sign-ukep empty {} → 400 ValidationError", async () => {
		const res = await postUkep(DRAFT_DOC_ID, { body: {} });
		assert.equal(
			res.statusCode,
			400,
			`empty body дал HTTP ${res.statusCode}: ${res.body}`,
		);
		assert.equal(res.json.error, "ValidationError");
		assert.equal(res.json.message, "ID and pkcs7Signature are required");
	});

	test("sign-ukep null/missing body → 400 (не 500)", async () => {
		// inject без payload + content-type json: Fastify parser может отдать
		// свой 400 Bad Request ДО хендлера. Главное — не 500 TypeError.
		const missing = await postUkep(DRAFT_DOC_ID, { rawPayload: null });
		assert.notEqual(
			missing.statusCode,
			500,
			`missing body дал 500: ${missing.body}`,
		);
		assert.equal(
			missing.statusCode,
			400,
			`missing body дал HTTP ${missing.statusCode}: ${missing.body}`,
		);

		// Явный JSON null → body === null доходит до Zod safeParse → ValidationError
		const nullBody = await postUkep(DRAFT_DOC_ID, {
			rawPayload: "null",
			headers: { "content-type": "application/json" },
		});
		assert.notEqual(
			nullBody.statusCode,
			500,
			`JSON null body дал 500: ${nullBody.body}`,
		);
		assert.equal(
			nullBody.statusCode,
			400,
			`JSON null body дал HTTP ${nullBody.statusCode}: ${nullBody.body}`,
		);
		assert.equal(nullBody.json.error, "ValidationError");
		assert.equal(
			nullBody.json.message,
			"ID and pkcs7Signature are required",
		);
	});

	test("sign empty/null body → 400 ID and signatureSvg are required", async () => {
		const empty = await postSign(DRAFT_DOC_ID, { body: {} });
		assert.equal(
			empty.statusCode,
			400,
			`empty body дал HTTP ${empty.statusCode}: ${empty.body}`,
		);
		assert.equal(empty.json.error, "ValidationError");
		assert.equal(empty.json.message, "ID and signatureSvg are required");

		// Без payload: Fastify 400 или Zod 400 — не 500
		const missing = await postSign(DRAFT_DOC_ID, { rawPayload: null });
		assert.notEqual(
			missing.statusCode,
			500,
			`missing body дал 500: ${missing.body}`,
		);
		assert.equal(
			missing.statusCode,
			400,
			`missing body дал HTTP ${missing.statusCode}: ${missing.body}`,
		);

		const nullBody = await postSign(DRAFT_DOC_ID, {
			rawPayload: "null",
			headers: { "content-type": "application/json" },
		});
		assert.notEqual(
			nullBody.statusCode,
			500,
			`JSON null body дал 500: ${nullBody.body}`,
		);
		assert.equal(
			nullBody.statusCode,
			400,
			`JSON null body дал HTTP ${nullBody.statusCode}: ${nullBody.body}`,
		);
		assert.equal(nullBody.json.error, "ValidationError");
		assert.equal(nullBody.json.message, "ID and signatureSvg are required");
	});

	test("draft + valid SVG → 200 (если БД доступна)", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const res = await postSign(DRAFT_DOC_ID, {
			body: { signatureSvg: VALID_SVG },
		});
		assert.equal(
			res.statusCode,
			200,
			`happy-path sign дал HTTP ${res.statusCode}: ${res.body}`,
		);
		assert.equal(res.json.success, true);
		assert.equal(res.json.id, DRAFT_DOC_ID);
	});
});
