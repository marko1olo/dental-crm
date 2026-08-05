import assert from "node:assert";
import { test, describe } from "node:test";
import { orgIdXml, DEFAULT_MO_ROOT } from "../util.js";
import type { CdaContext } from "../util.js";

describe("cda/util", () => {
	describe("orgIdXml", () => {
		test("should return id with DEFAULT_MO_ROOT and clinicOidEscaped when clinicOidEscaped is provided", () => {
			const ctx = {
				clinicOidEscaped: "test_oid_escaped",
			} as CdaContext;
			const expected = `<id root="${DEFAULT_MO_ROOT}" extension="test_oid_escaped"/>`;
			assert.strictEqual(orgIdXml(ctx), expected);
		});

		test("should return id with nullFlavor NI when clinicOidEscaped is null", () => {
			const ctx = {
				clinicOidEscaped: null,
			} as CdaContext;
			const expected = `<id nullFlavor="NI"/>`;
			assert.strictEqual(orgIdXml(ctx), expected);
		});

		test("should return id with nullFlavor NI when clinicOidEscaped is an empty string", () => {
			const ctx = {
				clinicOidEscaped: "",
			} as CdaContext;
			const expected = `<id nullFlavor="NI"/>`;
			assert.strictEqual(orgIdXml(ctx), expected);
		});
	});
});
