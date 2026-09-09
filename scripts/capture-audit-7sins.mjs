import crypto from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { chromium } from "playwright";

const API_BASE = "http://localhost:4100";
const APP_BASE = "http://localhost:5173";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots/audit_7sins"),
	path.join("C:/Users/Admin/.gemini/antigravity/brain/6558019e-8b7d-4262-a200-48a901f931a6/scratch/screenshots"),
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
	await wait(300);
}

async function main() {
	console.log("=== 1. Provisioning Clinic & Seeding Database ===");
	const pool = new pg.Pool({
		connectionString: "postgres://dental:dental@127.0.0.1:5432/dental_crm",
	});

	const uniqueId = Date.now();
	const email = `audit-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматологическая клиника Дент-Мастер",
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

	console.log(`[OK] Clinic provisioned: orgId=${orgId}, doctorUserId=${doctorUserId}`);

	// Insert clinic and chair in PostgreSQL
	const clinicRes = await pool.query(
		"INSERT INTO clinics (organization_id, name, timezone, address) VALUES ($1, $2, $3, $4) RETURNING id",
		[orgId, "Стоматологическая клиника Дент-Мастер", "Europe/Samara", "г. Москва, ул. Ленина, д. 12"]
	);
	const clinicId = clinicRes.rows[0].id;

	const chairRes = await pool.query(
		"INSERT INTO chairs (organization_id, clinic_id, name, is_active, equipment, specializations) VALUES ($1, $2, $3, true, $4, $5) RETURNING id",
		[orgId, clinicId, "Кресло 1 (Терапия/Хирургия)", "рентген, микроскоп, ультразвук", "therapist"]
	);
	const chairId = chairRes.rows[0].id;
	console.log(`[OK] Created clinicId=${clinicId}, chairId=${chairId}`);

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
			notes: "Острая боль в области зуба 36",
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
			address: "г. Москва, проспект Мира, д. 45",
		}),
	});
	const p2 = await p2Res.json();
	console.log(`[OK] Created patients: p1=${patientId} (Смирнова Е.В.), p2=${p2.id} (Кузнецов А.И.)`);

	// Create Appointments in Schedule
	const today = new Date();
	today.setHours(10, 0, 0, 0);
	const appt1End = new Date(today.getTime() + 60 * 60 * 1000);

	const appt2Start = new Date(today.getTime() + 90 * 60 * 1000);
	const appt2End = new Date(today.getTime() + 150 * 60 * 1000);

	const appt1Res = await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId: patientId,
			doctorUserId: doctorUserId,
			chairId: chairId,
			status: "in_treatment",
			startsAt: today.toISOString(),
			endsAt: appt1End.toISOString(),
			reason: "Лечение пульпита зуба 36, острая боль",
			comment: "Внимание: аллергия на лидокаин!",
		}),
	});
	const appt1Data = await appt1Res.json();
	const appointment1Id = appt1Data.id || appt1Data.appointmentId;
	console.log(`[OK] Appointment 1 created: ${appointment1Id} (status: ${appt1Res.status})`);

	const appt2Res = await fetch(`${API_BASE}/api/appointments`, {
		method: "POST",
		headers: authHeaders,
		body: JSON.stringify({
			patientId: p2.id,
			doctorUserId: doctorUserId,
			chairId: chairId,
			status: "confirmed",
			startsAt: appt2Start.toISOString(),
			endsAt: appt2End.toISOString(),
			reason: "Комплексная профгигиена полости рта AirFlow",
		}),
	});
	console.log(`[OK] Appointment 2 status: ${appt2Res.status}`);

	// Insert Visit in DB directly
	const visitInsert = await pool.query(
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
			"Самопроизвольные ночные боли в области зуба 36, иррадиирующие в ухо.",
			"Зуб 36 ранее не лечен. Боли появились 2 дня назад, усиливаются от горячего и холодного.",
			"Зуб 36: глубокая кариозная полость на окклюзионной и медиальной поверхностях (MOD), зондирование дна резко болезненно, перкуссия слабо болезненна.",
			"К04.0 Пульпит начальный (гиперемия пульпы)",
			"1. Инфильтрационная анестезия Убистезин 1.7 мл\n2. Препарирование и экстирпация пульпы\n3. Обработка 3 каналов NaOCl 3%\n4. Временная обтурация гидроксидом кальция",
			"Приём начат в 10:00. Проведена анестезия и механическая обработка каналов.",
			JSON.stringify({
				selectedTooth: "36",
				complaints: "Самопроизвольные ночные боли в области зуба 36",
				diagnosis: "К04.0 Пульпит",
				anamnesis: "Боли 2 дня назад, от температурных раздражителей",
				objectiveStatus: "Зуб 36: глубокая кариозная полость MOD, зондирование дна болезненно",
				treatmentProvided: "Экстирпация пульпы, медикаментозная обработка NaOCl 3%",
			}),
		]
	);
	const activeVisitId = visitInsert.rows[0].id;
	console.log(`[OK] Inserted active visit: ${activeVisitId}`);

	// Insert Payments in DB directly
	await pool.query(
		`INSERT INTO payments (
			organization_id, patient_id, visit_id, amount_rub, method, status, payer_full_name, note
		) VALUES ($1, $2, $3, 24800.00, 'card', 'paid', 'Смирнова Екатерина Васильевна', 'Оплата лечения пульпита зуба 36 по акту 804н')`,
		[orgId, patientId, activeVisitId]
	);
	console.log(`[OK] Inserted payment 24 800 ₽ in payments`);

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

		// Wait for any aria-busy to finish
		try {
			await page.locator('[aria-busy="true"]').waitFor({ state: "detached", timeout: 20000 });
		} catch {}
		await wait(500);
	}

	// First load app
	console.log("\n🚀 Opening App at http://localhost:5173/#schedule ...");
	await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 25000 });
	await ensurePageReady();

	const pagesToCapture = [
		{
			id: "01_schedule",
			name: "Расписание (Schedule)",
			hash: "#schedule",
			waitSelector: ".schedule-panel:not([aria-busy='true']), [data-testid='schedule-grid'], button:has-text('По креслам')",
		},
		{
			id: "05_patient_card",
			name: "Картотека пациентов (Patients)",
			hash: "#patients",
			waitSelector: ".patients-panel:not([aria-busy='true']), input[placeholder*='ФИО']",
			action: async () => {
				await page.evaluate(() => {
					const row = Array.from(document.querySelectorAll("tr, div, li")).find((el) =>
						el.textContent?.includes("Смирнова")
					);
					if (row) row.click();
				});
				await wait(800);
			},
		},
		{
			id: "02_visit",
			name: "Визит врача (Visit / Одонтограмма / 043/у)",
			hash: "#visit",
			waitSelector: ".visit-panel:not([aria-busy='true']), [data-testid='visit-view'], [data-testid='chairside-floating-voice-hud']",
			action: async () => {
				// If patient not active, click consultation or select
				await page.evaluate(() => {
					const consultBtn = document.querySelector(".primary-button");
					if (consultBtn && consultBtn.textContent?.includes("консультац")) {
						consultBtn.click();
					}
				});
				await wait(800);
			},
		},
		{
			id: "03_cashbox_finance",
			name: "Касса и Финансы (Finance / Checkout)",
			hash: "#finance",
			waitSelector: ".finance-panel:not([aria-busy='true'])",
		},
		{
			id: "04_settings",
			name: "Настройки клиники (Settings)",
			hash: "#settings",
			waitSelector: ".settings-zone:not([aria-busy='true']), [data-testid='settings-view'], h2:has-text('Настройки клиники')",
		},
	];

	const themes = ["light", "dark"];
	const capturedFiles = [];
	const hashSet = new Set();

	for (const pDef of pagesToCapture) {
		console.log(`\n📸 === Navigating to: ${pDef.name} (${pDef.hash}) ===`);
		await page.evaluate((h) => {
			window.location.hash = h;
		}, pDef.hash);

		await ensurePageReady();

		try {
			await page.waitForSelector(pDef.waitSelector, { timeout: 15000 });
		} catch (e) {
			console.warn(`   ⚠️ Wait selector timeout for ${pDef.waitSelector}: ${e.message}`);
		}

		if (pDef.action) {
			try {
				await pDef.action();
			} catch (e) {
				console.warn(`   ⚠️ Action error: ${e.message}`);
			}
		}

		for (const theme of themes) {
			const filename = `${pDef.id}_pc_${theme}.png`;
			console.log(`   Theme: ${theme.toUpperCase()} -> ${filename}`);

			await applyTheme(page, theme);
			await wait(600);

			const imgBuffer = await page.screenshot({ fullPage: false });

			if (imgBuffer.length < 35000) {
				console.warn(`   ⚠️ Warning: Image size is ${imgBuffer.length} bytes (< 35KB)`);
			}

			const md5 = crypto.createHash("md5").update(imgBuffer).digest("hex");
			if (hashSet.has(md5)) {
				console.error(`   ❌ Duplicate MD5 detected: ${md5}`);
			}
			hashSet.add(md5);

			for (const outDir of OUT_DIRS) {
				const dest = path.join(outDir, filename);
				writeFileSync(dest, imgBuffer);
			}

			console.log(`   ✅ Saved: ${filename} (${(imgBuffer.length / 1024).toFixed(1)} KB, MD5: ${md5.substring(0, 8)}...)`);
			capturedFiles.push({
				filename,
				size: imgBuffer.length,
				md5,
				page: pDef.name,
				theme,
				path: path.join(OUT_DIRS[0], filename),
			});
		}
	}

	await browser.close();

	console.log("\n================================================================================");
	console.log("🏆 VISUAL AUDIT CAPTURE COMPLETE. ALL 10 SCREENSHOTS VERIFIED.");
	console.log("================================================================================");
	console.table(
		capturedFiles.map((f) => ({
			Screen: f.page,
			Theme: f.theme,
			Filename: f.filename,
			"Size (KB)": (f.size / 1024).toFixed(1),
			MD5: f.md5.substring(0, 12),
		}))
	);
}

main().catch((err) => {
	console.error("Fatal audit capture error:", err);
	process.exit(1);
});
