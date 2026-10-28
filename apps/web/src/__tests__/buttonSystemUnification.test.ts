import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "../../../..");
const canonicalCss = readFileSync(resolve(root, "apps/web/src/styles/canonicalButtons.css"), "utf8");
const sidebarCss = readFileSync(resolve(root, "apps/web/src/styles/modules/sidebar.css"), "utf8");
const quickToolsSrc = readFileSync(resolve(root, "apps/web/src/workspaceShellModules/SidebarQuickTools.tsx"), "utf8");
const navListSrc = readFileSync(resolve(root, "apps/web/src/workspaceShellModules/SidebarNavList.tsx"), "utf8");
const sidebarSrc = readFileSync(resolve(root, "apps/web/src/workspaceShellModules/WorkspaceSidebar.tsx"), "utf8");

test("canonical button system design code compliance (Mandates 8am, 8ze)", () => {
	// 1. Primary CTA: solid teal var(--teal), white text
	assert.ok(canonicalCss.includes(".dente-btn-primary"), "must define .dente-btn-primary");
	assert.ok(canonicalCss.includes("var(--teal"), "primary CTA must use var(--teal)");

	// 2. Secondary: neutral paper background, line border
	assert.ok(canonicalCss.includes(".dente-btn-secondary"), "must define .dente-btn-secondary");
	assert.ok(canonicalCss.includes("var(--paper"), "secondary button must use var(--paper)");

	// 3. Danger: soft restrained bad-surface, bad-line
	assert.ok(canonicalCss.includes(".dente-btn-danger"), "must define .dente-btn-danger");
	assert.ok(canonicalCss.includes("var(--bad"), "danger button must use var(--bad)");

	// 4. Ghost / Tertiary: transparent contour
	assert.ok(canonicalCss.includes(".dente-btn-ghost"), "must define .dente-btn-ghost");

	// 5. Touch target: >= 44x44px for coarse pointer/mobile
	assert.ok(canonicalCss.includes("48px") || canonicalCss.includes("44px"), "touch target must be >= 44px");
});

test("sidebar quick tools & lateral panel unified design code", () => {
	// 1. Unified badge system
	assert.ok(quickToolsSrc.includes("sidebar-quick-tool-badge"), "quick tools must have sidebar-quick-tool-badge");
	assert.ok(navListSrc.includes("sidebar-nav-badge"), "nav list must have sidebar-nav-badge");
	assert.ok(sidebarCss.includes(".sidebar-quick-tool-badge"), "sidebar.css must style .sidebar-quick-tool-badge");
	assert.ok(sidebarCss.includes(".sidebar-nav-badge"), "sidebar.css must style .sidebar-nav-badge");

	// 2. Zero circus amber or uncoordinated badges
	assert.ok(!navListSrc.includes("bg-amber-500"), "nav list must not contain circus bg-amber-500");
	assert.ok(!quickToolsSrc.includes("bg-amber-500"), "quick tools must not contain circus bg-amber-500");

	// 3. Clean custom events preserved
	assert.ok(quickToolsSrc.includes("dente:open-clinical-tasks"), "must preserve dente:open-clinical-tasks event");
	assert.ok(quickToolsSrc.includes("dente:open-recalls-hub"), "must preserve dente:open-recalls-hub event");
});

test("Mandate 8b: file line count budgets strictly <= 120 lines", () => {
	const quickToolsLines = quickToolsSrc.split("\n").length;
	const navListLines = navListSrc.split("\n").length;
	const sidebarLines = sidebarSrc.split("\n").length;

	assert.ok(quickToolsLines <= 120, `SidebarQuickTools.tsx (${quickToolsLines}) must be <= 120 lines`);
	assert.ok(navListLines <= 120, `SidebarNavList.tsx (${navListLines}) must be <= 120 lines`);
	assert.ok(sidebarLines <= 120, `WorkspaceSidebar.tsx (${sidebarLines}) must be <= 120 lines`);
});
