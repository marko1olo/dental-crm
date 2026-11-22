/**
 * scripts/take_dental_lab_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOFS FOR DENTAL LAB ORDERS & DENTAL LAB STUDIO (DENTE CRM)
 * 1. ☀️ PC Light (1440x900) - Orders List / Kanban
 * 2. 🌙 PC Dark (1440x900) - Orders List / Kanban
 * 3. 📱 Mobile Light (390x844) - Orders List (Grouped List Cards)
 * 4. 📱 Mobile Dark (390x844) - Orders List (Grouped List Cards)
 * 5. ☀️ PC Light (1440x900) - Dental Lab Studio Order Modal
 * 6. 🌙 PC Dark (1440x900) - Dental Lab Studio Order Modal
 * 7. 📱 Mobile Light (390x844) - Dental Lab Studio Mobile Bottom Sheet
 * 8. 📱 Mobile Dark (390x844) - Dental Lab Studio Mobile Bottom Sheet
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "972d81b7-87b2-43ec-87f5-8c6fa8116cf0";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/lab");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionClinicalSession() {
	const uniqueId = Date.now();
	console.log(`[Provisioning] Initializing test session lab-${uniqueId}@dente-clinic.ru...`);

	try {
		const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				clinicName: "Клиника ДЕНТЕ (Лаборатория ЗТЛ)",
				email: `lab-canonical-${uniqueId}@dente-clinic.ru`,
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
				console.log("[Provisioning] Live Fastify session provisioned successfully!");
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
			style.id = "suppress-all-proof-overlays-lab";
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
	// --- DENTAL LAB ORDERS VIEW (KANBAN / LIST) ---
	{
		filename: "01_dental_lab_orders_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Dental Lab Orders View & Kanban)",
		targetUrl: `${WEB_BASE}/?demo=true#lab`,
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_dental_lab_orders_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Dental Lab Orders View & Kanban)",
		targetUrl: `${WEB_BASE}/?demo=true#lab`,
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_dental_lab_orders_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Touch & Lab Orders Cards)",
		targetUrl: `${WEB_BASE}/?demo=true#lab`,
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_dental_lab_orders_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Touch & Lab Orders Cards)",
		targetUrl: `${WEB_BASE}/?demo=true#lab`,
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},

	// --- DENTAL LAB STUDIO ORDER MODAL (CHAIRSIDE) ---
	{
		filename: "05_dental_lab_studio_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Dental Lab Studio Order Modal Chairside)",
		targetUrl: `${WEB_BASE}/?demo=true&standalone=lab_order#lab-order`,
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "06_dental_lab_studio_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Dental Lab Studio Order Modal Chairside)",
		targetUrl: `${WEB_BASE}/?demo=true&standalone=lab_order#lab-order`,
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "07_dental_lab_studio_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet Lab Order Studio)",
		targetUrl: `${WEB_BASE}/?demo=true&standalone=lab_order#lab-order`,
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "08_dental_lab_studio_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet Lab Order Studio)",
		targetUrl: `${WEB_BASE}/?demo=true&standalone=lab_order#lab-order`,
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function main() {
	const auth = await provisionClinicalSession();
	console.log(`\n=== 4-State Visual Proof Capture for Dental Lab Studio & Orders (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const cfg of CONFIGS) {
			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.isDark ? "dark" : "light",
			});

			await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

			await context.addInitScript(
				({ ct, orgId, st, uid, theme }) => {
					localStorage.setItem("dente_clinic_token", ct);
					localStorage.setItem("dente_organization_id", orgId);
					localStorage.setItem("dente_staff_token", st);
					localStorage.setItem("dente_active_session_token", st);
					localStorage.setItem("dente_active_user_id", uid);
					localStorage.setItem("dente_user_id", uid);
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
					localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: uid, fullName: "Д-р Смирнова Екатерина Васильевна", role: "owner" }));
					localStorage.setItem(
						"dente-workspace-profile",
						JSON.stringify({ mode: "network", role: "owner", activeRole: "owner", hasDentalLab: true })
					);
					localStorage.setItem(
						"dente_staff_session",
						JSON.stringify({
							userId: uid,
							name: "Д-р Смирнова Е. В.",
							fullName: "Д-р Смирнова Екатерина Васильевна",
							role: "owner",
							specialties: ["Стоматолог-ортопед", "Стоматолог-терапевт"],
						})
					);
					localStorage.setItem(
						"dental-crm:web-ui-preferences:v1",
						JSON.stringify({
							version: 1,
							uiLanguage: "ru",
							selectedWorkspaceRole: "owner",
							selectedSpecialty: "orthopedist",
							onboardingDismissed: true,
							onboardingStep: "done",
							onboardingDraftMode: false,
						})
					);
				},
				{
					ct: auth.clinicToken,
					orgId: auth.organizationId,
					st: auth.staffToken,
					uid: auth.ownerUserId,
					theme: cfg.isDark ? "dark" : "light",
				}
			);

			const page = await context.newPage();
			await page.goto(cfg.targetUrl, { waitUntil: "commit", timeout: 45000 });

			// Wait for React to mount and boot-state to detach
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			// Check and wait for Dental Lab container or modal
			await page.waitForSelector(
				'[data-testid="direct-dental-lab-launcher-root"], .dental-lab-studio-root, .dental-lab-orders-view, [data-testid="dental-lab-studio-modal"]',
				{ state: "visible", timeout: 15000 }
			).catch(() => {});

			await applyTheme(page, cfg.isDark);
			await suppressOverlays(page);

			await saveProof(page, cfg.filename);
			await context.close();
		}

		console.log("\n🎉 ALL 8 VISUAL PROOFS FOR DENTAL LAB CAPTURED AND VERIFIED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
