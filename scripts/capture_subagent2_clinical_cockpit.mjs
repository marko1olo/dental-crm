import crypto from "node:crypto";
import { existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CONV_ID = "b065e485-b508-4b60-aa9e-2b94200be523";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots/subagent2_cockpit"),
	path.join(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`),
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const possibleBrowserPaths = [
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(600);
}

async function main() {
	console.log("=== 1. Provisioning Clinic & Seeding Clinical Data ===");
	const pool = new pg.Pool({
		connectionString: "postgres://dental:dental@127.0.0.1:5432/dental_crm",
	});

	const uniqueId = Date.now();
	const email = `cockpit-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Дент-Мастер (Кокпит)",
			email,
			password,
			ownerName: "Д-р Барабаш С. В.",
			ownerPin,
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Init failed: ${initRes.status} ${await initRes.text()}`);
	}
	const initData = await initRes.json();
	const orgId = initData.organizationId;
	const clinicToken = initData.clinicToken;
	const doctorUserId = initData.ownerUserId;

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({ userId: doctorUserId, pinCode: ownerPin }),
	});
	if (!unlockRes.ok) {
		throw new Error(`Unlock failed: ${unlockRes.status} ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();
	const staffToken = unlockData.staffToken;

	console.log(`[OK] Provisioned: orgId=${orgId}, doctor=${doctorUserId}`);

	const dbClient = await pool.connect();
	await dbClient.query(`SET app.current_tenant = '${orgId}'`);
	await dbClient.query(`SET app.current_organization_id = '${orgId}'`);

	// Create clinic and chair
	const clinicRes = await dbClient.query(
		"INSERT INTO clinics (organization_id, name, timezone, address) VALUES ($1, $2, $3, $4) RETURNING id",
		[orgId, "Клиника Дент-Мастер", "Europe/Moscow", "г. Москва, ул. Ленина, д. 12"]
	);
	const clinicId = clinicRes.rows[0].id;

	const chairRes = await dbClient.query(
		"INSERT INTO chairs (organization_id, clinic_id, name, is_active, equipment, specializations) VALUES ($1, $2, $3, true, $4, $5) RETURNING id",
		[orgId, clinicId, "Кресло 1 (Терапия/Ортопедия)", "микроскоп, физиодиспенсер, визиограф", "therapist"]
	);
	const chairId = chairRes.rows[0].id;

	const authHeaders = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};

	// Create patient with prominent allergy
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			fullName: "Смирнова Екатерина Васильевна",
			phone: "+7 (916) 123-45-67",
			birthDate: "1988-06-14",
			gender: "female",
			address: "г. Москва, ул. Тверская, д. 15",
			allergy: "Лидокаин, пенициллин",
			notes: "Острая боль 36, эндодонтическое лечение",
		}),
	});
	const p1 = await p1Res.json();
	const patientId = p1.id;

	// Create appointment today
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const startTime = `${todayDate}T10:00:00.000Z`;
	const endTime = `${todayDate}T11:00:00.000Z`;

	const apptRes = await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId,
			doctorUserId,
			clinicId,
			chairId,
			startTime,
			endTime,
			status: "in_progress",
			notes: "Приём в кресле прямо сейчас",
		}),
	});
	const apptData = await apptRes.json();
	const appointmentId = apptData.id;

	// Create active visit in PostgreSQL
	const visitInsert = await dbClient.query(
		`INSERT INTO visits (
			organization_id, patient_id, appointment_id,
			status, complaint, anamnesis, objective_status,
			diagnosis, treatment_plan, doctor_summary
		) VALUES (
			$1, $2, $3,
			'draft', $4, $5, $6,
			$7, $8, $9
		) RETURNING id`,
		[
			orgId,
			patientId,
			appointmentId,
			"Самопроизвольные ночные боли в области зуба 36.",
			"Зуб 36 ранее лечен по поводу глубокого кариеса. Аллергия на лидокаин.",
			"Зуб 36: глубокая кариозная полость, зондирование дна болезненно.",
			"K04.0 Пульпит начальный (зуб 36)",
			"1. Анестезия Ubistesin (Артикаин) 1.7ml\n2. Эндодонтическая обработка ProTaper\n3. Временная пломба Calcept",
			"Приём начат. Проведена анестезия артикаином.",
		]
	);
	const activeVisitId = visitInsert.rows[0].id;
	console.log(`[OK] Inserted active visit: ${activeVisitId}`);

	// Create payment in DB
	await dbClient.query(
		`INSERT INTO payments (
			organization_id, patient_id, visit_id, amount_rub, method, status, payer_full_name, note
		) VALUES ($1, $2, $3, 14500.00, 'card', 'paid', 'Смирнова Екатерина Васильевна', 'Оплата приёма 36')`,
		[orgId, patientId, activeVisitId]
	);

	dbClient.release();
	await pool.end();

	// === 2. Launch Browser via Playwright Edge ===
	console.log("\n=== 2. Launching Microsoft Edge Playwright ===");
	let browser;
	try {
		browser = await chromium.launch({
			channel: "msedge",
			headless: true,
			args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});
		console.log("   ✅ Microsoft Edge launched via Playwright channel: msedge");
	} catch (e) {
		console.log("   ⚠️ Fallback using executablePath:", browserExecutable);
		browser = await chromium.launch({
			executablePath: browserExecutable,
			headless: true,
			args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});
	}

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	// Inject auth tokens & setup preferences
	await page.addInitScript(
		({ cToken, sToken, pId, vId }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dental-crm:active-patient-id", pId);
			localStorage.setItem("dental_active_patient_id", pId);
			localStorage.setItem("dental-crm:active-visit-id", vId);
			localStorage.setItem("dental_active_visit_id", vId);
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
			cToken: clinicToken,
			sToken: staffToken,
			pId: patientId,
			vId: activeVisitId,
		}
	);

	async function ensurePageReady() {
		await wait(1200);
		try {
			const retryBtn = page.locator('button:has-text("Повторить загрузку")');
			if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
				await retryBtn.click();
				await wait(2000);
			}
		} catch {}
		try {
			await page.locator('[aria-busy="true"]').waitFor({ state: "detached", timeout: 10000 });
		} catch {}
		await wait(600);
	}

	console.log("🚀 Navigating directly to #visit...");
	await page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await ensurePageReady();

	// Wait for header monolith
	await page.waitForSelector('[data-testid="visit-header-monolith"]', { timeout: 15000 });
	await page.waitForSelector('[data-testid="btn-somatic-norm-one-click"]', { timeout: 10000 });
	console.log("   ✅ Visit header monolith and Clinical Cockpit loaded successfully!");

	// Check header height
	const headerBox = await page.locator('[data-testid="visit-header-monolith"]').boundingBox();
	console.log(`   📏 Clinical Cockpit Height: ${headerBox?.height.toFixed(1)}px (Budget <= 85px)`);

	const generatedScreenshots = [];

	async function captureScreen(fileName, description) {
		console.log(`\n📸 Capturing: ${fileName} - ${description}`);
		const targetPaths = OUT_DIRS.map((d) => path.join(d, fileName));

		await page.screenshot({ path: targetPaths[0], fullPage: false });

		// Mirror to all output directories
		const bytes = readFileSync(targetPaths[0]);
		for (let i = 1; i < targetPaths.length; i++) {
			await page.screenshot({ path: targetPaths[i], fullPage: false });
		}

		const stat = statSync(targetPaths[0]);
		const hash = crypto.createHash("md5").update(bytes).digest("hex");

		console.log(`   ✅ Saved: ${fileName} (${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash.slice(0, 8)})`);
		generatedScreenshots.push({
			file: fileName,
			path: targetPaths[0],
			sizeKb: (stat.size / 1024).toFixed(1),
			hash,
			description,
		});
	}

	// 1. PC Light: Clinical Cockpit
	await applyTheme(page, "light");
	await captureScreen(
		"pc_light_clinical_cockpit.png",
		"Clinical Cockpit (Light Theme, 1440x900): Компактная шапка приёма <=85px, строка пациента, норма, кластер печати >=36px, ЗТЛ, завершение"
	);

	// 2. PC Dark: Clinical Cockpit
	await applyTheme(page, "dark");
	await captureScreen(
		"pc_dark_clinical_cockpit.png",
		"Clinical Cockpit (Dark Theme, 1440x900): Тёмная тема без неонового карнавала, чистый фон, кнопки печати и ЗТЛ"
	);

	// 3. PC Light: More Actions Menu open
	await applyTheme(page, "light");
	const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
	await moreBtn.click();
	await wait(500);
	await page.waitForSelector('[data-testid="visit-header-more-actions-dropdown"]', { timeout: 5000 });
	await captureScreen(
		"pc_light_cockpit_more_menu.png",
		"Clinical Cockpit More Actions Menu (1440x900): Сервисное меню '...' с тихой служебной кнопкой 'Аптечка анти-шок', нарядом ЗТЛ и печатью"
	);

	// Close dropdown
	await moreBtn.click();
	await wait(300);

	// 4. PC Light: Collapsed Sidebar (76px compact rail)
	const collapseBtn = page.locator('.sidebar-collapse-button');
	if (await collapseBtn.isVisible().catch(() => false)) {
		await collapseBtn.click();
		await wait(500);
		await captureScreen(
			"pc_light_sidebar_collapsed.png",
			"Collapsed Sidebar (1440x900): Компактный рельс 76px без обрезков 'bl', центрированные иконки, кнопка разворачивания"
		);
	}

	await browser.close();

	console.log("\n=== SCREENSHOT CAPTURE SUMMARY ===");
	for (const s of generatedScreenshots) {
		console.log(`- ${s.file}: ${s.sizeKb} KB (MD5: ${s.hash}) -> ${s.description}`);
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
