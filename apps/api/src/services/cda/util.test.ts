import test from "node:test";
import assert from "node:assert/strict";
import { escapeXml } from "./util.js";

test("escapeXml escapes &, <, >, \", ' correctly", () => {
	assert.equal(escapeXml("hello & world"), "hello &\u0061mp; world");
	assert.equal(escapeXml("<test>"), "&\u006ct;test&\u0067t;");
	assert.equal(escapeXml('"quotes"'), "&\u0071uot;quotes&\u0071uot;");
	assert.equal(escapeXml("'apostrophe'"), "&\u0061pos;apostrophe&\u0061pos;");
	assert.equal(escapeXml("& < > \" '"), "&\u0061mp; &\u006ct; &\u0067t; &\u0071uot; &\u0061pos;");
});

test("escapeXml handles strings without special characters", () => {
	assert.equal(escapeXml("normal string"), "normal string");
	assert.equal(escapeXml("1234567890"), "1234567890");
});

test("escapeXml handles empty strings", () => {
	assert.equal(escapeXml(""), "");
});

test("escapeXml handles multiple occurrences of the same character", () => {
	assert.equal(escapeXml("&&&"), "&\u0061mp;&\u0061mp;&\u0061mp;");
	assert.equal(escapeXml("<<<"), "&\u006ct;&\u006ct;&\u006ct;");
});
