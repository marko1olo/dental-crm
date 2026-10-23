/**
 * scripts/generate_all_teeth_strips.mjs
 * Generates horizontal strip collages for all finished lower teeth (48, 47, 46, 45, 44, 43, 42, 41)
 * across key clinical states and pathologies with Wheeler Ch. 1 anatomical proportions.
 * Mandate 8b: clean modular code.
 */

import React from "react";
globalThis.React = React;
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { Tooth41Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth41/index.ts";
import { Tooth42Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth42/index.ts";
import { Tooth43Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth43/index.ts";
import { Tooth44Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth44/index.ts";
import { Tooth45Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth45/index.ts";
import { Tooth46Container } from "../apps/web/src/components/odontogram/gate0/Tooth46Container.tsx";
import { Tooth47Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth47/index.ts";
import { Tooth48Container } from "../apps/web/src/components/odontogram/gate0/teeth/tooth48/index.ts";
import { TOOTH46_PRESETS } from "../apps/web/src/components/odontogram/gate0/Tooth46ClinicalPresets.ts";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";

const ORCH_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/a6f2b5ab-6bb4-4d96-af8a-9006a477cf49";
const OUT_DIR = resolve("docs/proofs/odontogram/strips");
const SCRATCH_DIR = resolve("scratch");
for (const dir of [OUT_DIR, ORCH_BRAIN, SCRATCH_DIR]) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Wheeler Ch. 1 Mandibular Relative Scale: 48 (10mm), 47 (10.5mm), 46 (11mm), 45 (7mm), 44 (7mm), 43 (7.5mm), 42 (5.5mm), 41 (5mm)
const TEETH = [
	{ num: 48, name: "3-й моляр", trait: "Сросшиеся корни · C-канал · 10мм", Component: Tooth48Container },
	{ num: 47, name: "2-й моляр", trait: "4 бугра · 2 пар. корня · 10.5мм", Component: Tooth47Container },
	{ num: 46, name: "1-й моляр", trait: "5 бугров · Y-5 · 2 корня · 11мм", Component: Tooth46Container },
	{ num: 45, name: "2-й премоляр", trait: "3 бугорка · Y-фиссура · 7мм", Component: Tooth45Container },
	{ num: 44, name: "1-й премоляр", trait: "Crista Transversa · 1 корень · 7мм", Component: Tooth44Container },
	{ num: 43, name: "Нижний клык", trait: "Рвущий бугор · Самый длинный · 7.5мм", Component: Tooth43Container },
	{ num: 42, name: "Боковой резец", trait: "Скругленный угол · 1 корень · 5.5мм", Component: Tooth42Container },
	{ num: 41, name: "Центр. резец", trait: "Узкое долото (38px) · 1 корень · 5мм", Component: Tooth41Container },
];

const STRIPS_CONFIG = [
	{
		id: "01_norm_intact",
		presetId: "intact",
		title: "1. ФИЗИОЛОГИЧЕСКАЯ НОРМА (ИНТАКТНЫЕ ЗУБЫ) — WHEELER PROPORTIONS",
		subtitle: "Соматически здоров · Анатомический масштаб Wheeler Ch. 1 (5.0–11.0 мм) · Бейдж XXL (37px) «✓»",
		isDark: false,
	},
	{
		id: "02_caries_fissures",
		presetId: "caries",
		title: "2. ФИССУРНЫЙ И ПРИШЕЕЧНЫЙ КАРИЕС",
		subtitle: "Органическая деструкция фиссур, ямок и контактных пунктов · Бейдж XXL (37px) «C»",
		isDark: false,
	},
	{
		id: "03_acute_pulpitis",
		presetId: "pulpitis",
		title: "3. ОСТРЫЙ ПУЛЬПИТ (ГИПЕРЕМИЯ ПУЛЬПЫ)",
		subtitle: "Просвечивающая пульпарная камера · Сосудистая гиперемия рогов пульпы · Бейдж «P»",
		isDark: false,
	},
	{
		id: "04_periodontitis_granuloma",
		presetId: "periodontitis",
		title: "4. ПЕРИОДОНТИТ / ПЕРИАПИКАЛЬНАЯ ГРАНУЛЕМА",
		subtitle: "Некроз пульпы · Воспалительный ореол деструкции кости у верхушек корней · Бейдж «Pt»",
		isDark: false,
	},
	{
		id: "05_endodontics_treated",
		presetId: "endodontics",
		title: "5. ЭНДОДОНТИЯ (ОБТУРАЦИЯ ГУТТАПЕРЧЕЙ)",
		subtitle: "Пломбировка каналов розовой гуттаперчей · Апикальный силерный пафф · Бейдж «Э»",
		isDark: false,
	},
	{
		id: "06_prosthetics_crowns",
		presetId: "crown",
		title: "6. ОРТОПЕДИЯ: ИСКУССТВЕННЫЕ КОРОНКИ (ЦИРКОНИЙ)",
		subtitle: "Анатомический циркониевый купол с круговым уступом · Бейдж «К»",
		isDark: false,
	},
	{
		id: "07_restorations_fillings",
		presetId: "composite",
		title: "7. РЕСТАВРАЦИИ / КОМПОЗИТНЫЕ ПЛОМБЫ",
		subtitle: "Светоотверждаемый наногибридный композит A2/A3 · Бейдж «П»",
		isDark: false,
	},
	{
		id: "08_surgery_implants",
		presetId: "implant",
		title: "8. ХИРУРГИЯ: ДЕНТАЛЬНЫЕ ИМПЛАНТАТЫ",
		subtitle: "Титановые винты с остеоинтеграционной микрорезьбой · Бейдж «И»",
		isDark: false,
	},
	{
		id: "09_broken_file",
		presetId: "broken_file",
		title: "9. ОСЛОЖНЕНИЯ: ОБЛОМОК ИНСТРУМЕНТА В КАНАЛЕ",
		subtitle: "Металлический фрагмент эндо-файла в апикальной трети · Бейдж «Ин»",
		isDark: false,
	},
	{
		id: "10_dark_mode_all_teeth",
		presetId: "intact",
		title: "10. APPLE HIG DARK MODE — СВЕТОТЕНЕВАЯ МОДЕЛЬ В ТЕМНОЙ ТЕМЕ",
		subtitle: "Фарфоровые шейдеры темной темы · Неоновый контраст статусного кружка XXL",
		isDark: true,
	},
];

function getPreset(presetId) {
	return TOOTH46_PRESETS.find((p) => p.id === presetId) || TOOTH46_PRESETS[0];
}

function buildStripHtml(cfg) {
	const preset = getPreset(cfg.presetId);
	const isDark = cfg.isDark;

	const teethCards = TEETH.map((t) => {
		const toothElement = React.createElement(t.Component, {
			zoom: 1.45,
			isDark,
			presetId: preset.id,
			layers: preset.layers,
			badgeRadius: 18.5,
		});

		return React.createElement(
			"div",
			{
				key: t.num,
				className: "tooth-col",
			},
			[
				React.createElement("div", { key: "meta", className: "col-meta" }, [
					React.createElement("div", { key: "pill", className: "fdi-pill" }, `Зуб ${t.num}`),
					React.createElement("div", { key: "name", className: "tooth-title" }, t.name),
					React.createElement("div", { key: "trait", className: "tooth-trait" }, t.trait),
				]),
				React.createElement("div", { key: "svg-box", className: "svg-wrapper" }, toothElement),
			]
		);
	});

	const content = React.createElement(
		"div",
		{ className: "strip-container" },
		[
			React.createElement("div", { key: "header", className: "strip-header" }, [
				React.createElement("div", { key: "badge", className: "header-badge" }, "DENTE CLINICAL STRIP"),
				React.createElement("h1", { key: "title", className: "header-title" }, cfg.title),
				React.createElement("p", { key: "subtitle", className: "header-sub" }, cfg.subtitle),
			]),
			React.createElement("div", { key: "row", className: "teeth-row" }, teethCards),
		]
	);

	const innerHtml = renderToStaticMarkup(content);

	return `<!DOCTYPE html>
<html class="${isDark ? "dark" : ""}" data-theme="${isDark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<title>${cfg.title}</title>
<style>
:root {
  --bg: #f1f5f9;
  --card-bg: #ffffff;
  --ink: #0f172a;
  --sub: #64748b;
  --line: #e2e8f0;
  --accent: #0d9488;
}
:root.dark {
  --bg: #090d16;
  --card-bg: #0f172a;
  --ink: #f8fafc;
  --sub: #94a3b8;
  --line: #1e293b;
  --accent: #2dd4bf;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.strip-container {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 28px 32px 36px 32px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.08);
  width: 1720px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.strip-header {
  border-bottom: 1px solid var(--line);
  padding-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.header-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(13, 148, 136, 0.12);
  color: var(--accent);
}
.header-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.header-sub {
  font-size: 13px;
  font-weight: 500;
  color: var(--sub);
}
.teeth-row {
  display: grid;
  grid-template-columns: 10fr 10.5fr 11fr 7fr 7fr 7.5fr 5.5fr 5fr;
  gap: 10px;
  align-items: stretch;
}
.tooth-col {
  background: ${isDark ? "#141e33" : "#f8fafc"};
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px 6px 18px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}
.col-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  width: 100%;
}
.fdi-pill {
  font-size: 14px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 8px;
  background: ${isDark ? "#1e293b" : "#e2e8f0"};
  color: var(--ink);
}
.tooth-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
}
.tooth-trait {
  font-size: 10px;
  color: var(--sub);
  line-height: 1.25;
  min-height: 28px;
}
.svg-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 350px;
  padding-top: 8px;
}
.svg-wrapper svg {
  overflow: visible;
  display: block;
}
</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

async function run() {
	console.log(`[strips] Starting capture of ${STRIPS_CONFIG.length} clinical strips with Wheeler proportions...`);
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage({
			viewport: { width: 1800, height: 760 },
			deviceScaleFactor: 1.5,
		});

		for (const cfg of STRIPS_CONFIG) {
			const html = buildStripHtml(cfg);
			const htmlPath = resolve(`scratch/strip_${cfg.id}.html`);
			writeFileSync(htmlPath, html);

			await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
			const container = await page.$(".strip-container");
			const outPng = resolve(OUT_DIR, `strip_${cfg.id}.png`);
			if (container) {
				await container.screenshot({ path: outPng });
			} else {
				await page.screenshot({ path: outPng });
			}

			const brainPng = resolve(ORCH_BRAIN, `strip_${cfg.id}.png`);
			copyFileSync(outPng, brainPng);
			console.log(`[strips] Generated & synced: strip_${cfg.id}.png`);
		}
		console.log("[strips] All 10 clinical strip collages successfully generated!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[strips] Fatal error:", err);
	process.exit(1);
});
