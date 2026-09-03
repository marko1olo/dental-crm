import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerDocumentTemplateRoutes } from "./documentTemplates.js";

test("Document templates Fastify API routes suite", async (t) => {
	const app = Fastify({ logger: false });
	await registerDocumentTemplateRoutes(app);

	await t.test("GET /api/document-templates/variables returns all 74+ substitution variables", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/document-templates/variables",
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.ok, true);
		assert.ok(json.totalCount >= 74, `Expected >= 74 tokens, got ${json.totalCount}`);
		assert.ok(Array.isArray(json.domains), "Domains must be an array");
		assert.ok(json.domains.length >= 7, "Must contain at least 7 domains");

		// Проверка ключевых токенов
		const tokenNames = json.variables.map((v: { token: string }) => v.token);
		assert.ok(tokenNames.includes("Пациент.ФИО"), "Must include Пациент.ФИО");
		assert.ok(tokenNames.includes("Пациент.Паспорт.СерияНомер"), "Must include Пациент.Паспорт.СерияНомер");
		assert.ok(tokenNames.includes("Клиника.Название"), "Must include Клиника.Название");
		assert.ok(tokenNames.includes("АктивныйВрач.ФИО"), "Must include АктивныйВрач.ФИО");
		assert.ok(tokenNames.includes("Представитель.ФИО"), "Must include Представитель.ФИО");
	});

	await t.test("GET /api/document-templates returns catalog grouped by 10 Ministry of Health categories", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/document-templates",
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.ok, true);
		assert.equal(json.categories.length, 10, "Must contain exactly 10 official categories");

		// Проверка 10 категорий
		const catNames = json.categories.map((c: { name: string }) => c.name);
		assert.ok(catNames.includes("Общее"));
		assert.ok(catNames.includes("Терапия"));
		assert.ok(catNames.includes("Ортопедия"));
		assert.ok(catNames.includes("Хирургия"));
		assert.ok(catNames.includes("Имплантология"));
		assert.ok(catNames.includes("Ортодонтия"));
		assert.ok(catNames.includes("Пародонтология"));
		assert.ok(catNames.includes("Детская"));
		assert.ok(catNames.includes("Гигиена"));
		assert.ok(catNames.includes("Архив"));

		assert.equal(json.totalCount, 49, "Must contain all 49 seeded templates");
	});

	await t.test("GET /api/document-templates/:id returns specific template with full metadata", async () => {
		// Запрос по stomxId = 1 (Акт выполненных работ)
		const res1 = await app.inject({
			method: "GET",
			url: "/api/document-templates/1",
		});
		assert.equal(res1.statusCode, 200);
		const json1 = res1.json();
		assert.equal(json1.ok, true);
		assert.equal(json1.template.stomxId, 1);
		assert.equal(json1.template.systemAlias, "invoice-act");
		assert.ok(json1.template.contentHtml.includes("АКТ ВЫПОЛНЕННЫХ МЕДИЦИНСКИХ РАБОТ"));

		// Запрос по systemAlias
		const resAlias = await app.inject({
			method: "GET",
			url: "/api/document-templates/ids_implant",
		});
		assert.equal(resAlias.statusCode, 200);
		const jsonAlias = resAlias.json();
		assert.equal(jsonAlias.ok, true);
		assert.equal(jsonAlias.template.stomxId, 60);
		assert.ok(jsonAlias.template.name.includes("Имплант"));
		assert.ok(jsonAlias.template.contentHtml.includes("ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ"));

		// Несуществующий шаблон
		const res404 = await app.inject({
			method: "GET",
			url: "/api/document-templates/non_existing_random_xyz_9999",
		});
		assert.equal(res404.statusCode, 404);
	});

	await t.test("POST /api/document-templates/:id/render substitutes tokens with real patient/clinic context", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/document-templates/ids_implant/render",
			payload: {
				representative: {
					fullName: "Смирнова Елена Сергеевна",
					relationType: "мать",
					phone: "+7 (916) 111-22-33",
					basis: "Свидетельство о рождении",
				},
				overrides: {
					patient: {
						fullName: "Смирнов Артем Андреевич",
						phone: "+7 (999) 777-66-55",
						birthDate: "2010-05-14",
						address: "г. Москва, ул. Академика Королева, д. 12",
					},
					clinic: {
						name: 'ООО "Денте Инновации"',
						address: "г. Москва, пр-т Вернадского, д. 29",
						phone: "+7 (495) 777-88-99",
						licenseNumber: "ЛО-77-01-998877",
					},
					doctor: {
						fullName: "Григорьев Максим Юрьевич",
						position: "Врач-стоматолог хирург-имплантолог",
					},
				},
			},
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.ok, true);
		assert.ok(json.renderedHtml, "renderedHtml must be present");

		// Проверка подстановки токенов
		assert.ok(json.renderedHtml.includes("Смирнов Артем Андреевич"), "Must render patient name");
		assert.ok(json.renderedHtml.includes('ООО "Денте Инновации"'), "Must render clinic name");
		assert.ok(json.renderedHtml.includes("Григорьев Максим Юрьевич"), "Must render doctor name");
		assert.ok(json.renderedHtml.includes("Смирнова Елена Сергеевна"), "Must render representative name");

		// Проверка на отсутствие артефактов
		assert.ok(!json.renderedHtml.includes("{{"), "No unrendered {{ token }} must remain");
		assert.ok(!json.renderedHtml.includes("[object Object]"), "No [object Object] leaks");
		assert.ok(!json.renderedHtml.includes("NaN"), "No NaN in rendered output");
	});
});
