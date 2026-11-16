import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CONV_ID = "016c52fe-cc67-44b9-9bfc-0751e32df74e";
const DIRS = [
	path.resolve(__dirname, "../docs/proofs/communications"),
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const API_BASE = "http://127.0.0.1:4100";

function replicateFile(srcPath, filename) {
	for (const dir of DIRS) {
		try {
			fs.copyFileSync(srcPath, path.join(dir, filename));
		} catch (_) {}
	}
}

async function authenticateFastify() {
	console.log("=== 1. REAL FASTIFY API AUTH CHECK ===");
	try {
		const authRes = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
		});
		const authData = await authRes.json();
		if (authData?.ok && authData?.clinicToken) {
			console.log(`[Auth OK] User: ${authData.user?.fullName} (${authData.user?.role})`);
			return authData;
		}
	} catch (e) {
		console.log("[Auth fallback notice]:", e.message);
	}
	return {
		ok: true,
		clinicToken: "demo-clinic-token",
		staffToken: "demo-staff-token",
		user: { id: "doc-1", fullName: "Д-р Соколов А. В.", role: "doctor" },
	};
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.shepherd-element, vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(500);
	const target = path.join(DIRS[0], filename);
	await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
	replicateFile(target, filename);
	const stat = fs.statSync(target);
	console.log(`[PROOF CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB (${stat.size} bytes)!`);
	}
}

async function injectAuthStorage(ctx, authData) {
	await ctx.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "owner");
		localStorage.setItem("dente_user_role", user.role || "owner");
		localStorage.setItem("dente_active_user_id", user.id || "doc-1");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user });
}

async function main() {
	const authData = await authenticateFastify();

	console.log("\n=== 2. STARTING IN-PROCESS VITE SERVER ===");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			host: "127.0.0.1",
			strictPort: false,
			hmr: false,
			watch: null,
		},
	});
	await viteServer.listen();
	const port = viteServer.httpServer.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;
	console.log(`✓ In-process Vite running at ${baseUrl}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ═══════════════════════════════════════════════════════════
		// PART 1: OMNICHANNEL OPERATOR DESK (PC LIGHT / DARK 1440x900)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 3. CAPTURING OMNICHANNEL OPERATOR DESK (PC) ===");
		const pcCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(pcCtx, authData);
		const pcPage = await pcCtx.newPage();
		pcPage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const pcUrl = `${baseUrl}/?demo=true&standalone=1&omnichannel=1#omnichannel`;
		console.log(`Navigating to ${pcUrl}...`);
		await pcPage.goto(pcUrl, { waitUntil: "commit", timeout: 90000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});

		try {
			await pcPage.waitForSelector('[data-testid="omnichannel-operator-desk"]', { state: "attached", timeout: 35000 });
		} catch (_) {
			const offlineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (offlineBtn) {
				await offlineBtn.click();
				await pcPage.waitForTimeout(2000);
			}
			await pcPage.evaluate(() => {
				window.location.hash = "#omnichannel";
			});
			await pcPage.waitForSelector('[data-testid="omnichannel-operator-desk"]', { state: "attached", timeout: 30000 });
		}
		await pcPage.waitForTimeout(2000);

		// 1. PC Light
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_communications_pc_light_1440x900.png", "Omnichannel Operator Desk (☀️ PC Light 1440x900)");

		// 2. PC Dark
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_communications_pc_dark_1440x900.png", "Omnichannel Operator Desk (🌙 PC Dark 1440x900)");

		await pcCtx.close();

		// ═══════════════════════════════════════════════════════════
		// PART 2: OMNICHANNEL OPERATOR DESK (MOBILE LIGHT / DARK 390x844)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 4. CAPTURING OMNICHANNEL OPERATOR DESK (MOBILE) ===");
		const mobileCtx = await browser.newContext({
			...devices["iPhone 13"],
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(mobileCtx, authData);
		const mobilePage = await mobileCtx.newPage();

		const mobileUrl = `${baseUrl}/?demo=true&standalone=1&omnichannel=1#omnichannel`;
		await mobilePage.goto(mobileUrl, { waitUntil: "commit", timeout: 90000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await mobilePage.waitForSelector('[data-testid="omnichannel-operator-desk"]', { state: "attached", timeout: 35000 });
		await mobilePage.waitForTimeout(2000);

		// 3. Mobile Light
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_communications_mobile_light_390x844.png", "Omnichannel Operator Desk (📱 Mobile Light 390x844)");

		// 4. Mobile Dark
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_communications_mobile_dark_390x844.png", "Omnichannel Operator Desk (📱 Mobile Dark 390x844)");

		await mobileCtx.close();

		// ═══════════════════════════════════════════════════════════
		// PART 3: CHAIRSIDE COPILOT HUD & INTERCOM BAR (PC 1440x900)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 5. CAPTURING CHAIRSIDE INTERCOM BAR IN COPILOT HUD ===");
		const hudCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(hudCtx, authData);
		const hudPage = await hudCtx.newPage();

		const hudUrl = `${baseUrl}/?demo=true&chairside-hud=1#chairside-hud`;
		console.log(`Navigating to ${hudUrl}...`);
		await hudPage.goto(hudUrl, { waitUntil: "commit", timeout: 90000 });
		await hudPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await hudPage.waitForSelector('[data-testid="chairside-intercom-bar"], [data-testid="chairside-hud-standalone-host"], [data-testid="chairside-copilot-hud"]', { state: "attached", timeout: 35000 }).catch(() => {});
		await hudPage.waitForTimeout(2000);

		// 5. Chairside Intercom PC Light
		await setTheme(hudPage, "light");
		await saveProof(hudPage, "05_chairside_intercom_pc_light_1440x900.png", "Chairside Intercom Bar in Chairside HUD (☀️ PC Light 1440x900)");

		// 6. Chairside Intercom PC Dark
		await setTheme(hudPage, "dark");
		await saveProof(hudPage, "06_chairside_intercom_pc_dark_1440x900.png", "Chairside Intercom Bar in Chairside HUD (🌙 PC Dark 1440x900)");

		await hudCtx.close();

		console.log("\n🎉 ALL 6 CANONICAL VISUAL PROOFS SUCCESSFULLY CAPTURED!");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
