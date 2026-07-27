/**
 * Снимает экран целиком, во всю высоту страницы, а не только первый кадр.
 * Обычный снимок обрезает страницу на высоте окна, и блоки ниже сгиба
 * выглядят пустыми, хотя просто не влезли.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEW = process.env.VIEW || "patients";
const THEME = process.env.THEME || "light";
const OUT = "scratch/shots-full";
mkdirSync(OUT, { recursive: true });

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
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
const page = await context.newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st, th }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken, th: THEME },
);
await page.goto(`${WEB}/#${VIEW}`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const size = await page.evaluate(() => ({
	height: document.documentElement.scrollHeight,
	width: document.documentElement.scrollWidth,
}));
const file = `${OUT}/${VIEW}_${THEME}_full.png`;
await page.screenshot({ path: file, fullPage: true });
console.log(`${VIEW} ${THEME}: страница ${size.width}x${size.height}, кадр ${file}`);

/*
 * Длинную страницу целиком разглядеть нельзя: при сжатии до читаемого размера
 * текст пропадает. Поэтому режем на полосы по высоте окна — каждая полоса
 * читается в исходном масштабе.
 */
const sliceHeight = 1100;
const slices = Math.min(8, Math.ceil(size.height / sliceHeight));
for (let index = 0; index < slices; index += 1) {
	const top = index * sliceHeight;
	const height = Math.min(sliceHeight, size.height - top);
	if (height < 40) break;
	const sliceFile = `${OUT}/${VIEW}_${THEME}_${String(index + 1).padStart(2, "0")}.png`;
	await page.screenshot({
		path: sliceFile,
		clip: { x: 0, y: top, width: size.width, height },
		fullPage: true,
	});
	console.log(`  полоса ${index + 1}: ${top}..${top + height} → ${sliceFile}`);
}

await browser.close();
