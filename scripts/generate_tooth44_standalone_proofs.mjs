/**
 * scripts/generate_tooth44_standalone_proofs.mjs
 * Standalone HTML render & capture of 5 visual proofs for Tooth 44 (Mandate 8b <= 120 lines).
 */
import React from "react";
globalThis.React = React;
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Tooth44Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth44/index.ts";
import { Tooth46FullArchMockup } from "../apps/web/src/components/odontogram/gate0/archMockup/Tooth46FullArchMockup.tsx";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";

const ORCH_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/a6f2b5ab-6bb4-4d96-af8a-9006a477cf49";
const SUB_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/6008b223-a484-402c-9a6a-cbf4fcb911d8";
const OUT_DIR = resolve("docs/proofs/odontogram/tooth44");
for (const dir of [OUT_DIR, ORCH_BRAIN, SUB_BRAIN]) if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

function wrapHtml(content, isDark = false, title = "Tooth 44") {
	return `<!DOCTYPE html><html class="${isDark ? "dark" : ""}" data-theme="${isDark ? "dark" : "light"}">
<head><meta charset="utf-8"><title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
:root { --paper: #ffffff; --paper-strong: #f8fafc; --ink: #0f172a; --line: #e2e8f0; }
:root.dark { --paper: #090d16; --paper-strong: #0f172a; --ink: #f8fafc; --line: #1e293b; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; min-height: 100vh; background: var(--paper); color: var(--ink);
  font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tooth-card { background: var(--paper-strong); border: 1px solid var(--line); border-radius: 20px;
  padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.badge-tag { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; background: rgba(20, 184, 166, 0.15); color: #0d9488; }
.dark .badge-tag { color: #2dd4bf; }
</style></head><body>${content}</body></html>`;
}

function syncProof(p, file) {
	copyFileSync(p, resolve(ORCH_BRAIN, file));
	copyFileSync(p, resolve(SUB_BRAIN, file));
}

async function run() {
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		// 1. PC Light
		const sLight = renderToStaticMarkup(React.createElement("div", { className: "tooth-card" }, [
			React.createElement("div", { key: "h", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
				React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "DENTE Gate 1 — Зуб 44 (Первый нижний премоляр)"),
				React.createElement("span", { key: "t2", className: "badge-tag" }, "Wheeler Ch. 11 · 2 асимметричных бугра · Crista Transversa · 1 корень · XXL 37px"),
			]),
			React.createElement(Tooth44Container, { key: "tooth", zoom: 2.2, isDark: false }),
		]));
		const f1 = resolve("scratch/tooth44_light.html");
		writeFileSync(f1, wrapHtml(sLight, false, "Tooth 44 Light"));
		await page.goto(`file:///${f1.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const p1 = resolve(OUT_DIR, "tooth44_pc_light_1440x900.png");
		await page.screenshot({ path: p1 });
		syncProof(p1, "tooth44_pc_light_1440x900.png");

		// 2. PC Dark
		const sDark = renderToStaticMarkup(React.createElement("div", { className: "tooth-card" }, [
			React.createElement("div", { key: "h", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
				React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "DENTE Gate 1 — Зуб 44 (Dark Mode)"),
				React.createElement("span", { key: "t2", className: "badge-tag" }, "Apple HIG Dark Shaders · Crista Transversa · XXL 37px"),
			]),
			React.createElement(Tooth44Container, { key: "tooth", zoom: 2.2, isDark: true }),
		]));
		const f2 = resolve("scratch/tooth44_dark.html");
		writeFileSync(f2, wrapHtml(sDark, true, "Tooth 44 Dark"));
		await page.goto(`file:///${f2.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const p2 = resolve(OUT_DIR, "tooth44_pc_dark_1440x900.png");
		await page.screenshot({ path: p2 });
		syncProof(p2, "tooth44_pc_dark_1440x900.png");

		// 3. Macro asymmetric cusps & crista transversa
		const p3 = resolve(OUT_DIR, "tooth44_macro_asymmetric_cusps_crista.png");
		const svgEl = await page.$("svg");
		if (svgEl) await svgEl.screenshot({ path: p3 });
		syncProof(p3, "tooth44_macro_asymmetric_cusps_crista.png");

		// 4. Endodontics: Single Conical Root + 1 Central Oval Canal
		const sEndo = renderToStaticMarkup(React.createElement("div", { className: "tooth-card" }, [
			React.createElement("div", { key: "h", style: { display: "flex", gap: "8px", alignItems: "center" } }, [
				React.createElement("span", { key: "t1", style: { fontWeight: "bold" } }, "Зуб 44 — 1 центральный канал (Main)"),
				React.createElement("span", { key: "t2", className: "badge-tag" }, "Обтурация гуттаперчей · Одиночный конический корень"),
			]),
			React.createElement(Tooth44Container, {
				key: "tooth", zoom: 2.5, isDark: false,
				layers: { roots: true, crown: true, canals: true, pulp: true, guttaPercha: true, canalCondition: "adequate" },
			}),
		]));
		const f4 = resolve("scratch/tooth44_endo.html");
		writeFileSync(f4, wrapHtml(sEndo, false, "Tooth 44 Endo"));
		await page.goto(`file:///${f4.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const p4 = resolve(OUT_DIR, "tooth44_root_single_oval_endo.png");
		const endoEl = await page.$("svg");
		if (endoEl) await endoEl.screenshot({ path: p4 });
		syncProof(p4, "tooth44_root_single_oval_endo.png");

		// 5. Full 32-tooth Arch with mounted 48, 47, 46, 45, 44 & 34, 35, 37, 38
		const sArch = renderToStaticMarkup(React.createElement(Tooth46FullArchMockup, { isDark: false, initialSize: "xxl" }));
		const f5 = resolve("scratch/tooth44_arch.html");
		writeFileSync(f5, wrapHtml(sArch, false, "Full Arch Tooth 44"));
		await page.goto(`file:///${f5.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const p5 = resolve(OUT_DIR, "tooth44_arch32_mounting.png");
		await page.screenshot({ path: p5 });
		syncProof(p5, "tooth44_arch32_mounting.png");
		console.log("[proofs] All Tooth 44 standalone proofs generated and synced to brain!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => { console.error(err); process.exit(1); });
