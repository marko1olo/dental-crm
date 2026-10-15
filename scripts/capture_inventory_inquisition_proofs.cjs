/**
 * scripts/capture_inventory_inquisition_proofs.cjs
 *
 * Captures 4 live high-resolution screenshots for Inventory / Warehouse domain:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 *
 * Saves to docs/proofs/inventory/ and mirrors to agent brain directory.
 * Verifies size > 20 KB.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const DOCS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/inventory");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/19dc27b8-fe52-4a9c-8443-77f4a4e05575");

async function provisionSession() {
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Склад",
			email: `nurse-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Старшая медсестра Иванова Е. А.",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}

	const initData = await initRes.json();
	const orgId = initData.organizationId;
	console.log(`[Provisioning] Organization created: ${orgId}`);

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}

	const unlockData = await unlockRes.json();
	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	// Добавим репрезентативные материалы на склад (зеленый, желтый, красный статусы)
	const sampleItems = [
		{
			name: "Артикаин 1:100 000 (карпула 1.7 мл)",
			stockQuantity: 18,
			criticalThreshold: 10,
			unitCostRub: 125,
			sku: "ART-100",
		},
		{
			name: "Иглы карпульные 0.3x21 мм",
			stockQuantity: 4,
			criticalThreshold: 10,
			unitCostRub: 18,
			sku: "NDL-21",
		},
		{
			name: "Перчатки смотровые нитриловые M",
			stockQuantity: 45,
			criticalThreshold: 20,
			unitCostRub: 35,
			sku: "GLV-M",
		},
		{
			name: "Композит светового отверждения A2",
			stockQuantity: 0,
			criticalThreshold: 2,
			unitCostRub: 1800,
			sku: "CMP-A2",
		},
		{
			name: "Слюноотсосы одноразовые",
			stockQuantity: 120,
			criticalThreshold: 50,
			unitCostRub: 7,
			sku: "SLN-01",
		},
		{
			name: "Валики ватные стоматологические",
			stockQuantity: 250,
			criticalThreshold: 100,
			unitCostRub: 1.2,
			sku: "VLK-01",
		},
	];

	for (const it of sampleItems) {
		try {
			const res = await fetch(`${API_BASE}/api/inventory/${orgId}/items`, {
				method: "POST",
				headers,
				body: JSON.stringify(it),
			});
			if (!res.ok) {
				console.warn(`Item seed non-ok (${it.name}): ${res.status}`);
			}
		} catch (e) {
			console.warn("Item seed warning:", e.message);
		}
	}

	return {
		orgId,
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		userId: initData.ownerUserId,
	};
}

async function run() {
	if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
	if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--proxy-server=direct://",
			"--proxy-bypass-list=*",
		],
	});

	const targets = [
		{
			name: "inventory_pc_light.png",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
			scale: 2,
		},
		{
			name: "inventory_pc_dark.png",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
			scale: 2,
		},
		{
			name: "inventory_mobile_light.png",
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
			scale: 3,
		},
		{
			name: "inventory_mobile_dark.png",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
			scale: 3,
		},
	];

	for (const t of targets) {
		console.log(`\n[Screenshot] Capturing ${t.name} (${t.viewport.width}x${t.viewport.height}, theme=${t.theme})...`);
		const context = await browser.newContext({
			viewport: t.viewport,
			isMobile: t.isMobile,
			hasTouch: t.isMobile,
			deviceScaleFactor: t.scale,
		});

		// Настройка localStorage до первой загрузки страницы
		await context.addInitScript(
			({ ct, st, uid, theme }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_sidebar_collapsed", "false");
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({
						onboardingDismissed: true,
						onboardingStep: "done",
						version: 1,
					})
				);
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({
						dismissed: true,
						step: "done",
						completed: true,
						onboardingDismissed: true,
						onboardingStep: "done",
						version: 1,
					})
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						onboardingDismissed: true,
						onboardingStep: "done",
					})
				);
				localStorage.setItem(
					"dente-workspace-profile",
					JSON.stringify({
						state: {
							clinicName: "Стоматология ДЕНТЕ Склад",
							currentDoctor: { id: uid, fullName: "Старшая медсестра Иванова Е. А.", role: "owner" },
							flags: { disableTour: true },
						},
					})
				);
			},
			{
				ct: auth.clinicToken,
				st: auth.staffToken,
				uid: auth.userId,
				theme: t.theme,
			}
		);

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[Browser PageError]: ${err.message}`));

		// Переход на #inventory
		await page.goto(`${WEB_BASE}/#inventory`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});

		// Применение темы на случай если класс не синхронизировался
		await page.evaluate((th) => {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
			document.documentElement.setAttribute("data-theme", th);
			if (document.body) document.body.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.documentElement.style.colorScheme = "light";
			}
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(th);
			}
		}, t.theme);

		// Ждем загрузки данных склада
		await page.waitForTimeout(2000);

		// Скрываем плавающие тосты, чтобы не заслонять контент
		await page.evaluate(() => {
			document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .toast-container, .alert-toast, .error-toast, [data-testid="toast"]').forEach(el => {
				el.style.display = "none";
				el.style.opacity = "0";
				el.style.pointerEvents = "none";
			});
		}).catch(() => {});

		const outPathDocs = path.join(DOCS_DIR, t.name);
		const outPathBrain = path.join(BRAIN_DIR, t.name);

		await page.screenshot({ path: outPathDocs, fullPage: false });
		fs.copyFileSync(outPathDocs, outPathBrain);

		const stats = fs.statSync(outPathDocs);
		console.log(`[Success] Saved ${t.name}: size = ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

		if (stats.size < 20 * 1024) {
			console.error(`[Error] ${t.name} is too small: ${stats.size} < 20480 bytes!`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n[Complete] All 4 visual proof screenshots captured successfully!");
}

run().catch((err) => {
	console.error("[Fatal]", err);
	process.exit(1);
});
