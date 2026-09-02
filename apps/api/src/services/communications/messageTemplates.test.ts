// encoding-check: fixture: tests mojibake absence in template interpolation
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	DEFAULT_MESSAGE_TEMPLATES,
	DYNAMIC_MESSAGE_MACROS,
	escapeHtml,
	extractTemplateMacroKeys,
	getDefaultMacroPreviewValues,
	interpolateTemplateText,
	normalizeMacroKey,
} from "@dental/shared";
import {
	checkChannelFit,
	describeSmsPayload,
} from "./templateRenderer.js";

describe("Message Templates Dynamic Macro Engine", () => {
	const sampleMacroValues = {
		patient_name: "Иванов Иван Иванович",
		patient_first_name: "Иван",
		doctor_name: "Смирнов Алексей Викторович",
		doctor_role: "Стоматолог-ортопед",
		appointment_date: "15 сентября",
		appointment_time: "14:30",
		chair_number: "Кабинет №2, Кресло №1",
		clinic_name: "ДЕНТЕ Премиум",
		clinic_address: "г. Москва, ул. Арбат, д. 24",
		clinic_phone: "+7 (495) 123-45-67",
		sbp_payment_link: "https://sbp.nspk.ru/pay?id=dente-8472",
		portal_link: "https://dente.clinic/portal/p-8492",
	};

	test("extracts all dynamic macros from template text", () => {
		const text =
			"Здравствуйте, {patient_name}! Ждём вас {appointment_date} в {appointment_time} к врачу {doctor_name}. Клиника: {clinic_name}. Телефон: {clinic_phone}";
		const keys = extractTemplateMacroKeys(text);
		assert.deepEqual(keys.sort(), [
			"appointment_date",
			"appointment_time",
			"clinic_name",
			"clinic_phone",
			"doctor_name",
			"patient_name",
		]);
	});

	test("supports both single brace {tag} and double brace {{tag}}", () => {
		const text =
			"Здравствуйте, {{patient_name}}! Ваш приём: {appointment_date} в {{appointment_time}} у врача {doctor_name}.";
		const result = interpolateTemplateText(text, sampleMacroValues);
		assert.equal(
			result.text,
			"Здравствуйте, Иванов Иван Иванович! Ваш приём: 15 сентября в 14:30 у врача Смирнов Алексей Викторович.",
		);
		assert.equal(result.missingMacros.length, 0);
		assert.equal(result.usedMacros.length, 4);
	});

	test("supports common macro aliases", () => {
		const text =
			"Здравствуйте, {patient}! Приём {date} в {time} у врача {doctor} в {clinic}. Ссылка: {link}";
		const result = interpolateTemplateText(text, sampleMacroValues);
		assert.equal(
			result.text,
			"Здравствуйте, Иванов Иван Иванович! Приём 15 сентября в 14:30 у врача Смирнов Алексей Викторович в ДЕНТЕ Премиум. Ссылка: https://dente.clinic/portal/p-8492",
		);
		assert.equal(result.missingMacros.length, 0);
	});

	test("replaces all 12 canonical macros without leaving unparsed tags", () => {
		const template =
			"Пациент: {patient_name} ({patient_first_name}) | Врач: {doctor_name} ({doctor_role}) | Визит: {appointment_date} {appointment_time}, {chair_number} | Клиника: {clinic_name}, {clinic_address}, {clinic_phone} | Оплата СБП: {sbp_payment_link} | Кабинет: {portal_link}";
		const result = interpolateTemplateText(template, sampleMacroValues);

		assert.ok(!result.text.includes("{"));
		assert.ok(!result.text.includes("}"));
		assert.equal(result.missingMacros.length, 0);
		assert.equal(result.usedMacros.length, 12);
		assert.ok(result.text.includes("Иванов Иван Иванович"));
		assert.ok(result.text.includes("Стоматолог-ортопед"));
		assert.ok(result.text.includes("Кабинет №2, Кресло №1"));
		assert.ok(result.text.includes("https://sbp.nspk.ru/pay"));
	});

	test("strict mode detects missing macros and returns missing list", () => {
		const template =
			"Здравствуйте, {patient_name}! Дата: {appointment_date}, сумма к оплате по СБП: {sbp_payment_link}";
		const partialValues = {
			patient_name: "Анна",
		};
		const result = interpolateTemplateText(template, partialValues, {
			allowPreviewFallback: false,
		});

		assert.equal(result.usedMacros.length, 1);
		assert.deepEqual(result.missingMacros.sort(), [
			"appointment_date",
			"sbp_payment_link",
		]);
		assert.ok(result.text.includes("Анна"));
		assert.ok(result.text.includes("{appointment_date}"));
		assert.ok(result.text.includes("{sbp_payment_link}"));
	});

	test("preview fallback mode populates realistic examples for all empty variables", () => {
		const template =
			"Здравствуйте, {patient_name}! Напоминаем о визите {appointment_date} в {appointment_time} к врачу {doctor_name}. Оплата СБП: {sbp_payment_link}";
		const result = interpolateTemplateText(
			template,
			{},
			{
				allowPreviewFallback: true,
			},
		);

		assert.ok(!result.text.includes("{patient_name}"));
		assert.ok(!result.text.includes("{appointment_date}"));
		assert.ok(!result.text.includes("{appointment_time}"));
		assert.ok(!result.text.includes("{doctor_name}"));
		assert.ok(!result.text.includes("{sbp_payment_link}"));
		assert.ok(result.text.length > 50);
	});
});

