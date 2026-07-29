import { readFileSync } from "node:fs";

const odontogramRoutes = readFileSync(
	"apps/api/src/routes/odontogram.ts",
	"utf8",
);
const financeFamilyRoutes = readFileSync(
	"apps/api/src/routes/finance_family.ts",
	"utf8",
);
const odontogramModule = readFileSync(
	"apps/web/src/components/odontogram/OdontogramModule.tsx",
	"utf8",
);
const treatmentEstimator = readFileSync(
	"apps/web/src/components/odontogram/TreatmentEstimator.tsx",
	"utf8",
);
/*
 * ЗДЕСЬ ЧИТАЛСЯ apps/web/src/pages/FinancialDashboard.tsx — экран удалён.
 *
 * Это был фасад: он принимал пропс `metrics: FinancialMetrics`, которого не
 * производил никто во всём дереве, и его не импортировал ни один файл. Три
 * проверки ниже запрещали ему выдумывать демо-счёт; вместе с файлом запрещать
 * стало нечего. Ссылку на удалённый файл оставлять нельзя: readFileSync упал бы
 * с ENOENT и увёл бы проверку в отказ по несуществующей причине.
 *
 * ДОЛГ ИЗ ЭТОГО КОММЕНТАРИЯ ЗАКРЫТ ЗДЕСЬ. Его предыдущий автор описал верно:
 * скрипт падал выше, на чтении InvoiceSplitPaymentModal.tsx. Оба файла —
 * InvoiceSplitPaymentModal.tsx (193 строки + CSS) и ThermalReceiptSimulator.tsx
 * (76 строк + CSS) — удалены коммитом c4f2b9240 от 16.07.2026 как мёртвый код,
 * а их чтения и пять проверок остались лежать. Замерено 29.07.2026: страж
 * падал с ENOENT на строке 19 и не доходил НИ ДО ОДНОЙ из своих двадцати
 * проверок тринадцать дней — ни тенантность одонтограммы, ни атомарность плана
 * лечения, ни семейный кошелёк не были защищены ничем.
 *
 * ВАЖНО ДЛЯ СЛЕДУЮЩЕГО ЧИТАТЕЛЯ: путь здесь собран ВЕРНО, и поломка была не в
 * сборке пути. Истинный текст ошибки —
 * `ENOENT ... 'C:\Clinic_MVP\dental-crm\apps\web\src\pages\InvoiceSplitPaymentModal.tsx'`,
 * с правильными разделителями. В отчёте цикла 24 он приведён как
 * «dental-crmpps\web\...», и это артефакт чтения лога, а не путь: в объекте
 * ошибки Node печатает путь с ДВОЙНЫМИ обратными слэшами, и слой, который
 * трактует `\a` как escape-последовательность (BEL, 0x7), съедает букву «a» у
 * «apps». Отсюда и «dental-crm» + «pps». Диагноз «путь собран сложением строк
 * вместо path.join» неверен: в этом файле нет ни одной конкатенации пути.
 */

/*
 * ПРОВЕРКА ЗАГОЛОВКОВ ПЕРЕЕХАЛА НА ЖИВОЙ ЭКРАН, А НЕ ИСЧЕЗЛА.
 *
 * Две проверки удалённого InvoiceSplitPaymentModal требовали, чтобы платёжный
 * экран посылал тенантные заголовки на чтении и на записи. Требование настоящее,
 * и у него есть живой владелец: FamilyWalletPanel.tsx — это UI-клиент РОВНО тех
 * маршрутов finance_family, которые этот страж уже проверяет со стороны сервера
 * (`/api/finance/family/patient/:id`, `/api/finance/family/pay`). Перенос делает
 * стража симметричным: маршрут и его клиент проверяются вместе. Стереть эти две
 * проверки вместе с файлом значило бы снять требование, у которого субъект есть.
 */
const familyWalletPanel = readFileSync(
	"apps/web/src/components/finance/FamilyWalletPanel.tsx",
	"utf8",
);

