/**
 * Почему закреплённые элементы не прибиты к экрану на мобильном.
 *
 * Замер: плашка поиска и голосовые кнопки на экране 390x844 оказываются на
 * y=1500, то есть ниже окна. Значит position:fixed считается не от окна, а
 * от предка, который создаёт для них контейнерный блок. Такой блок создают
 * transform, filter, backdrop-filter, perspective, will-change, contain и
 * содержащий их фильтр.
 *
 * Скрипт печатает цепочку предков с теми свойствами, которые это делают.
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
	const context = await browser.newContext({
		viewport: { width: vw, height: vh },
		isMobile: vw < 700,
		hasTouch: vw < 700,
		locale: "ru-RU",
	});
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
	await page.goto(`${WEB}/#imaging`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3500);

	const info = await page.evaluate(() => {
		const target = document.querySelector(".omnibar-trigger-btn");
		if (!target) return { missing: true };
		const creators = [];
		for (let n = target.parentElement; n; n = n.parentElement) {
			const s = getComputedStyle(n);
			const reasons = [];
			if (s.transform && s.transform !== "none") reasons.push(`transform: ${s.transform.slice(0, 40)}`);
			if (s.filter && s.filter !== "none") reasons.push(`filter: ${s.filter.slice(0, 40)}`);
			if (s.backdropFilter && s.backdropFilter !== "none") reasons.push(`backdrop-filter: ${s.backdropFilter.slice(0, 40)}`);
			if (s.perspective && s.perspective !== "none") reasons.push(`perspective: ${s.perspective}`);
			if (s.willChange && s.willChange !== "auto") reasons.push(`will-change: ${s.willChange}`);
			if (s.contain && s.contain !== "none") reasons.push(`contain: ${s.contain}`);
			if (s.containerType && s.containerType !== "normal") reasons.push(`container-type: ${s.containerType}`);
			if (reasons.length === 0) continue;
			const r = n.getBoundingClientRect();
			creators.push({
				tag: n.tagName.toLowerCase(),
				cls: (n.className?.toString?.() || "").slice(0, 70),
				h: Math.round(r.height),
				bottom: Math.round(r.bottom),
				reasons,
			});
		}
		const r = target.getBoundingClientRect();
		return {
			viewport: { w: window.innerWidth, h: window.innerHeight },
			pill: { y: Math.round(r.y), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) },
			pinnedToScreen: Math.abs(r.bottom - window.innerHeight) < 60,
			creators,
		};
	});

	console.log(`\n############ окно ${vw}x${vh} ############`);
	if (info.missing) {
		console.log("  плашки поиска на экране нет");
	} else {
		console.log(`  плашка поиска: ${info.pill.w}x${info.pill.h} при y=${info.pill.y}, низ ${info.pill.bottom}`);
		console.log(`  прибита к экрану: ${info.pinnedToScreen ? "да" : "НЕТ"}`);
		console.log(`  предков, создающих контейнерный блок: ${info.creators.length}`);
		for (const c of info.creators) {
			console.log(`     <${c.tag} class="${c.cls}"> высота ${c.h}, низ ${c.bottom}`);
			for (const reason of c.reasons) console.log(`         ${reason}`);
		}
	}
	await context.close();
}
await browser.close();
