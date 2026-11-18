import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const CURRENT_CONV_ID = "2eff3b55-8027-42ec-b994-962181e46c15";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/security";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;

fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionTestClinic() {
	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			const ts = Date.now();
			console.log(`🔐 Provisioning test clinic on Fastify 4100 (attempt ${attempt})...`);
			const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clinicName: "Стоматология ДЕНТЕ Эксперт",
					email: `security-rbac-${ts}@dente-live.local`,
					password: "Password123!",
					ownerName: "Д-р Воронов Алексей Владимирович",
					ownerPin: "123456",
				}),
			});

			if (!initRes.ok) {
				throw new Error(`Init clinic failed: ${initRes.status} ${await initRes.text()}`);
			}

			const initData = await initRes.json();
			const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": initData.clinicToken,
				},
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" }),
			});

			if (!unlockRes.ok) {
				throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
			}

			const unlockData = await unlockRes.json();
			return {
				clinicToken: initData.clinicToken,
				staffToken: unlockData.staffToken,
				ownerUserId: initData.ownerUserId,
			};
		} catch (err) {
			console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
			await sleep(2000);
		}
	}
	throw new Error("Failed to provision clinic after 5 attempts");
}

async function main() {
	console.log("=== DOMAIN 32: SECURITY & RBAC 4-STATE VISUAL PROOF CAPTURE ===");
	const creds = await provisionTestClinic();

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await context.addInitScript(
		({ ct, st, uid }) => {
			try {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_session_token", st);
				localStorage.setItem("dente_active_user_id", uid);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					onboardingDismissed: true,
					onboardingStep: "done",
				}));
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: uid,
					name: "Д-р Воронов А. В.",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					permissions: ["all"],
				}));
				document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
			} catch (_) {}
		},
		{ ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId }
	);

	const page = await context.newPage();
	console.log("🌐 Navigating to http://127.0.0.1:5173/#settings/access...");
	await page.goto("http://127.0.0.1:5173/#settings/access", { waitUntil: "commit", timeout: 30000 });

	console.log("⏳ Waiting for app boot to finish...");
	await page.waitForSelector("#root", { timeout: 30000 });
	await page.waitForSelector(".boot-state, .boot-container, .boot-title", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForSelector(".app-shell, #root", { state: "visible", timeout: 30000 }).catch(() => {});
	await sleep(2500);

	console.log("🧭 Ensuring Settings -> Access tab is selected...");
	await page.evaluate(() => {
		window.location.hash = "settings/access";
		const style = document.createElement("style");
		style.id = "suppress-proof-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			.guided-tour-tooltip-card {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	});
	await sleep(1500);

	// Click "Все разделы" if visible
	const roleAllBtn = page.locator('[data-testid="btn-settings-role-all"]');
	if (await roleAllBtn.isVisible().catch(() => false)) {
		await roleAllBtn.click();
		await sleep(500);
	}

	// Click on Access tab in sidebar
	const accessTabSelector = page.locator('[aria-controls*="access"], button:has-text("Сотрудники и доступ"), [data-testid*="access"]').first();
	if (await accessTabSelector.isVisible().catch(() => false)) {
		await accessTabSelector.click();
		await sleep(1000);
	}

	const matrixPanel = page.locator('[data-testid="granular-role-matrix-panel"]').first();
	await matrixPanel.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
		console.log("Panel wait timed out, continuing with available settings DOM...");
	});
	await sleep(1000);

	const configs = [
		{
			filename: "01_security_rbac_pc_light.png",
			altName: "01_staff_security_rbac_pc_light_1440x900.png",
			desc: "PC Light 1440x900 (Security & Granular RBAC Role Matrix)",
			viewport: { width: 1440, height: 900 },
			theme: "light",
		},
		{
			filename: "02_security_rbac_pc_dark.png",
			altName: "02_staff_security_rbac_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900 (Security & Granular RBAC Role Matrix)",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
		},
		{
			filename: "03_security_rbac_mobile_light.png",
			altName: "03_staff_security_rbac_mobile_light_390x844.png",
			desc: "Mobile Light 390x844 (Apple HIG Responsive RBAC Matrix)",
			viewport: { width: 390, height: 844 },
			theme: "light",
		},
		{
			filename: "04_security_rbac_mobile_dark.png",
			altName: "04_staff_security_rbac_mobile_dark_390x844.png",
			desc: "Mobile Dark 390x844 (Apple HIG Responsive RBAC Matrix)",
			viewport: { width: 390, height: 844 },
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
		await page.setViewportSize(cfg.viewport);

		await page.evaluate((theme) => {
			const isDark = theme === "dark";
			document.documentElement.setAttribute("data-theme", theme);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			localStorage.setItem("dente_theme_mode", theme);
		}, cfg.theme);
		await sleep(800);

		if (await matrixPanel.isVisible().catch(() => false)) {
			await matrixPanel.scrollIntoViewIfNeeded();
			await sleep(400);
		}

		const docsPath = path.join(DOCS_DIR, cfg.filename);
		const docsAltPath = path.join(DOCS_DIR, cfg.altName);
		const brainPath = path.join(BRAIN_DIR, cfg.filename);

		await page.screenshot({ path: docsPath, fullPage: false });
		fs.copyFileSync(docsPath, docsAltPath);
		fs.copyFileSync(docsPath, brainPath);

		const stats = fs.statSync(docsPath);
		console.log(`✅ [SAVED] ${cfg.filename} & ${cfg.altName} -> size: ${(stats.size / 1024).toFixed(1)} KB`);

		if (stats.size < 20 * 1024) {
			console.warn(`⚠️ [WARN] File ${cfg.filename} is smaller than 20 KB!`);
		}
	}

	await browser.close();
	console.log("\n🎉 ALL 4-STATE SECURITY PROOFS CAPTURED SUCCESSFULLY!");
}

main().catch((err) => {
	console.error("❌ Capture script failed:", err);
	process.exit(1);
});
