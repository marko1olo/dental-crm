import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	channelBodyLimits,
	checkChannelFit,
	communicationTemplateVariables,
	describeSmsPayload,
	extractTemplateVariables,
	findTemplateVariable,
	renderTemplate,
	validateTemplateBody,
} from "./templateRenderer.js";

describe("findTemplateVariable", () => {
	test("finds template variable", () => {
		assert.ok(findTemplateVariable("patient"));
		assert.equal(findTemplateVariable("non_existent_var"), null);
	});
});

describe("communicationTemplateVariables", () => {
	test("every variable in dictionary has non-empty label and example", () => {
		for (const variable of communicationTemplateVariables) {
			assert.ok(
				variable.label.trim().length > 0,
				`missing label for ${variable.key}`,
			);
			assert.ok(
				variable.example.trim().length > 0,
				`missing example for ${variable.key}`,
			);
		}
		const keys = communicationTemplateVariables.map((variable) => variable.key);
		assert.equal(
			new Set(keys).size,
			keys.length,
			"variable keys must be unique",
		);
	});
});

describe("templateRenderer", () => {
	describe("extractTemplateVariables", () => {
		test("extracts unique variables in order without duplicates", () => {
			assert.deepEqual(
				extractTemplateVariables(
					"{patient}, приём {date} в {time}. До встречи, {patient}!",
				),
				["patient", "date", "time"],
			);
			assert.deepEqual(
				extractTemplateVariables("Hello {patient}, {date} {date}"),
				["patient", "date"],
			);
		});

		test("handles text without variables", () => {
			assert.deepEqual(extractTemplateVariables("Hello world"), []);
			assert.deepEqual(extractTemplateVariables("текст без переменных"), []);
		});

		test("ignores literal brackets and double braces", () => {
			assert.deepEqual(
				extractTemplateVariables("Hello {{world}} {patient}"),
				["patient"],
			);
			assert.deepEqual(
				extractTemplateVariables("скидка {{ спецпредложение }}"),
				[],
			);
		});
	});

	describe("validateTemplateBody", () => {
		test("validates a good template", () => {
			const result = validateTemplateBody(
				"Hello {patient}, appointment at {date}",
			);
			assert.equal(result.ok, true);
			assert.deepEqual(result.variables, ["patient", "date"]);
			assert.deepEqual(result.unknownVariables, []);
			assert.deepEqual(result.phiVariables, []);
			assert.deepEqual(result.problems, []);
		});

		test("fails on empty template", () => {
			const result = validateTemplateBody("   ");
			assert.equal(result.ok, false);
			assert.ok(result.problems.includes("Текст шаблона пуст."));
		});

		test("identifies unknown variables", () => {
			const result = validateTemplateBody(
				"Hello {patient}, your {unknown_thing} is ready.",
			);
			assert.equal(result.ok, false);
			assert.deepEqual(result.unknownVariables, ["unknown_thing"]);
			assert.ok(result.problems.some((p) => p.includes("Неизвестные переменные")));

			const typo = validateTemplateBody("Здравствуйте, {pacient}.");
			assert.equal(typo.ok, false);
			assert.deepEqual(typo.unknownVariables, ["pacient"]);
		});

		test("handles PHI variables without consent", () => {
			const result = validateTemplateBody("Diagnosis: {diagnosis}");
			assert.equal(result.ok, false);
			assert.deepEqual(result.phiVariables, ["diagnosis"]);
			assert.ok(
				result.problems.some((p) =>
					p.includes("Медицинские сведения в канале без согласия"),
				),
			);

			const dental = validateTemplateBody(
				"Напоминаем о процедуре {procedure}, зуб {tooth}.",
			);
			assert.equal(dental.ok, false);
			assert.deepEqual(dental.phiVariables, ["procedure", "tooth"]);
		});

		test("allows PHI variables with consent", () => {
			const result = validateTemplateBody("Diagnosis: {diagnosis}", {
				allowPhi: true,
			});
			assert.equal(result.ok, true);
			assert.deepEqual(result.phiVariables, ["diagnosis"]);
			assert.deepEqual(result.problems, []);

			const allowed = validateTemplateBody(
				"Напоминаем о процедуре {procedure}.",
				{ allowPhi: true },
			);
			assert.equal(allowed.ok, true);
			assert.deepEqual(allowed.phiVariables, ["procedure"]);
		});
	});

	describe("renderTemplate", () => {
		test("renders simple template successfully", () => {
			const result = renderTemplate("Hello, {patient}!", { patient: "Alice" });
			assert.deepEqual(result, {
				ok: true,
				text: "Hello, Alice!",
				usedVariables: ["patient"],
			});
		});

		test("renders dates, times and clinical parameters", () => {
			const result = renderTemplate(
				"Здравствуйте, {patient}! Ваш приём назначен на {date} в {time} к доктору {doctor}.",
				{
					patient: "Марина Петровна",
					date: "12 августа",
					time: "14:30",
					doctor: "Иванов И. И.",
				},
			);
			assert.equal(result.ok, true);
			if (result.ok) {
				assert.equal(
					result.text,
					"Здравствуйте, Марина Петровна! Ваш приём назначен на 12 августа в 14:30 к доктору Иванов И. И..",
				);
				assert.deepEqual(result.usedVariables, [
					"patient",
					"date",
					"time",
					"doctor",
				]);
			}
		});

		test("preserves line breaks correctly", () => {
			const result = renderTemplate("Hello,\n{patient}!", {
				patient: "Alice",
			});
			assert.deepEqual(result, {
				ok: true,
				text: "Hello,\nAlice!",
				usedVariables: ["patient"],
			});
		});

		test("strips control characters and compacts newlines", () => {
			const result = renderTemplate("Hello,\n\n\n\n{patient}!\x00", {
				patient: "Alice",
			});
			assert.deepEqual(result, {
				ok: true,
				text: "Hello,\n\nAlice!",
				usedVariables: ["patient"],
			});

			const withBell = `Строка${String.fromCharCode(7)}один\n\n\n\nСтрока два`;
			const bellResult = renderTemplate(withBell, {});
			assert.equal(bellResult.ok, true);
			if (bellResult.ok) {
				assert.equal(bellResult.text, "Строкаодин\n\nСтрока два");
			}
		});

		test("fails if variables are missing", () => {
			const result = renderTemplate("Hello, {patient} on {date}!", {
				patient: "Alice",
			});
			assert.equal(result.ok, false);
			if (!result.ok) {
				assert.deepEqual(result.missingVariables, ["date"]);
				assert.ok(
					result.problems.some((p) =>
						p.includes("Нет значений для переменных: {date}"),
					),
				);
			}

			const patientRemaining = renderTemplate("{patient}, остаток {amount}.", {
				patient: "Марина",
			});
			assert.equal(patientRemaining.ok, false);
			if (!patientRemaining.ok) {
				assert.deepEqual(patientRemaining.missingVariables, ["amount"]);
			}
		});

		test("fails if values are empty or nullish", () => {
			const spaces = renderTemplate("Hello, {patient}!", { patient: "   " });
			assert.equal(spaces.ok, false);
			if (!spaces.ok) {
				assert.deepEqual(spaces.missingVariables, ["patient"]);
			}

			const empty = renderTemplate("Здравствуйте, {patient}.", { patient: "" });
			assert.equal(empty.ok, false);
			if (!empty.ok) {
				assert.deepEqual(empty.missingVariables, ["patient"]);
			}

			const nullish = renderTemplate("Hello, {patient}!", { patient: null });
			assert.equal(nullish.ok, false);
			if (!nullish.ok) {
				assert.deepEqual(nullish.missingVariables, ["patient"]);
			}
		});

		test("treats zero as a valid value and not empty", () => {
			const result = renderTemplate("Остаток: {balance} ₽.", { balance: 0 });
			assert.equal(result.ok, true);
			if (result.ok) {
				assert.equal(result.text, "Остаток: 0 ₽.");
			}
		});

		test("allows empty values when configured (preview mode)", () => {
			const result = renderTemplate(
				"Hello, {patient}!",
				{ patient: "   " },
				{ allowEmptyValues: true },
			);
			assert.equal(result.ok, true);
			if (result.ok) {
				assert.equal(result.text, "Hello, Марина Петровна!");
			}

			const previewAll = renderTemplate(
				"{patient}, приём {date} в {time}.",
				{},
				{ allowEmptyValues: true },
			);
			assert.equal(previewAll.ok, true);
			if (previewAll.ok) {
				assert.equal(previewAll.text.includes("{"), false);
			}
		});

		test("handles unknown variable in preview mode correctly", () => {
			const result = renderTemplate(
				"Hello, {unknown}!",
				{},
				{ allowEmptyValues: true },
			);
			assert.equal(result.ok, false);
			if (!result.ok) {
				assert.deepEqual(result.unknownVariables, ["unknown"]);
			}
		});

		test("handles literal brackets correctly", () => {
			const result = renderTemplate("Hello {{world}}, {patient}!", {
				patient: "Alice",
			});
			assert.deepEqual(result, {
				ok: true,
				text: "Hello {world}, Alice!",
				usedVariables: ["patient"],
			});

			const formula = renderTemplate("Формула {{2.6}} — {patient}", {
				patient: "Марина",
			});
			assert.equal(formula.ok, true);
			if (formula.ok) {
				assert.equal(formula.text, "Формула {2.6} — Марина");
			}
		});

		test("fails on empty output after rendering", () => {
			const result = renderTemplate("\x00\n \t", { patient: "Alice" });
			assert.equal(result.ok, false);
			if (!result.ok) {
				assert.deepEqual(result.problems, [
					"После подстановки текст оказался пустым.",
				]);
			}
		});

		test("handles non-finite number as empty value", () => {
			const result = renderTemplate("Hello {amount}", { amount: Number.NaN });
			assert.equal(result.ok, false);
		});

		test("stringifies valid numbers", () => {
			const result = renderTemplate("Amount: {amount}", { amount: 100 });
			assert.equal(result.ok, true);
			if (result.ok) assert.equal(result.text, "Amount: 100");
		});
	});

	describe("describeSmsPayload", () => {
		test("calculates GSM7 correctly", () => {
			const result = describeSmsPayload("Hello world");
			assert.deepEqual(result, {
				encoding: "gsm7",
				characters: 11,
				segments: 1,
				charactersLeftInSegment: 149,
			});
		});

		test("calculates extended GSM7 correctly", () => {
			const result = describeSmsPayload("Hello [world]"); // [ and ] are extended
			assert.deepEqual(result, {
				encoding: "gsm7",
				characters: 15, // 11 + 2*2 for extended
				segments: 1,
				charactersLeftInSegment: 145,
			});
			assert.equal(describeSmsPayload("[").characters, 2);
			assert.equal(describeSmsPayload("a").characters, 1);
		});

		test("calculates UCS2 correctly (cyrillic)", () => {
			const result = describeSmsPayload("Привет мир");
			assert.deepEqual(result, {
				encoding: "ucs2",
				characters: 10,
				segments: 1,
				charactersLeftInSegment: 60,
			});
		});

		test("calculates cyrillic segment boundaries (70 vs 71)", () => {
			const seventy = "я".repeat(70);
			const first = describeSmsPayload(seventy);
			assert.equal(first.encoding, "ucs2");
			assert.equal(first.segments, 1);
			assert.equal(first.charactersLeftInSegment, 0);

			const seventyOne = describeSmsPayload("я".repeat(71));
			assert.equal(seventyOne.encoding, "ucs2");
			assert.equal(seventyOne.segments, 2);
		});

		test("calculates latin segment boundaries (160 vs 161)", () => {
			const single = describeSmsPayload("a".repeat(160));
			assert.equal(single.encoding, "gsm7");
			assert.equal(single.segments, 1);

			const multipart = describeSmsPayload("a".repeat(161));
			assert.equal(multipart.encoding, "gsm7");
			assert.equal(multipart.segments, 2);
		});

		test("single cyrillic character switches entire payload to UCS2", () => {
			const mixed = describeSmsPayload(`${"a".repeat(100)}ё`);
			assert.equal(mixed.encoding, "ucs2");
			assert.ok(mixed.segments > 1);
		});

		test("calculates multi-segment GSM7 correctly", () => {
			const text = "A".repeat(161);
			const result = describeSmsPayload(text);
			assert.deepEqual(result, {
				encoding: "gsm7",
				characters: 161,
				segments: 2,
				charactersLeftInSegment: 145, // 153*2 - 161
			});
		});

		test("calculates multi-segment UCS2 correctly", () => {
			const text = "А".repeat(71);
			const result = describeSmsPayload(text);
			assert.deepEqual(result, {
				encoding: "ucs2",
				characters: 71,
				segments: 2,
				charactersLeftInSegment: 63, // 67*2 - 71
			});
		});

		test("calculates emoji correctly in UCS2", () => {
			const result = describeSmsPayload("Hello 🚀"); // 🚀 takes 2 units in UTF-16
			assert.deepEqual(result, {
				encoding: "ucs2",
				characters: 8, // Hello (5) + space (1) + rocket (2)
				segments: 1,
				charactersLeftInSegment: 62,
			});
		});

		test("handles empty string correctly", () => {
			const result = describeSmsPayload("");
			assert.deepEqual(result, {
				encoding: "gsm7",
				characters: 0,
				segments: 1,
				charactersLeftInSegment: 160,
			});
		});
	});

	describe("checkChannelFit", () => {
		test("passes valid SMS", () => {
			const result = checkChannelFit("sms", "Hello world");
			assert.equal(result.ok, true);
			assert.equal(result.limit, 1000);
			assert.ok(result.sms);
			assert.equal(result.sms?.segments, 1);

			const shortCyrillic = checkChannelFit(
				"sms",
				"Приём завтра в 14:30. Клиника на Ленина.",
			);
			assert.equal(shortCyrillic.ok, true);
			assert.equal(shortCyrillic.sms?.segments, 1);
		});

		test("fails SMS over max segments", () => {
			const text = "A".repeat(153 * 5); // 5 segments
			const result = checkChannelFit("sms", text, { maxSmsSegments: 4 });
			assert.equal(result.ok, false);
			assert.ok(
				result.problems.some((p) =>
					p.includes("SMS разобьётся на 5 сегмент(ов) при пределе 4"),
				),
			);

			const longCyrillic = checkChannelFit("sms", "я".repeat(400));
			assert.equal(longCyrillic.ok, false);
			assert.equal(longCyrillic.sms?.encoding, "ucs2");
			assert.ok(longCyrillic.sms !== null && longCyrillic.sms.segments > 4);
		});

		test("fails text over channel limit", () => {
			const text = "A".repeat(1001);
			const result = checkChannelFit("sms", text);
			assert.equal(result.ok, false);
			assert.ok(
				result.problems.some((p) =>
					p.includes("Текст длиннее предела канала: 1001 из 1000 символов"),
				),
			);
		});

		test("rejects text exceeding specific channel limits without truncation", () => {
			const limit = channelBodyLimits.telegram ?? 4096;
			const result = checkChannelFit("telegram", "я".repeat(limit + 1));
			assert.equal(result.ok, false);
			assert.equal(result.length, limit + 1);
		});

		test("works for non-SMS channel", () => {
			const result = checkChannelFit("whatsapp", "Hello world");
			assert.equal(result.ok, true);
			assert.equal(result.sms, null);
		});

		test("falls back to default limit for unknown channel", () => {
			const text = "A".repeat(4097);
			const result = checkChannelFit("unknown_channel", text);
			assert.equal(result.ok, false);
			assert.equal(result.limit, 4096);
		});
	});
});
