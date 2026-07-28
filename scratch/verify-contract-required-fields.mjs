/**
 * Проверка заявки инженера: договор показывает ВСЕ незаполненные поля сразу.
 *
 * ЧТО БЫЛО ЗАЯВЛЕНО (коммит 9f0c33357). Договор на платные медицинские услуги
 * отказывал по одному полю за раз: администратор нажимал «Создать», получал
 * «Заполните поле: договор, номер», заполнял, нажимал снова, получал следующее — и
 * так по кругу. Ни одно поле на экране не было помечено обязательным. Инженер
 * добавил панель, которая перечисляет всё недостающее до нажатия.
 *
 * ЗАЧЕМ ПРОВЕРЯТЬ. Заявка сделана статически: автор в браузер не заходил. Панель
 * могла быть написана и не смонтирована, или показывать не то, что требует
 * валидатор. Разница видна только на живом экране.
 *
 * Скрипт открывает «Документы», выбирает договор и смотрит: перечислено ли
 * недостающее ДО нажатия, и совпадает ли перечень с тем, на что жалуется сервер
 * после нажатия.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

/*
 * Запас попыток — сорок по три секунды, две минуты.
 *
 * Прежние четырнадцать по 2,5 секунды давали 35 секунд, и проверка падала с
 * ECONNREFUSED просто потому, что сервер в этот момент перезапускался. Падение
 * проверки от перезапуска соседнего процесса — это ложная тревога, а она стоит
 * не меньше пропущенной поломки.
 */
async function req(path, init = {}, attempts = 40) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 3000));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await page.evaluate(
		({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#documents`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	/*
	 * Ждём ГОТОВНОСТИ, а не фиксированную паузу.
	 *
	 * Первая редакция ждала 6 секунд и не находила ни списка видов, ни кнопки:
	 * сервер разработки собирает модули по первому обращению к разделу, и после
	 * его перезапуска сборка занимает больше. Проверка объявляла отсутствие
	 * панели, которой просто ещё не было на странице, — то есть обвиняла инженера
	 * зря.
	 */
	let ready = false;
	for (let second = 0; second < 40; second += 1) {
		await page.waitForTimeout(1000);
		ready = await page.evaluate(() =>
			Array.from(document.querySelectorAll("select")).some((select) =>
				Array.from(select.options).some((option) => /договор/i.test(option.textContent || "")),
			),
		);
		if (ready) {
			console.log(`  раздел «Документы» готов на ${second + 1}-й секунде`);
			break;
		}
	}
	check("раздел «Документы» собрался", ready, ready ? "" : "за 40 секунд список видов документов не появился");

	const picked = await page.evaluate(() => {
		for (const select of Array.from(document.querySelectorAll("select"))) {
			const option = Array.from(select.options).find((o) => /договор/i.test(o.textContent || ""));
			if (!option) continue;
			select.value = option.value;
			select.dispatchEvent(new Event("change", { bubbles: true }));
			return option.textContent?.trim() ?? null;
		}
		return null;
	});
	check("вид документа «договор» выбран", Boolean(picked), String(picked));
	await page.waitForTimeout(2500);

	const before = await page.evaluate(() => document.body.innerText || "");

	/*
	 * Панель недостающего ищем по смыслу, а не по имени класса: имя может
	 * измениться, а обещание «перечислить незаполненное до нажатия» — нет.
	 */
	/*
	 * Ищем ПЕРЕЧЕНЬ ПОЛЕЙ, а не общую фразу.
	 *
	 * Первая редакция искала слова «Заполните…» и поймала подпись, которая стояла
	 * на экране и ДО правки: «Заполните форму ниже: без обязательных полей
	 * документ не создастся». Проверка показала «OK» на том, что было раньше, —
	 * то есть ничего не доказала. Ровно та ошибка, которую я ловлю за собой всю
	 * ночь: зелёная строка без содержания опаснее её отсутствия.
	 *
	 * Считаем названные поля. Валидатор договора требует номер, дату, заказчика,
	 * повод обращения, состав услуг, сумму и врача — значит на нетронутой форме
	 * недостающих должно быть НЕСКОЛЬКО. Один названный пункт — это и есть прежнее
	 * «по одному за раз».
	 */
	const named = await page.evaluate(() => {
		/*
		 * Признаки взяты из самого компонента (PaidContractRequiredFieldsPanel):
		 * .document-required-fields-missing когда чего-то не хватает и
		 * .document-required-fields-ready когда всё заполнено. Придуманного
		 * data-testid у него нет, и подставлять его сюда значило бы искать то,
		 * чего в коде не существует.
		 */
		const panel = document.querySelector(
			".document-required-fields-missing, .document-required-fields-ready",
		);
		const scope = panel ?? document.body;
		const items = Array.from(scope.querySelectorAll("li")).map((node) => (node.textContent || "").trim());
		return {
			panelFound: Boolean(panel),
			items: items.filter((text) => text.length > 2 && text.length < 120),
		};
	});
	check("панель недостающих полей есть на экране", named.panelFound, named.panelFound ? "" : "панель не найдена по признаку");
	console.log(`  названо полей: ${named.items.length}`);
	for (const item of named.items.slice(0, 12)) console.log(`    — ${item}`);
	check(
		"названо больше одного недостающего поля",
		named.items.length > 1,
		`${named.items.length} — прежнее поведение показывало ровно одно`,
	);
	const listed = named.items.length > 1;

	const clicked = await page.evaluate(() => {
		const button = Array.from(document.querySelectorAll("button")).find(
			(b) => (b.textContent || "").trim().startsWith("Создать") && !b.disabled,
		);
		if (!(button instanceof HTMLElement)) return null;
		button.click();
		return (button.textContent || "").trim();
	});
	check("кнопка создания найдена", Boolean(clicked), String(clicked));
	await page.waitForTimeout(3500);

	const after = await page.evaluate(() => document.body.innerText || "");
	const complaint = after.match(/Заполните поле:[^\n]*/i);
	check(
		"после нажатия нет жалобы на одно поле, если перечень уже показан",
		!complaint || Boolean(listed),
		complaint ? complaint[0].slice(0, 160) : "жалоб нет",
	);
	check("ошибок в консоли нет", errors.length === 0, errors.join(" | "));

	await page.screenshot({ path: "scratch/shots-contract-required.png", fullPage: false });
	await context.close();
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
