#!/usr/bin/env node
/**
 * @file check-fetch-response-guard.test.mjs
 * @description Тесты для санитарного шлюза проверки HTTP-ответов fetch и DTO-конверта Fastify (Мандат 8bm).
 *
 * Запуск:
 *   node --test scripts/tests/check-fetch-response-guard.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

import {
	accessesDtoEnvelope,
	loadFetchEnvelopeAllowlist,
} from "../check-fetch-response-guard.mjs";

test("loadFetchEnvelopeAllowlist: корректно загружает список legacy backlog", () => {
	const allowlist = loadFetchEnvelopeAllowlist();
	assert.ok(allowlist);
	assert.ok(Array.isArray(allowlist.legacy_backlog));
	assert.ok(allowlist.legacy_backlog.length > 0, "legacy_backlog должен содержать список легаси-файлов");
});

test("accessesDtoEnvelope: распознаёт распаковку конверта через res.data или destructuring { data }", () => {
	function checkCode(code) {
		const sf = ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
		return accessesDtoEnvelope(sf);
	}

	assert.equal(checkCode("const result = payload.data;"), true);
	assert.equal(checkCode("const { data } = await res.json();"), true);
	assert.equal(checkCode("const data = json?.data ?? json;"), true);
	assert.equal(checkCode("const unshielded = await res.json();"), false);
});
