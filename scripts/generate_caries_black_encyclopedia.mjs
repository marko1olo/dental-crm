/**
 * scripts/generate_caries_black_encyclopedia.mjs
 * Generates the definitive clinical atlas for Black's Caries Classification (Classes I-V)
 * and all 4 WHO Depth Levels (Superficialis, Media, Profunda, Destructiva).
 * Mandate 8b: modular, clean, high-resolution rendering.
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
import { DEFAULT_TOOTH46_LAYERS } from "../apps/web/src/components/odontogram/gate0/tooth46Types.ts";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";

const ORCH_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/a6f2b5ab-6bb4-4d96-af8a-9006a477cf49";
const OUT_DIR = resolve("docs/proofs/odontogram/strips");
const SCRATCH_DIR = resolve("scratch");
for (const dir of [OUT_DIR, ORCH_BRAIN, SCRATCH_DIR]) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const def = DEFAULT_TOOTH46_LAYERS;

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

/**
 * 1. Серия панорамных стрипов по классам Блэка и степеням глубины
 */
const CARIES_STRIPS = [
	// Класс I
	{
		id: "black_class1_fissure",
		title: "КЛАСС I ПО БЛЭКУ (CLASS I) — ОККЛЮЗИОННЫЕ ФИССУРЫ И СЛЕПЫЕ ЯМКИ",
		subtitle: "Поражение естественных ямок и фиссур жевательной поверхности моляров/премоляров и слепых ямок фронтальных зубов · Бейдж «C»",
		badgeText: "BLACK CLASS I",
		getPresetId: (num) => "caries",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: "class1",
			cariesDepth: "media",
		}),
	},
	// Класс II
	{
		id: "black_class2_approximal",
		title: "КЛАСС II ПО БЛЭКУ (CLASS II) — КОНТАКТНЫЕ ПОВЕРХНОСТИ ПРЕМОЛЯРОВ И МОЛЯРОВ",
		subtitle: "Апроксимальный кариес боковой группы (48..44): MO (мезиальный), DO (дистальный) и MOD (медиально-окклюзионно-дистальный) · Бейджи «MO / DO / MOD»",
		badgeText: "BLACK CLASS II",
		getPresetId: (num) => {
			if (num === 48 || num === 45) return "caries_class2_do";
			if (num === 47 || num === 44) return "caries_class2_mo";
			if (num === 46) return "caries_class2_mod";
			return "intact";
		},
		getLayers: (num) => {
			if (num === 48) return { ...def, caries: true, cariesType: "class2_do", cariesDepth: "media" };
			if (num === 47) return { ...def, caries: true, cariesType: "class2_mo", cariesDepth: "media" };
			if (num === 46) return { ...def, caries: true, cariesType: "class2_mod", cariesDepth: "profunda" };
			if (num === 45) return { ...def, caries: true, cariesType: "class2_do", cariesDepth: "media" };
			if (num === 44) return { ...def, caries: true, cariesType: "class2_mo", cariesDepth: "media" };
			return { ...def };
		},
	},
	// Класс III
	{
		id: "black_class3_anterior",
		title: "КЛАСС III ПО БЛЭКУ (CLASS III) — КОНТАКТНЫЙ КАРИЕС РЕЗЦОВ И КЛЫКОВ БЕЗ СКОЛА УГЛА",
		subtitle: "Апроксимальные контактные полости фронтальных зубов (43, 42, 41) при ПОЛНОМ СОХРАНЕНИИ режущего края и углов коронки · Бейдж «C3»",
		badgeText: "BLACK CLASS III",
		getPresetId: (num) => (num <= 43 ? "caries_class3" : "intact"),
		getLayers: (num) => {
			if (num <= 43) return { ...def, caries: true, cariesType: "class3", cariesDepth: "media" };
			return { ...def };
		},
	},
	// Класс IV
	{
		id: "black_class4_fracture",
		title: "КЛАСС IV ПО БЛЭКУ (CLASS IV) — СКОЛ РЕЖУЩЕГО УГЛА И РВУЩЕГО БУГРА (С РЕАЛЬНЫМ РАЗРУШЕНИЕМ)",
		subtitle: "Контактный кариес фронтальной группы СО СКОЛОМ угла режущего края резцов и острия клыка в прозрачность (SVG Mask Cutout) · Бейдж «C4»",
		badgeText: "BLACK CLASS IV (DESTRUCTIVE)",
		getPresetId: (num) => (num <= 43 ? "caries_class4" : "intact"),
		getLayers: (num) => {
			if (num <= 43) return { ...def, caries: true, cariesType: "class4", cariesDepth: "destructive" };
			return { ...def };
		},
	},
	// Класс V
	{
		id: "black_class5_cervical",
		title: "КЛАСС V ПО БЛЭКУ (CLASS V) — ПРИШЕЕЧНЫЙ КАРИЕС ВЕСТИБУЛЯРНОЙ ПОВЕРХНОСТИ",
		subtitle: "Серповидные пришеечные полости вдоль эмалево-цементной границы (CEJ) у десневого края на всех зубах квадранта (48..41) · Бейдж «C5»",
		badgeText: "BLACK CLASS V",
		getPresetId: (num) => "caries_class5",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: "class5",
			cariesDepth: "media",
		}),
	},
	// Глубина 1: Поверхностный
	{
		id: "caries_depth1_superficialis",
		title: "ГЛУБИНА 1: CARIES SUPERFICIALIS (НАЧАЛЬНЫЙ / ПОВЕРХНОСТНЫЙ ТЕМНО-ПИГМЕНТИРОВАННЫЙ КАРИЕС)",
		subtitle: "Пигментированная деминерализация эмали без кавитации дентина · Темно-янтарный очаг (не путать с композитом!) · Бейдж «Cs»",
		badgeText: "STAGE 1 · SUPERFICIALIS",
		getPresetId: (num) => "caries_superficial",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: num >= 44 ? "class1" : "class3",
			cariesDepth: "superficial",
		}),
	},
	// Глубина 2: Средний
	{
		id: "caries_depth2_media",
		title: "ГЛУБИНА 2: CARIES MEDIA (СРЕДНИЙ КАРИЕС — ПЛАЩЕВОЙ ДЕНТИН)",
		subtitle: "Сформированная кариозная полость в пределах эмалево-дентинной границы и плащевого дентина (crater) · Бейдж «Cm»",
		badgeText: "STAGE 2 · MEDIA",
		getPresetId: (num) => "caries_media",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: num >= 44 ? "class1" : "class3",
			cariesDepth: "media",
		}),
	},
	// Глубина 3: Глубокий
	{
		id: "caries_depth3_profunda",
		title: "ГЛУБИНА 3: CARIES PROFUNDA (ГЛУБОКИЙ КАРИЕС — ОКОЛОПУЛЬПАРНЫЙ ДЕНТИН)",
		subtitle: "Глубокий некротический кратер над крышей пульпарной камеры · Нависающие подрытые края эмали, риск пульпита · Бейдж «Cp»",
		badgeText: "STAGE 3 · PROFUNDA",
		getPresetId: (num) => "caries_profunda",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: num >= 44 ? "class1" : "class3",
			cariesDepth: "profunda",
		}),
	},
	// Глубина 4: Деструктивный
	{
		id: "caries_depth4_destructiva",
		title: "ГЛУБИНА 4: CARIES DESTRUCTIVA (ДЕСТРУКТИВНЫЙ КАРИЕС — РАЗРУШЕНИЕ КОРОНКИ В ПРОЗРАЧНОСТЬ)",
		subtitle: "Физический скол эмали и дентина насквозь (SVG Transparency Mask) · Обвал бугров моляров (MOD) и скол режущего угла резцов (Class IV) · Бейдж «Cds»",
		badgeText: "STAGE 4 · DESTRUCTIVA (REAL CAVITATION)",
		getPresetId: (num) => "caries_destructive",
		getLayers: (num) => ({
			...def,
			caries: true,
			cariesType: num >= 44 ? "class2_mod" : "class4",
			cariesDepth: "destructive",
		}),
	},
];

