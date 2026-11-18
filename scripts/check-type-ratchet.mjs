/**
 * @file check-type-ratchet.mjs
 * @description Храповик типов (Type Ratchet) и защита Fastify API границ (Мандат 8bh).
 *
 * НАЗНАЧЕНИЕ:
 * 1. Фиксирует максимальный потолок использования `any` / `as any` и `biome-ignore`
 *    в боевом коде (shared, api, web) на основе реестра `.data/code-health-ratchet.json`.
 *    Рост хотя бы на +1 роняет сборку (Exit Code 1).
 * 2. Фиксирует и блокирует рост опасных `req.body as any`, `req.params as any`
 *    на границах Fastify API маршрутов (`apps/api/src/routes`).
 * 3. Поддерживает флаг `--tighten`: автоматически снижает лимиты в реестре до
 *    фактических значений, если кодовая база улучшилась (храповик защелкивается вниз).
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT_DIR = process.cwd();
const RATCHET_LEDGER_PATH = join(ROOT_DIR, ".data/code-health-ratchet.json");
const FASTIFY_ROUTES_DIR = "apps/api/src/routes";

const SHOULD_TIGHTEN = process.argv.includes("--tighten");

function loadRatchetLedger() {
	if (!existsSync(RATCHET_LEDGER_PATH)) {
		console.warn(`[WARN] Реестр ${RATCHET_LEDGER_PATH} не найден. Используются дефолтные лимиты.`);
		return {
			version: 1,
			limits: {
				"packages/shared/src": { maxAnys: 43, maxBiomeIgnores: 5 },
				"apps/api/src": { maxAnys: 500, maxBiomeIgnores: 300, maxFastifyRouteAnyCasts: 34 },
				"apps/web/src": { maxAnys: 2600, maxBiomeIgnores: 855 },
			},
		};
	}
	try {
		return JSON.parse(readFileSync(RATCHET_LEDGER_PATH, "utf8"));
	} catch (e) {
		console.error(`[ERROR] Не удалось прочитать ${RATCHET_LEDGER_PATH}:`, e);
		process.exit(1);
	}
}

// Регулярки для подсчёта any и biome-ignore
const ANY_PATTERN = /(?:(?<=\W|^)as\s+any(?=\W|$)|(?<=\W|^):\s*any(?=\W|$)|<any>|(?<=\W|^)any\[\])/g;
const BIOME_IGNORE_PATTERN = /(?:\/\/|\/\*)\s*biome-ignore/g;

// Запрещенные касты в маршрутах Fastify (req.body as any, etc.)
const FASTIFY_BODY_ANY_PATTERN = /(?:req|request)\.(?:body|params|query)\s+as\s+any\b/g;

function isTestOrMockFile(path) {
	const normalized = path.replace(/\\/g, "/");
	return (
		normalized.includes("/__tests__/") ||
		normalized.includes("/tests/") ||
		normalized.includes(".test.") ||
		normalized.includes(".spec.") ||
		normalized.includes("/sampleData/") ||
		normalized.includes("/test-utils/")
	);
}

function collectSourceFiles(dir, extensions = [".ts", ".tsx"]) {
	const results = [];
	if (!existsSync(dir)) return results;

	function walk(currentDir) {
		const entries = readdirSync(currentDir);
		for (const entry of entries) {
			if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
			const fullPath = join(currentDir, entry);
			try {
				const stat = statSync(fullPath);
				if (stat.isDirectory()) {
					walk(fullPath);
				} else if (stat.isFile() && extensions.includes(extname(entry))) {
					if (!isTestOrMockFile(fullPath)) {
						results.push(fullPath);
					}
				}
			} catch (_) {}
		}
	}

	walk(dir);
	return results;
}

function auditScopes() {
	const ledger = loadRatchetLedger();
	let hasFailures = false;
	const stats = {};
	let ledgerUpdated = false;

	console.log("🔒 [TYPE RATCHET] Проверка потолка any и biome-ignore по реестру .data/code-health-ratchet.json...");

	const scopes = [
		{ key: "packages/shared/src", dir: "packages/shared/src" },
		{ key: "apps/api/src", dir: "apps/api/src" },
		{ key: "apps/web/src", dir: "apps/web/src" },
	];

	for (const scope of scopes) {
		const limits = ledger.limits[scope.key] || { maxAnys: 99999, maxBiomeIgnores: 99999 };
		const files = collectSourceFiles(join(ROOT_DIR, scope.dir));
		let anyCount = 0;
		let biomeCount = 0;

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf8");
				const anyMatches = content.match(ANY_PATTERN);
				if (anyMatches) anyCount += anyMatches.length;

				const biomeMatches = content.match(BIOME_IGNORE_PATTERN);
				if (biomeMatches) biomeCount += biomeMatches.length;
			} catch (_) {}
		}

		stats[scope.key] = { anyCount, biomeCount, filesCount: files.length };

		const anyExceeded = anyCount > limits.maxAnys;
		const biomeExceeded = biomeCount > limits.maxBiomeIgnores;

		if (anyExceeded || biomeExceeded) {
			hasFailures = true;
			console.error(`\n❌ [RATCHET BREACH] Превышен потолок типов в ${scope.key}:`);
			if (anyExceeded) {
				console.error(`   - ANY: ${anyCount} (лимит: ${limits.maxAnys}, превышение на +${anyCount - limits.maxAnys})`);
			}
			if (biomeExceeded) {
				console.error(`   - BIOME-IGNORE: ${biomeCount} (лимит: ${limits.maxBiomeIgnores}, превышение на +${biomeCount - limits.maxBiomeIgnores})`);
			}
		} else {
			console.log(
				`  ✓ ${scope.key.padEnd(22)} (${files.length} файлов): ${anyCount}/${limits.maxAnys} anys, ${biomeCount}/${limits.maxBiomeIgnores} biome-ignores`,
			);

			// Если включен режим затягивания храповика и показатели улучшились
			if (SHOULD_TIGHTEN) {
				if (anyCount < limits.maxAnys) {
					console.log(`  ⚡ [TIGHTEN] Потолок anys для ${scope.key} снижен: ${limits.maxAnys} -> ${anyCount}`);
					limits.maxAnys = anyCount;
					ledgerUpdated = true;
				}
				if (biomeCount < limits.maxBiomeIgnores) {
					console.log(`  ⚡ [TIGHTEN] Потолок biome-ignore для ${scope.key} снижен: ${limits.maxBiomeIgnores} -> ${biomeCount}`);
					limits.maxBiomeIgnores = biomeCount;
					ledgerUpdated = true;
				}
			}
		}
	}

	// Проверка маршрутов Fastify
	console.log("\n🔒 [FASTIFY BOUNDARIES] Проверка маршрутов на 'req.body as any'...");
	const routeFiles = collectSourceFiles(join(ROOT_DIR, FASTIFY_ROUTES_DIR));
	const routeViolations = [];

	for (const file of routeFiles) {
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			lines.forEach((line, index) => {
				if (FASTIFY_BODY_ANY_PATTERN.test(line)) {
					routeViolations.push({
						file: relative(ROOT_DIR, file).replace(/\\/g, "/"),
						line: index + 1,
						snippet: line.trim(),
					});
				}
			});
		} catch (_) {}
	}

	const maxRouteAnys = ledger.limits["apps/api/src"]?.maxFastifyRouteAnyCasts ?? 34;

	if (routeViolations.length > maxRouteAnys) {
		hasFailures = true;
		console.error(`\n❌ [FASTIFY BOUNDARY BREACH] Найдено ${routeViolations.length} нарушений (лимит: ${maxRouteAnys})!`);
		for (const v of routeViolations) {
			console.error(`   ${v.file}:${v.line} -> ${v.snippet}`);
		}
		console.error("\n💡 Любой НОВЫЙ 'req.body as any' запрещен! Используйте FastifyRequest<{ Body: z.infer<typeof schema> }>.");
	} else {
		console.log(`  ✓ Маршруты Fastify: ${routeViolations.length}/${maxRouteAnys} легаси-кастов (рост заблокирован храповиком)`);
		if (SHOULD_TIGHTEN && routeViolations.length < maxRouteAnys) {
			console.log(`  ⚡ [TIGHTEN] Потолок route anys снижен: ${maxRouteAnys} -> ${routeViolations.length}`);
			ledger.limits["apps/api/src"].maxFastifyRouteAnyCasts = routeViolations.length;
			ledgerUpdated = true;
		}
	}

	if (ledgerUpdated) {
		ledger.updatedAt = new Date().toISOString();
		writeFileSync(RATCHET_LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf8");
		console.log(`\n💾 [RATCHET LEDGER UPDATED] Реестр ${RATCHET_LEDGER_PATH} зафиксировал новые рекордные показатели.`);
	}

	if (hasFailures) {
		console.error("\n💥 [TYPE RATCHET FAILED] Обнаружены нарушения дисциплины типов Мандата 8bh!");
		console.error("Правило: новые any и biome-ignore запрещены. Потолок зафиксирован навсегда.");
		process.exit(1);
	}

	console.log("\n✅ [TYPE RATCHET PASSED] Все проверки храповика типов успешно пройдены.\n");
}

auditScopes();
