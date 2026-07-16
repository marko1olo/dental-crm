const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const APP_URL = "http://localhost:5173";
const OUT_DIR = path.join(__dirname, "..", "audit_screenshots");

const NOW = new Date().toISOString();

const LOCALSTORAGE_SEED = {
	dente_clinic_token: "audit-bypass-token",
	dente_staff_token: "audit-bypass-staff",
	"dental-crm:web-ui-preferences:v1": JSON.stringify({
		version: 1,
		onboardingDismissed: true,
		onboardingDraftMode: false,
		onboardingStep: "done",
		onboardingDismissedAt: NOW,
		savedAt: NOW,
	}),
	"dental-crm:onboarding:v1": JSON.stringify({
		dismissed: true,
		draftMode: false,
		savedAt: NOW,
	}),
};

const VIEWS = [{ name: "dashboard", hash: "dashboard", wait: 2500 }];

const VIEWPORTS = [
	{ width: 1920, height: 1080, label: "desktop" },
	{ width: 1280, height: 800, label: "laptop" },
	{ width: 768, height: 1024, label: "tablet" },
];

async function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

(async () => {
	console.log("[Audit] ===== DENTE CRM Visual Audit =====");

	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	const browser = await puppeteer.launch({
		headless: "new",
		args: [
			"--no-sandbox",
			"--disable-web-security",
			"--disable-features=IsolateOrigins,site-per-process",
			"--window-size=1920,1080",
		],
	});

	const page = await browser.newPage();
	await page.setRequestInterception(true);

	page.on("console", (msg) =>
		console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`),
	);
	page.on("requestfailed", (request) => {
		console.error(
			`[Browser Network] Failed: ${request.url()} - ${request.failure().errorText}`,
		);
	});
	page.on("response", (response) => {
		if (!response.ok() && response.url().includes("/api/")) {
			console.error(
				`[Browser Network] API Error: ${response.status()} on ${response.url()}`,
			);
		}
	});

	page.on("request", (request) => {
		const url = request.url();
		if (url.includes("/api/")) {
			if (url.includes("/api/dashboard")) {
				request.respond({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						clinicName: "Audit Mock Clinic",
						todayIso: NOW.split("T")[0],
						appointments: [],
						patients: [],
						clinicSettings: {
							profile: {
								name: "Audit Mock Clinic",
								id: "mock-1",
								organizationId: "mock-org-1",
								mode: "solo_doctor",
							},
							staff: [
								{
									id: "staff1",
									name: "Dr. Test",
									active: true,
									role: "doctor",
								},
							],
							chairs: [{ id: "chair1", name: "Chair 1", active: true }],
							workingHours: [{ day: 1, open: "09:00", close: "17:00" }],
							roles: [],
							services: [],
							pricelist: [],
						},
						activeVisit: { id: null, patientId: null, appointmentId: null },
						unreadMailStatus: { count: 0 },
					}),
				});
			} else {
				request.respond({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			}
		} else {
			request.continue();
		}
	});

	try {
		console.log("[Audit] Step 1: Seeding localStorage...");
		await page.setViewport({ width: 1920, height: 1080 });
		await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

		await page.evaluate((seed) => {
			for (const [key, value] of Object.entries(seed)) {
				localStorage.setItem(key, value);
			}
		}, LOCALSTORAGE_SEED);

		console.log("[Audit] Step 2: Reloading with seeded state...");
		await page.reload({ waitUntil: "networkidle2", timeout: 30000 });
		await sleep(3000);

		for (const view of VIEWS) {
			console.log(`\n[Audit] === View: ${view.name} ===`);
			await page.evaluate((hash) => {
				window.location.hash = hash;
			}, view.hash);
			await sleep(view.wait);

			for (const vp of VIEWPORTS) {
				await page.setViewport({ width: vp.width, height: vp.height });
				await sleep(500);
				const filename = `${view.name}_${vp.label}.png`;
				const filepath = path.join(OUT_DIR, filename);
				await page.screenshot({ path: filepath, fullPage: true });
				console.log(`  [Saved] ${filename}`);
			}
		}
		console.log("\n[Audit] ===== DONE =====");
	} catch (err) {
		console.error("[Audit] FATAL:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
})();
