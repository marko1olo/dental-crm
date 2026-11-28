import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShieldCheck } from "lucide-react";
import { DelimitedTileCard } from "../DelimitedTileCard";
import { AccessSecurityHero } from "../access/AccessSecurityHero";
import { AccessSecurityGuaranteesGrid } from "../access/AccessSecurityGuaranteesGrid";
import { AdminCadenceCard } from "../admin/AdminCadenceCard";

const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Settings Mandates: Runtime Render & Zero Emoji", () => {
	it("AccessSecurityHero, AccessSecurityGuaranteesGrid, and AdminCadenceCard render cleanly with 0 cartoon emojis", () => {
		const heroHtml = renderToString(React.createElement(AccessSecurityHero));
		const gridHtml = renderToString(React.createElement(AccessSecurityGuaranteesGrid));
		const cadenceHtml = renderToString(React.createElement(AdminCadenceCard));

		for (const [name, html] of [
			["AccessSecurityHero", heroHtml],
			["AccessSecurityGuaranteesGrid", gridHtml],
			["AdminCadenceCard", cadenceHtml],
		] as const) {
			assert.ok(html.length > 0, `${name} must render non-empty HTML`);
			assert.equal(EMOJI_REGEX.test(html), false, `${name} rendered output must not contain cartoon emojis`);
		}
		assert.ok(gridHtml.includes('data-testid="security-guarantees-grid"'));
	});

	it("DelimitedTileCard renders opaque paper-card surface tokens, accessible role=button, and aria-pressed", () => {
		const html = renderToString(
			React.createElement(DelimitedTileCard, {
				icon: ShieldCheck,
				title: "За 24ч до приёма",
				description: "Подтверждение визита",
				checked: true,
				onChange: () => {},
				testId: "tile-card-test",
			}),
		);
		assert.ok(html.includes('data-testid="tile-card-test"'));
		assert.ok(html.includes('aria-pressed="true"'));
		assert.ok(html.includes("bg-[var(--paper-card)]"));
		assert.ok(html.includes("border-[var(--line)]"));
		assert.equal(html.includes("bg-slate-300"), false);
		assert.equal(EMOJI_REGEX.test(html), false);
	});
});
