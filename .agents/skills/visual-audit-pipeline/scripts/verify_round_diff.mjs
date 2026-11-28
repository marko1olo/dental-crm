#!/usr/bin/env node
/**
 * verify_round_diff.mjs — Инструмент Фазы 4 (Verifier).
 *
 * Сравнивает DOM X-Ray метрики Раунда N vs Раунда N-1 по каждой паре снимков.
 * Выявляет:
 *  - Улучшения (было -> стало)
 *  - Регрессии (стало хуже, чем в предыдущем раунде — жёсткий красный флаг!)
 *  - Незакрытые технические маркеры (overflow, clipped, undersized, dark blobs, leaks)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

function parseArgs(argv) {
	const opts = {
		prevRound: 1,
		currRound: 2,
		artifactsRoot: path.join(REPO_ROOT, "artifacts", "visual-audit"),
		outFile: null,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--prev" && argv[i + 1]) opts.prevRound = Number.parseInt(argv[++i], 10);
		else if (a === "--curr" && argv[i + 1]) opts.currRound = Number.parseInt(argv[++i], 10);
		else if (a === "--artifacts-root" && argv[i + 1]) opts.artifactsRoot = path.resolve(argv[++i]);
		else if (a === "--out" && argv[i + 1]) opts.outFile = path.resolve(argv[++i]);
	}
	if (!opts.outFile) {
		opts.outFile = path.join(REPO_ROOT, "docs", "audits", "visual-pipeline", `ROUND_${opts.currRound}_VERIFICATION_DIFF.md`);
	}
	return opts;
}

function loadMetricsMap(shotsDir) {
	const map = new Map();
	if (!existsSync(shotsDir)) return map;
	for (const f of readdirSync(shotsDir).filter((n) => n.endsWith(".metrics.json")).sort()) {
		const data = JSON.parse(readFileSync(path.join(shotsDir, f), "utf8"));
		map.set(f.replace(".metrics.json", ""), data);
	}
	return map;
}

const NUMERIC_COUNTERS = [
	{ key: "horizontalOverflowPx", label: "Overflow-X (px)", getter: (m) => m.dom?.horizontalOverflowPx ?? 0 },
	{ key: "viewportClippedControlsCount", label: "Обрезка кнопок краем экрана", getter: (m) => m.dom?.viewportClippedControlsCount ?? 0 },
	{ key: "clippedTextsCount", label: "Обрезка текста", getter: (m) => m.dom?.clippedTextsCount ?? 0 },
	{ key: "undersizedTargetsCount", label: "Мелкие тач/кнопки", getter: (m) => m.dom?.undersizedTargetsCount ?? 0 },
	{ key: "tableRowPrimaryButtonsCount", label: "Забор Primary в таблицах", getter: (m) => m.dom?.tableRowPrimaryButtonsCount ?? 0 },
	{ key: "lowContrastControlsCount", label: "Низкий контраст / неон кнопок", getter: (m) => m.dom?.lowContrastControlsCount ?? 0 },
	{ key: "blueDarkCardsCount", label: "Синие карты #1e293b в Dark", getter: (m) => m.dom?.blueDarkCardsCount ?? 0 },
	{ key: "duplicateCloseButtonsCount", label: "Дубль [X]+Закрыть", getter: (m) => m.dom?.duplicateCloseButtonsCount ?? 0 },
	{ key: "allCapsViolationsCount", label: "Капслок", getter: (m) => m.dom?.allCapsViolationsCount ?? 0 },
	{ key: "inputIconOverlapsCount", label: "Наезд иконки на инпут", getter: (m) => m.dom?.inputIconOverlapsCount ?? 0 },
	{ key: "darkModeWhiteBlobsCount", label: "Белые пятна Dark", getter: (m) => m.dom?.darkModeWhiteBlobsCount ?? 0 },
	{ key: "overlappingControlsCount", label: "Наложения кнопок и FAB", getter: (m) => (m.dom?.overlappingControlsCount ?? 0) + (m.dom?.fabOverlapsCount ?? 0) },
	{ key: "consoleErrorsCount", label: "Ошибки консоли", getter: (m) => m.consoleErrors?.length ?? 0 },
];

export function compareRounds({ prevRound, currRound, artifactsRoot, outFile }) {
	const prevMap = loadMetricsMap(path.join(artifactsRoot, `round_${prevRound}`, "shots"));
	const currMap = loadMetricsMap(path.join(artifactsRoot, `round_${currRound}`, "shots"));

	const regressions = [];
	const improvements = [];
	const remainingIssues = [];

	for (const [shotKey, curr] of currMap.entries()) {
		const prev = prevMap.get(shotKey);
		for (const metric of NUMERIC_COUNTERS) {
			const cVal = metric.getter(curr);
			const pVal = prev ? metric.getter(prev) : null;
			if (pVal !== null && cVal > pVal) {
				regressions.push({ shotKey, metric: metric.label, prev: pVal, curr: cVal });
			} else if (pVal !== null && cVal < pVal) {
				improvements.push({ shotKey, metric: metric.label, prev: pVal, curr: cVal });
			}
			if (cVal > 0) {
				remainingIssues.push({ shotKey, metric: metric.label, curr: cVal });
			}
		}
		const cCta = curr.dom?.primaryCtaCount ?? 0;
		const pCta = prev ? (prev.dom?.primaryCtaCount ?? 0) : null;
		if (cCta > 1 && (pCta === null || cCta > pCta)) {
			regressions.push({ shotKey, metric: "Конкурирующие Primary CTA (>1)", prev: pCta ?? 0, curr: cCta });
		}
	}

	const lines = [
		`# 🔍 VERIFICATION DIFF: РАУНД ${prevRound} → РАУНД ${currRound}`,
		"",
		`> **Снимков в раунде ${prevRound}:** ${prevMap.size} | **В раунде ${currRound}:** ${currMap.size}`,
		`> **Улучшений:** ${improvements.length} | **Регрессий:** ${regressions.length} | **Остаточных DOM-сигналов:** ${remainingIssues.length}`,
		"",
		"## 🚨 РЕГРЕССИИ (СТАЛО ХУЖЕ)",
		...(regressions.length === 0
			? ["_Регрессий не обнаружено._"]
			: regressions.map((r) => `- **${r.shotKey}** · ${r.metric}: \`${r.prev} → ${r.curr}\``)),
		"",
		"## ✅ УЛУЧШЕНИЯ (ДО → ПОСЛЕ)",
		...(improvements.length === 0
			? ["_Нет зафиксированных дельт._"]
			: improvements.map((im) => `- **${im.shotKey}** · ${im.metric}: \`${im.prev} → ${im.curr}\``)),
		"",
		"## ⚠️ ОСТАТОЧНЫЕ DOM-СИГНАЛЫ В РАУНДЕ " + currRound,
		...(remainingIssues.length === 0
			? ["_Все автоматические DOM-счётчики на нуле._"]
			: remainingIssues.slice(0, 80).map((rem) => `- **${rem.shotKey}** · ${rem.metric}: \`${rem.curr}\``)),
		"",
	];

	if (outFile) {
		mkdirSync(path.dirname(outFile), { recursive: true });
		writeFileSync(outFile, lines.join("\n"), "utf8");
	}

	return {
		prevShots: prevMap.size,
		currShots: currMap.size,
		regressions,
		improvements,
		remainingIssues,
		outFile,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
	const opts = parseArgs(process.argv.slice(2));
	const res = compareRounds(opts);
	process.stdout.write(`🔍 Diff R${opts.prevRound} -> R${opts.currRound}: improvements=${res.improvements.length}, regressions=${res.regressions.length}, remaining=${res.remainingIssues.length}\n`);
	process.stdout.write(`   Report: ${res.outFile}\n`);
	if (res.regressions.length > 0) process.exit(1);
}
