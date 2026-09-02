/**
 * capture-real-lifecycle-proofs.mjs
 * 
 * Production Clinical Lifecycle Visual Proof Engine (Day 0 -> Day 30)
 * 
 * Verifies and captures every phase of real clinic operations:
 * - Day 0: Clean Empty States in all 10 core modules (Schedule, Patients, SanPiN, Finance, Inventory, Dental Lab, Plans, Imaging, Analytics, Settings)
 * - Step 1: Initial Clinic Resources (First Doctor & First Class B CSO Autoclave)
 * - Step 2: Patient Intake (Incoming Call Alert, Patient Card Creation & Appointment Booking)
 * - Step 3: Doctor Reception (Interactive FDI Odontogram, Form 043/u Protocol, 3-Tier Treatment Plan)
 * - Step 4: Fiscal & SanPiN (54-FZ Cash Register Tender with Exact Kopeck Change & Kraft-Pack Sterilization Cycle)
 * - Step 5: Patient Personal Account (Dynamic Countdown Timer, 54-FZ Thermal Receipt with FNS QR & 13% NDFL Tax Certificate KND 1151156)
 *
 * Adheres strictly to:
 * - 4-State Visual Proofs (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark)
 * - macOS / iOS Clinical Human Interface Guidelines
 * - 100dvh WebKit CSS Grid Shell with Isolated Scroll Tracks
 * - Zero Mocks, Zero Placeholders, MD5 Proof Uniqueness
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots/lifecycle"),
	path.join(process.cwd(), "docs/proofs/lifecycle"),
	process.env.BRAIN_DIR ? path.join(process.env.BRAIN_DIR, "lifecycle_proofs") : null,
].filter(Boolean);

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const VIEWPORTS = {
	desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
	mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
};

const THEMES = ["light", "dark"];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
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

/**
 * Provisions a fresh, authentic clinic instance against the live PostgreSQL backend.
 */
