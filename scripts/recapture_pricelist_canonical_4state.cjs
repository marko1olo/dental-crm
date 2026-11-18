const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/pricelist");
	const brainDir = path.resolve(process.env.ARTIFACT_DIR || "C:/Users/Admin/.gemini/antigravity/brain/e48c63ac-450a-4577-a8bf-4babbd82e8aa");

	for (const d of [proofDir, brainDir]) {
		if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
	}

	console.log("Launching browser with channel: msedge...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	function saveProof(filename, buffer) {
		const p1 = path.join(proofDir, filename);
		const p2 = path.join(brainDir, filename);
		fs.writeFileSync(p1, buffer);
		fs.writeFileSync(p2, buffer);
		console.log(`Saved proof: ${filename} (${Math.round(buffer.length / 1024)} KB)`);

		const aliasMap = {
			"01_pricelist_studio_pc_light_1440x900.png": "01_pricelist_pc_light.png",
			"02_pricelist_studio_pc_dark_1440x900.png": "02_pricelist_pc_dark.png",
			"03_pricelist_studio_mobile_light_390x844.png": "03_pricelist_mobile_light.png",
			"04_pricelist_studio_mobile_dark_390x844.png": "04_pricelist_mobile_dark.png",
		};
		if (aliasMap[filename]) {
			fs.writeFileSync(path.join(proofDir, aliasMap[filename]), buffer);
			fs.writeFileSync(path.join(brainDir, aliasMap[filename]), buffer);
		}
	}

	async function waitForModal(page) {
		for (let i = 0; i < 35; i++) {
			await wait(1000);
			const text = await page.evaluate(() => document.body.innerText).catch(() => "");
			if (text.includes("Прейскурант")) {
				return true;
			}
		}
		throw new Error("Timeout waiting for modal text 'Прейскурант'");
	}

	// 1. PC Light
	console.log("=== 1. PC Light (1440x900) ===");
	{
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await waitForModal(page);
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await wait(600);
		const buf = await page.screenshot({ fullPage: false });
		saveProof("01_pricelist_studio_pc_light_1440x900.png", buf);
		await page.close();
	}

	// 2. PC Dark
	console.log("=== 2. PC Dark (1440x900) ===");
	{
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await waitForModal(page);
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await wait(600);
		const buf = await page.screenshot({ fullPage: false });
		saveProof("02_pricelist_studio_pc_dark_1440x900.png", buf);
		await page.close();
	}

	// 3. Mobile Light (390x844)
	console.log("=== 3. Mobile Light (390x844) ===");
	{
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await waitForModal(page);
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await wait(600);
		const buf = await page.screenshot({ fullPage: false });
		saveProof("03_pricelist_studio_mobile_light_390x844.png", buf);
		await page.close();
	}

	// 4. Mobile Dark (390x844)
	console.log("=== 4. Mobile Dark (390x844) ===");
	{
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await waitForModal(page);
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await wait(600);
		const buf = await page.screenshot({ fullPage: false });
		saveProof("04_pricelist_studio_mobile_dark_390x844.png", buf);
		await page.close();
	}

	// 5. PC Light with New Service Drawer
	console.log("=== 5. PC Light with New Service Drawer (1440x900) ===");
	{
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await page.goto("http://127.0.0.1:5173/?demo=true&pricelist=1", { waitUntil: "commit" });
		await waitForModal(page);
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await wait(500);

		const addBtn = await page.$("button:has-text('Добавить услугу')");
		if (addBtn) {
			await addBtn.click();
			await wait(800);
		}
		const buf = await page.screenshot({ fullPage: false });
		saveProof("05_pricelist_drawer_pc_light_1440x900.png", buf);
		await page.close();
	}

	await browser.close();
	console.log("ALL 5 CANONICAL PROOFS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("Proof capture error:", err);
	process.exit(1);
});
