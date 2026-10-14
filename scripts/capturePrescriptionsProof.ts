import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_DIR = path.resolve(process.cwd(), "docs/proofs/prescriptions");

if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function getAuthTokens() {
	const uniqueId = Date.now();
	const email = `doctor-rx-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[AUTH] Setting up test clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Стоматологии «ДЕНТЕ»",
			email,
			password,
			ownerName: "Д-р Барабаш Сергей Владимирович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup/init failed: ${initRes.status} ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${unlockRes.status} ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	// Create test patient
	const patRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
			"x-dente-staff-token": unlockData.staffToken,
		},
		body: JSON.stringify({
			fullName: "Ковалёв Роман Станиславович",
			phone: "+7 (999) 123-45-67",
			birthDate: "1985-04-12",
		}),
	});
	const patData = patRes.ok ? await patRes.json() : null;

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		userId: initData.ownerUserId,
		patientId: patData?.id || null,
	};
}

async function run() {
	console.log("Acquiring authentic PostgreSQL 18 auth session...");
	const auth = await getAuthTokens();
	console.log(`Authenticated: orgId=${auth.organizationId}, patientId=${auth.patientId}`);

	console.log("Launching Google Chrome via Playwright...");
	const browser = await chromium.launch({
		executablePath: CHROME_PATH,
		headless: true,
	});

	const targets = [
		{
			id: "pc-light",
			filename: "pc-light-1440x900.png",
			viewport: { width: 1440, height: 900 },
			isDark: false,
			isMobile: false,
		},
		{
			id: "pc-dark",
			filename: "pc-dark-1440x900.png",
			viewport: { width: 1440, height: 900 },
			isDark: true,
			isMobile: false,
		},
		{
			id: "mobile-light",
			filename: "mobile-light-390x844.png",
			viewport: { width: 390, height: 844 },
			isDark: false,
			isMobile: true,
		},
		{
			id: "mobile-dark",
			filename: "mobile-dark-390x844.png",
			viewport: { width: 390, height: 844 },
			isDark: true,
			isMobile: true,
		},
	];

	for (const target of targets) {
		console.log(`\nCapturing ${target.id} (${target.filename})...`);
		const context = await browser.newContext({
			viewport: target.viewport,
			colorScheme: target.isDark ? "dark" : "light",
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();

		// Inject valid credentials
		await page.addInitScript(
			({ cToken, sToken, pId, isDark }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
				localStorage.setItem("dente_workspace_perspective", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done" })
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "doctor",
						selectedSpecialty: "therapist",
						selectedPatientId: pId,
						onboardingDismissed: true,
					})
				);
			},
			{
				cToken: auth.clinicToken,
				sToken: auth.staffToken,
				pId: auth.patientId,
				isDark: target.isDark,
			}
		);

		await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(3000);

		// Apply theme class
		await page.evaluate((isDark) => {
			document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
		}, target.isDark);

		// Dispatch open-prescriptions event with express medication ID
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:open-prescriptions", {
					detail: { medicationId: "amoxiclav_875_125" },
				})
			);
		});

		// Wait for prescription modal dialog to open
		await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
		await page.waitForTimeout(1000);

		// Click on first express preset button: "После хирургии / периодонтита"
		const expressBtn = page.locator('button:has-text("После хирургии / периодонтита")');
		if ((await expressBtn.count()) > 0) {
			await expressBtn.first().click();
			await page.waitForTimeout(800);
		}

		// On mobile-dark, switch to preview tab so we see the full Form 107-1/u blank with QR-code
		if (target.isMobile && target.isDark) {
			const previewTab = page.locator('button:has-text("Предпросмотр бланка")');
			if ((await previewTab.count()) > 0) {
				await previewTab.first().click();
				await page.waitForTimeout(1000);
			}
		}

		// Allow QR code SVG and fonts to render
		await page.waitForTimeout(1500);

		const outPath = path.join(TARGET_DIR, target.filename);
		await page.screenshot({ path: outPath, fullPage: false });

		const stat = fs.statSync(outPath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
		console.log(`Saved: ${outPath}`);
		console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB (bytes: ${stat.size}), MD5: ${hash}`);

		await context.close();
	}

	await browser.close();
	console.log("\nAll 4 visual proof screenshots captured successfully!");
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