function buildStripHtml(cfg) {
	const teethCards = TEETH.map((t) => {
		const layers = cfg.getLayers(t.num);
		const toothElement = React.createElement(t.Component, {
			zoom: 1.45,
			isDark: false,
			presetId: cfg.getPresetId ? cfg.getPresetId(t.num) : cfg.presetId,
			layers,
			badgeRadius: 18.5,
		});

		return React.createElement(
			"div",
			{ key: t.num, className: "tooth-col" },
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
				React.createElement("div", { key: "badge", className: "header-badge" }, cfg.badgeText || "DENTE CLINICAL STRIP"),
				React.createElement("h1", { key: "title", className: "header-title" }, cfg.title),
				React.createElement("p", { key: "subtitle", className: "header-sub" }, cfg.subtitle),
			]),
			React.createElement("div", { key: "row", className: "teeth-row" }, teethCards),
		]
	);

	const innerHtml = renderToStaticMarkup(content);

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${cfg.title}</title>
<style>
:root {
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --ink: #0f172a;
  --sub: #64748b;
  --line: #e2e8f0;
  --accent: #dc2626;
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
  background: rgba(220, 38, 38, 0.12);
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
  background: #f8fafc;
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
  background: #e2e8f0;
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

/**
 * 2. Сводный мега-атлас 4 степеней глубины кариеса (Superficialis -> Media -> Profunda -> Destructiva)
 * По 4 ключевым зубам: Резец 41, Клык 43, Премоляр 44, Моляр 46
 */
function buildDepthAtlasHtml() {
	const KEY_TEETH = [
		{ num: 41, name: "Центральный резец 41", Component: Tooth41Container },
		{ num: 43, name: "Нижний клык 43", Component: Tooth43Container },
		{ num: 44, name: "1-й премоляр 44", Component: Tooth44Container },
		{ num: 46, name: "1-й моляр 46", Component: Tooth46Container },
	];

	const DEPTH_STAGES = [
		{
			id: "superficial",
			code: "Cs",
			name: "1. Caries superficialis",
			sub: "Поверхностный (деминерализация эмали)",
			color: "#f87171",
			getLayers: (num) => ({
				...def,
				caries: true,
				cariesType: num >= 44 ? "class1" : "class3",
				cariesDepth: "superficial",
			}),
		},
		{
			id: "media",
			code: "Cm",
			name: "2. Caries media",
			sub: "Средний (полость в плащевом дентине)",
			color: "#ef4444",
			getLayers: (num) => ({
				...def,
				caries: true,
				cariesType: num >= 44 ? "class1" : "class3",
				cariesDepth: "media",
			}),
		},
		{
			id: "profunda",
			code: "Cp",
			name: "3. Caries profunda",
			sub: "Глубокий (околопульпарный кратер)",
			color: "#dc2626",
			getLayers: (num) => ({
				...def,
				caries: true,
				cariesType: num >= 44 ? "class1" : "class3",
				cariesDepth: "profunda",
			}),
		},
		{
			id: "destructive",
			code: "Cds",
			name: "4. Caries destructiva",
			sub: "Деструктивный (скол коронки в прозрачность)",
			color: "#991b1b",
			getLayers: (num) => ({
				...def,
				caries: true,
				cariesType: num >= 44 ? "class2_mod" : "class4",
				cariesDepth: "destructive",
			}),
		},
	];

	const rows = DEPTH_STAGES.map((stage) => {
		const cols = KEY_TEETH.map((t) => {
			const layers = stage.getLayers(t.num);
			const el = React.createElement(t.Component, {
				zoom: 1.4,
				isDark: false,
				presetId: `caries_${stage.id}`,
				layers,
				badgeRadius: 18.5,
			});
			return React.createElement(
				"div",
				{ key: t.num, className: "atlas-tooth-card" },
				[
					React.createElement("div", { key: "header", className: "card-tooth-label" }, t.name),
					React.createElement("div", { key: "svg", className: "atlas-svg-wrap" }, el),
				]
			);
		});

		return React.createElement(
			"div",
			{ key: stage.id, className: "atlas-stage-row" },
			[
				React.createElement("div", { key: "stage-meta", className: "stage-meta-col", style: { borderLeftColor: stage.color } }, [
					React.createElement("div", { key: "badge", className: "stage-badge", style: { backgroundColor: stage.color } }, stage.code),
					React.createElement("div", { key: "title", className: "stage-title" }, stage.name),
					React.createElement("div", { key: "desc", className: "stage-desc" }, stage.sub),
				]),
				React.createElement("div", { key: "teeth", className: "stage-teeth-grid" }, cols),
			]
		);
	});

	const root = React.createElement(
		"div",
		{ className: "atlas-container" },
		[
			React.createElement("div", { key: "header", className: "atlas-header" }, [
				React.createElement("div", { key: "badge", className: "atlas-top-badge" }, "DENTE CLINICAL ATLAS · WHO CARIES SPECTRUM"),
				React.createElement("h1", { key: "title", className: "atlas-main-title" }, "АТЛАС ГЛУБИНЫ ПОРАЖЕНИЯ И РАЗРУШЕНИЯ КОРОНКИ (4 СТАДИИ ВОЗ)"),
				React.createElement("p", { key: "sub", className: "atlas-sub-title" }, "Эволюция патологического процесса от деминерализации эмали (Superficialis) до физического скола коронки в прозрачность (Destructiva)"),
			]),
			React.createElement("div", { key: "body", className: "atlas-body" }, rows),
		]
	);

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>АТЛАС ГЛУБИНЫ КАРИЕСА</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0f172a;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.atlas-container {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 28px;
  padding: 36px 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  width: 1720px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.atlas-header {
  border-bottom: 1px solid #334155;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.atlas-top-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 12px;
  border-radius: 9999px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}
.atlas-main-title {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
}
.atlas-sub-title {
  font-size: 14px;
  color: #94a3b8;
}
.atlas-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.atlas-stage-row {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: center;
}
.stage-meta-col {
  border-left: 4px solid;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stage-badge {
  align-self: flex-start;
  font-size: 14px;
  font-weight: 900;
  color: #ffffff;
  padding: 3px 10px;
  border-radius: 8px;
}
.stage-title {
  font-size: 16px;
  font-weight: 800;
  color: #f8fafc;
}
.stage-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.3;
}
.stage-teeth-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.atlas-tooth-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-tooth-label {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}
.atlas-svg-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 310px;
}
.atlas-svg-wrap svg {
  overflow: visible;
  display: block;
}
</style>
</head>
<body>
${renderToStaticMarkup(root)}
</body>
</html>`;
}

/**
 * 3. Полный Атлас Класса II по Блэку: Апроксимальная матрица 5 локализаций x 4 глубины
 * (M, D, MO, DO, MOD) x (Superficialis, Media, Profunda, Destructiva) на первом моляре 46
 */
function buildClass2MatrixHtml() {
	const CLASS2_ROWS = [
		{
			id: "m",
			type: "class2_m",
			badgeCode: "M",
			name: "1. Класс II M (Медиальный контакт)",
			desc: "Поражение мезиальной контактной стенки первого моляра 46",
			color: "#f59e0b",
		},
		{
			id: "d",
			type: "class2_d",
			badgeCode: "D",
			name: "2. Класс II D (Дистальный контакт)",
			desc: "Поражение дистальной контактной стенки первого моляра 46",
			color: "#3b82f6",
		},
		{
			id: "mo",
			type: "class2_mo",
			badgeCode: "MO",
			name: "3. Класс II MO (Медио-окклюзионный)",
			desc: "Мезиальный бокс с выходом на окклюзионную фиссуру",
			color: "#ef4444",
		},
		{
			id: "do",
			type: "class2_do",
			badgeCode: "DO",
			name: "4. Класс II DO (Дисто-окклюзионный)",
			desc: "Дистальный бокс с выходом на окклюзионную фиссуру",
			color: "#8b5cf6",
		},
		{
			id: "mod",
			type: "class2_mod",
			badgeCode: "MOD",
			name: "5. Класс II MOD (Сквозной разлом)",
			desc: "Сквозное двустороннее поражение обоих краевых валиков и перешейка",
			color: "#dc2626",
		},
	];

	const DEPTH_COLS = [
		{ depth: "superficial", label: "Superficialis", sub: "Начальный (ореол)", suffix: "s" },
		{ depth: "media", label: "Media", sub: "Средний (кратер дентина)", suffix: "m" },
		{ depth: "profunda", label: "Profunda", sub: "Глубокий (околопульпарный)", suffix: "p" },
		{ depth: "destructive", label: "Destructiva", sub: "Скол стенки в прозрачность", suffix: "ds" },
	];

	const rows = CLASS2_ROWS.map((row) => {
		const cols = DEPTH_COLS.map((col) => {
			const badgeCode = `${row.badgeCode}${col.suffix}`;
			const el = React.createElement(Tooth46Container, {
				zoom: 1.4,
				isDark: false,
				layers: {
					...def,
					caries: true,
					cariesType: row.type,
					cariesDepth: col.depth,
				},
				badgeRadius: 18.5,
			});

			return React.createElement(
				"div",
				{ key: col.depth, className: "atlas-tooth-card" },
				[
					React.createElement("div", { key: "header", className: "card-tooth-label" }, `${badgeCode} · ${col.label}`),
					React.createElement("div", { key: "svg", className: "atlas-svg-wrap" }, el),
				]
			);
		});

		return React.createElement(
			"div",
			{ key: row.id, className: "atlas-stage-row" },
			[
				React.createElement("div", { key: "meta", className: "stage-meta-col", style: { borderLeftColor: row.color } }, [
					React.createElement("div", { key: "badge", className: "stage-badge", style: { backgroundColor: row.color } }, row.badgeCode),
					React.createElement("div", { key: "title", className: "stage-title" }, row.name),
					React.createElement("div", { key: "desc", className: "stage-desc" }, row.desc),
				]),
				React.createElement("div", { key: "teeth", className: "stage-teeth-grid" }, cols),
			]
		);
	});

	const root = React.createElement(
		"div",
		{ className: "atlas-container" },
		[
			React.createElement("div", { key: "header", className: "atlas-header" }, [
				React.createElement("div", { key: "badge", className: "atlas-top-badge" }, "DENTE CLINICAL ATLAS · BLACK CLASS II APPROXIMAL MATRIX"),
				React.createElement("h1", { key: "title", className: "atlas-main-title" }, "АТЛАС КЛАССА II ПО БЛЭКУ: МАТРИЦА ЛОКАЛИЗАЦИЙ И ГЛУБИНЫ (M, D, MO, DO, MOD)"),
				React.createElement("p", { key: "sub", className: "atlas-sub-title" }, "Полная клиническая градация 5 апроксимальных локализаций x 4 степени разрушения на первом моляре 46 (20 состояний со сколами стенок)"),
			]),
			React.createElement("div", { key: "body", className: "atlas-body" }, rows),
		]
	);

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>АТЛАС КЛАССА II ПО БЛЭКУ (APPROXIMAL MATRIX)</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0f172a;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.atlas-container {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 28px;
  padding: 36px 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  width: 1720px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.atlas-header {
  border-bottom: 1px solid #334155;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.atlas-top-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 12px;
  border-radius: 9999px;
  background: rgba(220, 38, 38, 0.2);
  color: #ef4444;
}
.atlas-main-title {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
}
.atlas-sub-title {
  font-size: 14px;
  color: #94a3b8;
}
.atlas-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.atlas-stage-row {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: center;
}
.stage-meta-col {
  border-left: 4px solid;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stage-badge {
  align-self: flex-start;
  font-size: 14px;
  font-weight: 900;
  color: #ffffff;
  padding: 3px 10px;
  border-radius: 8px;
}
.stage-title {
  font-size: 16px;
  font-weight: 800;
  color: #f8fafc;
}
.stage-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.3;
}
.stage-teeth-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.atlas-tooth-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-tooth-label {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}
.atlas-svg-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 310px;
}
.atlas-svg-wrap svg {
  overflow: visible;
  display: block;
}
</style>
</head>
<body>
${renderToStaticMarkup(root)}
</body>
</html>`;
}

async function run() {
	console.log(`[caries-encyclopedia] Launching browser to capture ${CARIES_STRIPS.length} strips + Master Depth Atlas...`);
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage({
			viewport: { width: 1800, height: 760 },
			deviceScaleFactor: 1.5,
		});

		// 1. Рендер панорамных стрипов классов Блэка и стадий глубины
		for (const cfg of CARIES_STRIPS) {
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
			console.log(`[caries-encyclopedia] Generated & synced: strip_${cfg.id}.png`);
		}

		// 2. Рендер сводного Мастер-Атласа глубины
		const depthHtml = buildDepthAtlasHtml();
		const depthHtmlPath = resolve("scratch/atlas_caries_depth_evolution.html");
		writeFileSync(depthHtmlPath, depthHtml);

		const atlasPage = await browser.newPage({
			viewport: { width: 1800, height: 1600 },
			deviceScaleFactor: 1.5,
		});
		await atlasPage.goto(`file:///${depthHtmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const atlasContainer = await atlasPage.$(".atlas-container");
		const atlasOutPng = resolve(OUT_DIR, "atlas_caries_depth_evolution.png");
		if (atlasContainer) {
			await atlasContainer.screenshot({ path: atlasOutPng });
		} else {
			await atlasPage.screenshot({ path: atlasOutPng });
		}
		const atlasBrainPng = resolve(ORCH_BRAIN, "atlas_caries_depth_evolution.png");
		copyFileSync(atlasOutPng, atlasBrainPng);
		console.log("[caries-encyclopedia] Generated & synced: atlas_caries_depth_evolution.png");

		// 3. Рендер полного Атласа Класса II (5 строк x 4 колонки)
		const class2Html = buildClass2MatrixHtml();
		const class2HtmlPath = resolve("scratch/atlas_class2_approximal_matrix.html");
		writeFileSync(class2HtmlPath, class2Html);

		const class2Page = await browser.newPage({
			viewport: { width: 1800, height: 2200 },
			deviceScaleFactor: 1.5,
		});
		await class2Page.goto(`file:///${class2HtmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
		const class2Container = await class2Page.$(".atlas-container");
		const class2OutPng = resolve(OUT_DIR, "atlas_class2_approximal_matrix.png");
		if (class2Container) {
			await class2Container.screenshot({ path: class2OutPng });
		} else {
			await class2Page.screenshot({ path: class2OutPng });
		}
		const class2BrainPng = resolve(ORCH_BRAIN, "atlas_class2_approximal_matrix.png");
		copyFileSync(class2OutPng, class2BrainPng);
		console.log("[caries-encyclopedia] Generated & synced: atlas_class2_approximal_matrix.png");

		console.log("[caries-encyclopedia] SUCCESS! All clinical caries strips and atlas successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[caries-encyclopedia] Fatal error:", err);
	process.exit(1);
});
