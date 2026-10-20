import { existsSync } from "node:fs";
import { chromium } from "playwright";

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = edgePaths.find((p) => existsSync(p));

async function run() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	await page.addInitScript(() => {
		window.localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
		window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
		window.localStorage.setItem("dente_demo_showcase_active", "true");
		window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ onboardingDismissed: true }));
		window.localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		window.localStorage.setItem("dente_onboarding_strip_dismissed", "true");
		window.localStorage.setItem("active_staff_user", JSON.stringify({
			id: "01a00000-0000-0000-0000-000000000002",
			fullName: "Д-р Соколов А. В.",
			role: "doctor",
			email: "doctor@clinic.com",
			organizationId: "01a00000-0000-0000-0000-000000000001",
			specialization: "Терапевт",
		}));
	});

	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 35000 });
	console.log("Page opened, waiting for app to load...");
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch((e) => console.log("boot-state wait warning:", e.message));
	await page.waitForTimeout(3000);

	console.log("Current URL:", page.url());
	const title = await page.title();
	console.log("Title:", title);

	const bodyText = await page.locator("body").innerText();
	console.log("First 500 chars of body:\n", bodyText.slice(0, 500));

	const screenshotPath = "C:/Users/Admin/.gemini/antigravity/brain/29510b6c-103f-4931-9052-ff72f199f38a/test_visit.png";
	await page.screenshot({ path: screenshotPath });
	console.log("Screenshot saved to", screenshotPath);

	await browser.close();
}

run().catch(console.error);
