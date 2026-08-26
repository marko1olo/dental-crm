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
	"C:/Clinic_MVP/dental-crm/docs/proofs/clinical_modals_audit",
	"C:/Clinic_MVP/dental-crm/docs/proofs/odontogram",
	"C:/Clinic_MVP/dental-crm/docs/proofs/full_crm_audit",
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
	"C:/Users/Admin/.gemini/antigravity/brain/597374ff-ac94-40b8-8848-ea236f205038",
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

async function saveScreenshot(page, filename, targetDirs = OUT_DIRS) {
	const primary = path.join(targetDirs[0], filename);
	try {
		await page.screenshot({ path: primary, timeout: 10000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 10000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
			return;
		}
	}
	for (let i = 1; i < targetDirs.length; i++) {
		try {
			copyFileSync(primary, path.join(targetDirs[i], filename));
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
	await page.waitForTimeout(250);
}

const MODALS_TO_AUDIT = [
	{
		id: "referral_057",
		name: "Форма 057/у-04 (Направление)",
		trigger: "open-referral-057-modal-btn",
		selector: ".ref057-modal-container",
	},
	{
		id: "sick_leave_eln",
		name: "ЭЛН Больничный лист",
		trigger: "open-sick-leave-eln-modal-btn",
		selector: ".sick-leave-modal-container",
	},
	{
		id: "autoclave_log_257",
		name: "Журнал автоклавирования 257/у",
		trigger: "open-autoclave-log-257-modal-btn",
		selector: ".autoclave-log-modal-container",
	},
	{
		id: "doctor_shift_roster",
		name: "График смен врачей",
		trigger: "open-doctor-shift-roster-modal-btn",
		selector: ".roster-modal-container",
	},
	{
		id: "loyalty_program",
		name: "Программа лояльности и сертификаты",
		trigger: "open-loyalty-program-modal-btn",
		selector: ".loyalty-modal-container",
	},
	{
		id: "pediatric",
		name: "Сменный прикус (Детская одонтограмма)",
		trigger: "open-pediatric-modal-btn",
		selector: ".pediatric-modal-container, .fixed.inset-0",
	},
	{
		id: "prescription",
		name: "Рецептурный бланк 107-1/у",
		trigger: "open-prescription-modal-btn",
		selector: ".prescription-modal-container, .fixed.inset-0",
	},
	{
		id: "radiology",
		name: "Радиовизиография / КТ просмотрщик",
		trigger: "open-radiology-modal-btn",
		selector: ".radiology-modal-container, .fixed.inset-0",
	},
	{
		id: "sanpin_journals",
		name: "Журналы СанПиН и стерилизация",
		trigger: "open-sanpin-journals-modal-btn",
		selector: ".sanpin-journals-modal-container, .fixed.inset-0",
	},
];

console.log("=== STARTING MASTER MULTIMODAL THEME AUDIT ===");

let totalSuccess = 0;
let totalFailed = 0;

for (const theme of THEMES) {
	console.log(`\n========================================`);
	console.log(`Auditing Theme: ${theme.toUpperCase()}`);
	console.log(`========================================`);

	for (const vp of VIEWPORTS) {
		const context = await browser.newContext({
			viewport: { width: vp.width, height: vp.height },
			deviceScaleFactor: vp.scale,
			isMobile: vp.isMobile,
			hasTouch: vp.hasTouch,
		});

		const page = await context.newPage();

		try {
			// 1. Audit Odontogram Studio
			await page.goto("http://127.0.0.1:5173/#odontogram-studio", {
				waitUntil: "networkidle",
				timeout: 15000,
			});
			await applyTheme(page, theme);
			await page.waitForTimeout(300);

			// 1a. 3D Anatomical
			const tab3d = page.locator("button:has-text('3D Анатомический')").first();
			if (await tab3d.count()) {
				await tab3d.click({ force: true });
				await page.waitForTimeout(200);
			}
			const odontoShot = `audit_odontogram_${theme}_${vp.name}.png`;
			await saveScreenshot(page, odontoShot);
			console.log(`[PASS] ${odontoShot}`);
			totalSuccess++;

			// 1b. GOST Table
			const tabGost = page.locator("button:has-text('ГОСТ 043')").first();
			if (await tabGost.count()) {
				await tabGost.click({ force: true });
				await page.waitForTimeout(200);
				const gostShot = `audit_gost_${theme}_${vp.name}.png`;
				await saveScreenshot(page, gostShot);
				console.log(`[PASS] ${gostShot}`);
				totalSuccess++;
			}

			// 1c. Radial menu (PC & Tablet)
			if (vp.name !== "mobile_390") {
				const tooth16 = page.locator("button[data-tooth-id='16'], button:has-text('16')").first();
				if (await tooth16.count()) {
					await tooth16.click({ force: true });
					await page.waitForTimeout(250);
					const radialShot = `audit_radial_menu_${theme}_${vp.name}.png`;
					await saveScreenshot(page, radialShot);
					console.log(`[PASS] ${radialShot}`);
					totalSuccess++;
					await page.keyboard.press("Escape");
					await page.waitForTimeout(150);
				}
			}

			// 2. Audit Clinical Modals Studio
			await page.goto("http://127.0.0.1:5173/?clinical-modals-studio#clinical-modals-studio", {
				waitUntil: "networkidle",
				timeout: 15000,
			});
			await applyTheme(page, theme);
			await page.waitForTimeout(300);

			// 2a. Expand Anesthesia Calculator
			const calcHeader = page.locator("[data-testid='anesthesia-calculator'] > div").first();
			if (await calcHeader.count()) {
				await calcHeader.click({ force: true });
				await page.waitForTimeout(200);
				const anesthShot = `audit_anesthesia_${theme}_${vp.name}.png`;
				await saveScreenshot(page, anesthShot);
				console.log(`[PASS] ${anesthShot}`);
				totalSuccess++;
			}

			// 2b. Studio Overview Showcase
			const showcaseShot = `audit_studio_showcase_${theme}_${vp.name}.png`;
			await saveScreenshot(page, showcaseShot);
			console.log(`[PASS] ${showcaseShot}`);
			totalSuccess++;

			// 2c. Audit each modal in list
			for (const modal of MODALS_TO_AUDIT) {
				const triggerBtn = page.locator(`[data-testid="${modal.trigger}"]`).first();
				if (await triggerBtn.count()) {
					try {
						await triggerBtn.scrollIntoViewIfNeeded();
						await triggerBtn.click({ force: true });
						await page.waitForTimeout(350);

						const modalShot = `audit_${modal.id}_${theme}_${vp.name}.png`;
						await saveScreenshot(page, modalShot);
						console.log(`  [PASS] ${modalShot}`);
						totalSuccess++;

						// Close modal cleanly via Escape or close button
						const closeBtn = page.locator("button[aria-label='Закрыть'], button:has-text('Закрыть'), button:has-text('Отмена'), .modal-close-btn").first();
						if (await closeBtn.count()) {
							await closeBtn.click({ force: true });
						} else {
							await page.keyboard.press("Escape");
						}
						await page.waitForTimeout(150);
					} catch (modalErr) {
						console.warn(`  [WARN] Modal ${modal.id} capture error:`, modalErr?.message || modalErr);
						await page.keyboard.press("Escape");
						totalFailed++;
					}
				}
			}

		} catch (err) {
			console.error(`[ERROR] Audit error for theme ${theme} [${vp.name}]:`, err?.message || err);
			totalFailed++;
		} finally {
			await context.close();
		}
	}
}

await browser.close();

console.log("\n========================================");
console.log(`MASTER AUDIT COMPLETE! Total Success: ${totalSuccess}, Failed: ${totalFailed}`);
console.log("========================================");
