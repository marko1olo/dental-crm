/**
 * Что за круглые элементы обрезаны в правом нижнем углу и почему.
 *
 * На скриншотах обоих тем два тёмных круга наполовину уходят за нижнюю
 * границу окна и перекрываются плашкой «Поиск (Cmd+K)». Элемент относится к
 * оболочке, значит виден на каждом экране.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

async function req(path, init = {}, attempts = 12) {
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
for (const [vw, vh] of [
	[1600, 1100],
	[390, 844],
]) {
const page = await (await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: vw < 700, hasTouch: vw < 700, locale: "ru-RU" })).newPage();
try {
	console.log(`\n############ окно ${vw}x${vh} ############`);
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
	await page.goto(`${WEB}/#imaging`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3500);

	const found = await page.evaluate(() => {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const out = [];
		for (const el of document.querySelectorAll("body *")) {
			const s = getComputedStyle(el);
			if (s.position !== "fixed" && s.position !== "sticky") continue;
			const r = el.getBoundingClientRect();
			if (r.width < 8 || r.height < 8) continue;
			// Интересует нижняя часть экрана.
			if (r.bottom < vh - 320) continue;
			out.push({
				tag: el.tagName.toLowerCase(),
				cls: (el.className?.toString?.() || "").slice(0, 70),
				aria: el.getAttribute("aria-label") || "",
				title: el.getAttribute("title") || "",
				text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
				x: Math.round(r.x),
				y: Math.round(r.y),
				w: Math.round(r.width),
				h: Math.round(r.height),
				right: Math.round(r.right),
				bottom: Math.round(r.bottom),
				overflowsBottom: Math.round(r.bottom - vh),
				overflowsRight: Math.round(r.right - vw),
				zIndex: s.zIndex,
				position: s.position,
			});
		}
		return { vw, vh, out };
	});

	console.log(`закреплённых элементов у низа экрана: ${found.out.length}\n`);
	for (const f of found.out) {
		console.log(`<${f.tag}> «${f.aria || f.title || f.text || "без подписи"}»`);
		console.log(`   class="${f.cls}"`);
		console.log(`   ${f.w}x${f.h} при x=${f.x} y=${f.y}, правый край ${f.right}, низ ${f.bottom}, z-index=${f.zIndex}`);
	}

	// Перекрытия: два закреплённых элемента не должны налезать друг на друга.
	console.log("\nперекрытия:");
	let overlaps = 0;
	for (let i = 0; i < found.out.length; i += 1) {
		for (let j = i + 1; j < found.out.length; j += 1) {
			const a = found.out[i];
			const b = found.out[j];
			const dx = Math.min(a.right, b.right) - Math.max(a.x, b.x);
			const dy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
			if (dx > 2 && dy > 2) {
				overlaps += 1;
				const nameA = a.aria || a.title || a.text || a.cls.slice(0, 30);
				const nameB = b.aria || b.title || b.text || b.cls.slice(0, 30);
				console.log(`   «${nameA}» и «${nameB}» пересекаются на ${dx}x${dy}px`);
			}
		}
	}
	if (!overlaps) console.log("   нет");
} finally {
	await page.context().close();
}
}
await browser.close();
