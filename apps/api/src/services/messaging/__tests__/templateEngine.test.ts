/**
 * Template Engine Unit Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	formatMoney,
	interpolateVariables,
	TemplateEngine,
} from "../templateEngine.js";

describe("Template Engine Unit Tests", () => {
	it("formats money correctly in Russian locale", () => {
		const formatted1 = formatMoney(1500);
		assert.ok(formatted1.includes("1") && formatted1.includes("500"));

		const formatted2 = formatMoney(0);
		assert.ok(formatted2.includes("0"));
	});

	it("interpolates variables in template string", () => {
		const template = "Здравствуйте, {{patient_name}}! Ваш приём назначен на {{appointment_date}}.";
		const context = {
			patient_name: "Сергей Петров",
			appointment_date: "20.10.2026",
		};

		const result = interpolateVariables(template, context);
		assert.equal(result, "Здравствуйте, Сергей Петров! Ваш приём назначен на 20.10.2026.");
	});

	it("preserves missing variables for clarity", () => {
		const template = "Уважаемый {{patient_name}}, ваш врач {{doctor_name}}.";
		const result = interpolateVariables(template, { patient_name: "Ольга" });
		assert.equal(result, "Уважаемый Ольга, ваш врач {{doctor_name}}.");
	});

	it("renders built-in appointment_confirmation template across locales", () => {
		const engine = new TemplateEngine();
		const context = {
			patient_name: "Елена",
			clinic_name: "ДЕНТЕ",
			appointment_date: "12.11.2026",
			appointment_time: "10:00",
			doctor_name: "Д-р Смирнов",
			clinic_address: "ул. Ленина, 15",
			clinic_phone: "+7 (495) 123-45-67",
		};

		// Russian
		const ru = engine.render("appointment_confirmation", "ru", context);
		assert.ok(ru.subject.includes("ДЕНТЕ"));
		assert.ok(ru.bodyText.includes("Елена"));
		assert.ok(ru.bodyText.includes("12.11.2026"));
		assert.equal(ru.buttons?.length, 2);
		assert.equal(ru.buttons?.[0]?.id, "APPT_CONFIRM");

		// Spanish
		const es = engine.render("appointment_confirmation", "es", context);
		assert.ok(es.subject.includes("Confirmación"));
		assert.ok(es.bodyText.includes("¡Hola, Елена!"));
		assert.equal(es.buttons?.length, 2);
		assert.equal(es.buttons?.[0]?.id, "APPT_CONFIRM");

		// English
		const en = engine.render("appointment_confirmation", "en", context);
		assert.ok(en.subject.includes("confirmed"));
		assert.ok(en.bodyText.includes("Hello Елена!"));
	});

	it("renders invoice_payment_link template with formatted amount", () => {
		const engine = new TemplateEngine();
		const context = {
			patient_name: "Дмитрий",
			clinic_name: "ДЕНТЕ",
			invoice_number: "INV-2026-0042",
			total_amount: 14500,
			payment_url: "https://pay.dente.clinic/invoice/42",
		};

		const res = engine.render("invoice_payment_link", "ru", context);
		assert.ok(res.subject.includes("INV-2026-0042"));
		assert.ok(res.bodyText.includes("https://pay.dente.clinic/invoice/42"));
		assert.equal(res.buttons?.[0]?.id, "PAY_INVOICE");
	});

	it("renders post-op instructions and recall reminder templates", () => {
		const engine = new TemplateEngine();

		const postOp = engine.render("post_op_instructions", "ru", {
			patient_name: "Мария",
			clinic_name: "ДЕНТЕ",
			treatment_name: "Сложное удаление зуба 3.8",
			clinic_phone: "+7 (495) 999-88-77",
		});
		assert.ok(postOp.bodyText.includes("Сложное удаление зуба 3.8"));
		assert.ok(postOp.bodyText.includes("Не принимать пищу 2 часа"));

		const recall = engine.render("recall_reminder", "ru", {
			patient_name: "Артем",
			clinic_name: "ДЕНТЕ",
			reason: "Профгигиена полости рта",
			due_month: "Октябрь 2026",
			booking_url: "https://dente.clinic/book",
			clinic_phone: "+7 (495) 000-11-22",
		});
		assert.ok(recall.bodyText.includes("Профгигиена полости рта"));
		assert.ok(recall.bodyText.includes("Октябрь 2026"));
		assert.equal(recall.buttons?.[0]?.id, "BOOK_RECALL");
	});

	it("allows registering and rendering custom templates", () => {
		const engine = new TemplateEngine();
		engine.registerTemplate({
			templateKey: "holiday_special",
			description: "Праздничное поздравление",
			locales: {
				ru: {
					subject: "С Новым Годом от {{clinic_name}}!",
					bodyText: "Дорогой {{patient_name}}, поздравляем с праздником!",
				},
			},
		});

		const res = engine.render("holiday_special", "ru", {
			patient_name: "Игорь",
			clinic_name: "ДЕНТЕ",
		});
		assert.equal(res.subject, "С Новым Годом от ДЕНТЕ!");
		assert.equal(res.bodyText, "Дорогой Игорь, поздравляем с праздником!");
	});
});