/*
 * ЧЕК: СУБЪЕКТОМ ТРЁХ ПРОВЕРОК БЫЛ МОК, ЖИВОЙ ВЛАДЕЛЕЦ — СЕРВЕРНЫЙ РЕНДЕР.
 *
 * ThermalReceiptSimulator был экраном-симулятором, то есть ровно тем, что
 * запрещает `.agents/AGENTS.md` пунктом 2 (ZERO MOCKS): его никто не
 * импортировал, и удалён он верно. Настоящий кассовый чек в продукте есть и
 * живёт документом `payment_receipt` (реестр документов, пункт 16): он
 * рендерится сервером в apps/api/src/documents/renderDocument.ts. Поэтому
 * требование «видимая финансовая копия читаема по-русски» перенесено на живого
 * владельца, а не удалено — иначе поле `visibleFinanceCopyReadable` в выводе
 * этого стража стало бы ложью без субъекта.
 *
 * ЗАПРЕТ МОДЖИБАКЕ («????») НЕ ПОТЕРЯН: с 28.07.2026 он машинный и общий —
 * `npm run check:encoding` (scripts/check-encoding.mjs), подключённый в
 * `npm run lint`. Он проверяет весь репозиторий на невалидный UTF-8, BOM,
 * UTF-16, U+FFFD и cp1252-моджибаку, то есть строго больше, чем поиск «????» в
 * одном удалённом файле.
 */
const paymentReceiptRender = readFileSync(
	"apps/api/src/documents/renderDocument.ts",
	"utf8",
);

/*
 * ОТКАЗЫ СОБИРАЮТСЯ, А НЕ БРОСАЮТСЯ НА ПЕРВОМ.
 *
 * Прежний assert бросал сразу, поэтому страж показывал ровно одну причину из
 * двадцати и следующий читатель не мог отличить «сломан один пункт» от «сломано
 * всё». Именно так этот страж и прожил тринадцать дней: ENOENT на девятнадцатой
 * строке скрывал состояние всех проверок. Идиом взят у соседей по каталогу —
 * smoke-telegram-control-ui-source.mjs, smoke-workspace-shell-source.mjs и
 * smoke-communications-view-source.mjs собирают список и печатают его целиком.
 */
const failures = [];
let checksRun = 0;

function assert(condition, message) {
	checksRun += 1;
	if (!condition) failures.push(message);
}

function requireIn(source, needle, message) {
	assert(source.includes(needle), message);
}

function forbidIn(source, needle, message) {
	assert(!source.includes(needle), message);
}

/*
 * ПОЧЕМУ НУЖЕН СОПОСТАВИТЕЛЬ, НЕЧУВСТВИТЕЛЬНЫЙ К ПЕРЕНОСАМ СТРОК.
 *
 * Замерено 29.07.2026: после того как страж перестал падать с ENOENT, из его
 * проверок вызовов не прошла НИ ОДНА — и ни одна не была настоящим дефектом.
 * Причина одна: needle написан одной строкой, а Biome перенёс аргументы
 * вызовов. В исходнике сейчас
 *   const organizationId = await requireResolvedOrganizationId(
 *     request,
 *     reply,
 *     "tooth states read",
 *   );
 * то есть тенантная проверка на месте, а `includes` одной строкой её не видит.
 * Заодно проект перешёл с 'Content-Type' на "Content-Type" — второй слой той же
 * порчи.
 *
 * Подгонять needle под сегодняшнюю раскладку переносов бессмысленно: следующий
 * прогон форматтера снова сделает стража красным на верном коде, а красного
 * стража перестают читать. Поэтому сравнение идёт регулярным выражением, где
 * между токенами вызова разрешён любой пробел и допускается висячая запятая,
 * которую Biome ставит перед закрывающей скобкой.
 *
 * ЭТО НЕ ОСЛАБЛЕНИЕ ТРЕБОВАНИЯ: имя функции, порядок аргументов и строковая
 * метка аудита по-прежнему обязательны точно. Убрать вызов или переименовать
 * метку — страж падает.
 */
