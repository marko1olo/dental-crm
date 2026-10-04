const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function provisionSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing clean clinic session via API...");
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Плюс",
			email: `doctor-mobile-${uniqueId}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Смирнов А. В.",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
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
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	let firstPatientId = null;

	const samplePatients = [
		{
			fullName: "Смирнова Анна Сергеевна",
			phone: "+7 (916) 123-45-67",
			birthDate: "1988-04-12",
			notes: "Аллергия на лидокаин. Острая реакция в анамнезе. Соматически здорова.",
		},
		{
			fullName: "Иванов Петр Николаевич",
			phone: "+7 (926) 345-67-89",
			birthDate: "1975-11-20",
			notes: "Гипертоническая болезнь II ст. Кариес 1.6, 2.4",
		},
		{
			fullName: "Ковалева Мария Дмитриевна",
			phone: "+7 (903) 987-65-43",
			birthDate: "1995-07-03",
			notes: "Здорова. Физиологическая норма.",
		},
		{
			fullName: "Морозов Денис Владимирович",
			phone: "+7 (915) 555-44-33",
			birthDate: "1982-01-15",
			notes: "Аллергия на пенициллины. Пульпит 3.6.",
		},
		{
			fullName: "Васильева Ольга Павловна",
			phone: "+7 (905) 222-11-00",
			birthDate: "2001-09-18",
			notes: "Аллергия на ультракаин и сульфиты.",
		},
	];

	for (let i = 0; i < samplePatients.length; i++) {
		try {
			const pRes = await fetch(`${API_BASE}/api/patients`, {
				method: "POST",
				headers,
				body: JSON.stringify(samplePatients[i]),
			});
			if (pRes.ok) {
				const pData = await pRes.json();
				if (!firstPatientId) firstPatientId = pData.id;
				console.log(`[Provisioning] Created patient ${i + 1}: ${samplePatients[i].fullName}`);
			}
		} catch (e) {
			console.warn("[Provisioning] Patient creation note:", e.message);
		}
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId: firstPatientId,
	};
}

async function run() {
	const auth = await provisionSession();

	console.log("[Playwright] Launching Chrome in iPhone 390x844 resolution...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	});

	const page = await context.newPage();

	async function setupAuthAndNavigate(theme = "light") {
		await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.evaluate(({ ct, st, uid, pid, themeMode }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", themeMode);
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			}));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			}));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				selectedPatientId: pid,
				onboardingDismissed: true,
				onboardingStep: "done",
			}));
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					state: {
						clinicName: "Стоматология ДЕНТЕ Плюс",
						currentDoctor: { id: uid, fullName: "Д-р Смирнов А. В.", role: "owner" },
						flags: { disableTour: true },
					},
				})
			);
			document.documentElement.setAttribute("data-theme", themeMode);
			if (themeMode === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
		}, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId, themeMode: theme });

		await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			return !text.includes("Загрузка системы") && !text.includes("Загрузка CRM") && (document.querySelector("#patients") || document.querySelector(".patients-panel") || document.querySelector(".mobile-tab-bar"));
		}, { timeout: 20000 });
		await page.waitForTimeout(1500);

		// Dismiss any possible onboarding/tour overlays
		await page.evaluate(() => {
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
		});
		await page.waitForTimeout(500);
	}

	// 1. LIGHT THEME CAPTURE
	console.log("Capturing Mobile Patients (Light)...");
	await setupAuthAndNavigate("light");

	const lightMetrics = await page.evaluate(() => {
		const docWidth = document.documentElement.scrollWidth;
		const winWidth = window.innerWidth;
		return {
			scrollWidth: docWidth,
			innerWidth: winWidth,
			hasHorizontalOverflow: docWidth > winWidth,
		};
	});
	console.log("Light Metrics:", lightMetrics);

	const lightShotPath = path.join(OUT_DIR, "proof_mobile_patients_grouped_list_light.png");
	await page.screenshot({ path: lightShotPath });
	console.log(`Saved: ${lightShotPath}`);

	// 2. DARK THEME CAPTURE
	console.log("Capturing Mobile Patients (Dark)...");
	await setupAuthAndNavigate("dark");

	const darkMetrics = await page.evaluate(() => {
		const docWidth = document.documentElement.scrollWidth;
		const winWidth = window.innerWidth;
		return {
			scrollWidth: docWidth,
			innerWidth: winWidth,
			hasHorizontalOverflow: docWidth > winWidth,
		};
	});
	console.log("Dark Metrics:", darkMetrics);

	const darkShotPath = path.join(OUT_DIR, "proof_mobile_patients_grouped_list_dark.png");
	await page.screenshot({ path: darkShotPath });
	console.log(`Saved: ${darkShotPath}`);

	await browser.close();
	console.log("Screenshot execution completed successfully!");
}

run().catch((err) => {
	console.error("Inquisition script failed:", err);
	process.exit(1);
});
