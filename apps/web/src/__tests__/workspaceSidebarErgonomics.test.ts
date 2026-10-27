import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { fileURLToPath } from "node:url";

const shellPath = fileURLToPath(
	new URL("../workspaceShellModules/WorkspaceSidebar.tsx", import.meta.url),
);
const quickToolsPath = fileURLToPath(
	new URL("../workspaceShellModules/SidebarQuickTools.tsx", import.meta.url),
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

test("sidebar quick tools: canonical .nav-item design system compliance", () => {
	const quickToolsSource = readFileSync(quickToolsPath, "utf8");
	const sidebarCss = readFileSync(sidebarCssPath, "utf8");

	// 1. Must use canonical nav-item class for seamless design integration
	assert.ok(
		quickToolsSource.includes('className="nav-item sidebar-quick-tool-btn"'),
		"quick tool buttons must inherit canonical nav-item class",
	);

	// 2. Must feature canonical clinical micro-hints
	assert.ok(
		quickToolsSource.includes("Передача этапов"),
		"clinical tasks must have 'Передача этапов' micro-hint",
	);
	assert.ok(
		quickToolsSource.includes("Повторные вызовы"),
		"recalls hub must have 'Повторные вызовы' micro-hint",
	);

	// 3. Must feature collapsed captions
	assert.ok(
		quickToolsSource.includes(">Задачи</span>"),
		"clinical tasks must have 'Задачи' caption in collapsed mode",
	);
	assert.ok(
		quickToolsSource.includes(">Осмотры</span>"),
		"recalls hub must have 'Осмотры' caption in collapsed mode",
	);

	// 4. No sticker classes or hardcoded colored text classes
	assert.ok(
		!quickToolsSource.includes("sidebar-quick-tool-btn--collapsed"),
		"must not use legacy collapsed sticker classes",
	);
	assert.ok(
		!quickToolsSource.includes("sidebar-quick-tool-btn--expanded"),
		"must not use legacy expanded sticker classes",
	);
	assert.ok(
		!quickToolsSource.includes("text-[var(--teal"),
		"must not hardcode teal text on icons",
	);

	// 5. CSS must not have legacy sticker box styling
	assert.ok(
		!sidebarCss.includes(".sidebar-quick-tool-btn--collapsed"),
		"sidebar.css must be purged of legacy collapsed sticker box styles",
	);
	assert.ok(
		!sidebarCss.includes(".sidebar-quick-tool-btn--expanded"),
		"sidebar.css must be purged of legacy expanded sticker box styles",
	);

	// 6. Mandate 8b: file length <= 120 lines
	const lines = quickToolsSource.split("\n").length;
	assert.ok(lines <= 120, `SidebarQuickTools.tsx must be <= 120 lines (currently ${lines})`);
});
