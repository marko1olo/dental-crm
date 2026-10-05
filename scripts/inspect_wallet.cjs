const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
	});
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token");
		localStorage.setItem("dente_demo_showcase", "true");
	});

	await page.goto("http://127.0.0.1:5173/?demo=1#payout", { waitUntil: "networkidle" });
	const wallet = await page.$(".doctor-wallet-container");
	if (wallet) {
		const text = await wallet.innerText();
		console.log("Wallet innerText:\n" + text.slice(0, 500));
		const rows = await page.locator(".doctor-wallet-shift-row").all();
		console.log("Shift rows count:", rows.length);
	} else {
		console.log("No wallet found!");
	}
	await browser.close();
}

main().catch(console.error);
