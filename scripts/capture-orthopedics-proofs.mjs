import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5174";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/orthopedics";

mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
	throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("🔐 Authenticating against Fastify API...");
	const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
	}
	const auth = await loginRes.json();
	console.log(`✅ Logged in as ${auth.user?.fullName} (${auth.clinic?.name || "ООО ДЕНТЕ"})`);

	console.log("🚀 Launching browser for Orthopedics 4-State Proofs:", executablePath);
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	const states = [
		{
			id: "pc_light_1440x900",
			width: 1440,
			height: 900,
			scale: 1,
			isMobile: false,
			theme: "light",
			file: "pc_light_1440x900.png",
		},
		{
			id: "pc_dark_1440x900",
			width: 1440,
			height: 900,
			scale: 1,
			isMobile: false,
			theme: "dark",
			file: "pc_dark_1440x900.png",
		},
		{
			id: "mobile_light_390x844",
			width: 390,
			height: 844,
			scale: 2,
			isMobile: true,
			theme: "light",
			file: "mobile_light_390x844.png",
		},
		{
			id: "mobile_dark_390x844",
			width: 390,
			height: 844,
			scale: 2,
			isMobile: true,
			theme: "dark",
			file: "mobile_dark_390x844.png",
		},
	];

	for (const state of states) {
		console.log(`\n📸 Capturing ${state.id} (${state.width}x${state.height}, theme=${state.theme})...`);

		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			deviceScaleFactor: state.scale,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			colorScheme: state.theme,
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ clinicToken, staffToken, u, t }) => {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_role", u.role);
				localStorage.setItem("dente_active_user_id", u.id);
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ onboardingDismissed: true, theme: t }),
				);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
			},
			{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user, t: state.theme },
		);

		await page.goto(`${BASE_URL}/?standalone=orthopedics&demo=true&theme=${state.theme}`, {
			waitUntil: "commit",
			timeout: 30000,
		});

		console.log("Waiting for orthopedics-standalone-workspace to mount...");
		await page.waitForSelector('[data-testid="orthopedics-standalone-workspace"]', {
			timeout: 30000,
		});
		console.log("Mounted successfully!");

		await sleep(500);

		// Принудительно устанавливаем тему
		await page.evaluate(({ t }) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.className = "dark";
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.body.className = "light";
				document.documentElement.style.colorScheme = "light";
			}
		}, { t: state.theme });

		await sleep(300);

		const outPath = path.join(PROOFS_DIR, state.file);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`✅ Saved: ${outPath}`);

		await context.close();
	}

	// 5. Дополнительный скриншот: открытый Гарантийный Паспорт А4 с QR-кодом
	console.log("\n📸 Capturing Orthopedic Passport A4 Modal with QR code (PC Light)...");
	const passportContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		isMobile: false,
		colorScheme: "light",
	});
	const passportPage = await passportContext.newPage();
	await passportPage.addInitScript(
		({ clinicToken, staffToken, u }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_role", u.role);
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
		},
		{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user },
	);

	try {
		await passportPage.goto(`${BASE_URL}/?standalone=orthopedics&demo=true&theme=light`, {
			waitUntil: "commit",
			timeout: 30000,
		});
		await passportPage.waitForSelector('[data-testid="orthopedics-standalone-workspace"]', { timeout: 30000 });
		await sleep(500);

		const passportBtn = passportPage.locator('[data-testid="open-orthopedic-passport-btn"]');
		if (await passportBtn.count() > 0 && await passportBtn.isVisible()) {
			await passportBtn.click();
			await sleep(500);
			const passportOut = path.join(PROOFS_DIR, "passport_a4_qr_pc_light.png");
			await passportPage.screenshot({ path: passportOut, fullPage: false });
			console.log(`✅ Saved Passport Modal: ${passportOut}`);
		}
	} catch (err) {
		console.warn("⚠️ Passport capture error:", err.message);
	}

	await passportContext.close();
	await browser.close();
	console.log("\n🎉 ALL 4-STATE ORTHOPEDICS PROOFS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("❌ Capture failed:", err);
	process.exit(1);
});
