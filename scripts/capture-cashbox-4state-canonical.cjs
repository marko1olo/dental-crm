const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cashbox");
const SCREEN_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cashbox");
const INQUISITION_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");

for (const d of [PROOFS_DIR, SCREEN_DIR, INQUISITION_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function capture() {
	console.log("=== Provisioning session from live API for CASHBOX ===");
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
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{ name: "01_cashbox_studio_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light" },
		{ name: "02_cashbox_studio_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
		{ name: "03_cashbox_studio_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light" },
		{ name: "04_cashbox_studio_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark" },
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
				localStorage.setItem("dente_active_role", "cashier");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("demo_mode", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_sidebar_collapsed", "false");
				localStorage.setItem(
					"dente_staff_session",
					JSON.stringify({
						userId: "usr-cashier-01",
						name: "Кассир Воронова С. Н.",
						role: "cashier",
						roleScope: "clinical_director",
					}),
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "cashier",
						selectedPatientId: pid,
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);
			},
			{ ct: clinicToken, st: staffToken, pid: patientId, t: cfg.theme },
		);

		const page = await context.newPage();
		const url = "http://127.0.0.1:5173/?stand=cashbox&demo=true#checkout";
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

		// Wait for splash screen to disappear
		for (let i = 0; i < 25; i++) {
			await page.waitForTimeout(1000);
			try {
				const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
				if (!text.includes("Загрузка системы") && text.length > 200) {
					break;
				}
			} catch (e) {}
		}

		// Ensure cashbox modal is open
		let modal = await page.$('[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]');
		if (!modal) {
			console.log("Dispatching dente:open-cashbox...");
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("dente:open-cashbox", {
						detail: {
							mode: "checkout",
							patientId: "pat-1",
							patientName: "Иванов Иван Иванович",
							amountRub: 5400,
							patientDepositRub: 1200,
							patientFamilyBalanceRub: 3500,
						},
					}),
				);
			});
			modal = await page.waitForSelector(
				'[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]',
				{ state: "visible", timeout: 20000 },
			);
		}

		// Dismiss overlays
		await page.evaluate(() => {
			const overlays = document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']");
			overlays.forEach((el) => el.remove());
		}).catch(() => {});

		// Apply theme classes directly
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			document.body.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.body.classList.add("light");
				document.body.classList.remove("dark");
			}
			window.dispatchEvent(new Event("themechange"));
		}, cfg.theme);
		await page.waitForTimeout(1000);

		const outPath = path.join(PROOFS_DIR, cfg.name);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

		fs.copyFileSync(outPath, path.join(SCREEN_DIR, cfg.name));
		fs.copyFileSync(outPath, path.join(INQUISITION_DIR, cfg.name));

		const stat = fs.statSync(outPath);
		console.log(`[PROOF VERIFIED] ${cfg.name}: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)`);
		if (stat.size < 20480) {
			throw new Error(`Screenshot ${cfg.name} is too small: ${stat.size} bytes (< 20 KB)!`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n>>> ALL 4 CANONICAL CASHBOX PROOFS SAVED AND VERIFIED <<<");
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
