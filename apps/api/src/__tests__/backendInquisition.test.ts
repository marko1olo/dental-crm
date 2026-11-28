/**
 * apps/api/src/__tests__/backendInquisition.test.ts
 *
 * Реальный поведенческий бэкенд-тест (Часть 6Г — БЕЗ source-grep и БЕЗ заглушек).
 * Проверяет настоящие runtime-инварианты ядра клиники:
 *   1. Fail-closed `runWithStrictUnscopedDbTrap`: голый вызов `db.select` / `db.execute`
 *      вне `withTenantReadCtx`/`withTenantWriteCtx` (под FORCE RLS иначе молча вернул бы `[]`!)
 *      обязан немедленно взрываться `UnscopedTenantDbAccessError`.
 *   2. Exact Kopecks Money Contract (`money.ts`): не допускает float-копеек (3 знака после запятой),
 *      отсекает NaN/Infinity/float при `assertIntegerKopecks` и не врёт при суммировании.
 */

import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { z } from "zod";
import {
	allocateGlobalDiscountCents,
	assertIntegerKopecks,
	formatKopecksToRubles,
	kopecksToNumericString,
	moneyRubSchema,
	positiveMoneyRubSchema,
	rublesToKopecks,
} from "@dental/shared";
import { db, runWithStrictUnscopedDbTrap, UnscopedTenantDbAccessError } from "../db/client.js";
import { patients } from "../db/schema.js";
import { definePublicRoute, defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";

test("Strict unscoped DB trap rejects raw db.select() outside tenant context instead of silently returning [] under FORCE RLS", async () => {
	await assert.rejects(
		async () => {
			await runWithStrictUnscopedDbTrap(async () => {
				return await db.select().from(patients);
			});
		},
		(err: unknown) => {
			assert.ok(
				err instanceof UnscopedTenantDbAccessError,
				`Ожидалась ошибка UnscopedTenantDbAccessError (защита от тихого [] под FORCE RLS), но поймано: ${String(err)}`,
			);
			return true;
		},
	);
});

test("Strict unscoped DB trap also rejects db.transaction() outside tenant context", async () => {
	await assert.rejects(
		async () => {
			await runWithStrictUnscopedDbTrap(async () => {
				return await db.transaction(async () => "should-not-run");
			});
		},
		UnscopedTenantDbAccessError,
	);
});

test("Money SSOT strictly rejects 3-decimal floats, NaN and non-integer kopecks", () => {
	assert.equal(moneyRubSchema.safeParse(1500.5).success, true);
	assert.equal(moneyRubSchema.safeParse(1500.505).success, false, "3 знака после запятой обязаны отвергаться, не округляться молча!");
	assert.equal(positiveMoneyRubSchema.safeParse(0).success, false);
	assert.equal(positiveMoneyRubSchema.safeParse(-100).success, false);

	assert.throws(() => assertIntegerKopecks(150.5), /Копейки должны быть конечным целым/);
	assert.throws(() => assertIntegerKopecks(Number.NaN), /Копейки должны быть конечным целым/);
	assert.doesNotThrow(() => assertIntegerKopecks(1850000));
	assert.equal(formatKopecksToRubles(1850050), "18500.50");
});

test("routeFactories perimeter fails closed (401/403) on unauthenticated calls & forged x-dente-org-id without hitting DB", async () => {
	const app = Fastify({ logger: false });
	let handlerReached = false;

	defineTenantQuery(app, {
		path: "/api/inquisition/patients",
		permission: "patients.read",
		handler: async () => {
			handlerReached = true;
			return { ok: true };
		},
	});

	defineTenantMutation(app, {
		method: "POST",
		path: "/api/inquisition/charge",
		permission: "billing.write",
		bodySchema: z.object({ amountKopecks: z.number().int().positive() }).strict(),
		handler: async () => {
			handlerReached = true;
			return { charged: true };
		},
	});

	await app.ready();
	try {
		const unauthGet = await app.inject({
			method: "GET",
			url: "/api/inquisition/patients",
			headers: { "x-dente-org-id": "forged-org-id" },
		});
		assert.ok(unauthGet.statusCode === 401 || unauthGet.statusCode === 403, `Unauthenticated tenant query returned ${unauthGet.statusCode}`);

		const unauthPost = await app.inject({
			method: "POST",
			url: "/api/inquisition/charge",
			payload: { amountKopecks: 50000 },
		});
		assert.ok(unauthPost.statusCode === 401 || unauthPost.statusCode === 403, `Unauthenticated tenant mutation returned ${unauthPost.statusCode}`);
		assert.equal(handlerReached, false, "Route handler MUST NEVER execute when auth perimeter rejects request!");
	} finally {
		await app.close();
	}
});

test("definePublicRoute strictly rejects unknown fields (Zod .strict()) before reaching DB or handler", async () => {
	const app = Fastify({ logger: false });
	let reached = false;
	definePublicRoute(app, {
		method: "POST",
		path: "/api/inquisition/public-booking",
		bodySchema: z.object({ patientName: z.string().min(2), slotStart: z.string().min(10) }).strict(),
		handler: async () => {
			reached = true;
			return { booked: true };
		},
	});
	await app.ready();
	try {
		const badExtra = await app.inject({
			method: "POST",
			url: "/api/inquisition/public-booking",
			payload: { patientName: "Анна", slotStart: "2026-11-29T10:00:00", organizationId: "injected-tenant" },
		});
		assert.equal(badExtra.statusCode, 400, "Zod .strict() must reject unpermitted payload fields with HTTP 400!");
		assert.equal(reached, false, "Public route handler MUST NOT execute when Zod schema validation fails!");
	} finally {
		await app.close();
	}
});

test("Hamilton-Hare discount allocation & rub->kopecks math preserve exact kopeck totals on IEEE-754 traps", () => {
	assert.equal(rublesToKopecks(0.1 + 0.2), 30, "0.1 + 0.2 must equal exact 30 kopecks without float drift");
	assert.equal(kopecksToNumericString(rublesToKopecks(19.99)), "19.99");
	assert.equal(kopecksToNumericString(rublesToKopecks(-125.07)), "-125.07");

	const items = [
		{ id: "a", amountCents: 3333n },
		{ id: "b", amountCents: 3334n },
		{ id: "c", amountCents: 3334n },
	];
	const targetDiscount = 1701n;
	const alloc = allocateGlobalDiscountCents(items, targetDiscount);
	const sumAllocated = [...alloc.values()].reduce((acc, v) => acc + v, 0n);
	assert.equal(sumAllocated, targetDiscount, "Hamilton-Hare must conserve 100% of discount kopecks without losing 1 kopeck!");

	const capped = allocateGlobalDiscountCents(items, 999999n);
	const cappedSum = [...capped.values()].reduce((acc, v) => acc + v, 0n);
	assert.equal(cappedSum, 10001n, "100%+ discount must cap strictly at item total without negative prices!");
});

test("routeFactories rejects forged Bearer tokens and forged x-dente-clinic-token before executing query handler", async () => {
	const app = Fastify({ logger: false });
	let handlerReached = false;

	defineTenantQuery(app, {
		path: "/api/inquisition/secret-patient",
		permission: "patients.read",
		handler: async ({ organizationId }) => {
			handlerReached = true;
			return { organizationId };
		},
	});

	await app.ready();
	try {
		const tamperedRes = await app.inject({
			method: "GET",
			url: "/api/inquisition/secret-patient",
			headers: {
				authorization: "Bearer tampered.jwt.payload",
				"x-dente-org-id": "attacker-org-id",
				"x-dente-clinic-token": "forged-clinic-token",
			},
		});
		assert.ok(
			tamperedRes.statusCode === 401 || tamperedRes.statusCode === 403,
			`Поддельный Bearer + x-dente-org-id должен жёстко резаться (401/403), но сервер вернул ${tamperedRes.statusCode}!`,
		);
		assert.equal(
			handlerReached,
			false,
			"КРИТИЧЕСКАЯ УЯЗВИМОСТЬ BOLA: обработчик роута выполнился при подделанном токене!",
		);
	} finally {
		await app.close();
	}
});