function callPattern(expression) {
	// Пробелы автора значения не имеют: они лишь разбивают выражение на токены,
	// между которыми разрешён любой пробел, включая перенос строки с отступом.
	const tokens = expression
		.split(/\s+/)
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("\\s*");
	const flexible = tokens
		// перенос перед точкой: `tx\n\t.delete(...)` — форма Biome для цепочек
		.replace(/\\\./g, "\\s*\\.")
		// после открывающей скобки Biome переносит первый аргумент или ключ
		.replace(/(\\[({])/g, "$1\\s*")
		// перед закрывающей — ставит висячую запятую и перенос
		.replace(/(\\[)}])/g, "(?:\\s*,)?\\s*$1");
	return new RegExp(flexible);
}

function requireCallIn(source, expression, message) {
	assert(callPattern(expression).test(source), message);
}

requireCallIn(
	odontogramRoutes,
	'requireResolvedOrganizationId(request, reply, "tooth states read")',
	"Tooth-state reads must require tenant auth.",
);
requireCallIn(
	odontogramRoutes,
	'requireResolvedStaffOrAdminOrganizationId(request, reply, "tooth states update")',
	"Tooth-state writes must require staff/admin tenant auth.",
);
requireCallIn(
	odontogramRoutes,
	"ensurePatientInOrganization(patientId, organizationId)",
	"Odontogram routes must verify the patient belongs to the tenant.",
);
/*
 * НАСТОЯЩИЙ ДЕФЕКТ ПРОДУКТА, А НЕ ПОЛОМКА СТРАЖА. НЕ СНИМАТЬ ЭТУ ПРОВЕРКУ.
 *
 * Проверено 29.07.2026 по живому коду. Требование верное, и продукт его не
 * выполняет: apps/api/src/routes/odontogram.ts рассылает обновление
 * одонтограммы через `wsBroker.broadcastToOrganization(organizationId, {...})`
 * с payload `{ patientId, states: inserted }` — то есть состояния зубов
 * КОНКРЕТНОГО пациента уходят ВСЕМ сокетам клиники.
 *
 * Узкий канал существует и протестирован: services/websocketBroker.ts:44
 * `broadcastToPatient(organizationId, patientId, message)` фильтрует по
 * `client.patientId === patientId`, а tests/websocketBroker.test.ts:87 проверяет,
 * что доставка идёт только подписке на этого пациента этой клиники. Подписки с
 * patientId в продакшене реальны: websocket.ts:142 передаёт patientId в
 * addClient. Значит сокет, подписавшийся на пациента B, получает одонтограмму
 * пациента A.
 *
 * Граница честности: сокет авторизуется clinicToken/staffToken, а patientId
 * заявляется клиентом и на авторизацию не влияет. Поэтому это дефект области
 * рассылки внутри клиники, и утечку за пределы клиники он НЕ доказывает.
 *
 * Правка — не в этом пакете: она в продукте, в чужом файле. Страж остаётся
 * красным законно и указывает на настоящую причину.
 *
 * КООРДИНАТЫ В СООБЩЕНИИ БОЛЬШЕ НЕ ХРАНЯТСЯ. Раньше требование называло
 * «odontogram.ts:341», и к 29.07.2026 номер уехал: рассылка стоит на строке 426,
 * а на 341 лежит разбор тела запроса. Страж, отправляющий читателя не на ту
 * строку, обесценивает верный диагноз, поэтому место дефекта теперь ищется в
 * файле на месте прогона, а не переписывается руками. Путь к брокеру в
 * комментарии выше тоже был неполон (services/ пропущен) — проверено: файла
 * apps/api/src/websocketBroker.ts не существует.
 */
const broadcastLine = odontogramRoutes
	.slice(0, odontogramRoutes.indexOf("wsBroker.broadcastToOrganization"))
	.split("\n").length;
