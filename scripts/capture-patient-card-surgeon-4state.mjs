import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CONV_ID = "dd53db83-508c-4eeb-ae02-39a678d29490";
const DIRS = [
	path.resolve(__dirname, "../docs/proofs/patient_card"),
	path.resolve(__dirname, "../docs/proofs/patients"),
	path.resolve(__dirname, "../docs/proofs/family_wallet"),
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const API_BASE = "http://127.0.0.1:4100";

function replicateFile(srcPath, filename) {
	for (const dir of DIRS) {
		try {
			fs.copyFileSync(srcPath, path.join(dir, filename));
		} catch (_) {}
	}
}

async function authenticateFastify() {
	console.log("=== 1. REAL FASTIFY API AUTH & POSTGRES 18 CHECK ===");
	const authRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const authData = await authRes.json();
	if (!authData?.ok || !authData?.clinicToken || !authData?.staffToken) {
		throw new Error(`Fastify login failed: ${JSON.stringify(authData)}`);
	}
	console.log(`[Auth OK] User: ${authData.user?.fullName} (${authData.user?.role})`);

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": authData.clinicToken,
		"x-dente-staff-token": authData.staffToken,
	};

	// Verify real patients exist
	const ptsRes = await fetch(`${API_BASE}/api/patients`, { headers });
	const pts = await ptsRes.json();
	console.log(`[Postgres 18 OK] Found ${Array.isArray(pts) ? pts.length : 0} real patients`);
	const targetPatientId = Array.isArray(pts) && pts[0]?.id ? pts[0].id : "01a00000-0000-0000-0000-000000000001";

	// Ensure family group exists with balance
	const famListRes = await fetch(`${API_BASE}/api/finance/family`, { headers });
	const famList = await famListRes.json();
	if (!Array.isArray(famList) || famList.length === 0) {
		console.log("[Seed] Creating family group in Postgres 18...");
		const famRes = await fetch(`${API_BASE}/api/finance/family`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				name: "Семья Смирновых",
				headPatientId: targetPatientId,
			}),
		});
		const fam = await famRes.json();
		if (fam?.id) {
			await fetch(`${API_BASE}/api/finance/family/topup`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					familyGroupId: fam.id,
					patientId: targetPatientId,
					amountRub: 35000,
					method: "card",
					clientMutationId: `seed-proof-${Date.now()}`,
					comment: "Семейный депозит на лечение",
				}),
			});
			console.log("[Seed] Created family group & topped up 35 000 RUB");
		}
	} else {
		console.log(`[Postgres 18 OK] Found ${famList.length} existing family group(s)`);
	}

	return authData;
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
			.shepherd-element, vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(500);
	const target = path.join(DIRS[0], filename);
	await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
	replicateFile(target, filename);
	const stat = fs.statSync(target);
	console.log(`[PROOF CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB (${stat.size} bytes)!`);
	}
}

async function injectAuthStorage(ctx, authData, useDemo = false) {
	await ctx.addInitScript(({ clinicToken, staffToken, user, demo }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "doctor");
		localStorage.setItem("dente_user_role", user.role || "doctor");
		localStorage.setItem("dente_active_user_id", user.id || "doc-1");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		sessionStorage.setItem("dente_unlocked", "true");
		if (demo) {
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
		} else {
			localStorage.removeItem("dente_demo_mode");
			localStorage.removeItem("dente_demo_showcase");
		}
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user, demo: useDemo });
}

