#!/usr/bin/env node

/**
 * check-dynamic-imports.test.mjs — Набор тестов для проверки динамических импортов и защиты lazyWithRetry.
 *
 * Запуск:
 *   node --test scripts/tests/check-dynamic-imports.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	checkBrokenDynamicImports,
	checkRawLazyUsage,
	loadRawLazyAllowlist,
	resolveTarget,
} from "../check-dynamic-imports.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const cacheDir = path.join(repoRoot, "node_modules/.cache");

test("resolveTarget resolves valid .ts and .js relative paths", () => {
	const anchor = path.join(repoRoot, "apps/api/src/db/client.ts");
	const resolved = resolveTarget(anchor, "./schema.js");
	assert.ok(resolved !== null);
	assert.ok(resolved.endsWith(".ts") || resolved.endsWith(".js"));

	const fake = resolveTarget(anchor, "./non-existent-module-xyz.js");
	assert.equal(fake, null);
});

test("checkBrokenDynamicImports detects broken import targets", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = fs.mkdtempSync(path.join(cacheDir, "dente-dyn-test-"));

	try {
		const testFile = path.join(tempDir, "sampleRoute.ts");
		fs.writeFileSync(
			testFile,
			`
			export async function handler() {
				const { fn } = await import("./nonExistentQuery.js");
				return fn();
			}
			`,
			"utf8",
		);

		const { broken, checked } = checkBrokenDynamicImports([testFile]);
		assert.equal(checked, 1);
		assert.equal(broken.length, 1);
		assert.equal(broken[0].specifier, "./nonExistentQuery.js");
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("checkRawLazyUsage detects raw React.lazy() when not allowlisted", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = path.join(repoRoot, "apps/web/src/__temp_lazy_test__");
	fs.mkdirSync(tempDir, { recursive: true });

	try {
		const testFile = path.join(tempDir, "UnsafeView.tsx");
		fs.writeFileSync(
			testFile,
			`
			import React from "react";
			const MyModal = React.lazy(() => import("./MyModal"));
			export const UnsafeView = () => <MyModal />;
			`,
			"utf8",
		);

		const violations = checkRawLazyUsage([testFile], { legacy_backlog: [] });
		assert.equal(violations.length, 1);
		assert.ok(violations[0].message.includes("lazyWithRetry"));
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("checkRawLazyUsage detects bare lazy() imported from 'react'", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = path.join(repoRoot, "apps/web/src/__temp_lazy_test__");
	fs.mkdirSync(tempDir, { recursive: true });

	try {
		const testFile = path.join(tempDir, "UnsafeBareLazyView.tsx");
		fs.writeFileSync(
			testFile,
			`
			import { lazy } from "react";
			const MyModal = lazy(() => import("./MyModal"));
			export const UnsafeBareLazyView = () => <MyModal />;
			`,
			"utf8",
		);

		const violations = checkRawLazyUsage([testFile], { legacy_backlog: [] });
		assert.equal(violations.length, 1);
		assert.ok(violations[0].message.includes("lazyWithRetry"));
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("checkRawLazyUsage allows files in legacy backlog and files using lazyWithRetry", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = path.join(repoRoot, "apps/web/src/__temp_lazy_test__");
	fs.mkdirSync(tempDir, { recursive: true });

	try {
		const legacyFile = path.join(tempDir, "LegacyView.tsx");
		const modernFile = path.join(tempDir, "ModernView.tsx");

		fs.writeFileSync(
			legacyFile,
			`
			import React from "react";
			const MyModal = React.lazy(() => import("./MyModal"));
			export const LegacyView = () => <MyModal />;
			`,
			"utf8",
		);

		fs.writeFileSync(
			modernFile,
			`
			import { lazyWithRetry } from "../lib/lazyWithRetry";
			const MyModal = lazyWithRetry(() => import("./MyModal"));
			export const ModernView = () => <MyModal />;
			`,
			"utf8",
		);

		const relLegacy = path.relative(repoRoot, legacyFile).replace(/\\/g, "/");
		const violations = checkRawLazyUsage([legacyFile, modernFile], {
			legacy_backlog: [relLegacy],
		});

		assert.equal(violations.length, 0);
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("loadRawLazyAllowlist loads valid config with legacy backlog entries", () => {
	const allowlist = loadRawLazyAllowlist();
	assert.ok(Array.isArray(allowlist.legacy_backlog));
	assert.ok(allowlist.legacy_backlog.length > 0);
	assert.ok(allowlist.legacy_backlog.includes("apps/web/src/AppShell.tsx"));
});