requireCallIn(
	odontogramRoutes,
	"wsBroker.broadcastToPatient(organizationId, patientId",
	`Odontogram websocket updates must stay tenant/patient scoped: odontogram.ts:${broadcastLine} still uses broadcastToOrganization, so one patient's tooth states reach every clinic socket.`,
);
requireCallIn(
	odontogramRoutes,
	"await db.transaction(async (tx) =>",
	"Treatment-plan upserts must be atomic.",
);
requireCallIn(
	odontogramRoutes,
	"await tx.delete(treatmentPlanItemsNew).where(eq(treatmentPlanItemsNew.planId, savedPlanId))",
	"Treatment-plan item replacement must be inside the transaction.",
);
requireIn(
	odontogramRoutes,
	"TreatmentPlanValidationError",
	"Treatment-plan route must keep validation error contract.",
);

requireCallIn(
	financeFamilyRoutes,
	'requireResolvedOrganizationId(req, reply, "family finance read")',
	"Family-wallet reads must require tenant auth.",
);
requireCallIn(
	financeFamilyRoutes,
	'requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance payment")',
	"Family-wallet payments must require staff/admin tenant auth.",
);
requireIn(
	financeFamilyRoutes,
	"eq(patients.organizationId, organizationId)",
	"Family-wallet patient lookup must be tenant scoped.",
);
requireIn(
	financeFamilyRoutes,
	"db.transaction(async (tx) =>",
	"Family-wallet payment must be transactional.",
);
requireIn(
	financeFamilyRoutes,
	"wsBroker.broadcastToOrganization(organizationId",
	"Family-wallet websocket updates must be organization scoped.",
);

requireIn(
	odontogramModule,
	"fetch(`/api/patients/${patientId}/tooth-states`,",
	"Odontogram UI must load tooth states from the API.",
);
requireCallIn(
	odontogramModule,
	'denteAdminSecretRequestHeaders({ "Content-Type": "application/json" })',
	"Odontogram UI writes must send tenant/session headers.",
);
requireIn(
	treatmentEstimator,
	"fetch(`/api/patients/${patientId}/treatment-plans`,",
	"Treatment estimator must load saved plans from the API.",
);
requireCallIn(
	treatmentEstimator,
	'denteAdminSecretRequestHeaders({ "Content-Type": "application/json" })',
	"Treatment estimator writes must send tenant/session headers.",
);
// Две проверки удалённого InvoiceSplitPaymentModal переехали на живой
// UI-клиент маршрутов finance_family — см. комментарий у чтения файла.
requireIn(
	familyWalletPanel,
	'fetch(`/api/finance/family/patient/${patientId}`',
	"Family-wallet UI must read the wallet from the tenant-scoped API route.",
);
requireIn(
	familyWalletPanel,
	"headers: denteAdminSecretRequestHeaders(),",
	"Family-wallet UI reads must send tenant/session headers.",
);
requireIn(
	familyWalletPanel,
	'fetch("/api/finance/family/pay"',
	"Family-wallet UI must post payments to the tenant-scoped API route.",
);
requireIn(
	familyWalletPanel,
	"headers: denteAdminSecretRequestHeaders({",
	"Family-wallet UI writes must send tenant/session headers.",
);

// Три проверки про FinancialDashboard удалены вместе с экраном: они запрещали
// ему выдумывать демо-счёт, а выдумывать теперь некому.
// Три проверки про ThermalReceiptSimulator переехали на серверный рендер
// документа payment_receipt — см. комментарий у чтения файла.
requireIn(
	paymentReceiptRender,
	"payment_receipt: paymentReceipt(document, context)",
	"Cash receipt must stay wired into the document render table.",
);
requireIn(
	paymentReceiptRender,
	"Платежный документ требует номер фискального чека в каждом включенном платеже.",
	"Receipt render must keep readable Russian copy for the fiscal-receipt requirement.",
);

if (failures.length) {
	console.error(
		JSON.stringify(
			{
				ok: false,
				checksRun: checksRun,
				failed: failures.length,
				failures,
			},
			null,
			2,
		),
	);
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			checksRun: checksRun,
			odontogramTenantScoped: true,
			treatmentPlanAtomic: true,
			familyWalletTenantScoped: true,
			visibleFinanceCopyReadable: true,
		},
		null,
		2,
	),
);
