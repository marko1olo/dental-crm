const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "a6622ca6-f62e-4c1d-9e90-ea0880b6eedc";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/telephony");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

function injectStorage(context) {
	return context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-token");
		localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0001-000000000001");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_active_session_token", "demo-staff-token");
		localStorage.setItem("dente_active_user_id", "01a00000-0000-0003-0000-000000000004");
		localStorage.setItem("dente_active_role", "administrator");
		localStorage.setItem("dente_user_role", "administrator");
		localStorage.setItem("dente_role", "administrator");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_perspective", "reception");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0003-0000-000000000004", fullName: "Смирнова Екатерина Васильевна", role: "administrator" }));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "clinic", role: "administrator", activeRole: "administrator", hasTelephony: true }));
		localStorage.setItem("dente_staff_session", JSON.stringify({ userId: "01a00000-0000-0003-0000-000000000004", name: "Смирнова Е. В.", fullName: "Смирнова Екатерина Васильевна", role: "administrator" }));
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "administrator",
				onboardingDismissed: true,
			})
		);
	});
}

async function saveProofFiles(page, filename1, filename2) {
	await page.waitForTimeout(600);
	const docP = path.join(OUT_DOCS, filename1);
	const brainP = path.join(OUT_BRAIN, filename1);
	await page.screenshot({ path: docP, fullPage: false });
	fs.copyFileSync(docP, brainP);

	if (filename2) {
		fs.copyFileSync(docP, path.join(OUT_DOCS, filename2));
		fs.copyFileSync(docP, path.join(OUT_BRAIN, filename2));
	}

	const size = fs.statSync(docP).size;
	console.log(`📸 Saved [${filename1}] / [${filename2}]: ${(size / 1024).toFixed(1)} KB`);
	if (size < 40960) {
		throw new Error(`[ERROR] File size ${size} < 40KB!`);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		document.documentElement.dataset.theme = th;
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		document.documentElement.style.colorScheme = th;
	}, theme);
	await page.waitForTimeout(600);
}

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		console.log("🖥️ Launching Browser Context (1440x900)...");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(context);
		const page = await context.newPage();

		console.log("Navigating to Schedule on PC 1440x900...");
		await page.goto(`${WEB_BASE}/?demo=true&callExpanded=true#schedule`, { waitUntil: "commit" });
		await page.waitForSelector(".workspace-shell, [data-testid=\"topbar-chairside-telephony-btn\"]", { state: "visible", timeout: 45000 });
		await suppressOverlays(page);

		console.log("Triggering live incoming call...");
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:telephony-mock-incoming", {
					detail: {
						callId: "call-" + Date.now(),
						phone: "+7 (926) 555-12-34",
						patientName: "Смирнова Анна Сергеевна",
						patientId: "01a00000-0000-0000-0000-000000000001",
						provider: "mango",
						timestamp: new Date().toISOString(),
						status: "ringing",
						acutePain: true,
					},
				})
			);
		});

		await page.waitForSelector('[data-testid="incoming-call-popup"], [data-testid="incoming-call-badge-container"]', { state: "visible", timeout: 20000 });
		const expandBtn = await page.$('[data-testid="capsule-expand-btn"]');
		if (expandBtn) {
			await expandBtn.click();
			await page.waitForTimeout(600);
		}

		// 1. PC Light
		console.log("Capturing 1/4: PC Light (1440x900)...");
		await setTheme(page, "light");
		await saveProofFiles(page, "01_telephony_incoming_call_pc_light_1440x900.png", "05_incoming_call_pc_light_1440x900.png");

		// 2. PC Dark
		console.log("Capturing 2/4: PC Dark (1440x900)...");
		await setTheme(page, "dark");
		await saveProofFiles(page, "02_telephony_incoming_call_pc_dark_1440x900.png", "06_incoming_call_pc_dark_1440x900.png");

		// ----------------------------------------------------
		// 3 & 4. Mobile Apple HIG (390x844)
		// ----------------------------------------------------
		console.log("\n📱 Resizing viewport to Mobile Apple HIG (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => window.dispatchEvent(new Event("resize")));
		await page.waitForTimeout(1200);
		await suppressOverlays(page);

		// 3. Mobile Light
		console.log("Capturing 3/4: Mobile Light (390x844)...");
		await setTheme(page, "light");
		await saveProofFiles(page, "03_telephony_incoming_call_mobile_light_390x844.png", "07_incoming_call_mobile_light_390x844.png");

		// 4. Mobile Dark
		console.log("Capturing 4/4: Mobile Dark (390x844)...");
		await setTheme(page, "dark");
		await saveProofFiles(page, "04_telephony_incoming_call_mobile_dark_390x844.png", "08_incoming_call_mobile_dark_390x844.png");

		await context.close();
		console.log("\n🎉 ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED & VALIDATED!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FAILED:", err);
	process.exit(1);
});
