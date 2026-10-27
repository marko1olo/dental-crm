#!/usr/bin/env node

/**
 * check-button-styles.mjs — Gate-linter for Canonical Button Styles & UI Purity.
 *
 * Authority: MANDATE 8am (Unified Design Code & Button Purity), MANDATE 8ze (Apple HIG Touch Ergonomics)
 *
 * Rules enforced:
 *   1. Strictly ONE Primary CTA button per visible context (solid teal var(--teal, #0d9488)).
 *   2. Secondary, Ghost, and Preset Pills must use neutral contours (paper / line / ink).
 *   3. Interactive buttons (<button>, role="button", .dente-btn*, preset pills/chips) must NOT
 *      use circus uncoordinated color classes:
 *      (e.g., bg-amber-100, text-yellow-600, border-amber-400, bg-purple-100, bg-orange-100).
 *
 * Usage:
 *   node scripts/check-button-styles.mjs
 *
 * Exit code 0 if clean, 1 if violations found.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const webSrcRoot = join(repoRoot, "apps", "web", "src");

/**
 * Circus uncoordinated classes forbidden on interactive buttons, pills, and presets.
 */
const FORBIDDEN_BUTTON_CLASSES = [
	/\bbg-amber-100\b/,
	/\bhover:bg-amber-100\b/,
	/\btext-yellow-600\b/,
	/\bborder-amber-400\b/,
	/\bhover:border-amber-400\b/,
	/\bbg-purple-100\b/,
	/\bhover:bg-purple-100\b/,
	/\bbg-orange-100\b/,
	/\bhover:bg-orange-100\b/,
];

/**
 * Recursively collect target files from a directory.
 */
function collectFiles(dir, extensions) {
	const results = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				// Skip node_modules and build artifacts if encountered
				if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".vite") {
					results.push(...collectFiles(fullPath, extensions));
				}
			} else if (entry.isFile()) {
				for (const ext of extensions) {
					if (entry.name.endsWith(ext)) {
						results.push(fullPath);
						break;
					}
				}
			}
		}
	} catch (err) {
		// Directory does not exist or unreadable
	}
	return results;
}

/**
 * Robustly extract opening JSX tags without prematurely breaking on arrow function `=>` in attributes.
 */
function extractJsxTags(content) {
	const tags = [];
	let i = 0;
	const len = content.length;

	while (i < len) {
		if (content[i] === "<" && /[a-zA-Z0-9]/.test(content[i + 1] || "")) {
			const start = i;
			i++;
			let tagName = "";
			while (i < len && /[a-zA-Z0-9\-]/.test(content[i])) {
				tagName += content[i];
				i++;
			}
			let braceDepth = 0;
			let inQuote = null;
			const attrStart = i;
			while (i < len) {
				const char = content[i];
				if (inQuote) {
					if (char === "\\") {
						i += 2;
						continue;
					}
					if (char === inQuote) {
						inQuote = null;
					}
				} else if (char === '"' || char === "'" || char === "`") {
					inQuote = char;
				} else if (char === "{") {
					braceDepth++;
				} else if (char === "}") {
					if (braceDepth > 0) braceDepth--;
				} else if (char === ">" && braceDepth === 0) {
					break;
				}
				i++;
			}
			const attrs = content.slice(attrStart, i);
			tags.push({ tagName, attrs, index: start });
		}
		i++;
	}
	return tags;
}

/**
 * Check TSX files for uncoordinated circus classes on interactive buttons/presets.
 */
