/**
 * visitSoapTemplatesAutonomy.test.tsx
 *
 * Wave 101 Verification Suite:
 * 1. Mandate 8d & Anti-Matryoshka Law: VisitEmkTab nested cards flattened into natural document sections.
 * 2. WCAG AAA Contrast Law: WhatsAppChatPanel light mode contrast >= 4.5:1 with proper dark: tokens.
 * 3. Mandate 8p (Elephant in the room): SettingsView eliminates duplicate migration wizard mounting.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcRoot = path.resolve(__dirname, "../../..");

test("VisitEmkTab: nested card matryoshka is eliminated per Anti-Matryoshka law", () => {
	const emkPath = path.join(webSrcRoot, "components/visit/VisitEmkTab.tsx");
	const code = readFileSync(emkPath, "utf8");

	// 1. Anesthesia quick protocol must NOT have nested card border/bg
	assert.ok(
		!code.includes('p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]'),
		"VisitEmkTab must NOT have nested card styling on anesthesia quick bar",
	);
	assert.ok(
		code.includes('pt-3 border-t border-[var(--line)] bg-transparent'),
		"VisitEmkTab anesthesia bar must use clean divider border-t border-[var(--line)]",
	);

	// 2. Doctor Autonomy: 1-click anesthesia presets preserved with testids
	assert.ok(code.includes('data-testid="btn-anes-ultracain-ds"'), "Preserves Ultracain DS 1:200k preset");
	assert.ok(code.includes('data-testid="btn-anes-ultracain-ds-forte"'), "Preserves Ultracain DS Forte preset");
	assert.ok(code.includes('data-testid="btn-anes-scandonest-3"'), "Preserves Scandonest 3% preset");

	// 3. Endodontics section must NOT have nested card border/bg
	assert.ok(
		!code.includes('details className="group rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)]'),
		"Endodontics details must NOT have nested card border/bg",
	);
	assert.ok(
		code.includes('details className="group border-t border-[var(--line)] pt-2 bg-transparent'),
		"Endodontics details must be flattened with clean divider",
	);

	// 4. Endodontics apply bar must NOT have nested card styling
	assert.ok(
		!code.includes('p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between'),
		"Endodontics apply bar must NOT have nested card border/bg",
	);

	// 5. Price catalogue details must NOT have nested card styling
	assert.ok(
		!code.includes('details className="group rounded-xl border border-indigo-500/25 bg-indigo-500/5'),
		"Price catalogue details must NOT have nested card border/bg",
	);
});

test("WhatsAppChatPanel: WCAG AAA Light Mode contrast tokens are strictly applied", () => {
	const chatPath = path.join(webSrcRoot, "components/chat/WhatsAppChatPanel.tsx");
	const code = readFileSync(chatPath, "utf8");

	// 1. Upcoming appointment banner contrast
	assert.ok(
		code.includes("text-teal-700 dark:text-teal-300"),
		"WhatsAppChatPanel upcoming appointment must use text-teal-700 dark:text-teal-300",
	);

	// 2. Debt badge contrast
	assert.ok(
		code.includes("text-rose-700 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/60"),
		"WhatsAppChatPanel debt badge must support light theme with dark: variants",
	);

	// 3. DMS badge contrast
	assert.ok(
		code.includes("text-cyan-700 bg-cyan-100 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/60"),
		"WhatsAppChatPanel DMS badge must support light theme with dark: variants",
	);

	// 4. Quick template chips hover states
	assert.ok(
		code.includes("hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[var(--ink)] hover:text-teal-700 dark:hover:text-teal-300"),
		"WhatsAppChatPanel template chip 1 hover must have high contrast in Light Mode",
	);
	assert.ok(
		code.includes("hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[var(--ink)] hover:text-amber-700 dark:hover:text-amber-300"),
		"WhatsAppChatPanel template chip 2 hover must have high contrast in Light Mode",
	);
	assert.ok(
		code.includes("hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[var(--ink)] hover:text-emerald-700 dark:hover:text-emerald-300"),
		"WhatsAppChatPanel template chip 3 hover must have high contrast in Light Mode",
	);
});

test("SettingsView: eliminates simultaneous dual mounting of MigrationWizard and legacy imports tab", () => {
	const settingsPath = path.join(webSrcRoot, "SettingsView.tsx");
	const code = readFileSync(settingsPath, "utf8");

	// 1. MigrationWizard is the primary interface
	assert.ok(code.includes("<MigrationWizard />"), "SettingsView renders MigrationWizard");

	// 2. SettingsImportsTab is encapsulated in a collapsible details spoiler
	assert.ok(
		code.includes("<details className=\"group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden\">"),
		"SettingsImportsTab must be wrapped in a collapsible details spoiler",
	);
	assert.ok(
		code.includes("Расширенный режим: Индивидуальный импорт и ручные утилиты (legacy)"),
		"SettingsImportsTab summary must label the legacy developer mode",
	);
});
