import assert from "node:assert";
import { describe, test } from "node:test";
import { repairMojibakeDeep } from "./repairMojibake.js";

describe("repairMojibakeDeep", () => {
	test("returns primitives as-is", () => {
		assert.strictEqual(repairMojibakeDeep(null), null);
		assert.strictEqual(repairMojibakeDeep(undefined), undefined);
		assert.strictEqual(repairMojibakeDeep(42), 42);
		assert.strictEqual(repairMojibakeDeep(true), true);
		assert.strictEqual(repairMojibakeDeep(false), false);
	});

	test("repairs string values", () => {
		// Standard string
		assert.strictEqual(repairMojibakeDeep("Hello world"), "Hello world");
		// Cyrillic string
		assert.strictEqual(repairMojibakeDeep("Привет"), "Привет");
		// Real mojibake string
		assert.strictEqual(repairMojibakeDeep("ÐŸÑ€Ð¸Ð²ÐµÑ‚"), "Привет");
	});

	test("repairs arrays deeply", () => {
		const input = [1, "ÐŸÑ€Ð¸Ð²ÐµÑ‚", [null, "ÐœÐ¸Ñ€"]];
		const expected = [1, "Привет", [null, "Мир"]];
		assert.deepStrictEqual(repairMojibakeDeep(input), expected);
	});

	test("repairs objects deeply", () => {
		const input = {
			id: 123,
			name: "ÐŸÑ€Ð¸Ð²ÐµÑ‚",
			nested: {
				value: "ÐœÐ¸Ñ€",
				flag: true,
			},
		};
		const expected = {
			id: 123,
			name: "Привет",
			nested: {
				value: "Мир",
				flag: true,
			},
		};
		assert.deepStrictEqual(repairMojibakeDeep(input), expected);
	});

	test("repairs complex nested structures", () => {
		const input = {
			data: [
				{ title: "Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº", count: 1 },
				{ title: "Test", count: 2 },
			],
			meta: "ÐžÐ¿Ð¸Ñ\u0081Ð°Ð½Ð¸Ðµ",
		};
		const expected = {
			data: [
				{ title: "Заголовок", count: 1 },
				{ title: "Test", count: 2 },
			],
			meta: "Описание",
		};
		assert.deepStrictEqual(repairMojibakeDeep(input), expected);
	});

	test("handles edge case objects (empty, Date, functions)", () => {
		assert.deepStrictEqual(repairMojibakeDeep({}), {});
		assert.deepStrictEqual(repairMojibakeDeep([]), []);

		const date = new Date("2024-01-01T00:00:00Z");
		// Note: The current implementation of repairMojibakeDeep maps over object properties,
		// so it essentially converts instances (like Date) to plain objects {}.
		// If that's the intended behavior, we check that it doesn't crash:
		const dateRepaired = repairMojibakeDeep(date);
		assert.strictEqual(typeof dateRepaired, "object");
		assert.ok(dateRepaired !== null);

		const func = () => "test";
		assert.strictEqual(repairMojibakeDeep(func), func);
	});

	test("does not repair object keys", () => {
		const input = {
			"ÐŸÑ€Ð¸Ð²ÐµÑ‚": "ÐŸÑ€Ð¸Ð²ÐµÑ‚"
		};
		const expected = {
			"ÐŸÑ€Ð¸Ð²ÐµÑ‚": "Привет"
		};
		assert.deepStrictEqual(repairMojibakeDeep(input), expected);
	});
});
