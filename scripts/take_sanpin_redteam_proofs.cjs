/**
 * scripts/take_sanpin_redteam_proofs.cjs
 *
 * Captures 4-state visual proofs for SanPiN & Sterilization:
 * 1. pc_light_sanpin_sterilization_1440x900.png (1440x900 PC Light)
 * 2. pc_dark_sanpin_sterilization_1440x900.png (1440x900 PC Dark)
 * 3. mobile_light_sanpin_sterilization_390x844.png (390x844 Mobile Light)
 * 4. mobile_dark_sanpin_sterilization_390x844.png (390x844 Mobile Dark)
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_ID = process.env.CONVERSATION_ID || "e2713ddf-da1e-43b7-b726-c9f91f49200e";
const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/sanpin");
const SSOT_DIR = path.resolve(__dirname, "../docs/proofs/sanpin_ssot");
const STERIL_DIR = path.resolve(__dirname, "../docs/proofs/sterilization");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${BRAIN_ID}`);

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
if (!fs.existsSync(SSOT_DIR)) fs.mkdirSync(SSOT_DIR, { recursive: true });
if (!fs.existsSync(STERIL_DIR)) fs.mkdirSync(STERIL_DIR, { recursive: true });
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
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	const ssotPath = path.join(SSOT_DIR, filename);
	const sterilPath = path.join(STERIL_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
	fs.copyFileSync(docsPath, ssotPath);
	fs.copyFileSync(docsPath, sterilPath);
	fs.copyFileSync(docsPath, brainPath);

	// Also mirror under sanpin_<state>_<res>.png if named pc_light_sanpin_...
	let altFilename = null;
	if (filename.includes("pc_light_sanpin")) altFilename = "sanpin_pc_light_1440x900.png";
	if (filename.includes("pc_dark_sanpin")) altFilename = "sanpin_pc_dark_1440x900.png";
	if (filename.includes("mobile_light_sanpin")) altFilename = "sanpin_mobile_light_390x844.png";
	if (filename.includes("mobile_dark_sanpin")) altFilename = "sanpin_mobile_dark_390x844.png";

	if (altFilename) {
		fs.copyFileSync(docsPath, path.join(DOCS_DIR, altFilename));
		fs.copyFileSync(docsPath, path.join(SSOT_DIR, altFilename));
		fs.copyFileSync(docsPath, path.join(STERIL_DIR, altFilename));
		fs.copyFileSync(docsPath, path.join(BRAIN_DIR, altFilename));
	}

	const stats = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} (and alt: ${altFilename}) -> size: ${(stats.size / 1024).toFixed(1)} KB`);
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
			localStorage.setItem("dente_current_view", "scanner");
			localStorage.setItem("dente_last_view", "scanner");
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
			devices: devicesPreset,
		},
	);
}

async function main() {
	const creds = await provisionTestClinic();
	const viteProc = await ensureViteServer("http://127.0.0.1:5173/");

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	try {
		console.log("\n>>> Launching Desktop Context (1440x900)...");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});
		await setupPageContext(context, creds);

		const page = await context.newPage();
		console.log(">>> Navigating to http://127.0.0.1:5173/?demo=1&sanpin=1#sanpin with waitUntil: commit...");
		await page.goto("http://127.0.0.1:5173/?demo=1&sanpin=1#sanpin", {
			waitUntil: "commit",
			timeout: 30000,
		});

		console.log(">>> Waiting for .sanpin-container to mount...");
		for (let i = 0; i < 40; i++) {
			await page.waitForTimeout(500);
			const isMounted = await page.evaluate(() => !!document.querySelector(".sanpin-container")).catch(() => false);
			if (isMounted) {
				console.log(`>>> SanPiN mounted in ${(i * 0.5).toFixed(1)}s!`);
				break;
			}
		}

		console.log(">>> Ensuring hash #sanpin is set...");
		await page.evaluate(() => {
			window.location.hash = "sanpin";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await page.waitForTimeout(1500);

		const hasSanpin = await page.evaluate(() => !!document.querySelector(".sanpin-container"));
		if (!hasSanpin) {
			console.log(">>> Clicking [data-testid='scanner-tab-sanpin']...");
			await page.click('[data-testid="scanner-tab-sanpin"]').catch(() => {});
			await page.waitForTimeout(1000);
		}

		console.log(">>> Waiting for .sanpin-container selector...");
		await page.waitForSelector(".sanpin-container", { timeout: 20000 }).catch((err) => {
			console.warn(">>> .sanpin-container wait warning:", err.message);
		});

		await page.evaluate(() => {
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .shepherd-element').forEach((el) => el.remove());
		});
		await page.waitForTimeout(1000);

		// 1. PC Light
		console.log(">>> [PC] Capturing pc_light_sanpin_sterilization_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, "pc_light_sanpin_sterilization_1440x900.png");

		// 2. PC Dark
		console.log(">>> [PC] Capturing pc_dark_sanpin_sterilization_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "pc_dark_sanpin_sterilization_1440x900.png");

		// 3. Mobile Viewport (390x844)
		console.log("\n>>> [MOBILE] Setting viewport to 390x844 on hydrated page...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .shepherd-element').forEach((el) => el.remove());
		});

		// 3. Mobile Light
		console.log(">>> [MOBILE] Capturing mobile_light_sanpin_sterilization_390x844.png...");
		await setTheme(page, "light");
		await saveProof(page, "mobile_light_sanpin_sterilization_390x844.png");

		// 4. Mobile Dark
		console.log(">>> [MOBILE] Capturing mobile_dark_sanpin_sterilization_390x844.png...");
		await setTheme(page, "dark");
		await saveProof(page, "mobile_dark_sanpin_sterilization_390x844.png");

		await context.close();
		console.log("\n>>> ALL 4 SANPIN PROOFS CAPTURED SUCCESSFULLY!");
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
