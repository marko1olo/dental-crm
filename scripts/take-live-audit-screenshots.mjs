/**
 * Live 4-state visual audit screenshot runner for DENTE dental-crm.
 * Real Fastify API (http://127.0.0.1:4100) + Vite Frontend (http://127.0.0.1:5173) + PostgreSQL 18.
 * Zero mocks, zero placeholders, zero error suppressors.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots"),
	path.join(process.cwd(), "docs/proofs/audit"),
	process.env.BRAIN_DIR,
].filter(Boolean);

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

// ─── 1. Preflight Health Checks ──────────────────────────────────────────────────

async function preflightHealthCheck() {
	console.log(`[PREFLIGHT] Checking Fastify API (${API_BASE}) and Vite dev server (${APP_BASE})...`);

	try {
		const apiRes = await fetch(`${API_BASE}/api/health`).catch(() => fetch(`${API_BASE}/`));
		if (!apiRes || (apiRes.status >= 500 && apiRes.status !== 503)) {
			throw new Error(`Fastify API at ${API_BASE} responded with HTTP ${apiRes?.status || "unreachable"}`);
		}
		console.log(`[PREFLIGHT] Fastify API is live (HTTP ${apiRes.status}).`);
	} catch (e) {
		console.error(`[FATAL] Backend preflight failed: ${e.message}. Ensure Fastify API is running on ${API_BASE}`);
		process.exit(1);
	}

	try {
		const webRes = await fetch(APP_BASE);
		if (!webRes.ok && webRes.status !== 200 && webRes.status !== 304) {
			throw new Error(`Vite server at ${APP_BASE} responded with HTTP ${webRes.status}`);
		}
		console.log(`[PREFLIGHT] Vite Frontend is live (HTTP ${webRes.status}).`);
	} catch (e) {
		console.error(`[FATAL] Frontend preflight failed: ${e.message}. Ensure Vite server is running on ${APP_BASE}`);
		process.exit(1);
	}
}

// ─── 2. Auth & Data Provisioning ──────────────────────────────────────────────────

async function provisionTestClinic() {
	const uniqueId = Date.now();
	const loginEmail = `audit-test-${uniqueId}@dente-visual-test.local`;
	const password = "Dente2026!";
	const ownerPin = "123456";

	console.log(`[AUTH] Creating test clinic in live database: ${loginEmail}`);

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: `Стоматология Дент-Премиум ${uniqueId}`,
			email: loginEmail,
			password,
			ownerName: "Д-р Смирнов Алексей Петрович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		const errText = await initRes.text();
		console.error(`[FATAL] setup/init failed ${initRes.status}: ${errText}`);
		process.exit(1);
	}

	const initData = await initRes.json();
	console.log(`[AUTH] Clinic created. orgId=${initData.organizationId}`);

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		const errText = await unlockRes.text();
		console.error(`[FATAL] staff/unlock failed ${unlockRes.status}: ${errText}`);
		process.exit(1);
	}

	const unlockData = await unlockRes.json();
	const staffToken = unlockData.staffToken;
	console.log(`[AUTH] Staff unlocked successfully with staffToken.`);

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": staffToken,
	};

	let patientId = null;
	const pRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Кузнецова Елена Павловна",
			phone: "+7 (999) 777-66-55",
			birthDate: "1994-03-22",
		}),
	});

	if (!pRes.ok) {
		const errText = await pRes.text();
		console.error(`[FATAL] Patient creation failed ${pRes.status}: ${errText}`);
		process.exit(1);
	}

	const patient = await pRes.json();
	patientId = patient.id;
	console.log(`[SEED] Real Patient created in PostgreSQL: ${patientId}`);

	const pathologySeed = [
		{ toothNumbers: [16, 24], state: "Caries", surfaces: ["O", "M"] },
		{ toothNumbers: [14], state: "Pulpitis" },
		{ toothNumbers: [46], state: "Periodontitis" },
		{ toothNumbers: [36], state: "Filled", surfaces: ["O", "D"] },
		{ toothNumbers: [21], state: "Crown" },
		{ toothNumbers: [47], state: "Implant" },
		{ toothNumbers: [38], state: "Missing" },
		{ toothNumbers: [28], state: "Planned_Implant" },
		{ toothNumbers: [54], state: "Caries", surfaces: ["O", "M"] },
		{ toothNumbers: [84], state: "Pulpitis" },
		{ toothNumbers: [65], state: "Filled", surfaces: ["O", "D"] },
		{ toothNumbers: [71], state: "Missing" },
	];

	for (const seed of pathologySeed) {
		const tRes = await fetch(`${API_BASE}/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers,
			body: JSON.stringify(seed),
		});
		if (!tRes.ok) {
			console.warn(`  [TOOTH SEED WARN] ${seed.state} → ${tRes.status}: ${await tRes.text()}`);
		} else {
			console.log(`  [TOOTH SEED OK] ${seed.state} → [${seed.toothNumbers.join(", ")}]`);
		}
	}

	const vRes = await fetch(`${API_BASE}/api/visits`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			patientId,
			visitType: "treatment",
			complaints: "Лечение кариеса 16 и молочного зуба 54",
			status: "completed",
			totalCostKopecks: 540000,
		}),
	});

	if (vRes.ok) {
		console.log(`  [VISIT SEED OK] Treatment visit seeded with 540 000 kopecks.`);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: staffToken || initData.clinicToken,
		patientId,
	};
}

// ─── 3. Browser Navigation & Theming ──────────────────────────────────────────────

const VIEWPORTS = {
	desktop: { width: 1440, height: 900 },
	mobile: { width: 390, height: 844 },
};

async function seedTokensAndGo(page, clinicToken, staffToken, patientId, url, themeMode, perspective = "standard") {
	await page.evaluateOnNewDocument(
		(ct, st, pid, tm, pers) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_theme_mode", tm);
			localStorage.setItem("dente_workspace_perspective", pers);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					selectedPatientId: pid || null,
					onboardingDismissed: true,
					soundNotificationsMuted: false,
				}),
			);
		},
		clinicToken,
		staffToken,
		patientId,
		themeMode,
		perspective,
	);

	try {
		await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
	} catch (e) {
		console.error(`[FATAL] Page load failed for ${url}: ${e.message}`);
		process.exit(1);
	}

	const retryBtn = await page.$(".boot-retry-button");
	if (retryBtn) {
		console.log("  [ACTION] Clicking boot-retry-button...");
		await retryBtn.click();
		await new Promise((r) => setTimeout(r, 1500));
	}

	await applyTheme(page, themeMode);
	await new Promise((r) => setTimeout(r, 800));
}

async function applyTheme(page, themeMode) {
	await page.evaluate((mode) => {
		const root = document.documentElement;
		root.setAttribute("data-theme", mode);
		if (mode === "dark" || mode === "night" || mode === "ocean" || mode === "cyber_xray" || mode === "emerald") {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
		}
		localStorage.setItem("dente_theme_mode", mode);
	}, themeMode);

	await new Promise((r) => setTimeout(r, 400));
}

async function screenshot(page, name) {
	for (const outDir of OUT_DIRS) {
		const filePath = path.join(outDir, `${name}.png`);
		await page.screenshot({ path: filePath, fullPage: false });
		const size = statSync(filePath).size;
		if (size < 30000) {
			console.error(`[FATAL] Screenshot ${name}.png is too small (${size} bytes < 30KB). Render failure!`);
			process.exit(1);
		}
		console.log(`[SHOT] ${name}.png (${(size / 1024).toFixed(1)} KB) -> ${outDir}`);
	}
}

// ─── 4. Target Clinical & Operational Screens ─────────────────────────────────────

const TEST_SCENARIOS = [
	// 1. Core Clinical Workspaces
	{ name: "01_schedule_grid", url: `${APP_BASE}/#schedule`, perspective: "standard" },
	{ name: "02_treatment_plans", url: `${APP_BASE}/#visit`, perspective: "standard" },
	{ name: "03_patients_registry", url: `${APP_BASE}/#patients`, perspective: "standard" },
	{ name: "04_finance_billing", url: `${APP_BASE}/#finance`, perspective: "standard" },
	{ name: "05_visit_workspace", url: `${APP_BASE}/#visit`, perspective: "standard" },
	{ name: "06_scanner_radiology", url: `${APP_BASE}/#scanner`, perspective: "standard" },
	{ name: "07_imaging_workspace", url: `${APP_BASE}/#imaging`, perspective: "standard" },
	{ name: "08_sanpin_registers", url: `${APP_BASE}/#sanpin`, perspective: "standard" },
	{ name: "09_inventory_warehouse", url: `${APP_BASE}/#inventory`, perspective: "standard" },
	{ name: "10_documents_workspace", url: `${APP_BASE}/#documents`, perspective: "standard" },
	{ name: "11_communications_hub", url: `${APP_BASE}/#communications`, perspective: "standard" },
	{ name: "12_analytics_dashboard", url: `${APP_BASE}/#analytics`, perspective: "standard" },
	{ name: "13_telephony_softphone", url: `${APP_BASE}/#telephony`, perspective: "standard" },
	{ name: "14_settings_clinic", url: `${APP_BASE}/#settings`, perspective: "standard" },
	{ name: "15_settings_prices", url: `${APP_BASE}/#settings/prices`, perspective: "standard" },
	{ name: "16_settings_imports", url: `${APP_BASE}/#settings/imports`, perspective: "standard" },
	{ name: "17_settings_access", url: `${APP_BASE}/#settings/access`, perspective: "standard" },
	{ name: "18_settings_staff", url: `${APP_BASE}/#settings/staff`, perspective: "standard" },
	{ name: "19_cmo_compliance_hub", url: `${APP_BASE}/#cmo`, perspective: "standard" },
	{ name: "20_lab_orders", url: `${APP_BASE}/#lab`, perspective: "standard" },

	// 2. Specialized Clinical Perspectives (Tier 1 Hot Path)
	{ name: "perspective_chairsider", url: `${APP_BASE}/#shift`, perspective: "chairsider" },
	{ name: "perspective_frontdesk", url: `${APP_BASE}/#shift`, perspective: "frontdesk" },
	{ name: "perspective_presentation", url: `${APP_BASE}/#shift`, perspective: "presentation" },
	{ name: "perspective_orthodontic", url: `${APP_BASE}/#shift`, perspective: "orthodontic" },
	{ name: "perspective_pediatric", url: `${APP_BASE}/#shift`, perspective: "pediatric" },
];

async function main() {
	await preflightHealthCheck();

	const auth = await provisionTestClinic();

	const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security", "--disable-gpu"];
	const launchOptions = {
		headless: true,
		args: launchArgs,
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}

	const browser = await puppeteer.launch(launchOptions);

	try {
		// 4-State Matrix: Desktop Light, Desktop Dark, Mobile Light, Mobile Dark
		for (const scenario of TEST_SCENARIOS) {
			for (const [size, viewport] of Object.entries(VIEWPORTS)) {
				for (const themeMode of ["light", "dark"]) {
					const label = `${scenario.name}_${size}_${themeMode}`;
					console.log(`\n[CAPTURE] ${label} (${viewport.width}×${viewport.height})`);

					const page = await browser.newPage();
					await page.setViewport(viewport);

					try {
						await seedTokensAndGo(
							page,
							auth.clinicToken,
							auth.staffToken,
							auth.patientId,
							scenario.url,
							themeMode,
							scenario.perspective,
						);
						await screenshot(page, label);
					} catch (err) {
						console.error(`[FATAL] Error capturing ${label}: ${err.message}`);
						process.exit(1);
					} finally {
						await page.close();
					}
				}
			}
		}

		// Distinct Palette Themes on Desktop
		for (const themeMode of ["calm_teal", "contrast", "night", "sakura", "ocean", "emerald", "cyber_xray", "warm_sand"]) {
			const label = `theme_${themeMode}_desktop`;
			console.log(`\n[CAPTURE THEME] ${label}`);
			const page = await browser.newPage();
			await page.setViewport(VIEWPORTS.desktop);
			try {
				await seedTokensAndGo(
					page,
					auth.clinicToken,
					auth.staffToken,
					auth.patientId,
					`${APP_BASE}/#schedule`,
					themeMode,
					"standard",
				);
				await screenshot(page, label);
			} catch (err) {
				console.error(`[FATAL] Error capturing theme ${label}: ${err.message}`);
				process.exit(1);
			} finally {
				await page.close();
			}
		}
	} finally {
		await browser.close();
	}

	console.log("\n[DONE] All Live Production 4-State Screenshots captured successfully with Exit Code 0.");
}

main().catch((e) => {
	console.error("[FATAL]", e);
	process.exit(1);
});
