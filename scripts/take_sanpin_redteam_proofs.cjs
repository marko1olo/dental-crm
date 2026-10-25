/**
 * scripts/take_sanpin_redteam_proofs.cjs
 *
 * Снятие 4-состояных Red Team скриншотов из живого браузера (Playwright Chromium):
 * Журнал автоклавирования:
 * - pc_light_sanpin_autoclave_1440x900.png
 * - pc_dark_sanpin_autoclave_1440x900.png
 * - mobile_light_sanpin_autoclave_390x844.png
 * - mobile_dark_sanpin_autoclave_390x844.png
 *
 * Журнал контроля предстерилизационной очистки (ПСО):
 * - pc_light_sanpin_pso_1440x900.png
 * - pc_dark_sanpin_pso_1440x900.png
 * - mobile_light_sanpin_pso_390x844.png
 * - mobile_dark_sanpin_pso_390x844.png
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_ID = process.env.CONVERSATION_ID || "893754ff-ccae-4970-9ed3-f86f8cd4dbef";
const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/sanpin");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${BRAIN_ID}`);

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const baseUrl = new URL(url).origin;
		const res = await fetch(baseUrl, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function ensureViteServer(url = "http://127.0.0.1:5173/") {
	if (await isPortResponding(url, 2000)) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}
	console.log("[Vite] Spawning dev server on port 5173...");
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");
	const proc = spawn(process.execPath, ["--max-old-space-size=2048", viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});
	for (let i = 0; i < 50; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortResponding(url, 1000)) {
			console.log(`[Vite] Server ready in ${(i + 1) * 600}ms!`);
			return proc;
		}
	}
	try { proc.kill(); } catch {}
	throw new Error("Vite dev server failed to start on port 5173");
}

async function provisionTestClinic() {
	const ts = Date.now();
	console.log(">>> [AUTH] Initializing test clinic in PostgreSQL...");
	const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `sanpin-redteam-${ts}@dente-live.local`,
			password: "Password123!",
			ownerName: "Д-р Кузнецов Андрей Владимирович",
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
			document.documentElement.style.colorScheme = t;
		}, theme);
	} catch {}
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(docsPath, brainPath); } catch {}

	const stats = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
}

async function setupPageContext(context, creds) {
	const devicesPreset = [
		{
			id: "AUTO-01",
			brandModelRu: "Melag Vacuklav 23 B+ (ЦСО №1)",
			serialNumber: "MEL-2024-9812",
			inventoryNumber: "ИНВ-ЦСО-001",
			deviceType: "autoclave_class_b",
			chamberVolumeLiters: 22,
			locationRu: "Центральное стерилизационное отделение (ЦСО)",
			lastMaintenanceDate: "2026-06-01",
			nextMaintenanceDate: "2026-12-01",
			isOperational: true,
		},
		{
			id: "AUTO-02",
			brandModelRu: "W&H Lina 17 (Австрия)",
			serialNumber: "WH-2023-4410",
			inventoryNumber: "ИНВ-ЦСО-002",
			deviceType: "autoclave_class_b",
			chamberVolumeLiters: 17,
			locationRu: "ЦСО (Стерилизационная)",
			lastMaintenanceDate: "2026-05-15",
			nextMaintenanceDate: "2026-11-15",
			isOperational: true,
		},
	];

	await context.addInitScript(
		({ ct, orgId, st, uid, devices }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_organization_id", orgId);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_user_id", uid);
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_clinic_autoclaves_v1", JSON.stringify(devices));
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
		},
		{
			ct: creds.clinicToken,
			orgId: creds.organizationId,
			st: creds.staffToken,
			uid: creds.ownerUserId,
			devices: devicesPreset,
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

async function main() {
	const creds = await provisionTestClinic();
	const viteProc = await ensureViteServer("http://127.0.0.1:5173/");

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	try {
		// ==================== 1. DESKTOP CONTEXT (1440x900) ====================
		console.log("\n>>> Launching Desktop Context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});
		await setupPageContext(pcContext, creds);

		const pcPage = await pcContext.newPage();
		console.log(">>> [PC] Navigating to http://127.0.0.1:5173/?demo=true&sanpin=1...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true&sanpin=1", {
			waitUntil: "commit",
			timeout: 30000,
		});

		await pcPage.waitForSelector(".sanpin-container", { timeout: 25000 });
		await dismissTourElements(pcPage);

		// 1.1 Autoclave PC Light & Dark
		console.log("--- [AUTOCLAVE] Capturing Desktop Proofs (1440x900) ---");
		await setTheme(pcPage, "light");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "pc_light_sanpin_autoclave_1440x900.png");

		await setTheme(pcPage, "dark");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "pc_dark_sanpin_autoclave_1440x900.png");

		// 1.2 PSO PC Light & Dark
		console.log("--- [PSO] Switching to PSO Tab & Capturing Desktop Proofs (1440x900) ---");
		await pcPage.click('[data-testid="tab-pso-btn"]');
		await pcPage.waitForTimeout(800);
		await dismissTourElements(pcPage);

		await saveProof(pcPage, "pc_dark_sanpin_pso_1440x900.png");

		await setTheme(pcPage, "light");
		await dismissTourElements(pcPage);
		await saveProof(pcPage, "pc_light_sanpin_pso_1440x900.png");

		await pcContext.close();

		// ==================== 2. MOBILE CONTEXT (390x844 Apple HIG) ====================
		console.log("\n>>> Launching Mobile Context (390x844)...");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			serviceWorkers: "block",
		});
		await setupPageContext(mobContext, creds);

		const mobPage = await mobContext.newPage();
		console.log(">>> [MOBILE] Navigating to http://127.0.0.1:5173/?demo=true&sanpin=1...");
		await mobPage.goto("http://127.0.0.1:5173/?demo=true&sanpin=1", {
			waitUntil: "commit",
			timeout: 30000,
		});

		await mobPage.waitForSelector(".sanpin-container", { timeout: 25000 });
		await dismissTourElements(mobPage);

		// 2.1 Autoclave Mobile Light & Dark
		console.log("--- [AUTOCLAVE] Capturing Mobile Proofs (390x844) ---");
		await setTheme(mobPage, "light");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "mobile_light_sanpin_autoclave_390x844.png");

		await setTheme(mobPage, "dark");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "mobile_dark_sanpin_autoclave_390x844.png");

		// 2.2 PSO Mobile Light & Dark
		console.log("--- [PSO] Switching to PSO Tab & Capturing Mobile Proofs (390x844) ---");
		await mobPage.click('[data-testid="tab-pso-btn"]');
		await mobPage.waitForTimeout(800);
		await dismissTourElements(mobPage);

		await saveProof(mobPage, "mobile_dark_sanpin_pso_390x844.png");

		await setTheme(mobPage, "light");
		await dismissTourElements(mobPage);
		await saveProof(mobPage, "mobile_light_sanpin_pso_390x844.png");

		await mobContext.close();

		console.log("\n>>> ALL 8 SANPIN PROOFS CAPTURED SUCCESSFULLY (AUTOCLAVE & PSO, LIGHT & DARK)!");
	} finally {
		if (viteProc) {
			try { viteProc.kill(); } catch {}
		}
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
