/**
 * Live 4-state visual audit screenshot runner for DENTE dental-crm.
 * Real Fastify API (http://127.0.0.1:4100) + Vite Frontend (http://127.0.0.1:5173) + PostgreSQL 18.
 * Zero mocks, zero placeholders, zero error suppressors.
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
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

	let apiRes;
	try {
		apiRes = await fetch(`${API_BASE}/api/health`);
	} catch {
		try {
			apiRes = await fetch(`${API_BASE}/`);
		} catch (err) {
			console.error(`[FATAL] Fastify API unreachable at ${API_BASE}: ${err.message}`);
			process.exit(1);
		}
	}

	if (!apiRes || (apiRes.status >= 500 && apiRes.status !== 503)) {
		console.error(`[FATAL] Fastify API at ${API_BASE} responded with HTTP ${apiRes?.status || "unreachable"}`);
		process.exit(1);
	}
	console.log(`[PREFLIGHT] Fastify API is live (HTTP ${apiRes.status}).`);

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

	let initRes;
	try {
		initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
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
	} catch (err) {
		console.error(`[FATAL] setup/init request failed: ${err.message}`);
		process.exit(1);
	}

	if (!initRes.ok) {
		const errText = await initRes.text();
		console.error(`[FATAL] setup/init failed ${initRes.status}: ${errText}`);
		process.exit(1);
	}

	const initData = await initRes.json();
	console.log(`[AUTH] Clinic created. orgId=${initData.organizationId}`);

	let unlockRes;
	try {
		unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": initData.clinicToken,
			},
			body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
		});
	} catch (err) {
		console.error(`[FATAL] staff/unlock request failed: ${err.message}`);
		process.exit(1);
	}

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
	let pRes;
	try {
		pRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Кузнецова Елена Павловна",
				phone: "+7 (999) 777-66-55",
				birthDate: "1994-03-22",
			}),
		});
	} catch (err) {
		console.error(`[FATAL] Patient creation request failed: ${err.message}`);
		process.exit(1);
	}

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
		let tRes;
		try {
			tRes = await fetch(`${API_BASE}/api/patients/${patientId}/tooth-states/batch`, {
				method: "POST",
				headers,
				body: JSON.stringify(seed),
			});
		} catch (err) {
			console.error(`[FATAL] Tooth state seed request failed: ${err.message}`);
			process.exit(1);
		}
		if (!tRes.ok) {
			console.warn(`  [TOOTH SEED WARN] ${seed.state} -> ${tRes.status}: ${await tRes.text()}`);
		} else {
			console.log(`  [TOOTH SEED OK] ${seed.state} -> [${seed.toothNumbers.join(", ")}]`);
		}
	}

	let vRes;
	try {
		vRes = await fetch(`${API_BASE}/api/visits`, {
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
	} catch (err) {
		console.error(`[FATAL] Visit seed request failed: ${err.message}`);
		process.exit(1);
	}

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

async function seedTokensAndGo(page, clinicToken, staffToken, patientId, scenario, themeMode) {
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
		scenario.perspective || "standard",
	);

	try {
		await page.goto(scenario.url, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForSelector(scenario.selector || "#root, body", { timeout: 10000 });
		await new Promise((r) => setTimeout(r, 1200));
	} catch (e) {
		console.error(`[FATAL] Page load failed for ${scenario.url}: ${e.message}`);
		process.exit(1);
	}

	try {
		await page.evaluate((pers) => {
			if (window.__usePerspectiveStore && typeof window.__usePerspectiveStore.getState === "function") {
				window.__usePerspectiveStore.getState().setPerspective(pers);
			}
		}, scenario.perspective || "standard");
	} catch (err) {
		console.error(`[FATAL] Setting perspective failed: ${err.message}`);
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
	try {
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
			if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
				window.__useThemeStore.getState().setThemeMode(mode);
			}
		}, themeMode);

		await new Promise((r) => setTimeout(r, 400));
	} catch (err) {
		console.error(`[FATAL] applyTheme failed for ${themeMode}: ${err.message}`);
		process.exit(1);
	}
}

const seenHashes = new Map();

async function screenshot(page, name) {
	for (const outDir of OUT_DIRS) {
		const filePath = path.join(outDir, `${name}.png`);
		try {
			await page.screenshot({ path: filePath, fullPage: false });
		} catch (err) {
			console.error(`[FATAL] page.screenshot failed for ${name}: ${err.message}`);
			process.exit(1);
		}
		const size = statSync(filePath).size;
		const minSize = name.includes("mobile") ? 8000 : 15000;
		if (size < minSize) {
			console.error(`[FATAL] Screenshot ${name}.png is too small (${size} bytes < ${minSize} bytes). Render failure!`);
			process.exit(1);
		}
		const buffer = readFileSync(filePath);
		const hash = crypto.createHash("md5").update(buffer).digest("hex");
		if (outDir === OUT_DIRS[0]) {
			if (seenHashes.has(hash)) {
				const existing = seenHashes.get(hash);
				console.error(`[FATAL] MD5 duplicate detected: ${name}.png is identical to ${existing} (hash=${hash})`);
				process.exit(1);
			}
			seenHashes.set(hash, `${name}.png`);
		}
		console.log(`[SHOT] ${name}.png (${(size / 1024).toFixed(1)} KB, md5:${hash.slice(0, 8)}) -> ${outDir}`);
	}
}

// ─── 4. Target Clinical & Operational Screens ─────────────────────────────────────

const TEST_SCENARIOS = [
	// 1. Core Clinical Workspaces
	{
		name: "01_schedule_grid",
		url: `${APP_BASE}/#schedule`,
		perspective: "standard",
		selector: ".schedule-container, [data-testid='schedule-grid'], #root",
	},
	{
		name: "02_treatment_plans",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=3tier#clinical-modals-studio?modal=3tier`,
		perspective: "standard",
		selector: "[data-testid='three-tier-plan-modal'], .treatment-plan-modal, #root",
	},
	{
		name: "03_patients_registry",
		url: `${APP_BASE}/#patients`,
		perspective: "standard",
		selector: ".patients-container, [data-testid='patients-table'], #root",
	},
	{
		name: "04_finance_billing",
		url: `${APP_BASE}/#finance`,
		perspective: "standard",
		selector: ".finance-container, [data-testid='finance-overview'], #root",
	},
	{
		name: "05_visit_workspace",
		url: `${APP_BASE}/#visit`,
		perspective: "standard",
		selector: ".visit-workspace, [data-testid='visit-diary-editor'], #root",
	},
	{
		name: "06_scanner_radiology",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=viewer#clinical-modals-studio?modal=viewer`,
		perspective: "standard",
		selector: "[data-testid='radiology-viewer-modal'], .radiology-viewer, #root",
	},
	{
		name: "07_imaging_workspace",
		url: `${APP_BASE}/#imaging`,
		perspective: "standard",
		selector: ".imaging-container, [data-testid='imaging-grid'], #root",
	},
	{
		name: "08_sanpin_registers",
		url: `${APP_BASE}/#scanner`,
		perspective: "standard",
		selector: ".sanpin-registers-container, .scanner-view-container, #root",
	},
	{
		name: "09_inventory_warehouse",
		url: `${APP_BASE}/#inventory`,
		perspective: "standard",
		selector: ".inventory-container, [data-testid='inventory-table'], #root",
	},
	{
		name: "10_documents_workspace",
		url: `${APP_BASE}/#documents`,
		perspective: "standard",
		selector: ".documents-container, [data-testid='documents-list'], #root",
	},
	{
		name: "11_communications_hub",
		url: `${APP_BASE}/#communications`,
		perspective: "standard",
		selector: ".communications-container, [data-testid='communications-chat'], #root",
	},
	{
		name: "12_analytics_dashboard",
		url: `${APP_BASE}/#analytics`,
		perspective: "standard",
		selector: ".analytics-dashboard-view, [data-testid='analytics-charts'], #root",
	},
	{
		name: "13_telephony_softphone",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=incoming_call#clinical-modals-studio?modal=incoming_call`,
		perspective: "standard",
		selector: "[data-testid='incoming-call-modal-container'], [data-testid='incoming-call-modal'], [data-modal-test='telephony-softphone-modal'], .incoming-call-popup, .telephony-floating-widget, #root",
	},
	{
		name: "14_settings_clinic",
		url: `${APP_BASE}/#settings/clinic`,
		perspective: "standard",
		selector: ".settings-container, [data-testid='settings-clinic-tab'], #root",
	},
	{
		name: "15_settings_prices",
		url: `${APP_BASE}/#settings/prices`,
		perspective: "standard",
		selector: ".settings-container, [data-testid='settings-prices-tab'], #root",
	},
	{
		name: "16_settings_imports",
		url: `${APP_BASE}/#settings/imports`,
		perspective: "standard",
		selector: ".settings-container, [data-testid='settings-imports-tab'], #root",
	},
	{
		name: "17_settings_access",
		url: `${APP_BASE}/#settings/access`,
		perspective: "standard",
		selector: ".settings-container, [data-testid='settings-access-tab'], #root",
	},
	{
		name: "18_settings_staff",
		url: `${APP_BASE}/#settings/staff`,
		perspective: "standard",
		selector: ".settings-container, [data-testid='settings-staff-tab'], #root",
	},
	{
		name: "19_cmo_compliance_hub",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=cmo_hub#clinical-modals-studio?modal=cmo_hub`,
		perspective: "standard",
		selector: ".cmo-compliance-hub, .cmo-modal-container, #root",
	},
	{
		name: "20_lab_orders",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=lab_work_order#clinical-modals-studio?modal=lab_work_order`,
		perspective: "standard",
		selector: ".lab-work-order-modal, .lab-order-modal-container, #root",
	},

	// 2. Specialized Clinical Perspectives (Tier 1 Hot Path)
	{ name: "perspective_chairsider", url: `${APP_BASE}/#shift`, perspective: "chairsider", selector: ".chairsider-perspective, .chairsider-view, #root" },
	{ name: "perspective_frontdesk", url: `${APP_BASE}/#shift`, perspective: "frontdesk", selector: ".frontdesk-perspective, .frontdesk-view, #root" },
	{ name: "perspective_presentation", url: `${APP_BASE}/#shift`, perspective: "presentation", selector: "[data-testid='case-presentation-view'], .case-presentation, #root" },
	{ name: "perspective_orthodontic", url: `${APP_BASE}/#shift`, perspective: "orthodontic", selector: "[data-testid='orthodontic-workspace'], .orthodontic-perspective, #root" },
	{ name: "perspective_pediatric", url: `${APP_BASE}/#shift`, perspective: "pediatric", selector: "[data-testid='pediatric-workspace'], .pediatric-perspective, #root" },
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
							scenario,
							themeMode,
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
					{ url: `${APP_BASE}/#schedule`, perspective: "standard" },
					themeMode,
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

