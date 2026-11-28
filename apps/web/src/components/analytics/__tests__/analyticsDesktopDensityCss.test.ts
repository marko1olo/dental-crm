/**
 * apps/web/src/components/analytics/__tests__/analyticsDesktopDensityCss.test.ts
 * Structural CSS declaration + React SSR DOM verification for executive toolbar & P&L footer.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PnlActionFooter } from "../../finance/pnl/dashboardModules/PnlActionFooter.tsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");

function extractCssDeclarations(cssText: string, selector: string, mediaFilter?: string): Record<string, string> {
	let scopeText = cssText;
	if (mediaFilter) {
		const mediaStart = cssText.indexOf(mediaFilter);
		assert.notEqual(mediaStart, -1, `Expected media block ${mediaFilter}`);
		const openIdx = cssText.indexOf("{", mediaStart);
		let depth = 0;
		let endIdx = cssText.length;
		for (let i = openIdx; i < cssText.length; i++) {
			if (cssText[i] === "{") depth++;
			else if (cssText[i] === "}") {
				depth--;
				if (depth === 0) {
					endIdx = i;
					break;
				}
			}
		}
		scopeText = cssText.slice(openIdx + 1, endIdx);
	}

	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const ruleMatch = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(scopeText);
	assert.ok(ruleMatch?.[1], `Expected CSS rule for ${selector}${mediaFilter ? ` inside ${mediaFilter}` : ""}`);
	const decls: Record<string, string> = {};
	for (const part of ruleMatch[1].split(";")) {
		const idx = part.indexOf(":");
		if (idx === -1) continue;
		const prop = part.slice(0, idx).trim();
		const val = part.slice(idx + 1).trim();
		if (prop) decls[prop] = val;
	}
	return decls;
}

test("execToolbar.css enforces 36px toolbar and token-backed secondary chip rules", () => {
	const cssPath = path.join(analyticsDir, "executiveStyles", "execToolbar.css");
	const content = fs.readFileSync(cssPath, "utf8");

	const toolbarDecls = extractCssDeclarations(content, ".executive-canonical-toolbar");
	assert.equal(toolbarDecls.height, "36px");
	assert.equal(toolbarDecls["min-height"], "36px");

	const chipDecls = extractCssDeclarations(content, ".executive-period-chips .secondary-button");
	assert.equal(chipDecls.height, "36px");
	assert.match(chipDecls.border ?? "", /var\(--line\)/);
});

test("pnlFooter.css enforces 36px desktop density with mobile touch >= 44px and matches PnlActionFooter DOM", () => {
	const markup = renderToStaticMarkup(
		React.createElement(PnlActionFooter, {
			report: null,
			onOpenQuickExpense: () => {},
			periodLabel: "Январь 2026",
		}),
	);
	assert.ok(markup.includes('class="pnl-footer"'));
	assert.ok(markup.includes('class="pnl-footer-btn-primary"'));
	assert.ok(markup.includes('class="pnl-footer-btn-secondary"'));
	assert.ok(markup.includes('data-testid="financial-privacy-note"'));

	const cssPath = path.resolve(analyticsDir, "../finance/pnl/pnlStyles/pnlFooter.css");
	const content = fs.readFileSync(cssPath, "utf8");

	const desktopPrimary = extractCssDeclarations(content, ".pnl-footer-btn-primary");
	assert.equal(desktopPrimary.height, "36px");

	const mobilePrimary = extractCssDeclarations(
		content,
		".pnl-footer-btn-primary",
		"@media (max-width: 768px)",
	);
	assert.equal(mobilePrimary.height, "44px");
});
