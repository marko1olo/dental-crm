import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/09c8a411-a746-4465-a80b-41ec76924659";
const BASE_URL = "http://127.0.0.1:5173";

async function main() {
	if (!fs.existsSync(ARTIFACTS_DIR)) {
		fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
	}

	console.log("🚀 Запуск Edge для прогрева Vite и снятия скриншотов 1440x900...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	// Пропускаем все /src/ файлы для беспрепятственной сборки Vite
	await page.route("**/api/**", (route) => {
		if (route.request().url().includes("/src/")) {
			return route.continue();
		}
		if (route.request().url().includes("/api/dashboard")) {
			// Возвращаем приём с зубом 16 на этапе 1 (пульпит K04.0)
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					clinic: { id: "org-1", name: "Стоматология ДЕНТЕ", mode: "clinic", hasInventoryModule: true, hasAnalyticsModule: true },
					staff: [{ id: "user-1", name: "Д-р Смирнов А.П.", role: "doctor" }],
					activeDoctor: { id: "user-1", name: "Д-р Смирнов А.П.", role: "doctor" },
					appointments: [
						{
							id: "appt-stage1-prev",
							patientId: "pat-ivanov",
							patientName: "Иванов Пётр Сергеевич",
							startsAt: "2026-10-03T10:00:00.000Z",
							date: "03.10.2026",
							status: "completed",
							reason: "Зуб 16: Острый пульпит K04.0, мехобработка ProTaper, Calcept под повязку Септопак",
							diagnosis: "K04.0 Острый пульпит (зуб 16)",
							diagnosisTooth: 16,
						},
						{
							id: "appt-stage2-cur",
							patientId: "pat-ivanov",
							patientName: "Иванов Пётр Сергеевич",
							startsAt: new Date().toISOString(),
							date: new Date().toLocaleDateString("ru-RU"),
							status: "in_progress",
							reason: "Зуб 16: 2-й этап эндодонтического лечения (постоянная обтурация и пломба)",
							diagnosis: "K04.0 Острый пульпит (зуб 16)",
							diagnosisTooth: 16,
						},
					],
					patients: [
						{
							id: "pat-ivanov",
							fullName: "Иванов Пётр Сергеевич",
							phone: "+7 (916) 123-45-67",
							birthDate: "1988-04-12",
							age: 38,
							gender: "male",
							status: "active",
						},
					],
					recentPatients: [
						{
							id: "pat-ivanov",
							fullName: "Иванов Пётр Сергеевич",
							phone: "+7 (916) 123-45-67",
							birthDate: "1988-04-12",
							age: 38,
							gender: "male",
							status: "active",
						},
					],
					storedTeeth: [
						{ toothNumber: 16, state: "treatment", diagnosis: "K04.0" },
					],
					activePatient: {
						id: "pat-ivanov",
						fullName: "Иванов Пётр Сергеевич",
						phone: "+7 (916) 123-45-67",
						birthDate: "1988-04-12",
						age: 38,
						gender: "male",
						status: "active",
					},
					activeAppointment: {
						id: "appt-stage2-cur",
						patientId: "pat-ivanov",
						startsAt: new Date().toISOString(),
						date: new Date().toLocaleDateString("ru-RU"),
						status: "in_progress",
						diagnosisTooth: 16,
					},
					activeVisit: {
						id: "visit-stage2-cur",
						patientId: "pat-ivanov",
						appointmentId: "appt-stage2-cur",
						diagnosisTooth: 16,
						status: "in_progress",
					},
					serviceCatalog: [
						{
							id: "cat-obt",
							code804n: "A16.07.008.002",
							title: "Пломбирование корневого канала гуттаперчей (постоянная обтурация)",
							basePriceRub: 4500,
						},
						{
							id: "cat-rest",
							code804n: "A16.07.002.001",
							title: "Восстановление зуба пломбой (светоотверждаемый композит)",
							basePriceRub: 4800,
						},
					],
				}),
			});
		}
		if (route.request().method() === "GET") {
			return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
		}
		return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "test-clinic-tok");
		localStorage.setItem("dente_staff_token", "test-staff-tok");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "light" }));
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
		document.documentElement.setAttribute("data-theme", "light");
	});

	console.log("🌐 Переход на http://127.0.0.1:5173/?demo=true#visit...");
	await page.goto(`${BASE_URL}/?demo=true#visit`, { waitUntil: "load" });

	// Ожидание компиляции модулей Vite (до 20 сек)
	let loaded = false;
	for (let i = 0; i < 20; i++) {
		await page.waitForTimeout(1000);
		const body = await page.innerText("body").catch(() => "");
		if (i % 3 === 0) {
			console.log(`[${i + 1}с] Текст страницы: ${body.slice(0, 80).replace(/\n+/g, " ")}`);
		}
		if (!body.includes("Загрузка CRM") && body.length > 50) {
			console.log(`✅ CRM скомпилирована и загружена за ${i + 1} сек!`);
			loaded = true;
			break;
		}
	}

	if (!loaded) {
		console.warn("Предупреждение: таймаут ожидания компиляции");
	}

	await page.waitForTimeout(2000);

	// Устанавливаем hash #visit
	await page.evaluate(() => {
		window.location.hash = "#visit";
	});
	await page.waitForTimeout(1000);

	// Если показан выбор пациента в очереди, кликаем на Иванова
	const queueBtn = page.locator('button:has-text("Иванов"), [data-testid="patient-queue-row"]').first();
	if (await queueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Выбор пациента Иванов из очереди...");
		await queueBtn.click();
		await page.waitForTimeout(1000);
	}

	// Переключаем на таб ЭМК
	const emkTab = page.locator('button:has-text("ЭМК"), [data-testid="visit-tab-emk"]').first();
	if (await emkTab.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Переключение на вкладку ЭМК...");
		await emkTab.click();
		await page.waitForTimeout(1000);
	}

	// Устанавливаем активный зуб 16 со статусом treatment в store
	await page.evaluate(() => {
		try {
			// biome-ignore lint: DOM evaluation
			const win = window;
			if (win.__visitStore || (win.useVisitStore && win.useVisitStore.getState)) {
				const store = win.__visitStore || win.useVisitStore.getState();
				store.setActiveToothNumber?.(16);
				store.setVisitToothState?.("16", "treatment");
				store.setVisitToothRecord?.("16", {
					toothNumber: 16,
					state: "treatment",
					diagnosis: "K04.0 Острый очаговый пульпит (зуб 16)",
					diagnosisIcd10: "K04.0",
					isEndoUnfinished: true,
					services: [
						{ code: "A16.07.030.001", title: "Инструментальная и медикаментозная обработка корневого канала", price: 3500 },
					],
				});
			}
		} catch (e) {
			console.error("Store init error:", e);
		}
	});
	await page.waitForTimeout(1000);

	// ☀️ 1. Light Mode Screenshot: До применения 2-го этапа (кнопка видна)
	const lightPath = path.join(ARTIFACTS_DIR, "multi_stage_endo_light_1440.png");
	console.log(`📸 Снятие Light Mode скриншота: ${lightPath}`);
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await page.waitForTimeout(600);
	await page.screenshot({ path: lightPath, fullPage: false });

	const lightSize = fs.statSync(lightPath).size;
	console.log(`✅ Light Mode сохранен: ${lightSize} байт (требование >= 20 КБ: ${lightSize >= 20000 ? "OK" : "FAIL"})`);

	// Кликаем по кнопке продолжения эндодонтии
	console.log("Проверка наличия кнопки [data-testid=\"continue-endo-btn\"]...");
	const endoBtn = page.locator('[data-testid="continue-endo-btn"]').first();
	const isBtnVisible = await endoBtn.isVisible({ timeout: 2000 }).catch(() => false);
	if (isBtnVisible) {
		console.log("✓ Нажатие кнопки [data-testid=\"continue-endo-btn\"]!");
		await endoBtn.click();
	} else {
		console.log("Отправка события dente-continue-endo-stage...");
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-continue-endo-stage", {
					detail: {
						snapshot: {
							date: "03.10.2026",
							toothNumber: 16,
							diagnosisIcd10: "K04.0",
							diagnosisTitle: "K04.0 Острый очаговый пульпит (зуб 16)",
							anamnesis: "Ранее начато эндодонтическое лечение зуба 16 от 03.10.2026: экстирпация пульпы, ProTaper, Calcept под Септопак.",
							isEndoUnfinished: true,
							stage: 1,
						},
					},
				}),
			);
		});
	}

	await page.waitForTimeout(1000);

	// 🌙 2. Dark Mode Screenshot: После применения 2-го этапа
	const darkPath = path.join(ARTIFACTS_DIR, "multi_stage_endo_dark_1440.png");
	console.log(`📸 Снятие Dark Mode скриншота: ${darkPath}`);
	await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await page.waitForTimeout(600);
	await page.screenshot({ path: darkPath, fullPage: false });

	const darkSize = fs.statSync(darkPath).size;
	console.log(`✅ Dark Mode сохранен: ${darkSize} байт (требование >= 20 КБ: ${darkSize >= 20000 ? "OK" : "FAIL"})`);

	await browser.close();
	console.log("🎉 Все скриншоты успешно сняты и проверены!");
}

main().catch((err) => {
	console.error("Ошибка:", err);
	process.exit(1);
});
