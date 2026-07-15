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
		// Mojibake string
		assert.strictEqual(repairMojibakeDeep("Привет"), "Привет");
	});

	test("repairs arrays deeply", () => {
		const input = [1, "Привет", [null, "Мир"]];
		const expected = [1, "Привет", [null, "Мир"]];
		assert.deepStrictEqual(repairMojibakeDeep(input), expected);
	});

	test("repairs objects deeply", () => {
		const input = {
			id: 123,
			name: "Привет",
			nested: {
				value: "Мир",
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
				{ title: "Заголовок", count: 1 },
				{ title: "Test", count: 2 },
			],
			meta: "Описание",
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
});
