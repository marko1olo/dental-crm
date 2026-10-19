import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "7495a530-4b20-4812-b3f3-a4a8d392f5a1";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/radiology";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

async function provisionSession() {
	console.log("[Auth] Provisioning live clinic session via API...");
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Рентген",
			email: `doctor-radiology-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

function injectStorage(context, auth, theme = "light") {
	return context.addInitScript(
		({ ct, st, uid, th }) => {
			try {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_id", uid);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
			} catch (e) {
				// ignore
			}
		},
		{
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
			th: theme,
		},
	);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function prepareAndCapture(browser, { name, filename, description, width, height, theme, isMobile }) {
	console.log(`\n--- Capturing ${name} (${width}x${height}, ${theme}) ---`);
	const context = await browser.newContext({
		viewport: { width, height },
		isMobile: !!isMobile,
		hasTouch: !!isMobile,
		colorScheme: theme,
	});
	await injectStorage(context, browser._auth, theme);
	const page = await context.newPage();

	page.on("console", (m) => {
		if (m.type() === "error") {
			console.log(`[PAGE ERROR]`, m.text());
		}
	});
	page.on("pageerror", (e) => console.error(`[UNCAUGHT]`, e.message));

	await page.goto(`${WEB_URL}/#imaging`, { waitUntil: "networkidle" });
	
	// Apply theme to DOM
	await page.evaluate((th) => {
		if (document.documentElement) {
			document.documentElement.classList.remove("light", "dark");
			document.documentElement.classList.add(th);
			document.documentElement.setAttribute("data-theme", th);
		}
	}, theme);

	// Wait for lazy-loaded imaging view to mount
	if (isMobile) {
		await page.waitForSelector('[data-testid="mobile-chairside-radiology-container"], .mobile-radiology-container', { timeout: 15000 });
	} else {
		await page.waitForSelector('.imaging-workspace-root, .imaging-panel:not([aria-busy="true"])', { timeout: 15000 });
	}

	await page.waitForTimeout(1500);
	await suppressOverlays(page);
	await captureProof(page, filename, description);
	await context.close();
}

async function captureProof(page, filename, description) {
	const outPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: outPath, fullPage: false });
	const stat = statSync(outPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes`);
	}
	console.log(`[CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
	copyFileSync(outPath, path.join(OUT_CONV, filename));
}

async function main() {
	console.log("=== STARTING 4-STATE RADIOLOGY PROOF CAPTURE ===");
	const auth = await provisionSession();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	browser._auth = auth;

	try {
		// 1. PC Light (1440x900)
		await prepareAndCapture(browser, {
			name: "PC Light",
			filename: "radiology_pc_light_1440x900.png",
			description: "PC Light 1440x900 Desktop RVG / OPG Radiology Workspace",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		});

		// 2. PC Dark (1440x900)
		await prepareAndCapture(browser, {
			name: "PC Dark",
			filename: "radiology_pc_dark_1440x900.png",
			description: "PC Dark 1440x900 High-Contrast Diagnostic Radiology Workspace",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		});

		// 3. Mobile Light (390x844)
		await prepareAndCapture(browser, {
			name: "Mobile Light",
			filename: "radiology_mobile_light_390x844.png",
			description: "Mobile Light 390x844 Chairside Radiology Viewer (Apple HIG)",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		});

		// 4. Mobile Dark (390x844)
		await prepareAndCapture(browser, {
			name: "Mobile Dark",
			filename: "radiology_mobile_dark_390x844.png",
			description: "Mobile Dark 390x844 High-Contrast Diagnostic Chairside Viewer",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		});

		console.log("\n=== ALL 4-STATE SCREENSHOTS SUCCESSFULLY CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
