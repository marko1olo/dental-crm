/**
 * scripts/capture-batch-writeoff-proofs.mjs
 * Red Team Visual Proofs: Warehouse & Shift Batch Writeoff Modal (1440x900 PC Light & Dark).
 * Complies with Mandates 8am, 8e, 8n, 8b (<= 120 lines).
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/warehouse");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0c212be6-b3f9-459e-b6cd-69d2051924bb";
const PARENT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\07663fdc-eba5-48a1-bbb4-3c4b8f181006";
[PROOFS_DIR, CONV_DIR, PARENT_DIR].forEach((d) => !existsSync(d) && mkdirSync(d, { recursive: true }));

const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const auth = await loginRes.json();
const browserPath = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: browserPath, args: ["--no-sandbox", "--disable-gpu"] });

async function saveProof(page, filename) {
	const targetPath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	[CONV_DIR, PARENT_DIR].forEach((d) => copyFileSync(targetPath, path.join(d, filename)));
	const s = statSync(targetPath);
	console.log(`[CAPTURED] ${filename}: ${s.size} bytes`);
	if (s.size < 40000) throw new Error(`Screenshot ${filename} is too small (${s.size} B)`);
}

try {
	for (const theme of ["light", "dark"]) {
		const storageState = {
			cookies: [{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" }],
			origins: [{ origin: "http://127.0.0.1:5173", localStorage: [
				{ name: "dente_demo_showcase", value: "true" }, { name: "dente_clinic_token", value: auth.clinicToken },
				{ name: "dente_staff_token", value: auth.staffToken }, { name: "dente_active_session_token", value: auth.staffToken },
				{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" }, { name: "dente_user_id", value: auth.user.id },
				{ name: "dente_user_role", value: "doctor" }, { name: "dente_role", value: "doctor" }, { name: "dente_theme_mode", value: theme },
				{ name: "dente-theme", value: theme }, { name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
				{ name: "dente_onboarding_completed", value: "true" }, { name: "dente_tour_completed", value: "true" },
			]}],
		};

		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU", colorScheme: theme, storageState });
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?demo=true#inventory", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(1500);
		await page.waitForSelector('.boot-state', { state: "detached", timeout: 25000 }).catch(() => {});
		await page.evaluate(({ th }) => {
			window.location.hash = "inventory";
			document.documentElement.setAttribute("data-theme", th);
			document.documentElement.classList.toggle("dark", th === "dark");
			document.documentElement.classList.toggle("light", th !== "dark");
			if (document.body) document.body.className = th;
		}, { th: theme });
		await page.waitForTimeout(2000);

		// 1. Скриншот экрана склада
		await saveProof(page, `warehouse_workspace_pc_${theme}.png`);

		// 2. Открытие модалки списания за смену
		const shiftBtn = page.locator('[data-testid="btn-open-shift-batch-deduction"]').first();
		await shiftBtn.waitFor({ state: "visible", timeout: 10000 });
		await shiftBtn.click();
		await page.waitForTimeout(1200);
		await saveProof(page, `warehouse_batch_writeoff_shift_pc_${theme}.png`);

		// 3. Переключение на вкладку Клинические пакеты
		const pkgTab = page.locator('[data-testid="tab-mode-packages"]').first();
		await pkgTab.waitFor({ state: "visible", timeout: 5000 });
		await pkgTab.click();
		await page.waitForTimeout(1000);
		await saveProof(page, `warehouse_batch_writeoff_packages_pc_${theme}.png`);

		await context.close();
	}
	console.log("[BATCH WRITEOFF RED TEAM PROOFS OK]");
} finally {
	await browser.close();
}
