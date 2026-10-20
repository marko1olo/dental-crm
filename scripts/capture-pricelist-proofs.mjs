import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const OUT_DIR = path.join(process.cwd(), "docs/screenshots/pricelist");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
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

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
	return chromium.launch(launchOptions);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionFreshClinic() {
	const uniqueId = Date.now();
	const email = `pricelist-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматологическая клиника «DENTE»",
			email,
			password,
			ownerName: "Д-р Петров А. В.",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup/init failed: HTTP ${initRes.status} - ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
	};
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(300);
}

async function run() {
	const browser = await getBrowser();
	const auth = await provisionFreshClinic();

	const states = [
		{
			name: "pricelist_pc_light_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			name: "pricelist_pc_dark_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			name: "pricelist_mobile_light_390x844.png",
			viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
			theme: "light",
			isMobile: true,
		},
		{
			name: "pricelist_mobile_dark_390x844.png",
			viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
			theme: "dark",
			isMobile: true,
		},
	];

	for (const state of states) {
		console.log(`[CAPTURE] Rendering ${state.name}...`);
		const context = await browser.newContext({
			viewport: state.viewport,
			deviceScaleFactor: state.viewport.deviceScaleFactor || 1,
			colorScheme: state.theme,
		});

		const page = await context.newPage();

		await page.addInitScript(({ cToken, sToken, thm }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_theme_mode", thm);
			localStorage.setItem("dente_workspace_perspective", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
				dismissed: true,
				step: "done",
			}));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}));
		}, {
			cToken: auth.clinicToken,
			sToken: auth.staffToken,
			thm: state.theme,
		});

		page.on('console', (msg) => {
			const txt = msg.text();
			if (txt.includes('error') || txt.includes('warn') || txt.includes('DENTE')) {
				console.log(`[PAGE] ${txt}`);
			}
		});
		page.on('pageerror', (err) => console.log(`[PAGE ERR] ${err.message}`));

		await page.goto(`${APP_BASE}/#settings`, { waitUntil: "commit", timeout: 30000 });
		await page.waitForSelector("#root", { timeout: 30000 });
		await wait(2500);
		await applyTheme(page, state.theme);

		// Switch to prices tab
		await page.evaluate(() => {
			const btns = Array.from(document.querySelectorAll("button"));
			const priceTabBtn = btns.find((b) => b.textContent && b.textContent.includes("Прейскурант"));
			if (priceTabBtn) priceTabBtn.click();
		});
		await wait(1000);

		// Open ServicePricelistManagerModal
		await page.evaluate(() => {
			const modalBtn = document.querySelector('[data-testid="open-service-pricelist-modal-btn"]');
			if (modalBtn) {
				modalBtn.click();
			} else {
				// Fallback: look for "Печать" or "Прейскурант" button
				const btns = Array.from(document.querySelectorAll("button"));
				const btn = btns.find((b) => b.textContent && (b.textContent.includes("Печать А4") || b.textContent.includes("Печать")));
				if (btn) btn.click();
			}
		});
		await wait(1200);

		// Open Batch Bar to showcase batch indexing functionality (+5%, +10%, 0 ₽ Гарантия, До 100 ₽)
		await page.evaluate(() => {
			const batchBtn = Array.from(document.querySelectorAll("button")).find(
				(b) => b.textContent && b.textContent.includes("Индексация")
			);
			if (batchBtn) batchBtn.click();
		});
		await wait(500);

		const outPath = path.join(OUT_DIR, state.name);
		const rootPath = path.join(process.cwd(), state.name);

		await page.screenshot({ path: outPath, fullPage: false });
		await page.screenshot({ path: rootPath, fullPage: false });

		console.log(`[CAPTURE] Saved: ${outPath} and ${rootPath}`);
		await context.close();
	}

	await browser.close();
	console.log("[CAPTURE] All 4 states successfully captured!");
}

run().catch((err) => {
	console.error("[ERROR] Capture failed:", err);
	process.exit(1);
});
