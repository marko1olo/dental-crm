import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/fc7a9880-8fd6-436f-a2cb-93db905f0248";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/endodontics");
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots/endodontics");

for (const d of [BRAIN_DIR, PROOFS_DIR, SCREENSHOTS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

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
	} catch {}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-showcase-staff-token-chief",
		user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
	};
}

async function getActiveBaseUrl() {
	for (const port of [5173, 5174]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok) {
				console.log(`Using active web port: ${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	return "http://127.0.0.1:5173";
}

const configs = [
	{
		filename: "01_endo_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		filename: "02_endo_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		filename: "03_endo_mobile_light_390x844.png",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		filename: "04_endo_mobile_dark_390x844.png",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function capture() {
	const auth = await getAuthToken();
	console.log(`[AUTH] Ready with: ${auth.user?.fullName}`);
	const baseUrl = await getActiveBaseUrl();
	const targetUrl = `${baseUrl}/?demo=true&endo=1#endo`;

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	for (const cfg of configs) {
		console.log(`[CAPTURE] Rendering ${cfg.filename}...`);
		const storageState = {
			cookies: [
				{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
				{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
			],
			origins: [
				{
					origin: baseUrl,
					localStorage: [
						{ name: "dente_demo_showcase", value: "true" },
						{ name: "dente_clinic_token", value: auth.clinicToken },
						{ name: "dente_staff_token", value: auth.staffToken },
						{ name: "dente_active_session_token", value: auth.staffToken },
						{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" },
						{ name: "dente_user_id", value: auth.user.id },
						{ name: "dente_user_name", value: auth.user.fullName },
						{ name: "dente_user_role", value: "doctor" },
						{ name: "dente_role", value: "doctor" },
						{ name: "dente_perspective", value: "doctor" },
						{ name: "dente_theme_mode", value: cfg.theme },
						{ name: "dente-theme", value: cfg.theme },
						{ name: "dente_theme", value: cfg.theme },
						{ name: "theme", value: cfg.theme },
						{ name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
						{ name: "dente_onboarding_completed", value: "true" },
						{ name: "dente_tour_completed", value: "true" },
						{ name: "dente_tour_dismissed", value: "true" },
						{ name: "dente_active_patient_id", value: "01a00000-0000-0000-0000-000000000001" },
					],
				},
			],
		};

		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.theme,
			storageState,
		});

		await context.addInitScript(
			({ cTok, sTok, uid, fn, theme }) => {
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
					document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
					document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
				} catch (_) {}
			},
			{
				cTok: auth.clinicToken,
				sTok: auth.staffToken,
				uid: auth.user.id,
				fn: auth.user.fullName,
				theme: cfg.theme,
			}
		);

		const page = await context.newPage();

		console.log(`[NAV] Going to ${targetUrl}...`);
		await page.goto(targetUrl, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});

		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// Ensure modal or launcher is visible
		const foundModal = await page.waitForSelector('[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]', { timeout: 15000 }).catch(() => null);
		if (!foundModal) {
			console.log("Dispatching deep link event for endo...");
			await page.evaluate(() => {
				window.location.hash = "#endo";
			});
			await page.waitForTimeout(1500);
		}

		// Clean overlays and enforce tokens
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

			document.documentElement.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.setAttribute("data-theme", theme);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		}, { theme: cfg.theme });

		await page.waitForTimeout(1200);

		const targetPath = path.join(PROOFS_DIR, cfg.filename);
		await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

		const buf = fs.readFileSync(targetPath);
		const sizeKb = (buf.length / 1024).toFixed(1);
		const hash = crypto.createHash("md5").update(buf).digest("hex");
		console.log(`  -> Captured: ${cfg.filename} (${sizeKb} KB, md5: ${hash.slice(0, 8)})`);

		fs.copyFileSync(targetPath, path.join(BRAIN_DIR, cfg.filename));
		fs.copyFileSync(targetPath, path.join(SCREENSHOTS_DIR, cfg.filename));

		await context.close();
	}

	await browser.close();
	console.log("All 4-State Proofs captured successfully!");
}

capture().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
