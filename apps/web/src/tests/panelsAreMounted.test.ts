import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	componentReachability,
	isMounted,
	webSrcRoot,
} from "./utils/componentReachability";

/**
 * Страж: панель или раздел, которых никто не отрисовывает, — это несделанная работа.
 *
 * ЧТО СЛУЧИЛОСЬ В ПЕРВЫЙ РАЗ. Панель утреннего обзвона и панель отчётов
 * руководителю были добавлены в AppRouter.tsx. Файл выглядел как маршрутизатор
 * приложения: импортировал представления, переключал их по currentView, лежал
 * рядом с App.tsx. Его НЕ ИМПОРТИРОВАЛ НИКТО — разделы отрисовывает App.tsx.
 * Обе панели прошли typecheck, прошли сборку, прошли тесты оформления — и не
 * появлялись на экране вообще. Выяснилось только на снимке живого приложения,
 * то есть могло не выясниться никогда.
 *
 * ЧТО СЛУЧИЛОСЬ ВО ВТОРОЙ РАЗ, ХОТЯ ЭТОТ ФАЙЛ УЖЕ СУЩЕСТВОВАЛ. Той же дорогой
 * ушли три целых раздела: склад (1487 строк), журнал стерилизации и воронка
 * обращений. Они были подключены только в том же мёртвом AppRouter.tsx, а в
 * реестре workspaceShell.appViews их не было — значит, и по адресу #inventory
 * приложение откатывалось на «Смену».
 *
 * ЧТО СЛУЧИЛОСЬ В ТРЕТИЙ РАЗ. Из PatientsView.tsx вынесли пять форм, в тот же
 * день удалили как мёртвый код, а следующий слепой `chore: sync` вернул в дерево
 * две. Одна из вернувшихся была НАДМНОЖЕСТВОМ смонтированной: пять полей
 * реквизитов существовали в схеме, в колонке, в черновике, в запросе и в
 * валидаторе, а ввести их было нечем ни на одном экране. Прежняя редакция этого
 * стража проверяла ПОИМЁННЫЙ список из семи панелей — перечень этих имён не
 * знал, и искать было нечего.
 *
 * ПОЧЕМУ ТЕПЕРЬ ПЕРЕПИСЬ, А НЕ СПИСОК. Поимённый список структурно не способен
 * заметить файл, которого в списке нет, — а именно так дефект приходит каждый
 * раз. Здесь берётся полная перепись компонентов
 * (tests/utils/componentReachability.ts, разбор @babel/parser) и проверяется
 * обратное утверждение: НИ ОДИН компонент apps/web/src не остаётся
 * несмонтированным, кроме прямо перечисленных ниже. Семь бывших имён списка
 * покрыты этим утверждением как частный случай.
 *
 * ЧЕМ ЭТО ЗАМЕНИЛО ВНЕШНЕГО СТРАЖА. В дереве жил третий владелец того же
 * инварианта — scripts/check-component-mount-reachability.mjs с правилами
 * ast-grep. Он удалён вместе с правилами и своим тестом, и вот почему:
 *   1. перепись у него была ложной по построению. Шаблон
 *      `export const $NAME = ($$$PARAMS) => $$$BODY` не совпадает, если на имени
 *      стоит аннотация типа, а `export const X: React.FC = () => {}` — вторая по
 *      частоте форма в этом дереве (34 объявления на день удаления). Он не видел ни
 *      pages/PublicBookingWidget.tsx, ни components/plan/ComparativePlannerDashboard.tsx
 *      — ровно те две сироты, что нашлись руками;
 *   2. пустая причина в его списке исключений гасила нарушение: объект записи
 *      был проверкой на истинность, а сама причина не проверялась, и
 *      `{ path: "apps/web/src", reason: "" }` четырьмя строками глушил все
 *      нарушения сразу, потому что путь сравнивался по префиксу;
 *   3. он не был подключён ни к одному гейту — ни в package.json, ни в CI, а его
 *      собственный тест шёл 4 м 33 с и не запускался ничем.
 * Проверка ниже живёт внутри `npm test -w @dental/web`, разбирает всё дерево за
 * секунды (замер печатается тестом «перепись не выродилась») и сравнивает пути
 * ЦЕЛИКОМ, а не по префиксу: запись про один файл не может погасить другой.
 *
 * Раздел живёт ровно в трёх местах, и все три обязательны:
 *   workspaceShell.appViews  — иначе viewFromHash() не пустит по адресу;
 *   App.tsx currentView === — иначе открывать нечего;
 *   workspacePreload.ts      — иначе Vite грузит модуль на лету, с прыжком вёрстки.
 */

/** Ключ компонента в переписи: путь от apps/web/src и имя объявления. */
function keyOf(component: { readonly file: string; readonly name: string }): string {
	return `${component.file}:${component.name}`;
}

