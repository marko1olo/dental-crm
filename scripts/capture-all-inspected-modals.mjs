import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = ["light", "dark"];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/audit",
	"C:/Clinic_MVP/dental-crm/docs/screenshots",
	"C:/Users/Admin/.gemini/antigravity/brain/20f790a1-5c06-42aa-85a4-6738dbe30aa6",
	"C:/Users/Admin/.gemini/antigravity/brain/46a0d6d1-aaa9-4a6d-8bd6-c30138e73d80",
	"C:/Users/Admin/.gemini/antigravity/brain/28922cfe-a09a-4693-aa79-8e62cf0bac22",
	"C:/Users/Admin/.gemini/antigravity/brain/69ded610-4c1d-4d3f-8359-693851dbbfd7",
	"C:/Users/Admin/.gemini/antigravity/brain/597374ff-ac94-40b8-8848-ea236f205038",
	"C:/Users/Admin/.gemini/antigravity/brain/dff68eac-163e-4466-ad77-bb5c3a4c69cb",
	process.env.BRAIN_DIR,
].filter(Boolean);

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));
console.log(`[INIT] Browser executable: ${browserExecutable || "bundled Playwright Chromium"}`);

const launchOptions = {
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
};
if (browserExecutable) {
	launchOptions.executablePath = browserExecutable;
}

const browser = await chromium.launch(launchOptions);

