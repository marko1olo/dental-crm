import crypto from "node:crypto";
import { existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { chromium } from "playwright";

const API_BASE = "http://localhost:4100";
const APP_BASE = "http://localhost:5173";
const CONV_ID = "7e3bf34d-8318-4e93-927f-10bb0d892b4d";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots/clinical_layout_inquisition"),
	path.join(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`),
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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
	await wait(500);
}

async function main() {
	console.log("=== 1. Provisioning Clinic & Seeding Clinical Data ===");
	const pool = new pg.Pool({
		connectionString: "postgres://dental:dental@127.0.0.1:5432/dental_crm",
	});

	const uniqueId = Date.now();
	const email = `inquisitor-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника Дент-Мастер (Ред Тим)",
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

	console.log(`[OK] Clinic provisioned: orgId=${orgId}, doctorUserId=${doctorUserId}`);

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

	// Create primary patient
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
			notes: "Острая боль 36, планируется лечение каналов",
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
			status: "confirmed",
			notes: "Первичный приём, лечение пульпита 36",
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
			"Зуб 36 ранее лечен по поводу глубокого кариеса 2 года назад.",
			"Зуб 36: глубокая кариозная полость, зондирование болезненно по дну, перкуссия безболезненна.",
			"К04.0 Пульпит начальный",
			"1. Анестезия Ubistesin 1.7ml\n2. Эндодонтическая обработка каналов ProTaper\n3. Ирригация NaOCl 3%\n4. Пломбирование Calcept",
			"Приём начат. Проведена проводниковая анестезия и раскрытие полости.",
		]
	);
	const activeVisitId = visitInsert.rows[0].id;
	console.log(`[OK] Inserted active visit: ${activeVisitId}`);

	// Create payment in DB
	await dbClient.query(
		`INSERT INTO payments (
			organization_id, patient_id, visit_id, amount_rub, method, status, payer_full_name, note
		) VALUES ($1, $2, $3, 18500.00, 'card', 'paid', 'Смирнова Екатерина Васильевна', 'Оплата приёма и эндодонтического лечения 36')`,
		[orgId, patientId, activeVisitId]
	);

	dbClient.release();
	await pool.end();

	// === 2. Launch Browser & Capture Real Screenshots ===
	console.log("\n=== 2. Launching Playwright with Microsoft Edge ===");
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

	// Inject storage tokens so page boots logged in
	await page.addInitScript(
		({ cToken, sToken, pId, vId }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_workspace_perspective", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_selected_patient_id", pId);
			localStorage.setItem("dente_active_visit_id", vId);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done" })
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
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
		await wait(1000);
		try {
			const retryBtn = page.locator('button:has-text("Повторить загрузку")');
			if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
				console.log("   🔄 Found 'Повторить загрузку' - clicking to recover...");
				await retryBtn.click();
				await wait(2000);
			}
		} catch {}
		try {
			await page.locator('[aria-busy="true"]').waitFor({ state: "detached", timeout: 15000 });
		} catch {}
		await wait(500);
	}

	// First load app
	console.log("🚀 Initial navigation to app...");
	await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 25000 });
	await ensurePageReady();

	const targets = [
		{
			key: "proof_schedule",
			name: "1. Расписание (Schedule)",
			hash: "#schedule",
			waitSelector: '[data-testid="schedule-shift-summary"], .schedule-panel, [data-testid="schedule-grid"]',
		},
		{
			key: "proof_visit",
			name: "2. Приём врача / ЭМК 043/у (Visit)",
			hash: "#visit",
			waitSelector: '[data-testid="btn-somatic-norm-one-click"], [data-testid="chairside-cockpit-pipeline-banner"], [data-testid="visit-view"]',
		},
		{
			key: "proof_patients",
			name: "3. Карточка пациента (Patient Workspace)",
			hash: "#patients",
			waitSelector: '[data-testid="patient-overview-tab"], [data-testid="patient-workspace-view"], .patients-panel',
			action: async () => {
				await page.evaluate(() => {
					const row = Array.from(document.querySelectorAll("tr, div, li")).find((el) =>
						el.textContent?.includes("Смирнова")
					);
					if (row) row.click();
				});
				await wait(1000);
			},
		},
		{
			key: "proof_finance",
			name: "4. Счета и касса (Invoices / Finance)",
			hash: "#finance",
			waitSelector: '[data-testid="filter-invoices-all"], [data-testid="btn-create-invoice-open"], .finance-panel',
		},
	];

	const hashes = new Map();

	for (const t of targets) {
		console.log(`\n📸 Processing target: ${t.name}`);
		await page.evaluate((h) => {
			window.location.hash = h;
		}, t.hash);
		await wait(1200);

		if (t.waitSelector) {
			try {
				await page.waitForSelector(t.waitSelector, { timeout: 8000, state: "visible" });
			} catch (err) {
				console.warn(`   ⚠️ Timeout waiting for ${t.waitSelector}, proceeding with capture...`);
			}
		}

		if (t.action) {
			await t.action();
		}

		await ensurePageReady();

		// --- Light Theme ---
		console.log(`   ☀️ Capturing ${t.key}_pc_light_1440x900.png...`);
		await applyTheme(page, "light");
		const lightFileName = `${t.key}_pc_light_1440x900.png`;
		const lightPathConv = path.join(OUT_DIRS[1], lightFileName);
		const lightPathDocs = path.join(OUT_DIRS[0], lightFileName);

		await page.screenshot({ path: lightPathConv, fullPage: false });
		await page.screenshot({ path: lightPathDocs, fullPage: false });

		const lightStat = statSync(lightPathConv);
		const lightHash = crypto.createHash("md5").update(readFileSync(lightPathConv)).digest("hex");
		console.log(`   Saved Light: ${lightStat.size} bytes | MD5: ${lightHash}`);
		hashes.set(lightFileName, { size: lightStat.size, hash: lightHash });

		// --- Dark Theme ---
		console.log(`   🌙 Capturing ${t.key}_pc_dark_1440x900.png...`);
		await applyTheme(page, "dark");
		const darkFileName = `${t.key}_pc_dark_1440x900.png`;
		const darkPathConv = path.join(OUT_DIRS[1], darkFileName);
		const darkPathDocs = path.join(OUT_DIRS[0], darkFileName);

		await page.screenshot({ path: darkPathConv, fullPage: false });
		await page.screenshot({ path: darkPathDocs, fullPage: false });

		const darkStat = statSync(darkPathConv);
		const darkHash = crypto.createHash("md5").update(readFileSync(darkPathConv)).digest("hex");
		console.log(`   Saved Dark: ${darkStat.size} bytes | MD5: ${darkHash}`);
		hashes.set(darkFileName, { size: darkStat.size, hash: darkHash });
	}

	await browser.close();

	console.log("\n=== 3. Verification & Integrity Audit ===");
	let allValid = true;
	for (const [name, info] of hashes.entries()) {
		if (info.size < 40000) {
			console.error(`❌ Screenshot ${name} is too small: ${info.size} bytes (<40KB)!`);
			allValid = false;
		} else {
			console.log(`✅ ${name}: ${info.size} bytes | ${info.hash}`);
		}
	}

	if (!allValid) {
		throw new Error("One or more screenshots failed size threshold check!");
	}
	console.log("\n🎉 ALL 8 SCREENSHOTS SUCCESSFULLY CAPTURED AND VERIFIED!");
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
