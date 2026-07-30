/**
 * Живая проверка договора платных услуг: видно ли ДО нажатия, чего не хватает.
 *
 * Проверка договора отдаёт одну незаполненную позицию за раз, поэтому
 * администратор получал отказ за отказом, а поля лежали в свёрнутом блоке без
 * пометок обязательности. Скрипт открывает «Документы», выбирает договор и
 * смотрит настоящий экран: показан ли весь перечень нехваток, совпадает ли
 * счётчик в подписи блока полей, исчезает ли перечень после заполнения и
 * создаётся ли документ после того, как перечень объявил всё заполненным.
 *
 * Отметки времени (дата договора, дата подписания) НАМЕРЕННО остаются пустыми:
 * перечень обещает, что их подставит программа, и создание документа это
 * обещание проверяет.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import pg from "pg";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-paid-contract";
mkdirSync(OUT, { recursive: true });

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
/** Сколько договоров платных услуг лежит в базе: экран мог не обновить список. */
async function contractsInDatabase() {
	const result = await client.query(
		"select count(*)::int as n from generated_documents where kind = 'paid_medical_services_contract'",
	);
	return result.rows[0].n;
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

const browser = await chromium.launch({ headless: true });
try {
	for (const theme of ["light", "dark"]) {
		const context = await browser.newContext({ viewport: { width: 1500, height: 1250 }, locale: "ru-RU" });
		const page = await context.newPage();
		const pageErrors = [];
		page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
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

		/*
		 * Список видов появляется не сразу: экран документов подгружается отдельно.
		 * Первая редакция ждала 3.5 секунды «на глаз», не находила списка и молча
		 * проверяла карточку плана лечения — то есть проверяла не то.
		 */
		await page.waitForFunction(
			() =>
				Array.from(document.querySelectorAll("select")).some((s) =>
					Array.from(s.options).some((o) => o.value === "paid_medical_services_contract"),
				),
			null,
			{ timeout: 40000 },
		);
		const kindSelect = page
			.locator("select")
			.filter({ has: page.locator('option[value="paid_medical_services_contract"]') })
			.first();
		await kindSelect.selectOption("paid_medical_services_contract");
		await page.waitForTimeout(1500);
		const picked = await page.evaluate(() => {
			const select = Array.from(document.querySelectorAll("select")).find((s) =>
				Array.from(s.options).some((o) => o.value === "paid_medical_services_contract"),
			);
			if (!select) return null;
			const heading = document.querySelector(".document-payload-card h3");
			return `${select.selectedOptions[0]?.textContent?.trim()} / карточка: ${heading?.textContent?.trim()}`;
		});
		check(
			`[${theme}] договор выбран в списке видов, показана его карточка`,
			Boolean(picked?.includes("Договор платных медицинских услуг")),
			String(picked),
		);

		/** Что видно на экране до нажатия «Создать»: рамка нехваток и счётчик в подписи блока. */
		const before = await page.evaluate(() => {
			const box = document.querySelector(".document-required-fields-missing");
			const ready = document.querySelector(".document-required-fields-ready");
			const summary = Array.from(document.querySelectorAll("summary")).find((s) =>
				(s.textContent || "").includes("Обязательные поля договора"),
			);
			return {
				boxText: box ? (box.textContent || "").replace(/\s+/g, " ").trim() : null,
				items: box ? Array.from(box.querySelectorAll("li")).map((li) => (li.textContent || "").trim()) : [],
				readyText: ready ? (ready.textContent || "").replace(/\s+/g, " ").trim() : null,
				summaryText: summary ? (summary.textContent || "").replace(/\s+/g, " ").trim() : null,
				visible: box ? box.getBoundingClientRect().height > 0 : false,
			};
		});
		const counted = before.boxText?.match(/Не хватает (\d+) из (\d+) обязательных полей/);
		check(`[${theme}] перечень нехваток показан до нажатия «Создать»`, Boolean(counted) && before.visible, String(before.boxText).slice(0, 120));
		check(`[${theme}] в перечне столько строк, сколько заявлено`, Boolean(counted) && before.items.length === Number(counted[1]), `заявлено ${counted?.[1]}, строк ${before.items.length}`);
		check(`[${theme}] всего обязательных полей заявлено 18`, counted?.[2] === "18", String(counted?.[2]));
		check(`[${theme}] у каждой строки есть подсказка через тире`, before.items.length > 0 && before.items.every((t) => t.includes(" — ")), before.items[0]);
		check(`[${theme}] счётчик стоит в подписи блока полей`, Boolean(before.summaryText?.includes(`не хватает ${counted?.[1]}`)), String(before.summaryText));
		await page.screenshot({ path: `${OUT}/contract-missing-${theme}.png`, fullPage: false });

		// Разворачиваем блок полей и заполняем всё, кроме отметок времени.
		await page.evaluate(() => {
			for (const details of Array.from(document.querySelectorAll("details"))) details.open = true;
		});
		await page.waitForTimeout(600);
		const filledFields = await page.evaluate(() => {
			const stampLike = /^(Дата договора|Подписано)/i;
			let count = 0;
			const card = document.querySelector(".document-payload-card");
			if (!card) return 0;
			const setValue = (field, value) => {
				const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
				const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
				setter?.call(field, value);
				field.dispatchEvent(new Event("input", { bubbles: true }));
				field.dispatchEvent(new Event("change", { bubbles: true }));
				count += 1;
			};
			for (const label of Array.from(card.querySelectorAll("label"))) {
				const caption = (label.childNodes[0]?.textContent || "").trim();
				const field = label.querySelector("input, textarea");
				if (!field) continue;
				if (field instanceof HTMLInputElement && field.type === "checkbox") {
					if (!field.checked) {
						field.click();
						count += 1;
					}
					continue;
				}
				if (stampLike.test(caption)) continue;
				if (field.value.trim() !== "") continue;
				const numeric = field instanceof HTMLInputElement && field.inputMode === "numeric";
				setValue(field, numeric ? "12400" : `Проверка перечня: ${caption}`);
			}
			return count;
		});
		check(`[${theme}] поля договора заполнены проверочными значениями`, filledFields > 0, `полей: ${filledFields}`);
		await page.waitForTimeout(1200);

		const after = await page.evaluate(() => {
			const box = document.querySelector(".document-required-fields-missing");
			const ready = document.querySelector(".document-required-fields-ready");
			const summary = Array.from(document.querySelectorAll("summary")).find((s) =>
				(s.textContent || "").includes("Обязательные поля договора"),
			);
			const stamps = Array.from(document.querySelectorAll("label"))
				.filter((l) => /^(Дата договора|Подписано)/i.test((l.childNodes[0]?.textContent || "").trim()))
				.map((l) => ({
					caption: (l.childNodes[0]?.textContent || "").trim(),
					value: l.querySelector("input")?.value ?? null,
				}));
			return {
				stillMissing: box ? (box.textContent || "").replace(/\s+/g, " ").trim() : null,
				readyText: ready ? (ready.textContent || "").replace(/\s+/g, " ").trim() : null,
				summaryText: summary ? (summary.textContent || "").replace(/\s+/g, " ").trim() : null,
				stamps,
			};
		});
		check(`[${theme}] перечень нехваток исчез после заполнения`, after.stillMissing === null, String(after.stillMissing).slice(0, 120));
		check(`[${theme}] показана строка «всё заполнено»`, Boolean(after.readyText?.includes("Обязательные поля договора заполнены")), String(after.readyText));
		check(`[${theme}] подпись блока говорит «всё заполнено»`, Boolean(after.summaryText?.includes("всё заполнено")), String(after.summaryText));
		check(
			`[${theme}] отметки времени оставлены пустыми намеренно`,
			after.stamps.length === 2 && after.stamps.every((s) => (s.value ?? "").trim() === ""),
			after.stamps.map((s) => `${s.caption}="${s.value}"`).join(" | "),
		);
		await page.screenshot({ path: `${OUT}/contract-ready-${theme}.png`, fullPage: false });

		// Главное: обещание перечня проверяется настоящим созданием документа.
		const contractsBefore = await contractsInDatabase();
		const clicked = await page.evaluate(() => {
			const button = Array.from(document.querySelectorAll("button")).find(
				(b) => (b.textContent || "").trim().startsWith("Создать выбранный документ") && !b.disabled,
			);
			if (!(button instanceof HTMLElement)) return null;
			button.click();
			return (button.textContent || "").trim();
		});
		check(`[${theme}] кнопка создания найдена и доступна`, Boolean(clicked), String(clicked));
		await page.waitForTimeout(5000);
		const screenText = await page.evaluate(() => document.body.innerText || "");
		const refusal = screenText.match(/Заполните поле:[^\n]*|Укажите ориентировочную стоимость[^\n]*|Подтвердите, что[^\n]*/);
		check(`[${theme}] отказа по обязательным полям не было`, refusal === null, String(refusal?.[0]));
		const contractsAfter = await contractsInDatabase();
		check(
			`[${theme}] договор действительно записан в базу`,
			contractsAfter > contractsBefore,
			`договоров в базе ${contractsBefore} → ${contractsAfter}`,
		);
		/* Любая другая жалоба экрана — не про обязательные поля, но знать её надо. */
		const otherComplaint = screenText.match(/[^\n]*(?:не удалось|ошибка|Ошибка|нельзя|запрещ)[^\n]*/);
		check(`[${theme}] экран не жалуется ни на что другое`, otherComplaint === null, String(otherComplaint?.[0]).slice(0, 200));
		await page.screenshot({ path: `${OUT}/contract-created-${theme}.png`, fullPage: false });
		check(`[${theme}] экран без ошибок в консоли`, pageErrors.length === 0, pageErrors.join(" | "));
		await context.close();
	}
} finally {
	await browser.close();
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