/**
 * ЗАЯВЛЕННЫЙ ДОЛГ: компонент лежит в дереве, и его сознательно никто не
 * отрисовывает.
 *
 * Запись здесь — НЕ разрешение и не «подключим потом». Она означает: причина
 * проверена по живым строкам и записана, а подключение — отдельная работа с
 * отдельным решением. Общая причина вроде «нужно доработать» здесь хуже, чем
 * отсутствие записи: она гасит стража, ничего не сообщая. Тест ниже требует,
 * чтобы причина была непустой и содержательной, чтобы файл существовал и чтобы
 * компонент действительно оставался несмонтированным.
 */
const DECLARED_UNMOUNTED: ReadonlyArray<{
	readonly file: string;
	readonly name: string;
	readonly reason: string;
}> = [
	{
		file: "components/plan/ComparativePlannerDashboard.tsx",
		name: "ComparativePlannerDashboard",
		reason:
			"Сравнительный конструктор смет: несколько альтернативных планов рядом, " +
			"покрытие ДМС, жизненный цикл «утвердить / архивировать / восстановить», " +
			"печать и выгрузка CSV. Адреса на сервере рабочие " +
			"(GET/POST /api/patients/:patientId/treatment-plans, GET /api/insurance/contracts), " +
			"и он единственный читатель очереди pendingPlanSuggestions, которую наполняет " +
			"смонтированная зубная формула, — то есть мост «диагноз → смета» сейчас оборван. " +
			"Подключать всё равно нельзя, осталось три проверенных блокера:\n" +
			"1. Смена статуса плана (updatePlanStatus, :243) отправляет запрос без названия, " +
			"а серверная схема apps/api/src/routes/odontogram.ts:120-125 не знает поля status " +
			"вообще и подставляет name по умолчанию «Комплексный план лечения». Каждая кнопка " +
			"статуса молча ПЕРЕИМЕНОВЫВАЕТ план и статус не сохраняет.\n" +
			"2. Статус в базе хранится строчными (schema.ts:1404, default «draft»), а экран " +
			"сравнивает с «Draft» (:48, :120, :976-980, :1241): у загруженного плана не видно " +
			"ни подписи статуса, ни кнопок жизненного цикла.\n" +
			"3. Полис ДМС берётся первым из списка договоров клиники (contractsArray[0], :227) " +
			"и применяется любому пациенту, хотя связи «пациент → договор» в схеме нет: " +
			"пациенту могут назвать скидку по чужому полису.\n" +
			"Денежный блокер снят коммитом a37f358aa: пять захардкоженных сумм и чтение " +
			"несуществующего поля priceRub вместо basePriceRub убраны, расчёт вынесен в " +
			"components/plan/planPricing.ts и закреплён src/tests/planPricing.test.ts. " +
			"Вдобавок точка монтирования и POST-адрес общие с TreatmentEstimator, который уже " +
			"смонтирован в components/odontogram/OdontogramModule.tsx, — разграничение двух " +
			"планировщиков решает ведущий, а не этот файл.",
	},
	{
		file: "pages/PublicBookingWidget.tsx",
		name: "PublicBookingWidget",
		reason:
			"Онлайн-запись пациента с сайта клиники: три шага (врач → дата и свободное " +
			"время → ФИО, телефон, комментарий), состояния загрузки, ошибки и пустоты на " +
			"каждом шаге, человеческий текст вместо кодов, разбор 409 «время только что " +
			"заняли» с возвратом на выбор времени и перезапросом слотов, дата собирается по " +
			"МЕСТНОМУ времени пациента (иначе ночью в UTC+4 клиника выглядела закрытой). " +
			"Адреса на сервере живые: apps/api/src/server.ts:457 регистрирует префикс " +
			"/api/public/booking, и apps/api/src/tests/webCallsExistingRoutes.test.ts:110 " +
			"держит его в списке зарегистрированных. Удалять работающую функцию, которую " +
			"продукт хочет, ради зелёного стража нельзя.\n" +
			"Почему не подключён: это экран, который открывает ПАЦИЕНТ, а не клиника.\n" +
			"ТЕХНИЧЕСКИЙ блокер СНЯТ вместе с монтированием портала зуботехника: развилка " +
			"публичного контура в main.tsx теперь есть, разбор адреса живёт в " +
			"lib/publicPortalRoute.ts (закрыт src/tests/publicPortalRoute.test.ts), и в " +
			"публичной ветке installApiAuthFetch() не вызывается — клинические токены наружу " +
			"не уходят. То есть вторая точка входа Vite и rollupOptions.input больше не нужны: " +
			"дописать в publicPortalRouteFromHash() второй вид адреса — работа на один разбор.\n" +
			"Что осталось и почему это НЕ технический вопрос: у виджета не решено, по какому " +
			"адресу клиника его раздаёт и какая клиника подразумевается. Публичный маршрут " +
			"сервера ждёт :organizationId в ПУТИ (apps/api/src/server.ts:457 регистрирует " +
			"префикс /api/public/booking), а идентификатора своей организации в клиенте нет: " +
			"тот же блокер уже описан на месте удалённой QrGatewayPanel ниже — ключ " +
			"dente_organization_id без единого писателя и DENTE_PUBLIC_BASE_URL, который " +
			"клиенту не отдаётся. Пока адрес клиники не доходит до браузера, виджет " +
			"смонтировать некуда: он либо покажет расписание не той клиники, либо ничего. " +
			"Это решение продукта об анонимном доступе, а не правка этого файла.",
	},
];