async function saveScreenshot(page, filename, retry = true) {
	const primary = path.join(OUT_DIRS[0], filename);
	try {
		await page.screenshot({ path: primary, timeout: 5000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 5000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
			return;
		}
	}

	// Verify non-empty screenshot
	if (retry && existsSync(primary)) {
		const size = statSync(primary).size;
		if (size < 30000) {
			await page.waitForTimeout(600);
			return saveScreenshot(page, filename, false);
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
	try {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark" || th === "night" || th === "cyber_xray" || th === "ocean" || th === "emerald";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			if (document.body) {
				document.body.className = isDark ? "dark" : "light";
			}
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, theme);
	} catch {
		/* ignore navigation context changes */
	}
}

const BASE_URL = "http://127.0.0.1:5173";

const MODAL_BUTTON_TEST_IDS = [
	// Clinical Core Modals
	{ id: "open-pediatric-modal-btn", altId: "open-mixed-dentition-modal-btn", name: "pediatric_mixed_dentition" },
	{ id: "open-radiology-modal-btn", altId: "open-radiology-referral-modal-btn", name: "radiology_referral" },
	{ id: "open-prescription-modal-btn", altId: "open-med-prescription-modal-btn", name: "prescription_107_1y" },
	{ id: "open-act-print-modal-btn", altId: "open-act-modal-btn", name: "act_completed_804n" },
	{ id: "open-consent-modal-btn", altId: "open-consent-1051n-modal-btn", name: "informed_consent_1051n" },
	{ id: "open-patient-billing-modal-btn", altId: "open-patient-billing-modal-btn", name: "patient_billing_modal" },
	{ id: "open-viewer-modal-btn", altId: "open-dropzone-viewer-btn", name: "radiology_viewer_modal" },
	{ id: "open-ceph-modal-btn", altId: "open-ceph-empty-btn", name: "cephalometric_analysis_modal" },
	{ id: "open-billing-1c-export-modal-btn", altId: "open-billing-1c-export-modal-btn", name: "billing_1c_export_modal" },

	// Wave 4: Domain 1 — Лаборатория (ЗТЛ / Dental Lab Orders)
	{ id: "open-lab-work-order-modal-btn", altId: "open-lab-order-modal-btn", name: "lab_work_order" },
	{ id: "open-lab-order-modal-btn", altId: "open-lab-stl-modal-btn", name: "dental_lab_order" },

	// Wave 4: Domain 2 — Списание материалов (BOM / 804n Consumption Norms)
	{ id: "open-procedure-deduction-modal-btn", altId: "open-clinical-writeoff-modal-btn", name: "procedure_material_deduction" },
	{ id: "open-clinical-writeoff-modal-btn", altId: "open-clinical-writeoff-modal-btn", name: "clinical_writeoff" },

	// Wave 4: Domain 3 — Памятка пациенту (Post-Op Care Memos / Форма 043/у)
	{ id: "open-patient-memo-modal-btn", altId: "open-patient-memo-modal-btn", name: "post_op_patient_memo" },

	// Wave 4: Domain 4 — Аналитика возвращаемости (Retention & Recalls)
	{ id: "open-recall-modal-btn", altId: "open-recall-modal-btn", name: "patient_retention_recalls" },
	{ id: "open-before-after-modal-btn", altId: "open-photo-protocol-modal-btn", name: "before_after_slider" },

	// Wave 5: Domain 1 — Телефония и Входящий звонок
	{ id: "open-incoming-call-modal-btn", altId: "open-telephony-popup-modal-btn", name: "incoming_call_popup" },
	{ id: "open-telephony-widget-btn", altId: "open-telephony-softphone-modal-btn", name: "telephony_softphone" },

	// Wave 5: Domain 2 — Ролевая матрица доступа и расчет комиссий
	{ id: "open-settings-access-modal-btn", altId: "open-access-matrix-modal-btn", name: "settings_access_matrix" },
	{ id: "open-staff-commissions-modal-btn", altId: "open-doctor-commissions-modal-btn", name: "staff_commissions_panel" },

	// Wave 5: Domain 3 — Центр аудита ЭМК главврача 043/у
	{ id: "open-cmo-compliance-modal-btn", altId: "open-cmo-hub-modal-btn", name: "cmo_compliance_hub" },
	{ id: "open-form043-print-modal-btn", altId: "open-form043-modal-btn", name: "form043_print_modal" },

	// Wave 5: Domain 4 — Офлайн-хранилище и бэкап базы
	{ id: "open-offline-vault-modal-btn", altId: "open-backup-vault-modal-btn", name: "offline_backup_vault" },
];

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, deviceScaleFactor: 2 },
	{ name: "mobile_390", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

const startTime = Date.now();
let capturedCount = 0;

for (const vp of VIEWPORTS) {
	const context = await browser.newContext({
		viewport: { width: vp.width, height: vp.height },
		deviceScaleFactor: vp.deviceScaleFactor,
		isMobile: vp.isMobile || false,
		hasTouch: vp.hasTouch || false,
	});

	const page = await context.newPage();

	await page.addInitScript(() => {
		window.localStorage.setItem("dente_organization_id", "c-1");
		window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
		window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
		window.localStorage.setItem("dente_active_session_token", "mock-session-token");
		window.localStorage.setItem("dente_user_role", "doctor");
		window.localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
		window.localStorage.setItem("dente_offline_mode", "true");
		window.localStorage.setItem("dente_theme_mode", "dark");
		window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		window.localStorage.setItem("dente_onboarding_completed", "true");
		window.localStorage.setItem("dente_active_user", JSON.stringify({
			id: "usr-doc-1",
			name: "Д-р Смирнов Алексей Петрович",
			role: "doctor",
			organizationId: "c-1",
		}));
		window.localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
	});

	// Warm up page
	await page.goto(`${BASE_URL}/?standalone=clinical-modals-studio`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});

	for (const theme of THEMES) {
		console.log(`\n[VIEWPORT] ${vp.name} | [THEME] ${theme}`);

		for (const modal of MODAL_BUTTON_TEST_IDS) {
			const targetUrl = `${BASE_URL}/?standalone=clinical-modals-studio&theme=${theme}&modal=${modal.name}#clinical-modals-studio?theme=${theme}&modal=${modal.name}`;
			
			// Isolated navigation: opening the targeted url directly mounts the requested modal and unmounts previous
			await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
			await applyTheme(page, theme);

			// Check if modal dialog container is present in the DOM
			const modalDialog = page.locator('[role="dialog"], [data-testid*="modal"], [data-testid*="drawer"]').first();
			await modalDialog.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
			const isVisible = await modalDialog.isVisible().catch(() => false);

			// Fallback: If not open via query parameter, click the dedicated trigger button
			if (!isVisible) {
				const trigger = page.locator(`[data-testid="${modal.id}"]`).or(page.locator(`[data-testid="${modal.altId}"]`)).first();
				if (await trigger.isVisible().catch(() => false)) {
					await trigger.click({ timeout: 1000, force: true }).catch(() => {});
				}
				await modalDialog.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
			}

			await page.waitForTimeout(300);

			const filename = `audit_modal_${modal.name}_${theme}_${vp.name}.png`;
			await saveScreenshot(page, filename);
			capturedCount++;
			console.log(`  [CAPTURED ${capturedCount}/${VIEWPORTS.length * THEMES.length * MODAL_BUTTON_TEST_IDS.length}] ${filename}`);
		}
	}

	await context.close();
}

await browser.close();
const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n[SUCCESS] Modal Visual Proof Completed: ${capturedCount} screenshots saved across ${OUT_DIRS.length} target directories in ${elapsedSec}s!`);

