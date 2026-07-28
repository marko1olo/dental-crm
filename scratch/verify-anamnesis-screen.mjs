/**
 * Живая проверка анкеты пациента: поля пустые, кнопка вписывает текст сама.
 *
 * Анкета открывалась с готовыми ответами за пациента («аллергии не отмечены»,
 * «препараты не принимает», «хронические заболевания отрицает»). Врач мог
 * вообще не открыть форму, а документ уходил на подпись заполненным.
 *
 * Скрипт открывает «Документы», выбирает анкету и смотрит на настоящие поля в
 * браузере: пусты ли они, есть ли подсказка, появляется ли кнопка быстрого
 * ответа и вписывает ли она ровно ту фразу, что была раньше по умолчанию.
 * Снимки обеих тем кладутся рядом, чтобы кнопку можно было увидеть глазами.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-anamnesis";
mkdirSync(OUT, { recursive: true });

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

async function req(path, init = {}, attempts = 14) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2500));
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

/** Поля анкеты и фраза, которую обязана вписать кнопка. */
const ANAMNESIS = [
	["Аллергии и нежелательные реакции", "Аллергии и нежелательные реакции со слов пациента не отмечены."],
	["Постоянные препараты", "Постоянные препараты со слов пациента не принимает."],
	["Хронические заболевания", "Хронические заболевания со слов пациента отрицает."],
	["Антикоагулянты и кровотечения", "Антикоагулянты и препараты, влияющие на кровотечение, со слов пациента не принимает."],
	["Инфекционные риски", "Инфекционные риски со слов пациента не заявлены."],
];

const browser = await chromium.launch({ headless: true });
try {
	for (const theme of ["light", "dark"]) {
		const context = await browser.newContext({ viewport: { width: 1500, height: 1200 }, locale: "ru-RU" });
		const page = await context.newPage();
		const pageErrors = [];
		page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));
		await page.goto(WEB, { waitUntil: "domcontentloaded" });
		await page.evaluate(
			({ ct, st, th }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			},
			{ ct: login.clinicToken, st: unlock.staffToken, th: theme },
		);
		await page.goto(`${WEB}/#documents`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(3500);

		// Вид документа выбирается списком; ищем анкету по видимой подписи.
		const picked = await page.evaluate(() => {
			for (const select of Array.from(document.querySelectorAll("select"))) {
				const option = Array.from(select.options).find((o) => /анкет/i.test(o.textContent || ""));
				if (!option) continue;
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
				return option.textContent?.trim() ?? null;
			}
			return null;
		});
		check(`[${theme}] анкета выбрана в списке видов`, Boolean(picked), String(picked));
		await page.waitForTimeout(1500);

		// Ручные поля спрятаны под «развернуть» — открываем всё, что есть.
		await page.evaluate(() => {
			for (const details of Array.from(document.querySelectorAll("details"))) details.open = true;
		});
		await page.waitForTimeout(600);

		for (const [label, denial] of ANAMNESIS) {
			const state = await page.evaluate((wanted) => {
				const field = Array.from(document.querySelectorAll("label")).find((l) =>
					(l.childNodes[0]?.textContent || "").trim().startsWith(wanted),
				);
				if (!field) return null;
				const area = field.querySelector("textarea");
				const button = field.querySelector("button");
				return {
					value: area?.value ?? null,
					placeholder: area?.placeholder ?? "",
					button: button?.textContent?.trim() ?? null,
				};
			}, label);
			check(`[${theme}] «${label}»: поле найдено`, state !== null);
			if (!state) continue;
			check(`[${theme}] «${label}»: пусто, ответа за пациента нет`, state.value === "", JSON.stringify(state.value));
			check(`[${theme}] «${label}»: есть подсказка, что писать`, state.placeholder.length > 10, state.placeholder);
			check(`[${theme}] «${label}»: видна кнопка быстрого ответа`, Boolean(state.button), String(state.button));
		}

		// Нажимаем кнопку у аллергий: она обязана вписать ровно прежнюю фразу.
		const [allergyLabel, allergyDenial] = ANAMNESIS[0];
		const afterClick = await page.evaluate((wanted) => {
			const field = Array.from(document.querySelectorAll("label")).find((l) =>
				(l.childNodes[0]?.textContent || "").trim().startsWith(wanted),
			);
			field?.querySelector("button")?.click();
			return null;
		}, allergyLabel);
		void afterClick;
		await page.waitForTimeout(500);
		const filled = await page.evaluate((wanted) => {
			const field = Array.from(document.querySelectorAll("label")).find((l) =>
				(l.childNodes[0]?.textContent || "").trim().startsWith(wanted),
			);
			return {
				value: field?.querySelector("textarea")?.value ?? null,
				buttonStillThere: Boolean(field?.querySelector("button")),
			};
		}, allergyLabel);
		check(`[${theme}] кнопка вписала прежнюю формулировку`, filled.value === allergyDenial, String(filled.value));
		check(`[${theme}] заполненное поле кнопку больше не показывает`, filled.buttonStillThere === false);

		await page.screenshot({ path: `${OUT}/anamnesis-${theme}.png`, fullPage: false });
		check(`[${theme}] экран без ошибок в консоли`, pageErrors.length === 0, pageErrors.join(" | "));
		await context.close();
	}
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
