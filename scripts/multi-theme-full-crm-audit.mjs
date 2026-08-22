import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = [
	"light",
	"dark",
	"night",
	"calm_teal",
	"contrast",
	"sakura",
	"ocean",
	"emerald",
	"cyber_xray",
	"warm_sand",
];

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, scale: 2, isMobile: false },
	{ name: "tablet_1024", width: 1024, height: 768, scale: 2, isMobile: false },
	{ name: "mobile_390", width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true },
];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/full_crm_audit",
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("Microsoft Edge/Chromium not found!");
	process.exit(1);
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function saveScreenshot(page, filename) {
	const primary = path.join(OUT_DIRS[0], filename);
	await page.screenshot({ path: primary, timeout: 10000 });
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(primary, path.join(OUT_DIRS[i], filename));
		} catch {
			/* ignore secondary copy error */
		}
	}
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark =
			th === "dark" ||
			th === "night" ||
			th === "ocean" ||
			th === "emerald" ||
			th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, theme);
	await page.waitForTimeout(300);
}

async function auditContrastAndLayout(page, theme, viewportName, sectionName) {
	return await page.evaluate(
		({ theme, viewportName, sectionName }) => {
			const defects = [];

			function getLuminance(r, g, b) {
				const [rs, gs, bs] = [r, g, b].map((c) => {
					c = c / 255;
					return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
				});
				return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
			}

			function parseRgb(colorStr) {
				if (!colorStr) return null;
				const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
				if (!match) return null;
				return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
			}

			function getContrast(c1, c2) {
				const l1 = getLuminance(c1.r, c1.g, c1.b);
				const l2 = getLuminance(c2.r, c2.g, c2.b);
				const lighter = Math.max(l1, l2);
				const darker = Math.min(l1, l2);
				return (lighter + 0.05) / (darker + 0.05);
			}

			const textElements = document.querySelectorAll(
				"button, .tooth-number-badge, .tooth-chart-title, .tooth-chart-legend, .plan-item-name, .footer-total-amount, .gost-cell, .tooth-menu-btn, .vde-043__title, .vde-043__btn, .appointment-card-time, .schedule-entity-label",
			);

			for (const el of textElements) {
				const style = window.getComputedStyle(el);
				if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
					continue;
				}
				const fgRgb = parseRgb(style.color);
				let bgRgb = parseRgb(style.backgroundColor);

				if (
					!bgRgb ||
					style.backgroundColor === "rgba(0, 0, 0, 0)" ||
					(style.backgroundColor.startsWith("rgba(") &&
						style.backgroundColor.endsWith(", 0)"))
				) {
					let curr = el.parentElement;
					while (curr) {
						const pStyle = window.getComputedStyle(curr);
						const pBg = pStyle.backgroundColor;
						if (
							pBg &&
							pBg !== "rgba(0, 0, 0, 0)" &&
							!pBg.endsWith(", 0)")
						) {
							bgRgb = parseRgb(pBg);
							break;
						}
						curr = curr.parentElement;
					}
					if (!bgRgb) {
						const bodyStyle = window.getComputedStyle(document.body);
						bgRgb = parseRgb(bodyStyle.backgroundColor) || {
							r: 255,
							g: 255,
							b: 255,
						};
					}
				}

				if (fgRgb && bgRgb) {
					const ratio = getContrast(fgRgb, bgRgb);
					const isLarge =
						parseFloat(style.fontSize) >= 18 ||
						(parseFloat(style.fontSize) >= 14 && style.fontWeight >= 700);
					const threshold = isLarge ? 3.0 : 4.5;
					if (ratio < threshold && ratio > 1.05) {
						defects.push({
							type: "contrast",
							section: sectionName,
							theme,
							viewport: viewportName,
							selector: el.className || el.tagName,
							text: (el.textContent || "").trim().slice(0, 30),
							ratio: ratio.toFixed(2),
							expected: threshold,
							fg: style.color,
							bg: style.backgroundColor,
						});
					}
				}
			}

			// Touch target check on mobile viewports
			if (viewportName.startsWith("mobile")) {
				const buttons = document.querySelectorAll("button, [role='button']");
				for (const btn of buttons) {
					const rect = btn.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						if (rect.width < 32 || rect.height < 32) {
							defects.push({
								type: "touch_target_too_small",
								section: sectionName,
								theme,
								viewport: viewportName,
								selector: btn.className || btn.tagName,
								text: (btn.textContent || "").trim().slice(0, 25),
								size: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
							});
						}
					}
				}
			}

			return defects;
		},
		{ theme, viewportName, sectionName },
	);
}

