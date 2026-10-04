const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET_DIRS = [
	path.resolve(__dirname, "../docs/screenshots/inquisition_live"),
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc",
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\a689fbb2-d7b7-4b78-af40-adbc931372dd",
];

for (const dir of TARGET_DIRS) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function saveProof(page, filename) {
	const primaryPath = path.join(TARGET_DIRS[0], filename);
	await page.screenshot({ path: primaryPath, fullPage: false });

	const content = fs.readFileSync(primaryPath);
	const hash = crypto.createHash("md5").update(content).digest("hex");

	for (let i = 1; i < TARGET_DIRS.length; i++) {
		const dest = path.join(TARGET_DIRS[i], filename);
		fs.writeFileSync(dest, content);
	}

	console.log(`[PROOF CAPTURED] ${filename} (${content.length} bytes, MD5: ${hash})`);
	return primaryPath;
}

async function main() {
	console.log("Launching Chromium for Sovereign Mobile Doctor Payout Proofs (390x844)...");

	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		for (const theme of ["light", "dark"]) {
			console.log(`\n--- Capturing Theme: ${theme.toUpperCase()} ---`);
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				userAgent:
					"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
				deviceScaleFactor: 2,
				isMobile: true,
				hasTouch: true,
			});

			const page = await context.newPage();

			// Pre-seed demo auth and theme in localStorage
			await page.addInitScript(({ t }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() })
				);
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ onboardingDismissed: true, theme: t })
				);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("dente_theme_mode", t);
				document.documentElement.setAttribute("data-theme", t);
				if (t === "dark") {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
			}, { t: theme });

			console.log("Navigating to http://127.0.0.1:5173/?demo=1#payout...");
			await page.goto("http://127.0.0.1:5173/?demo=1#payout", {
				waitUntil: "networkidle",
				timeout: 20000,
			});

			await wait(2500);

			// Ensure theme class is applied
			await page.evaluate((t) => {
				document.documentElement.setAttribute("data-theme", t);
				if (t === "dark") {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
			}, theme);

			await wait(500);

			// Check if mobile doctor wallet container exists
			const walletExists = await page.$(".doctor-wallet-container");
			console.log("Is .doctor-wallet-container visible?", Boolean(walletExists));

			if (!walletExists) {
				console.log("Wallet container not immediately found, checking body content or tabs...");
				// Try clicking tab with text "Врачи" if available
				const doctorsTab = await page.$("button:has-text('Врачи')");
				if (doctorsTab) {
					console.log("Found doctors tab, clicking it...");
					await doctorsTab.click();
					await wait(1500);
				}
			}

			// Scroll directly to wallet container
			await page.evaluate(() => {
				const el = document.querySelector(".doctor-wallet-container");
				if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
			});
			await wait(600);

			// Capture main screen proof
			await saveProof(page, `proof_mobile_doctor_payout_${theme}.png`);

			// Now tap the first shift card to open the Bottom Sheet Drawer
			const shiftRow = await page.$(".doctor-wallet-shift-row");
			if (shiftRow) {
				console.log("Clicking shift row to open Bottom Sheet Drawer...");
				await shiftRow.click();
				await wait(1000);

				const sheet = await page.$(".doctor-wallet-sheet-surface");
				console.log("Is Bottom Sheet surface open?", Boolean(sheet));

				// Capture drawer proof
				await saveProof(page, `proof_mobile_doctor_payout_drawer_${theme}.png`);

				// Close sheet
				const closeBtn = await page.$(".doctor-wallet-sheet-close");
				if (closeBtn) {
					await closeBtn.click();
					await wait(500);
				}
			} else {
				console.log("Shift row not found to click.");
			}

			await context.close();
		}

		console.log("\nAll proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
