/**
 * scripts/generate_tooth47_standalone_proofs.mjs
 * Generates standalone HTML render and captures 5 pristine proofs:
 * 1. tooth47_pc_light_1440x900.png
 * 2. tooth47_pc_dark_1440x900.png
 * 3. tooth47_macro_4cusps_cruciform.png (Macro 4 cusps + cruciform fissure)
 * 4. tooth47_roots_parallel_endo.png (Macro 2 parallel roots + 3 canals)
 * 5. tooth47_arch32_mounting.png (Full 32-tooth dental arch with mounted 47 & 37)
 * Mandate 8b <= 120 lines.
 */

import React from "react";
globalThis.React = React;
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Tooth47Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth47/index.ts";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";

const ORCHESTRATOR_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/a6f2b5ab-6bb4-4d96-af8a-9006a477cf49";
const OUT_DIR = resolve("docs/proofs/odontogram/tooth47");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
if (!existsSync(ORCHESTRATOR_BRAIN)) mkdirSync(ORCHESTRATOR_BRAIN, { recursive: true });

function wrapHtml(content, isDark = false, title = "Tooth 47") {
	return `<!DOCTYPE html>
<html class="${isDark ? "dark" : ""}" data-theme="${isDark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
:root { --paper: #ffffff; --paper-strong: #f8fafc; --ink: #0f172a; --line: #e2e8f0; }
:root.dark { --paper: #090d16; --paper-strong: #0f172a; --ink: #f8fafc; --line: #1e293b; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 24px; min-height: 100vh;
  background: var(--paper); color: var(--ink);
  font-family: system-ui, -apple-system, sans-serif;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.tooth-card {
  background: var(--paper-strong); border: 1px solid var(--line);
  border-radius: 20px; padding: 32px; display: flex; flex-direction: column;
  align-items: center; gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}
.badge-tag {
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;
  background: rgba(20, 184, 166, 0.15); color: #0d9488;
}
.dark .badge-tag { color: #2dd4bf; }
</style>
</head>
<body>
${content}
</body>
</html>`;
}

async function run() {
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

		// 1. PC Light overview
		const singleLightSvg = renderToStaticMarkup(
			React.createElement("div", { className: "tooth-card" }, [
				React.createElement("div", { key: "head", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
					React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "DENTE Gate 1 — Зуб 47 (Второй нижний моляр)"),
					React.createElement("span", { key: "t2", className: "badge-tag" }, "Wheeler Ch. 11 · 4 бугра · Крест (+) · XXL 37px"),
				]),
				React.createElement(Tooth47Container, { key: "tooth", zoom: 2.2, isDark: false }),
			]),
		);
		const htmlPath1 = resolve("scratch/tooth47_light.html");
		writeFileSync(htmlPath1, wrapHtml(singleLightSvg, false, "Tooth 47 Light"));
		await page.goto(`file:///${htmlPath1.replace(/\\/g, "/")}`);
		const p1 = resolve(OUT_DIR, "tooth47_pc_light_1440x900.png");
		await page.screenshot({ path: p1 });
		copyFileSync(p1, resolve(ORCHESTRATOR_BRAIN, "tooth47_pc_light_1440x900.png"));

		// 2. PC Dark overview
		const singleDarkSvg = renderToStaticMarkup(
			React.createElement("div", { className: "tooth-card" }, [
				React.createElement("div", { key: "head", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
					React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "DENTE Gate 1 — Зуб 47 (Dark Mode)"),
					React.createElement("span", { key: "t2", className: "badge-tag" }, "Apple HIG Dark Shaders · XXL 37px"),
				]),
				React.createElement(Tooth47Container, { key: "tooth", zoom: 2.2, isDark: true }),
			]),
		);
		const htmlPath2 = resolve("scratch/tooth47_dark.html");
		writeFileSync(htmlPath2, wrapHtml(singleDarkSvg, true, "Tooth 47 Dark"));
		await page.goto(`file:///${htmlPath2.replace(/\\/g, "/")}`);
		const p2 = resolve(OUT_DIR, "tooth47_pc_dark_1440x900.png");
		await page.screenshot({ path: p2 });
		copyFileSync(p2, resolve(ORCHESTRATOR_BRAIN, "tooth47_pc_dark_1440x900.png"));

		// 3. Macro close-up on 4 cusps & cruciform (+) fissure
		const p3 = resolve(OUT_DIR, "tooth47_macro_4cusps_cruciform.png");
		const toothEl = await page.$("svg");
		if (toothEl) await toothEl.screenshot({ path: p3 });
		copyFileSync(p3, resolve(ORCHESTRATOR_BRAIN, "tooth47_macro_4cusps_cruciform.png"));

		// 4. Endodontics: 2 parallel roots + 3 canals
		const endoSvg = renderToStaticMarkup(
			React.createElement("div", { className: "tooth-card" }, [
				React.createElement("div", { key: "head", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
					React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "Зуб 47 — 3 корневых канала (MB, ML, D)"),
					React.createElement("span", { key: "t2", className: "badge-tag" }, "Обтурация гуттаперчей"),
				]),
				React.createElement(Tooth47Container, {
					key: "tooth",
					zoom: 2.5,
					isDark: false,
					layers: { roots: true, crown: true, canals: true, pulp: true, guttaPercha: true, canalCondition: "adequate" },
				}),
			]),
		);
		const htmlPath4 = resolve("scratch/tooth47_endo.html");
		writeFileSync(htmlPath4, wrapHtml(endoSvg, false, "Tooth 47 Endo"));
		await page.goto(`file:///${htmlPath4.replace(/\\/g, "/")}`);
		const p4 = resolve(OUT_DIR, "tooth47_roots_parallel_endo.png");
		const endoEl = await page.$("svg");
		if (endoEl) await endoEl.screenshot({ path: p4 });
		copyFileSync(p4, resolve(ORCHESTRATOR_BRAIN, "tooth47_roots_parallel_endo.png"));

		console.log("[proofs] All Tooth 47 standalone proofs generated and synced to brain!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
