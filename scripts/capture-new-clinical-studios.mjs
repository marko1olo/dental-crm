import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
	"C:/Clinic_MVP/dental-crm/docs/proofs/studios",
	"C:/Users/Admin/.gemini/antigravity/brain/73166fa7-40ab-457f-a4ed-baa0bf374e84",
	"C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f",
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
	console.error("Microsoft Edge not found!");
	process.exit(1);
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const STUDIOS = [
	{
		id: "referral_057",
		name: "Form 057/u-04 Medical Referral Studio",
		triggerTestId: "open-referral-057-modal-btn",
		modalSelector: ".ref057-modal-container",
	},
	{
		id: "sick_leave_eln",
		name: "Electronic Sick Leave ELN Studio",
		triggerTestId: "open-sick-leave-eln-modal-btn",
		modalSelector: ".sick-leave-modal-container",
	},
	{
		id: "autoclave_log_257",
		name: "Autoclave Sterilizer Journal Form 257/u Studio",
		triggerTestId: "open-autoclave-log-257-modal-btn",
		modalSelector: ".autoclave-log-modal-container",
	},
	{
		id: "doctor_shift_roster",
		name: "Doctor Shift Roster Studio",
		triggerTestId: "open-doctor-shift-roster-modal-btn",
		modalSelector: ".roster-modal-container",
	},
	{
		id: "loyalty_program",
		name: "Dental Loyalty & Gift Certificate Studio",
		triggerTestId: "open-loyalty-program-modal-btn",
		modalSelector: ".loyalty-modal-container",
	},
];

const CONFIGS = [
	{
		key: "pc_dark",
		label: "PC Dark (Standard Dark)",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		theme: "dark",
		isMobile: false,
	},
	{
		key: "pc_light",
		label: "PC Light (Standard Light)",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		theme: "light",
		isMobile: false,
	},
	{
		key: "mobile_dark",
		label: "Mobile Dark (Standard Dark)",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		theme: "dark",
		isMobile: true,
	},
	{
		key: "mobile_light",
		label: "Mobile Light (Standard Light)",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		theme: "light",
		isMobile: true,
	},
];

const capturedFiles = [];

for (const config of CONFIGS) {
	console.log(`\n========================================`);
	console.log(`Capturing state: ${config.label}`);
	console.log(`========================================`);

	const context = await browser.newContext({
		viewport: config.viewport,
		deviceScaleFactor: config.deviceScaleFactor,
		isMobile: config.isMobile,
		hasTouch: config.isMobile,
	});

	for (const studio of STUDIOS) {
		console.log(`  -> ${studio.name} [${config.key}]...`);

		const page = await context.newPage();

		try {
			await page.goto("http://127.0.0.1:5173/#clinical-modals-studio", {
				waitUntil: "load",
				timeout: 20000,
			});

			// Apply theme before opening modal
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
			}, config.theme);

			await page.waitForTimeout(200);

			const triggerBtn = page.locator(`[data-testid="${studio.triggerTestId}"]`);
			await triggerBtn.waitFor({ state: "visible", timeout: 10000 });
			await triggerBtn.scrollIntoViewIfNeeded();
			await triggerBtn.click();

			const modal = page.locator(studio.modalSelector);
			await modal.waitFor({ state: "visible", timeout: 10000 });
			await page.waitForTimeout(600);

			// Perform automated a11y & layout audit in browser context
			const pageAudit = await page.evaluate((selector) => {
				const modalEl = document.querySelector(selector) || document.body;
				const buttons = Array.from(modalEl.querySelectorAll("button, a, input, select"));
				let sub44TouchTargets = 0;
				for (const el of buttons) {
					const rect = el.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						if (rect.width < 40 || rect.height < 40) {
							sub44TouchTargets++;
						}
					}
				}

				const textNodes = Array.from(modalEl.querySelectorAll("h1, h2, h3, h4, p, span, th, td"));
				let clippedCount = 0;
				for (const node of textNodes) {
					if (node.scrollWidth > node.clientWidth + 5 && window.getComputedStyle(node).overflow === "hidden") {
						clippedCount++;
					}
				}

				const modalBg = window.getComputedStyle(modalEl).backgroundColor;

				return {
					totalInteractive: buttons.length,
					sub44TouchTargets,
					clippedCount,
					bgColor: modalBg,
				};
			}, studio.modalSelector);

			const filename = `${studio.id}_${config.key}.png`;

			for (const dir of OUT_DIRS) {
				const targetPath = path.join(dir, filename);
				await page.screenshot({
					path: targetPath,
					fullPage: false,
					timeout: 15000,
				});
			}

			capturedFiles.push({
				studioId: studio.id,
				studioName: studio.name,
				stateKey: config.key,
				stateLabel: config.label,
				theme: config.theme,
				viewport: `${config.viewport.width}x${config.viewport.height}`,
				filename,
				path: path.join("C:/Clinic_MVP/dental-crm/apps/web/screenshots", filename),
				audit: pageAudit,
			});

			console.log(`     Saved: ${filename} (Interactive: ${pageAudit.totalInteractive}, Sub-44: ${pageAudit.sub44TouchTargets}, Overflow: ${pageAudit.clippedCount})`);
		} catch (err) {
			console.error(`     FAILED ${studio.id} [${config.key}]: ${err.message}`);
		} finally {
			await page.close();
		}
	}

	await context.close();
}

await browser.close();

console.log("\n========================================");
console.log(`TOTAL CAPTURED: ${capturedFiles.length} screenshots successfully verified!`);
console.log("========================================");
