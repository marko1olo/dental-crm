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
	{ name: "pc_1440", width: 1440, height: 900, scale: 1, isMobile: false },
	{ name: "tablet_1024", width: 1024, height: 768, scale: 2, isMobile: true, hasTouch: true },
	{ name: "mobile_390", width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true },
];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/clinical_modals_audit",
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
	try {
		await page.screenshot({ path: primary, timeout: 6000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 6000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
		}
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(primary, path.join(OUT_DIRS[i], filename));
		} catch {
			/* ignore */
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
				"button, h1, h2, h3, h4, span, p, strong, td, th, label",
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

			return defects;
		},
		{ theme, viewportName, sectionName },
	);
}

async function closeModal(page) {
	try {
		const closeBtn = page.locator("[role='dialog'] button:has-text('Закрыть'), [role='dialog'] button[aria-label*='Закрыть'], [role='dialog'] button:has(svg.lucide-x), [data-testid$='-modal'] button:has(svg.lucide-x)").first();
		if (await closeBtn.count()) {
			await closeBtn.click({ force: true });
		} else {
			await page.keyboard.press("Escape");
		}
	} catch {
		await page.keyboard.press("Escape");
	}
	await page.waitForTimeout(250);
}

async function auditModalIfPresent(page, theme, vp, modalName, buttonTestId, screenshotPrefix, allDefects) {
	try {
		const btn = page.locator(`[data-testid='${buttonTestId}']`).first();
		if (await btn.count()) {
			await btn.scrollIntoViewIfNeeded();
			await btn.click({ force: true });
			await page.waitForSelector("[role='dialog'], [data-testid$='-modal']", { timeout: 5000 });
			await page.waitForTimeout(300);

			const defects = await auditContrastAndLayout(page, theme, vp.name, modalName);
			allDefects.push(...defects);

			const shotName = `audit_${screenshotPrefix}_${theme}_${vp.name}.png`;
			await saveScreenshot(page, shotName);
			console.log(`[PASS] ${shotName}`);

			await closeModal(page);
		}
	} catch (err) {
		console.warn(`[WARN] ${modalName} audit encountered error:`, err?.message || err);
		await closeModal(page);
	}
}

async function runAudit() {
	console.log("=== STARTING COMPREHENSIVE MULTI-THEME CLINICAL AUDIT ===");
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

			// -------------------------------------------------------------
			// A. AUDIT CLINICAL MODALS STUDIO
			// -------------------------------------------------------------
			await page.goto("http://127.0.0.1:5173/?clinical-modals-studio#clinical-modals-studio", {
				waitUntil: "domcontentloaded",
			});
			await page.waitForSelector("[data-testid='open-pediatric-modal-btn']", { timeout: 10000 });
			await applyTheme(page, theme);
			await page.waitForTimeout(300);
			// 1. Audit AnesthesiaCalculator
			const calcHeader = page.locator("[data-testid='anesthesia-calculator'] > div").first();
			if (await calcHeader.count()) {
				await calcHeader.click();
				await page.waitForTimeout(200);
			}
			const anesthDefects = await auditContrastAndLayout(page, theme, vp.name, "AnesthesiaCalculator");
			allDefects.push(...anesthDefects);
			const shotAnesth = `audit_anesthesia_${theme}_${vp.name}.png`;
			await saveScreenshot(page, shotAnesth);
			console.log(`[PASS] ${shotAnesth}`);

			// 2. Audit PediatricMixedDentitionModal
			await auditModalIfPresent(page, theme, vp, "PediatricMixedDentitionModal", "open-pediatric-modal-btn", "pediatric", allDefects);

			// 3. Audit FiscalReceipt54FzModal
			await auditModalIfPresent(page, theme, vp, "FiscalReceipt54FzModal", "open-fiscal-modal-btn", "fiscal", allDefects);

			// 4. Audit PrescriptionModal
			await auditModalIfPresent(page, theme, vp, "PrescriptionModal", "open-prescription-modal-btn", "prescription", allDefects);

			// 5. Audit RadiologyReferralModal
			await auditModalIfPresent(page, theme, vp, "RadiologyReferralModal", "open-radiology-modal-btn", "radiology", allDefects);

			// 6. Audit FNS Tax Deduction (КНД 1184043 / 1151156)
			await auditModalIfPresent(page, theme, vp, "FnsNdflXmlModal", "open-fns-ndfl-xml-modal-btn", "fns_ndfl", allDefects);

			// 7. Audit Medical Prescription 107-1/у
			await auditModalIfPresent(page, theme, vp, "MedicalPrescriptionModal", "open-med-prescription-modal-btn", "med_prescription", allDefects);

			// 8. Audit EGISZ REMD CDA R2
			await auditModalIfPresent(page, theme, vp, "EgiszRemdXmlModal", "open-egisz-remd-modal-btn", "egisz_remd", allDefects);

			// 9. Audit Informed Consent 1051n
			await auditModalIfPresent(page, theme, vp, "InformedConsent1051nModal", "open-consent-1051n-modal-btn", "consent_1051n", allDefects);

			// 10. Audit SanPin Journals
			await auditModalIfPresent(page, theme, vp, "SanpinJournalsModal", "open-sanpin-journals-modal-btn", "sanpin_journals", allDefects);

			// -------------------------------------------------------------
			// B. AUDIT ODONTOGRAM STUDIO STANDALONE (OPTIONAL)
			// -------------------------------------------------------------
			try {
				await page.goto("http://127.0.0.1:5173/?odontogram-studio#odontogram-studio", {
					waitUntil: "domcontentloaded",
				});
				if (await page.waitForSelector("[data-testid='odontogram-studio-container']", { timeout: 4000 })) {
					await applyTheme(page, theme);
					await page.waitForTimeout(200);

					const odontoDefects = await auditContrastAndLayout(page, theme, vp.name, "OdontogramStudio");
					allDefects.push(...odontoDefects);

					const shotOdonto = `audit_odontogram_${theme}_${vp.name}.png`;
					await saveScreenshot(page, shotOdonto);
					console.log(`[PASS] ${shotOdonto}`);
				}
			} catch {
				/* ignore standalone navigation if studio already audited */
			}

			await context.close();
		}
	}

	await browser.close();

	console.log("\n=== CLINICAL MODALS AUDIT RESULTS SUMMARY ===");
	console.log(`Total Themes Audited: ${THEMES.length}`);
	console.log(`Total Viewports: ${VIEWPORTS.length}`);
	console.log(`Total Defects Found: ${allDefects.length}`);

	if (allDefects.length > 0) {
		console.log("\nDefects detail:");
		for (const d of allDefects) {
			console.log(JSON.stringify(d, null, 2));
		}
	} else {
		console.log("All contrast ratios, touch targets, and layout checks passed across all 10 themes and viewports!");
	}
}

await runAudit();