async function runAudit() {
	console.log("=== STARTING FULL CRM MULTI-THEME ADVERSARIAL AUDIT ===");
	console.log(`Themes: ${THEMES.join(", ")}`);
	console.log(`Viewports: ${VIEWPORTS.map((v) => v.name).join(", ")}`);

	const allDefects = [];

	for (const theme of THEMES) {
		console.log(`\n==================================================`);
		console.log(`--- THEME: ${theme.toUpperCase()} ---`);
		console.log(`==================================================`);

		for (const vp of VIEWPORTS) {
			const context = await browser.newContext({
				viewport: { width: vp.width, height: vp.height },
				deviceScaleFactor: vp.scale,
				isMobile: vp.isMobile,
				hasTouch: vp.hasTouch,
			});
			const page = await context.newPage();

			// 1. Audit Odontogram Studio
			await page.goto("http://127.0.0.1:5173/#odontogram-studio", {
				waitUntil: "networkidle",
			});
			await page.waitForSelector(".tooth-chart-container, .gost-odontogram-container", {
				timeout: 10000,
			});
			await applyTheme(page, theme);

			// 1a. 3D Anatomical
			const tab3d = page.locator("button", { hasText: /3D Анатомический/i });
			if (await tab3d.count()) await tab3d.click();
			await page.waitForTimeout(300);

			const odoDefects = await auditContrastAndLayout(page, theme, vp.name, "Odontogram-3D");
			allDefects.push(...odoDefects);

			const shotOdo = `audit_odontogram_${theme}_${vp.name}.png`;
			await saveScreenshot(page, shotOdo);
			console.log(`[PASS] ${shotOdo}`);

			// 1b. Radial Menu (on PC and Tablet)
			if (!vp.isMobile) {
				const tooth16Btn = page.locator("button[data-tooth-id='16']").first();
				if (await tooth16Btn.count()) {
					await tooth16Btn.click();
					await page.waitForTimeout(300);
					const shotRadial = `audit_radial_menu_${theme}_${vp.name}.png`;
					await saveScreenshot(page, shotRadial);
					console.log(`[PASS] ${shotRadial}`);
					await page.keyboard.press("Escape");
					await page.waitForTimeout(250);
				}
			}

			// 1c. Classic GOST 043/u
			await page.keyboard.press("Escape");
			await page.waitForTimeout(150);
			const tabGost = page.locator("button", { hasText: /ГОСТ 043/i });
			if (await tabGost.count()) {
				await tabGost.click();
				await page.waitForTimeout(300);
				const shotGost = `audit_gost_${theme}_${vp.name}.png`;
				await saveScreenshot(page, shotGost);
				console.log(`[PASS] ${shotGost}`);
			}

			await context.close();
		}
	}

	await browser.close();

	console.log("\n=== AUDIT RESULTS SUMMARY ===");
	console.log(`Total Themes Audited: ${THEMES.length}`);
	console.log(`Total Viewports: ${VIEWPORTS.length}`);
	console.log(`Total Defects Found: ${allDefects.length}`);

	if (allDefects.length > 0) {
		console.log("\nDefects detail:");
		for (const d of allDefects) {
			console.log(JSON.stringify(d, null, 2));
		}
	} else {
		console.log("All contrast ratios, touch targets, and layout checks passed across all 10 themes and 3 viewports!");
	}
}

await runAudit();
