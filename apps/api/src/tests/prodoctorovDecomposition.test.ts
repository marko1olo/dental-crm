/**
 * apps/api/src/tests/prodoctorovDecomposition.test.ts
 * Точечный юнит- и контракт-тест декомпозированного модуля Prodoctorov Integration.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Fastify from "fastify";
import {
	registerProdoctorovRoutes,
	ALLOWED_NOMENCLATURE_CATEGORIES,
	DENTAL_SPECIALTIES_RU,
	slotsQuerySchema,
	webhookPayloadSchema,
	verifyHmacSha256Signature,
	isInternalTechnicalPosition,
	resolveAllowedCategory,
	escapeXml,
} from "../routes/integrations/prodoctorov.js";

describe("Prodoctorov Integration Route Decomposition Suite", () => {
	it("1. Фасад registerProdoctorovRoutes экспортируется и регистрирует эндпоинты в Fastify", async () => {
		assert.equal(typeof registerProdoctorovRoutes, "function");

		const app = Fastify();
		await registerProdoctorovRoutes(app);

		// Проверяем, что зарегистрированы маршруты ПроДокторов и МедФлекс
		const routesSummary = app.printRoutes();
		assert.ok(routesSummary.includes("pricelist.xml"));
		assert.ok(routesSummary.includes("slots"));
		assert.ok(routesSummary.includes("webhook"));
		assert.ok(routesSummary.includes("prodoctorov"));
		assert.ok(routesSummary.includes("medflex"));
	});

	it("2. Layer 0: Словари и схемы валидации функционируют корректно", () => {
		assert.ok(ALLOWED_NOMENCLATURE_CATEGORIES.therapy);
		assert.ok(ALLOWED_NOMENCLATURE_CATEGORIES.prosthetics);
		assert.ok(ALLOWED_NOMENCLATURE_CATEGORIES.surgery);
		assert.ok(ALLOWED_NOMENCLATURE_CATEGORIES.hygiene);

		assert.equal(
			DENTAL_SPECIALTIES_RU.therapist,
			"Стоматолог-терапевт",
		);

		const validQuery = slotsQuerySchema.safeParse({
			startDate: "2026-10-10",
			endDate: "2026-10-24",
			durationMinutes: "45",
		});
		assert.ok(validQuery.success);
		assert.equal(validQuery.data.durationMinutes, 45);
		assert.equal(validQuery.data.sanpinDisinfectionMinutes, 10);

		const validPayload = webhookPayloadSchema.safeParse({
			event: "booking_created",
			bookingId: "PD-12345",
			patient: {
				fullName: "Иванов Иван Иванович",
				phone: "+79991234567",
			},
			startsAt: "2026-10-10T10:00:00Z",
		});
		assert.ok(validPayload.success);
		assert.equal(validPayload.data.bookingId, "PD-12345");
	});

	it("3. Layer 1: Валидация подписи HMAC-SHA256 работает корректно", () => {
		const secret = "test-secret-key-123";
		const payload = JSON.stringify({ event: "test_ping", id: "1" });

		const validSig = createHmac("sha256", secret)
			.update(payload)
			.digest("hex");

		assert.equal(
			verifyHmacSha256Signature(secret, payload, validSig),
			true,
		);
		assert.equal(
			verifyHmacSha256Signature(secret, payload, "sha256=" + validSig),
			true,
		);
		assert.equal(
			verifyHmacSha256Signature(secret, payload, "invalid-hex-signature"),
			false,
		);
		assert.equal(
			verifyHmacSha256Signature("wrong-secret", payload, validSig),
			false,
		);
	});

	it("4. Layer 1: Хелперы фильтрации прейскуранта 804н и escapeXml работают без регрессий", () => {
		assert.equal(escapeXml("<test & 'quote'>"), "&lt;test &amp; &apos;quote&apos;&gt;");

		// Технические расходники и лаборатория должны отсекаться
		assert.equal(
			isInternalTechnicalPosition({ code: "TECH_01", title: "Расходные материалы" }),
			true,
		);
		assert.equal(
			isInternalTechnicalPosition({ category: "therapy", code: "A16.07.002", title: "Лечение кариеса" }),
			false,
		);

		// Сопоставление категорий
		assert.equal(
			resolveAllowedCategory({ category: "therapy" }),
			"therapy",
		);
		assert.equal(
			resolveAllowedCategory({ category: "consultation", specialty: "surgeon" }),
			"surgery",
		);
		assert.equal(
			resolveAllowedCategory({ category: "other" }),
			null,
		);
	});
});
