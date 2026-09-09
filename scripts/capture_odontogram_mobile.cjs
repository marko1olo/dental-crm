const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const OUTPUT_DIRS = [
	path.join(__dirname, "../docs/proofs/audit"),
	path.join(__dirname, "../apps/web/public/proofs"),
	path.join(__dirname, "../screenshots"),
	"C:/Users/Admin/.gemini/antigravity/brain/60c38303-2ae8-4817-8471-40c4a2d01464",
];

for (const d of OUTPUT_DIRS) {
	if (!fs.existsSync(d)) {
		try {
			fs.mkdirSync(d, { recursive: true });
		} catch {}
	}
}

function calculateMd5(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash("md5").update(content).digest("hex");
}

async function clearToasts(page) {
	await page.evaluate(() => {
		document.querySelectorAll('.toast, [role="alert"], [data-testid="global-toast"]').forEach((el) => {
			if (!el.getAttribute("data-testid")?.includes("odontogram-critical-somatic-alert")) {
				el.remove();
			}
		});
	});
}

async function setupDoctorSession(page, theme = "light") {
	await page.evaluate((th) => {
		localStorage.setItem("dente_clinic_token", "dental_live_token");
		localStorage.setItem("dente_staff_token", "staff_live_token");
		localStorage.setItem("dente_active_session_token", "session_token_123");
		localStorage.setItem("dente_organization_id", "org_dental_1");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dente_perspective", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
		localStorage.setItem("dente_theme", th);
	}, theme);
}

async function capture() {
	console.log("Launching Chromium for Odontogram Mobile 390x844 Proof...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const page = await mobileContext.newPage();
		page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
		page.on("pageerror", (err) => console.log("PAGE ERROR:", err));

		const baseUrl = "http://127.0.0.1:5173";
		console.log(`Connecting to ${baseUrl}/#odontogram-studio ...`);

		// Initial load to set localStorage to light theme
		await page.goto(`${baseUrl}/#odontogram-studio`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(page, "light");
		await page.reload({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
		await page.waitForTimeout(1500);

		// Check for BootErrorBoundary error screen
		const errorText = await page.evaluate(() => {
			const bodyText = document.body.innerText || "";
			if (bodyText.includes("Не удалось открыть рабочее место клиники")) {
				return "BootErrorBoundary: Не удалось открыть рабочее место клиники";
			}
			return null;
		});
		if (errorText) {
			throw new Error(`CRITICAL DEFECT DETECTED: ${errorText}`);
		}

		// Wait for odontogram container and quadrant bar
		await page.waitForSelector('[data-testid="odontogram-studio-container"]', { state: "visible", timeout: 10000 });
		await page.waitForSelector('[data-testid="odontogram-quadrant-bar"], .tooth-chart-container, svg', { state: "visible", timeout: 10000 });

		// Ensure theme is light
		const currentThemeAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
		if (currentThemeAttr !== "light") {
			console.log(`Current theme is ${currentThemeAttr}, clicking theme toggle button to switch to light...`);
			await page.click('button[aria-label="Сменить тему"]');
			await page.waitForTimeout(500);
		}

		await clearToasts(page);
		await page.waitForTimeout(1000);

		// 1. Mobile Light Screenshot
		console.log("Capturing odontogram_mobile_light.png...");
		const lightBuffer = await page.screenshot({ fullPage: false });
		for (const dir of OUTPUT_DIRS) {
			fs.writeFileSync(path.join(dir, "odontogram_mobile_light.png"), lightBuffer);
		}
		console.log(`Saved odontogram_mobile_light.png (${lightBuffer.length} bytes)`);

		// 2. Mobile Dark Screenshot via Theme Toggle Button
		console.log("Switching to Dark Theme via toggle button...");
		await page.click('button[aria-label="Сменить тему"]');
		await page.waitForTimeout(1000);
		await clearToasts(page);

		console.log("Capturing odontogram_mobile_dark.png...");
		const darkBuffer = await page.screenshot({ fullPage: false });
		for (const dir of OUTPUT_DIRS) {
			fs.writeFileSync(path.join(dir, "odontogram_mobile_dark.png"), darkBuffer);
		}
		console.log(`Saved odontogram_mobile_dark.png (${darkBuffer.length} bytes)`);

		console.log("\n=======================================================");
		console.log("MOBILE SCREENSHOT INTEGRITY VERIFICATION");
		console.log("=======================================================");
		const lightSize = lightBuffer.length;
		const darkSize = darkBuffer.length;
		const lightHash = calculateMd5(path.join(OUTPUT_DIRS[0], "odontogram_mobile_light.png"));
		const darkHash = calculateMd5(path.join(OUTPUT_DIRS[0], "odontogram_mobile_dark.png"));

		console.log(`odontogram_mobile_light.png: ${lightSize} bytes | MD5: ${lightHash}`);
		console.log(`odontogram_mobile_dark.png:  ${darkSize} bytes | MD5: ${darkHash}`);

		if (lightSize < 40000 || darkSize < 40000) {
			throw new Error(`CRITICAL REJECTION: Screenshot file size < 40KB! Light: ${lightSize}, Dark: ${darkSize}`);
		}

		if (lightHash === darkHash) {
			throw new Error("CRITICAL REJECTION: Light and Dark screenshot MD5 hashes are identical!");
		}

		console.log("SUCCESS: Both screenshots >= 40KB and have distinct MD5 hashes.");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
