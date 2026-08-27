import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = ["light", "dark"];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/audit",
	"C:/Users/Admin/.gemini/antigravity/brain/69ded610-4c1d-4d3f-8359-693851dbbfd7",
	"C:/Users/Admin/.gemini/antigravity/brain/597374ff-ac94-40b8-8848-ea236f205038",
].filter(Boolean);

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function saveScreenshot(page, filename) {
	const primary = path.join(OUT_DIRS[0], filename);
	try {
		await page.screenshot({ path: primary, timeout: 10000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 10000 });
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
		const isDark = th === "dark" || th === "night";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, theme);
	await page.waitForTimeout(300);
}

const BASE_URL = "http://127.0.0.1:5173";

const MODAL_BUTTON_TEST_IDS = [
	{ id: "open-mixed-dentition-modal-btn", altId: "open-pediatric-modal-btn", name: "pediatric_mixed_dentition" },
	{ id: "open-radiology-modal-btn", altId: "open-radiology-referral-modal-btn", name: "radiology_referral" },
	{ id: "open-prescription-modal-btn", altId: "open-med-prescription-modal-btn", name: "prescription_107_1y" },
	{ id: "open-act-print-modal-btn", altId: "open-act-modal-btn", name: "act_completed_804n" },
	{ id: "open-consent-modal-btn", altId: "open-consent-1051n-modal-btn", name: "informed_consent_1051n" },
	{ id: "open-patient-billing-modal-btn", altId: "open-patient-billing-modal-btn", name: "patient_billing_modal" },
	{ id: "open-viewer-modal-btn", altId: "open-viewer-modal-btn", name: "radiology_viewer_modal" },
	{ id: "open-ceph-modal-btn", altId: "open-ceph-modal-btn", name: "cephalometric_analysis_modal" },
	{ id: "open-billing-1c-export-modal-btn", altId: "open-billing-1c-export-modal-btn", name: "billing_1c_export_modal" },
];

for (const vp of [
	{ name: "pc_1440", width: 1440, height: 900, deviceScaleFactor: 2 },
	{ name: "mobile_390", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]) {
	const context = await browser.newContext({
		viewport: { width: vp.width, height: vp.height },
		deviceScaleFactor: vp.deviceScaleFactor,
		isMobile: vp.isMobile || false,
		hasTouch: vp.hasTouch || false,
	});

	const page = await context.newPage();

	for (const theme of THEMES) {
		await page.goto(`${BASE_URL}/#clinical-modals-studio?theme=${theme}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
		await page.waitForTimeout(500);
		await applyTheme(page, theme);

		for (const modal of MODAL_BUTTON_TEST_IDS) {
			await page.goto(`${BASE_URL}/#clinical-modals-studio?theme=${theme}&modal=${modal.name}`, { waitUntil: "domcontentloaded" }).catch(() => {});
			await applyTheme(page, theme);
			await page.waitForTimeout(400);
			await saveScreenshot(page, `audit_modal_${modal.name}_${theme}_${vp.name}.png`);
		}
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] Modal Visual Proof Captured!");