/**
 * НАСЛЕДИЕ НА РАЗБОР: компоненты, которые уже лежали несмонтированными, когда
 * перепись впервые их увидела.
 *
 * ЗАЧЕМ ЭТО ОТДЕЛЬНЫЙ СПИСОК, А НЕ ТОТ ЖЕ. Здесь СОЗНАТЕЛЬНО НЕТ поля причины.
 * Тридцать три ненаписанных причины были бы отпиской на тридцать три строки, а
 * отписка гасит стража ровно так же, как пустая строка в удалённом внешнем
 * страже. Список говорит правду: эти файлы никто не разбирал. Он существует
 * только для того, чтобы СЛЕДУЮЩАЯ сирота не спряталась среди старых, и он
 * работает в одну сторону — тест ниже запрещает ему расти. Новый
 * несмонтированный компонент идёт в DECLARED_UNMOUNTED с проверенной причиной
 * либо подключается; дописать его сюда нельзя.
 *
 * Что здесь видно из самой переписи, без дополнительных утверждений: отдельный
 * владелец есть у components/documents/DocumentUkepSignButton.tsx — он записан
 * исключением с причиной в src/tests/documentsViewDecomposition.test.ts, и обе
 * проверки теперь говорят о нём одно и то же.
 *
 * Одиннадцать записей семишагового мастера первого запуска — OnboardingPreview,
 * OnboardingSetupWizard, семь шагов и два блока SharedOnboardingUI — из списка
 * УШЛИ вместе с файлами. Разбор ветки и таблица замен по каждому шагу стоят ниже,
 * на месте, где были их строки долга.
 */
