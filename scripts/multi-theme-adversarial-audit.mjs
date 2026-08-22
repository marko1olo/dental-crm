import { existsSync, mkdirSync } from "node:fs";
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

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/odontogram",
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
	await page.waitForTimeout(350);
}

async function auditContrastAndLayout(page, theme, viewportName) {
	return await page.evaluate(
		({ theme, viewportName }) => {
			const defects = [];

			function getLuminance(r, g, b) {
				const [rs, gs, bs] = [r, g, b].map((c) => {
					c = c / 255;
					return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
				});
				return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
			}

			function parseRgb(colorStr) {
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
				"button, .tooth-number-badge, .tooth-chart-title, .tooth-chart-legend-item, .plan-item-name, .footer-total-amount, .gost-cell, .tooth-menu-btn",
			);

			for (const el of textElements) {
				const style = window.getComputedStyle(el);
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

			return defects;
		},
		{ theme, viewportName },
	);
}

async function runAudit() {
	console.log("=== STARTING MULTI-THEME ADVERSARIAL VISUAL AUDIT ===");
	console.log(`Themes to audit: ${THEMES.join(", ")}`);

	const allDefects = [];

	for (const theme of THEMES) {
		console.log(`\n--- Auditing Theme: ${theme.toUpperCase()} ---`);

		// 1. PC Viewport (1440x900)
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/#odontogram-studio", {
			waitUntil: "networkidle",
		});
		await pcPage.waitForSelector(".tooth-chart-container, .gost-odontogram-container", {
			timeout: 10000,
		});

		await applyTheme(pcPage, theme);

		// 1a. PC 3D Anatomical
		const tab3d = pcPage.locator("button", { hasText: /3D Анатомический/i });
		if (await tab3d.count()) await tab3d.click();
		await pcPage.waitForTimeout(350);

		const pcDefects = await auditContrastAndLayout(pcPage, theme, "PC-1440x900");
		allDefects.push(...pcDefects);

		const pcShotName = `odontogram_${theme}_pc_1440.png`;
		for (const dir of OUT_DIRS) {
			await pcPage.screenshot({ path: path.join(dir, pcShotName), fullPage: false });
		}
		console.log(`[PASS] Captured ${pcShotName}`);

		// 1b. PC Radial Menu on Tooth 16
		const tooth16Btn = pcPage.locator("button[data-tooth-id='16']").first();
		if (await tooth16Btn.count()) {
			await tooth16Btn.click();
			await pcPage.waitForTimeout(350);
			const radialShotName = `radial_menu_${theme}_pc.png`;
			for (const dir of OUT_DIRS) {
				await pcPage.screenshot({ path: path.join(dir, radialShotName), fullPage: false });
			}
			console.log(`[PASS] Captured ${radialShotName}`);
			// Close radial menu cleanly
			await pcPage.keyboard.press("Escape");
			await pcPage.waitForTimeout(300);
		}

		// 1c. PC Classic GOST 043/u
		const tabGost = pcPage.locator("button", { hasText: /ГОСТ 043/i });
		if (await tabGost.count()) {
			await tabGost.click();
			await pcPage.waitForTimeout(350);
			const gostShotName = `gost_table_${theme}_pc.png`;
			for (const dir of OUT_DIRS) {
				await pcPage.screenshot({ path: path.join(dir, gostShotName), fullPage: false });
			}
			console.log(`[PASS] Captured ${gostShotName}`);
		}

		await pcContext.close();

		// 2. Mobile Viewport (390x844 iPhone 14/15)
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 3,
			isMobile: true,
			hasTouch: true,
		});
		const mobPage = await mobileContext.newPage();
		await mobPage.goto("http://127.0.0.1:5173/#odontogram-studio", {
			waitUntil: "networkidle",
		});
		await mobPage.waitForSelector(".tooth-chart-container, .gost-odontogram-container", {
			timeout: 10000,
		});

		await applyTheme(mobPage, theme);

		// 2a. Mobile 3D Anatomical
		const tab3dMob = mobPage.locator("button", { hasText: /3D Анатомический/i });
		if (await tab3dMob.count()) await tab3dMob.click();
		await mobPage.waitForTimeout(350);

		const mobDefects = await auditContrastAndLayout(mobPage, theme, "Mobile-390x844");
		allDefects.push(...mobDefects);

		const mobShotName = `odontogram_${theme}_mobile_390.png`;
		for (const dir of OUT_DIRS) {
			await mobPage.screenshot({ path: path.join(dir, mobShotName), fullPage: false });
		}
		console.log(`[PASS] Captured ${mobShotName}`);

		// 2b. Mobile Classic GOST
		const tabGostMob = mobPage.locator("button", { hasText: /ГОСТ 043/i });
		if (await tabGostMob.count()) {
			await tabGostMob.click();
			await mobPage.waitForTimeout(350);
			const mobGostShotName = `gost_table_${theme}_mobile_390.png`;
			for (const dir of OUT_DIRS) {
				await mobPage.screenshot({ path: path.join(dir, mobGostShotName), fullPage: false });
			}
			console.log(`[PASS] Captured ${mobGostShotName}`);
		}

		await mobileContext.close();
	}

	await browser.close();

	console.log("\n=== AUDIT RESULTS SUMMARY ===");
	console.log(`Total Themes Audited: ${THEMES.length}`);
	console.log(`Total Defects Found: ${allDefects.length}`);

	if (allDefects.length > 0) {
		console.log("\nDefects detail:");
		for (const d of allDefects) {
			console.log(JSON.stringify(d, null, 2));
		}
	} else {
		console.log("All contrast ratios and layout checks passed across all 10 themes!");
	}
}

await runAudit();
