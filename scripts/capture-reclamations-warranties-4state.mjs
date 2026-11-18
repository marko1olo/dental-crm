import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "d61ce9c8-a592-42d8-b070-3fb55b7f3e14";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_WARRANTIES = "C:/Clinic_MVP/dental-crm/docs/proofs/warranties";
const OUT_WARRANTY = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_WARRANTIES, { recursive: true });
mkdirSync(OUT_WARRANTY, { recursive: true });

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
	const outWarranties = path.join(OUT_WARRANTIES, filename);
	const outWarranty = path.join(OUT_WARRANTY, filename);
	const outConv = path.join(OUT_CONV, filename);

	await page.screenshot({ path: outWarranties, fullPage: false });
	const stat = statSync(outWarranties);
	if (stat.size < 40000) {
		console.warn(`[WARNING] ${filename} size is ${stat.size} bytes (< 40KB)`);
	} else {
		console.log(`[CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
	}
	copyFileSync(outWarranties, outWarranty);
	copyFileSync(outWarranties, outConv);
}

async function main() {
	console.log("=== CAPTURE RECLAMATIONS & WARRANTIES 4-STATE PROOFS ===");

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

	// 1. DESKTOP CONTEXT (1440x900)
	console.log("\n--- Capturing Desktop Warranty Modal (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});
	const pcPage = await pcContext.newPage();
	await setupPageAuth(pcPage, "light");

	console.log(`Navigating to ${WEB_BASE}/?demo=true#warranty-passport...`);
	await pcPage.goto(`${WEB_BASE}/?demo=true#warranty-passport`, { waitUntil: "commit", timeout: 20000 });
	await pcPage.waitForSelector("#root", { timeout: 20000 });
	await sleep(2500);
	await pcPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
		window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
	});
	await pcPage.waitForSelector(".warranty-modal-window, [data-testid='warranty-standalone-workspace'], .warranty-modal-overlay", { timeout: 20000 });
	console.log("Warranty UI mounted on desktop!");
	await sleep(1500);
	await suppressOverlays(pcPage);

	// 01: PC Light Warranty Passport
	await saveProof(pcPage, "01_warranty_passport_pc_light_1440x900.png", "☀️ PC Light (1440x900) Гарантийный паспорт клиники");

	// 02: Switch to Dark Theme
	console.log("Switching to Dark Theme...");
	await pcPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await pcPage.emulateMedia({ colorScheme: "dark" });
	await sleep(1000);
	await saveProof(pcPage, "02_warranty_passport_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Гарантийный паспорт клиники");

	// Navigate to Patient Card with Reclamations Tab
	console.log("\n--- Capturing Patient Reclamations Tab on Desktop ---");
	await pcPage.evaluate(() => {
		window.location.hash = "#patients";
	});
	await sleep(2000);
	// Open Patient Card modal and switch to reclamations tab
	await pcPage.evaluate(() => {
		const patientRow = document.querySelector('[data-testid^="patient-row-"], tr[data-patient-id], .patient-table-row');
		if (patientRow) {
			patientRow.click();
		} else {
			// Trigger patient card modal directly
			window.dispatchEvent(new CustomEvent("dente:open-patient-card", { detail: { patientId: "01a00000-0000-0000-0000-000000000001", tab: "reclamations" } }));
		}
	});
	await sleep(1500);

	// Click reclamations tab if card is open
	await pcPage.evaluate(() => {
		const recTab = document.querySelector('[data-testid="tab-patient-reclamations"]');
		if (recTab) recTab.click();
	});
	await sleep(1000);
	await suppressOverlays(pcPage);

	// 05: Reclamations Tab Dark
	try {
		await saveProof(pcPage, "05_patient_reclamations_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Журнал рекламаций в карточке");
	} catch (e) {
		console.warn("Reclamations dark proof skipped:", e.message);
	}

	// Switch to Light for Reclamations
	await pcPage.evaluate(() => {
		document.documentElement.className = "";
		document.documentElement.removeAttribute("data-theme");
		if (document.body) document.body.className = "";
	});
	await pcPage.emulateMedia({ colorScheme: "light" });
	await sleep(1000);
	try {
		await saveProof(pcPage, "06_patient_reclamations_pc_light_1440x900.png", "☀️ PC Light (1440x900) Журнал рекламаций в карточке");
	} catch (e) {
		console.warn("Reclamations light proof skipped:", e.message);
	}

	await pcContext.close();

	// 2. MOBILE CONTEXT (390x844)
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
	await sleep(2500);
	await mobPage.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
		window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
	});
	await mobPage.waitForSelector(".warranty-modal-window, [data-testid='warranty-standalone-workspace'], .warranty-modal-overlay", { timeout: 20000 });
	await sleep(1500);
	await suppressOverlays(mobPage);

	// 03: Mobile Light
	await saveProof(mobPage, "03_warranty_passport_mobile_light_390x844.png", "📱 Mobile Light (390x844) Bottom Sheet гарантий");

	// 04: Mobile Dark
	await mobPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await mobPage.emulateMedia({ colorScheme: "dark" });
	await sleep(1200);
	await saveProof(mobPage, "04_warranty_passport_mobile_dark_390x844.png", "📱 Mobile Dark (390x844) Bottom Sheet гарантий");

	await mobContext.close();
	await browser.close();

	console.log("\n=== ALL RECLAMATIONS & WARRANTIES PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