const LEGACY_UNMOUNTED_BACKLOG: readonly string[] = [
	/*
	 * GuestLabPortal СМОНТИРОВАН, поэтому строки здесь больше нет.
	 *
	 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Регистратура нажимала «Ссылка технику»
	 * (components/schedule/LabOrdersPanel.tsx:646), получала всплывающую подсказку
	 * «Ссылка для зуботехника скопирована в буфер обмена» (:309) и отправляла в
	 * лабораторию адрес #/portal/lab-order/<токен> (:307). Такого адреса в
	 * приложении не существовало: viewFromHash() (AppHelpers.tsx:6197-6204) режет
	 * хеш по «/», первым элементом получает пустую строку, в реестре разделов её
	 * нет — и возвращает «shift». main.tsx рендерил AppShell безусловно, разбора
	 * хеша не делал вовсе. Зуботехник открывал рабочее место клиники вместо своего
	 * заказа, статус коронки продолжал жить в телефонных звонках, а регистратура
	 * была уверена, что отправила рабочую ссылку, — подсказка ведь сказала
	 * «скопирована».
	 *
	 * КАК СМОНТИРОВАН. main.tsx теперь спрашивает publicPortalRouteFromHash()
	 * (lib/publicPortalRoute.ts) ДО рендера: на публичном адресе рендерится портал
	 * с токеном из ссылки, на любом другом — рабочее место клиники. Разбор адреса
	 * вынесен в отдельный модуль и закрыт src/tests/publicPortalRoute.test.ts,
	 * потому что main.tsx исполняет побочные действия и юнит-тестом не берётся.
	 *
	 * ПОЧЕМУ В ЭТОЙ ВЕТКЕ НЕТ installApiAuthFetch(). Он подставляет токен кабинета
	 * и токен сотрудника во все запросы к /api/ (lib/apiAuthFetch.ts). Зуботехник —
	 * внешний участник, и его два публичных маршрута (apps/api/src/routes/lab.ts:277
	 * и :302) авторизации не требуют вовсе; ставить обёртку значило бы завести на
	 * публичной странице чтение clinic/staff-токенов без единого потребителя.
	 */
	/*
	 * СЕМИШАГОВЫЙ МАСТЕР ПЕРВОГО ЗАПУСКА УДАЛЁН — 2013 строк, одиннадцать записей.
	 * Здесь стояли OnboardingPreview.tsx, корень
	 * components/workspace/OnboardingSetupWizard.tsx и всё поддерево onboarding/**.
	 *
	 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Это был ВТОРОЙ мастер первого запуска рядом с
	 * живым. Живой лежит в App.tsx:2081, гасится ключом dental-crm:onboarding:v1
	 * (AppHelpers.tsx:691, читается App.tsx:2009) и действительно перекрывает
	 * экран новой клиники — именно его клиника видит при первом входе.
	 * Семишаговый читал ДРУГОЙ ключ (dente-onboarding-draft-v1) и не рендерился
	 * нигде: его единственный импортёр OnboardingPreview.tsx не импортировал
	 * никто, а обещанный в его шапке адрес #onboarding-preview не существует —
	 * main.tsx монтирует AppShell и разбора хеша не делает вовсе.
	 *
	 * Пока обе копии лежали в дереве, каждая правка первого запуска делалась
	 * вслепую: инженер правил ту, которую человек не видит. Это уже случилось —
	 * коммит ab3312595 описывает, как предыдущий пакет починил выбор роли в
	 * ТРЕТЬЕЙ, тоже недостижимой копии и заверил правку меткой достижимости.
	 *
	 * Мастер не просто не работал — он сообщил бы об успехе, не сохранив ничего.
	 * Замерено в процессе через app.inject, а не через дев-сервер на 4100, который
	 * отдаёт устаревший код: его запрос POST /api/workspace/onboarding/complete
	 * уходил БЕЗ заголовков авторизации и получал HTTP 401 {"error":"Unauthorized"}.
	 * Клиент ответ не проверял вовсе: catch только console.error, дальше
	 * безусловные setFadeOut(true) и onComplete(). Администратор нажимал «Запустить
	 * DENTE», видел плавное угасание и считал клинику настроенной. Тем же прогоном
	 * замерено, что POST /api/system/analyze-legacy-db отвечает 404: адреса,
	 * который звал Step7Migration, на сервере нет.
	 *
	 * ЗАМЕНА ПОКАЗАНА ПО КАЖДОМУ ИЗ СЕМИ ШАГОВ — без этого удалять было нельзя.
	 *   Step1 «специализации» и Step3 «модули» → Настройки → «Модули»
	 *     (SettingsView.tsx:1539 → SettingsModulesTab → WorkspaceFeaturesSelector).
	 *     Замена ШИРЕ: 23 флага против 7. Собственное значение Step1
	 *     (clinicSchedule.specs) не читает никто.
	 *   Step2, кресла → Настройки → «Клиника», «Кресла и кабинеты»
	 *     (SettingsClinicTab.tsx:728, смонтирована SettingsView.tsx:1503). Замена
	 *     шире: именованные кресла и график на каждое против ползунка-счётчика.
	 *   Step2, часы работы → там же: начало и окончание рабочего дня и отметки
	 *     рабочих дней (SettingsClinicTab.tsx:353-370). Настройка доходила до базы,
	 *     но публичный виджет записи её формат не понимал и отдавал пациентам
	 *     09:00–17:30 вместо 08:00–20:00, а по закрытым субботам принимал записи.
	 *     Починено вместе с этим разбором, доказательство —
	 *     apps/api/src/tests/routes/publicBookingWorkHoursProof.ts.
	 *   Step4 «фирменный стиль» → замены нет, и ВОЗМОЖНОСТИ тоже нет. THEME_COLORS
	 *     встречался только внутри самой ветки, а слова theme в
	 *     routes/workspaceProfile.ts нет вовсе: шаг красил сам себя и на сервер
	 *     цвет не отправлял. Терять нечего.
	 *   Step5 «сотрудники» → Настройки → «Сотрудники» (SettingsView.tsx:1501).
	 *     Процент врача, которого во вкладке нет, теперь задаётся на экране
	 *     выплат — там, где и написано «не задана»
	 *     (pages/DoctorPayoutDashboard.tsx); доказательство —
	 *     apps/api/src/tests/routes/doctorCommissionRateProof.ts. Специальность
	 *     шага возможностью не была: в нагрузку маршрута
	 *     (workspaceProfile.ts:723) поле специальности не входило вовсе, а чтение
	 *     сотрудника жёстко отдаёт ["universal"] (db/settingsQuery.ts:122).
	 *     ОСТАЁТСЯ ДОЛГОМ телефон сотрудника: шаг его собирал и маршрут писал, а в
	 *     достижимой форме добавления поля нет. Сервер принять его умеет
	 *     (createStaffMemberInDb), то есть это поле формы, а не новая возможность.
	 *   Step6 «реквизиты» → Настройки → «Клиника»: ИНН (SettingsClinicTab.tsx:392),
	 *     ОГРН (:401), адрес, поиск реквизитов по ИНН (:490). Замена шире.
	 *   Step7 «перенос данных» → Настройки → «Импорт», MigrationWizard
	 *     (SettingsView.tsx:1574). Замена не «тоже есть», а ЕДИНСТВЕННАЯ
	 *     работающая: Step7 звал единственный адрес, которого НЕ СУЩЕСТВУЕТ (см.
	 *     замер 404 выше), тогда как все семь маршрутов /api/migration/*, которые
	 *     зовёт MigrationWizard, отвечают 401 — то есть существуют и доводят
	 *     перенос до исполнения и отката.
	 *
	 * Спасать внутри ветки было нечего, и два места выглядели готовыми лишь на
	 * вид. Загрузка логотипа была целиком фальшивой: onClick вызывал
	 * setTimeout(() => setLogoUploaded(true), 1500) без файлового ввода и без
	 * запроса, а через 1,5 с экран писал «Логотип загружен»; поля logoUploaded не
	 * было даже в нагрузке. В итоговой колонке жёстко печаталось «4521 пац.» при
	 * migrationStatus === "done", тогда как настоящее число лежало в
	 * detectedSummary.patientsFound.
	 *
	 * Живой мастер App.tsx:2081 НЕ ТРОНУТ: он достижим и работает. Обратная
	 * декомпозиция — вынести его из App.tsx в компоненты — остаётся долгом,
	 * заведённым в коммите ab3312595. Таблица стилей styles/onboarding-wizard.css
	 * тоже НЕ тронута: её классы (onboarding-fullscreen, onboarding-shell,
	 * wizard-mode-grid) принадлежат живому мастеру, а не удалённой ветке.
	 */
	"components/AudioWaveform.tsx:AudioWaveform",
	"components/Badge.tsx:Badge",
	"components/HelpHUD.tsx:HelpHUD",
	"components/Odontogram.tsx:Odontogram",
	/*
	 * QrGatewayPanel удалён, поэтому строки здесь больше нет.
	 *
	 * Панель печатала три QR-кода, и все три адреса были выдуманы: домен
	 * dente.clinic не существует нигде, кроме того файла; идентификатор клиники
	 * читался из ключа dente_organization_id, у которого во всём репозитории нет
	 * писателя, то есть у каждой клиники навсегда оставался "demo"; живой
	 * публичный маршрут ждёт :organizationId в ПУТИ (apps/api/src/server.ts:442),
	 * а QR передавал ?clinicId параметром; на localhost подставлялся выдуманный
	 * 192.168.1.15. Сверх этого файл импортировал пакет "qrcode.react", которого
	 * в проекте нет — монтирование уронило бы сборку всего веб-пакета.
	 *
	 * Почему это удаление, а не долг: QR-код непрозрачен. Пустой экран
	 * администратор видит и понимает, а по картинке нельзя понять, что она
	 * неверна, — её распечатают и наклеят на стойку регистратуры, и отказ
	 * проявится на пациенте, решившем, что клиника не работает.
	 *
	 * Функция клинике нужна, но возвращается она не этим файлом: сначала
	 * публичный адрес клиники должен доходить до браузера (на сервере он уже
	 * есть — DENTE_PUBLIC_BASE_URL с проверяющим читателем
	 * apps/api/src/services/communications/appointmentActionLinks.ts:77-88, но
	 * клиенту не отдаётся нигде), затем должен появиться публичный контур
	 * (PublicBookingWidget заявлен долгом выше), затем настоящий идентификатор
	 * организации в клиенте.
	 */
	"components/TourEngine.tsx:TourEngine",
	"components/crm/CustomCrmTaskTypesWidget.tsx:CustomCrmTaskTypesWidget",
	"components/dicom/DicomToolbar.tsx:DicomToolbar",
	"components/dicom/ViewportOverlays.tsx:ViewportOverlays",
	"components/documents/DocumentUkepSignButton.tsx:DocumentUkepSignButton",
	"components/integrations/DadataGeocodedAddressesWidget.tsx:DadataGeocodedAddressesWidget",
	"components/integrations/LandingFieldMappingsWidget.tsx:LandingFieldMappingsWidget",
	"components/marketing/FamilyRecommendationSourcesWidget.tsx:FamilyRecommendationSourcesWidget",
	/*
	 * SmartImportStudio и LegacyMigrationStudio удалены, поэтому строк здесь
	 * больше нет. Это не потерянная работа, а две устаревшие КОПИИ вкладки
	 * импорта, которая смонтирована и живёт.
	 *
	 * Слот settingsTab === "imports" занят двумя живыми компонентами:
	 * MigrationWizard (SettingsView.tsx:1564, настоящий движок, ходит в
	 * /api/migration/*) и SettingsImportsTab (SettingsView.tsx:1587, в своей
	 * границе ошибок). Решающий замер — множества aria-label, то есть того, что
	 * видит человек: у живой вкладки 48 блоков, у сирот 22 и 7, и СОБСТВЕННЫХ
	 * блоков у сирот ноль — строгие подмножества. Живая вкладка умеет на 26
	 * блоков больше: инструменты первого среза, импорт снимков из внешних систем,
	 * органайзер локальных снимков, извлечение текста, файлы архива. Построчный
	 * diff здесь врёт: файлы отформатированы табами против пробелов.
	 *
	 * Монтировать их было нельзя даже вторым экраном. У каждой было по 13
	 * обращений `dashboard.` БЕЗ защиты против 0 у живой вкладки, где те же 13
	 * обращений стоят как `dashboard?.` — это ровно тот вынос из SettingsView, в
	 * котором потерялись `?.` (разбор на месте: SettingsView.tsx:1566-1574).
	 * Любое такое обращение роняло компонент, а общая граница гасила вместе с ним
	 * ВЕСЬ раздел настроек — вместе с мастером переноса базы клиники, который от
	 * этих пропсов не зависит вовсе.
	 *
	 * Своей работы в них не было: единственные вызовы, которых нет у живой
	 * вкладки, — Object.assign, Object.hasOwn, useAppLogicContext и
	 * useSettingsDerivations, то есть водопровод, которым сирота собирала себе
	 * пропсы из God Context (объявлены они были без пропсов вообще), тогда как
	 * живая вкладка получает их прямо. Сетевых вызовов ноль в обеих.
	 */
	"components/settings/SingleSessionEnforcementsWidget.tsx:SingleSessionEnforcementsWidget",
	"components/visit/DoctorDesktopHeader.tsx:DoctorDesktopHeader",
	"components/visit/VisitDictation.tsx:VisitDictation",
	"components/workspace/shift/RoleFocusStrip.tsx:RoleFocusStrip",
	"components/workspace/shift/ShiftIntelligence.tsx:ShiftIntelligence",
];

