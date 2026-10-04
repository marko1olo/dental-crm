const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
	console.log("Launching Puppeteer for Mobile Public Booking Widget proofs (390x844)...");

	const docsDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
	if (!fs.existsSync(docsDir)) {
		fs.mkdirSync(docsDir, { recursive: true });
	}

	const artifactDirs = [
		"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc",
		"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\010cb413-2708-4c8e-8e60-65b2fdfbca4e",
	];

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		await page.setViewport({
			width: 390,
			height: 844,
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const bookingUrl = "http://127.0.0.1:5173/#/portal/booking/test-clinic";
		console.log(`Navigating to ${bookingUrl}...`);
		await page.goto(bookingUrl, { waitUntil: "networkidle0", timeout: 30000 });
		await wait(1500);

		// 1. LIGHT MODE - SLOTS VIEW
		console.log("Capturing Light mode slots screenshot...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
			const widget = document.querySelector(".dente-booking-widget");
			if (widget) widget.setAttribute("data-theme", "light");
			const slotsEl = document.getElementById("dbw-step-slots");
			if (slotsEl) slotsEl.scrollIntoView({ behavior: "instant", block: "start" });
		});
		await wait(500);

		const lightDocPath = path.join(docsDir, "proof_mobile_booking_slots_light.png");
		await page.screenshot({ path: lightDocPath, fullPage: false });
		console.log(`Saved: ${lightDocPath}`);

		for (const artDir of artifactDirs) {
			if (fs.existsSync(artDir)) {
				const artPath = path.join(artDir, "proof_mobile_booking_slots_light.png");
				fs.copyFileSync(lightDocPath, artPath);
				console.log(`Copied to artifact: ${artPath}`);
			}
		}

		// 2. DARK MODE - SLOTS VIEW
		console.log("Capturing Dark mode slots screenshot...");
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			const widget = document.querySelector(".dente-booking-widget");
			if (widget) widget.setAttribute("data-theme", "dark");
			const slotsEl = document.getElementById("dbw-step-slots");
			if (slotsEl) slotsEl.scrollIntoView({ behavior: "instant", block: "start" });
		});
		await wait(500);

		const darkDocPath = path.join(docsDir, "proof_mobile_booking_slots_dark.png");
		await page.screenshot({ path: darkDocPath, fullPage: false });
		console.log(`Saved: ${darkDocPath}`);

		for (const artDir of artifactDirs) {
			if (fs.existsSync(artDir)) {
				const artPath = path.join(artDir, "proof_mobile_booking_slots_dark.png");
				fs.copyFileSync(darkDocPath, artPath);
				console.log(`Copied to artifact: ${artPath}`);
			}
		}

		console.log("\n=========================================");
		console.log("MOBILE BOOKING SCREENSHOT AUDIT COMPLETE");
		console.log("=========================================");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Puppeteer capture error:", err);
	process.exit(1);
});
