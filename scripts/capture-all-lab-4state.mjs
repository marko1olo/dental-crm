import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/lab");
const PROOFS_DIR_DENTAL_LAB = path.resolve(process.cwd(), "docs/proofs/dental_lab");
fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(PROOFS_DIR_DENTAL_LAB, { recursive: true });

async function getAuthToken() {
	for (let i = 0; i < 5; i++) {
		try {
			const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
			});
			if (res.ok) {
				const data = await res.json();
				return { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user };
			}
		} catch (_) {
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
	return {
		clinicToken: "demo-clinic-token",
		staffToken: "demo-showcase-staff-token-chief",
		user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
	};
}

async function capture() {
	const auth = await getAuthToken();
	console.log(`[AUTH] Ready with: ${auth.user?.fullName}`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			filename: "01_dental_lab_studio_pc_light_1440x900.png",
			aliases: [
				"01_dental_lab_pc_light_1440x900.png",
				"01_lab_orders_pc_light_1440x900.png",
				"lab_orders_kanban_pc_light.png"
			],
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			filename: "02_dental_lab_studio_pc_dark_1440x900.png",
			aliases: [
				"02_dental_lab_pc_dark_1440x900.png",
				"02_lab_orders_pc_dark_1440x900.png",
				"lab_orders_kanban_pc_dark.png"
			],
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			filename: "03_dental_lab_studio_mobile_light_390x844.png",
			aliases: [
				"03_dental_lab_mobile_light_390x844.png",
				"03_lab_orders_mobile_light_390x844.png",
				"lab_order_drawer_mobile_light.png"
			],
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
		},
		{
			filename: "04_dental_lab_studio_mobile_dark_390x844.png",
			aliases: [
				"04_dental_lab_mobile_dark_390x844.png",
				"04_lab_orders_mobile_dark_390x844.png",
				"lab_order_drawer_mobile_dark.png"
			],
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
		},
	];

	for (const cfg of configs) {
		console.log(`[CAPTURE] Rendering ${cfg.filename}...`);
		const storageState = {
			cookies: [
				{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
				{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
			],
			origins: [
				{
					origin: "http://127.0.0.1:5173",
					localStorage: [
						{ name: "dente_demo_showcase", value: "true" },
						{ name: "dente_clinic_token", value: auth.clinicToken },
						{ name: "dente_staff_token", value: auth.staffToken },
						{ name: "dente_active_session_token", value: auth.staffToken },
						{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" },
						{ name: "dente_user_id", value: auth.user.id },
						{ name: "dente_user_name", value: auth.user.fullName },
						{ name: "dente_user_role", value: "doctor" },
						{ name: "dente_role", value: "doctor" },
						{ name: "dente_perspective", value: "doctor" },
						{ name: "dente_theme_mode", value: cfg.theme },
						{ name: "dente-theme", value: cfg.theme },
						{ name: "dente_theme", value: cfg.theme },
						{ name: "theme", value: cfg.theme },
						{ name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
						{ name: "dente_onboarding_completed", value: "true" },
						{ name: "dente_tour_completed", value: "true" },
						{ name: "dente_tour_dismissed", value: "true" },
						{ name: "dente_active_patient_id", value: "01a00000-0000-0000-0000-000000000001" },
					],
				},
			],
		};

		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.theme,
			storageState,
		});

		await context.addInitScript(({ cTok, sTok, uid, fn, theme }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", cTok);
				localStorage.setItem("dente_staff_token", sTok);
				localStorage.setItem("dente_active_session_token", sTok);
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", uid);
				localStorage.setItem("dente_user_name", fn);
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
				document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
				document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
			} catch (_) {}
		}, {
			cTok: auth.clinicToken,
			sTok: auth.staffToken,
			uid: auth.user.id,
			fn: auth.user.fullName,
			theme: cfg.theme,
		});

		const page = await context.newPage();

		let loaded = false;
		for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
			try {
				await page.goto("http://127.0.0.1:5173/?demo=true&lab=1#lab", {
					waitUntil: "domcontentloaded",
					timeout: 30000,
				});
				await page.waitForSelector('.boot-state', { state: "detached", timeout: 25000 }).catch(() => {});
				await page.waitForTimeout(2000);
				loaded = true;
			} catch (e) {
				console.log(`[RETRY] Attempt ${attempt} failed: ${e.message}`);
				await page.waitForTimeout(2000);
			}
		}

		await page.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 20000 });

		// Clean overlays and enforce tokens
		await page.evaluate(({ theme }) => {
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
		}, { theme: cfg.theme });

		await page.waitForTimeout(1000);

		const targetPath = path.join(PROOFS_DIR, cfg.filename);
		await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
		const targetPathDentalLab = path.join(PROOFS_DIR_DENTAL_LAB, cfg.filename);
		fs.copyFileSync(targetPath, targetPathDentalLab);
		const size = fs.statSync(targetPath).size;
		console.log(`✓ Saved ${cfg.filename} (${(size / 1024).toFixed(1)} KB) in lab & dental_lab`);

		if (size < 20480) {
			throw new Error(`Screenshot ${cfg.filename} is smaller than 20KB (${size} bytes)!`);
		}

		for (const alias of cfg.aliases) {
			const aliasPath = path.join(PROOFS_DIR, alias);
			fs.copyFileSync(targetPath, aliasPath);
			const aliasPathDental = path.join(PROOFS_DIR_DENTAL_LAB, alias);
			fs.copyFileSync(targetPath, aliasPathDental);
			console.log(`  -> copied alias: ${alias}`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL 4-STATE DENTAL LAB STUDIO PROOFS CAPTURED SUCCESSFULLY ===");
}

capture().catch((err) => {
	console.error("[FATAL] capture error:", err);
	process.exit(1);
});