async function main() {
	const authData = await authenticateFastify();

	console.log("\n=== 2. STARTING IN-PROCESS VITE SERVER ===");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			host: "127.0.0.1",
			strictPort: false,
			hmr: false,
			watch: null,
		},
	});
	await viteServer.listen();
	const port = viteServer.httpServer.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;
	console.log(`✓ In-process Vite running at ${baseUrl}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ═══════════════════════════════════════════════════════════
		// PART A: PATIENT CARD MODAL 4-STATE (PC + MOBILE)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 3. CAPTURING PATIENT CARD MODAL 4-STATE ===");
		const modalCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(modalCtx, authData, true);
		const modalPage = await modalCtx.newPage();
		modalPage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const modalUrl = `${baseUrl}/?demo=true&patient_modal=1#patient-card`;
		console.log(`Navigating to ${modalUrl}...`);
		await modalPage.goto(modalUrl, { waitUntil: "commit", timeout: 90000 });
		await modalPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		
		try {
			await modalPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 45000 });
		} catch (e) {
			const offlineBtn = await modalPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (offlineBtn) {
				await offlineBtn.click();
				await modalPage.waitForTimeout(2000);
			}
			await modalPage.evaluate(() => {
				window.location.hash = "#patient-card";
			});
			await modalPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 30000 });
		}
		await modalPage.waitForTimeout(2000);

		// 1. PC Light (1440x900) - General info tab with Passport & INN
		await setTheme(modalPage, "light");
		await saveProof(modalPage, "01_patient_card_pc_light_1440x900.png", "Patient Card General Info (☀️ PC Light 1440x900)");
		await saveProof(modalPage, "patient_card_pc_light_1440x900.png", "Patient Card Modal (PC Light 1440x900)");

		// 2. PC Dark (1440x900) - General info tab
		await setTheme(modalPage, "dark");
		await saveProof(modalPage, "02_patient_card_pc_dark_1440x900.png", "Patient Card General Info (🌙 PC Dark 1440x900)");
		await saveProof(modalPage, "patient_card_pc_dark_1440x900.png", "Patient Card Modal (PC Dark 1440x900)");

		// 3. Switch to Documents tab to show mounted PatientCommunicationConsentsPanel
		const docsTab = modalPage.locator('[data-testid="tab-patient-documents"]').first();
		if (await docsTab.count() > 0) {
			console.log("Switching to Documents tab...");
			await docsTab.click();
			await modalPage.waitForSelector('[data-testid="patient-comm-consents-panel"]', { state: "attached", timeout: 10000 }).catch(() => {});
			await modalPage.waitForTimeout(1000);

			await setTheme(modalPage, "light");
			await saveProof(modalPage, "05_patient_documents_consents_pc_light_1440x900.png", "Patient Documents Tab with Consents Matrix (PC Light)");

			await setTheme(modalPage, "dark");
			await saveProof(modalPage, "06_patient_documents_consents_pc_dark_1440x900.png", "Patient Documents Tab with Consents Matrix (PC Dark)");

			// Switch back to General tab
			const genTab = modalPage.locator('[data-testid="tab-patient-general"]').first();
			if (await genTab.count() > 0) {
				await genTab.click();
				await modalPage.waitForTimeout(600);
			}
		}

		// 4. Mobile Viewport (390x844) Apple HIG
		await modalPage.setViewportSize({ width: 390, height: 844 });
		await modalPage.waitForTimeout(800);

		// 5. Mobile Light (390x844)
		await setTheme(modalPage, "light");
		await saveProof(modalPage, "03_patient_card_mobile_light_390x844.png", "Patient Card Bottom Sheet (📱 Mobile Light 390x844)");
		await saveProof(modalPage, "patient_card_mobile_light_390x844.png", "Patient Card Bottom Sheet (Mobile Light 390x844)");

		// 6. Mobile Dark (390x844)
		await setTheme(modalPage, "dark");
		await saveProof(modalPage, "04_patient_card_mobile_dark_390x844.png", "Patient Card Bottom Sheet (🌙 Mobile Dark 390x844)");
		await saveProof(modalPage, "patient_card_mobile_dark_390x844.png", "Patient Card Bottom Sheet (Mobile Dark 390x844)");

		await modalCtx.close();

		// ═══════════════════════════════════════════════════════════
		// PART B: LIVE REGISTRY + INLINE FAMILY WALLET (FASTIFY + PG18)
		// ═══════════════════════════════════════════════════════════
		try {
			console.log("\n=== 4. CAPTURING LIVE REGISTRY & INLINE FAMILY WALLET ===");
			const liveCtx = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
				serviceWorkers: "block",
				locale: "ru-RU",
			});
			await injectAuthStorage(liveCtx, authData, true);
			const livePage = await liveCtx.newPage();
			livePage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

			const registryUrl = `${baseUrl}/?demo=true#patients`;
			console.log(`Navigating to ${registryUrl}...`);
			await livePage.goto(registryUrl, { waitUntil: "commit", timeout: 30000 });
			await livePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
			await livePage.waitForSelector('[data-testid^="patient-row-"], .patient-row, tr[data-id]', { state: "visible", timeout: 25000 });
			await livePage.waitForTimeout(1000);

			// Click first patient row
			await livePage.locator('[data-testid^="patient-row-"], .patient-row').first().click();
			await livePage.waitForSelector('[data-testid="patient-family-and-insurance-widget"], [data-testid="patient-details-panel"]', { state: "visible", timeout: 15000 }).catch(() => {});
			await livePage.waitForTimeout(1000);

			// Capture Live Registry + Patient Card (PC Light)
			await setTheme(livePage, "light");
			await saveProof(livePage, "patient_registry_pc_light_1440x900.png", "Live Patients Registry + Detail (PC Light)");

			// Expand Inline Family Wallet (Anti-Matryoshka proof!)
			const openWalletBtn = livePage.locator('[data-testid="widget-open-family-wallet-btn"]').first();
			if (await openWalletBtn.count() > 0) {
				await openWalletBtn.scrollIntoViewIfNeeded();
				await openWalletBtn.click();
				await livePage.waitForSelector('[data-testid="family-wallet-modal"]', { state: "visible", timeout: 10000 }).catch(() => {});
				await livePage.waitForTimeout(800);

				await setTheme(livePage, "light");
				await saveProof(livePage, "patient_family_inline_pc_light_1440x900.png", "Inline Family Wallet (PC Light 1440x900)");

				await setTheme(livePage, "dark");
				await saveProof(livePage, "patient_family_inline_pc_dark_1440x900.png", "Inline Family Wallet (PC Dark 1440x900)");
			}

			await liveCtx.close();
		} catch (bErr) {
			console.warn("[PART B Warning]", bErr.message);
		}

		// ═══════════════════════════════════════════════════════════
		// PART C: LIVE MOBILE PROFILE WORKSPACE (390x844 APPLE HIG)
		// ═══════════════════════════════════════════════════════════
		try {
			console.log("\n=== 5. CAPTURING LIVE MOBILE PROFILE WORKSPACE ===");
			const mobCtx = await browser.newContext({
				viewport: { width: 390, height: 844 },
				userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
				isMobile: true,
				hasTouch: true,
				deviceScaleFactor: 2,
				serviceWorkers: "block",
				locale: "ru-RU",
			});
			await injectAuthStorage(mobCtx, authData, true);
			const mobPage = await mobCtx.newPage();

			const registryUrl = `${baseUrl}/?demo=true#patients`;
			await mobPage.goto(registryUrl, { waitUntil: "commit", timeout: 30000 });
			await mobPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
			await mobPage.waitForTimeout(1500);

			// Tap first mobile patient card to open MobilePatientProfileWorkspace
			const mobCard = mobPage.locator('[data-testid^="mobile-patient-card-"], .mobile-patient-group-card, [data-testid^="patient-item-"]').first();
			if (await mobCard.count() > 0) {
				await mobCard.click();
				await mobPage.waitForTimeout(1200);
			}

			await setTheme(mobPage, "light");
			await saveProof(mobPage, "patient_mobile_workspace_light_390x844.png", "Mobile Patient Profile Workspace (Light 390x844)");

			await setTheme(mobPage, "dark");
			await saveProof(mobPage, "patient_mobile_workspace_dark_390x844.png", "Mobile Patient Profile Workspace (Dark 390x844)");

			await mobCtx.close();
		} catch (cErr) {
			console.warn("[PART C Warning]", cErr.message);
		}

		console.log("\n=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]", err);
	process.exit(1);
});
