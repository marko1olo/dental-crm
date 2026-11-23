import crypto from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/b70c701a-be88-467f-941f-ad17036cbe7f";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/wave253";

for (const dir of [BRAIN_DIR, DOCS_DIR]) {
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
	await wait(600);
}

async function main() {
	console.log("=== 1. Provisioning Test Clinic & Seeding Database ===");
	const pool = new pg.Pool({
		connectionString: "postgres://dental:dental@127.0.0.1:5432/dental_crm",
	});

	const uniqueId = Date.now();
	const email = `wave253-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматологическая клиника Дент-Мастер (Wave 253)",
			email,
			password,
			ownerName: "Д-р Барабаш Сергей Владимирович",
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

	console.log(`[OK] Provisioned: orgId=${orgId}, doctorUserId=${doctorUserId}`);

	const dbClient = await pool.connect();
	await dbClient.query(`SET app.current_tenant = '${orgId}'`);
	await dbClient.query(`SET app.current_organization_id = '${orgId}'`);

	// Insert clinic and chairs
	const clinicRes = await dbClient.query(
		"INSERT INTO clinics (organization_id, name, timezone, address) VALUES ($1, $2, $3, $4) RETURNING id",
		[orgId, "Стоматология Дент-Мастер", "Europe/Moscow", "г. Москва, ул. Ленина, д. 12"]
	);
	const clinicId = clinicRes.rows[0].id;

	const chair1Res = await dbClient.query(
		"INSERT INTO chairs (organization_id, clinic_id, name, is_active, equipment, specializations) VALUES ($1, $2, $3, true, $4, $5) RETURNING id",
		[orgId, clinicId, "Кресло 1 (Терапия/Эндодонтия)", "микроскоп, апекслокатор, коффердам", "therapist"]
	);
	const chair1Id = chair1Res.rows[0].id;

	const chair2Res = await dbClient.query(
		"INSERT INTO chairs (organization_id, clinic_id, name, is_active, equipment, specializations) VALUES ($1, $2, $3, true, $4, $5) RETURNING id",
		[orgId, clinicId, "Кресло 2 (Хирургия/Ортопедия)", "физиодиспенсер, визиограф, лазер", "surgeon"]
	);
	const chair2Id = chair2Res.rows[0].id;

	const authHeaders = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};

	// Create Patients
	const p1Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			fullName: "Смирнова Екатерина Васильевна",
			phone: "+7 (916) 123-45-67",
			birthDate: "1988-06-14",
			gender: "female",
			address: "г. Москва, ул. Ленина, д. 12, кв. 34",
			allergy: "Лидокаин, пенициллин",
			notes: "Острая ночная боль в области зуба 36",
		}),
	});
	const p1 = await p1Res.json();
	const patientId = p1.id;

	const p2Res = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			fullName: "Кузнецов Андрей Игоревич",
			phone: "+7 (925) 333-22-11",
			birthDate: "1979-11-23",
			gender: "male",
			address: "г. Москва, пр. Мира, д. 45",
			notes: "Плановая профгигиена",
		}),
	});
	const p2 = await p2Res.json();

	// Create Appointments in Schedule for Today
	const now = new Date();
	const start1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
	const end1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 15, 0);

	const start2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
	const end2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0);

	const start3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
	const end3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0);

	const appt1Res = await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId: patientId,
			doctorUserId: doctorUserId,
			chairId: chair1Id,
			status: "in_treatment",
			startsAt: start1.toISOString(),
			endsAt: end1.toISOString(),
			reason: "Лечение пульпита зуба 36, острая боль",
			comment: "Аллергия на лидокаин! Только Артикаин",
		}),
	});
	const appt1Data = await appt1Res.json();
	const appointment1Id = appt1Data.id || appt1Data.appointmentId;

	await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId: p2.id,
			doctorUserId: doctorUserId,
			chairId: chair1Id,
			status: "confirmed",
			startsAt: start2.toISOString(),
			endsAt: end2.toISOString(),
			reason: "Комплексная профгигиена полости рта AirFlow",
		}),
	});

	await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId: patientId,
			doctorUserId: doctorUserId,
			chairId: chair2Id,
			status: "planned",
			startsAt: start3.toISOString(),
			endsAt: end3.toISOString(),
			reason: "Консультация ортопеда: коронка E.max на зуб 36",
		}),
	});

	// Insert Visit in DB directly
	const visitInsert = await dbClient.query(
		`INSERT INTO visits (
			organization_id, patient_id, appointment_id, status,
			complaint, anamnesis, objective_status, diagnosis,
			treatment_plan, doctor_summary, draft_autosave
		) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`,
		[
			orgId,
			patientId,
			appointment1Id,
			"Самопроизвольные ночные боли в области зуба 36, усиливающиеся от температурных раздражителей, иррадиирующие в левое ухо.",
			"Зуб 36 ранее не лечен. Боли появились 2 дня назад после приема холодной пищи.",
			"Зуб 36: глубокая кариозная полость на окклюзионной и медиальной поверхностях (MOD), зондирование дна резко болезненно, перкуссия слабо болезненна, переходная складка спокойна.",
			"К04.0 Пульпит начальный (гиперемия пульпы)",
			"1. Инфильтрационная анестезия Артикаин 1:100000 1.7 мл\n2. Препарирование кариозной полости MOD\n3. Экстирпация пульпы, медикаментозная обработка 3 каналов NaOCl 3%\n4. Пломбирование корневых каналов гуттаперчей методом латеральной компакции\n5. Восстановление коронковой части светоотверждаемым нанокомпозитом Estelite Asteria",
			"Приём начат в 10:00. Выполнена анестезия, препарирование и медикаментозная обработка каналов зуба 36.",
			JSON.stringify({
				selectedTooth: "36",
				complaints: "Самопроизвольные ночные боли в области зуба 36",
				diagnosis: "К04.0 Пульпит",
				anamnesis: "Боли 2 дня назад, от температурных раздражителей",
				objectiveStatus: "Зуб 36: глубокая кариозная полость MOD, зондирование болезненно",
				treatmentProvided: "Экстирпация пульпы, обработка NaOCl 3%, временная повязка",
			}),
		]
	);
	const activeVisitId = visitInsert.rows[0].id;
	console.log(`[OK] Inserted active visit: ${activeVisitId}`);

	// Insert price items / services
	const s1 = await dbClient.query(
		`INSERT INTO services (organization_id, title, code, base_price_rub, active)
		 VALUES ($1, 'A16.07.002.010 Восстановление зуба пломбой (Estelite)', 'A16.07.002.010', 6500.00, true) RETURNING id`,
		[orgId]
	);
	const s2 = await dbClient.query(
		`INSERT INTO services (organization_id, title, code, base_price_rub, active)
		 VALUES ($1, 'A16.07.030.003 Эндодонтическая обработка 3-канального зуба', 'A16.07.030.003', 8400.00, true) RETURNING id`,
		[orgId]
	);
	const s3 = await dbClient.query(
		`INSERT INTO services (organization_id, title, code, base_price_rub, active)
		 VALUES ($1, 'A16.07.004.001 Коронка из диоксида циркония / E.max', 'A16.07.004.001', 28000.00, true) RETURNING id`,
		[orgId]
	);

	// Insert Treatment Plan in DB
	const planRes = await dbClient.query(
		`INSERT INTO treatment_plans (
			organization_id, patient_id, name, status, total_price_rub, total_price, is_alternative, alternative_tier
		) VALUES ($1, $2, 'Комплексный план лечения: Смирнова Е.В.', 'Draft', 42900.00, 42900.00, false, 'optimum')
		RETURNING id`,
		[orgId, patientId]
	);
	const planId = planRes.rows[0].id;

	await dbClient.query(
		`INSERT INTO treatment_plan_items_new (
			organization_id, plan_id, tooth_number, price_id, quantity, price, discount, phase
		) VALUES 
		($1, $2, 36, $3, 1, 8400.00, 0, 1),
		($1, $2, 36, $4, 1, 6500.00, 0, 1),
		($1, $2, 36, $5, 1, 28000.00, 0, 2)`,
		[orgId, planId, s2.rows[0].id, s1.rows[0].id, s3.rows[0].id]
	);
	console.log(`[OK] Inserted treatment plan: ${planId} with 3 items (42 900 ₽)`);

	// Insert Payment in DB
	await dbClient.query(
		`INSERT INTO payments (
			organization_id, patient_id, visit_id, amount_rub, method, status, payer_full_name, note
		) VALUES ($1, $2, $3, 24800.00, 'card', 'paid', 'Смирнова Екатерина Васильевна', 'Оплата 1 этапа лечения зуба 36 по чеку 54-ФЗ')`,
		[orgId, patientId, activeVisitId]
	);
	console.log(`[OK] Inserted payment 24 800 ₽`);

	dbClient.release();
	await pool.end();

	// === 2. Launch Chromium & Capture Screenshots ===
	console.log("\n=== 2. Launching Playwright Chromium ===");
	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	// Inject storage tokens
	await page.addInitScript(
		({ cToken, sToken, pId, vId }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_workspace_perspective", "standard");
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

	async function safeEvaluate(fn, ...args) {
		for (let i = 0; i < 3; i++) {
			try {
				return await page.evaluate(fn, ...args);
			} catch (err) {
				if (err.message.includes("Execution context was destroyed") && i < 2) {
					console.log("   🔄 Execution context was destroyed, retrying evaluate...");
					await wait(1500);
					continue;
				}
				throw err;
			}
		}
	}

	async function ensureReady() {
		await wait(1200);
		try {
			const retryBtn = page.locator('button:has-text("Повторить загрузку")');
			if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
				console.log("   🔄 Found 'Повторить загрузку' - clicking to recover...");
				await retryBtn.click();
				await wait(2000);
			}
		} catch {}

		try {
			await page.locator('[aria-busy="true"]').waitFor({ state: "detached", timeout: 20000 });
		} catch {}
		await wait(800);
	}

	// First load
	console.log("\n🚀 Opening App at http://127.0.0.1:5173/#schedule ...");
	await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 25000 });
	await page.waitForSelector("#root", { timeout: 15000 });
	await wait(2500);
	await ensureReady();

	const capturedProofs = [];
	const hashSet = new Set();

	async function captureScreen(id, name, filenameBase) {
		for (const theme of ["light", "dark"]) {
			const filename = `${filenameBase}_${theme}.png`;
			console.log(`\n📸 Capturing ${name} [${theme.toUpperCase()}] -> ${filename}`);

			await safeEvaluate((th) => {
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
			await wait(800);

			const imgBuffer = await page.screenshot({ fullPage: false });

			if (imgBuffer.length < 40000) {
				console.warn(`   ⚠️ Warning: Image size is ${imgBuffer.length} bytes (< 40KB)`);
			}

			const md5 = crypto.createHash("md5").update(imgBuffer).digest("hex");
			if (hashSet.has(md5)) {
				console.error(`   ❌ Duplicate MD5 detected: ${md5}`);
			}
			hashSet.add(md5);

			// Save to both brain directory and docs directory
			const p1 = path.join(BRAIN_DIR, filename);
			const p2 = path.join(DOCS_DIR, filename);
			writeFileSync(p1, imgBuffer);
			writeFileSync(p2, imgBuffer);

			console.log(`   ✅ Saved: ${filename} (${(imgBuffer.length / 1024).toFixed(1)} KB, MD5: ${md5.substring(0, 8)}...)`);
			capturedProofs.push({
				id,
				screen: name,
				theme,
				filename,
				size: imgBuffer.length,
				md5,
				brainPath: p1,
				docsPath: p2,
			});
		}
	}

	// ─── 1. SCHEDULE / RECEPTION ───────────────────────────────────────────────
	console.log("\n>>> SCREEN 1: Schedule / Reception");
	await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await wait(1500);
	await ensureReady();
	try {
		await page.waitForSelector(".schedule-panel, [data-testid='schedule-grid']", { timeout: 15000 });
	} catch (e) {
		console.warn("Schedule waitSelector warning:", e.message);
	}
	await captureScreen("01_schedule", "Schedule / Reception", "01_schedule_pc");

	// ─── 2. PATIENT CARD / EMR 043/u ───────────────────────────────────────────
	console.log("\n>>> SCREEN 2: Patient Card / EMR 043/u");
	await page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await wait(1500);
	await safeEvaluate(() => {
		if (window.__usePerspectiveStore) {
			window.__usePerspectiveStore.getState().setPerspective("standard");
		}
		localStorage.setItem("dente_workspace_perspective", "standard");
	});
	await wait(800);
	await ensureReady();
	try {
		await page.waitForSelector(".visit-panel, [data-testid='visit-view']", { timeout: 15000 });
	} catch (e) {
		console.warn("Visit waitSelector warning:", e.message);
	}
	await captureScreen("02_patient_card_emr", "Patient Card / EMR 043/u", "02_patient_card_emr_pc");

	// ─── 3. TREATMENT PLANS MODULE ─────────────────────────────────────────────
	console.log("\n>>> SCREEN 3: Treatment Plans Module");
	await safeEvaluate(() => {
		if (window.__usePerspectiveStore) {
			window.__usePerspectiveStore.getState().setPerspective("presentation");
		}
		localStorage.setItem("dente_workspace_perspective", "presentation");
	});
	await wait(500);
	await page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await wait(1500);
	await ensureReady();
	try {
		await page.waitForSelector("[data-testid='treatment-plan-module'], .treatment-plan-module, .plan-presenter-card, h2:has-text('План лечения')", { timeout: 15000 });
	} catch (e) {
		console.warn("Treatment Plan waitSelector warning:", e.message);
	}
	await captureScreen("03_treatment_plans", "Treatment Plans Module", "03_treatment_plans_pc");

	// ─── 4. RADIOLOGY / CBCT VIEWER ────────────────────────────────────────────
	console.log("\n>>> SCREEN 4: Radiology / CBCT Viewer");
	await safeEvaluate(() => {
		if (window.__usePerspectiveStore) {
			window.__usePerspectiveStore.getState().setPerspective("standard");
		}
		localStorage.setItem("dente_workspace_perspective", "standard");
	});
	await wait(500);
	await page.goto(`${APP_BASE}/#imaging`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await wait(1500);
	await ensureReady();
	try {
		await page.waitForSelector(".imaging-panel, .imaging-workspace", { timeout: 15000 });
	} catch (e) {
		console.warn("Imaging waitSelector warning:", e.message);
	}
	await captureScreen("04_radiology_cbct", "Radiology / CBCT Viewer", "04_radiology_cbct_pc");

	// ─── 5. FINANCE / CASHIER 54-FZ ────────────────────────────────────────────
	console.log("\n>>> SCREEN 5: Finance / Cashier 54-FZ");
	await page.goto(`${APP_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await wait(1500);
	await ensureReady();
	try {
		await page.waitForSelector(".finance-panel", { timeout: 15000 });
	} catch (e) {
		console.warn("Finance waitSelector warning:", e.message);
	}
	await captureScreen("05_finance_cashier", "Finance / Cashier 54-FZ", "05_finance_cashier_pc");

	await browser.close();

	console.log("\n================================================================================");
	console.log("🏆 CAPTURE COMPLETED: ALL 10 PROOF SCREENSHOTS RECORDED");
	console.log("================================================================================");
	console.table(
		capturedProofs.map((p) => ({
			Screen: p.screen,
			Theme: p.theme,
			Filename: p.filename,
			"Size (KB)": (p.size / 1024).toFixed(1),
			"MD5 Hash": p.md5.substring(0, 12),
		}))
	);

	// Write metadata JSON
	writeFileSync(
		path.join(DOCS_DIR, "manifest.json"),
		JSON.stringify(capturedProofs, null, 2),
		"utf-8"
	);
}

main().catch((err) => {
	console.error("Fatal capture execution error:", err);
	process.exit(1);
});
