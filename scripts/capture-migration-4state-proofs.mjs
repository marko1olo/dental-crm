/**
 * scripts/capture-migration-4state-proofs.mjs
 *
 * Снятие обязательных 4-state скриншотов мастера переноса базы данных:
 * - docs/proofs/migration/01_migration_pc_light.png (1440x900)
 * - docs/proofs/migration/02_migration_pc_dark.png (1440x900)
 * - docs/proofs/migration/03_migration_mobile_light.png (390x844)
 * - docs/proofs/migration/04_migration_mobile_dark.png (390x844)
 */

import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const API_URL = process.env.DENTAL_API_URL ?? "http://127.0.0.1:4100";
const WEB_URL = process.env.DENTAL_WEB_URL ?? "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("docs/proofs/migration");

await mkdir(OUT_DIR, { recursive: true });

async function getLiveLogin() {
	console.log("[Auth] Authenticating via Fastify API /api/auth/login...");
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	if (!loginRes.ok) {
		throw new Error(
			`Login failed HTTP ${loginRes.status}: ${await loginRes.text()}`,
		);
	}
	const loginData = await loginRes.json();
	console.log("[Auth] Live tokens obtained. Role owner configured.");

	return {
		clinicToken: loginData.clinicToken,
		staffToken: loginData.staffToken,
		user: { ...(loginData.user || {}), role: "owner" },
	};
}

const CONFIGS = [
	{
		id: "01_migration_pc_light",
		theme: "light",
		viewport: { width: 1440, height: 900 },
		isMobile: false,
	},
	{
		id: "02_migration_pc_dark",
		theme: "dark",
		viewport: { width: 1440, height: 900 },
		isMobile: false,
	},
	{
		id: "03_migration_mobile_light",
		theme: "light",
		viewport: { width: 390, height: 844 },
		isMobile: true,
	},
	{
		id: "04_migration_mobile_dark",
		theme: "dark",
		viewport: { width: 390, height: 844 },
		isMobile: true,
	},
];

const authSession = await getLiveLogin();

let browser;
try {
	console.log("[Browser] Launching Microsoft Edge via Playwright...");
	browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu"],
	});
} catch {
	console.log("[Browser] Launching Google Chrome via Playwright...");
	browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu"],
	});
}

try {
	for (const config of CONFIGS) {
		console.log(
			`\n[Capture] Starting ${config.id} (${config.theme}, ${config.viewport.width}x${config.viewport.height})...`,
		);
		const context = await browser.newContext({
			viewport: config.viewport,
			isMobile: config.isMobile,
			hasTouch: config.isMobile,
			locale: "ru-RU",
		});
		const page = await context.newPage();

		await page.addInitScript(
			({ clinicToken, staffToken, user, initialTheme }) => {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_settings_role_mode", "owner");
				localStorage.setItem("dente_active_staff_user", JSON.stringify(user));
				localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ completed: true, dismissed: true, step: "done", version: 1 }),
				);
				localStorage.setItem("dente_theme_mode", initialTheme);
				localStorage.setItem("dente_theme", initialTheme);
			},
			{ ...authSession, initialTheme: config.theme },
		);

		await page.goto(`${WEB_URL}/?demo=true#settings/imports`, {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});

		// Ждём завершения загрузки бутстрапа
		await page
			.waitForSelector("main.boot-state", { state: "detached", timeout: 30_000 })
			.catch(() => {});

		// Ждём появления мастера миграции
		const wizard = page.locator(".migration-wizard").first();
		await wizard.waitFor({ state: "visible", timeout: 25_000 });

		// Гарантируем установку темы в DOM
		await page
			.evaluate((theme) => {
				document.documentElement.setAttribute("data-theme", theme);
				document.documentElement.setAttribute("data-theme-mode", theme);
			}, config.theme)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const outPath = path.join(OUT_DIR, `${config.id}.png`);
		await page.screenshot({
			path: outPath,
			fullPage: false,
		});

		const fileStats = await stat(outPath);
		console.log(`[Capture] Saved: ${outPath} (${fileStats.size} bytes)`);

		if (fileStats.size < 20480) {
			throw new Error(
				`Screenshot ${config.id} size ${fileStats.size} bytes is below the 20KB threshold!`,
			);
		}

		await context.close();
	}
	console.log("\n[Capture] All 4 migration screenshots successfully captured!");
} finally {
	await browser.close();
}
