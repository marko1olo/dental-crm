const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getMd5(filePath) {
	const buf = fs.readFileSync(filePath);
	return crypto.createHash("md5").update(buf).digest("hex");
}

async function run() {
	console.log("=== ЗАПУСК PLAYWRIGHT СЪЕМКИ КТ МАТРИЦЫ И ИНТЕРПОЛЯЦИИ (1440x900) ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-rasterization"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	const url = "http://127.0.0.1:5173/cbct_resolution_interpolation_inquisition.html";
	console.log(`Загрузка страницы: ${url}`);

	const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
	if (!response || response.status() !== 200) {
		throw new Error(`Ошибка загрузки: статус ${response ? response.status() : "нет ответа"}`);
	}

	// Ждем отрисовку canvas и загрузку реального КТ среза
	await page.waitForSelector("canvas", { timeout: 10000 });
	console.log("Canvas найден, ожидание загрузки реального КТ среза...");
	await page.waitForSelector("text=Реальное КТ DICOM", { timeout: 15000 }).catch(() => {
		console.log("Бейдж реального КТ не появился за 15с, продолжаем...");
	});
	await page.waitForTimeout(1500);

	const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
	const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d");

	if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
	if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

	async function switchTheme(targetTheme) {
		const isDark = await page.evaluate(() => 
			document.documentElement.classList.contains("dark") || 
			document.documentElement.getAttribute("data-theme") === "dark"
		);
		if ((targetTheme === "light" && isDark) || (targetTheme === "dark" && !isDark)) {
			// Находим кнопку смены темы
			const btn = await page.$("button:has-text('Светлая'), button:has-text('Тёмная')");
			if (btn) {
				await btn.click();
				await page.waitForTimeout(500);
			} else {
				console.warn("Кнопка смены темы не найдена, переключаем через DOM");
				await page.evaluate((t) => {
					document.documentElement.setAttribute("data-theme", t);
					if (t === "dark") {
						document.documentElement.classList.add("dark");
						document.documentElement.style.colorScheme = "dark";
					} else {
						document.documentElement.classList.remove("dark");
						document.documentElement.style.colorScheme = "light";
					}
				}, targetTheme);
				await page.waitForTimeout(500);
			}
		}
	}

	const files = [];

	// 1. СВЕТЛАЯ ТЕМА - Секция 1: Матрица разрешений
	console.log("Подготовка: 01_tooth_resolution_matrix_light.png");
	await switchTheme("light");
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(500);

	const file01 = path.join(screenshotsDir, "01_tooth_resolution_matrix_light.png");
	await page.screenshot({ path: file01, fullPage: false });
	fs.copyFileSync(file01, path.join(artifactDir, "01_tooth_resolution_matrix_light.png"));
	files.push(file01);
	console.log(`✓ 01 сохранен: ${file01} (${fs.statSync(file01).size} bytes, MD5: ${getMd5(file01)})`);

	// 2. ТЁМНАЯ ТЕМА - Секция 1: Матрица разрешений
	console.log("Подготовка: 02_tooth_resolution_matrix_dark.png");
	await switchTheme("dark");
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(500);

	const file02 = path.join(screenshotsDir, "02_tooth_resolution_matrix_dark.png");
	await page.screenshot({ path: file02, fullPage: false });
	fs.copyFileSync(file02, path.join(artifactDir, "02_tooth_resolution_matrix_dark.png"));
	files.push(file02);
	console.log(`✓ 02 сохранен: ${file02} (${fs.statSync(file02).size} bytes, MD5: ${getMd5(file02)})`);

	// 3. СВЕТЛАЯ ТЕМА - Секция 2: Сравнение 4 алгоритмов интерполяции
	console.log("Подготовка: 03_tooth_interpolation_methods_light.png");
	await switchTheme("light");
	await page.evaluate(() => {
		const sec2 = document.getElementById("section-interpolation");
		if (sec2) {
			sec2.scrollIntoView({ behavior: "instant", block: "start" });
		}
	});
	await page.waitForTimeout(500);

	const file03 = path.join(screenshotsDir, "03_tooth_interpolation_methods_light.png");
	await page.screenshot({ path: file03, fullPage: false });
	fs.copyFileSync(file03, path.join(artifactDir, "03_tooth_interpolation_methods_light.png"));
	files.push(file03);
	console.log(`✓ 03 сохранен: ${file03} (${fs.statSync(file03).size} bytes, MD5: ${getMd5(file03)})`);

	// 4. ТЁМНАЯ ТЕМА - Секция 2: Сравнение 4 алгоритмов интерполяции
	console.log("Подготовка: 04_tooth_interpolation_methods_dark.png");
	await switchTheme("dark");
	await page.evaluate(() => {
		const sec2 = document.getElementById("section-interpolation");
		if (sec2) {
			sec2.scrollIntoView({ behavior: "instant", block: "start" });
		}
	});
	await page.waitForTimeout(500);

	const file04 = path.join(screenshotsDir, "04_tooth_interpolation_methods_dark.png");
	await page.screenshot({ path: file04, fullPage: false });
	fs.copyFileSync(file04, path.join(artifactDir, "04_tooth_interpolation_methods_dark.png"));
	files.push(file04);
	console.log(`✓ 04 сохранен: ${file04} (${fs.statSync(file04).size} bytes, MD5: ${getMd5(file04)})`);

	await browser.close();

	console.log("\n=== ИТОГОВАЯ ПРОВЕРКА СКРИНШОТОВ ===");
	const hashes = new Set();
	let allValid = true;
	for (const f of files) {
		const size = fs.statSync(f).size;
		const hash = getMd5(f);
		if (size < 40000) {
			console.error(`ОШИБКА: Файл ${path.basename(f)} слишком мал (${size} байт < 40 КБ)`);
			allValid = false;
		}
		if (hashes.has(hash)) {
			console.error(`ОШИБКА: Дубликат MD5 хеша для ${path.basename(f)}`);
			allValid = false;
		}
		hashes.add(hash);
		console.log(`${path.basename(f)}: ${size} байт, MD5: ${hash} [OK]`);
	}

	if (!allValid) {
		throw new Error("Валидация скриншотов провалена!");
	}
	console.log("ВСЕ 4 СКРИНШОТА УСПЕШНО СНЯТЫ И ПРОШЛИ КРИТЕРИИ КАЧЕСТВА!");
}

run().catch((err) => {
	console.error("Критическая ошибка:", err);
	process.exit(1);
});
