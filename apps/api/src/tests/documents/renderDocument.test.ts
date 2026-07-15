import assert from "node:assert";
import { describe, test } from "node:test";
import { documentHasUnresolvedPlaceholders } from "../../documents/renderDocument.js";

describe("documentHasUnresolvedPlaceholders", () => {
	test("returns false for empty string", () => {
		assert.strictEqual(documentHasUnresolvedPlaceholders(""), false);
	});

	test("returns false for html without placeholders", () => {
		assert.strictEqual(
			documentHasUnresolvedPlaceholders("<p>Hello world</p>"),
			false,
		);
	});

	test("returns true for html with only opening placeholder marker", () => {
		assert.strictEqual(
			documentHasUnresolvedPlaceholders("<p>Hello [[{world</p>"),
			true,
		);
	});

	test("returns true for html with only closing placeholder marker", () => {
		assert.strictEqual(
			documentHasUnresolvedPlaceholders("<p>Hello world}]]</p>"),
			true,
		);
	});

	test("returns true for html with full placeholder marker", () => {
		assert.strictEqual(
			documentHasUnresolvedPlaceholders("<p>Hello [[{name}]]</p>"),
			true,
		);
	});

	test("returns true for html with separated placeholder markers", () => {
		assert.strictEqual(
			documentHasUnresolvedPlaceholders("<p>[[{</p> <p>}]]</p>"),
			true,
		);
	});
});
