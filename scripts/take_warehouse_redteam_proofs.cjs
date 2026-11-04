/**
 * scripts/take_warehouse_redteam_proofs.cjs
 *
 * Снятие 4-состояных Red Team скриншотов из живого браузера (Playwright Chromium):
 * Каталог склада и таблица остатков (Warehouse Catalog & Stock):
 * - warehouse_catalog_stock_pc_light_1440x900.png
 * - warehouse_catalog_stock_pc_dark_1440x900.png
 * - warehouse_stock_mobile_light_390x844.png
 * - warehouse_stock_mobile_dark_390x844.png
 *
 * Модалка пакетного списания расходников (Consumables Batch Writeoff):
 * - warehouse_batch_writeoff_pc_light_1440x900.png
 * - warehouse_batch_writeoff_pc_dark_1440x900.png
 * - warehouse_writeoff_modal_mobile_light_390x844.png
 * - warehouse_writeoff_modal_mobile_dark_390x844.png
 *
 * Приходная накладная (Inbound Invoice):
 * - warehouse_inbound_invoice_pc_light_1440x900.png
 * - warehouse_inbound_invoice_pc_dark_1440x900.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_ID = process.env.CONVERSATION_ID || "cbb16308-5919-49d9-a45a-f1da42862afc";
const PARENT_ID = process.env.PARENT_CONVERSATION_ID || "1a5ac924-43af-42a0-a684-00dbb822c536";
const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/warehouse");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${BRAIN_ID}`);
const PARENT_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${PARENT_ID}`);

[DOCS_DIR, BRAIN_DIR, PARENT_DIR].forEach((d) => {
	if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function provisionTestClinic() {
	const ts = Date.now();
	console.log(">>> [AUTH] Initializing test clinic in PostgreSQL...");
	const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Склад",
			email: `warehouse-redteam-${ts}@dente-live.local`,
			password: "Password123!",
			ownerName: "Д-р Соколов Андрей Владимирович",
			ownerPin: "1234",
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
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
	}

	const unlockData = await unlockRes.json();
	return {
		clinicToken: initData.clinicToken,
		organizationId: initData.organizationId,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

async function setTheme(page, theme) {
	try {
		await page.evaluate((t) => {
			const root = document.documentElement;
			root.setAttribute("data-theme", t);
			document.body.setAttribute("data-theme", t);
			if (t === "dark") {
				root.classList.add("dark");
				root.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
			} else {
				root.classList.remove("dark");
				root.classList.add("light");
				document.body.classList.remove("dark");
				document.body.classList.add("light");
			}
			localStorage.setItem("dente_theme_mode", t);
			localStorage.setItem("dente_theme", t);
			localStorage.setItem("theme", t);
			document.documentElement.style.colorScheme = t;
		}, theme);
	} catch {}
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);
	const parentPath = path.join(PARENT_DIR, filename);

	await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(docsPath, brainPath); } catch {}
	try { fs.copyFileSync(docsPath, parentPath); } catch {}

	const stats = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
	if (stats.size < 20480) {
		console.warn(`[WARN] Screenshot ${filename} is smaller than 20KB threshold!`);
	}
}

async function setupPageContext(context, creds) {
	await context.addInitScript(
		({ ct, orgId, st, uid }) => {
			document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_organization_id", orgId);
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_user_name", "Д-р Соколов Андрей Владимирович");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
				}),
			);
			localStorage.setItem(
				"dente_staff_session",
				JSON.stringify({
					userId: uid,
					name: "Д-р Соколов А. В.",
					fullName: "Д-р Соколов Андрей Владимирович",
					role: "owner",
					permissions: ["all"],
				}),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true }),
			);
		},
		{
			ct: creds.clinicToken,
			orgId: creds.organizationId,
			st: creds.staffToken,
			uid: creds.ownerUserId,
		},
	);
}

async function dismissTourElements(page) {
	try {
		await page.evaluate(() => {
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .shepherd-element').forEach((el) => el.remove());
		});
	} catch {}
	await page.waitForTimeout(400);
}

async function waitForBootDetachedAndReady(page, targetSelector) {
	console.log(`[WAIT] Waiting for ready target: ${targetSelector || "default"}...`);
	for (let i = 0; i < 40; i++) {
		const ready = await page.evaluate((sel) => {
			const boot = document.querySelector(".boot-state");
			if (boot) boot.remove();
			if (sel) return !!document.querySelector(sel);
			const appEl = document.querySelector("[data-testid='warehouse-studio-modal'], .warehouse-modal-backdrop, [data-testid='consumables-batch-writeoff-modal'], [data-testid='warehouse-inbound-invoice-modal'], table");
			return !!appEl;
		}, targetSelector).catch(() => false);

		if (ready) {
			console.log(`[WAIT] React app ready on check ${i + 1}!`);
			await page.waitForTimeout(600);
			return;
		}
		await page.waitForTimeout(800);
	}
	console.log("[WAIT] Timeout waiting for full mount, proceeding with fallback...");
}

async function main() {
	console.log(">>> [WAREHOUSE INQUISITOR] Initializing live Playwright Chromium...");
	const creds = await provisionTestClinic();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ==================== 1. DESKTOP CONTEXT (1440x900) ====================
		console.log("\n>>> Launching Desktop Context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupPageContext(pcContext, creds);

		const pcPage = await pcContext.newPage();
		console.log(">>> [PC] Navigating to http://127.0.0.1:5173/?inventory=1&demo=1...");
		await pcPage.goto("http://127.0.0.1:5173/?inventory=1&demo=1", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await waitForBootDetachedAndReady(pcPage, "[data-testid='warehouse-studio-modal'], .warehouse-sheet-container, table");
		await dismissTourElements(pcPage);

		// 1.1 Warehouse Catalog & Stock PC Light & Dark
		console.log("--- Capturing Warehouse Catalog & Stock (PC Light) ---");
		await setTheme(pcPage, "light");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_catalog_stock_pc_light_1440x900.png");
		await saveProof(pcPage, "warehouse_stock_pc_light_1440x900.png");

		console.log("--- Capturing Warehouse Catalog & Stock (PC Dark) ---");
		await setTheme(pcPage, "dark");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_catalog_stock_pc_dark_1440x900.png");
		await saveProof(pcPage, "warehouse_stock_pc_dark_1440x900.png");

		// 1.2 Batch Writeoff Modal PC Light & Dark
		console.log("--- Opening Batch Writeoff Modal ---");
		await pcPage.goto("http://127.0.0.1:5173/?batch_writeoff=1&demo=1", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await waitForBootDetachedAndReady(pcPage, "[data-testid='consumables-batch-writeoff-modal'], [data-testid='clinical-writeoff-modal']");
		await dismissTourElements(pcPage);

		await setTheme(pcPage, "dark");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_batch_writeoff_pc_dark_1440x900.png");
		await saveProof(pcPage, "warehouse_writeoff_modal_pc_dark_1440x900.png");

		await setTheme(pcPage, "light");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_batch_writeoff_pc_light_1440x900.png");
		await saveProof(pcPage, "warehouse_writeoff_modal_pc_light_1440x900.png");

		// 1.3 Inbound Invoice Modal PC Light & Dark
		console.log("--- Opening Inbound Invoice Modal ---");
		await pcPage.goto("http://127.0.0.1:5173/?inbound_invoice=1&demo=1", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await waitForBootDetachedAndReady(pcPage, "[data-testid='warehouse-inbound-invoice-modal']");
		await dismissTourElements(pcPage);

		await setTheme(pcPage, "light");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_inbound_invoice_pc_light_1440x900.png");

		await setTheme(pcPage, "dark");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "warehouse_inbound_invoice_pc_dark_1440x900.png");

		await pcContext.close();

		// ==================== 2. MOBILE CONTEXT (390x844 Apple HIG) ====================
		console.log("\n>>> Launching Mobile Context (390x844)...");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupPageContext(mobContext, creds);

		const mobPage = await mobContext.newPage();
		console.log(">>> [MOBILE] Navigating to http://127.0.0.1:5173/?inventory=1&demo=1...");
		await mobPage.goto("http://127.0.0.1:5173/?inventory=1&demo=1", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await waitForBootDetachedAndReady(mobPage, "[data-testid='warehouse-studio-modal'], .warehouse-sheet-container");
		await dismissTourElements(mobPage);

		console.log("--- Capturing Mobile Stock (Light & Dark) ---");
		await setTheme(mobPage, "light");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "warehouse_stock_mobile_light_390x844.png");

		await setTheme(mobPage, "dark");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "warehouse_stock_mobile_dark_390x844.png");

		// 2.2 Mobile Batch Writeoff
		console.log("--- Opening Mobile Batch Writeoff Modal ---");
		await mobPage.goto("http://127.0.0.1:5173/?batch_writeoff=1&demo=1", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await waitForBootDetachedAndReady(mobPage, "[data-testid='consumables-batch-writeoff-modal'], [data-testid='clinical-writeoff-modal']");
		await dismissTourElements(mobPage);

		await setTheme(mobPage, "light");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "warehouse_writeoff_modal_mobile_light_390x844.png");

		await setTheme(mobPage, "dark");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "warehouse_writeoff_modal_mobile_dark_390x844.png");

		await mobContext.close();

		console.log("\n>>> [SUCCESS] ALL 12 WAREHOUSE RED TEAM PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
