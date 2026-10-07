import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const OUT_DIR = path.join(process.cwd(), "docs/screenshots/vk");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = {
	pc: { width: 1440, height: 900, deviceScaleFactor: 1 },
	mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
};

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function provisionFreshClinic() {
	const uniqueId = Date.now();
	const email = `vk-tester-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ ВК-Тест",
			email,
			password,
			ownerName: "Д-р Смирнов Алексей Павлович",
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
	try {
		await page.waitForLoadState("domcontentloaded");
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			localStorage.setItem("dente_theme_mode", th);
		}, theme);
		await page.waitForTimeout(300);
	} catch (err) {
		console.log("[THEME SOFT CATCH]", err.message);
	}
}

async function main() {
	console.log("[SCREENSHOTS] Starting VK Integration Visual Proof Engine...");

	const creds = await provisionFreshClinic();
	console.log(`[PROVISION] Clinic ready: orgId=${creds.organizationId}`);

	// Подключим mock-сообщество и личный аккаунт через API, чтобы экраны были с реальными данными!
	const connectBotRes = await fetch(`${API_BASE}/api/vk/bot/connect`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": creds.clinicToken,
			"x-dente-staff-token": creds.staffToken,
		},
		body: JSON.stringify({
			groupId: "220000888",
			groupToken: "mock_vk_group_token_demo",
			secretKey: "vk_sec_9988776655",
			confirmationCode: "conf888",
			isEnabled: true,
		}),
	});
	console.log(`[SEED] VK Bot connect HTTP status: ${connectBotRes.status}`);

	const connectAccRes = await fetch(`${API_BASE}/api/vk/account/connect`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": creds.clinicToken,
			"x-dente-staff-token": creds.staffToken,
		},
		body: JSON.stringify({
			accessToken: "mock_vk_user_token_demo",
			vkUserId: "77889900",
		}),
	});
	console.log(`[SEED] VK Account connect HTTP status: ${connectAccRes.status}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const targets = [
		{ name: "vk_01_community_pc_light", viewport: VIEWPORTS.pc, theme: "light", subtab: "community" },
		{ name: "vk_02_community_pc_dark", viewport: VIEWPORTS.pc, theme: "dark", subtab: "community" },
		{ name: "vk_03_community_mobile_light", viewport: VIEWPORTS.mobile, theme: "light", subtab: "community" },
		{ name: "vk_04_community_mobile_dark", viewport: VIEWPORTS.mobile, theme: "dark", subtab: "community" },
		{ name: "vk_05_account_pc_light", viewport: VIEWPORTS.pc, theme: "light", subtab: "account" },
		{ name: "vk_06_account_mobile_dark", viewport: VIEWPORTS.mobile, theme: "dark", subtab: "account" },
	];

	for (const t of targets) {
		console.log(`[CAPTURE] Rendering ${t.name} (${t.viewport.width}x${t.viewport.height}, theme=${t.theme})...`);
		const context = await browser.newContext({
			viewport: { width: t.viewport.width, height: t.viewport.height },
			deviceScaleFactor: t.viewport.deviceScaleFactor,
		});

		const uiPrefs = JSON.stringify({
			version: 1,
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
			savedAt: new Date().toISOString(),
		});

		await context.addInitScript(({ cTok, sTok, oId, theme, prefs }) => {
			window.localStorage.setItem("dente_clinic_token", cTok);
			window.localStorage.setItem("dente_staff_token", sTok);
			window.localStorage.setItem("dente_active_org", oId);
			window.localStorage.setItem("dente_theme_mode", theme);
			window.localStorage.setItem("dental-crm:web-ui-preferences:v1", prefs);
			window.localStorage.setItem("dente_tour_completed", "true");
			window.localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			window.localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			window.localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isTourActive: false, isDismissedPermanently: true }));
		}, { cTok: creds.clinicToken, sTok: creds.staffToken, oId: creds.organizationId, theme: t.theme, prefs: uiPrefs });

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR ${t.name}]`, err.message));

		// Переход в настройки мессенджеров через хеш-роутер SPA
		await page.goto(`${APP_BASE}/#settings/telegram`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(2500);

		await applyTheme(page, t.theme);
		await page.waitForTimeout(500);


		// Клик по вкладке ВКонтакте в списке мессенджеров
		const vkTabBtn = page.locator("#messenger-tab-vk");
		await vkTabBtn.waitFor({ state: "attached", timeout: 15000 });
		await vkTabBtn.scrollIntoViewIfNeeded();
		await vkTabBtn.click({ force: true });
		await page.waitForTimeout(800);

		const hubLocator = page.locator(".vk-hub-container");
		await hubLocator.waitFor({ state: "visible", timeout: 15000 });
		await hubLocator.scrollIntoViewIfNeeded();

		// Выбор подвкладки (community или account)
		if (t.subtab === "account") {
			const accBtn = page.locator("button.vk-subtab-btn:has-text('Личная страница')");
			await accBtn.waitFor({ state: "visible", timeout: 10000 });
			await accBtn.click();
			await page.waitForTimeout(600);
		} else {
			const commBtn = page.locator("button.vk-subtab-btn:has-text('Сообщество')");
			await commBtn.waitFor({ state: "visible", timeout: 10000 });
			await commBtn.click();
			await page.waitForTimeout(600);
		}

		await page.waitForTimeout(800);

		const outPath = path.join(OUT_DIR, `${t.name}.png`);
		await page.screenshot({ path: outPath, fullPage: false });

		const bytes = readFileSync(outPath);
		const hash = crypto.createHash("md5").update(bytes).digest("hex");
		console.log(`[PROOF] Saved ${outPath} (${bytes.length} bytes, MD5: ${hash})`);

		await context.close();
	}

	await browser.close();
	console.log("[SCREENSHOTS] All visual proofs captured successfully!");
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
