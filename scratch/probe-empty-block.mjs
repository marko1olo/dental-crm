/**
 * Ищет на экране заметные пустые блоки: элементы с фоном и размером, но без
 * текста и без картинок. Такое пятно на экране — либо не отрисовавшийся
 * список, либо декоративная пустота, которая занимает место зря.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEW = process.env.VIEW || "patients";

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
const context = await browser.newContext({ viewport: { width: 1600, height: 1400 }, locale: "ru-RU" });
const page = await context.newPage();
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
await page.goto(`${WEB}/#${VIEW}`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const empties = await page.evaluate(() => {
	const found = [];
	for (const el of document.querySelectorAll("div, section, article, aside, ul, form")) {
		const rect = el.getBoundingClientRect();
		if (rect.width < 120 || rect.height < 80) continue;
		const text = (el.textContent || "").trim();
		if (text.length > 0) continue;
		if (el.querySelector("img, svg, canvas, video, input, button")) continue;
		const style = getComputedStyle(el);
		const background = style.backgroundColor;
		const transparent = background === "rgba(0, 0, 0, 0)" || background === "transparent";
		if (transparent && style.borderStyle === "none" && !style.backgroundImage.startsWith("linear")) continue;
		found.push({
			tag: el.tagName.toLowerCase(),
			cls: String(el.className).slice(0, 90),
			w: Math.round(rect.width),
			h: Math.round(rect.height),
			x: Math.round(rect.left),
			y: Math.round(rect.top),
			background,
			border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`.slice(0, 60),
			parent: el.parentElement ? `${el.parentElement.tagName.toLowerCase()}.${String(el.parentElement.className).slice(0, 60)}` : null,
		});
	}
	// Сначала самые крупные: они заметнее всего.
	return found.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 8);
});

console.log(`экран #${VIEW}: заметных пустых блоков ${empties.length}`);
for (const block of empties) {
	console.log(
		`  ${block.tag}.${block.cls}\n    ${block.w}x${block.h} в (${block.x},${block.y}) фон ${block.background} рамка ${block.border}\n    внутри ${block.parent}`,
	);
}

await browser.close();
