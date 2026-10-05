const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => fs.existsSync(p));

async function run() {
	console.log("1. Provisioning clinic...");
	const id = Date.now();
	const r1 = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Dente Studio " + id,
			email: `studio${id}@dente.local`,
			password: "Password123!",
			ownerName: "Dr Smirnov",
			ownerPin: "123456",
		}),
	});
	const d1 = await r1.json();

	const r2 = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": d1.clinicToken,
		},
		body: JSON.stringify({ userId: d1.ownerUserId, pinCode: "123456" }),
	});
	const d2 = await r2.json();

	console.log("2. Launching browser with Edge...");
	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	await page.addInitScript(({ cToken, sToken }) => {
		localStorage.setItem("dente_clinic_token", cToken);
		localStorage.setItem("dente_staff_token", sToken);
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_workspace_perspective", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			selectedSpecialty: "therapist",
			onboardingDismissed: true,
		}));
	}, { cToken: d1.clinicToken, sToken: d2.staffToken });

	console.log("3. Navigating to APP_BASE...");
	await page.goto(APP_BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
	console.log("4. Waiting for 3 seconds...");
	await new Promise(r => setTimeout(r, 3000));

	const title = await page.title();
	console.log("PAGE TITLE:", title);

	const out = path.join(process.cwd(), "docs/screenshots/billing_inquisition/test_main.png");
	await page.screenshot({ path: out });
	console.log("SCREENSHOT SAVED:", out, "SIZE:", fs.statSync(out).size);

	await browser.close();
}

run().catch(console.error);
