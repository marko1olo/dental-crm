/**
 * Доказывает в ЖИВОМ браузере, что виджеты карточки пациента показывают
 * данные ПРЕДЫДУЩЕГО пациента после переключения.
 *
 * Проверяемый дефект: PatientCommunicationTimelineWidget (и ещё пять
 * виджетов) грузят данные в useEffect по patientId, но:
 *   - не сбрасывают состояние при смене пациента;
 *   - не отменяют устаревший ответ.
 * Плюс в этом виджете loading один раз становится false и больше никогда
 * не возвращается в true — то есть чужая переписка показывается без
 * всякого индикатора загрузки, как достоверные данные пациента.
 *
 * Два сценария:
 *   A. переключение A→B: что видно сразу после переключения;
 *   B. инверсия ответов (ответ по A приходит ПОСЛЕ ответа по B):
 *      чьи данные останутся на экране навсегда.
 *
 * Ответы подменяются на синтетические маркеры — живые данные пациентов
 * не читаются и не пишутся.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const MARKER_A = "МАРКЕР-ПЕРЕПИСКИ-ПАЦИЕНТА-А";
const MARKER_B = "МАРКЕР-ПЕРЕПИСКИ-ПАЦИЕНТА-Б";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function commEvent(patientId, summary) {
	return [
		{
			id: `synthetic-${patientId}`,
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId,
			channelType: "SMS",
			direction: "OUTBOUND",
			summary,
			staffName: "Проверка",
			timestamp: "2026-01-01T10:00:00.000Z",
		},
	];
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
const H = {
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const raw = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];
if (list.length < 2) {
	console.error("нужно минимум два пациента");
	process.exit(1);
}
const A = list[0];
const B = list[1];
console.log(`пациент А: ${A.fullName} (${A.id})`);
console.log(`пациент Б: ${B.fullName} (${B.id})\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" });
const page = await ctx.newPage();

// Медленным делается ответ по Б, а не по А: пациент А выбран уже при
// загрузке страницы, его запрос успевает завершиться до любого клика, и
// на нём гонку не построить. Порядок «клик Б (медленно) → сразу клик А
// (быстро)» даёт реальное перекрытие запросов.
let delayBms = 0;
await page.route("**/api/patients/*/communications", async (route) => {
	const url = route.request().url();
	const id = url.match(/\/api\/patients\/([^/]+)\/communications/)?.[1];
	const body = id === A.id ? commEvent(A.id, MARKER_A) : id === B.id ? commEvent(B.id, MARKER_B) : [];
	if (id === B.id && delayBms) await new Promise((r) => setTimeout(r, delayBms));
	await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});

await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const widget = page.locator('[data-testid="patient-communication-timeline-widget"]');

async function selectPatient(patient) {
	// Строго по строке списка слева. Поиск по тексту имени промахивался в
	// заголовок уже открытой карточки, и переключения не происходило —
	// из-за этого первая версия проверки ошибочно показала «дефекта нет».
	await page
		.locator(`.patient-row[aria-label="Карточка пациента: ${patient.fullName}"]`)
		.first()
		.click({ timeout: 8000 });
}

async function widgetText() {
	if ((await widget.count()) === 0) return "<виджета нет>";
	return (await widget.first().innerText()).replace(/\s+/g, " ").trim();
}

try {
	// ── сценарий A: устаревшие данные видны при переключении ───────────────
	delayBms = 4000;
	await selectPatient(A);
	await page.waitForTimeout(2500);
	const afterA = await widgetText();
	check("исходно на карточке А видна переписка А", afterA.includes(MARKER_A), afterA.slice(0, 90));

	// Переключаемся на Б. Ответ по Б идёт 4 секунды. Что показано всё это время?
	await selectPatient(B);
	await page.waitForTimeout(1200);
	const duringLoad = await widgetText();
	const showsStaleA = duringLoad.includes(MARKER_A);
	const showsLoading = duringLoad.includes("Загрузка истории коммуникаций");
	check(
		"во время загрузки карточки Б НЕ показывается переписка А",
		!showsStaleA,
		showsStaleA
			? `ДЕФЕКТ: на карточке Б видна переписка А, индикатор загрузки ${showsLoading ? "есть" : "ОТСУТСТВУЕТ"} — «${duringLoad.slice(0, 110)}»`
			: duringLoad.slice(0, 90),
	);

	// ── сценарий B: устаревший ответ перетирает актуальный ─────────────────
	// Ответ по Б медленный. Кликаем Б, затем сразу А: ответ по А приходит
	// первым и рисует карточку А, потом приходит ответ по Б и перетирает её.
	await page.waitForTimeout(5000); // дождаться оседания на Б
	await selectPatient(B);
	await page.waitForTimeout(250); // запрос по Б ушёл и висит
	await selectPatient(A); // мгновенный ответ по А
	await page.waitForTimeout(1500);
	const beforeStale = await widgetText();
	check(
		"промежуточно: на карточке А видна переписка А",
		beforeStale.includes(MARKER_A),
		beforeStale.slice(0, 90),
	);

	await page.waitForTimeout(6000); // медленный ответ по Б уже пришёл
	const finalText = await widgetText();
	const corrupted = finalText.includes(MARKER_B);
	check(
		"после прихода устаревшего ответа на карточке А осталась переписка А",
		!corrupted,
		corrupted
			? `ДЕФЕКТ: устаревший ответ по Б перетёр карточку А — «${finalText.slice(0, 110)}»`
			: finalText.slice(0, 90),
	);
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