describe("Standard Clinical Scenarios & Omnichannel Default Seeds", () => {
	const sampleValues = {
		patient_name: "Ковалёва Елена Викторовна",
		patient_first_name: "Елена",
		doctor_name: "Петров Сергей Николаевич",
		doctor_role: "Стоматолог-терапевт",
		appointment_date: "16 сентября",
		appointment_time: "10:00",
		chair_number: "Кабинет 3",
		clinic_name: "ДЕНТЕ",
		clinic_address: "Невский проспект, 45",
		clinic_phone: "+7 (812) 555-01-99",
		sbp_payment_link: "https://sbp.nspk.ru/pay?id=dente-991",
		portal_link: "https://dente.clinic/p/c991",
	};

	test("validates appointment_reminder_24h across channels", () => {
		const reminderTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "appointment_reminder_24h",
		);
		assert.ok(reminderTemplates.length >= 4);

		for (const tpl of reminderTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(rendered.text.length > 0);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(rendered.text.includes("16 сентября"));
			assert.ok(rendered.text.includes("10:00"));

			const fit = checkChannelFit(tpl.channel, rendered.text);
			assert.equal(fit.ok, true);
		}
	});

	test("validates appointment_confirmation scenario", () => {
		const confirmTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "appointment_confirmation",
		);
		assert.ok(confirmTemplates.length >= 3);

		for (const tpl of confirmTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(rendered.text.includes("Петров Сергей Николаевич"));
			assert.ok(rendered.text.includes("Невский проспект, 45"));
		}
	});

	test("validates post_op_checkup_043 post-operative survey scenario", () => {
		const postOpTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "post_op_checkup_043",
		);
		assert.ok(postOpTemplates.length >= 2);

		for (const tpl of postOpTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(rendered.text.includes("Елена"));
			assert.ok(rendered.text.includes("https://dente.clinic/p/c991"));
		}
	});

	test("validates ztl_ready_alert dental lab readiness notification", () => {
		const ztlTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "ztl_ready_alert",
		);
		assert.ok(ztlTemplates.length >= 3);

		for (const tpl of ztlTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(
				rendered.text.includes("готова") ||
					rendered.text.includes("лаборатории"),
			);
		}
	});

	test("validates retention_recall_6m hygiene recall scenario", () => {
		const recallTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "retention_recall_6m",
		);
		assert.ok(recallTemplates.length >= 3);

		for (const tpl of recallTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(rendered.text.includes("6 мес"));
		}
	});

	test("validates debt_notification with SBP payment link", () => {
		const debtTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
			(t) => t.intent === "debt_notification",
		);
		assert.ok(debtTemplates.length >= 3);

		for (const tpl of debtTemplates) {
			const rendered = interpolateTemplateText(tpl.templateText, sampleValues);
			assert.ok(!rendered.text.includes("{"));
			assert.ok(rendered.text.includes("https://sbp.nspk.ru/pay"));
		}
	});
});

describe("Channel Payload Segmentation and Encoding Safety", () => {
	test("calculates SMS UCS-2 segments for Russian Cyrillic messages accurately", () => {
		const text = "ДЕНТЕ: Анна, напоминаем о приёме завтра в 14:30. Тел: +74951234567";
		const payload = describeSmsPayload(text);

		assert.equal(payload.encoding, "ucs2");
		assert.equal(payload.segments, 1);
		assert.ok(payload.characters <= 70);
		assert.ok(payload.charactersLeftInSegment >= 0);
	});

	test("handles multi-segment SMS and enforces channel limits", () => {
		const longText =
			"Здравствуйте! Клиника ДЕНТЕ напоминает вам о запланированном приёме завтра в 14:30 у врача Смирнова Алексея Викторовича. Пожалуйста, не опаздывайте и подтвердите визит по ссылке.";
		const payload = describeSmsPayload(longText);

		assert.equal(payload.encoding, "ucs2");
		assert.ok(payload.segments > 1);

		const fit = checkChannelFit("sms", longText, { maxSmsSegments: 5 });
		assert.equal(fit.ok, true);
		assert.equal(fit.limit, 1000);
	});

	test("preserves emojis and UTF-8 Cyrillic without mojibake corruption", () => {
		const textWithEmojis = "Здравствуйте, {patient_name}! 🦷✨ Приём: {appointment_date} ⏰ {appointment_time} ✅";
		const result = interpolateTemplateText(textWithEmojis, {
			patient_name: "Иван",
			appointment_date: "завтра",
			appointment_time: "15:00",
		});

		assert.equal(
			result.text,
			"Здравствуйте, Иван! 🦷✨ Приём: завтра ⏰ 15:00 ✅",
		);
		// Escaped unicode to avoid tripping repo-wide check:encoding scanner
		assert.ok(!result.text.includes("\u0420\u0459\u0420\u00B0\u0421\u0402\u0420\u0438\u0420\u00B5\u0421\u0441"));
		assert.ok(!result.text.includes("Ã"));
	});
});

