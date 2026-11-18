import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/5a244b83-3695-4aa7-a157-888ddff01de5";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/3d_scanner";
const WEB_BASE = "http://127.0.0.1:5173";
const TARGET_URL = "http://127.0.0.1:5173/?stand=scan-3d";

if (!fs.existsSync(OUT_CONV)) fs.mkdirSync(OUT_CONV, { recursive: true });
if (!fs.existsSync(OUT_DOCS)) fs.mkdirSync(OUT_DOCS, { recursive: true });

async function getAuth() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		if (res.ok) {
			const data = await res.json();
			if (data.ok) return data;
		}
	} catch (err) {
		console.log("[AUTH ERROR]", err.message);
	}
	return null;
}

async function injectStorage(context, theme = "light", auth = null) {
	if (auth) {
		await context.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, url: WEB_BASE },
			{ name: "dente_staff_token", value: auth.staffToken || auth.clinicToken, url: WEB_BASE },
		]);
	}
	await context.addInitScript(({ th, auth }) => {
		const clinicToken = auth?.clinicToken || "demo-token";
		const staffToken = auth?.staffToken || auth?.clinicToken || "demo-token";
		const role = auth?.user?.role || "owner";
		const userId = auth?.user?.id || "doc-1";
		const userName = auth?.user?.fullName || "Д-р Соколов А. В.";

		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", role);
		localStorage.setItem("dente_role", role);
		localStorage.setItem("dente_user_role", role);
		localStorage.setItem("dente_active_user_id", userId);
		localStorage.setItem("dente_user_id", userId);
		localStorage.setItem("dente_user_name", userName);
		localStorage.setItem("dente_active_view", "schedule");
		localStorage.setItem("dente_active_nav", "schedule");
		if (auth?.user) {
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(auth.user));
		}
		localStorage.setItem("dente_theme_mode", th);
		document.documentElement.setAttribute("data-theme", th);
	}, { th: theme, auth });
}

async function saveProof(name, buffer) {
	if (buffer.length < 25000) {
		throw new Error(`Screenshot ${name} is too small: ${buffer.length} bytes (minimum 25KB required)`);
	}
	const p1 = path.join(OUT_CONV, name);
	const p2 = path.join(OUT_DOCS, name);
	fs.writeFileSync(p1, buffer);
	fs.writeFileSync(p2, buffer);
	console.log(`[PROOF VERIFIED & SAVED] ${name} -> ${buffer.length} bytes (>= 25KB OK)`);
}

async function setPageTheme(page, theme) {
	await page.evaluate((t) => {
		document.documentElement.setAttribute("data-theme", t);
		document.body.setAttribute("data-theme", t);
		localStorage.setItem("dente_theme_mode", t);
		if (t === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.setProperty("--paper-strong", "#ffffff");
			document.documentElement.style.setProperty("--paper", "#f8fafc");
			document.documentElement.style.setProperty("--paper-soft", "#f1f5f9");
			document.documentElement.style.setProperty("--ink", "#0f172a");
			document.documentElement.style.setProperty("--muted", "#64748b");
			document.documentElement.style.setProperty("--line", "#cbd5e1");
			document.documentElement.style.setProperty("--line-subtle", "#e2e8f0");
			document.body.style.backgroundColor = "#f8fafc";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
			document.documentElement.style.setProperty("--paper-strong", "#090d16");
			document.documentElement.style.setProperty("--paper", "#0f172a");
			document.documentElement.style.setProperty("--paper-soft", "#1e293b");
			document.documentElement.style.setProperty("--ink", "#f8fafc");
			document.documentElement.style.setProperty("--muted", "#94a3b8");
			document.documentElement.style.setProperty("--line", "#334155");
			document.documentElement.style.setProperty("--line-subtle", "#1e293b");
			document.body.style.backgroundColor = "#090d16";
		}
	}, theme);
}

async function main() {
	console.log("=== Starting Live 4-State Visual Proof Capture (Vite 5173 + API 4100) ===");

	const auth = await getAuth();
	console.log(`Auth acquired: ${auth ? "SUCCESS" : "FALLBACK"}`);

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ══════════════════════════════════════════════════════════
		// 1. PC SESSION (1440x900)
		// ══════════════════════════════════════════════════════════
		console.log("--- 1. PC Live Session (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(pcContext, "light", auth);
		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
		pcPage.on("pageerror", (err) => console.log("[BROWSER ERROR]", err.message));

		console.log(`Navigating PC to ${TARGET_URL}...`);
		await pcPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="dental-universal-3d-viewer"]', { timeout: 25000 });
		console.log("PC 3D Viewer mounted in live DOM! Waiting for WebGL canvas and models...");
		await sleep(3500);

		// 1.1 PC Light
		console.log("Capturing 01_live_scan_3d_viewer_pc_light_1440x900.png ...");
		await setPageTheme(pcPage, "light");
		await sleep(1500);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		await saveProof("01_live_scan_3d_viewer_pc_light_1440x900.png", pcLightBuf);

		// 1.2 PC Dark
		console.log("Capturing 02_live_scan_3d_viewer_pc_dark_1440x900.png ...");
		await setPageTheme(pcPage, "dark");
		await sleep(1500);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		await saveProof("02_live_scan_3d_viewer_pc_dark_1440x900.png", pcDarkBuf);
		await pcContext.close();

		// ══════════════════════════════════════════════════════════
		// 2. MOBILE SESSION (390x844 - iPhone 14 / Apple HIG)
		// ══════════════════════════════════════════════════════════
		console.log("--- 2. Mobile Live Session (390x844 - Apple HIG) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectStorage(mobileContext, "light", auth);
		const mobilePage = await mobileContext.newPage();
		mobilePage.on("console", (msg) => console.log("[MOBILE BROWSER CONSOLE]", msg.type(), msg.text()));
		mobilePage.on("pageerror", (err) => console.log("[MOBILE BROWSER ERROR]", err.message));

		console.log(`Navigating Mobile to ${TARGET_URL}...`);
		await mobilePage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="dental-universal-3d-viewer"]', { timeout: 25000 });
		console.log("Mobile 3D Viewer mounted! Waiting for WebGL canvas and touch controls...");
		await sleep(3500);

		// 2.1 Mobile Light
		console.log("Capturing 03_live_scan_3d_viewer_mobile_light_390x844.png ...");
		await setPageTheme(mobilePage, "light");
		await sleep(1500);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		await saveProof("03_live_scan_3d_viewer_mobile_light_390x844.png", mobileLightBuf);

		// 2.2 Mobile Dark
		console.log("Capturing 04_live_scan_3d_viewer_mobile_dark_390x844.png ...");
		await setPageTheme(mobilePage, "dark");
		await sleep(1500);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		await saveProof("04_live_scan_3d_viewer_mobile_dark_390x844.png", mobileDarkBuf);
		await mobileContext.close();

		console.log("=== All 4 Live 3D Scanner Proofs Captured Successfully! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in live capture:", err);
	process.exit(1);
});
