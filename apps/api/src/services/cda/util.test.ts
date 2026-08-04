import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MO_ROOT, buildCdaContext, orgIdXml } from "./util.js";
import type { EgiszCdaParams } from "./schema.js";

test("DEFAULT_MO_ROOT", async (t) => {
	await t.test("exports the expected string value", () => {
		assert.equal(DEFAULT_MO_ROOT, "1.2.643.5.1.13.13.12.2");
	});
});

test("buildCdaContext - docIdRoot and clinicOidEscaped", async (t) => {
	const createParams = (clinicOid?: string | null): EgiszCdaParams =>
		({
			documentId: "doc-1",
			documentVersion: 1,
			documentTime: new Date(),
			visitDate: new Date(),
			clinicOid,
		}) as unknown as EgiszCdaParams;

	await t.test("uses DEFAULT_MO_ROOT when clinicOid is absent", () => {
		const ctx = buildCdaContext(createParams(undefined));
		assert.equal(ctx.docIdRoot, DEFAULT_MO_ROOT);
		assert.equal(ctx.clinicOidEscaped, null);
	});

	await t.test("uses DEFAULT_MO_ROOT when clinicOid is null", () => {
		const ctx = buildCdaContext(createParams(null));
		assert.equal(ctx.docIdRoot, DEFAULT_MO_ROOT);
		assert.equal(ctx.clinicOidEscaped, null);
	});

	await t.test("uses DEFAULT_MO_ROOT when clinicOid is empty string", () => {
		const ctx = buildCdaContext(createParams(""));
		assert.equal(ctx.docIdRoot, DEFAULT_MO_ROOT);
		assert.equal(ctx.clinicOidEscaped, null);
	});

	await t.test("uses DEFAULT_MO_ROOT when clinicOid is whitespace", () => {
		const ctx = buildCdaContext(createParams("   "));
		assert.equal(ctx.docIdRoot, DEFAULT_MO_ROOT);
		assert.equal(ctx.clinicOidEscaped, null);
	});

	await t.test("uses escaped clinicOid when clinicOid is provided", () => {
		const ctx = buildCdaContext(createParams("1.2.3<&>4.5"));
		assert.equal(ctx.docIdRoot, "1.2.3&lt;&amp;&gt;4.5");
		assert.equal(ctx.clinicOidEscaped, "1.2.3&lt;&amp;&gt;4.5");
	});
});

test("orgIdXml", async (t) => {
	await t.test("uses DEFAULT_MO_ROOT and clinicOidEscaped when clinicOidEscaped is truthy", () => {
		const ctx = {
			clinicOidEscaped: "1.2.3.4",
		} as any;
		assert.equal(
			orgIdXml(ctx),
			`<id root="${DEFAULT_MO_ROOT}" extension="1.2.3.4"/>`,
		);
	});

	await t.test("outputs nullFlavor when clinicOidEscaped is falsy", () => {
		const ctx = {
			clinicOidEscaped: null,
		} as any;
		assert.equal(orgIdXml(ctx), `<id nullFlavor="NI"/>`);
	});
});