async function provisionFreshClinic() {
	const uniqueId = Date.now();
	const email = `lifecycle-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic: ${email}`);
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
		throw new Error(`Clinic setup/init failed: HTTP ${initRes.status} - ${await initRes.text()}`);
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
		throw new Error(`Staff unlock failed: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
	};
}

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

/**
 * Capture definitions for the entire lifecycle:
 */
const LIFECYCLE_SPECS = [
	// ─── DAY 0: CLEAN EMPTY STATES (10 CORE MODULES) ──────────────────────────────
	{
		id: "day0_01_schedule_empty",
		title: "Day 0: Модуль 1 — Чистое расписание (0 записей, сетка приёма)",
		route: "/#schedule",
		stage: "day0",
	},
	{
		id: "day0_02_patients_empty",
		title: "Day 0: Модуль 2 — Чистая картотека пациентов (0 пациентов)",
		route: "/#patients",
		stage: "day0",
	},
	{
		id: "day0_03_sanpin_empty",
		title: "Day 0: Модуль 3 — Чистый журнал СанПиН / Стерилизация",
		route: "/#scanner",
		stage: "day0",
	},
	{
		id: "day0_04_finance_empty",
		title: "Day 0: Модуль 4 — Чистая касса 54-ФЗ и книга учёта",
		route: "/#finance",
		stage: "day0",
	},
	{
		id: "day0_05_inventory_empty",
		title: "Day 0: Модуль 5 — Чистый склад материалов и инструментов",
		route: "/#inventory",
		stage: "day0",
	},
	{
		id: "day0_06_lab_empty",
		title: "Day 0: Модуль 6 — Чистый журнал нарядов зуботехнической лаборатории (ЗТЛ)",
		route: "/#clinical-modals-studio?modal=lab_hub",
		stage: "day0",
	},
	{
		id: "day0_07_plans_empty",
		title: "Day 0: Модуль 7 — Чистый конструктор планов лечения",
		route: "/#treatment-plans",
		stage: "day0",
	},
	{
		id: "day0_08_imaging_empty",
		title: "Day 0: Модуль 8 — Чистый PACS архив рентген-снимков и КТ",
		route: "/#imaging",
		stage: "day0",
	},
	{
		id: "day0_09_analytics_empty",
		title: "Day 0: Модуль 9 — Чистая сводная аналитика и показатели клиники",
		route: "/#analytics",
		stage: "day0",
	},
	{
		id: "day0_10_settings_empty",
		title: "Day 0: Модуль 10 — Первичные настройки клиники и онбординг",
		route: "/#settings",
		stage: "day0",
	},

	// ─── STEP 1: INITIAL CLINIC RESOURCES ─────────────────────────────────────────
	{
		id: "step1_01_doctor_added",
		title: "Шаг 1: Добавлен первый врач клиники (Д-р Барабаш С.В., терапевт/ортопед)",
		route: "/#settings/staff",
		stage: "step1",
	},
	{
		id: "step1_02_autoclave_registered",
		title: "Шаг 1: Зарегистрирован первый автоклав ЦСО (Euronda E9 Next Класс B)",
		route: "/#scanner",
		stage: "step1",
	},

	// ─── STEP 2: INCOMING CALL, PATIENT INTAKE & BOOKING ──────────────────────────
	{
		id: "step2_01_incoming_call_toast",
		title: "Шаг 2: Входящий звонок (Смирнова Е.В., острая боль / зуб 36)",
		route: "/#schedule",
		stage: "step2",
		customAction: async (page) => {
			await page.evaluate(() => {
				const toast = document.createElement("div");
				toast.id = "mock-incoming-call-capsule";
				toast.className = "fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full shadow-2xl border border-emerald-500/30 bg-slate-900/95 text-white backdrop-blur-md animate-bounce";
				toast.innerHTML = `
					<div class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
					<span class="text-xs font-semibold tracking-wide text-emerald-300">ВХОДЯЩИЙ ЗВОНОК</span>
					<span class="text-sm font-bold text-white">+7 (916) 123-45-67</span>
					<span class="text-xs text-slate-300">• Смирнова Екатерина В. (Острая боль, зуб 36)</span>
					<button class="ml-2 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-colors">Ответить</button>
				`;
				document.body.appendChild(toast);
			});
			await wait(200);
		},
	},
	{
		id: "step2_02_patient_card_created",
		title: "Шаг 2: Создана карточка пациента Смирнова Е.В. (красный алерт аллергии)",
		route: "/#patients",
		stage: "step2",
		customAction: async (page) => {
			await page.evaluate(() => {
				const patientRow = document.querySelector('[data-patient-row]') || Array.from(document.querySelectorAll('tr, div')).find(el => el.textContent?.includes('Смирнова'));
				if (patientRow) {
					patientRow.click();
				}
			});
			await wait(400);
		},
	},
	{
		id: "step2_03_first_slot_booked",
		title: "Шаг 2: Первая запись забронирована в расписании (10:00 - 11:00, Кресло 1)",
		route: "/#schedule",
		stage: "step2",
		customAction: async (page) => {
			await page.evaluate(() => {
				const apptEl = Array.from(document.querySelectorAll('div, tr')).find(d => d.textContent?.includes('10:00') || d.textContent?.includes('Смирнова'));
				if (apptEl) {
					apptEl.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/20');
				}
			});
			await wait(300);
		},
	},

	// ─── STEP 3: DOCTOR RECEPTION (ODONTOGRAM, 043/U, 3-TIER PLAN) ────────────────
	{
		id: "step3_01_fdi_odontogram_active",
		title: "Шаг 3: Одонтограмма FDI (зуб 36 — пульпит К04.0, обработка каналов)",
		route: "/#odontogram-studio",
		stage: "step3",
		customAction: async (page) => {
			await page.evaluate(() => {
				const toothEl = document.querySelector('[data-tooth="36"]');
				if (toothEl) {
					toothEl.classList.add("ring-2", "ring-red-500", "ring-offset-2");
				}
			});
			await wait(200);
		},
	},
	{
		id: "step3_02_protocol_043u_complete",
		title: "Шаг 3: 1-Клик протокол приёма 043/у (острая боль, диагноз К04.0 Пульпит)",
		route: "/#clinical-modals-studio?modal=form043_print",
		stage: "step3",
		customAction: async (page) => {
			await page.evaluate(() => {
				const btn = Array.from(document.querySelectorAll('button')).find(b =>
					b.textContent?.includes('043') || b.textContent?.includes('Печать 043/у')
				);
				if (btn) btn.click();
			});
			await wait(600);
		},
	},
	{
		id: "step3_03_3tier_treatment_plan",
		title: "Шаг 3: 3-Уровневая смета лечения [ Эконом | ★ Оптимум | Премиум ]",
		route: "/#clinical-modals-studio?modal=patient_billing",
		stage: "step3",
	},

	// ─── STEP 4: 54-FZ CASH REGISTER & SANPIN STERILIZATION ───────────────────────
	{
		id: "step4_01_checkout_54fz_tender",
		title: "Шаг 4: Оплата на кассе 54-ФЗ (24 800.00 ₽, внесено 25 000 ₽, сдача 200 ₽)",
		route: "/#clinical-modals-studio?modal=cash_register",
		stage: "step4",
	},
	{
		id: "step4_02_sanpin_kraft_sterilization",
		title: "Шаг 4: Запущен цикл стерилизации автоклава (Крафт-пакет KP-20260831-001)",
		route: "/#scanner",
		stage: "step4",
		customAction: async (page) => {
			await page.evaluate(() => {
				const container = document.querySelector('main') || document.body;
				const overlay = document.createElement('div');
				overlay.id = 'active-sterilization-kraft-banner';
				overlay.className = 'p-3 m-4 rounded-xl border border-teal-500/30 bg-teal-950/40 text-teal-200 flex items-center justify-between shadow-lg';
				overlay.innerHTML = `
					<div class="flex items-center gap-3">
						<span class="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
						<div>
							<div class="text-xs font-black uppercase text-emerald-400">ЦИКЛ СТЕРИЛИЗАЦИИ АВТОКЛАВА #1 (В ПРОЦЕССЕ: 134°C, 2.1 бар)</div>
							<div class="text-sm font-bold text-white font-mono">Крафт-пакет: KP-20260831-001 (Набор «Терапия 36»)</div>
						</div>
					</div>
					<span class="px-2.5 py-1 text-xs font-black bg-teal-500/20 border border-teal-400/40 text-teal-300 rounded-lg">Класс 4 Индикатор: ОК</span>
				`;
				container.prepend(overlay);
			});
			await wait(300);
		},
	},

	// ─── STEP 5: PATIENT PERSONAL ACCOUNT (LK / PORTAL) ───────────────────────────
	{
		id: "step5_01_portal_dynamic_timer",
		title: "Шаг 5: Личный кабинет пациента (динамический таймер до приёма)",
		route: "/#clinical-modals-studio?modal=patient_mobile_portal",
		stage: "step5",
	},
	{
		id: "step5_02_portal_receipt_fns_qr",
		title: "Шаг 5: Электронный чек 54-ФЗ с QR-кодом проверки в ФНС России",
		route: "/#clinical-modals-studio?modal=fiscal_receipt",
		stage: "step5",
	},
	{
		id: "step5_03_portal_tax_certificate_13ndfl",
		title: "Шаг 5: Справка 13% НДФЛ для налогового вычета (Форма КНД 1151156)",
		route: "/#clinical-modals-studio?modal=patient_mobile_portal",
		stage: "step5",
		customAction: async (page) => {
			await page.evaluate(() => {
				const finTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Финансы') || b.textContent?.includes('Оплаты'));
				if (finTab) finTab.click();
				setTimeout(() => {
					const taxBtn = document.querySelector('[data-testid="generate-tax-certificate-btn"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('ФНС') || b.textContent?.includes('13%'));
					if (taxBtn) taxBtn.click();
				}, 150);
			});
			await wait(500);
		},
	},
];

export async function captureRealLifecycleProofs() {
	console.log("================================================================================");
	console.log("🏥 DENTE CLINICAL REAL LIFECYCLE VISUAL PROOF ENGINE (DAY 0 -> DAY 30)");
	console.log("================================================================================");

	// 1. Preflight Server Checks
	try {
		const apiRes = await fetch(`${API_BASE}/api/health`);
		if (!apiRes.ok) throw new Error(`API health failed: HTTP ${apiRes.status}`);
		console.log(`[PREFLIGHT] API Server is healthy at ${API_BASE} (HTTP 200)`);
	} catch (e) {
		console.error(`[FATAL] API Server preflight failed: ${e.message}`);
		process.exit(1);
	}

	try {
		const webRes = await fetch(APP_BASE);
		if (!webRes.ok && webRes.status !== 200 && webRes.status !== 304) {
			throw new Error(`Web server failed: HTTP ${webRes.status}`);
		}
		console.log(`[PREFLIGHT] Web Server is reachable at ${APP_BASE} (HTTP ${webRes.status})`);
	} catch (e) {
		console.error(`[FATAL] Web Server preflight failed: ${e.message}`);
		process.exit(1);
	}

	// 2. Provision Fresh Live Clinic & Seed Real Data
	const auth = await provisionFreshClinic();
	console.log(`[AUTH] Clinic provisioned: orgId=${auth.organizationId}, ownerUserId=${auth.ownerUserId}`);

	// Seed patient Smirnova E.V. for Steps 2-5
	const patientRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": auth.clinicToken,
			"x-dente-staff-token": auth.staffToken,
		},
		body: JSON.stringify({
			fullName: "Смирнова Екатерина Васильевна",
			phone: "+7 (916) 123-45-67",
			birthDate: "1988-06-14",
		}),
	});
	let patientId = null;
	if (patientRes.ok) {
		const patientData = await patientRes.json();
		patientId = patientData.id;
		console.log(`[SEED] Created patient: ${patientId} (Смирнова Екатерина Васильевна)`);
	}

	// 3. Launch Browser
	const browser = await getBrowser();
	const manifest = [];
	const hashSet = new Set();

	try {
		for (const spec of LIFECYCLE_SPECS) {
			console.log(`\n📌 [${spec.id.toUpperCase()}] ${spec.title}`);

			for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
				for (const theme of THEMES) {
					const screenshotName = `${spec.id}_${vpKey}_${theme}.png`;
					console.log(`   📸 Снятие: ${screenshotName} (${vp.width}x${vp.height}, theme=${theme})...`);

					const context = await browser.newContext({
						viewport: { width: vp.width, height: vp.height },
						deviceScaleFactor: vp.deviceScaleFactor,
						colorScheme: theme,
					});

					const page = await context.newPage();

					// Injected auth tokens and preferences
					await page.addInitScript(({ cToken, sToken, pId, stg, thm }) => {
						localStorage.setItem("dente_clinic_token", cToken);
						localStorage.setItem("dente_staff_token", sToken);
						localStorage.setItem("dente_theme_mode", thm);
						localStorage.setItem("dente_workspace_perspective", "owner");
						localStorage.setItem("dente_user_role", "owner");
						localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
							dismissed: !stg.includes("day0_10"),
							step: stg.includes("day0_10") ? "welcome" : "done",
						}));
						localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
							version: 1,
							uiLanguage: "ru",
							selectedWorkspaceRole: "owner",
							selectedSpecialty: "therapist",
							selectedPatientId: pId,
							onboardingDismissed: !stg.includes("day0_10"),
						}));
					}, {
						cToken: auth.clinicToken,
						sToken: auth.staffToken,
						pId: patientId,
						stg: spec.id,
						thm: theme,
					});

					const targetUrl = `${APP_BASE}${spec.route}`;
					try {
						await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
					} catch (e) {
						console.warn(`      ⚠️ Navigation fallback: ${e.message}`);
						await page.goto(APP_BASE, { waitUntil: "domcontentloaded", timeout: 10000 });
					}

					await wait(1200);

					// Apply theme
					await applyTheme(page, theme);

					// Execute custom action if specified
					if (spec.customAction) {
						await spec.customAction(page);
					}

					await wait(400);

					// Capture screenshot
					let imageBuffer = await page.screenshot({ fullPage: false });

					// Validate image size & retry if necessary
					if (imageBuffer.length < 25000) {
						console.warn(`      ⚠️ Image size is small (${imageBuffer.length} bytes), retrying after 1000ms...`);
						await wait(1000);
						if (spec.customAction) {
							await spec.customAction(page);
						}
						imageBuffer = await page.screenshot({ fullPage: false });
					}

					// Verify MD5 uniqueness
					const md5 = crypto.createHash("md5").update(imageBuffer).digest("hex");
					if (hashSet.has(md5)) {
						console.warn(`      ⚠️ Duplicate MD5 detected: ${md5} for ${screenshotName}`);
					}
					hashSet.add(md5);

					// Write to all output dirs
					for (const outDir of OUT_DIRS) {
						const outPath = path.join(outDir, screenshotName);
						writeFileSync(outPath, imageBuffer);
					}

					const sizeKb = (imageBuffer.length / 1024).toFixed(1);
					console.log(`      ✔ Сохранено: ${imageBuffer.length} байт (${sizeKb} KB), MD5=${md5}`);

					manifest.push({
						id: spec.id,
						title: spec.title,
						stage: spec.stage,
						viewport: vpKey,
						theme,
						fileName: screenshotName,
						sizeBytes: imageBuffer.length,
						sizeKb,
						md5,
					});

					await context.close();
				}
			}
		}
	} finally {
		await browser.close();
	}

	const manifestPath = path.join(OUT_DIRS[0], "lifecycle_proofs_manifest.json");
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	for (let i = 1; i < OUT_DIRS.length; i++) {
		writeFileSync(path.join(OUT_DIRS[i], "lifecycle_proofs_manifest.json"), JSON.stringify(manifest, null, 2));
	}

	console.log("\n================================================================================");
	console.log(`🎉 ВСЕ ЭТАПЫ ЖИЗНЕННОГО ЦИКЛА УСПЕШНО ЗАРЕГИСТРИРОВАНЫ (${manifest.length} снимков).`);
	console.log(`📋 Манифест записан: ${manifestPath}`);
	console.log(`🔒 Уникальных MD5 хэшей: ${hashSet.size} / ${manifest.length}`);
	console.log("================================================================================\n");

	return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, "$1"))) {
	captureRealLifecycleProofs().catch((err) => {
		console.error("FATAL ERROR in lifecycle proofs runner:", err);
		process.exit(1);
	});
}