/**
 * Размер наследия на день, когда перепись его пересчитала. Список работает
 * только в одну сторону: его можно сокращать, подключая или заявляя долг с
 * причиной, и нельзя расширять. Без этого числа список стал бы той самой
 * лазейкой, из-за которой удалён внешний страж.
 */
const LEGACY_BACKLOG_CEILING = 17;

/** Минимальный размер переписи: ниже него она заведомо выродилась. */
const CENSUS_FLOOR = {
	sourceFiles: 250,
	componentFiles: 150,
	components: 170,
	reachableFiles: 200,
};

/**
 * Потолок времени разбора. Замер на машине разработчика — около 4 с на 314
 * файлов; удалённый внешний страж на той же задаче шёл 4 м 33 с, потому что
 * поднимал подпроцесс ast-grep. Потолок стоит с запасом на медленный диск и
 * ловит именно возврат к процессу-на-файл, а не обычный разброс.
 */
const CENSUS_TIME_CEILING_MS = 60_000;

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

/**
 * Реестр разделов читается из исходника, а не импортируется: страж обязан
 * работать и тогда, когда workspaceShell.tsx не собирается — именно в такой
 * момент в него и добавляют раздел наугад.
 */
function registeredAppViews(): string[] {
	const source = readSource("workspaceShell.tsx");
	const declaration = /export const appViews = \[([^\]]*)\] as const;/.exec(source)?.[1] ?? "";
	assert.ok(
		declaration,
		"В workspaceShell.tsx не найдено объявление `export const appViews = [...] as const;` — " +
			"реестр разделов переехал или переименован, и этот страж больше ничего не охраняет",
	);
	const views = [...declaration.matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
	assert.ok(views.length >= 11, `реестр разделов разобран неполно: ${views.length} записей`);
	return views;
}

