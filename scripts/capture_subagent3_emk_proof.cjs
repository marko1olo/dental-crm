const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

async function capture() {
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
				body: JSON.stringify({
					clinicToken,
					pin: "1234",
				}),
			});
			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				staffToken = unlockData.staffToken;

				const patRes = await fetch("http://127.0.0.1:4100/api/patients", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-clinic-token": clinicToken,
						Authorization: `Bearer ${staffToken}`,
					},
					body: JSON.stringify({
						fullName: "Смирнова Елена Сергеевна",
						phone: "+79998881122",
						birthDate: "1988-03-24",
						gender: "female",
						allergies: ["Лидокаин"],
					}),
				});
				if (patRes.ok) {
					const patData = await patRes.json();
					patientId = patData.patient?.id || patData.id || "pat-1";
				}
			}
		}
	} catch (err) {
		console.warn("API provisioning notice (falling back to demo state):", err.message);
	}

	const outDir = path.resolve(__dirname, "screenshots");
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	console.log("Launching Microsoft Edge ({ channel: 'msedge' })...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function captureTheme(theme) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addInitScript(
			({ ct, st, pid, t }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme_mode_prev", t);
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
				if (t === "dark") {
					document.documentElement.setAttribute("data-theme", "dark");
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
				} else {
					document.documentElement.setAttribute("data-theme", "light");
					document.documentElement.classList.add("light");
					document.documentElement.classList.remove("dark");
				}
			},
			{ ct: clinicToken, st: staffToken, pid: patientId, t: theme },
		);

		const page = await context.newPage();
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log(`[PAGE ERROR]: ${msg.text()}`);
			}
		});

		const url = "http://127.0.0.1:5173/?demo=true#visit";
		console.log(`Navigating to ${url} (${theme})...`);
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

		// Wait for splash screen to disappear
		for (let i = 0; i < 15; i++) {
			await page.waitForTimeout(1000);
			const text = await page.evaluate(() => document.body.innerText);
			if (!text.includes("Загрузка системы") && text.length > 300) break;
		}

		// Dismiss any modal popovers
		try {
			const dismissBtn = page
				.locator(
					'button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"]',
				)
				.first();
			if ((await dismissBtn.count()) > 0 && (await dismissBtn.isVisible())) {
				await dismissBtn.click({ force: true });
				await page.waitForTimeout(500);
			}
		} catch {}

		await page.keyboard.press("Escape");
		await page.waitForTimeout(500);

		// Ensure we are in EMK tab ("Дневник приёма")
		try {
			const emkTab = page.locator('[data-testid="visit-subtab-emk"]').first();
			if ((await emkTab.count()) > 0) {
				await emkTab.click({ force: true });
				await page.waitForTimeout(500);
			}
		} catch {}

		// Wait for key elements: chairside pipeline banner and clinical canvas
		await page.waitForSelector('[data-testid="chairside-cockpit-pipeline-banner"]', {
			timeout: 10000,
		});
		await page.waitForSelector('[data-testid="emk-clinical-canvas"]', { timeout: 10000 });
		await page.evaluate((th) => {
			if (th === "dark") {
				document.documentElement.setAttribute("data-theme", "dark");
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.setAttribute("data-theme", "light");
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
		}, theme);
		await page.waitForTimeout(1500);

		const fileName = `proof_subagent3_visit_emk_${theme}_1440x900.png`;
		const filePath = path.join(outDir, fileName);
		await page.screenshot({ path: filePath, fullPage: false });

		const stat = fs.statSync(filePath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
		console.log(`[SUCCESS] Captured ${fileName}: ${stat.size} bytes, MD5: ${hash}`);

		await context.close();
		return { fileName, filePath, size: stat.size, hash };
	}

	const lightResult = await captureTheme("light");
	const darkResult = await captureTheme("dark");

	await browser.close();

	console.log("\n=== Screenshot Verification Summary ===");
	console.log(`Light: ${lightResult.filePath} (${lightResult.size} bytes, MD5: ${lightResult.hash})`);
	console.log(`Dark:  ${darkResult.filePath} (${darkResult.size} bytes, MD5: ${darkResult.hash})`);

	if (lightResult.hash === darkResult.hash) {
		throw new Error("FAIL: Light and Dark screenshot hashes are identical!");
	}
	if (lightResult.size < 40000 || darkResult.size < 40000) {
		throw new Error("FAIL: Screenshot file size is below 40 KB threshold!");
	}
	console.log("=== ALL SCREENSHOT CRITERIA MET! ===");
}

capture().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
