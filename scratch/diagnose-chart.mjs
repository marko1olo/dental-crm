/**
 * Измеряет зубную карту в браузере: сколько зубов реально видно, влезает ли
 * дуга в контейнер, и отображаются ли сохранённые статусы.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import pg from "pg";

const API = "http://127.0.0.1:4100";
const WEB = "http://127.0.0.1:5173";
const databaseUrl = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

const clinicRes = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const { clinicToken, clinicProfile } = await clinicRes.json();
const orgId = clinicProfile.organizationId;

const c = new pg.Client({ connectionString: databaseUrl });
await c.connect();
const staff = await c.query(
	`select id from users where organization_id=$1 and is_active=true
	   and pin_code_hash is not null order by full_name limit 1`,
	[orgId],
);
const patients = await c.query(
	`select id, full_name from patients where organization_id=$1 order by full_name`,
	[orgId],
);

let staffToken = null;
for (const pinCode of ["0000", "1234"]) {
	const res = await fetch(`${API}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({ userId: staff.rows[0].id, pinCode }),
	});
	if (res.ok) {
		staffToken = (await res.json()).staffToken;
		break;
	}
}

// Пишем статусы КАЖДОМУ пациенту, чтобы не зависеть от того, кого выберет UI.
for (const p of patients.rows) {
	for (const [teeth, state, surfaces] of [
		[[36], "Caries", ["O", "M"]],
		[[11, 21], "Crown", null],
		[[46], "Implant", null],
		[[17], "Missing", null],
		[[24], "Pulpitis", ["D"]],
		[[38], "Caries", null],
	]) {
		await fetch(`${API}/api/patients/${p.id}/tooth-states/batch`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			body: JSON.stringify({
				toothNumbers: teeth,
				state,
				...(surfaces ? { surfaces } : {}),
			}),
		});
	}
}
await c.end();
console.log(`статусы записаны всем ${patients.rows.length} пациентам`);

const browser = await chromium.launch();
for (const vp of [
	{ name: "pc", width: 1440, height: 900 },
	{ name: "mobile", width: 390, height: 844 },
]) {
	const context = await browser.newContext({ viewport: vp });
	const page = await context.newPage();
	await page.addInitScript(
		([clinic, staffTok]) => {
			localStorage.setItem("dente_clinic_token", clinic);
			localStorage.setItem("dente_staff_token", staffTok);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true }),
			);
		},
		[clinicToken, staffToken],
	);
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(7000);

	const report = await page.evaluate(() => {
		const container = document.querySelector(".tooth-chart-container");
		if (!container) return { error: "карта не найдена" };
		const cRect = container.getBoundingClientRect();
		// Зубы ищем по узлам, у которых есть номер зуба в тексте или в data-атрибуте.
		const teeth = [...container.querySelectorAll("svg")].map((el) => {
			const r = el.getBoundingClientRect();
			return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
		});
		const insideCount = teeth.filter(
			(t) => t.left >= cRect.left - 1 && t.right <= cRect.right + 1,
		).length;
		const numbers = [...container.querySelectorAll("*")]
			.filter((el) => el.children.length === 0 && /^\d{2}$/.test(el.textContent?.trim() ?? ""))
			.map((el) => el.textContent.trim());
		// Есть ли вообще цветная заливка — признак отрисовки статусов.
		const colored = [...container.querySelectorAll("path,circle,rect,line")].filter(
			(el) => {
				const f = el.getAttribute("fill") ?? "";
				const s = el.getAttribute("stroke") ?? "";
				return /#(dc|ef|f5|0f|0e|d9|fb|f9|a|b|c)/i.test(f + s) && f !== "none";
			},
		).length;
		return {
			containerWidth: Math.round(cRect.width),
			scrollWidth: container.scrollWidth,
			clientWidth: container.clientWidth,
			overflowX: getComputedStyle(container).overflowX,
			svgCount: teeth.length,
			svgFullyInside: insideCount,
			toothNumbersRendered: numbers.length,
			toothNumbers: numbers.join(","),
			colouredShapes: colored,
		};
	});
	console.log(`\n--- ${vp.name} ${vp.width}x${vp.height} ---`);
	for (const [k, v] of Object.entries(report)) console.log(`  ${k}: ${v}`);
	await context.close();
}
await browser.close();
