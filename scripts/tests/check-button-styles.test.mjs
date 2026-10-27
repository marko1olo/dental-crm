#!/usr/bin/env node

/**
 * check-button-styles.test.mjs — Test suite for Canonical Button Styles & UI Purity Linter.
 *
 * Runs via: node --test scripts/tests/check-button-styles.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = join(scriptsDirectory, "check-button-styles.mjs");
const fixtureParent = join(scriptsDirectory, "..", "node_modules", ".cache");

/**
 * Creates an isolated fixture directory, runs check-button-styles.mjs, and returns output & exit code.
 */
function runGuardOn(files) {
	mkdirSync(fixtureParent, { recursive: true });
	const root = mkdtempSync(join(fixtureParent, "dente-button-guard-"));
	try {
		const guardCopy = join(root, "scripts", "check-button-styles.mjs");
		mkdirSync(dirname(guardCopy), { recursive: true });
		mkdirSync(join(root, "apps", "web", "src"), { recursive: true });

		const source = readFileSync(guardPath, "utf8");
		writeFileSync(guardCopy, source, "utf8");

		for (const [relativeName, content] of Object.entries(files)) {
			const target = join(root, "apps", "web", "src", relativeName);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, content, "utf8");
		}

		const result = spawnSync(process.execPath, [guardCopy], {
			encoding: "utf8",
			env: { ...process.env, NODE_ENV: "test" },
		});

		return {
			code: result.status,
			stdout: result.stdout || "",
			stderr: result.stderr || "",
			output: (result.stdout || "") + (result.stderr || ""),
		};
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

test("check-button-styles: passes clean canonical buttons with exit code 0", () => {
	const res = runGuardOn({
		"components/TestButtons.tsx": `
			import React from "react";
			export function TestButtons() {
				return (
					<div>
						<button type="button" className="dente-btn dente-btn-primary">Сохранить</button>
						<button type="button" className="dente-btn dente-btn-secondary">Отмена</button>
						<button type="button" className="dente-btn dente-btn-pill">Пресет</button>
						<button type="button" className="dente-btn dente-btn-danger">Удалить</button>
					</div>
				);
			}
		`,
		"styles/buttons.css": `
			.dente-btn-primary { background: var(--teal, #0d9488); color: #ffffff; }
			.dente-btn-secondary { background: var(--paper); border: 1px solid var(--line); }
		`,
	});

	assert.equal(res.code, 0, `Expected exit 0, got ${res.code}: ${res.output}`);
	assert.match(res.output, /\[BUTTON STYLES OK\]/);
});

test("check-button-styles: detects forbidden circus classes on <button>", () => {
	const res = runGuardOn({
		"components/AmberButton.tsx": `
			import React from "react";
			export function AmberButton() {
				return (
					<button type="button" className="h-9 px-3 bg-amber-100 text-amber-800">
						Amber Circus
					</button>
				);
			}
		`,
	});

	assert.equal(res.code, 1, `Expected exit 1, got ${res.code}`);
	assert.match(res.output, /bg-amber-100/);
	assert.match(res.output, /FOUND 1 BUTTON STYLE VIOLATION/);
});

test("check-button-styles: detects hover:bg-purple-100 and border-amber-400 on interactive buttons", () => {
	const res = runGuardOn({
		"components/PurpleButton.tsx": `
			import React from "react";
			export function PurpleButton() {
				return (
					<button type="button" className="h-8 px-2 hover:bg-purple-100 border-amber-400">
						Purple Amber Circus
					</button>
				);
			}
		`,
	});

	assert.equal(res.code, 1, `Expected exit 1, got ${res.code}`);
	assert.match(res.output, /border-amber-400|hover:bg-purple-100/);
});

test("check-button-styles: detects circus classes on role='button' and presets with onClick", () => {
	const res = runGuardOn({
		"components/PresetChip.tsx": `
			import React from "react";
			export function PresetChip() {
				return (
					<div role="button" onClick={() => {}} className="pill-preset bg-orange-100">
						Orange Preset
					</div>
				);
			}
		`,
	});

	assert.equal(res.code, 1, `Expected exit 1, got ${res.code}`);
	assert.match(res.output, /bg-orange-100/);
});

test("check-button-styles: ignores non-interactive elements with background tokens", () => {
	const res = runGuardOn({
		"components/StatusBadge.tsx": `
			import React from "react";
			export function StatusBadge() {
				return (
					<span className="badge text-amber-800 bg-amber-100">
						Не кнопка, а пассивный статус
					</span>
				);
			}
		`,
	});

	assert.equal(res.code, 0, `Expected exit 0 for non-interactive elements, got ${res.code}: ${res.output}`);
});

test("check-button-styles: detects circus raw colors in CSS button rules", () => {
	const res = runGuardOn({
		"styles/customButtons.css": `
			.primary-button {
				background: #f59e0b;
				color: #ffffff;
			}
		`,
	});

	assert.equal(res.code, 1, `Expected exit 1, got ${res.code}`);
	assert.match(res.output, /#f59e0b/);
});
