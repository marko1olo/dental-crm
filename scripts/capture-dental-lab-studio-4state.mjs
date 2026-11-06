import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/dental_lab");
const LAB_DIR = path.resolve(process.cwd(), "docs/proofs/lab");
fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(LAB_DIR, { recursive: true });

async function getAuthToken() {
	try {
		const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		if (res.ok) {
			const data = await res.json();
			return { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user };
		}
	} catch (e) {
		console.log("[AUTH] Login error, falling back to demo tokens:", e.message);
	}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-showcase-staff-token-chief",
		user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
	};
}

async function capture() {
	const auth = await getAuthToken();
	console.log(`[AUTH] Ready with user: ${auth.user.fullName}`);

	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			name: "01_dental_lab_studio_pc_light_1440x900",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			name: "02_dental_lab_studio_pc_dark_1440x900",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			name: "03_dental_lab_studio_mobile_light_390x844",
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
		},
		{
			name: "04_dental_lab_studio_mobile_dark_390x844",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
		},
	];

	for (const cfg of configs) {
		console.log(`\n[CAPTURE] Starting ${cfg.name}...`);
		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			locale: "ru-RU",
			colorScheme: cfg.theme,
		});

		await context.addInitScript(({ cTok, sTok, uid, fn, theme }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", cTok);
				localStorage.setItem("dente_staff_token", sTok);
				localStorage.setItem("dente_active_session_token", sTok);
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", uid);
				localStorage.setItem("dente_user_name", fn);
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente-theme", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
			} catch (_) {}
		}, {
			cTok: auth.clinicToken,
			sTok: auth.staffToken,
			uid: auth.user.id,
			fn: auth.user.fullName,
			theme: cfg.theme,
		});

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR ${cfg.name}]:`, err.message));

		// Navigate to standalone dental_lab route
		await page.goto("http://127.0.0.1:5173/?demo=true&standalone=dental_lab", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		// Wait for DentalLabStudioModal to mount
		await page.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
		await page.waitForTimeout(1000);

		// Suppress any tour banners
		await page.evaluate(({ theme }) => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);

			// Ensure proper theme tokens on root
			document.documentElement.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.setAttribute("data-theme", theme);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		}, { theme: cfg.theme });

		await page.waitForTimeout(1000);

		const outPath = path.join(PROOFS_DIR, `${cfg.name}.png`);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
		const labOutPath = path.join(LAB_DIR, `${cfg.name}.png`);
		fs.copyFileSync(outPath, labOutPath);
		const size = fs.statSync(outPath).size;
		console.log(`✓ Saved ${cfg.name}.png (${(size / 1024).toFixed(1)} KB)`);

		if (size < 20480) {
			throw new Error(`Screenshot size ${size} is below 20KB threshold!`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n[SUCCESS] 4-state visual proofs captured successfully in docs/proofs/lab/!");
}

capture().catch((err) => {
	console.error("[FATAL] capture error:", err);
	process.exit(1);
});
