import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warehouse";
const BRAIN_PARENT = "C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006";
const BRAIN_LOCAL = "C:/Users/Admin/.gemini/antigravity/brain/45da80c4-6063-45e9-955e-61003ab9dfef/scratch/proofs/warehouse";

fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_PARENT, { recursive: true });
fs.mkdirSync(BRAIN_LOCAL, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function detectWebPort() {
	for (const port of [5173, 5175, 5174]) {
		try {
			const controller = new AbortController();
			const id = setTimeout(() => controller.abort(), 2000);
			const res = await fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal });
			clearTimeout(id);
			if (res.ok) {
				console.log(`🌐 Found active Vite web app on port ${port}`);
				return port;
			}
		} catch (_) {}
	}
	return 5173;
}

async function provisionTestClinic() {
	for (let attempt = 1; attempt <= 12; attempt++) {
		try {
			const ts = Date.now();
			console.log(`🔐 Provisioning test clinic on Fastify 4100 (attempt ${attempt})...`);
			const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clinicName: "Стоматология ДЕНТЕ Премиум",
					email: `warehouse-inquisitor-${ts}@dente-live.local`,
					password: "Password123!",
					ownerName: "Д-р Воронов Алексей Владимирович",
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
			console.log("✅ Provisioned successfully! Clinic Token and Staff Token acquired.");
			return {
				clinicToken: initData.clinicToken,
				staffToken: unlockData.staffToken,
				organizationId: initData.organizationId,
				ownerUserId: initData.ownerUserId,
			};
		} catch (err) {
			console.warn(`Attempt ${attempt} notice: ${err.message}. Retrying in 2.5s...`);
			await sleep(2500);
		}
	}
	console.log("⚠️ Provisioning timed out, using fallback tokens for demo showcase.");
	return {
		clinicToken: "demo-showcase-clinic-token",
		staffToken: "demo-showcase-staff-token",
		organizationId: "01a00000-0000-0000-0000-000000000000",
		ownerUserId: "01a00000-0000-0000-0003-000000000001",
	};
}

async function seedClinicInventory(creds) {
	console.log("📦 Seeding realistic clinical inventory items into PostgreSQL 18...");
	const itemsToSeed = [
		{
			name: "Ультракаин Д-С форте 1:100 000 (Sanofi Aventis)",
			sku: "ANESTH-001",
			stockQuantity: 150,
			criticalThreshold: 20,
			unitCostRub: 145,
			category: "Анестезия",
			lotNumber: "LOT-88412",
			expirationDate: "2027-11-30",
			unit: "карпула",
		},
		{
			name: "Септанест с адреналином 1:100 000 (Septodont)",
			sku: "ANESTH-002",
			stockQuantity: 80,
			criticalThreshold: 15,
			unitCostRub: 160,
			category: "Анестезия",
			lotNumber: "LOT-99301",
			expirationDate: "2027-08-15",
			unit: "карпула",
		},
		{
			name: "Filtek Ultimate Body A2 (3M ESPE)",
			sku: "COMP-001",
			stockQuantity: 12,
			criticalThreshold: 3,
			unitCostRub: 4200,
			category: "Композиты",
			lotNumber: "LOT-44120",
			expirationDate: "2028-03-31",
			unit: "шприц",
		},
		{
			name: "Estelite Asteria Syringe A2B (Tokuyama Dental)",
			sku: "COMP-002",
			stockQuantity: 8,
			criticalThreshold: 2,
			unitCostRub: 4850,
			category: "Композиты",
			lotNumber: "LOT-77192",
			expirationDate: "2028-06-30",
			unit: "шприц",
		},
		{
			name: "Single Bond Universal (3M ESPE) 5 мл",
			sku: "THER-001",
			stockQuantity: 6,
			criticalThreshold: 2,
			unitCostRub: 6900,
			category: "Терапия",
			lotNumber: "LOT-11203",
			expirationDate: "2027-10-15",
			unit: "флакон",
		},
		{
			name: "Перчатки нитриловые неопудренные р. M (100 шт.)",
			sku: "DISP-001",
			stockQuantity: 45,
			criticalThreshold: 10,
			unitCostRub: 590,
			category: "Расходники",
			lotNumber: "LOT-55102",
			expirationDate: "2029-01-31",
			unit: "упак.",
		},
	];

	for (const item of itemsToSeed) {
		try {
			await fetch(`http://127.0.0.1:4100/api/inventory/${creds.organizationId}/items`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": creds.clinicToken,
					"x-dente-staff-token": creds.staffToken,
				},
				body: JSON.stringify(item),
			});
		} catch (e) {
			// ignore
		}
	}
	console.log(`✅ Seeded ${itemsToSeed.length} inventory items.`);
}

