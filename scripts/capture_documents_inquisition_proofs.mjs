/**
 * scripts/capture_documents_inquisition_proofs.mjs
 *
 * SUBAGENT 4: LEGAL DOCUMENTS & STATUTORY CONSENTS INQUISITOR
 * REAL LIVE CRM BATTLEGROUND CAPTURE (ZERO POTEMKIN VILLAGES / ZERO MOCKS):
 * Real PostgreSQL (5432) + Real Fastify API (4100) + Real Vite App (5173).
 *
 * Captures 4 authentic screenshots at 1440x900 in Microsoft Edge ({ channel: 'msedge' }):
 *   1. 01_documents_catalog_pc_light.png
 *   2. 01_documents_catalog_pc_dark.png
 *   3. 02_tax_certificate_pc_light.png
 *   4. 02_tax_certificate_pc_dark.png
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
	obtainRealAuthTokens,
	injectRealAuthToContext,
	seedLivePatientWithOdontogram,
} = require("./e2e-auth-helper.cjs");

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const DOCS_DIR = path.resolve("docs/screenshots/inquisition_docs");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/47dfa6e0-91bc-4b64-9600-8c293ee5ca48");

fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);

	const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
	await page.waitForFunction(
		(dark) => document.documentElement.classList.contains("dark") === dark,
		isDark,
		{ timeout: 5000 }
	).catch(() => {});
	await page.waitForTimeout(500);
}

async function saveProof(page, filename, description) {
	const filePath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	fs.copyFileSync(filePath, brainPath);

	const sizeBytes = fs.statSync(filePath).size;
	const sizeKb = (sizeBytes / 1024).toFixed(1);
	console.log(`[Captured & Saved] ${filename} (${sizeKb} KB, ${sizeBytes} B) -> ${description}`);

	if (sizeBytes < 40000) {
		throw new Error(`Suspiciously small screenshot size: ${sizeKb} KB for ${filename}`);
	}
}

async function run() {
	console.log("[DOCS-INQUISITION] 1. Получение криптографических JWT-токенов в реальном Fastify API (4100)...");
	const auth = await obtainRealAuthTokens();

	console.log("[DOCS-INQUISITION] 2. Сидирование реального пациента в PostgreSQL (5432)...");
	const { patientId } = await seedLivePatientWithOdontogram(auth);

	console.log("[DOCS-INQUISITION] 3. Запуск Microsoft Edge ({ channel: 'msedge' }) 1440x900...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		// Инжектируем реальную сессию клиники и персонал в localStorage браузера
		await injectRealAuthToContext(context, auth, {
			theme: "light",
			selectedPatientId: patientId,
		});

		const page = await context.newPage();
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log("[PAGE ERROR]", msg.text());
			}
		});

		const targetUrl = `${APP_BASE}/#documents`;
		console.log(`\n[DOCS-INQUISITION] 4. Переход в боевой раздел CRM: ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

		// Ждём загрузки интерфейса CRM и каталога документов
		console.log("[DOCS-INQUISITION] Ожидание каталога документов...");
		await page.waitForSelector('[data-testid="documents-catalog-view"]', { timeout: 20000 });
		await page.waitForTimeout(2000);

		// 1. Каталог документов в реальном боевом интерфейсе CRM (PC Light)
		console.log("\n[DOCS-INQUISITION] Захват 01_documents_catalog_pc_light.png...");
		await setTheme(page, "light");
		await saveProof(
			page,
			"01_documents_catalog_pc_light.png",
			"Каталог медицинских документов в боевой CRM (PC Light 1440x900)"
		);

		// 2. Каталог документов в реальном боевом интерфейсе CRM (PC Dark)
		console.log("\n[DOCS-INQUISITION] Переключение в тёмную тему и захват 01_documents_catalog_pc_dark.png...");
		await setTheme(page, "dark");
		await saveProof(
			page,
			"01_documents_catalog_pc_dark.png",
			"Каталог медицинских документов в боевой CRM (PC Dark 1440x900)"
		);

		// 3. Открытие модалки справки ФНС КНД 1151156 (Светлая тема)
		console.log("\n[DOCS-INQUISITION] Переключение в светлую тему и клик по справке ФНС...");
		await setTheme(page, "light");
		const taxOpenBtn = page.locator('[data-testid="btn-open-tax_deduction_certificate"]');
		await taxOpenBtn.waitFor({ state: "visible", timeout: 10000 });
		await taxOpenBtn.click();

		await page.waitForSelector('[data-testid="fns-tax-certificate-modal"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		console.log("[DOCS-INQUISITION] Захват 02_tax_certificate_pc_light.png...");
		await saveProof(
			page,
			"02_tax_certificate_pc_light.png",
			"Справка об оплате для ФНС КНД 1151156 в боевой CRM (PC Light 1440x900)"
		);

		// 4. Модалка справки ФНС КНД 1151156 (Тёмная тема)
		console.log("\n[DOCS-INQUISITION] Переключение в тёмную тему для справки ФНС...");
		await setTheme(page, "dark");
		await page.waitForTimeout(600);

		console.log("[DOCS-INQUISITION] Захват 02_tax_certificate_pc_dark.png...");
		await saveProof(
			page,
			"02_tax_certificate_pc_dark.png",
			"Справка об оплате для ФНС КНД 1151156 в боевой CRM (PC Dark 1440x900)"
		);

		console.log("\n[SUCCESS] Все 4 боевых скриншота из живого контура CRM сняты успешно!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR IN CAPTURE]", err);
	process.exit(1);
});
