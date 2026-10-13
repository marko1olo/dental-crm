import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const TARGET_DIRS = [
	path.join(process.cwd(), "docs/screenshots/patients"),
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\02ca4f27-d05e-49ea-9abf-11ee98628610",
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\2d41233f-cb42-451b-b625-8a85401ad490",
];

for (const dir of TARGET_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
	return chromium.launch(launchOptions);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionClinic() {
	const uid = Date.now();
	const email = `patients-audit-${uid}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Setting up fresh clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Дент-Мастер (Аудит Картотеки)",
			email,
			password,
			ownerName: "Д-р Барабаш С.В.",
			ownerPin,
		}),
	});
	if (!initRes.ok) throw new Error(`Init failed: HTTP ${initRes.status} ${await initRes.text()}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});
	if (!unlockRes.ok) throw new Error(`Unlock failed: HTTP ${unlockRes.status} ${await unlockRes.text()}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
	};
}

async function seedPatients(auth) {
	console.log(`[SEED] Seeding patient Morozova I.V. with critical allergies and safety profile...`);
	const pat1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": auth.clinicToken,
			"x-dente-staff-token": auth.staffToken,
		},
		body: JSON.stringify({
			fullName: "Морозова Ирина Викторовна",
			phone: "+7 (903) 555-66-77",
			birthDate: "1985-04-12",
			notes: "Аллергия на артикаин и пенициллин. Принимает варфарин. Имплантирован кардиостимулятор (ЭКС).",
		}),
	});
	if (!pat1Res.ok) throw new Error(`Create pat1 failed: ${await pat1Res.text()}`);
	const pat1 = await pat1Res.json();

	// Update administrative profile with SNILS, INN, and explicit safety profile
	await fetch(`${API_BASE}/api/patients/${pat1.id}/administrative-profile`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": auth.clinicToken,
			"x-dente-staff-token": auth.staffToken,
		},
		body: JSON.stringify({
			snils: "112-233-445 95",
			taxpayerInn: "770123456789",
			insurancePolicyNumber: "1234567890123456",
			registrationAddress: "г. Самара, ул. Куйбышева, д. 10",
			residentialAddress: "г. Самара, ул. Куйбышева, д. 10, кв. 14",
			clinicalSafetyProfile: {
				hasArticaineAllergy: true,
				hasPenicillinAllergy: true,
				takesAnticoagulants: true,
				hasPacemakerExs: true,
				pregnancyTrimester: "none",
			},
		}),
	});

	// Seed second patient
	await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": auth.clinicToken,
			"x-dente-staff-token": auth.staffToken,
		},
		body: JSON.stringify({
			fullName: "Кузнецов Алексей Сергеевич",
			phone: "+7 (912) 345-67-89",
			birthDate: "1992-08-20",
			notes: "Соматически здоров. Аллергоанамнез не отягощен.",
		}),
	});

	return pat1.id;
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(400);
}

function distributeScreenshot(srcPath, filename) {
	const buf = readFileSync(srcPath);
	const md5 = crypto.createHash("md5").update(buf).digest("hex");
	const sizeKb = (buf.length / 1024).toFixed(1);

	for (const dir of TARGET_DIRS) {
		const dest = path.join(dir, filename);
		if (dest !== srcPath) {
			copyFileSync(srcPath, dest);
		}
	}
	console.log(`[PROOF] Saved ${filename} | Size: ${sizeKb} KB | MD5: ${md5}`);
	return { filename, sizeKb, md5, path: srcPath };
}

async function run() {
	console.log(`[START] Capturing 6 Patients Domain Screenshots...`);
	const auth = await provisionClinic();
	const pat1Id = await seedPatients(auth);

	const browser = await getBrowser();
	const results = [];

	try {
		for (const theme of ["light", "dark"]) {
			console.log(`\n=== THEME: ${theme.toUpperCase()} ===`);
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
				colorScheme: theme,
			});
			const page = await context.newPage();

			// Init scripts
			await page.addInitScript(({ cToken, sToken, thm, pId }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", thm);
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
					dismissed: true,
					step: "done",
				}));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					selectedPatientId: pId,
					onboardingDismissed: true,
				}));
			}, { cToken: auth.clinicToken, sToken: auth.staffToken, thm: theme, pId: pat1Id });

			await page.goto(`${APP_BASE}/#patients`, { waitUntil: "domcontentloaded", timeout: 20000 });
			await page.waitForSelector(".patients-panel", { state: "visible", timeout: 30000 });
			await wait(1500);
			await applyTheme(page, theme);
			await wait(800);

			// 1. Select patient Morozova
			const patientItem = page.locator(`text=Морозова Ирина Викторовна`).first();
			if (await patientItem.isVisible()) {
				await patientItem.click();
				await wait(1000);
			}

			// Capture 1: Registry PC (clean view with Morozova selected)
			const regFilename = `patients_registry_pc_${theme}.png`;
			const regPath = path.join(TARGET_DIRS[0], regFilename);
			await page.screenshot({ path: regPath, fullPage: false });
			results.push(distributeScreenshot(regPath, regFilename));

			// Capture 2: Allergy Safety Banner PC (open protocol drawer to show detailed stop factors)
			const toggleDrawerBtn = page.locator('button:has-text("Протокол безопасности")').first();
			if (await toggleDrawerBtn.isVisible()) {
				await toggleDrawerBtn.click();
				await wait(600);
			}
			const bannerFilename = `patient_allergy_safety_banner_pc_${theme}.png`;
			const bannerPath = path.join(TARGET_DIRS[0], bannerFilename);
			await page.screenshot({ path: bannerPath, fullPage: false });
			results.push(distributeScreenshot(bannerPath, bannerFilename));

			// Capture 3: Patient Detail Modal PC
			// Open PatientCardModal via row menu "Паспортная карточка"
			const rowMoreBtn = page.locator(".patient-row-more-btn").first();
			if (await rowMoreBtn.isVisible()) {
				await rowMoreBtn.click();
				await wait(400);
				const cardMenuItem = page.locator('button:has-text("Паспортная карточка")').first();
				if (await cardMenuItem.isVisible()) {
					await cardMenuItem.click();
				}
			}
			await page.waitForSelector('[data-testid="patient-card-modal"]', {
				state: "visible",
				timeout: 10000,
			});
			await wait(800);

			const modalFilename = `patient_detail_modal_pc_${theme}.png`;
			const modalPath = path.join(TARGET_DIRS[0], modalFilename);
			await page.screenshot({ path: modalPath, fullPage: false });
			results.push(distributeScreenshot(modalPath, modalFilename));

			await context.close();
		}
	} finally {
		await browser.close();
	}

	console.log(`\n✅ ALL 6 SCREENSHOTS CAPTURED SUCCESSFULLY:`);
	console.table(results);
}

run().catch((err) => {
	console.error(`[FATAL] Error capturing screenshots:`, err);
	process.exit(1);
});