test("перепись компонентов не выродилась и не поднимает процесс на файл", () => {
	const census = componentReachability();

	assert.equal(
		census.parsedFiles,
		census.scannedFiles,
		`разобрано ${census.parsedFiles} файлов из ${census.scannedFiles}. Пропущенный файл — дырка ` +
			"в переписи, а перепись с дыркой хуже отсутствующей: она выдаёт зелёный на непроверенном",
	);
	assert.ok(
		census.scannedFiles >= CENSUS_FLOOR.sourceFiles,
		`в apps/web/src найдено ${census.scannedFiles} исходников — обход дерева сломался`,
	);
	assert.ok(
		census.componentFiles >= CENSUS_FLOOR.componentFiles,
		`файлов с компонентами найдено ${census.componentFiles} — разбор объявлений сломался, ` +
			"и проверка ниже пройдёт, ничего не проверив",
	);
	assert.ok(
		census.verdicts.length >= CENSUS_FLOOR.components,
		`компонентов найдено ${census.verdicts.length} — разбор объявлений сломался. Именно так ` +
			"промолчал удалённый внешний страж: его шаблон не видел форму `export const X: React.FC`",
	);
	assert.ok(
		census.reachableFiles.size >= CENSUS_FLOOR.reachableFiles,
		`от ${census.entry} достижимо ${census.reachableFiles.size} файлов — обход импортов сломался, ` +
			"и тогда несмонтированным окажется всё дерево",
	);
	assert.ok(
		census.wallClockMs < CENSUS_TIME_CEILING_MS,
		`перепись заняла ${census.wallClockMs} мс. Столько стоит только процесс на каждый файл — ` +
			"ровно из-за этого предыдущий страж шёл 4 м 33 с и его никто не запускал",
	);

	// Замер печатается, чтобы стоимость гейта была видна, а не предполагалась.
	console.log(
		`перепись: ${census.scannedFiles} файлов, ${census.verdicts.length} компонентов, ${census.wallClockMs} мс`,
	);
});

