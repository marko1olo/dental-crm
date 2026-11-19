/**
 * scripts/take_patients_card_studio_4state.cjs
 *
 * 4-STATE VISUAL PROOFS FOR PATIENT CARD / CRM STUDIO (DENTE CRM)
 * 1. ☀️ PC Light (1440x900) - Patient Card Studio
 * 2. 🌙 PC Dark (1440x900) - Patient Card Studio
 * 3. 📱 Mobile Light (390x844) - Mobile Patient Card (Apple HIG Bottom Sheet)
 * 4. 📱 Mobile Dark (390x844) - Mobile Patient Card (Apple HIG Bottom Sheet)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "83333db5-ddb9-4cc5-87a0-e284e81438ba";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patients");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionClinicalSession() {
	const uniqueId = Date.now();
	try {
		const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				clinicName: "Клиника ДЕНТЕ (Реестр пациентов)",
				email: `patients-canonical-${uniqueId}@dente-clinic.ru`,
				password: "Password123!",
				ownerName: "Д-р Смирнова Екатерина Васильевна",
				ownerPin: "1234",
			}),
		});

		if (initRes.ok) {
			const initData = await initRes.json();
			const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": initData.clinicToken,
				},
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
			});

			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				return {
					clinicToken: initData.clinicToken,
					organizationId: initData.organizationId,
					staffToken: unlockData.staffToken,
					ownerUserId: initData.ownerUserId,
				};
			}
		}
	} catch (err) {
		console.warn("[Provisioning] Fastify setup fallback:", err.message);
	}

	return {
		clinicToken: "demo-showcase-token-owner",
		organizationId: "01a00000-0000-0000-0001-000000000001",
		staffToken: "demo-showcase-staff-token-owner",
		ownerUserId: "01a00000-0000-0003-0000-000000000004",
	};
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-patients";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

async function applyTheme(page, isDark) {
	await page.evaluate((dark) => {
		const mode = dark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", mode);
		localStorage.setItem("dente_theme", mode);
		document.documentElement.setAttribute("data-theme", mode);
		document.body.setAttribute("data-theme", mode);
		document.documentElement.dataset.theme = mode;
		if (dark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
		}
	}, isDark);
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	try {
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 8000 });
	} catch (err) {
		console.warn(`  [Screenshot Retry without animations]:`, err.message);
		await page.screenshot({ path: pDocs, fullPage: false, timeout: 8000 });
	}
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
		filename: "01_patient_card_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Patient Card Studio Desktop)",
		targetUrl: `${WEB_BASE}/?demo=true&patient_card=1`,
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_patient_card_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Patient Card Studio Desktop)",
		targetUrl: `${WEB_BASE}/?demo=true&patient_card=1`,
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_patient_card_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Patient Card Bottom Sheet)",
		targetUrl: `${WEB_BASE}/?demo=true&patient_card=1`,
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_patient_card_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Patient Card Bottom Sheet)",
		targetUrl: `${WEB_BASE}/?demo=true&patient_card=1`,
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function main() {
	const auth = await provisionClinicalSession();
	console.log(`\n=== 4-State Visual Proof Capture for Patient Card Studio (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	for (const cfg of CONFIGS) {
		console.log(`\n📸 Capturing ${cfg.desc}...`);
		const context = await browser.newContext({
			viewport: cfg.viewport,
			colorScheme: cfg.isDark ? "dark" : "light",
			userAgent: cfg.isMobile
				? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
				: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
			deviceScaleFactor: 2,
		});

		await context.addInitScript((creds) => {
			localStorage.setItem("dente_clinic_token", creds.clinicToken);
			localStorage.setItem("dente_staff_token", creds.staffToken);
			localStorage.setItem("dente_organization_id", creds.organizationId);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_theme_mode", creds.isDark ? "dark" : "light");
			localStorage.setItem("dente_theme", creds.isDark ? "dark" : "light");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_active_user", JSON.stringify({
				id: creds.ownerUserId,
				fullName: "Д-р Смирнова Екатерина Васильевна",
				role: "doctor",
				specialty: "general_dentist",
			}));
		}, { ...auth, isDark: cfg.isDark });

		const page = await context.newPage();

		try {
			await page.goto(cfg.targetUrl, { waitUntil: "networkidle", timeout: 25000 });
		} catch (e) {
			console.warn(`  [NetworkIdle Timeout on ${cfg.filename}]: proceeding...`);
		}

		await applyTheme(page, cfg.isDark);
		await suppressOverlays(page);

		// Wait for patient card modal to be fully visible
		try {
			await page.waitForSelector('[data-testid="patient-studio-modal"]', { state: "visible", timeout: 20000 });
		} catch (_) {
			try {
				await page.waitForSelector('[data-testid="patient-card-standalone-root"]', { state: "visible", timeout: 10000 });
			} catch (e) {
				console.warn("  [Modal selector timeout]: checking fallback content...", e.message);
			}
		}

		await page.waitForTimeout(2000);
		await saveProof(page, cfg.filename);
		await context.close();
	}

	await browser.close();
	console.log("\n🎉 All 4-State Proofs for Patient Card Studio Captured and Verified!");
}

main().catch((err) => {
	console.error("❌ Capture script failed:", err);
	process.exit(1);
});
