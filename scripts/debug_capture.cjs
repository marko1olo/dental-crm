const { chromium } = require("playwright");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

async function getLiveClinicLogin() {
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				host: "127.0.0.1",
				port: 4100,
				path: "/api/auth/login",
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			(res) => {
				let body = "";
				res.on("data", (chunk) => (body += chunk));
				res.on("end", () => {
					try {
						resolve(JSON.parse(body));
					} catch (e) {
						reject(e);
					}
				});
			},
		);
		req.on("error", reject);
		req.write(JSON.stringify({ email: "clinic@example.com", password: "dente2026" }));
		req.end();
	});
}

async function run() {
	const loginData = await getLiveClinicLogin();
	const clinicToken = loginData.clinicToken;
	const staffToken = loginData.staffToken;
	const user = loginData.user;
	const orgId = "00000000-0000-0000-0000-000000000001";

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addInitScript(
			({ token, staff, userInfo, organizationId }) => {
				localStorage.setItem("dente_clinic_token", token);
				localStorage.setItem("dente_staff_token", staff);
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_current_doctor_id", userInfo.id);
				localStorage.setItem("dente_active_staff_user", JSON.stringify(userInfo));
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true }));
				localStorage.setItem("dente-workspace-profile", JSON.stringify({
					state: {
						clinicName: "Демо Клиника DENTE",
						organizationId,
						currentDoctor: { id: userInfo.id, fullName: userInfo.fullName, role: userInfo.role },
						flags: { disableTour: true },
					},
				}));
			},
			{ token: clinicToken, staff: staffToken, userInfo: user, organizationId: orgId },
		);

		const page = await context.newPage();
		page.on("console", (msg) => console.log("PAGE CONSOLE:", msg.text()));
		page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

		console.log("Navigating to http://127.0.0.1:5173/?demo=true#inventory");
		await page.goto("http://127.0.0.1:5173/?demo=true#inventory", { waitUntil: "domcontentloaded" });

		console.log("Waiting for main.boot-state to disappear...");
		await page.waitForSelector("main.boot-state", { state: "detached", timeout: 35000 }).catch((e) => {
			console.log("main.boot-state did not detach within 35s:", e.message);
		});
		await page.waitForTimeout(3000);

		console.log("Current URL:", page.url());
		const debugShot = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\6173d43c-4227-4dec-bb0e-f5f546a1c125\\debug_screen.png";
		await page.screenshot({ path: debugShot });
		console.log("Saved debug screenshot to:", debugShot);

		const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
		console.log("Body text preview:\n", bodyText);

		const navLinks = await page.evaluate(() => {
			return Array.from(document.querySelectorAll("a, button")).map(el => ({
				tag: el.tagName,
				href: el.getAttribute("href"),
				text: el.innerText.trim().slice(0, 30),
				testId: el.getAttribute("data-testid"),
			})).filter(x => x.href || x.testId || x.text);
		});
		console.log("Found nav links/buttons count:", navLinks.length);
		console.log("Sample:", navLinks.slice(0, 15));
	} finally {
		await browser.close();
	}
}

run().catch(console.error);
