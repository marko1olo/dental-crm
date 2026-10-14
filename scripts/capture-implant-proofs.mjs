/**
 * capture-implant-proofs.mjs
 * 
 * Red Team Visual Proof Engine for Surgery, Implantology & Implant Passport
 * Captures 4 canonical states from the live CRM stack with authentic clinic authentication:
 *  1. PC Light (1440x900) — 1-Click Protocol Preset & Warehouse Stock Selection
 *  2. PC Dark (1440x900) — Printable Patient Passport & Anatomical Jaw Arch Schema
 *  3. Mobile Light (390x844) — iOS HIG Glove-friendly Touch Assist & Quick Torque
 *  4. Mobile Dark (390x844) — Mobile Patient Passport & Messenger Sharing (WhatsApp/Telegram)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.join(process.cwd(), "docs/screenshots/implants");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

async function provisionFreshClinic() {
	const uniqueId = Date.now();
	const email = `implant-surgeon-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic for surgical proofs: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Центр Дентальной Имплантации DENTE",
			email,
			password,
			ownerName: "Д-р Воронов Александр Владимирович",
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

	// Auto-seed warehouse implant articles in PostgreSQL
	console.log(`[PROVISION] Auto-seeding warehouse stock implants in PostgreSQL...`);
	const stockRes = await fetch(`${API_BASE}/api/clinical/implants/stock`, {
		headers: {
			"x-dente-clinic-token": initData.clinicToken,
		},
	});
	if (stockRes.ok) {
		const stockData = await stockRes.json();
		console.log(`[PROVISION] Warehouse populated: ${stockData.implants?.length || 0} implant items.`);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
	};
}

async function run() {
	console.log(`[Red Team Proofs] Starting live CRM proof capture...`);
	const clinic = await provisionFreshClinic();

	let browser;
	try {
		browser = await chromium.launch({ headless: true, channel: "msedge" });
	} catch (e) {
		console.log(`[Red Team Proofs] msedge launch failed (${e.message}), trying default chromium`);
		browser = await chromium.launch({ headless: true });
	}

	const proofs = [
		{
			id: "01_pc_light_1440x900.png",
			desc: "PC Light 1440x900: 1-Click Protocol Preset & Warehouse Stock Selection",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
			tab: "protocol",
		},
		{
			id: "02_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900: Patient Passport with Anatomical Jaw Arch & Messenger Sharing",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
			tab: "passport",
		},
		{
			id: "03_mobile_light_390x844.png",
			desc: "Mobile Light 390x844: iOS HIG Tactile Assistant & Quick Torque Steps",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
			tab: "protocol",
		},
		{
			id: "04_mobile_dark_390x844.png",
			desc: "Mobile Dark 390x844: Mobile Bottom Sheet Passport & QR Verification",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
			tab: "passport",
		},
	];

	for (const proof of proofs) {
		console.log(`\n[Capturing ${proof.id}] ${proof.desc}...`);
		const context = await browser.newContext({
			viewport: { width: proof.width, height: proof.height },
			isMobile: proof.isMobile,
			hasTouch: proof.isMobile,
			colorScheme: proof.theme,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();

		// Inject genuine clinic authentication into browser localStorage before navigation
		await page.addInitScript((creds) => {
			window.localStorage.setItem("dente_clinic_token", creds.clinicToken);
			window.localStorage.setItem("dente_staff_token", creds.staffToken);
			window.localStorage.setItem("dente_current_org_id", creds.organizationId);
			window.localStorage.setItem("dente_onboarding_strip_dismissed", "true");
			window.localStorage.setItem("dente_theme", creds.theme);
			window.localStorage.setItem("dente_theme_mode", creds.theme);
		}, {
			clinicToken: clinic.clinicToken,
			staffToken: clinic.staffToken,
			organizationId: clinic.organizationId,
			theme: proof.theme,
		});

		const targetUrl = `${APP_BASE}/?implant_passport=true`;
		await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

		// Wait for initial boot state to clear
		try {
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 });
		} catch {
			// Ignore if already detached
		}

		// Wait for modal backdrop and content
		await page.waitForSelector('[data-testid="implant-passport-modal-backdrop"]', { timeout: 20000 });
		await page.waitForSelector('[data-testid="implant-passport-modal"]', { timeout: 20000 });

		// Apply theme classes cleanly to DOM
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, proof.theme);

		// Switch to tab if needed
		if (proof.tab === "passport") {
			const passportTabBtn = page.locator('[data-testid="implant-tab-passport"]');
			if (await passportTabBtn.isVisible()) {
				await passportTabBtn.click();
				await page.waitForTimeout(400);
			}
			await page.waitForSelector('[data-testid="implant-passport-card"]', { timeout: 8000 });
			await page.waitForSelector('[data-testid="anatomical-jaw-arch"]', { timeout: 8000 });
		} else {
			const protocolTabBtn = page.locator('[data-testid="implant-tab-protocol"]');
			if (await protocolTabBtn.isVisible()) {
				await protocolTabBtn.click();
				await page.waitForTimeout(400);
			}
			await page.waitForSelector('[data-testid="banner-standard-protocol-preset"]', { timeout: 8000 });
			await page.waitForSelector('[data-testid="btn-apply-standard-protocol"]', { timeout: 8000 });
		}

		await page.waitForTimeout(600);

		const outPath = path.join(OUT_DIR, proof.id);
		await page.screenshot({ path: outPath, fullPage: false });

		const stats = statSync(outPath);
		console.log(`[Saved] ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);

		if (stats.size < 40 * 1024) {
			console.warn(`[WARNING] Screenshot ${proof.id} is under 40 KB!`);
		}

		await context.close();
	}

	await browser.close();
	console.log(`\n[Red Team Proofs] All 4 canonical screenshots successfully captured in ${OUT_DIR}`);
}

run().catch((err) => {
	console.error("[FATAL ERROR] Screenshot capture failed:", err);
	process.exit(1);
});
