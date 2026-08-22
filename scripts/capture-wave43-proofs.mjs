import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("Browser not found!");
	process.exit(1);
}

const outDir = "C:/Clinic_MVP/dental-crm/apps/web/screenshots/wave43";
if (!existsSync(outDir)) {
	mkdirSync(outDir, { recursive: true });
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const states = [
	{ name: "pc_light", width: 1440, height: 900, theme: "light", isMobile: false },
	{ name: "pc_dark", width: 1440, height: 900, theme: "dark", isMobile: false },
	{ name: "mobile_light", width: 390, height: 844, theme: "light", isMobile: true },
	{ name: "mobile_dark", width: 390, height: 844, theme: "dark", isMobile: true },
];

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(300);
}

for (const state of states) {
	const context = await browser.newContext({
		viewport: { width: state.width, height: state.height },
		isMobile: state.isMobile,
		hasTouch: state.isMobile,
		deviceScaleFactor: 2,
	});
	const page = await context.newPage();

	// Inject authentication and bypass onboarding
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
		localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			selectedSpecialty: "therapist",
			selectedPatientId: "PAT-001",
			onboardingDismissed: true,
		}));
	});

	try {
		// 1. Shift View
		await page.goto("http://127.0.0.1:5173/#shift", { waitUntil: "domcontentloaded", timeout: 10000 });
		await page.waitForTimeout(1000);
		await applyTheme(page, state.theme);

		await page.screenshot({
			path: path.join(outDir, `shift_${state.name}.png`),
			fullPage: false,
		});
		console.log(`Captured shift_${state.name}.png`);

		// 2. Schedule View
		await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 10000 });
		await page.waitForTimeout(1000);
		await applyTheme(page, state.theme);

		await page.screenshot({
			path: path.join(outDir, `schedule_${state.name}.png`),
			fullPage: false,
		});
		console.log(`Captured schedule_${state.name}.png`);

		// 3. Visit View / Odontogram
		await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 10000 });
		await page.waitForTimeout(1000);
		await applyTheme(page, state.theme);

		await page.screenshot({
			path: path.join(outDir, `visit_${state.name}.png`),
			fullPage: false,
		});
		console.log(`Captured visit_${state.name}.png`);

		// 4. Documents View
		await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 10000 });
		await page.waitForTimeout(1000);
		await applyTheme(page, state.theme);

		await page.screenshot({
			path: path.join(outDir, `documents_${state.name}.png`),
			fullPage: false,
		});
		console.log(`Captured documents_${state.name}.png`);
	} catch (err) {
		console.error(`Error in state ${state.name}:`, err);
	} finally {
		await context.close();
	}
}

await browser.close();
console.log("Wave 43 visual capture completed successfully.");
