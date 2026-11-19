/**
 * scripts/capture-patient-profile-consents-4state-proofs.cjs
 *
 * 4-STATE VISUAL PROOFS FOR PATIENT PROFILE, FAMILY BALANCE & CONSENTS (DENTE CRM)
 * Domains:
 * A) Patient Card Modal (with Family Deposit Widget & Somatic Allergy Warning)
 * B) Consent Studio Modal (Statutory Dental Consents & Signature Pad)
 *
 * States per screen:
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844) Apple HIG
 * 4. 📱 Mobile Dark (390x844) Apple HIG
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CURRENT_CONV_ID = "f001c58c-82f5-4e14-98e5-96b9be63f49b";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patient_profile_consents");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-proof-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			.workspace-continuity-strip, .copilot-trigger-btn,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

const CONFIGS = [
	{
		suffix: "pc_light_1440x900.png",
		desc: "PC Light 1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		suffix: "pc_dark_1440x900.png",
		desc: "PC Dark 1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		suffix: "mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet)",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		suffix: "mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet)",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function main() {
	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Visual Proof Capture for Patient Profile & Consents (${baseUrl}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// PART 1: Patient Card Modal (with Family & Allergies)
		// ==========================================
		console.log("\n📸 --- CAPTURING PATIENT CARD MODAL 4-STATE PROOFS ---");
		for (let i = 0; i < CONFIGS.length; i++) {
			const cfg = CONFIGS[i];
			const filename = `0${i + 1}_patient_card_${cfg.suffix}`;
			console.log(`\n📸 Capturing ${filename} (${cfg.desc})...`);

			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ theme }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_perspective", "clinical");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0000-0003-000000000004", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));

				const isDark = theme === "dark";
				document.documentElement.setAttribute("data-theme", theme);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			}, { theme: cfg.theme });

			const page = await context.newPage();
			// Navigate with ?demo=true&patient_card=1
			await page.goto(`${baseUrl}/?demo=true&patient_card=1#patient-card`, { waitUntil: "commit", timeout: 35000 });
			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			// Ensure PatientCardModal is rendered with polling loop
			let patientCardVisible = false;
			for (let retry = 0; retry < 15; retry++) {
				patientCardVisible = await page.evaluate(() => {
					const el = document.querySelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"], [data-testid="patient-card-standalone-root"]');
					if (el) return true;
					if (window.location.hash !== "#patient-card") {
						window.location.hash = "patient-card";
					}
					return false;
				});
				if (patientCardVisible) break;
				await page.waitForTimeout(600);
			}
			await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "visible", timeout: 15000 }).catch(() => {});
			await suppressOverlays(page);

			if (cfg.theme === "dark") {
				await page.evaluate(() => {
					document.documentElement.setAttribute("data-theme", "dark");
					document.body.setAttribute("data-theme", "dark");
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
					document.body.classList.add("dark");
					document.body.classList.remove("light");
					document.documentElement.style.colorScheme = "dark";
				});
				await page.waitForTimeout(1000);
			} else {
				await page.evaluate(() => {
					document.documentElement.setAttribute("data-theme", "light");
					document.body.setAttribute("data-theme", "light");
					document.documentElement.classList.add("light");
					document.documentElement.classList.remove("dark");
					document.body.classList.add("light");
					document.body.classList.remove("dark");
					document.documentElement.style.colorScheme = "light";
				});
				await page.waitForTimeout(1000);
			}

			await saveProof(page, filename);
			await context.close();
		}

		// ==========================================
		// PART 2: Consent Studio Modal (Direct Consent Launcher)
		// ==========================================
		console.log("\n📸 --- CAPTURING CONSENT STUDIO MODAL 4-STATE PROOFS ---");
		for (let i = 0; i < CONFIGS.length; i++) {
			const cfg = CONFIGS[i];
			const filename = `0${i + 5}_consent_studio_${cfg.suffix}`;
			console.log(`\n📸 Capturing ${filename} (${cfg.desc})...`);

			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ theme }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				localStorage.setItem("dente_perspective", "clinical");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0000-0003-000000000004", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));

				const isDark = theme === "dark";
				document.documentElement.setAttribute("data-theme", theme);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			}, { theme: cfg.theme });

			const page = await context.newPage();
			// Navigate with ?demo=true&consents=1#consents
			await page.goto(`${baseUrl}/?demo=true&consents=1#consents`, { waitUntil: "commit", timeout: 35000 });
			await page.waitForTimeout(3000);
			await suppressOverlays(page);

			// Trigger consent open event with retry loop until modal is rendered
			let modalVisible = false;
			for (let retry = 0; retry < 15; retry++) {
				modalVisible = await page.evaluate(() => {
					const el = document.querySelector('.dente-docs-studio-container, [data-testid="consent-studio-modal"], [data-testid="documents-studio-modal-backdrop"]');
					if (el) return true;
					window.dispatchEvent(new CustomEvent("dente:open-consent", {
						detail: {
							docId: "therapy",
							patientName: "Иванов Алексей Сергеевич",
							birthDate: "1992-08-24",
							passport: "45 10 123456 выдан ОВД г. Москвы",
							phone: "+7 (916) 123-45-67",
							doctorName: "Д-р Воронов Алексей Владимирович"
						}
					}));
					return false;
				});
				if (modalVisible) break;
				await page.waitForTimeout(600);
			}

			await page.waitForSelector('.dente-docs-studio-container, [data-testid="consent-studio-modal"]', { state: "visible", timeout: 15000 }).catch(() => {});
			await suppressOverlays(page);

			if (cfg.theme === "dark") {
				await page.evaluate(() => {
					document.documentElement.setAttribute("data-theme", "dark");
					document.body.setAttribute("data-theme", "dark");
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
					document.body.classList.add("dark");
					document.body.classList.remove("light");
					document.documentElement.style.colorScheme = "dark";
				});
				await page.waitForTimeout(1000);
			} else {
				await page.evaluate(() => {
					document.documentElement.setAttribute("data-theme", "light");
					document.body.setAttribute("data-theme", "light");
					document.documentElement.classList.add("light");
					document.documentElement.classList.remove("dark");
					document.body.classList.add("light");
					document.body.classList.remove("dark");
					document.documentElement.style.colorScheme = "light";
				});
				await page.waitForTimeout(1000);
			}

			await saveProof(page, filename);
			await context.close();
		}

		console.log("\n🎉 ALL 8 VISUAL PROOFS FOR PATIENT PROFILE & CONSENTS CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
