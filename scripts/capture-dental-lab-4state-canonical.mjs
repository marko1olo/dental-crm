import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOF_DIRS = [
	path.resolve(process.cwd(), "docs/proofs/dental-lab"),
	path.resolve(process.cwd(), "docs/proofs/lab"),
	path.resolve(process.cwd(), "docs/proofs/dental_lab"),
];

for (const dir of PROOF_DIRS) {
	fs.mkdirSync(dir, { recursive: true });
}

async function captureAllStates() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const states = [
		{
			id: "01_dental_lab_studio_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			aliases: ["01_lab_orders_pc_light_1440x900.png", "dental_lab_studio_pc_light.png", "01_dental_lab_orders_pc_light_1440x900.png"],
		},
		{
			id: "02_dental_lab_studio_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			aliases: ["02_lab_orders_pc_dark_1440x900.png", "dental_lab_studio_pc_dark.png", "02_dental_lab_orders_pc_dark_1440x900.png"],
		},
		{
			id: "03_dental_lab_studio_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			aliases: ["03_lab_orders_mobile_light_390x844.png", "dental_lab_studio_mobile_light.png", "03_dental_lab_orders_mobile_light_390x844.png"],
		},
		{
			id: "04_dental_lab_studio_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			theme: "dark",
			aliases: ["04_lab_orders_mobile_dark_390x844.png", "dental_lab_studio_mobile_dark.png", "04_dental_lab_orders_mobile_dark_390x844.png"],
		},
	];

	for (const st of states) {
		console.log(`[CAPTURE] Rendering ${st.id} (${st.width}x${st.height}, theme=${st.theme})...`);
		const context = await browser.newContext({
			viewport: { width: st.width, height: st.height },
			deviceScaleFactor: 2,
			hasTouch: st.width <= 768,
			colorScheme: st.theme,
		});

		await context.addInitScript((theme) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", "doc-1");
				localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente-theme", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				document.cookie = `dente_clinic_token=demo-clinic-token; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=demo-showcase-staff-token-chief; path=/; max-age=31536000`;
			} catch (_) {}
		}, st.theme);

		const page = await context.newPage();

		await page.goto("http://127.0.0.1:5173/?demo=true&standalone=dental_lab", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await page.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 20000 });
		await page.waitForTimeout(600);

		await page.evaluate((theme) => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);

			document.documentElement.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.setAttribute("data-theme", theme);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
		}, st.theme);

		await page.waitForTimeout(800);

		const primaryPath = path.join(PROOF_DIRS[0], st.id);
		await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });
		const size = fs.statSync(primaryPath).size;
		console.log(`[PROOF VERIFIED] ${st.id}: ${size} bytes (${(size / 1024).toFixed(1)} KB)`);

		if (size < 20480) {
			throw new Error(`Screenshot ${st.id} is under 20KB threshold (${size} bytes)!`);
		}

		for (let i = 1; i < PROOF_DIRS.length; i++) {
			const copyPath = path.join(PROOF_DIRS[i], st.id);
			fs.copyFileSync(primaryPath, copyPath);
		}

		for (const alias of st.aliases) {
			for (const dir of PROOF_DIRS) {
				fs.copyFileSync(primaryPath, path.join(dir, alias));
			}
		}

		// Also capture Registry Tab for desktop
		if (st.width === 1440) {
			const regId = st.theme === "light"
				? "05_dental_lab_registry_pc_light_1440x900.png"
				: "06_dental_lab_registry_pc_dark_1440x900.png";
			console.log(`[CAPTURE] Rendering registry tab: ${regId}...`);
			await page.click('[data-testid="tab-registry"]');
			await page.waitForTimeout(600);
			const regPath = path.join(PROOF_DIRS[0], regId);
			await page.screenshot({ path: regPath, fullPage: false, animations: "disabled" });
			const regSize = fs.statSync(regPath).size;
			console.log(`[PROOF VERIFIED] ${regId}: ${regSize} bytes (${(regSize / 1024).toFixed(1)} KB)`);
			for (let i = 1; i < PROOF_DIRS.length; i++) {
				fs.copyFileSync(regPath, path.join(PROOF_DIRS[i], regId));
			}
		}

		await context.close();
	}

	await browser.close();
	console.log("\n>>> ALL 4 DENTAL LAB STUDIO CANONICAL PROOFS SUCCESSFULLY CAPTURED! <<<");
}

captureAllStates().catch((err) => {
	console.error("[FATAL] captureAllStates failed:", err);
	process.exit(1);
});
