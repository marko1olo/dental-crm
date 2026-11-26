#!/usr/bin/env node
/**
 * aggregate_verdicts.mjs — Компилятор вердиктов критиков и сквозного леджера дефектов.
 *
 * Гарантирует 0% потери мелких дефектов:
 *  1. Читает все *.json вердикты из artifacts/visual-audit/round_{N}/verdicts/
 *  2. Валидирует структуру (запрещает ленивые отписки без 9 осей или без деталей дефекта)
 *  3. Сливает с существующим docs/audits/visual-pipeline/DEFECT_LEDGER.json (сохраняя историю статусов)
 *  4. Разделяет дефекты строго на FOUNDATION (общие токены/CSS/примитивы) и DOMAIN_LOCAL
 *  5. Генерирует:
 *     - docs/audits/visual-pipeline/DEFECT_LEDGER.json
 *     - docs/audits/visual-pipeline/ROUND_{N}_MASTER_REGISTRY.md
 *     - docs/audits/visual-pipeline/batches/round_{N}/FOUNDATION_batch.md
 *     - docs/audits/visual-pipeline/batches/round_{N}/{domain}_batch.md
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const REQUIRED_AXES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const VALID_SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);
const VALID_SCOPES = new Set(["FOUNDATION", "DOMAIN_LOCAL"]);

function parseArgs(argv) {
	const opts = {
		round: 1,
		verdictsDir: null,
		outDir: path.join(REPO_ROOT, "docs", "audits", "visual-pipeline"),
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--round" && argv[i + 1]) opts.round = Number.parseInt(argv[++i], 10) || 1;
		else if (a === "--verdicts-dir" && argv[i + 1]) opts.verdictsDir = path.resolve(argv[++i]);
		else if (a === "--out-dir" && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
	}
	if (!opts.verdictsDir) {
		opts.verdictsDir = path.join(REPO_ROOT, "artifacts", "visual-audit", `round_${opts.round}`, "verdicts");
	}
	return opts;
}

export function validateVerdictPayload(verdict, filename) {
	const errors = [];
	if (!verdict || typeof verdict !== "object") {
		return [`${filename}: payload must be a JSON object`];
	}
	if (!verdict.targetId || !verdict.component || !verdict.domain) {
		errors.push(`${filename}: missing required targetId, component, or domain`);
	}
	if (!Array.isArray(verdict.axes) || verdict.axes.length < 9) {
		errors.push(`${filename}: must evaluate all 9 axes explicitly (found ${verdict.axes?.length ?? 0})`);
	} else {
		const presentAxes = new Set(verdict.axes.map((a) => Number(a.axis)));
		for (const req of REQUIRED_AXES) {
			if (!presentAxes.has(req)) errors.push(`${filename}: missing evaluation for Axis ${req}`);
		}
		for (const a of verdict.axes) {
			if (a.status !== "CLEAN" && a.status !== "DEFECT") {
				errors.push(`${filename}: Axis ${a.axis} has invalid status "${a.status}"`);
			}
			if (!a.evidence || String(a.evidence).trim().length < 5) {
				errors.push(`${filename}: Axis ${a.axis} missing concrete evidence`);
			}
		}
	}
	if (!Array.isArray(verdict.defects)) {
		errors.push(`${filename}: defects must be an array`);
	} else {
		for (let i = 0; i < verdict.defects.length; i++) {
			const d = verdict.defects[i];
			if (!VALID_SEVERITIES.has(d.severity)) {
				errors.push(`${filename}: defect[${i}] invalid severity "${d.severity}"`);
			}
			if (!VALID_SCOPES.has(d.scopeType)) {
				errors.push(`${filename}: defect[${i}] invalid scopeType "${d.scopeType}" (expected FOUNDATION or DOMAIN_LOCAL)`);
			}
			if (!d.observation || String(d.observation).trim().length < 10) {
				errors.push(`${filename}: defect[${i}] observation too short or empty`);
			}
			if (!d.designerProposal || String(d.designerProposal).trim().length < 10) {
				errors.push(`${filename}: defect[${i}] missing actionable designerProposal`);
			}
		}
	}
	return errors;
}

function makeFingerprint(domain, component, d) {
	return `${domain}::${component}::${d.axis}::${d.zone || "global"}::${(d.elementSelector || d.observation).slice(0, 60).toLowerCase()}`;
}

export function runAggregation({ round, verdictsDir, outDir }) {
	mkdirSync(outDir, { recursive: true });
	const batchesDir = path.join(outDir, "batches", `round_${round}`);
	mkdirSync(batchesDir, { recursive: true });

	const ledgerPath = path.join(outDir, "DEFECT_LEDGER.json");
	let ledger = {
		version: 1,
		lastRound: round,
		updatedAt: new Date().toISOString(),
		protectedCleanTargets: [],
		defects: [],
	};
	if (existsSync(ledgerPath)) {
		ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
	}

	const existingByFp = new Map(ledger.defects.map((d) => [d.fingerprint, d]));
	let nextSeq = ledger.defects.length + 1;

	const files = existsSync(verdictsDir)
		? readdirSync(verdictsDir).filter((f) => f.endsWith(".json")).sort()
		: [];

	const validationFailures = [];
	const protectedClean = new Set(ledger.protectedCleanTargets || []);
	let processedVerdicts = 0;

	for (const file of files) {
		const raw = JSON.parse(readFileSync(path.join(verdictsDir, file), "utf8"));
		const errs = validateVerdictPayload(raw, file);
		if (errs.length > 0) {
			validationFailures.push(...errs);
			continue;
		}
		processedVerdicts++;

		if (raw.defects.length === 0) {
			protectedClean.add(`${raw.targetId}_${raw.component}`);
		} else {
			protectedClean.delete(`${raw.targetId}_${raw.component}`);
		}

		for (const d of raw.defects) {
			const fp = makeFingerprint(raw.domain, raw.component, d);
			const existing = existingByFp.get(fp);
			if (existing) {
				existing.lastSeenRound = round;
				existing.severity = d.severity;
				existing.observation = d.observation;
				existing.designerProposal = d.designerProposal;
				existing.fileHint = d.fileHint || existing.fileHint;
				existing.screenshotRef = d.screenshotRef || raw.screenshotRef || existing.screenshotRef;
				existing.domEvidence = d.domEvidence || existing.domEvidence;
				if (existing.status === "FIXED" || existing.status === "VERIFIED") {
					existing.status = "REOPENED";
					existing.history.push({ round, event: "REOPENED", note: d.observation });
				}
			} else {
				const id = `VAP-R${round}-${String(nextSeq++).padStart(4, "0")}`;
				const record = {
					id,
					fingerprint: fp,
					firstSeenRound: round,
					lastSeenRound: round,
					targetId: raw.targetId,
					domain: raw.domain,
					component: raw.component,
					viewport: d.viewport || raw.viewport || "all",
					theme: d.theme || raw.theme || "all",
					axis: Number(d.axis),
					severity: d.severity,
					scopeType: d.scopeType,
					zone: d.zone || "general",
					elementSelector: d.elementSelector || null,
					elementText: d.elementText || null,
					fileHint: d.fileHint || null,
					observation: d.observation,
					designerProposal: d.designerProposal,
					domEvidence: d.domEvidence || null,
					screenshotRef: d.screenshotRef || raw.screenshotRef || null,
					status: "OPEN",
					fixedInCommit: null,
					history: [{ round, event: "OPENED", note: d.observation }],
				};
				ledger.defects.push(record);
				existingByFp.set(fp, record);
			}
		}
	}

	if (validationFailures.length > 0) {
		throw new Error(`REJECTED LAZY/INVALID VERDICTS:\n  - ${validationFailures.join("\n  - ")}`);
	}

	ledger.lastRound = round;
	ledger.updatedAt = new Date().toISOString();
	ledger.protectedCleanTargets = [...protectedClean].sort();
	writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");

	const activeDefects = ledger.defects.filter((d) => d.status === "OPEN" || d.status === "REOPENED" || d.status === "IN_PROGRESS");
	const bySev = { P0: 0, P1: 0, P2: 0, P3: 0 };
	const byAxis = {};
	const byScope = { FOUNDATION: [], DOMAIN_LOCAL: new Map() };

	for (const d of activeDefects) {
		bySev[d.severity] = (bySev[d.severity] || 0) + 1;
		byAxis[d.axis] = (byAxis[d.axis] || 0) + 1;
		if (d.scopeType === "FOUNDATION") {
			byScope.FOUNDATION.push(d);
		} else {
			if (!byScope.DOMAIN_LOCAL.has(d.domain)) byScope.DOMAIN_LOCAL.set(d.domain, []);
			byScope.DOMAIN_LOCAL.get(d.domain).push(d);
		}
	}

	const sevOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
	const sortDefects = (arr) => [...arr].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || a.id.localeCompare(b.id));

	const formatDefectCard = (d) => [
		`### ${d.id} [${d.severity}] (${d.status}) — ${d.component} · Ось ${d.axis} · Зона: \`${d.zone}\``,
		`- **Стейт:** \`${d.viewport}\` / \`${d.theme}\` | **Скриншот:** \`${d.screenshotRef ?? "n/a"}\``,
		`- **Локация в коде:** \`${d.fileHint ?? "уточнить по компоненту"}\``,
		d.elementSelector ? `- **DOM-элемент:** \`${d.elementSelector}\`${d.elementText ? ` («${d.elementText}»)` : ""}` : null,
		d.domEvidence ? `- **DOM-замер:** ${d.domEvidence}` : null,
		`- **Проблема (Факт):** ${d.observation}`,
		`- **Предложение дизайнера (Как должно быть):** ${d.designerProposal}`,
		"",
	].filter(Boolean).join("\n");

	// Write Master Registry Markdown
	const registryLines = [
		`# 📋 VISUAL AUDIT MASTER DEFECT REGISTRY — РАУНД ${round}`,
		"",
		`> **Вердиктов обработано:** ${processedVerdicts} | **Активных дефектов:** ${activeDefects.length} | **Защищено чистых целей:** ${ledger.protectedCleanTargets.length}`,
		`> **P0:** ${bySev.P0} | **P1:** ${bySev.P1} | **P2:** ${bySev.P2} | **P3:** ${bySev.P3}`,
		`> **Слой 1 (FOUNDATION):** ${byScope.FOUNDATION.length} | **Слой 2 (DOMAIN_LOCAL):** ${activeDefects.length - byScope.FOUNDATION.length}`,
		"",
		"## Порядок запуска фиксеров (Anti-Destruction Law)",
		"1. **Сначала Foundation Fixer** закрывает все дефекты из `batches/round_" + round + "/FOUNDATION_batch.md` (общие токены, кнопки, шапки, инпуты) и коммитит.",
		"2. **Затем Domain Fixers** волнами <= 4 параллельно закрывают доменные батчи, НЕ трогая чужие папки и глобальные CSS-файлы.",
		"",
		"## Сводка по осям",
		...Object.entries(byAxis).sort(([a], [b]) => Number(a) - Number(b)).map(([ax, cnt]) => `- Ось ${ax}: **${cnt}**`),
		"",
		"## Детализация всех активных дефектов",
		"",
		...sortDefects(activeDefects).map(formatDefectCard),
	];
	const registryPath = path.join(outDir, `ROUND_${round}_MASTER_REGISTRY.md`);
	writeFileSync(registryPath, registryLines.join("\n"), "utf8");

	// Write Foundation Batch
	const foundationBatch = [
		`# 🧱 FOUNDATION FIXER BATCH — РАУНД ${round} (${byScope.FOUNDATION.length} дефектов)`,
		"",
		"> Выполняется ПЕРВЫМ, до запуска доменных фиксеров. Все правки общих токенов, `canonicalButtons.css`, общих шапок и инпутов идут здесь.",
		"",
		...sortDefects(byScope.FOUNDATION).map(formatDefectCard),
	].join("\n");
	writeFileSync(path.join(batchesDir, "FOUNDATION_batch.md"), foundationBatch, "utf8");

	// Write Domain Batches
	for (const [domain, items] of byScope.DOMAIN_LOCAL.entries()) {
		const content = [
			`# 🎯 DOMAIN FIXER BATCH: ${domain.toUpperCase()} — РАУНД ${round} (${items.length} дефектов)`,
			"",
			"> Запускается ПОСЛЕ завершения Foundation Fixer. Не редактировать глобальные CSS-файлы и соседние домены!",
			"> Каждый пункт должен быть закрыт полностью с обновлением статуса в `DEFECT_LEDGER.json`.",
			"",
			...sortDefects(items).map(formatDefectCard),
		].join("\n");
		writeFileSync(path.join(batchesDir, `${domain}_batch.md`), content, "utf8");
	}

	return {
		processedVerdicts,
		totalActive: activeDefects.length,
		bySev,
		foundationCount: byScope.FOUNDATION.length,
		domainBatches: [...byScope.DOMAIN_LOCAL.keys()],
		registryPath,
		ledgerPath,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
	const opts = parseArgs(process.argv.slice(2));
	const summary = runAggregation(opts);
	process.stdout.write(`✅ Aggregated ${summary.processedVerdicts} verdicts -> ${summary.totalActive} active defects (P0:${summary.bySev.P0} P1:${summary.bySev.P1} P2:${summary.bySev.P2} P3:${summary.bySev.P3})\n`);
	process.stdout.write(`   Foundation: ${summary.foundationCount} | Domain batches: ${summary.domainBatches.join(", ") || "none"}\n`);
	process.stdout.write(`   Ledger: ${summary.ledgerPath}\n`);
}
