const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.route("**/api/**", async (route) => {
		if (route.request().url().includes("/api/clinical/implants/stock")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					implants: [
						{
							id: "inv-oss-4010",
							name: "Имплантат Osstem TS III SA Ø4.0x10мм",
							category: "Имплантология",
							unit: "шт.",
							stockQuantity: "5.000",
							currentQty: "5.000",
							unitCostRub: "12500.00",
							pricePerUnit: "12500.00",
							sku: "TS3S4010S",
							barcode: "01088061400012341024C120821SN-884210",
							lotNumber: "24C1208",
							expirationDate: "2028-11-30",
						},
						{
							id: "inv-dent-4510",
							name: "Имплантат Dentium SuperLine SLA Ø4.5x10мм",
							category: "Имплантология",
							unit: "шт.",
							stockQuantity: "6.000",
							currentQty: "6.000",
							unitCostRub: "10500.00",
							pricePerUnit: "10500.00",
							sku: "FX4010",
							barcode: "010880918000567810DT-7810221SN-441290",
							lotNumber: "DT-78102",
							expirationDate: "2029-01-31",
						},
					],
					consumables: {
						grafts: [
							{
								id: "inv-bio-oss-05",
								name: "Костный графт Geistlich Bio-Oss (0.5г)",
								unitCostRub: "8200.00",
								lotNumber: "BO-8921",
								expirationDate: "2028-06-30",
								stockQuantity: "8.000",
							},
						],
						membranes: [
							{
								id: "inv-bio-gide-1622",
								name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)",
								unitCostRub: "9800.00",
								lotNumber: "BG-3310",
								expirationDate: "2028-08-31",
								stockQuantity: "5.000",
							},
						],
						sutures: [
							{
								id: "inv-vicryl-40",
								name: "Шовный материал Ethicon Викрил 4-0 (игла 19мм)",
								unitCostRub: "650.00",
								lotNumber: "VK-2026",
								expirationDate: "2027-12-31",
								stockQuantity: "20.000",
							},
						],
					},
				}),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ success: true }),
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_active_patient_id", "demo_patient");
		localStorage.setItem("dente_tour_completed", "true");
	});

	console.log("Navigating to http://127.0.0.1:5173/?demo=true&implant_passport=true...");
	await page.goto("http://127.0.0.1:5173/?demo=true&implant_passport=true", {
		waitUntil: "domcontentloaded",
		timeout: 20000,
	});

	await page.waitForTimeout(3000);
	await page.screenshot({ path: "scripts/debug_screen_demo.png" });
	const hasModal = (await page.locator('[data-testid*="implant-passport-modal"]').count()) > 0;
	console.log("Has modal:", hasModal);
	await browser.close();
}

main().catch(console.error);
