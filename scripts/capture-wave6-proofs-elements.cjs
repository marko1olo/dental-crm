const puppeteer = require("puppeteer");
const path = require("path");

async function run() {
	console.log("=== Capturing Direct Element Screenshots for Wave 6 ===");

	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 1800 });

	const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

	try {
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });
		await page.evaluate(() => {
			localStorage.setItem("dente_clinic_token", "dental");
			localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
			localStorage.setItem("dente_auth_token", "dev-token");
			localStorage.setItem("dente_user_role", "admin");
		});
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });

		// Click on Shift or main view if needed
		await new Promise((r) => setTimeout(r, 2000));

		// Check selectors
		const selectors = [
			{ sel: "[data-testid='prodoctorov-sync-widget']", file: "proof_prodoctorov_sync.png" },
			{ sel: "[data-testid='custom-examination-form-catalogs-widget']", file: "proof_custom_examination_form_catalogs.png" },
			{ sel: "[data-testid='treatment-plan-print-odontogram-widget']", file: "proof_treatment_plan_print_odontogram.png" },
			{ sel: "[data-testid='egisz-multiple-diagnoses-widget']", file: "proof_egisz_multiple_diagnoses.png" },
			{ sel: "[data-testid='mkb10-auto-directories-widget']", file: "proof_mkb10_auto_directories.png" },
		];

		for (const s of selectors) {
			const el = await page.$(s.sel);
			if (el) {
				await el.screenshot({ path: path.join(artifactsDir, s.file) });
				console.log(`✅ Saved ${s.file}`);
			} else {
				console.log(`⚠️ Element ${s.sel} not found`);
			}
		}

		await page.screenshot({ path: path.join(artifactsDir, "proof_wave6_full_view.png"), fullPage: true });
		console.log("✅ Saved proof_wave6_full_view.png");
	} catch (err) {
		console.error("Error capturing elements:", err);
	} finally {
		await browser.close();
	}
}

run();