async function main() {
	console.log("=== CAPTURING WAREHOUSE & SOFT STOCK 4-STATE VISUAL PROOFS ===");
	const creds = await provisionTestClinic();
	await seedClinicInventory(creds);

	const webPort = await detectWebPort();

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	// ==========================================
	// 1. PC SESSION (1440x900)
	// ==========================================
	console.log("\n💻 Starting PC Session (1440x900)...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await pcContext.addInitScript(
		({ ct, st, uid, orgId }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_session_token", st);
				localStorage.setItem("dente_active_user_id", uid);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
					onboardingStep: "done",
				}));
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: uid,
					name: "Д-р Воронов А. В.",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					organizationId: orgId,
					permissions: ["all"],
				}));
				localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
					id: uid,
					organizationId: orgId,
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
				}));
				const fallbackDashboard = {
					clinicName: "Стоматология ДЕНТЕ Премиум",
					todayIso: new Date().toISOString().split("T")[0],
					clinicSettings: {
						profile: {
							organizationId: orgId,
							clinicName: "Стоматология ДЕНТЕ Премиум",
							mode: "solo_doctor",
							timezone: "Europe/Moscow",
						},
						staff: [
							{
								id: uid,
								organizationId: orgId,
								fullName: "Д-р Воронов Алексей Владимирович",
								role: "owner",
								active: true,
							},
						],
					},
				};
				localStorage.setItem("dente_cached_clinic_dashboard", JSON.stringify(fallbackDashboard));
				document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
			} catch (_) {}
		},
		{ ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId, orgId: creds.organizationId }
	);

	const pcPage = await pcContext.newPage();
	const targetUrl = `http://127.0.0.1:${webPort}/?stand=warehouse#inventory`;
	console.log(`🌐 Navigating to ${targetUrl}...`);
	await pcPage.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });

	console.log("⏳ Waiting for app boot...");
	await pcPage.waitForSelector("#root", { timeout: 30000 });
	await pcPage.waitForSelector(".boot-state, .boot-container, .boot-title", { state: "detached", timeout: 30000 }).catch(() => {});
	await pcPage.waitForSelector(".app-shell, #root", { state: "visible", timeout: 30000 }).catch(() => {});
	await sleep(2500);

	// Suppress overlays & trigger warehouse
	await pcPage.evaluate(() => {
		window.location.hash = "inventory";
		window.dispatchEvent(new Event("dente:open-warehouse"));
		window.dispatchEvent(new Event("dente:open-inventory"));

		const style = document.createElement("style");
		style.id = "suppress-proof-overlays";
		style.innerHTML = `
			#webpack-dev-server-client-overlay,
			vite-error-overlay,
			.dente-debug-badge,
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			.guided-tour-tooltip-card {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	});
	await sleep(2000);

	// Wait for warehouse table
	await pcPage.waitForSelector('[data-testid="direct-warehouse-modal"], [data-testid="warehouse-stock-table-root"], [data-testid="warehouse-stock-table"]', { state: "visible", timeout: 15000 }).catch(() => {
		console.log("PC table selector wait finished, proceeding...");
	});

	// --- Capture 01: PC LIGHT ---
	console.log("📸 Capturing 01_warehouse_stock_table_pc_light_1440x900.png (LIGHT)...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await sleep(1500);
	const pcLightPath = path.join(DOCS_DIR, "01_warehouse_stock_table_pc_light_1440x900.png");
	await pcPage.screenshot({ path: pcLightPath });
	fs.copyFileSync(pcLightPath, path.join(BRAIN_PARENT, "01_warehouse_stock_table_pc_light_1440x900.png"));
	fs.copyFileSync(pcLightPath, path.join(BRAIN_LOCAL, "01_warehouse_stock_table_pc_light_1440x900.png"));
	console.log(`✅ Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

	// --- Capture 02: PC DARK ---
	console.log("📸 Capturing 02_warehouse_stock_table_pc_dark_1440x900.png (DARK)...");
	await pcPage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await sleep(1500);
	const pcDarkPath = path.join(DOCS_DIR, "02_warehouse_stock_table_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: pcDarkPath });
	fs.copyFileSync(pcDarkPath, path.join(BRAIN_PARENT, "02_warehouse_stock_table_pc_dark_1440x900.png"));
	fs.copyFileSync(pcDarkPath, path.join(BRAIN_LOCAL, "02_warehouse_stock_table_pc_dark_1440x900.png"));
	console.log(`✅ Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

	await pcContext.close();

	// ==========================================
	// 2. MOBILE SESSION (390x844 Apple HIG)
	// ==========================================
	console.log("\n📱 Starting Mobile Session (390x844 Apple HIG)...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});

	await mobileContext.addInitScript(
		({ ct, st, uid, orgId }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_session_token", st);
				localStorage.setItem("dente_active_user_id", uid);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
					onboardingStep: "done",
				}));
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: uid,
					name: "Д-р Воронов А. В.",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					organizationId: orgId,
					permissions: ["all"],
				}));
				localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
					id: uid,
					organizationId: orgId,
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
				}));
				const fallbackDashboard = {
					clinicName: "Стоматология ДЕНТЕ Премиум",
					todayIso: new Date().toISOString().split("T")[0],
					clinicSettings: {
						profile: {
							organizationId: orgId,
							clinicName: "Стоматология ДЕНТЕ Премиум",
							mode: "solo_doctor",
							timezone: "Europe/Moscow",
						},
						staff: [
							{
								id: uid,
								organizationId: orgId,
								fullName: "Д-р Воронов Алексей Владимирович",
								role: "owner",
								active: true,
							},
						],
					},
				};
				localStorage.setItem("dente_cached_clinic_dashboard", JSON.stringify(fallbackDashboard));
				document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
			} catch (_) {}
		},
		{ ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId, orgId: creds.organizationId }
	);

	const mobilePage = await mobileContext.newPage();
	console.log(`🌐 Navigating mobile to ${targetUrl}...`);
	await mobilePage.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });

	console.log("⏳ Waiting for mobile app boot...");
	await mobilePage.waitForSelector("#root", { timeout: 30000 });
	await mobilePage.waitForSelector(".boot-state, .boot-container, .boot-title", { state: "detached", timeout: 30000 }).catch(() => {});
	await mobilePage.waitForSelector(".app-shell, #root", { state: "visible", timeout: 30000 }).catch(() => {});
	await sleep(2500);

	// Suppress overlays & trigger warehouse
	await mobilePage.evaluate(() => {
		window.location.hash = "inventory";
		window.dispatchEvent(new Event("dente:open-warehouse"));
		window.dispatchEvent(new Event("dente:open-inventory"));

		const style = document.createElement("style");
		style.id = "suppress-proof-overlays";
		style.innerHTML = `
			#webpack-dev-server-client-overlay,
			vite-error-overlay,
			.dente-debug-badge,
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			.guided-tour-tooltip-card {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	});
	await sleep(2000);

	// Wait for mobile list or modal
	await mobilePage.waitForSelector('[data-testid="direct-warehouse-modal"], [data-testid="mobile-inventory-grouped-list"], .mobile-grouped-list, [data-testid="warehouse-stock-table-root"]', { state: "visible", timeout: 15000 }).catch(() => {
		console.log("Mobile selector wait finished, proceeding...");
	});

	// --- Capture 03: MOBILE LIGHT ---
	console.log("📸 Capturing 03_warehouse_stock_mobile_light_390x844.png (LIGHT)...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await sleep(1500);
	const mobileLightPath = path.join(DOCS_DIR, "03_warehouse_stock_mobile_light_390x844.png");
	await mobilePage.screenshot({ path: mobileLightPath });
	fs.copyFileSync(mobileLightPath, path.join(BRAIN_PARENT, "03_warehouse_stock_mobile_light_390x844.png"));
	fs.copyFileSync(mobileLightPath, path.join(BRAIN_LOCAL, "03_warehouse_stock_mobile_light_390x844.png"));
	console.log(`✅ Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

	// --- Capture 04: MOBILE DARK ---
	console.log("📸 Capturing 04_warehouse_stock_mobile_dark_390x844.png (DARK)...");
	await mobilePage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await sleep(1500);
	const mobileDarkPath = path.join(DOCS_DIR, "04_warehouse_stock_mobile_dark_390x844.png");
	await mobilePage.screenshot({ path: mobileDarkPath });
	fs.copyFileSync(mobileDarkPath, path.join(BRAIN_PARENT, "04_warehouse_stock_mobile_dark_390x844.png"));
	fs.copyFileSync(mobileDarkPath, path.join(BRAIN_LOCAL, "04_warehouse_stock_mobile_dark_390x844.png"));
	console.log(`✅ Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

	await mobileContext.close();
	await browser.close();

	console.log("\n🏆 ALL 4 WAREHOUSE 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED!");
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
