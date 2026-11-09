import { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/658afde1-1e4b-4be8-8428-e9e49253b7f6";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/c93cc0eb-0cfe-4714-bf08-8f512d1d3f61";

for (const d of [PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR]) {
	if (!existsSync(d)) {
		mkdirSync(d, { recursive: true });
	}
}

function verifyAndSave(buf, filename, desc) {
	if (buf.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buf.length} bytes`);
	}
	const p1 = path.join(PROOF_DIR, filename);
	writeFileSync(p1, buf);
	for (const dir of [BRAIN_DIR, PARENT_BRAIN_DIR]) {
		try {
			copyFileSync(p1, path.join(dir, filename));
		} catch (_) {}
	}
	const size = statSync(p1).size;
	console.log(`[CAPTURED] ${filename}: ${size} bytes (>= 20KB OK) -> ${desc}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.className = "dark";
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.className = "light";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await page.waitForTimeout(400);
}

async function waitForRealUI(page) {
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return text.includes("Анатомическая зубная формула") || text.includes("Wheeler 2.5D") || Boolean(document.querySelector('[data-testid="odontogram-studio-modal"]'));
	}, { timeout: 30000 });
	await page.waitForTimeout(1000);
}

async function main() {
	console.log("=== STARTING CANONICAL WHEELER 2.5D ODONTOGRAM 4-STATE CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--proxy-server=direct://", "--proxy-bypass-list=*"],
	});

	try {
		// 1. DESKTOP PC (1440x900)
		console.log("1. Desktop PC Session (1440x900)...");
		const pcPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#odontogram", { waitUntil: "commit", timeout: 25000 });
		await waitForRealUI(pcPage);

		// Switch to adult formula first
		console.log("Ensuring adult formula visible...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const adultBtn = buttons.find((b) => b.innerText && b.innerText.includes("Постоянный"));
			if (adultBtn) adultBtn.click();
		});
		await pcPage.waitForTimeout(600);

		// PC Light Adult
		await setTheme(pcPage, "light");
		const pcLight = await pcPage.screenshot({ fullPage: false });
		verifyAndSave(pcLight, "01_odontogram_pc_light_1440x900.png", "Wheeler 2.5D Adult Formula (PC Light 1440x900)");

		// PC Dark Adult
		await setTheme(pcPage, "dark");
		const pcDark = await pcPage.screenshot({ fullPage: false });
		verifyAndSave(pcDark, "02_odontogram_pc_dark_1440x900.png", "Wheeler 2.5D Adult Formula (PC Dark 1440x900)");

		// Switch to Pediatric mode
		console.log("Switching PC to Pediatric Dentition...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const pedBtn = buttons.find((b) => b.innerText && b.innerText.includes("Молочный"));
			if (pedBtn) pedBtn.click();
		});
		await pcPage.waitForTimeout(800);

		// PC Light Pediatric
		await setTheme(pcPage, "light");
		const pedLight = await pcPage.screenshot({ fullPage: false });
		verifyAndSave(pedLight, "03_odontogram_pediatric_pc_light_1440x900.png", "Wheeler 2.5D Pediatric Formula (PC Light 1440x900)");

		// PC Dark Pediatric
		await setTheme(pcPage, "dark");
		const pedDark = await pcPage.screenshot({ fullPage: false });
		verifyAndSave(pedDark, "06_odontogram_pediatric_pc_dark_1440x900.png", "Wheeler 2.5D Pediatric Formula (PC Dark 1440x900)");

		await pcPage.close();

		// 2. MOBILE VIEWPORT (390x844 Apple HIG)
		console.log("2. Mobile Apple HIG Session (390x844)...");
		const mobPage = await browser.newPage({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await mobPage.goto("http://127.0.0.1:5173/?demo=true#odontogram", { waitUntil: "commit", timeout: 25000 });
		await waitForRealUI(mobPage);

		// Switch to adult first
		await mobPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const adultBtn = buttons.find((b) => b.innerText && b.innerText.includes("Постоянный"));
			if (adultBtn) adultBtn.click();
		});
		await mobPage.waitForTimeout(600);

		// Mobile Light Adult
		await setTheme(mobPage, "light");
		const mobLight = await mobPage.screenshot({ fullPage: false });
		verifyAndSave(mobLight, "03_odontogram_mobile_light_390x844.png", "Wheeler 2.5D Mobile Odontogram (Mobile Light 390x844)");

		// Mobile Dark Adult
		await setTheme(mobPage, "dark");
		const mobDark = await mobPage.screenshot({ fullPage: false });
		verifyAndSave(mobDark, "04_odontogram_mobile_dark_390x844.png", "Wheeler 2.5D Mobile Odontogram (Mobile Dark 390x844)");

		// Switch to Pediatric mode on Mobile
		console.log("Switching Mobile to Pediatric Dentition...");
		await mobPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const pedBtn = buttons.find((b) => b.innerText && b.innerText.includes("Молочный"));
			if (pedBtn) pedBtn.click();
		});
		await mobPage.waitForTimeout(800);

		// Mobile Light Pediatric
		await setTheme(mobPage, "light");
		const mobPedLight = await mobPage.screenshot({ fullPage: false });
		verifyAndSave(mobPedLight, "03_pediatric_mobile_light_390x844.png", "Wheeler 2.5D Pediatric Mobile (Mobile Light 390x844)");

		// Mobile Dark Pediatric
		await setTheme(mobPage, "dark");
		const mobPedDark = await mobPage.screenshot({ fullPage: false });
		verifyAndSave(mobPedDark, "04_pediatric_mobile_dark_390x844.png", "Wheeler 2.5D Pediatric Mobile (Mobile Dark 390x844)");

		await mobPage.close();
		console.log("=== ALL 8 CANONICAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
