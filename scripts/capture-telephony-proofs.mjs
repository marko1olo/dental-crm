/**
 * capture-telephony-proofs.mjs
 * Red Team 4-State Visual Proof Capture for Telephony & Call Surfaces:
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 🌙 Mobile Dark (390x844)
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5175";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/telephony");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
].filter(Boolean);

let executablePath;
for (const p of possibleBrowserPaths) {
	if (existsSync(p)) {
		executablePath = p;
		break;
	}
}

async function loginAndGetTokens() {
	try {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
		});
		if (res.ok) return await res.json();
	} catch (err) {
		console.log("[Proof Engine] API not reachable, proceeding with standalone demo session:", err.message);
	}
	return {
		clinicToken: "mock-clinic-token-proof",
		staffToken: "mock-staff-token-proof",
		user: { id: "user-admin", role: "admin", name: "Администратор" },
	};
}

async function main() {
	console.log("[Proof Engine] Obtaining session tokens...");
	const auth = await loginAndGetTokens();
	console.log("[Proof Engine] Session ready. Launching browser...", executablePath || "bundled");

	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const targets = [
		{ name: "01_telephony_pc_light_1440x900.png", theme: "light", viewport: { width: 1440, height: 900 } },
		{ name: "02_telephony_pc_dark_1440x900.png", theme: "dark", viewport: { width: 1440, height: 900 } },
		{ name: "03_telephony_mobile_light_390x844.png", theme: "light", viewport: { width: 390, height: 844 }, isMobile: true },
		{ name: "04_telephony_mobile_dark_390x844.png", theme: "dark", viewport: { width: 390, height: 844 }, isMobile: true },
	];

	for (const t of targets) {
		console.log(`[Proof Engine] Capturing ${t.name}...`);
		const context = await browser.newContext({
			viewport: t.viewport,
			colorScheme: t.theme,
			deviceScaleFactor: t.isMobile ? 2 : 1,
			isMobile: t.isMobile || false,
		});

		const page = await context.newPage();

		// Set auth tokens in localStorage before load
		await page.addInitScript(({ clinicToken, staffToken, user, theme }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_staff_user", JSON.stringify(user));
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
		}, {
			clinicToken: auth.clinicToken,
			staffToken: auth.staffToken,
			user: auth.user,
			theme: t.theme,
		});

		// Navigate with domcontentloaded
		await page.goto(`${APP_BASE}/?demo=true#telephony`, { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForTimeout(2000);

		// Ensure theme class is applied on document.documentElement
		if (t.theme === "dark") {
			await page.evaluate(() => {
				document.documentElement.classList.add("dark");
				document.documentElement.setAttribute("data-theme", "dark");
			});
		} else {
			await page.evaluate(() => {
				document.documentElement.classList.remove("dark");
				document.documentElement.setAttribute("data-theme", "light");
			});
		}
		await page.waitForTimeout(1000);

		const outPath = path.join(OUT_DIR, t.name);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`[Proof Engine] Saved: ${outPath}`);

		await context.close();
	}

	await browser.close();
	console.log("[Proof Engine] All 4 states successfully captured!");
}

main().catch((err) => {
	console.error("[Proof Engine] Error:", err);
	process.exit(1);
});
