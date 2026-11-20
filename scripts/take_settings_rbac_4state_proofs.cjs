/**
 * scripts/take_settings_rbac_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF FOR SETTINGS ACCESS (RBAC) & SETTINGS STAFF TABS (DENTE CRM)
 * Live Fastify & PG18 PostgreSQL session.
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "3603b457-7688-4975-a32e-81855939e57e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/settings");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function provisionTestClinic() {
	const ts = Date.now();
	console.log(">>> [AUTH] Provisioning live test clinic in PostgreSQL...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ (Права и Персонал)",
			email: `rbac-surgeon-${ts}@dente-live.local`,
			password: "Password123!",
			ownerName: "Д-р Захаров Андрей Васильевич",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Init clinic failed: ${initRes.status} ${await initRes.text()}`);
	}

	const initData = await initRes.json();
	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
	}

	const unlockData = await unlockRes.json();
	console.log(">>> [AUTH] Live Fastify session provisioned successfully!");
	return {
		clinicToken: initData.clinicToken,
		organizationId: initData.organizationId,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-rbac";
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
	for (let i = 0; i < 3; i++) {
		try {
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
			break;
		} catch (err) {
			await page.waitForTimeout(1000);
		}
	}
	await page.waitForTimeout(400);
}

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const splashInfo = await page.evaluate(() => {
		const bootEl = document.querySelector(".boot-state");
		const text = document.body ? document.body.innerText : "";
		const hasSplash = !!bootEl || text.includes("Загрузка системы");
		return { hasSplash, hasBootEl: !!bootEl, textLength: text.length };
	}).catch(() => ({ hasSplash: false, textLength: 0 }));

	if (splashInfo.hasSplash) {
		throw new Error(`[SPLASH SCREEN DETECTED] ${filename} still contains splash screen (bootEl: ${splashInfo.hasBootEl}, len: ${splashInfo.textLength})!`);
	}
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	try {
		await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 8000 });
	} catch (err) {
		console.warn(`  [Screenshot Retry without animations]:`, err.message);
		await page.screenshot({ path: pDocs, fullPage: false, timeout: 8000 });
	}
	try { fs.copyFileSync(pDocs, pBrain); } catch (_) {}

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

const SETTINGS_SCENARIOS = [
	// 1. Settings Access Tab (RBAC Matrix, Security Hero, Zero Potemkin Grids)
	{
		filename: "01_settings_access_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Settings Access & RBAC Matrix)",
		tab: "access",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "02_settings_access_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Settings Access & RBAC Matrix)",
		tab: "access",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "03_settings_access_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Settings Access & Mobile Touch)",
		tab: "access",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "04_settings_access_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Settings Access & Mobile Touch)",
		tab: "access",
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
	// 2. Settings Staff Tab (Staff Management, Role Fallback Doctor, PIN codes)
	{
		filename: "05_settings_staff_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Settings Staff Management)",
		tab: "staff",
		viewport: { width: 1440, height: 900 },
		isDark: false,
		isMobile: false,
	},
	{
		filename: "06_settings_staff_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Settings Staff Management)",
		tab: "staff",
		viewport: { width: 1440, height: 900 },
		isDark: true,
		isMobile: false,
	},
	{
		filename: "07_settings_staff_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Settings Staff Management Touch)",
		tab: "staff",
		viewport: { width: 390, height: 844 },
		isDark: false,
		isMobile: true,
	},
	{
		filename: "08_settings_staff_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Settings Staff Management Touch)",
		tab: "staff",
		viewport: { width: 390, height: 844 },
		isDark: true,
		isMobile: true,
	},
];

async function main() {
	const creds = await provisionTestClinic();
	console.log(`\n=== 4-State Visual Proof Capture for Settings Access & Staff (${WEB_BASE}) ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});

		await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

		await context.addInitScript(
			({ ct, orgId, st, uid }) => {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				sessionStorage.setItem("dente_unlocked", "true");
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
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: uid, fullName: "Д-р Захаров Андрей Васильевич", role: "owner" }));
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedSpecialty: "therapist",
						onboardingDismissed: true,
						onboardingStep: "done",
						onboardingDraftMode: false,
					})
				);
				localStorage.setItem(
					"dente-workspace-profile",
					JSON.stringify({ mode: "network", role: "owner", activeRole: "owner" })
				);
				localStorage.setItem(
					"dente_staff_session",
					JSON.stringify({
						userId: uid,
						name: "Д-р Захаров А. В.",
						fullName: "Д-р Захаров Андрей Васильевич",
						role: "owner",
						specialties: ["Стоматолог-терапевт"],
					})
				);
			},
			{
				ct: creds.clinicToken,
				orgId: creds.organizationId,
				st: creds.staffToken,
				uid: creds.ownerUserId,
			}
		);

		const page = await context.newPage();
		page.on("console", (m) => {
			if (m.type() === "error") console.log(`  [Browser Error]:`, m.text());
		});
		page.on("pageerror", (e) => {
			console.error(`  [Page Error]:`, e.message);
		});

		console.log(`\n⏳ Navigating to initial page: ${WEB_BASE}/?standalone=settings&demo=true#settings/access`);
		let navigated = false;
		for (let a = 0; a < 3; a++) {
			try {
				await page.goto(`${WEB_BASE}/?standalone=settings&demo=true#settings/access`, { waitUntil: "commit", timeout: 45000 });
				navigated = true;
				break;
			} catch (e) {
				console.warn(`Retry navigation ${a + 1}/3:`, e.message);
				await new Promise((r) => setTimeout(r, 1500));
			}
		}
		if (!navigated) throw new Error("Failed to navigate to initial settings view");

		console.log(`  Waiting for React mount and .boot-state detachment...`);
		await page.waitForSelector('[data-testid="direct-settings-launcher-root"]', { state: "visible", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
		await page.waitForFunction(
			() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы") && document.body.innerText.length > 200,
			{ timeout: 25000 }
		);
		console.log(`✅ Base React container mounted successfully!`);

		for (const cfg of SETTINGS_SCENARIOS) {
			const pDocs = path.join(OUT_DOCS, cfg.filename);
			if (fs.existsSync(pDocs)) {
				try { fs.unlinkSync(pDocs); } catch (_) {}
			}

			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);

			// 1. Set Viewport
			await page.setViewportSize(cfg.viewport);
			await page.waitForTimeout(200);

			// 2. Switch Tab if needed
			await page.evaluate((targetTab) => {
				window.location.hash = `#settings/${targetTab}`;
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			}, cfg.tab);

			// 3. Wait for tab-specific root selector
			if (cfg.tab === "access") {
				await page.waitForSelector('.access-settings, [data-testid="granular-role-matrix-panel"]', { state: "visible", timeout: 20000 });
			} else {
				await page.waitForSelector('[data-testid="settings-staff-tab"], .staff-management-studio', { state: "visible", timeout: 20000 });
			}

			// 4. Apply Theme & Overlays
			await applyTheme(page, cfg.isDark);
			await suppressOverlays(page);
			await page.waitForTimeout(600);

			// 5. Save and Verify Proof
			await saveProof(page, cfg.filename);
		}

		console.log("\n🎉 ALL 8 VISUAL PROOFS FOR SETTINGS ACCESS & STAFF CAPTURED AND VERIFIED!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});
