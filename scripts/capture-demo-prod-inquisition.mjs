/**
 * scripts/capture-demo-prod-inquisition.mjs
 *
 * Бескомпромиссная фиксация визуальных доказательств честности контуров (Demo vs Prod).
 * Запуск строго через Microsoft Edge Playwright ({ channel: 'msedge' }), viewport 1440x900.
 *
 * Контуры:
 * 1. DEMO LIGHT (1440x900) — витрина с честным баннером, реалистичными данными клиники и врача
 * 2. DEMO DARK  (1440x900) — тёмная тема витрины, проверка контрастности и токенов
 * 3. PROD LIGHT (1440x900) — боевой контур (PostgreSQL 18 + Fastify API), ноль фейковых данных и баннеров
 * 4. PROD DARK  (1440x900) — боевой контур в тёмной теме
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const ARTIFACT_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e974c742-c041-4b60-8dd9-fd0c63e84ca3");
const REPO_PROOF_DIR = path.resolve("docs/proofs/inquisition");

const TARGET_DIRS = [ARTIFACT_DIR, REPO_PROOF_DIR];
for (const dir of TARGET_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(500);
}

async function saveProof(page, filename) {
	const buffer = await page.screenshot({ fullPage: false });
	const hash = crypto.createHash("md5").update(buffer).digest("hex");
	const sizeKb = Math.round(buffer.length / 1024);

	console.log(`[PROOF] Saving ${filename} (${sizeKb} KB, MD5: ${hash})`);
	if (sizeKb < 40) {
		console.warn(`[WARNING] Screenshot ${filename} is smaller than 40 KB (${sizeKb} KB)`);
	}

	for (const dir of TARGET_DIRS) {
		const outPath = path.join(dir, filename);
		writeFileSync(outPath, buffer);
	}
	return { filename, sizeKb, hash };
}

async function provisionFreshProductionClinic() {
	const uniqueId = Date.now();
	const email = `inquisition-prod-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROD PROVISION] Initializing genuine clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Цифровой Стоматологии",
			email,
			password,
			ownerName: "Д-р Мельников Игорь Олегович",
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
		ownerName: "Д-р Мельников Игорь Олегович",
	};
}

async function main() {
	console.log("=== INQUISITION: CAPTURING DEMO VS PROD PROOFS VIA EDGE PLAYWRIGHT ===");

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	});

	const results = [];

	try {
		// ─────────────────────────────────────────────────────────────
		// 1 & 2. DEMO MODE (Light & Dark)
		// ─────────────────────────────────────────────────────────────
		console.log("\n--- [PHASE 1] CAPTURING DEMO MODE ---");
		const demoContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const demoPage = await demoContext.newPage();

		console.log(`Navigating to ${APP_BASE}/?demo=true`);
		await demoPage.goto(`${APP_BASE}/?demo=true`, { waitUntil: "domcontentloaded" });
		await demoPage.waitForSelector('[data-testid="demo-mode-banner"]', { timeout: 15000 }).catch(() => null);
		await wait(2500);

		// Проверяем наличие баннера демо-режима
		const bannerExists = await demoPage.$('[data-testid="demo-mode-banner"]');
		console.log(`Demo banner present: ${bannerExists !== null}`);

		// Скриншот DEMO LIGHT
		await applyTheme(demoPage, "light");
		await wait(1000);
		results.push(await saveProof(demoPage, "demo_pc_light.png"));

		// Скриншот DEMO DARK
		await applyTheme(demoPage, "dark");
		await wait(1000);
		results.push(await saveProof(demoPage, "demo_pc_dark.png"));

		await demoContext.close();

		// ─────────────────────────────────────────────────────────────
		// 3 & 4. PROD MODE (Light & Dark)
		// ─────────────────────────────────────────────────────────────
		console.log("\n--- [PHASE 2] CAPTURING PRODUCTION MODE ---");
		const prodCreds = await provisionFreshProductionClinic();

		const prodContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const prodPage = await prodContext.newPage();

		// Навешиваем токены в localStorage перед навигацией
		await prodPage.goto(`${APP_BASE}/`, { waitUntil: "commit" });
		await prodPage.evaluate((creds) => {
			localStorage.clear();
			localStorage.setItem("dente_clinic_token", creds.clinicToken);
			localStorage.setItem("dente_staff_token", creds.staffToken);
			localStorage.setItem(
				"dente_active_staff_user",
				JSON.stringify({
					userId: creds.ownerUserId,
					fullName: creds.ownerName,
					role: "doctor",
					organizationId: creds.organizationId,
				}),
			);
			localStorage.setItem("dente_demo_showcase", "false");
			sessionStorage.clear();
		}, prodCreds);

		console.log("Navigating to production workspace...");
		await prodPage.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded" });
		await prodPage.waitForSelector('#main-content, .workspace-shell', { timeout: 15000 }).catch(() => null);
		await wait(3000);

		// Проверяем отсутствие баннера демо-режима
		const prodBannerExists = await prodPage.$('[data-testid="demo-mode-banner"]');
		console.log(`Production banner present (MUST BE FALSE): ${prodBannerExists !== null}`);

		// Скриншот PROD LIGHT
		await applyTheme(prodPage, "light");
		await wait(1000);
		results.push(await saveProof(prodPage, "prod_pc_light.png"));

		// Скриншот PROD DARK
		await applyTheme(prodPage, "dark");
		await wait(1000);
		results.push(await saveProof(prodPage, "prod_pc_dark.png"));

		await prodContext.close();

		console.log("\n=== CAPTURE COMPLETE ===");
		console.table(results);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN INQUISITION SCRIPT:", err);
	process.exit(1);
});
