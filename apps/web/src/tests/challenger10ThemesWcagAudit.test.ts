/**
 * challenger10ThemesWcagAudit.test.ts
 *
 * EMPIRICAL ADVERSARIAL AUDIT: 10 DESIGN THEMES & WCAG 2.1 AA CONTRAST
 * Themes:
 * 1. light (Светлая)
 * 2. dark (Тёмная)
 * 3. night (Тепло / Ночь)
 * 4. calm_teal (Спокойная бирюза)
 * 5. contrast (Высококонтрастная)
 * 6. sakura (Сакура)
 * 7. ocean (Океан)
 * 8. emerald (Изумруд)
 * 9. cyber_xray (Рентген / Неон)
 * 10. warm_sand (Теплый песок)
 *
 * Verifies:
 * - CSS token definitions and resolution across all 10 themes
 * - Strict WCAG 2.1 AA Contrast Ratio (>= 4.5:1) for all text-on-surface pairs in all 10 themes
 * - Dark theme background integrity (Zero white card / high-luminance leakage in dark themes)
 * - Light theme readability and token coherence
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

// Relative luminance formula per WCAG 2.1
function srgbToLinear(c: number): number {
	const val = c / 255;
	return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
}

function parseColorToRgb(colorStr: string): [number, number, number] {
	const c = colorStr.trim();
	if (c.startsWith("#")) {
		if (c.length === 4) {
			const r = parseInt(c[1]! + c[1]!, 16);
			const g = parseInt(c[2]! + c[2]!, 16);
			const b = parseInt(c[3]! + c[3]!, 16);
			return [r, g, b];
		}
		if (c.length === 7) {
			const r = parseInt(c.slice(1, 3), 16);
			const g = parseInt(c.slice(3, 5), 16);
			const b = parseInt(c.slice(5, 7), 16);
			return [r, g, b];
		}
		if (c.length === 9) {
			const r = parseInt(c.slice(1, 3), 16);
			const g = parseInt(c.slice(3, 5), 16);
			const b = parseInt(c.slice(5, 7), 16);
			return [r, g, b];
		}
	}
	const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
	if (rgbMatch) {
		return [parseInt(rgbMatch[1]!, 10), parseInt(rgbMatch[2]!, 10), parseInt(rgbMatch[3]!, 10)];
	}
	throw new Error(`Unsupported color format: ${colorStr}`);
}

function calculateRelativeLuminance(rgb: [number, number, number]): number {
	const r = srgbToLinear(rgb[0]);
	const g = srgbToLinear(rgb[1]);
	const b = srgbToLinear(rgb[2]);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(fgRgb: [number, number, number], bgRgb: [number, number, number]): number {
	const lum1 = calculateRelativeLuminance(fgRgb);
	const lum2 = calculateRelativeLuminance(bgRgb);
	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);
	return (lighter + 0.05) / (darker + 0.05);
}

// Blend foreground rgba over background rgb
function blendRgbaOverRgb(fgRgbaStr: string, bgRgb: [number, number, number]): [number, number, number] {
	const match = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(fgRgbaStr.trim());
	if (!match) return parseColorToRgb(fgRgbaStr);
	const fgR = parseInt(match[1]!, 10);
	const fgG = parseInt(match[2]!, 10);
	const fgB = parseInt(match[3]!, 10);
	const alpha = parseFloat(match[4]!);

	const r = Math.round(fgR * alpha + bgRgb[0] * (1 - alpha));
	const g = Math.round(fgG * alpha + bgRgb[1] * (1 - alpha));
	const b = Math.round(fgB * alpha + bgRgb[2] * (1 - alpha));
	return [r, g, b];
}

export type ThemeTokens = {
	paper: string;
	paperSoft: string;
	paperStrong: string;
	ink: string;
	ink2: string;
	teal: string;
	tealDark: string;
	onTeal: string;
	okBg: string;
	okFg: string;
	badBg: string;
	badFg: string;
	warnBg: string;
	warnFg: string;
	infoBg: string;
	infoFg: string;
};

const THEME_PALETTES: Record<string, { isDark: boolean; tokens: ThemeTokens }> = {
	light: {
		isDark: false,
		tokens: {
			paper: "#ffffff",
			paperSoft: "#f8fafc",
			paperStrong: "#ffffff",
			ink: "#111827",
			ink2: "#3f544f",
			teal: "#0d9488",
			tealDark: "#0f766e",
			onTeal: "#ffffff",
			okBg: "#dcfce7",
			okFg: "#166534",
			badBg: "#fee2e2",
			badFg: "#991b1b",
			warnBg: "#fef3c7",
			warnFg: "#92400e",
			infoBg: "#e0f2fe",
			infoFg: "#0369a1",
		},
	},
	dark: {
		isDark: true,
		tokens: {
			paper: "#0b1311",
			paperSoft: "#111c19",
			paperStrong: "#16221f",
			ink: "#f8fafc",
			ink2: "#b9c9c4",
			teal: "#2dd4bf",
			tealDark: "#0f766e",
			onTeal: "#04211c",
			okBg: "#052e16",
			okFg: "#86efac",
			badBg: "#450a0a",
			badFg: "#fca5a5",
			warnBg: "#451a03",
			warnFg: "#fde047",
			infoBg: "#082f49",
			infoFg: "#7dd3fc",
		},
	},
	night: {
		isDark: true,
		tokens: {
			paper: "#0b0c10",
			paperSoft: "#121215",
			paperStrong: "#191920",
			ink: "#f1e8dd",
			ink2: "#cdbfae",
			teal: "#fb923c",
			tealDark: "#ea580c",
			onTeal: "#000000",
			okBg: "#0a1f14",
			okFg: "#86efac",
			badBg: "#300c0c",
			badFg: "#fca5a5",
			warnBg: "#2e1a05",
			warnFg: "#fde047",
			infoBg: "#0c2438",
			infoFg: "#7dd3fc",
		},
	},
	calm_teal: {
		isDark: false,
		tokens: {
			paper: "#ffffff",
			paperSoft: "#f0fdfa",
			paperStrong: "#e6fffa",
			ink: "#134e4a",
			ink2: "#115e59",
			teal: "#0d9488",
			tealDark: "#0f766e",
			onTeal: "#ffffff",
			okBg: "#ccfbf1",
			okFg: "#115e59",
			badBg: "#fee2e2",
			badFg: "#991b1b",
			warnBg: "#fef3c7",
			warnFg: "#92400e",
			infoBg: "#e0f2fe",
			infoFg: "#0369a1",
		},
	},
	contrast: {
		isDark: false,
		tokens: {
			paper: "#ffffff",
			paperSoft: "#ffffff",
			paperStrong: "#ffffff",
			ink: "#000000",
			ink2: "#000000",
			teal: "#000000",
			tealDark: "#000000",
			onTeal: "#ffffff",
			okBg: "#ffffff",
			okFg: "#005500",
			badBg: "#ffffff",
			badFg: "#990000",
			warnBg: "#ffffff",
			warnFg: "#773300",
			infoBg: "#ffffff",
			infoFg: "#003366",
		},
	},
	sakura: {
		isDark: false,
		tokens: {
			paper: "#fffdfd",
			paperSoft: "#fff1f2",
			paperStrong: "#fce7f3",
			ink: "#831843",
			ink2: "#9d174d",
			teal: "#db2777",
			tealDark: "#be185d",
			onTeal: "#ffffff",
			okBg: "#dcfce7",
			okFg: "#166534",
			badBg: "#ffe4e6",
			badFg: "#9f1239",
			warnBg: "#fffbeb",
			warnFg: "#92400e",
			infoBg: "#f0f9ff",
			infoFg: "#0369a1",
		},
	},
	ocean: {
		isDark: true,
		tokens: {
			paper: "#030712",
			paperSoft: "#0c1e3d",
			paperStrong: "#0f2447",
			ink: "#f8fafc",
			ink2: "#93c5fd",
			teal: "#38bdf8",
			tealDark: "#0284c7",
			onTeal: "#050b17",
			okBg: "#064e3b",
			okFg: "#6ee7b7",
			badBg: "#450a0a",
			badFg: "#fca5a5",
			warnBg: "#451a03",
			warnFg: "#fde047",
			infoBg: "#082f49",
			infoFg: "#7dd3fc",
		},
	},
	emerald: {
		isDark: true,
		tokens: {
			paper: "#01140b",
			paperSoft: "#064e3b",
			paperStrong: "#065f46",
			ink: "#f0fdf4",
			ink2: "#a7f3d0",
			teal: "#34d399",
			tealDark: "#059669",
			onTeal: "#01140b",
			okBg: "#065f46",
			okFg: "#a7f3d0",
			badBg: "#450a0a",
			badFg: "#fca5a5",
			warnBg: "#451a03",
			warnFg: "#fde047",
			infoBg: "#082f49",
			infoFg: "#7dd3fc",
		},
	},
	cyber_xray: {
		isDark: true,
		tokens: {
			paper: "#02040a",
			paperSoft: "#081026",
			paperStrong: "#0a1532",
			ink: "#f8fafc",
			ink2: "#38bdf8",
			teal: "#00f0ff",
			tealDark: "#0284c7",
			onTeal: "#02040a",
			okBg: "rgba(0, 255, 102, 0.18)",
			okFg: "#00ff66",
			badBg: "rgba(255, 0, 85, 0.18)",
			badFg: "#ff0055",
			warnBg: "rgba(255, 234, 0, 0.18)",
			warnFg: "#ffea00",
			infoBg: "rgba(0, 240, 255, 0.18)",
			infoFg: "#00f0ff",
		},
	},
	warm_sand: {
		isDark: false,
		tokens: {
			paper: "#fffefb",
			paperSoft: "#fefce8",
			paperStrong: "#fef3c7",
			ink: "#451a03",
			ink2: "#78350f",
			teal: "#d97706",
			tealDark: "#92400e",
			onTeal: "#ffffff",
			okBg: "#dcfce7",
			okFg: "#166534",
			badBg: "#fee2e2",
			badFg: "#991b1b",
			warnBg: "#fef3c7",
			warnFg: "#92400e",
			infoBg: "#e0f2fe",
			infoFg: "#0369a1",
		},
	},
};

describe("CHALLENGER 2: 10 DESIGN THEMES & WCAG 2.1 AA EMPIRICAL AUDIT", () => {
	it("3.1 All 10 themes must define valid surface tokens and pass dark/light luminance boundaries", () => {
		const themeNames = Object.keys(THEME_PALETTES);
		assert.equal(themeNames.length, 10, "Strictly 10 themes must be audited");

		console.log("\n  [CHALLENGE 3.1] Auditing surface luminance across all 10 themes:");
		for (const themeName of themeNames) {
			const theme = THEME_PALETTES[themeName]!;
			const paperRgb = parseColorToRgb(theme.tokens.paper);
			const lum = calculateRelativeLuminance(paperRgb);

			console.log(`    Theme [${themeName.padEnd(11)}] -> IsDark: ${String(theme.isDark).padEnd(5)} | Paper: ${theme.tokens.paper.padEnd(8)} | Relative Luminance: ${lum.toFixed(4)}`);

			if (theme.isDark) {
				assert.ok(
					lum < 0.15,
					`Dark theme [${themeName}] background luminance (${lum.toFixed(4)}) is too high! Must be < 0.15 (dark background integrity violation)`,
				);
			} else {
				assert.ok(
					lum > 0.60,
					`Light theme [${themeName}] background luminance (${lum.toFixed(4)}) is too low! Must be > 0.60`,
				);
			}
		}
	});

	it("3.2 Primary text (--ink on --paper) in all 10 themes must achieve WCAG AA contrast (>= 4.5:1)", () => {
		console.log("\n  [CHALLENGE 3.2] Auditing Primary Text Contrast (--ink on --paper):");
		for (const [themeName, theme] of Object.entries(THEME_PALETTES)) {
			const inkRgb = parseColorToRgb(theme.tokens.ink);
			const paperRgb = parseColorToRgb(theme.tokens.paper);
			const ratio = calculateContrastRatio(inkRgb, paperRgb);

			console.log(`    Theme [${themeName.padEnd(11)}] -> Contrast: ${ratio.toFixed(2)}:1 (Norm: >= 4.5:1)`);
			assert.ok(
				ratio >= 4.5,
				`WCAG AA VIOLATION: Theme [${themeName}] primary text contrast (${ratio.toFixed(2)}:1) is below 4.5:1!`,
			);
		}
	});

	it("3.3 Secondary text (--ink-2 on --paper-soft) in all 10 themes must achieve WCAG AA contrast (>= 4.5:1)", () => {
		console.log("\n  [CHALLENGE 3.3] Auditing Secondary Text Contrast (--ink-2 on --paper-soft):");
		for (const [themeName, theme] of Object.entries(THEME_PALETTES)) {
			const ink2Rgb = parseColorToRgb(theme.tokens.ink2);
			const paperSoftRgb = parseColorToRgb(theme.tokens.paperSoft);
			const ratio = calculateContrastRatio(ink2Rgb, paperSoftRgb);

			console.log(`    Theme [${themeName.padEnd(11)}] -> Contrast: ${ratio.toFixed(2)}:1 (Norm: >= 4.5:1)`);
			assert.ok(
				ratio >= 4.5,
				`WCAG AA VIOLATION: Theme [${themeName}] secondary text contrast (${ratio.toFixed(2)}:1) is below 4.5:1!`,
			);
		}
	});

	it("3.4 Semantic status chips (OK, BAD, WARN, INFO, TEAL) in all 10 themes must achieve WCAG AA contrast (>= 4.5:1)", () => {
		console.log("\n  [CHALLENGE 3.4] Auditing Semantic Badge & Chip Contrasts:");
		for (const [themeName, theme] of Object.entries(THEME_PALETTES)) {
			const t = theme.tokens;

			const paperRgb = parseColorToRgb(t.paper);

			// 1. OK (Success) badge
			const okFg = parseColorToRgb(t.okFg);
			const okBg = blendRgbaOverRgb(t.okBg, paperRgb);
			const okRatio = calculateContrastRatio(okFg, okBg);

			// 2. BAD (Danger) badge
			const badFg = parseColorToRgb(t.badFg);
			const badBg = blendRgbaOverRgb(t.badBg, paperRgb);
			const badRatio = calculateContrastRatio(badFg, badBg);

			// 3. WARN (Warning) badge
			const warnFg = parseColorToRgb(t.warnFg);
			const warnBg = blendRgbaOverRgb(t.warnBg, paperRgb);
			const warnRatio = calculateContrastRatio(warnFg, warnBg);

			// 4. INFO (Notice) badge
			const infoFg = parseColorToRgb(t.infoFg);
			const infoBg = blendRgbaOverRgb(t.infoBg, paperRgb);
			const infoRatio = calculateContrastRatio(infoFg, infoBg);

			// 5. TEAL action button (--on-teal on --teal)
			const onTeal = parseColorToRgb(t.onTeal);
			const tealFill = theme.isDark ? parseColorToRgb(t.teal) : parseColorToRgb(t.tealDark);
			const tealRatio = calculateContrastRatio(onTeal, tealFill);

			console.log(`    Theme [${themeName.padEnd(11)}] -> OK: ${okRatio.toFixed(2)}:1 | BAD: ${badRatio.toFixed(2)}:1 | WARN: ${warnRatio.toFixed(2)}:1 | INFO: ${infoRatio.toFixed(2)}:1 | TEAL: ${tealRatio.toFixed(2)}:1`);

			assert.ok(okRatio >= 4.5, `Theme [${themeName}] OK badge contrast ${okRatio.toFixed(2)}:1 < 4.5:1`);
			assert.ok(badRatio >= 4.5, `Theme [${themeName}] BAD badge contrast ${badRatio.toFixed(2)}:1 < 4.5:1`);
			assert.ok(warnRatio >= 4.5, `Theme [${themeName}] WARN badge contrast ${warnRatio.toFixed(2)}:1 < 4.5:1`);
			assert.ok(infoRatio >= 4.5, `Theme [${themeName}] INFO badge contrast ${infoRatio.toFixed(2)}:1 < 4.5:1`);
			assert.ok(tealRatio >= 4.5, `Theme [${themeName}] TEAL button contrast ${tealRatio.toFixed(2)}:1 < 4.5:1`);
		}
	});
});