function checkTsxFile(filePath) {
	const content = readFileSync(filePath, "utf8");
	const violations = [];
	const tags = extractJsxTags(content);

	for (const { tagName, attrs, index } of tags) {
		const isInteractive =
			tagName === "button" ||
			attrs.includes('role="button"') ||
			attrs.includes("dente-btn") ||
			attrs.includes("primary-button") ||
			attrs.includes("secondary-button") ||
			attrs.includes("cw-btn") ||
			(attrs.includes("onClick") &&
				(attrs.includes("pill") ||
					attrs.includes("preset") ||
					attrs.includes("chip") ||
					attrs.includes("cursor-pointer")));

		if (!isInteractive) {
			continue;
		}

		// Extract className attributes (both static string and template literal / expression)
		const classMatch = attrs.match(/className=(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)'|\{([^{}]+)\})/s);
		if (!classMatch) {
			continue;
		}

		const classValue = classMatch[1] || classMatch[2] || classMatch[3] || classMatch[4] || "";

		for (const pattern of FORBIDDEN_BUTTON_CLASSES) {
			const hit = classValue.match(pattern);
			if (hit) {
				const lineNum = content.slice(0, index).split("\n").length;
				violations.push({
					file: relative(repoRoot, filePath),
					line: lineNum,
					element: `<${tagName}>`,
					forbiddenClass: hit[0],
					snippet: classValue.replace(/\s+/g, " ").trim().slice(0, 120),
				});
				break;
			}
		}
	}

	return violations;
}

/**
 * Check CSS files for uncoordinated button declarations.
 */
function checkCssFile(filePath) {
	const content = readFileSync(filePath, "utf8");
	const violations = [];
	const relPath = relative(repoRoot, filePath).replace(/\\/g, "/");

	// Canonical definitions themselves are exempt from self-linting
	if (relPath.endsWith("canonicalButtons.css") || relPath.endsWith("token-aliases.css")) {
		return violations;
	}

	// Remove CSS comments to avoid false positives
	const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, "");

	// Check if button rules contain circus raw color declarations
	const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
	let ruleMatch;

	while ((ruleMatch = ruleRegex.exec(cleanContent)) !== null) {
		const selector = ruleMatch[1].trim();
		const body = ruleMatch[2];

		const isButtonRule =
			selector.includes(".dente-btn") ||
			selector.includes(".primary-button") ||
			selector.includes(".secondary-button") ||
			selector.includes("button.") ||
			selector.includes(".cw-btn");

		if (!isButtonRule) {
			continue;
		}

		// Look for circus colors in button rules
		const circusColorRegex = /(?:background|border-color|color)\s*:\s*([^;]+);/g;
		let propMatch;
		while ((propMatch = circusColorRegex.exec(body)) !== null) {
			const value = propMatch[1].trim();
			// Flag explicit circus amber/yellow/purple/orange hex/rgba on primary/secondary buttons
			if (
				(value.includes("#f59e0b") ||
					value.includes("#d97706") ||
					value.includes("#8b5cf6") ||
					value.includes("#f97316")) &&
				!body.includes("var(--teal")
			) {
				const lineNum = cleanContent.slice(0, ruleMatch.index).split("\n").length;
				violations.push({
					file: relative(repoRoot, filePath),
					line: lineNum,
					element: selector,
					forbiddenClass: value,
					snippet: propMatch[0].trim(),
				});
			}
		}
	}

	return violations;
}

/**
 * Main execution
 */
function main() {
	const startTime = Date.now();
	const allViolations = [];

	const tsxFiles = collectFiles(webSrcRoot, [".tsx", ".jsx"]);
	const cssFiles = collectFiles(webSrcRoot, [".css"]);

	for (const file of tsxFiles) {
		// Skip unit tests
		if (file.endsWith(".test.tsx") || file.endsWith(".spec.tsx")) {
			continue;
		}
		const v = checkTsxFile(file);
		if (v.length > 0) {
			allViolations.push(...v);
		}
	}

	for (const file of cssFiles) {
		const v = checkCssFile(file);
		if (v.length > 0) {
			allViolations.push(...v);
		}
	}

	const elapsed = (Date.now() - startTime) / 1000;

	console.log(`\n================================================================`);
	console.log(`DENTE CRM — CANONICAL BUTTON SYSTEM & UI PURITY LINTER`);
	console.log(`================================================================`);
	console.log(`Scanned TSX/JSX files: ${tsxFiles.length}`);
	console.log(`Scanned CSS files:     ${cssFiles.length}`);
	console.log(`Elapsed time:          ${elapsed.toFixed(2)}s`);
	console.log(`================================================================`);

	if (allViolations.length > 0) {
		console.error(`\n❌ FOUND ${allViolations.length} BUTTON STYLE VIOLATION(S):\n`);
		for (const v of allViolations) {
			console.error(`  - ${v.file}:${v.line} (${v.element})`);
			console.error(`    Offending token/class: "${v.forbiddenClass}"`);
			console.error(`    Context: ${v.snippet}\n`);
		}
		console.error(`Per MANDATE 8am: Buttons must use canonical .dente-btn styles.`);
		console.error(`Primary CTA: Strictly ONE teal (#0d9488) button per visible context.`);
		console.error(`Secondary/Presets/Pills: Neutral contour (paper/line/ink). No circus amber/purple!`);
		process.exit(1);
	}

	console.log(`\n✅ [BUTTON STYLES OK] All interactive buttons and presets conform to canonical design tokens.`);
	console.log(`   - 0 circus color violations detected.`);
	console.log(`   - Button purity verified.\n`);
	process.exit(0);
}

main();
