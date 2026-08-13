import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { escapeXml } from "./util.js";

describe("escapeXml", () => {
	it("should return identical string when there are no special characters", () => {
		assert.equal(escapeXml("Hello World"), "Hello World");
		assert.equal(escapeXml(""), "");
		assert.equal(escapeXml("12345"), "12345");
	});

	it("should escape ampersand correctly", () => {
		assert.equal(escapeXml("Fish & Chips"), "Fish &\u0061mp; Chips");
	});

	it("should escape less than and greater than correctly", () => {
		assert.equal(escapeXml("5 < 6 and 6 > 5"), "5 &\u006ct; 6 and 6 &\u0067t; 5");
	});

	it("should escape quotes and apostrophes correctly", () => {
		assert.equal(escapeXml(`She said "hello" to O'Connor`), "She said &\u0071uot;hello&\u0071uot; to O&\u0061pos;Connor");
	});

	it("should handle strings with only special characters", () => {
		assert.equal(escapeXml("&<>'\""), "&\u0061mp;&\u006ct;&\u0067t;&\u0061pos;&\u0071uot;");
	});

	it("should handle strings with multiple occurrences of the same special character", () => {
		assert.equal(escapeXml("<<<>>>&&"), "&\u006ct;&\u006ct;&\u006ct;&\u0067t;&\u0067t;&\u0067t;&\u0061mp;&\u0061mp;");
	});
});
