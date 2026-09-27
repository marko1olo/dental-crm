import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const shellPath = fileURLToPath(
	new URL("../workspaceShell.tsx", import.meta.url),
);
const sidebarCssPath = fileURLToPath(
	new URL("../styles/modules/sidebar.css", import.meta.url),
);
const redesignCssPath = fileURLToPath(
	new URL("../styles/dente-redesign.css", import.meta.url),
);

test("workspace sidebar footer: 2-tier vertical stack hierarchy", () => {
	const shellSource = readFileSync(shellPath, "utf8");

	// 1. Sidebar footer must contain 2 vertical tiers
	assert.ok(
		shellSource.includes("sidebar-footer-tier--top"),
		"sidebar-footer must have a top tier for theme and collapse controls",
	);
	assert.ok(
		shellSource.includes("sidebar-footer-tier--bottom"),
		"sidebar-footer must have a bottom tier for clinic telemetry pill",
	);

	// 2. Top tier must contain ThemeQuickAccessWidget and sidebar-collapse-button
	const topTierIdx = shellSource.indexOf("sidebar-footer-tier--top");
	const bottomTierIdx = shellSource.indexOf("sidebar-footer-tier--bottom");
	assert.ok(topTierIdx < bottomTierIdx, "top tier must precede bottom tier");

	const topTierContent = shellSource.slice(topTierIdx, bottomTierIdx);
	assert.ok(
		topTierContent.includes("<ThemeQuickAccessWidget"),
		"top tier must contain ThemeQuickAccessWidget",
	);
	assert.ok(
		topTierContent.includes("sidebar-collapse-button"),
		"top tier must contain sidebar-collapse-button",
	);

	// 3. Bottom tier must contain ClinicControlPill
	const bottomTierContent = shellSource.slice(bottomTierIdx);
	assert.ok(
		bottomTierContent.includes("<ClinicControlPill"),
		"bottom tier must contain ClinicControlPill",
	);
});

test("sidebar ergonomics & width optimization", () => {
	const sidebarCss = readFileSync(sidebarCssPath, "utf8");
	const redesignCss = readFileSync(redesignCssPath, "utf8");

	// 1. Sidebar width must be optimized to 200px (was 252px)
	assert.ok(
		sidebarCss.includes("--sidebar-width, 200px"),
		"sidebar.css must use 200px default width",
	);
	assert.ok(
		redesignCss.includes("--sidebar-width: 200px;"),
		"dente-redesign.css root token must be 200px",
	);

	// 2. 252px must not remain in active sidebar container styles
	assert.ok(
		!sidebarCss.includes("252px"),
		"sidebar.css must not reference obsolete 252px width",
	);

	// 3. Sidebar footer must be column layout
	assert.ok(
		sidebarCss.includes("flex-direction: column !important;"),
		"sidebar-footer must arrange tiers in a column",
	);

	// 4. Popover upward position must clear the 2-tier footer (>= 80px)
	assert.ok(
		sidebarCss.includes("bottom: 86px !important;"),
		"control center popover must open above the 2-tier footer",
	);

	// 5. Collapsed state must preserve 76px compact rail
	assert.ok(
		sidebarCss.includes('[data-collapsed="true"] .sidebar {\n\twidth: 76px !important;'),
		"collapsed state must preserve 76px rail width",
	);
});
