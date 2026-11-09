const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "9db73092-6cb9-4dc7-b095-5821608ebc2e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(800);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 25000}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(500);
}

const MOCK_MESSAGES = [
	{
		kind: "text",
		role: "user",
		text: "Пациент с жалобами на боли от холодного в зубе 36. Сформируй протокол приёма и план лечения.",
	},
	{
		kind: "text",
		role: "assistant",
		text: "Диагноз: K02.1 Глубокий кариес дентина (Зуб 36). Назначено препарирование, изолирующая прокладка и реставрация нанокомпозитом под инфильтрационной анестезией Артикаин 1.7 мл.",
		actionProposal: {
			callId: "call-1",
			title: "Дневник приёма (Зуб 36)",
			before: "Зуб 36: Без патологии / Интактный",
			after: "Зуб 36: Запись протокола приёма и сметы в карту пациента",
		},
	},
];

async function run() {
	console.log("[Recapture Proofs] Starting Playwright browser...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

		await pcContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo_clinic_token");
				localStorage.setItem("dente_staff_token", "demo_staff_token");
				localStorage.setItem("dente_active_session_token", "demo_staff_token");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doc", fullName: "Д-р Воронов А. В.", role: "doctor" }));
				sessionStorage.setItem("dente_unlocked", "true");
			} catch (_) {}
		});

		const page = await pcContext.newPage();

		console.log("Navigating to http://127.0.0.1:5173/?demo=true#schedule ...");
		await page.goto("http://127.0.0.1:5173/?demo=true#schedule", {
			waitUntil: "commit",
			timeout: 30000,
		}).catch((err) => console.log("[WARN] Navigation wait:", err.message));

		console.log("Waiting for .boot-state detachment and app hydration...");
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		for (let i = 0; i < 40; i++) {
			await page.waitForTimeout(400);
			const hasBoot = await page.evaluate(() => Boolean(document.querySelector(".boot-state, [data-splash]")));
			const text = await page.evaluate(() => document.body?.innerText || "");
			if (!hasBoot && text.length > 50 && !text.includes("Загрузка")) {
				console.log(`[Hydrated] Workspace loaded in ${(i + 1) * 400}ms!`);
				break;
			}
		}

		// Suppress any tour overlays, toasts & spotlight backdrops
		await page.addStyleTag({
			content: `
				.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
				.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
				[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
				.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`,
		}).catch(() => {});

		await setTheme(page, "light");

		// Open Copilot Studio
		console.log("Opening Copilot Studio...");
		await page.evaluate(({ msgs }) => {
			if (window.__denteCopilot) {
				if (typeof window.__denteCopilot.setMessages === "function") window.__denteCopilot.setMessages(msgs);
				if (typeof window.__denteCopilot.open === "function") window.__denteCopilot.open();
			}
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36",
				},
			}));
		}, { msgs: MOCK_MESSAGES });

		const studioRoot = page.locator('[data-testid="chairside-copilot-studio-root"]');
		await studioRoot.waitFor({ state: "visible", timeout: 20000 });
		console.log("Copilot Studio is visible!");
		await page.waitForTimeout(1000);

		// 1. Capture 01_copilot_studio_pc_light_1440x900.png
		console.log("Capturing 01_copilot_studio_pc_light_1440x900.png...");
		await saveProof(page, "01_copilot_studio_pc_light_1440x900.png");

		// 2. Open Copilot Settings Modal
		console.log("Opening Copilot Settings Modal...");
		const settingsBtn = page.locator('[data-testid="copilot-settings-trigger"]').first();
		await settingsBtn.waitFor({ state: "visible", timeout: 10000 });
		await settingsBtn.click({ force: true });

		const modalSelector = '[data-testid="copilot-settings-modal"]';
		await page.waitForSelector(modalSelector, { state: "visible", timeout: 15000 });
		console.log("Copilot Settings Modal is visible!");
		await page.waitForTimeout(800);

		// Switch to "Уровень доверия" tab
		console.log("Switching to 'Уровень доверия' tab...");
		const trustTabBtn = page.locator('button:has-text("Уровень доверия")').first();
		await trustTabBtn.waitFor({ state: "visible", timeout: 5000 });
		await trustTabBtn.click({ force: true });
		await page.waitForTimeout(800);

		// 2. Capture copilot_settings_trust_tab_pc_light_1440x900.png
		console.log("Capturing copilot_settings_trust_tab_pc_light_1440x900.png...");
		await saveProof(page, "copilot_settings_trust_tab_pc_light_1440x900.png");

		await pcContext.close();
		console.log("[Recapture Proofs] SUCCESS! Both screenshots recaptured cleanly.");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Recapture Proofs ERROR]:", err);
	process.exit(1);
});
