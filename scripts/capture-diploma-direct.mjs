import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pediatric";
if (!existsSync(PROOF_DIR)) {
	mkdirSync(PROOF_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const edgeOrChrome = possibleBrowserPaths.find((p) => existsSync(p));

function verifyProof(filePath, label) {
	const stat = statSync(filePath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is too small: ${stat.size} bytes`);
	}
	console.log(`[VERIFIED PROOF] ${path.basename(filePath)} (${stat.size} bytes) -> ${label}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			if (document.body) document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			if (document.body) document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await page.waitForTimeout(400);
}

async function main() {
	console.log("=== CAPTURING BRAVERY DIPLOMA PROOFS DIRECTLY ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: edgeOrChrome,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_offline_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const page = await pcContext.newPage();
		await page.goto("http://127.0.0.1:5173/?demo=true&diploma=1&patientName=Артём+Смирнов#bravery", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2500);

		await page.waitForSelector('[data-testid="pediatric-bravery-diploma-modal"], [data-testid="pediatric-hero-diploma-modal"]', { timeout: 15000 });

		// PC Light Diploma
		await setTheme(page, "light");
		const pcLight = path.join(PROOF_DIR, "05_pediatric_diploma_pc_light_1440x900.png");
		await page.screenshot({ path: pcLight, fullPage: false });
		verifyProof(pcLight, "Bravery Diploma PC Light 1440x900");
		copyFileSync(pcLight, path.join(PROOF_DIR, "pediatric_diploma_pc_light.png"));

		// PC Dark Diploma
		await setTheme(page, "dark");
		const pcDark = path.join(PROOF_DIR, "06_pediatric_diploma_pc_dark_1440x900.png");
		await page.screenshot({ path: pcDark, fullPage: false });
		verifyProof(pcDark, "Bravery Diploma PC Dark 1440x900");
		copyFileSync(pcDark, path.join(PROOF_DIR, "pediatric_diploma_pc_dark.png"));

		// Mobile Light Diploma
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		const mobLight = path.join(PROOF_DIR, "07_pediatric_diploma_mobile_light_390x844.png");
		await page.screenshot({ path: mobLight, fullPage: false });
		verifyProof(mobLight, "Bravery Diploma Mobile Light 390x844");

		// Mobile Dark Diploma
		await setTheme(page, "dark");
		const mobDark = path.join(PROOF_DIR, "08_pediatric_diploma_mobile_dark_390x844.png");
		await page.screenshot({ path: mobDark, fullPage: false });
		verifyProof(mobDark, "Bravery Diploma Mobile Dark 390x844");

		await pcContext.close();
		console.log("=== ALL BRAVERY DIPLOMA PROOFS CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Diploma capture failed:", err);
	process.exit(1);
});
