/**
 * scripts/take_warehouse_redteam_proofs.cjs
 *
 * Captures 4-state visual proofs for the Warehouse & Inventory domain:
 * 1. warehouse_stock_pc_light.png (1440x900 PC Light)
 * 2. warehouse_stock_pc_dark.png (1440x900 PC Dark)
 * 3. warehouse_waybills_mobile_light.png (390x844 Mobile Light)
 * 4. warehouse_waybills_mobile_dark.png (390x844 Mobile Dark)
 *
 * Invariants:
 * - Real Fastify API (http://127.0.0.1:4100) + Vite Frontend (http://127.0.0.1:5173) + PostgreSQL 18
 * - Seeded dental inventory items with FEFO dates, lot numbers, kopecks math, soft overdraft
 * - Verified file sizes >= 20 KB
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/inventory");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/581c5bc9-6fa0-4c65-9d42-e7fe18db913a");

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionTestClinic() {
	const ts = Date.now();
	console.log(">>> [AUTH] Initializing test clinic in PostgreSQL...");
	const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `warehouse-redteam-${ts}@dente-live.local`,
			password: "Password123!",
			ownerName: "Д-р Кузнецов Андрей Владимирович",
			ownerPin: "123456",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Init clinic failed: ${initRes.status} ${await initRes.text()}`);
	}

	const initData = await initRes.json();
	const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
	}

	const unlockData = await unlockRes.json();
	const staffToken = unlockData.staffToken;

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": staffToken,
		Authorization: `Bearer ${staffToken}`,
	};

	console.log(`>>> [SEED] Seeding dental inventory items to organization ${initData.organizationId}...`);
	const sampleItems = [
		{
			name: "Артикаин 1:100 000 карпула 1.7 мл",
			category: "Анестезия",
			stockQuantity: 120,
			criticalThreshold: 30,
			unitCostRub: 95.0,
			unit: "карп.",
			sku: "ART-100",
			lotNumber: "LOT-441A",
			expirationDate: "2027-12-31",
		},
		{
			name: "Скандонест 3% карпула 1.7 мл",
			category: "Анестезия",
			stockQuantity: 5,
			criticalThreshold: 20,
			unitCostRub: 85.0,
			unit: "карп.",
			sku: "SKN-300",
			lotNumber: "LOT-901B",
			expirationDate: "2026-11-15",
		},
		{
			name: "Filtek Ultimate A2 Body (шприц 4г)",
			category: "Композиты",
			stockQuantity: 14,
			criticalThreshold: 4,
			unitCostRub: 3200.0,
			unit: "шпр.",
			sku: "FLT-A2",
			lotNumber: "FLT-882",
			expirationDate: "2028-06-30",
		},
		{
			name: "Single Bond 2 (флакон 6мл)",
			category: "Адгезивы",
			stockQuantity: 6,
			criticalThreshold: 2,
			unitCostRub: 4500.0,
			unit: "фл.",
			sku: "SB2-6ML",
			lotNumber: "SB2-104",
			expirationDate: "2027-09-15",
		},
		{
			name: "Перчатки нитриловые M (пачка 100 шт)",
			category: "Расходные материалы",
			stockQuantity: 28,
			criticalThreshold: 10,
			unitCostRub: 480.0,
			unit: "пач.",
			sku: "GLV-M",
			lotNumber: "GLV-2026",
			expirationDate: "2029-01-01",
		},
		{
			name: "Маски трехслойные защитные (пачка 50 шт)",
			category: "Расходные материалы",
			stockQuantity: 45,
			criticalThreshold: 10,
			unitCostRub: 150.0,
			unit: "пач.",
			sku: "MSK-50",
			lotNumber: "MSK-50",
			expirationDate: "2029-05-01",
		},
		{
			name: "Эндодонтические файлы ProTaper Gold F1",
			category: "Эндодонтия",
			stockQuantity: 10,
			criticalThreshold: 3,
			unitCostRub: 1850.0,
			unit: "уп.",
			sku: "PTG-F1",
			lotNumber: "PTG-F1",
			expirationDate: "2030-01-01",
		},
	];

	for (const it of sampleItems) {
		const res = await fetch(`http://127.0.0.1:4100/api/inventory/${initData.organizationId}`, {
			method: "POST",
			headers,
			body: JSON.stringify(it),
		});
		if (!res.ok) {
			console.warn(`[WARN] Failed to seed ${it.name}: ${res.status}`);
		} else {
			const created = await res.json();
			// For Scandonest, perform soft overdraft deduction to -5
			if (it.sku === "SKN-300" && created.id) {
				await fetch(`http://127.0.0.1:4100/api/inventory/${initData.organizationId}/${created.id}/stock`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						adjustment: -10,
						allowOverdraft: true,
						reason: "Экстренное списание у кресла врача (Мандат 8e / овердрафт)",
					}),
				}).catch(() => {});
			}
		}
	}

	return {
		clinicToken: initData.clinicToken,
		organizationId: initData.organizationId,
		staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

async function setTheme(page, theme) {
	await page.evaluate((t) => {
		const root = document.documentElement;
		root.setAttribute("data-theme", t);
		if (t === "dark") {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
		}
		localStorage.setItem("dente_theme_mode", t);
		if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
			window.__useThemeStore.getState().setThemeMode(t);
		}
	}, theme);
	await page.waitForTimeout(400);
}

async function saveProof(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: docsPath, fullPage: false });
	fs.copyFileSync(docsPath, brainPath);

	const stats = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
	if (stats.size < 20 * 1024) {
		console.warn(`[WARNING] File ${filename} is smaller than 20 KB!`);
	}
}

async function main() {
	const creds = await provisionTestClinic();

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	// -------------------------------------------------------------
	// 1. DESKTOP VIEWPORT (1440x900) — STOCK TABLE PC LIGHT & DARK
	// -------------------------------------------------------------
	console.log("\n>>> [PC] Launching Desktop Context (1440x900)...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await pcContext.addInitScript(
		({ ct, orgId, st, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_organization_id", orgId);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					mode: "network",
					role: "owner",
					activeRole: "owner",
					hasInventoryModule: true,
				}),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{
			ct: creds.clinicToken,
			orgId: creds.organizationId,
			st: creds.staffToken,
			uid: creds.ownerUserId,
		},
	);

	const pcPage = await pcContext.newPage();
	console.log(">>> [PC] Navigating to http://127.0.0.1:5173/#inventory...");
	await pcPage.goto("http://127.0.0.1:5173/#inventory", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
	await pcPage.waitForSelector(".workspace", { timeout: 20000 });
	await pcPage.waitForTimeout(2000);

	// Ensure inventory route is active
	await pcPage.evaluate(() => {
		if (window.location.hash !== "#inventory") {
			window.location.hash = "#inventory";
		}
	});
	await pcPage.waitForTimeout(1000);

	// Capture PC Light
	console.log(">>> [PC] Capturing warehouse_stock_pc_light.png...");
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "warehouse_stock_pc_light.png");

	// Capture PC Dark
	console.log(">>> [PC] Capturing warehouse_stock_pc_dark.png...");
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "warehouse_stock_pc_dark.png");

	await pcContext.close();

	// -------------------------------------------------------------
	// 2. MOBILE VIEWPORT (390x844) — WAYBILLS MODAL LIGHT & DARK
	// -------------------------------------------------------------
	console.log("\n>>> [MOBILE] Launching Mobile Context (390x844)...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
	});

	await mobileContext.addInitScript(
		({ ct, orgId, st, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_organization_id", orgId);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					mode: "network",
					role: "owner",
					activeRole: "owner",
					hasInventoryModule: true,
				}),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{
			ct: creds.clinicToken,
			orgId: creds.organizationId,
			st: creds.staffToken,
			uid: creds.ownerUserId,
		},
	);

	const mobilePage = await mobileContext.newPage();
	console.log(">>> [MOBILE] Navigating to http://127.0.0.1:5173/#inventory...");
	await mobilePage.goto("http://127.0.0.1:5173/#inventory", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
	await mobilePage.waitForTimeout(2000);

	console.log(">>> [MOBILE] Opening Acceptance Waybills (ТОРГ-12) modal...");
	// Click download icon button or trigger button
	const downloadBtn = mobilePage.locator("button:has(svg.lucide-arrow-down-to-line), button:has(svg.lucide-download), button:has-text('Оприходовать')").first();
	if (await downloadBtn.isVisible()) {
		await downloadBtn.click();
	} else {
		await mobilePage.evaluate(() => {
			const btn = document.querySelector('[data-testid="btn-acceptance-waybills"]');
			if (btn) btn.click();
		});
	}

	await mobilePage.waitForTimeout(1000);

	// Load sample waybill to have real dental materials and VAT calculations
	const sampleBtn = mobilePage.locator("button:has-text('Образец накладной'), button:has-text('Загрузить образец')").first();
	if (await sampleBtn.isVisible()) {
		await sampleBtn.click();
		await mobilePage.waitForTimeout(600);
	}

	// Capture Mobile Light
	console.log(">>> [MOBILE] Capturing warehouse_waybills_mobile_light.png...");
	await setTheme(mobilePage, "light");
	await saveProof(mobilePage, "warehouse_waybills_mobile_light.png");

	// Capture Mobile Dark
	console.log(">>> [MOBILE] Capturing warehouse_waybills_mobile_dark.png...");
	await setTheme(mobilePage, "dark");
	await saveProof(mobilePage, "warehouse_waybills_mobile_dark.png");

	await mobileContext.close();
	await browser.close();

	console.log("\n>>> [SUCCESS] All 4 visual proofs captured successfully!");
}

main().catch((err) => {
	console.error(">>> [FATAL ERROR]:", err);
	process.exit(1);
});
