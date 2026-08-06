import { ArrowRight, BarChart3, Database } from "lucide-react";
import { openWorkspaceView, workspaceViewTitle } from "./settingsDeepLink";

/**
 * Вкладка настроек «Отчёты».
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стояла форма: тумблер «Включить регулярную выгрузку»,
 * выбор формата (JSON / CSV / XML), частота (час / сутки / неделя), поле
 * «API-токен только для чтения» с кнопкой «Создать новый токен» и кнопка
 * «Сохранить параметры». Ни одна из этих настроек не могла сохраниться ни у одной
 * клиники и ни разу:
 *
 * 1. Сохранение уходило POST на `/api/clinic/reporting-settings`, а генерация
 *    токена — POST на `/api/reporting/token/generate`. Обоих адресов на сервере
 *    нет: они перечислены в списке известного долга
 *    `apps/api/src/tests/webCallsExistingRoutes.test.ts` (KNOWN_MISSING) и не
 *    зарегистрированы ни в одном файле `apps/api/src/routes`. Ответ — всегда 404.
 * 2. Начальные значения читались из `clinicSettings.reportingSettings`. Такого
 *    поля не существует нигде, кроме этого файла: ни на сервере, ни в схеме базы,
 *    ни в `packages/shared`. Значит при каждом открытии вкладки поля возвращались
 *    к значениям по умолчанию.
 * 3. Имён `syncEnabled`, `exportFormat`, `syncFrequency`, `apiToken` на сервере
 *    нет ни одного — даже появись маршруты, они не знали бы, что с ними делать.
 *
 * Вкладка при этом видна КАЖДОЙ клинике: `hasAnalyticsModule` по умолчанию `true`
 * (hooks/useWorkspaceProfile.ts).
 *
 * ЧЕМ ЭТО БЫЛО ОПАСНО, а не просто бесполезно. Поле называлось «API-токен только
 * для чтения», а подпись обещала: «Токен даёт доступ только для чтения данных
 * через REST API. Перегенерация аннулирует старый токен.» Такого токена в системе
 * не существует — нет ни колонки, ни маршрута, ни проверки его на входе. Владелец
 * же читал это как обещание безопасного доступа наружу и мог договориться с
 * подрядчиком о выгрузке данных пациентов, которой нечем управлять и нечего
 * отзывать. Обещание про доступ к медицинским данным — не то место, где уместна
 * форма-заготовка.
 *
 * ЧТО СТАЛО. Вкладка не предлагает того, чего нет. Она называет, что в клинике
 * действительно считается и где это смотреть, и прямо говорит, чего в этой версии
 * нет — регулярной выгрузки в стороннюю систему и отдельного токена для чтения.
 *
 * ЧТО ЕСТЬ ПО-НАСТОЯЩЕМУ: десять готовых отчётов на сервере
 * (`apps/api/src/routes/reports.ts` — выручка, врачи, кресла, записи, эффект
 * напоминаний, поток пациентов, услуги, загрузка расписания, задолженности,
 * сводка). Их показывает раздел «Аналитика» рабочего места, и кнопка ниже ведёт
 * туда.
 *
 * ЧТО ВЕРНУТЬ, КОГДА СЕРВЕР НАУЧИТСЯ. По порядку: колонки под настройки выгрузки,
 * хранение и проверку токена только для чтения, маршруты чтения и записи, поле в
 * ответе `/api/settings/clinic` — и только потом форма. Форма первой уже была.
 *
 * ЭТА ВКЛАДКА НЕ ТРОГАЕТ СЕРВЕР ВООБЩЕ: ни одного запроса, поэтому состояний
 * загрузки и отказа здесь нет — нечему отказывать.
 */

/** Раздел, где лежат готовые отчёты. Тип `AppView` не даёт промахнуться мимо раздела. */
const REPORTS_VIEW = "analytics" as const;

export function SettingsReportingTab() {
	const reportsViewTitle = workspaceViewTitle(REPORTS_VIEW);

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<BarChart3 aria-hidden="true" />
				<div>
					<p className="eyebrow">Отчётность</p>
					<h2>Отчёты клиники</h2>
					<p>
						Программа считает выручку, загрузку кресел, работу врачей и
						задолженности пациентов сама, по мере работы клиники. Настраивать
						для этого ничего не нужно.
					</p>
				</div>
			</div>

			<div
				className="profile-form-grid"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "24px",
					marginTop: "24px",
				}}
			>
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">
							<BarChart3 size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Отчёты смотрят в разделе «{reportsViewTitle}»</h3>
							<p>
								Там же выбирается период. Отчёты считаются по данным клиники в
								момент открытия, поэтому отдельной выгрузки для них не
								требуется.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<p style={{ margin: 0 }}>Готовые отчёты:</p>
							<ul
								style={{
									margin: "8px 0 0",
									paddingLeft: "20px",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<li>выручка за период;</li>
								<li>выработка по врачам;</li>
								<li>загрузка кресел и расписания;</li>
								<li>записи, поток пациентов и эффект напоминаний;</li>
								<li>оказанные услуги;</li>
								<li>задолженности пациентов.</li>
							</ul>
						</div>

						<div
							className="profile-form-group full-width"
							style={{ marginTop: "4px" }}
						>
							<button
								className="primary-button"
								type="button"
								onClick={() => openWorkspaceView(REPORTS_VIEW)}
								style={{
									alignSelf: "flex-start",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								Перейти в «{reportsViewTitle}»
								<ArrowRight size={16} aria-hidden="true" />
							</button>
						</div>
					</div>
				</section>

				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
							<Database size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Чего в этой версии пока нет</h3>
							<p>
								Названо прямо, чтобы вы не планировали работу подрядчика вокруг
								возможности, которой в программе не существует.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<p style={{ margin: 0 }}>
								<strong>Регулярной выгрузки в стороннюю систему</strong>{" "}
								(PowerBI, Yandex DataLens и подобные) нет: сервер клиники не
								умеет отправлять данные по расписанию и не хранит настройки
								такой отправки.
							</p>
							<p style={{ marginTop: "10px", marginBottom: 0 }}>
								<strong>Отдельного токена только для чтения</strong> тоже нет —
								ни создать, ни отозвать его нечем. Здесь стояло поле «API-токен
								только для чтения» с кнопкой «Создать новый токен» и обещанием,
								что перегенерация аннулирует старый. Нажатие всегда
								заканчивалось отказом сервера, потому что такого токена в
								программе не существует. Форма убрана: обещание доступа к
								медицинским данным, которым нечем управлять, опаснее пустого
								места.
							</p>
							{/*
								ЗДЕСЬ НЕ ДОЛЖНО ПОЯВИТЬСЯ ССЫЛКИ НА «ВЫГРУЗКУ ИЗ ИМПОРТА».

								В первой редакции этого текста стояло, что данные можно передать
								внешнему аналитику выгрузкой из раздела «Импорт». Это неверно и
								проверено: «Импорт» и мастер переноса читают выгрузки ЧУЖИХ
								программ (upload, разбор файла), а собственной выгрузки данных
								наружу в продукте нет — ни маршрута, ни кнопки скачивания.
								Совет, отправляющий человека за возможностью, которой нет, —
								та же поломка, что и форма, которая не сохраняется.
							*/}
							<p style={{ marginTop: "10px", marginBottom: 0 }}>
								Что можно сделать уже сейчас: открыть нужный отчёт в разделе «
								{reportsViewTitle}» за выбранный период и читать числа с экрана.
								Способа отдать данные клиники наружу автоматически в этой версии
								нет — и это не обход настройки, а её отсутствие.
							</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
