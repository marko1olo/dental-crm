#!/usr/bin/env node
/**
 * scripts/tests/frontend-ui-purity.test.mjs
 *
 * Жёсткие AST-тесты чистоты фронтенда (TSX/JSX + CSS) с минимумом ложных срабатываний.
 * Проверяет как сами детекторы на контрольных фикстурах (без source-grep!), так и
 * реальное дерево apps/web/src против скрипта-храповика `ui-purity-baseline.json`.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scanWebUiTree } from "../check-ui-purity.mjs";
import { scanCssUiPurity, scanTsxUiPurity, UI_PURITY_RULE_KEYS } from "../lib/ui-purity-rules.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const baselinePath = join(repoRoot, "scripts", "config", "ui-purity-baseline.json");

test("TSX AST detector catches neon var(--teal) buttons, table Primary fences, blue dark cards, duplicate closes and jargon", () => {
	const brokenComponent = `
		import React from "react";
		// Комментарий: IndexedDB и bg-[var(--teal)] в комментарии ИГНОРИРУЮТСЯ без ложных срабатываний!
		const internalId = "043/у_ignored_variable";
		export function BrokenLabTableModal() {
			return (
				<div role="dialog" className="bg-[#1e293b] dark:bg-slate-800">
					<button type="button" aria-label="Закрыть"><X /></button>
					<h2>Осмотр &amp; План (54-ФЗ)</h2>
					<p>Данные хранятся в IndexedDB с копеечной точностью</p>
					<button type="button" className="bg-[var(--teal,#0d9488)] text-white">Сохранить</button>
					<button type="button" className="bg-[#2dd4bf] text-black">Неон</button>
					<button type="button" className="bg-gradient-to-r from-teal-500 to-emerald-500">Градиент</button>
					<button type="button" className="bg-slate-200 text-slate-700">Серый таб</button>
					<span className="text-slate-800 px-2">Нечитаемый текст в тёмной теме</span>
					<div className="z-[9999]">Монстр-слой</div>
					<button type="button" className="primary-button">Далее -></button>
					<button type="button" className="primary-button">Кнопка 2</button>
					<button type="button" className="bg-[var(--primary)] text-white">Кнопка 3</button>
					<table><tbody><tr><td>
						<button type="button" className="primary-button bg-[var(--primary)]">Принять</button>
					</td></tr></tbody></table>
					<button type="button">Закрыть</button>
				</div>
			);
		}
	`;

	const findings = scanTsxUiPurity("BrokenLabTableModal.tsx", brokenComponent);
	const rules = new Set(findings.map((f) => f.rule));

	assert.ok(rules.has("blue_dark_card_surface"), "Must reject #1e293b/slate-800 dark-blue card surface");
	assert.ok(rules.has("solid_var_teal_button"), "Must reject solid bg-[var(--teal)] button (turns neon #2dd4bf in dark mode)");
	assert.ok(rules.has("circus_or_neon_button"), "Must reject hardcoded neon bg-[#2dd4bf] button");
	assert.ok(rules.has("table_row_primary_fence"), "Must reject primary-button inside <tr> table row");
	assert.ok(rules.has("duplicate_modal_close"), "Must reject [X] + duplicate 'Закрыть' button in same modal");
	assert.ok(rules.has("ui_dev_jargon"), "Must reject IndexedDB / копеечной точностью jargon in visible JSX text");
	assert.ok(rules.has("ui_reg_code_leak"), "Must reject 54-ФЗ leak in visible JSX text");
	assert.ok(rules.has("ui_button_ascii_arrow"), "Must reject '->' ASCII arrow in button label");
	assert.ok(rules.has("gradient_on_control"), "Must reject gradient buttons/tabs");
	assert.ok(rules.has("unthemed_light_control"), "Must reject unthemed grey/white buttons/tabs without dark:bg-*");
	assert.ok(rules.has("unthemed_dark_text"), "Must reject dark text-slate-800 without dark:text-*");
	assert.ok(rules.has("monster_zindex_override"), "Must reject z-[9999] breaking layer hierarchy");
	assert.ok(rules.has("duplicate_primary_cta_jsx"), "Must reject >=3 unconditional Primary buttons in one component");
	assert.equal(
		findings.some((f) => f.snippet.includes("043/у_ignored_variable")),
		false,
		"Must NOT trigger false positives on non-rendered JS identifier strings",
	);
});

test("TSX AST detector produces ZERO false positives on canonical DENTE components, comments, and translucent teal badges", () => {
	const cleanComponent = `
		import React from "react";
		/* bg-[#2dd4bf] 043/у IndexedDB TS3S3510S в 1 клик — комментарий не считается UI! */
		const API_FORM_CODE = "043/у";
		export function CleanClinicDialog() {
			return (
				<div role="dialog" className="bg-[var(--paper)] border border-[var(--line)]">
					<button type="button" aria-label="Закрыть"><X /></button>
					<h2>Осмотр и план лечения</h2>
					<span className="bg-[var(--teal)]/10 text-[var(--primary)]">В клинике</span>
					<table><tbody><tr><td>
						<button type="button" className="bg-[var(--paper)] border border-[var(--line)]">Принять</button>
					</td></tr></tbody></table>
					<button type="button">Отмена</button>
					<button type="button" className="bg-[var(--primary)] text-white">Сохранить</button>
				</div>
			);
		}
	`;

	const findings = scanTsxUiPurity("CleanClinicDialog.tsx", cleanComponent);
	assert.deepEqual(findings, [], `Expected 0 false positives on clean canonical TSX, got: ${JSON.stringify(findings)}`);
});

test("CSS purity detector rejects global @media (pointer: coarse) outside <=768px mobile media queries and unlayered utility overrides", () => {
	const badCss = `@media (pointer: coarse) { .btn { min-height: 48px; } }\n.flex-1 { flex: 1 1 0%; }`;
	const goodCss = `@media (max-width: 768px) and (pointer: coarse) { .btn { min-height: 48px; } }\n@layer utilities { .flex-1 { flex: 1 1 0%; } }`;

	const badHits = scanCssUiPurity("bad.css", badCss);
	assert.equal(badHits.length, 2, "Must catch unbounded pointer: coarse and unlayered .flex-1");
	assert.ok(badHits.some((h) => h.rule === "unlayered_css_utility"));
	assert.equal(scanCssUiPurity("good.css", goodCss).length, 0, "Must allow scoped pointer:coarse and @layer utilities");
});

test("TSX AST detector catches uppercase labels, hardcoded bg-white cards, segmented Primary tabs, clinicToken || staffToken, swallowed fetch and alert()", () => {
	const subtleRot = `
		import React from "react";
		const hdr = clinicToken || staffToken;
		async function brokenLoad() {
			const r = await fetch("/api/items").catch(() => null);
			return r ? r.json().catch(() => []) : [];
		}
		export function SubtleBrokenDrawer() {
			return (
				<div className="bg-white p-4">
					<span className="uppercase text-xs">ВЫРУЧКА ЗА ДЕНЬ</span>
					<div role="tablist" className="dente-segmented-bar">
						<button type="button" onClick={() => window.confirm("Удалить?")} className="bg-[var(--primary)] text-white">Журнал</button>
					</div>
				</div>
			);
		}
	`;
	const findings = scanTsxUiPurity("SubtleBrokenDrawer.tsx", subtleRot);
	const rules = new Set(findings.map((f) => f.rule));
	assert.ok(rules.has("all_caps_ui_text"), "Must catch Tailwind uppercase on Russian UI labels");
	assert.ok(rules.has("hardcoded_bg_white_ui"), "Must catch unthemed bg-white card outside print sheet");
	assert.ok(rules.has("segmented_primary_abuse"), "Must catch Primary CTA styling inside segmented tablist");
	assert.ok(rules.has("reverse_auth_token_order"), "Must catch clinicToken || staffToken inversion");
	assert.ok(rules.has("swallowed_fetch_or_json_fallback"), "Must catch fetch().catch() and json().catch()");
	assert.ok(rules.has("browser_blocking_dialog"), "Must catch blocking window.confirm/alert dialogs");
});

test("Live apps/web/src tree adheres strictly to ui-purity-baseline.json ceilings with zero regressions", () => {
	assert.ok(existsSync(baselinePath), "Missing scripts/config/ui-purity-baseline.json");
	const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
	const scan = scanWebUiTree();

	const violations = [];
	for (const rule of UI_PURITY_RULE_KEYS) {
		const actual = scan.counts[rule] || 0;
		const limit = baseline.limits?.[rule] ?? 0;
		if (actual > limit) {
			const samples = scan.findings
				.filter((f) => f.rule === rule)
				.slice(0, 5)
				.map((f) => `  • ${f.file}:${f.line} — ${f.message} [${f.snippet}]`)
				.join("\n");
			violations.push(
				`ПРАВИЛО [${rule}]: ${actual} > потолка ${limit}. Так делают только халтурщики — убери регрессию:\n${samples}`,
			);
		}
	}

	assert.equal(
		violations.length,
		0,
		`\n🚨 UI PURITY REGRESSION В БОЕВОМ ФРОНТЕНДЕ:\n${violations.join("\n\n")}\n\nЗапусти: node scripts/check-ui-purity.mjs --list <rule>`,
	);
});
