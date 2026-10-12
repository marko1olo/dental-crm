/**
 * scripts/capture-commissions-and-pricelist-proofs.mjs
 *
 * Скрипт захвата реальных скриншотов высокого разрешения (1440x900) в PC Light и PC Dark:
 * 1. StaffCommissionsPanel (включая DoctorPieceRateCalculatorSection)
 * 2. OwnerPriceList804nSection
 *
 * Инварианты:
 * - Разрешение строго 1440x900 (Desktop).
 * - Реальное живое приложение http://127.0.0.1:5173/?demo=true.
 * - Проверка размера скриншотов >= 20 КБ (Anti-Blank Artifact Rule).
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = "http://127.0.0.1:5173/?demo=true";
const OUT_DIR = path.join(process.cwd(), "docs/screenshots/commissions_proofs");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function getExecutablePath() {
	for (const p of possibleBrowserPaths) {
		if (existsSync(p)) return p;
	}
	return undefined;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("[SCREENSHOTS] Launching browser for Red Team Visual Proof...");
	const execPath = getExecutablePath();
	const browser = await chromium.launch({
		headless: true,
		executablePath: execPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	console.log(`[SCREENSHOTS] Navigating to ${APP_URL}...`);
	await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 30000 });
	await wait(3000);

	// 1. Переход в настройки
	console.log("[SCREENSHOTS] Opening Settings view...");
	await page.evaluate(() => {
		window.location.hash = "settings";
	});
	await wait(2000);

	// Переключаемся на режим владельца клиники
	await page.evaluate(() => {
		// Кликаем кнопку роли владельца если есть
		const ownerBtn = Array.from(document.querySelectorAll("button")).find(
			(b) => b.textContent?.includes("Владелец") || b.textContent?.includes("Управляющий"),
		);
		if (ownerBtn) ownerBtn.click();
	});
	await wait(1000);

	// ----------------------------------------------------
	// A. Вкладка "Комиссии и мотивация врачей" (StaffCommissionsPanel)
	// ----------------------------------------------------
	console.log("[SCREENSHOTS] Opening Commissions tab...");
	await page.evaluate(() => {
		// Поиск кнопки вкладки "Комиссии" или переход через хэш
		window.location.hash = "settings/commissions";
		const commTab = Array.from(document.querySelectorAll("button")).find((b) =>
			b.textContent?.includes("Комиссии"),
		);
		if (commTab) commTab.click();
	});
	await wait(2500);

	// Скроллим так, чтобы была видна таблица комиссий и калькулятор мотивации
	const commissionsPathLight = path.join(OUT_DIR, "staff_commissions_desktop_light.png");
	await page.screenshot({ path: commissionsPathLight, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${commissionsPathLight}`);

	// Включаем Dark Mode
	console.log("[SCREENSHOTS] Switching to Dark Mode...");
	await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await wait(1000);

	const commissionsPathDark = path.join(OUT_DIR, "staff_commissions_desktop_dark.png");
	await page.screenshot({ path: commissionsPathDark, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${commissionsPathDark}`);

	// Скроллим к калькулятору мотивации врача (DoctorPieceRateCalculatorSection)
	await page.evaluate(() => {
		const calcEl = document.querySelector('[data-testid="doctor-piece-rate-calculator-section"]');
		if (calcEl) {
			calcEl.scrollIntoView({ behavior: "instant", block: "start" });
		}
	});
	await wait(1000);

	const pieceRatePathDark = path.join(OUT_DIR, "doctor_piecerate_calculator_desktop_dark.png");
	await page.screenshot({ path: pieceRatePathDark, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${pieceRatePathDark}`);

	// Возвращаем Light Mode
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await wait(500);

	const pieceRatePathLight = path.join(OUT_DIR, "doctor_piecerate_calculator_desktop_light.png");
	await page.screenshot({ path: pieceRatePathLight, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${pieceRatePathLight}`);

	// ----------------------------------------------------
	// B. Вкладка "Прейскурант услуг 804н" (OwnerPriceList804nSection)
	// ----------------------------------------------------
	console.log("[SCREENSHOTS] Opening Owner Price List 804n tab...");
	await page.evaluate(() => {
		window.location.hash = "settings/prices";
		const priceTab = Array.from(document.querySelectorAll("button")).find(
			(b) => b.textContent?.includes("Прейскурант") || b.textContent?.includes("Цены"),
		);
		if (priceTab) priceTab.click();
	});
	await wait(2500);

	await page.evaluate(() => {
		const priceEl = document.querySelector('[data-testid="owner-pricelist-804n-section"]');
		if (priceEl) {
			priceEl.scrollIntoView({ behavior: "instant", block: "start" });
		}
	});
	await wait(1000);

	const priceListPathLight = path.join(OUT_DIR, "owner_pricelist804n_desktop_light.png");
	await page.screenshot({ path: priceListPathLight, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${priceListPathLight}`);

	// Dark Mode для Прейскуранта 804н
	await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await wait(1000);

	const priceListPathDark = path.join(OUT_DIR, "owner_pricelist804n_desktop_dark.png");
	await page.screenshot({ path: priceListPathDark, fullPage: false });
	console.log(`[SCREENSHOTS] Captured: ${priceListPathDark}`);

	await browser.close();

	// Проверка размеров файлов (>= 20 КБ)
	const files = [
		commissionsPathLight,
		commissionsPathDark,
		pieceRatePathLight,
		pieceRatePathDark,
		priceListPathLight,
		priceListPathDark,
	];

	console.log("\n[VERIFICATION] Checking file sizes against Anti-Blank Artifact Floor (>= 20 KB):");
	for (const f of files) {
		const stat = statSync(f);
		const sizeKb = Math.round(stat.size / 1024);
		console.log(` - ${path.basename(f)}: ${sizeKb} KB`);
		if (stat.size < 20 * 1024) {
			throw new Error(`File ${f} is too small (${stat.size} bytes), anti-blank invariant violated!`);
		}
	}
	console.log("[VERIFICATION] All 6 screenshots passed visual proof floor!\n");
}

run().catch((err) => {
	console.error("[ERROR]", err);
	process.exit(1);
});
