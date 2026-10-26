/**
 * scripts/capturePnlProofs.cjs — Red Team 4-State Visual Proofs (Mandate 8b <= 120 lines).
 */
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/finance");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\920623aa-e4d9-4be9-8807-eab21302e829";
[PROOFS_DIR, CONV_DIR].forEach((d) => !fs.existsSync(d) && fs.mkdirSync(d, { recursive: true }));

async function saveProof(page, filename) {
	const targetPath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	if (fs.existsSync(CONV_DIR)) fs.copyFileSync(targetPath, path.join(CONV_DIR, filename));
	const s = fs.statSync(targetPath);
	console.log(`[CAPTURED] ${filename}: ${s.size} bytes`);
	if (s.size < 20000) throw new Error(`Screenshot ${filename} is too small (${s.size} B)`);
}

async function openPnlModal(page) {
	await page.waitForSelector('.boot-state, :has-text("Загрузка системы...")', { state: "detached", timeout: 25000 }).catch(() => {});
	await page.waitForTimeout(1000);
	const optBtn = page.locator('[data-testid="finance-toolbar-options-btn"]').first();
	await optBtn.waitFor({ state: "visible", timeout: 15000 });
	await optBtn.click();
	await page.waitForTimeout(400);
	const pnlItem = page.locator('[role="menuitem"]:has-text("Управленческий P&L")').first();
	await pnlItem.waitFor({ state: "visible", timeout: 5000 });
	await pnlItem.click();
	await page.waitForSelector(".pnl-modal-dialog", { state: "visible", timeout: 15000 });
	await page.waitForTimeout(1000);
}

async function main() {
	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST", headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	const auth = await loginRes.json();
	const basePort = 5173;
	const browserPath = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(fs.existsSync);
	const browser = await chromium.launch({ headless: true, executablePath: browserPath, args: ["--no-sandbox", "--disable-gpu"] });

	try {
		// 1. PC Light & Dark (1440x900) — P&L Dashboard
		for (const theme of ["light", "dark"]) {
			const storageState = {
				cookies: [{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" }],
				origins: [{ origin: `http://127.0.0.1:${basePort}`, localStorage: [
					{ name: "dente_demo_showcase", value: "true" }, { name: "dente_clinic_token", value: auth.clinicToken },
					{ name: "dente_staff_token", value: auth.staffToken }, { name: "dente_active_session_token", value: auth.staffToken },
					{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" }, { name: "dente_user_id", value: auth.user.id },
					{ name: "dente_user_role", value: "owner" }, { name: "dente_role", value: "owner" }, { name: "dente_theme_mode", value: theme },
					{ name: "dente-theme", value: theme }, { name: "theme", value: theme },
					{ name: "dente_onboarding_completed", value: "true" }, { name: "dente_tour_completed", value: "true" },
				]}],
			};
			const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU", colorScheme: theme, storageState });
			const page = await ctx.newPage();
			await page.goto(`http://127.0.0.1:${basePort}/?demo=true#finance`, { waitUntil: "domcontentloaded", timeout: 25000 });
			await page.evaluate(({ th }) => {
				document.documentElement.setAttribute("data-theme", th);
				document.documentElement.classList.toggle("dark", th === "dark");
				document.documentElement.classList.toggle("light", th !== "dark");
				if (document.body) document.body.className = th;
			}, { th: theme });
			await openPnlModal(page);
			await saveProof(page, theme === "light" ? "01_finance_pnl_pc_light.png" : "02_finance_pnl_pc_dark.png");
			await ctx.close();
		}

		// 2. Mobile Light & Dark (390x844) — Quick Expense Modal
		for (const theme of ["light", "dark"]) {
			const storageState = {
				cookies: [{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" }],
				origins: [{ origin: `http://127.0.0.1:${basePort}`, localStorage: [
					{ name: "dente_demo_showcase", value: "true" }, { name: "dente_clinic_token", value: auth.clinicToken },
					{ name: "dente_staff_token", value: auth.staffToken }, { name: "dente_active_session_token", value: auth.staffToken },
					{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" }, { name: "dente_user_id", value: auth.user.id },
					{ name: "dente_user_role", value: "owner" }, { name: "dente_role", value: "owner" }, { name: "dente_theme_mode", value: theme },
					{ name: "dente-theme", value: theme }, { name: "theme", value: theme },
					{ name: "dente_onboarding_completed", value: "true" }, { name: "dente_tour_completed", value: "true" },
				]}],
			};
			const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ru-RU", colorScheme: theme, storageState });
			const page = await ctx.newPage();
			await page.goto(`http://127.0.0.1:${basePort}/?demo=true#finance`, { waitUntil: "domcontentloaded", timeout: 25000 });
			await page.evaluate(({ th }) => {
				document.documentElement.setAttribute("data-theme", th);
				document.documentElement.classList.toggle("dark", th === "dark");
				document.documentElement.classList.toggle("light", th !== "dark");
				if (document.body) document.body.className = th;
			}, { th: theme });
			await openPnlModal(page);

			const expBtn = page.locator(".pnl-action-btn-expense").first();
			await expBtn.waitFor({ state: "visible", timeout: 5000 });
			await expBtn.click();
			await page.waitForSelector('.quick-expense-dialog, .quick-expense-overlay', { state: "visible", timeout: 15000 });
			await page.waitForTimeout(1000);

			await saveProof(page, theme === "light" ? "03_finance_quick_expense_mobile_light.png" : "04_finance_quick_expense_mobile_dark.png");
			await ctx.close();
		}
		console.log("=== ALL 4 RED TEAM PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => { console.error("[CAPTURE ERROR]", err); process.exit(1); });