test("ни один компонент apps/web/src не остаётся несмонтированным незаявленно", () => {
	const census = componentReachability();

	const declaredKeys = new Set(DECLARED_UNMOUNTED.map((debt) => keyOf({ file: debt.file, name: debt.name })));
	const knownKeys = new Set([...declaredKeys, ...LEGACY_UNMOUNTED_BACKLOG]);

	const measured = census.verdicts.filter((verdict) => !isMounted(verdict.state));
	const measuredKeys = new Set(measured.map(keyOf));

	const appeared = measured
		.filter((verdict) => !knownKeys.has(keyOf(verdict)))
		.map((verdict) => `${verdict.file}:${verdict.line} ${verdict.name} [${verdict.state}] ${verdict.detail}`)
		.sort();

	assert.deepEqual(
		appeared,
		[],
		`Компонент существует, и пользователь его увидеть не может:\n  ${appeared.join("\n  ")}\n` +
			"Такой файл проходит typecheck, сборку и все остальные тесты, а на экране его нет — так " +
			"дважды терялись готовые разделы и полтора года пролежала форма реквизитов, которая умела " +
			"больше смонтированной. Выхода два: отрисовать компонент из модуля, достижимого от main.tsx, " +
			"или внести его в DECLARED_UNMOUNTED вместе с проверенной причиной. Дописывать в " +
			"LEGACY_UNMOUNTED_BACKLOG нельзя — он только сокращается.",
	);

	const stale = [...knownKeys].filter((key) => !measuredKeys.has(key)).sort();
	assert.deepEqual(
		stale,
		[],
		`Компонент записан несмонтированным, но перепись его так уже не видит: ${stale.join(", ")}. ` +
			"Либо его подключили — тогда уберите строку, иначе страж перестаёт следить за этим файлом и " +
			"следующая поломка монтирования пройдёт молча; либо файл или объявление переименовали — " +
			"тогда поправьте строку, потому что сейчас она охраняет несуществующее имя.",
	);
});

test("список наследия только сокращается", () => {
	assert.ok(
		LEGACY_UNMOUNTED_BACKLOG.length <= LEGACY_BACKLOG_CEILING,
		`в LEGACY_UNMOUNTED_BACKLOG ${LEGACY_UNMOUNTED_BACKLOG.length} записей при потолке ` +
			`${LEGACY_BACKLOG_CEILING}. Этот список — не место для новой сироты: у него нет поля причины, ` +
			"и запись в нём означает «никто не разбирал». Новый несмонтированный компонент идёт в " +
			"DECLARED_UNMOUNTED с причиной либо подключается.",
	);

	const duplicated = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key, index) => LEGACY_UNMOUNTED_BACKLOG.indexOf(key) !== index,
	);
	assert.deepEqual(duplicated, [], `в LEGACY_UNMOUNTED_BACKLOG повторы: ${duplicated.join(", ")}`);

	const declaredKeys = new Set(DECLARED_UNMOUNTED.map((debt) => keyOf({ file: debt.file, name: debt.name })));
	const inBothLists = LEGACY_UNMOUNTED_BACKLOG.filter((key) => declaredKeys.has(key));
	assert.deepEqual(
		inBothLists,
		[],
		`Компонент записан и как заявленный долг, и как неразобранное наследие: ${inBothLists.join(", ")}. ` +
			"Причина уже написана — уберите строку из наследия, иначе потолок наследия перестаёт что-либо значить.",
	);

	const missingFiles = LEGACY_UNMOUNTED_BACKLOG.filter(
		(key) => !existsSync(path.join(webSrcRoot, key.slice(0, key.lastIndexOf(":")))),
	);
	assert.deepEqual(
		missingFiles,
		[],
		`Наследие записано на файл, которого в дереве нет: ${missingFiles.join(", ")}. Файл удалён — ` +
			"удалите и строку, иначе список начинает врать о составе дерева.",
	);
});

test("заявленные долги существуют, объяснены и не устарели", () => {
	const census = componentReachability();
	const byKey = new Map(census.verdicts.map((verdict) => [keyOf(verdict), verdict]));

	const missingFiles: string[] = [];
	const missingDeclarations: string[] = [];
	const emptyReasons: string[] = [];
	const shallowReasons: string[] = [];

	for (const debt of DECLARED_UNMOUNTED) {
		const key = keyOf({ file: debt.file, name: debt.name });
		if (!existsSync(path.join(webSrcRoot, debt.file))) {
			missingFiles.push(debt.file);
			continue;
		}
		if (!byKey.has(key)) missingDeclarations.push(key);
		// Пустая или пробельная причина — не причина. Из-за того, что удалённый
		// внешний страж проверял на истинность ОБЪЕКТ записи, а не эту строку,
		// `reason: ""` гасил нарушение и прогон завершался нулём.
		if (debt.reason.trim().length === 0) {
			emptyReasons.push(key);
			continue;
		}
		if (debt.reason.trim().length < 120) shallowReasons.push(key);
	}

	assert.deepEqual(
		missingFiles,
		[],
		`Долг заявлен на файл, которого в дереве нет: ${missingFiles.join(", ")}. Файл удалён — удалите ` +
			"и запись, иначе список долгов начинает врать о составе дерева.",
	);
	assert.deepEqual(
		missingDeclarations,
		[],
		`Долг заявлен на объявление, которого перепись не находит: ${missingDeclarations.join(", ")}. ` +
			"Компонент переименован или удалён — поправьте запись, сейчас она охраняет несуществующее имя.",
	);
	assert.deepEqual(
		emptyReasons,
		[],
		`Долг заявлен с пустой причиной: ${emptyReasons.join(", ")}. Пустая строка гасит проверку и ` +
			"ничего не сообщает — это и есть дефект, из-за которого удалён внешний страж.",
	);
	assert.deepEqual(
		shallowReasons,
		[],
		`Долг заявлен отпиской вместо причины: ${shallowReasons.join(", ")}. Причина обязана называть, ` +
			"что именно мешает подключению и чем это подтверждено — файл, строка, ответ сервера.",
	);
});

