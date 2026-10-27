/**
 * capture_booking_drawer_proofs.mjs — пруф модалки быстрой записи (QuickBookingDrawer)
 * через живой контур: клик по пустому слоту сетки дня → шторка записи → пациент/врач/кресло из БД.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = "docs/proofs/schedule";

function assertFileSize(filePath) {
	const stat = fs.statSync(filePath);
	if (stat.size < 20480) throw new Error(`[Byte Guard] ${filePath} ${stat.size}B < 20KB`);
	console.log(`   [Byte Guard OK] ${path.basename(filePath)}: ${Math.round(stat.size / 1024)} KB`);
}

const res = await fetch(`${API_BASE}/api/auth/login`, {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
if (!res.ok) throw new Error(`Login failed: ${res.status}`);
const auth = await res.json();

const STATES = [
	{ key: "pc_light", theme: "light", file: "booking_drawer_pc_light_1440x900.png" },
	{ key: "pc_dark", theme: "dark", file: "booking_drawer_pc_dark_1440x900.png" },
];

for (const cfg of STATES) {
	const browser = await chromium.launch({
		executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu"],
	});
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU", colorScheme: cfg.theme });
		const page = await context.newPage();
		await page.addInitScript(({ cTok, sTok, userId, userName }) => {
			localStorage.setItem("dente_clinic_token", cTok); localStorage.setItem("dente_staff_token", sTok); localStorage.setItem("dente_active_session_token", sTok);
			localStorage.setItem("dente_organization_id", ""); localStorage.setItem("dente_user_id", userId); localStorage.setItem("dente_user_name", userName);
			localStorage.setItem("dente_user_role", "administrator"); localStorage.setItem("dente_role", "administrator");
			localStorage.setItem("dente_perspective", "reception"); localStorage.setItem("dente_active_view", "schedule");
			localStorage.setItem("dente_onboarding_completed", "true"); localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		}, { cTok: auth.clinicToken, sTok: auth.staffToken, userId: auth.user?.id || "", userName: auth.user?.fullName || "" });
		await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await page.waitForSelector('[data-testid="schedule-view"]', { timeout: 30000 });
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			document.body.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.body.classList.toggle("dark", isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, cfg.theme);
		await page.waitForTimeout(2500);
		// Честный путь: клик по пустому слоту дня — как живой администратор.
		const emptySlot = page.locator('button:has-text("Записать на")').first();
		await emptySlot.waitFor({ state: "visible", timeout: 20000 });
		await emptySlot.click();
		// Шторка быстрой записи открывается по клику на слот.
		await page.waitForTimeout(1800);
		const shotPath = path.join(OUT_DIR, cfg.file);
		await page.screenshot({ path: shotPath, fullPage: false });
		assertFileSize(shotPath);
		await context.close();
	} finally {
		await browser.close();
	}
}
console.log("[DONE] booking drawer proofs captured");
