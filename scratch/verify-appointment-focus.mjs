/**
 * Проверяет, что кнопка «Создать запись» переводит фокус на ВИДИМЫЙ
 * элемент управления.
 *
 * Дефект: focusNewAppointmentEditor фокусировал первое поле блока
 * .appointment-create-editor — легаси-формы, скрытой через opacity 0,
 * размер 0 и pointer-events: none. Нажатие не меняло на экране ничего,
 * клавиатурный фокус пропадал в невидимом элементе, а программа чтения
 * с экрана начинала зачитывать поля, которых на экране нет.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "ru-RU" })).newPage();

try {
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await page.evaluate(
		({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#schedule`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4500);

	// Кнопка называется «Новая запись», а не «Создать запись» — первая
	// версия проверки искала несуществующий текст.
	const trigger = page.locator("button.primary-button", { hasText: /Новая запись/ }).first();
	const hasTrigger = (await trigger.count()) > 0;
	check("кнопка «Новая запись» найдена", hasTrigger, hasTrigger ? "" : "кнопки нет на экране");
	if (!hasTrigger) throw new Error("нечего нажимать");

	await trigger.click();
	await page.waitForTimeout(1200);

	const focus = await page.evaluate(() => {
		const el = document.activeElement;
		if (!el || el === document.body) return { none: true };
		const rect = el.getBoundingClientRect();
		let opacityZeroAncestor = null;
		for (let node = el; node; node = node.parentElement) {
			const s = getComputedStyle(node);
			if (Number.parseFloat(s.opacity) === 0) {
				opacityZeroAncestor = node.className?.toString?.().slice(0, 60) || node.tagName;
				break;
			}
		}
		return {
			tag: el.tagName.toLowerCase(),
			ariaLabel: el.getAttribute("aria-label"),
			placeholder: el.getAttribute("placeholder"),
			width: Math.round(rect.width),
			height: Math.round(rect.height),
			inHiddenEditor: !!el.closest(".appointment-create-editor"),
			opacityZeroAncestor,
		};
	});

	check("фокус куда-то ушёл", !focus.none, focus.none ? "остался на body" : `<${focus.tag}>`);
	check(
		"фокус НЕ в скрытой легаси-форме .appointment-create-editor",
		!focus.inHiddenEditor,
		focus.inHiddenEditor ? "ДЕФЕКТ: фокус в невидимом блоке" : "",
	);
	check(
		"элемент под фокусом имеет ненулевой размер",
		focus.width > 0 && focus.height > 0,
		`${focus.width}×${focus.height}`,
	);
	check(
		"над элементом нет предка с opacity: 0",
		!focus.opacityZeroAncestor,
		focus.opacityZeroAncestor ? `ДЕФЕКТ: предок «${focus.opacityZeroAncestor}» имеет opacity 0` : "",
	);
	console.log(
		`    фокус на: <${focus.tag}> ${focus.ariaLabel ? `aria-label="${focus.ariaLabel}"` : ""} ${focus.placeholder ? `placeholder="${focus.placeholder}"` : ""}`.trimEnd(),
	);
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
