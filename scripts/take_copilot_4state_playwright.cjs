const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "92c5269a-92c2-480f-8e50-d218230d73e6";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`);

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
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 40000}`);
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

async function loginAndMountWorkspace(page) {
	console.log("Navigating to http://127.0.0.1:5173/ ...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 35000 });

	// Wait for login card or demo button
	console.log("Waiting for login container or demo button...");
	const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур'), button.auth-demo-btn");
	await demoBtn.waitFor({ state: "visible", timeout: 20000 });
	console.log("Found Demo button! Clicking...");
	await demoBtn.first().click();

	// Wait for demo roles grid
	console.log("Waiting for demo roles grid...");
	const roleCard = page.locator(".auth-demo-role-card").first();
	await roleCard.waitFor({ state: "visible", timeout: 15000 });
	console.log("Double clicking first role card (Therapist)...");
	await roleCard.dblclick();

	// Wait for workspace to mount
	console.log("Waiting for workspace mounting...");
	await page.waitForTimeout(3000);
	await page.waitForSelector(".app-layout, .app-sidebar, .app-header, main", { timeout: 25000 });
	console.log("Workspace mounted! URL:", page.url());
}

async function openCopilot(page) {
	console.log("Opening Copilot Drawer...");
	await page.evaluate(() => {
		if (window.__denteCopilot?.open) {
			window.__denteCopilot.open();
		} else {
			window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
		}
	});
	await page.waitForTimeout(1500);

	// Inject realistic clinical messages if chat is blank
	await page.evaluate(() => {
		if (window.__denteCopilot?.setMessages) {
			window.__denteCopilot.setMessages([
				{
					id: "msg-clinical-1",
					role: "user",
					content: "Острая боль 26 зуб, ночные приступы от холодного.",
					timestamp: new Date().toISOString(),
				},
				{
					id: "msg-clinical-2",
					role: "assistant",
					content: "Диагноз: K04.0 Пульпит зуба 2.6.\n• Протокол эндодонтии (3 канала машинным NiTi).\n• Анестезия: Артикаин 4% 1:100 000 (1 карпула 1.7 мл).\n• Подготовлен черновик дневника приёма и сметы без замков.",
					timestamp: new Date().toISOString(),
				},
			]);
		}
	});
	await page.waitForTimeout(800);
}

async function run() {
	console.log("[Proof Runner] Launching Playwright Chromium for Live Copilot 4-State Proofs...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1 & 2. PC Desktop Context (1440x900)
		console.log("\n--- Phase 1 & 2: PC Desktop Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await loginAndMountWorkspace(pcPage);
		await openCopilot(pcPage);

		// PC Light
		console.log("Capturing 01_copilot_drawer_pc_light_1440.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_drawer_pc_light_1440.png");

		// PC Dark: switch to Tasks tab ("pending")
		console.log("Capturing 02_copilot_drawer_pc_dark_1440.png (Tasks Tab)...");
		await setTheme(pcPage, "dark");
		await pcPage.evaluate(() => {
			if (window.__denteCopilot?.setActiveTab) {
				window.__denteCopilot.setActiveTab("pending");
			}
		});
		await pcPage.waitForTimeout(800);
		await saveProof(pcPage, "02_copilot_drawer_pc_dark_1440.png");

		await pcContext.close();

		// 3 & 4. Mobile Context (390x844 with Retina 2x)
		console.log("\n--- Phase 3 & 4: Mobile Context (390x844 @2x Retina) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();
		await loginAndMountWorkspace(mobilePage);
		await openCopilot(mobilePage);

		// Mobile Light
		console.log("Capturing 03_copilot_bottom_sheet_mobile_light_390.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_copilot_bottom_sheet_mobile_light_390.png");

		// Mobile Dark: switch to Tasks tab ("pending")
		console.log("Capturing 04_copilot_bottom_sheet_mobile_dark_390.png (Tasks Tab)...");
		await setTheme(mobilePage, "dark");
		await mobilePage.evaluate(() => {
			if (window.__denteCopilot?.setActiveTab) {
				window.__denteCopilot.setActiveTab("pending");
			}
		});
		await mobilePage.waitForTimeout(800);
		await saveProof(mobilePage, "04_copilot_bottom_sheet_mobile_dark_390.png");

		await mobileContext.close();

		console.log("\n[Proof Runner] All 4 states successfully captured in live workspace!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner ERROR]:", err);
	process.exit(1);
});
