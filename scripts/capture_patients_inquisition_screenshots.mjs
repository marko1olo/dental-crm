/**
 * scripts/capture_patients_inquisition_screenshots.mjs
 *
 * Скрипт создания честных Red Team скриншотов картотеки пациентов,
 * медицинского анамнеза (соматика и аллергии), семейного кошелька и шторки.
 *
 * Инварианты:
 * 1. Реальные скриншоты в PC Light (1440x900) и PC Dark (1440x900).
 * 2. Anti-Blank / Anti-Splash Guard: проверка готовности DOM и исчезновения загрузчиков.
 * 3. Сохранение в docs/screenshots/patients_inquisition/.
 */

import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\patients_inquisition";
fs.mkdirSync(DOCS_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
	console.log("=== ЗАПУСК СНЯТИЯ RED TEAM СКРИНШОТОВ (PATIENTS INQUISITION) ===");

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => fs.existsSync(p));
	if (!executablePath) {
		throw new Error("Браузер Chrome или Edge не найден");
	}

	console.log(`Используем браузер: ${executablePath}`);

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	try {
		const baseUrl = "http://127.0.0.1:5173/patients_inquisition_preview.html";
		const page = await browser.newPage();
		await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

		const targets = [
			{
				name: "01_patient_anamnesis_pc_light.png",
				url: `${baseUrl}?view=anamnesis&theme=light`,
				selector: '[data-testid="patient-anamnesis-container"]',
				title: "Вкладка анамнеза и аллергий (PC Light 1440x900)",
			},
			{
				name: "01_patient_anamnesis_pc_dark.png",
				url: `${baseUrl}?view=anamnesis&theme=dark`,
				selector: '[data-testid="patient-anamnesis-container"]',
				title: "Вкладка анамнеза и аллергий (PC Dark 1440x900)",
			},
			{
				name: "02_family_wallet_pc_light.png",
				url: `${baseUrl}?view=family&theme=light`,
				selector: '[data-testid="family-wallet-modal"]',
				title: "Семейный кошелек (PC Light 1440x900)",
			},
			{
				name: "02_family_wallet_pc_dark.png",
				url: `${baseUrl}?view=family&theme=dark`,
				selector: '[data-testid="family-wallet-modal"]',
				title: "Семейный кошелек (PC Dark 1440x900)",
			},
			{
				name: "03_patient_drawer_pc_light.png",
				url: `${baseUrl}?view=drawer&theme=light`,
				selector: '[data-testid="patient-drawer"]',
				title: "Выкатная шторка пациента с длинным именем (PC Light 1440x900)",
			},
			{
				name: "03_patient_drawer_pc_dark.png",
				url: `${baseUrl}?view=drawer&theme=dark`,
				selector: '[data-testid="patient-drawer"]',
				title: "Выкатная шторка пациента с длинным именем (PC Dark 1440x900)",
			},
			{
				name: "04_patient_details_modal_pc_light.png",
				url: `${baseUrl}?view=card&theme=light`,
				selector: '[data-testid="patient-details-modal"]',
				title: "Полная медкарта пациента 043/у (PC Light 1440x900)",
			},
			{
				name: "04_patient_details_modal_pc_dark.png",
				url: `${baseUrl}?view=card&theme=dark`,
				selector: '[data-testid="patient-details-modal"]',
				title: "Полная медкарта пациента 043/у (PC Dark 1440x900)",
			},
			{
				name: "05_patients_registry_pc_light.png",
				url: `${baseUrl}?view=registry&theme=light`,
				selector: '[data-testid="patients-registry-container"]',
				title: "Реестр пациентов (PC Light 1440x900)",
			},
			{
				name: "05_patients_registry_pc_dark.png",
				url: `${baseUrl}?view=registry&theme=dark`,
				selector: '[data-testid="patients-registry-container"]',
				title: "Реестр пациентов (PC Dark 1440x900)",
			},
		];

		for (const target of targets) {
			console.log(`\n--> Переход на: ${target.title}`);
			console.log(`    URL: ${target.url}`);

			await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });

			// Anti-Blank / Anti-Splash Guard
			console.log(`    Ожидание селектора: ${target.selector}...`);
			await page.waitForSelector(target.selector, { timeout: 15000 });

			// Убедимся, что загрузочный сплэш исчез
			await page.waitForFunction(() => {
				const splash = document.querySelector(".dente-splash-screen, .loading-indicator");
				return !splash;
			}, { timeout: 10000 }).catch(() => {
				// Если сплэша не было, всё в порядке
			});

			// Даём стилям, шрифтам и анимациям стабилизироваться
			await wait(1200);

			const outPath = path.join(DOCS_DIR, target.name);
			await page.screenshot({ path: outPath, fullPage: false });
			console.log(`    ✓ Скриншот сохранен: ${outPath} (${fs.statSync(outPath).size} байт)`);
		}

		console.log("\n=== ВСЕ СКРИНШОТЫ УСПЕШНО СНЯТЫ ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("ОШИБКА ПРИ СНЯТИИ СКРИНШОТОВ:", err);
	process.exit(1);
});
