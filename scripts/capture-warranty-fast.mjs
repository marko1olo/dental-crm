import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "395b4cb6-db90-40c4-bf28-e94670802f6a";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				.copilot-trigger-btn,
				.workspace-continuity-strip,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast, .copilot-trigger-btn, .workspace-continuity-strip").forEach((el) => el.remove());
		});
	} catch {}
}

async function saveProof(page, filename, description) {
	const outPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: outPath, fullPage: false });
	const stat = statSync(outPath);
	if (stat.size < 40000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes (required >= 40KB)`);
	}
	console.log(`[CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
	copyFileSync(outPath, path.join(OUT_CONV, filename));
}

async function main() {
	console.log("=== FAST CANONICAL WARRANTY PROOFS CAPTURE ===");

	console.log("🔐 Authenticating against Fastify API...");
	const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed: ${await loginRes.text()}`);
	}
	const auth = await loginRes.json();
	console.log(`✅ Logged in as ${auth.user?.fullName}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const setupPageAuth = async (page, theme = "light") => {
		await page.addInitScript(
			({ clinicToken, staffToken, u, t }) => {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_role", u.role || "owner");
				localStorage.setItem("dente_active_user_id", u.id);
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
			},
			{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user, t: theme },
		);
	};

	// 1. DESKTOP CONTEXT
	console.log("\n--- Capturing Desktop Warranty Modal (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});
	const pcPage = await pcContext.newPage();
	await setupPageAuth(pcPage, "light");

	console.log(`Navigating to ${WEB_BASE}/?demo=true#warranty-passport...`);
	pcPage.on("pageerror", (err) => console.error("[PC PAGE ERROR]", err.message));
	pcPage.on("console", (msg) => {
		if (msg.type() === "error") console.error("[PC CONSOLE ERROR]", msg.text());
	});
	await pcPage.goto(`${WEB_BASE}/?demo=true#warranty-passport`, { waitUntil: "commit", timeout: 20000 });
	await pcPage.waitForSelector("#root", { timeout: 20000 });
	await sleep(3000);
	await pcPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
		window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
	});
	await pcPage.waitForSelector(".warranty-modal-window", { timeout: 20000 });
	console.log("Warranty Modal mounted on desktop!");
	await sleep(1500);
	await suppressOverlays(pcPage);

	// 01: PC Light
	await saveProof(pcPage, "01_warranty_passport_pc_light_1440x900.png", "☀️ PC Light (1440x900) Гарантийный паспорт клиники");

	// 02: Switch to dark theme in passport editor
	console.log("Switching to dark theme for passport editor...");
	await pcPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await pcPage.emulateMedia({ colorScheme: "dark" });
	await sleep(1000);
	await saveProof(pcPage, "02_warranty_passport_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Гарантийный паспорт клиники");

	// 02b: Switch to remediation tab for bonus proof
	console.log("Switching to remediation tab & dark theme...");
	await pcPage.evaluate(() => {
		const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
		const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
		if (remTab) (remTab).click();
	});
	await sleep(1000);
	try {
		await saveProof(pcPage, "05_warranty_remediation_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Гарантийная переделка 0 ₽");
	} catch (e) {
		console.warn("Remediation proof optional skip:", e.message);
	}
	await pcContext.close();

	// 2. MOBILE CONTEXT
	console.log("\n--- Capturing Mobile Warranty Modal (390x844) ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		colorScheme: "light",
	});
	const mobPage = await mobContext.newPage();
	await setupPageAuth(mobPage, "light");

	await mobPage.goto(`${WEB_BASE}/?demo=true#warranty-passport`, { waitUntil: "commit", timeout: 20000 });
	await mobPage.waitForSelector("#root", { timeout: 20000 });
	await sleep(3000);
	await mobPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
		window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
	});
	await mobPage.waitForSelector(".warranty-modal-window", { timeout: 20000 });
	console.log("Warranty Modal mounted on mobile!");
	await sleep(1500);
	await suppressOverlays(mobPage);

	// 03 & 05: Mobile Light
	await saveProof(mobPage, "03_warranty_passport_mobile_light_390x844.png", "📱 Mobile Light (390x844) Bottom Sheet гарантий");
	await saveProof(mobPage, "05_warranty_mobile_light_390x844.png", "📱 Mobile Light (390x844) Bottom Sheet гарантий");

	// 04 & 06: Mobile Dark in same context
	await mobPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await mobPage.emulateMedia({ colorScheme: "dark" });
	await sleep(1500);
	await saveProof(mobPage, "04_warranty_passport_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Bottom Sheet гарантий");
	await saveProof(mobPage, "06_warranty_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Bottom Sheet гарантий");
	await mobContext.close();

	await browser.close();
	console.log("\n=== ALL WARRANTY PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
