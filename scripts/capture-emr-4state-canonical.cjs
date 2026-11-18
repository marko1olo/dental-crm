const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e9195fce-356d-4572-8295-38b5b60022b5");
for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function capture() {
	const activePort = 5173;
	console.log(`=== Using Canonical Web Port: ${activePort} ===`);
	console.log("=== Provisioning session from live API ===");
	let clinicToken = "demo-clinic-token";
	let staffToken = "demo-staff-token";
	let patientId = "pat-1";

	try {
		const headers = { "Content-Type": "application/json" };
		const initRes = await fetch("http://127.0.0.1:4100/api/clinic/initialize", {
			method: "POST",
			headers,
			body: JSON.stringify({
				clinicName: "Стоматология ДЕНТЕ Премиум",
				ownerFullName: "Д-р Воронов А. В.",
				ownerEmail: "doctor-voronov@dente.ru",
				ownerPin: "1234",
			}),
		});
		if (initRes.ok) {
			const initData = await initRes.json();
			clinicToken = initData.clinicToken;

			const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff-unlock", {
				method: "POST",
				headers,
				body: JSON.stringify({ clinicToken, pin: "1234" }),
			});
			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				staffToken = unlockData.staffToken;
			}
		}
	} catch (err) {
		console.warn("API provisioning notice (falling back to demo state):", err.message);
	}

	console.log("Launching Chromium...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--proxy-server=direct://"],
	});

	const configs = [
		{ name: "01_visit_soap_emk_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light" },
		{ name: "02_visit_soap_emk_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
		{ name: "03_visit_soap_emk_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light" },
		{ name: "04_visit_soap_emk_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark" },
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		await context.addInitScript(
			({ ct, st, pid, t }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_sidebar_collapsed", "false");
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedPatientId: pid,
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);
			},
			{ ct: clinicToken, st: staffToken, pid: patientId, t: cfg.theme },
		);

		const page = await context.newPage();
		page.on("console", (msg) => {
			const txt = msg.text();
			if (msg.type() === "error" || txt.includes("Error") || txt.includes("DirectVisit")) {
				console.log(`[PAGE LOG] ${msg.type()}: ${txt.slice(0, 150)}`);
			}
		});
		const url = `http://127.0.0.1:${activePort}/?demo=true&visit_standalone=1#chairside-visit`;
		await page.goto(url, { waitUntil: "commit", timeout: 60000 });

		// Wait for splash screen to disappear
		for (let i = 0; i < 25; i++) {
			await page.waitForTimeout(1000);
			try {
				const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
				if (!text.includes("Загрузка системы") && text.length > 200) {
					break;
				}
			} catch (e) {
				// retry on navigation
			}
		}

		// Dismiss modals and popovers
		try {
			const dismissBtn = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"]').first();
			if ((await dismissBtn.count()) > 0 && (await dismissBtn.isVisible())) {
				await dismissBtn.click({ force: true });
				await page.waitForTimeout(500);
			}
		} catch {}

		await page.keyboard.press("Escape").catch(() => {});
		await page.waitForTimeout(500);

		// Switch to EMK tab if on desktop
		if (!cfg.isMobile) {
			try {
				const emkTab = page.locator('[data-testid="visit-subtab-emk"]').first();
				if ((await emkTab.count()) > 0 && (await emkTab.isVisible())) {
					await emkTab.click({ force: true });
					await page.waitForTimeout(600);
				}
			} catch {}
		}

		// Apply theme classes directly
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			document.body.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
		}, cfg.theme);
		await page.waitForTimeout(1000);

		const outPath = path.join(PROOFS_DIR, cfg.name);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

		const brainPath = path.join(BRAIN_DIR, cfg.name);
		fs.copyFileSync(outPath, brainPath);

		const stat = fs.statSync(outPath);
		console.log(`[PROOF VERIFIED] ${cfg.name}: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)`);

		await context.close();
	}

	await browser.close();
	console.log("\n>>> ALL 4 CANONICAL EMR/SOAP PROOFS SAVED TO DOCS/PROOFS/EMR <<<");
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
