import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const CONV_IDS = ["885e5f8b-4972-428a-a653-d8d4e2a3e28a", "1a5ac924-43af-42a0-a684-00dbb822c536"];
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const API_BASE = "http://127.0.0.1:4100";

for (const id of CONV_IDS) {
	mkdirSync(`C:/Users/Admin/.gemini/antigravity/brain/${id}/screenshots`, { recursive: true });
}
mkdirSync(OUT_DOCS, { recursive: true });

let viteServer = null;

async function resolveWebBase() {
	for (const port of [5174, 5173]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok || res.status === 200) {
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	console.log("No existing Vite server detected. Starting in-process Vite on port 5195...");
	viteServer = await createServer({
		root: "C:/Clinic_MVP/dental-crm/apps/web",
		configFile: "C:/Clinic_MVP/dental-crm/apps/web/vite.config.ts",
		server: { port: 5195, host: "127.0.0.1", watch: null, hmr: false },
	});
	await viteServer.listen();
	console.log("In-process Vite server listening at http://127.0.0.1:5195/");
	return "http://127.0.0.1:5195";
}

function injectStorage(context, theme = "light") {
	return context.addInitScript(
		({ th }) => {
			try {
				localStorage.setItem("dente_clinic_token", "test-token");
				localStorage.setItem("dente_staff_token", "test-token");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_id", "test-uid");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
			} catch (e) {}
		},
		{ th: theme },
	);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function saveProof(page, filename, description) {
	const outPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: outPath, fullPage: false });
	const stat = statSync(outPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes (required >= 20KB)`);
	}
	console.log(`[CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
	for (const id of CONV_IDS) {
		try {
			copyFileSync(outPath, path.join(`C:/Users/Admin/.gemini/antigravity/brain/${id}/screenshots`, filename));
		} catch (e) {}
	}
}

async function main() {
	console.log("=== STARTING 6-STATE WARRANTY PROOF CAPTURE ===");
	const webBase = await resolveWebBase();
	console.log(`Web Base URL: ${webBase}`);

	// 1. Ensure warranty certificate in Postgres 18
	try {
		await fetch(`${API_BASE}/api/warranty/certificates`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-dente-admin-secret": "dente-dev-secret-super-admin-2026" },
			body: JSON.stringify({
				patientId: "00000000-0000-0000-0000-000000000001",
				certificateNumber: "WAR-2026-08492",
				status: "active",
				warrantyMonths: 36,
				serviceLifeMonths: 120,
				notes: "Гарантийный сертификат на терапевтические и ортопедические работы",
			}),
		});
	} catch {}

	let browser = null;
	try {
		browser = await chromium.launch({
			headless: true,
			executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
		});

	// --- 1. DESKTOP CONTEXT (1440x900) ---
	console.log("\n--- Capturing Desktop Warranty Modal (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});
	await injectStorage(pcContext, "light");
	const pcPage = await pcContext.newPage();
	await pcPage.goto(`${webBase}/?demo=true&warranty=true`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await pcPage.waitForTimeout(1500);
	await pcPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
	});
	await pcPage.waitForSelector(".warranty-modal-window", { timeout: 20000 });
	await pcPage.waitForTimeout(2000);
	await suppressOverlays(pcPage);

	// 01: PC Light
	await saveProof(pcPage, "01_warranty_passport_pc_light_1440x900.png", "☀️ PC Light (1440x900) Гарантийный паспорт клиники");

	// 02: Switch tab to remediation & toggle dark theme
	await pcPage.evaluate(() => {
		const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
		const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
		if (remTab) (remTab).click();
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await pcPage.emulateMedia({ colorScheme: "dark" });
	await pcPage.waitForTimeout(2000);
	await saveProof(pcPage, "02_warranty_passport_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Гарантийная переделка 0 ₽");
	await pcContext.close();

	// --- 2. MOBILE CONTEXT (390x844) ---
	console.log("\n--- Capturing Mobile Warranty Modal (390x844) ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		colorScheme: "light",
	});
	await injectStorage(mobContext, "light");
	const mobPage = await mobContext.newPage();
	await mobPage.goto(`${webBase}/?demo=true&warranty=true`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await mobPage.waitForTimeout(1500);
	await mobPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
	});
	await mobPage.waitForSelector(".warranty-modal-window", { timeout: 20000 });
	await mobPage.waitForTimeout(2000);
	await suppressOverlays(mobPage);

	// 05: Mobile Light
	await saveProof(mobPage, "05_warranty_mobile_light_390x844.png", "📱 Mobile Light (390x844) Bottom Sheet гарантий");

	// 06: Mobile Dark
	await mobPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await mobPage.emulateMedia({ colorScheme: "dark" });
	await mobPage.waitForTimeout(2000);
	await saveProof(mobPage, "06_warranty_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Bottom Sheet гарантий");
	await mobContext.close();

	// --- 3. PUBLIC QR VERIFICATION PORTAL ---
	console.log("\n--- Capturing Public Verification Portal ---");
	const pubContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});
	const pubPage = await pubContext.newPage();
	await pubPage.goto(`${webBase}/portal/warranty?cert=WAR-2026-08492`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await pubPage.waitForTimeout(3000);
	await suppressOverlays(pubPage);

	// 03: Public Light
	await saveProof(pubPage, "03_warranty_public_verification_pc_light_1440x900.png", "☀️ PC Light (1440x900) Публичная верификация сертификата");

	// 04: Public Dark
	await pubPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await pubPage.emulateMedia({ colorScheme: "dark" });
	await pubPage.waitForTimeout(2000);
	await saveProof(pubPage, "04_warranty_public_verification_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Публичная верификация сертификата");
	await pubContext.close();
		console.log("\n=== ALL 6 WARRANTY PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		if (browser) await browser.close();
		if (viteServer) await viteServer.close();
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