test("каждый раздел из реестра отрисовывается в App.tsx", () => {
	const appSource = readSource("App.tsx");
	const missing = registeredAppViews().filter(
		(view) => !appSource.includes(`currentView === "${view}"`),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но App.tsx их не отрисовывает: ${missing.join(", ")}. ` +
			"Такой раздел открывается по адресу и показывает пустую рабочую область — " +
			"ровно так пропали склад, стерилизация и воронка обращений.",
	);
});

test("каждый раздел из реестра умеет предзагружаться", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const missing = registeredAppViews().filter(
		(view) => !new RegExp(`\\b${view}: \\(\\) => import\\(`).test(preloadSource),
	);

	assert.deepEqual(
		missing,
		[],
		`Разделы объявлены в workspaceShell.appViews, но не зарегистрированы в workspacePreload.ts: ${missing.join(", ")}. ` +
			"Vite будет грузить их модуль на лету, с прыжком вёрстки при первом открытии " +
			"(правило записано в .agents/UI_STANDARDS.md).",
	);
});

test("модуль каждого предзагружаемого раздела действительно существует", () => {
	const preloadSource = readSource("workspacePreload.ts");
	const census = componentReachability();

	const broken: string[] = [];
	for (const match of preloadSource.matchAll(/(\w+): \(\) => import\("(\.[^"]+)"\)/g)) {
		const view = match[1] as string;
		const specifier = match[2] as string;
		const target = path.posix.join(
			path.posix.dirname("workspacePreload.ts"),
			specifier.replace(/^\.\//, ""),
		);
		const exists = [`${target}.tsx`, `${target}.ts`, `${target}/index.tsx`, `${target}/index.ts`].some(
			(candidate) => census.facts.has(candidate),
		);
		if (!exists) broken.push(`${view} → ${specifier}`);
	}

	assert.deepEqual(
		broken,
		[],
		"Предзагрузчик ссылается на модуль, которого в apps/web/src нет: " +
			`${broken.join(", ")}. Опечатка в пути молчит: import() внутри void-вызова только отклоняет промис.`,
	);
});

test("второго маршрутизатора рядом с App.tsx больше нет", () => {
	/*
	 * AppRouter.tsx удалён вместе с двумя разделами-пустышками, которые в нём
	 * лежали (зарплаты и омниканальный инбокс — их адреса на сервере отвечают
	 * 404). Файл вернуть нельзя: пока он не импортирован, всё добавленное в него
	 * не отрисовывается, а выглядит подключённым — на этом уже дважды потеряли
	 * готовую работу. Разделы объявляются в workspaceShell.appViews и
	 * отрисовываются в App.tsx, и это закрыто тестами выше.
	 */
	assert.equal(
		existsSync(path.join(webSrcRoot, "AppRouter.tsx")),
		false,
		"AppRouter.tsx создан заново. Второй файл с цепочкой по currentView не участвует в отрисовке: " +
			"добавьте раздел в workspaceShell.appViews и ветку в App.tsx.",
	);
});

test("внешнего стража достижимости в дереве больше нет", () => {
	/*
	 * Третий владелец одного инварианта — это не подстраховка, а расхождение:
	 * DocumentUkepSignButton был «[НАРУШЕНИЕ]» для внешнего стража и принятым
	 * исключением с причиной для тестов рядом. Если файлы вернутся, вернётся и
	 * ложная перепись по шаблонам ast-grep, и лазейка пустой причины.
	 */
	const repoRoot = path.join(webSrcRoot, "..", "..", "..");
	for (const removed of [
		"scripts/check-component-mount-reachability.mjs",
		"scripts/lib/component-mount-rules.yml",
		"scripts/tests/check-component-mount-reachability.test.mjs",
	]) {
		assert.equal(
			existsSync(path.join(repoRoot, removed)),
			false,
			`${removed} вернулся в дерево. Достижимость компонентов проверяется этим файлом, внутри ` +
				"`npm test -w @dental/web`: перепись из tests/utils/componentReachability.ts видит все " +
				"формы объявления и сравнивает пути целиком. Второй владелец инварианта снова начнёт " +
				"спорить с этим — и проиграет молча, потому что ни к одному гейту он подключён не был.",
		);
	}
});