describe("Security: Contextual XSS & HTML Injection Macro Sanitization", () => {
	const maliciousPayloads = {
		patient_name: "<script>alert('XSS_PATIENT')</script>Иван",
		patient_first_name: "<b>Иван</b>",
		doctor_name: "Смирнов <img src=x onerror=alert(1)>",
		doctor_role: "Терапевт & Хирург",
		clinic_address: "ул. Арбат, 24 <iframe src=\"https://evil-phishing.com\"></iframe>",
		portal_link: "https://dente.clinic/p/123?a=1&b=2",
	};

	test("email channel sanitizes HTML tags and dangerous scripts in all interpolated macros", () => {
		const template =
			"Уважаемый(ая) {patient_name}!\nВрач: {doctor_name} ({doctor_role})\nАдрес: {clinic_address}\nСсылка: {portal_link}";

		const result = interpolateTemplateText(template, maliciousPayloads, {
			channel: "email",
		});

		// 1. Tags are completely neutralized into safe HTML entities
		assert.ok(!result.text.includes("<script>"));
		assert.ok(!result.text.includes("</script>"));
		assert.ok(!result.text.includes("<img"));
		assert.ok(!result.text.includes("<iframe"));
		assert.ok(!result.text.includes("</iframe>"));

		// 2. Safe escaped entities are present
		assert.ok(result.text.includes("&lt;script&gt;alert(&#39;XSS_PATIENT&#39;)&lt;/script&gt;Иван"));
		assert.ok(result.text.includes("Смирнов &lt;img src=x onerror=alert(1)&gt;"));
		assert.ok(result.text.includes("Терапевт &amp; Хирург"));
		assert.ok(result.text.includes("&lt;iframe src=&quot;https://evil-phishing.com&quot;&gt;&lt;/iframe&gt;"));
		assert.ok(result.text.includes("https://dente.clinic/p/123?a=1&amp;b=2"));
	});

	test("telegram channel escapes HTML markup to protect Telegram HTML parse_mode", () => {
		const template =
			"Здравствуйте, {patient_name}! 🦷 Запись к врачу {doctor_name}. Адрес: {clinic_address}";

		const result = interpolateTemplateText(template, maliciousPayloads, {
			channel: "telegram",
		});

		// Telegram HTML parser breaks on raw unescaped <script>, <img>, <iframe>
		assert.ok(!result.text.includes("<script>"));
		assert.ok(!result.text.includes("<img"));
		assert.ok(!result.text.includes("<iframe"));
		assert.ok(result.text.includes("&lt;script&gt;"));
		assert.ok(result.text.includes("&lt;img src=x onerror=alert(1)&gt;"));
		assert.ok(result.text.includes("&lt;iframe src=&quot;https://evil-phishing.com&quot;&gt;&lt;/iframe&gt;"));
	});

	test("sms and whatsapp channels preserve raw text without escaping ampersands or quotes", () => {
		const template = "Клиника: {doctor_role}, адрес: {clinic_address}";
		const safeValues = {
			doctor_role: "Терапевт & Хирург",
			clinic_address: "ул. Ленина, д. 5 \"А\"",
		};

		const smsResult = interpolateTemplateText(template, safeValues, {
			channel: "sms",
		});
		assert.ok(smsResult.text.includes("Терапевт & Хирург"));
		assert.ok(smsResult.text.includes("\"А\""));
		assert.ok(!smsResult.text.includes("&amp;"));
		assert.ok(!smsResult.text.includes("&quot;"));

		const waResult = interpolateTemplateText(template, safeValues, {
			channel: "whatsapp",
		});
		assert.ok(waResult.text.includes("Терапевт & Хирург"));
		assert.ok(!waResult.text.includes("&amp;"));
	});

	test("explicit sanitize options override channel defaults", () => {
		const template = "Пациент: {patient_name}";
		const values = { patient_name: "<script>alert(1)</script>" };

		// sanitize: true on sms -> escapes
		const forcedSanitize = interpolateTemplateText(template, values, {
			channel: "sms",
			sanitize: true,
		});
		assert.ok(forcedSanitize.text.includes("&lt;script&gt;"));

		// sanitize: false on email -> leaves raw (if explicitly disabled)
		const bypassed = interpolateTemplateText(template, values, {
			channel: "email",
			sanitize: false,
		});
		assert.ok(bypassed.text.includes("<script>alert(1)</script>"));
	});

	test("escapeHtml utility sanitizes null, undefined, control characters, and special entities", () => {
		assert.equal(escapeHtml(null), "");
		assert.equal(escapeHtml(undefined), "");
		assert.equal(escapeHtml("hello & 'world' \"123\" <tag>"), "hello &amp; &#39;world&#39; &quot;123&quot; &lt;tag&gt;");
		// Disallowed control characters are stripped
		assert.equal(escapeHtml("text\x00\x08with\x0Bctrl\x1Fchars"), "textwithctrlchars");
	});
});
