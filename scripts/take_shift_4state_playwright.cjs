const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "840d025c-f804-42b4-bd0f-bdb907a708dc";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/shift");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
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
	await page.waitForTimeout(600);
}

function initScript() {
	localStorage.setItem("dente_active_role", "doctor");
	localStorage.setItem("dente_onboarding_completed", "true");
	localStorage.setItem("dente_tour_completed", "true");
	localStorage.setItem("dente_doctor_shift_active", "true");
	localStorage.setItem("dente_workspace_mode", "doctor");
	localStorage.setItem(
		"dente-workspace-profile",
		JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
	);
	localStorage.setItem(
		"dental-crm:web-ui-preferences:v1",
		JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true, onboardingStep: "done" })
	);
}

async function run() {
	console.log("[Proof Runner] Launching Playwright Chromium for Doctor Shift 4-State Proofs...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1 & 2. PC Desktop Context (1440x900)
		console.log("\n--- Phase 1 & 2: PC Desktop Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await pcContext.addInitScript(initScript);
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC to http://127.0.0.1:5173/#shift...");
		await pcPage.goto("http://127.0.0.1:5173/#shift", { waitUntil: "commit", timeout: 25000 });
		await pcPage.waitForTimeout(3000);

		// PC Light
		console.log("Capturing shift_cockpit_1440x900_light.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "shift_cockpit_1440x900_light.png");

		// PC Dark
		console.log("Capturing shift_cockpit_1440x900_dark.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "shift_cockpit_1440x900_dark.png");

		await pcContext.close();

		// 3 & 4. Mobile Context (390x844)
		console.log("\n--- Phase 3 & 4: Mobile Context (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		await mobileContext.addInitScript(initScript);
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating Mobile to http://127.0.0.1:5173/#shift...");
		await mobilePage.goto("http://127.0.0.1:5173/#shift", { waitUntil: "commit", timeout: 25000 });
		await mobilePage.waitForTimeout(3000);

		// Mobile Light
		console.log("Capturing shift_cockpit_390x844_light.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "shift_cockpit_390x844_light.png");

		// Mobile Dark
		console.log("Capturing shift_cockpit_390x844_dark.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "shift_cockpit_390x844_dark.png");

		await mobileContext.close();

		console.log("\n[Proof Runner] All 4 states successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner ERROR]:", err);
	process.exit(1);
});
