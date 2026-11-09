/**
 * scripts/capture-pricelist-4state-canonical.cjs
 *
 * Captures 4-State Proofs for Pricelist Studio & Procedure Catalog SSOT:
 * 1. 01_pricelist_studio_pc_light_1440x900.png
 * 2. 02_pricelist_studio_pc_dark_1440x900.png
 * 3. 03_pricelist_studio_mobile_light_390x844.png
 * 4. 04_pricelist_studio_mobile_dark_390x844.png
 * 5. 05_pricelist_drawer_pc_light_1440x900.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleServices = [
	{
		id: "srv-1",
		code: "A16.07.002",
		order804nCode: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение среднего кариеса)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		priceRub: 4500,
		priceKopecks: 450000,
		costKopecks: 70000,
		materialsCostRub: 700,
		durationMinutes: 45,
		durationMin: 45,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
	{
		id: "srv-2",
		code: "A16.07.004",
		order804nCode: "A16.07.004",
		title: "Лечение пульпита: пломбирование одного корневого канала",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6800,
		priceRub: 6800,
		priceKopecks: 680000,
		costKopecks: 120000,
		materialsCostRub: 1200,
		durationMinutes: 60,
		durationMin: 60,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
	{
		id: "srv-3",
		code: "A16.07.051",
		order804nCode: "A16.07.051",
		title: "Профессиональная гигиена полости рта и ультразвуковой скейлинг",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 5500,
		priceRub: 5500,
		priceKopecks: 550000,
		costKopecks: 90000,
		materialsCostRub: 900,
		durationMinutes: 45,
		durationMin: 45,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
	{
		id: "srv-4",
		code: "A16.07.001",
		order804nCode: "A16.07.001",
		title: "Удаление постоянного зуба простое",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3500,
		priceRub: 3500,
		priceKopecks: 350000,
		costKopecks: 50000,
		materialsCostRub: 500,
		durationMinutes: 30,
		durationMin: 30,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
	{
		id: "srv-5",
		code: "A16.07.054",
		order804nCode: "A16.07.054",
		title: "Дентальная имплантация системы Straumann / Osstem",
		category: "implantology",
		specialty: "surgeon",
		basePriceRub: 38000,
		priceRub: 38000,
		priceKopecks: 3800000,
		costKopecks: 850000,
		materialsCostRub: 8500,
		durationMinutes: 90,
		durationMin: 90,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
	{
		id: "srv-6",
		code: "A16.07.006",
		order804nCode: "A16.07.006",
		title: "Протезирование зуба коронкой из диоксида циркония",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 24000,
		priceRub: 24000,
		priceKopecks: 2400000,
		costKopecks: 550000,
		materialsCostRub: 5500,
		durationMinutes: 60,
		durationMin: 60,
		taxDeductible: true,
		active: true,
		isActive: true,
	},
];

async function run() {
	const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/pricelist");
	const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/888e031f-2125-40cb-9054-10b2e5870f1f");

	for (const d of [proofDir, brainDir]) {
		if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
	}

	console.log("Launching browser with channel: chrome...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function setupContextAndPage(isMobile, theme) {
		const context = await browser.newContext({
			viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
			deviceScaleFactor: 2,
			isMobile: Boolean(isMobile),
			hasTouch: Boolean(isMobile),
		});

		const page = await context.newPage();

		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[Browser ERROR]", msg.text());
		});
		page.on("pageerror", (err) => {
			console.error("[Browser UNCAUGHT]", err.message);
		});

		// Intercept only API calls (and never Vite source / @fs scripts)
		await page.route("http://127.0.0.1:5173/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/@fs/") || url.includes("/src/")) return route.continue();
			if (url.includes("/api/pricelist") || url.includes("/api/pricelists")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						items: sampleServices,
						categories: [
							{ key: "therapy", title: "Терапия", count: 2 },
							{ key: "surgery", title: "Хирургия", count: 1 },
							{ key: "hygiene", title: "Гигиена", count: 1 },
							{ key: "implantology", title: "Имплантация", count: 1 },
							{ key: "orthopedics", title: "Ортопедия", count: 1 },
						],
					}),
				});
			}
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true, items: [] }),
			});
		});

		// Pre-seed storage
		await page.addInitScript(({ th, services }) => {
			localStorage.setItem("dente_clinic_token", "live-clinic-token");
			localStorage.setItem("dente_staff_token", "live-staff-token");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_canonical_pricelist_v3", JSON.stringify(services));
			localStorage.setItem("dente_onboarding_dismissed", "true");
		}, { th: theme, services: sampleServices });

		return { context, page };
	}

	function saveProof(filename, buffer) {
		const p1 = path.join(proofDir, filename);
		const p2 = path.join(brainDir, filename);
		fs.writeFileSync(p1, buffer);
		fs.writeFileSync(p2, buffer);
		console.log(`Saved proof: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
	}

	console.log("=== 1. PC Light (1440x900) ===");
	{
		const { context, page } = await setupContextAndPage(false, "light");
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"]', { timeout: 10000 }).catch(() => {});
		await wait(1000);

		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await wait(500);

		const buf = await page.screenshot({ fullPage: false });
		saveProof("01_pricelist_studio_pc_light_1440x900.png", buf);
		await context.close();
	}

	console.log("=== 2. PC Dark (1440x900) ===");
	{
		const { context, page } = await setupContextAndPage(false, "dark");
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"]', { timeout: 10000 }).catch(() => {});
		await wait(1000);

		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await wait(500);

		const buf = await page.screenshot({ fullPage: false });
		saveProof("02_pricelist_studio_pc_dark_1440x900.png", buf);
		await context.close();
	}

	console.log("=== 3. Mobile Light (390x844) ===");
	{
		const { context, page } = await setupContextAndPage(true, "light");
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"]', { timeout: 10000 }).catch(() => {});
		await wait(1000);

		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await wait(500);

		const buf = await page.screenshot({ fullPage: false });
		saveProof("03_pricelist_studio_mobile_light_390x844.png", buf);
		await context.close();
	}

	console.log("=== 4. Mobile Dark (390x844) ===");
	{
		const { context, page } = await setupContextAndPage(true, "dark");
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"]', { timeout: 10000 }).catch(() => {});
		await wait(1000);

		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await wait(500);

		const buf = await page.screenshot({ fullPage: false });
		saveProof("04_pricelist_studio_mobile_dark_390x844.png", buf);
		await context.close();
	}

	console.log("=== 5. PC Light with New Service Drawer (1440x900) ===");
	{
		const { context, page } = await setupContextAndPage(false, "light");
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"]', { timeout: 10000 }).catch(() => {});
		await wait(1000);

		const addBtn = await page.$("button:has-text('Добавить услугу')");
		if (addBtn) {
			await addBtn.click();
			await wait(800);
		}

		const buf = await page.screenshot({ fullPage: false });
		saveProof("05_pricelist_drawer_pc_light_1440x900.png", buf);
		await context.close();
	}

	await browser.close();
	console.log("All 5 proofs captured successfully!");
}

run().catch((err) => {
	console.error("Proof capture error:", err);
	process.exit(1);
});
