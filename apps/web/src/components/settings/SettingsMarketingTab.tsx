import { ArrowRight, MessageSquareShare, Star } from "lucide-react";
import { viewLabels } from "../../workspaceShell";
import {
	MESSENGERS_SETTINGS_TAB,
	openSettingsTab,
	settingsTabTitle,
} from "./settingsDeepLink";

/**
 * Вкладка настроек «Отзывы и NPS».
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стояла форма из четырёх полей — тумблер
 * «Включить автоматическую подготовку NPS-черновиков», задержка в часах, ссылка
 * на отзывы и шаблон сообщения — и кнопка «Сохранить настройки». Сохранить эти
 * настройки нельзя было НИ ОДНОЙ клинике, ни разу:
 *
 * 1. Форма отправляла POST на `/api/clinic/marketing-settings`. Такого адреса на
 *    сервере нет: он перечислен в списке известного долга
 *    `apps/api/src/tests/webCallsExistingRoutes.test.ts` (KNOWN_MISSING) и не
 *    зарегистрирован ни в одном файле `apps/api/src/routes`. Ответ — всегда 404,
 *    и владелец видел «Ошибка сохранения настроек» без причины и без следующего
 *    шага.
 * 2. Начальные значения читались из `clinicSettings.marketingSettings`. Этого
 *    поля не существует нигде, кроме этого файла: ни в `apps/api/src`, ни в
 *    схеме базы, ни в `packages/shared`. Значит при каждом открытии вкладки
 *    поля возвращались к значениям по умолчанию, а введённое исчезало.
 * 3. Имён полей `npsEnabled`, `npsDelayHours`, `npsMessageTemplate`,
 *    `reviewPlatformUrl` на сервере тоже нет ни одного — даже появись маршрут,
 *    он не знал бы, что с ними делать.
 *
 * Вкладка при этом видна КАЖДОЙ клинике: `hasMarketingModule` по умолчанию
 * `true` (hooks/useWorkspaceProfile.ts).
 *
 * ЧЕМ ЭТО БЫЛО ХУЖЕ ОБЫЧНОЙ ПУСТОЙ ФОРМЫ. Просьба оставить отзыв в продукте
 * РАБОТАЕТ и настраивается по-настоящему — только в другом месте: «Настройки →
 * Мессенджеры → Telegram-бот». Там живут «Ссылка на отзыв» (`clinic_review_url`)
 * и «Просьба оценить клинику, часы после визита» (`review_request_delay_hours`) —
 * обе колонки настоящие (`dente_telegram_bot_configs`), сохраняются через
 * работающий `PUT /api/settings/telegram`. То есть владелец вписывал ссылку на
 * Яндекс.Карты на вкладке, которая называется «Отзывы и NPS», терял её и делал
 * вывод, что сбор отзывов в программе не работает, — при том что рядом он
 * работает.
 *
 * ЧТО СТАЛО. Вкладка больше не предлагает форму, которая не сохранится. Она
 * показывает, где настройка живёт по-настоящему, и переводит туда кнопкой; и
 * отдельно, прямым текстом, называет то, чего в этой версии нет, — чтобы
 * владелец не искал опрос по шкале 1–10 в других разделах.
 *
 * ПОЧЕМУ НЕ «ОСТАВИТЬ ФОРМУ, НО ПОЧИНИТЬ ТЕКСТ ОШИБКИ». Правило проекта уже
 * записано в `lib/panelStateText.ts`: «Обещание, которое не может сработать, —
 * тот же дефект, что голый код ответа». По этому же правилу из окна диктовки
 * убрана кнопка «ИИ-Анализ» для прайса: пока сервер не умеет — кнопки нет,
 * иначе экран отправляет человека по кругу.
 *
 * ЧТО ВЕРНУТЬ, КОГДА СЕРВЕР НАУЧИТСЯ. Нужны, по порядку: колонки под настройки
 * NPS, маршруты чтения и записи, поле в ответе `/api/settings/clinic` — и только
 * потом форма. Форма первой уже была, и вот что из этого вышло. Само поведение
 * («администратор получает черновик, отправка вручную») в этой вкладке было
 * описано верно и стоит сохранить при возврате.
 *
 * ЭТА ВКЛАДКА НЕ ТРОГАЕТ СЕРВЕР ВООБЩЕ: ни одного запроса, поэтому и состояний
 * загрузки с отказом здесь нет — нечему отказывать.
 */

export function SettingsMarketingTab() {
	/*
	 * И цель перехода, и подпись кнопки берутся из ./settingsDeepLink.ts: цель —
	 * типом `SettingsTab`, подпись — из того же списка, из которого рисуется левое
	 * меню. Написанные здесь руками, они разошлись бы с меню при первом
	 * переименовании вкладки, а кнопка, ведущая не туда, куда обещает, — это та же
	 * болезнь, из-за которой у этого раздела уже терялись целые панели.
	 */
	const messengersTabTitle = settingsTabTitle(MESSENGERS_SETTINGS_TAB);

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<MessageSquareShare aria-hidden="true" />
				<div>
					<p className="eyebrow">Отзывы пациентов</p>
					<h2>Просьба оставить отзыв</h2>
					<p>
						Бот клиники сам пишет пациенту через выбранное время после визита и
						просит оценить приём, приложив ссылку на страницу отзывов.
					</p>
				</div>
			</div>

			<div
				className="profile-form-grid"
				style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}
			>
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
							<Star size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Настройка находится в разделе «{messengersTabTitle}»</h3>
							<p>
								Просьба об отзыве отправляется тем же ботом, что и напоминания о
								приёме, поэтому и настраивается вместе с ним — в одном месте, а
								не в двух.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<p style={{ margin: 0 }}>Там задаются две вещи:</p>
							<ul
								style={{
									margin: "8px 0 0",
									paddingLeft: "20px",
									display: "flex",
									flexDirection: "column",
									gap: "6px",
								}}
							>
								<li>
									<strong>Ссылка на отзыв</strong> — адрес страницы клиники на
									Яндекс.Картах, 2ГИС или ПроДокторов. Её бот и пришлёт
									пациенту.
								</li>
								<li>
									<strong>Просьба оценить клинику, часы после визита</strong> —
									через сколько часов после закрытого приёма или оплаты
									отправить просьбу. Обычно ставят от 2 до 24 часов.
								</li>
							</ul>
							<p style={{ marginTop: "12px", marginBottom: 0 }}>
								Обе настройки сохраняются на сервере клиники и действуют для
								всех врачей. Менять их может администратор или владелец.
							</p>
						</div>

						<div className="profile-form-group full-width" style={{ marginTop: "4px" }}>
							<button
								className="primary-button"
								type="button"
								onClick={() => openSettingsTab(MESSENGERS_SETTINGS_TAB)}
								style={{
									alignSelf: "flex-start",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								Перейти в «{messengersTabTitle}»
								<ArrowRight size={16} aria-hidden="true" />
							</button>
							<span className="profile-form-hint" style={{ marginTop: "6px" }}>
								Откроется вкладка «{messengersTabTitle}», канал «Telegram-бот».
								Нужные поля — в блоке напоминаний и в блоке внешних ссылок.
							</span>
						</div>
					</div>
				</section>

				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
							<MessageSquareShare size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Чего в этой версии пока нет</h3>
							<p>
								Названо прямо, чтобы вы не искали это в других разделах и не
								ждали цифр, которых программа не считает.
							</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<p style={{ margin: 0 }}>
								Опроса по шкале от 1 до 10 (NPS) в программе нет: сервер клиники
								не хранит ни оценки пациентов, ни свой текст такого опроса, и
								сводного показателя лояльности не считает.
							</p>
							<p style={{ marginTop: "10px", marginBottom: 0 }}>
								Здесь была форма с тумблером и шаблоном сообщения, которая
								обещала это делать. Сохранить её было нельзя: сервер отвечал
								отказом на каждую попытку, а введённый текст исчезал при
								следующем открытии вкладки. Форма убрана — чтобы вы не тратили
								на неё время и не считали настроенным то, что не сохранилось.
							</p>
							{/*
								Раздел назван так, как он подписан в меню рабочего места:
								viewLabels.communications в workspaceShell.tsx — «Связь», а не
								«Сообщения». Подпись берётся оттуда же, чтобы совет не начал
								указывать на раздел, которого в меню нет.
							*/}
							<p style={{ marginTop: "10px", marginBottom: 0 }}>
								Что можно делать уже сейчас: включить просьбу об отзыве кнопкой
								выше — она работает и сохраняется. Ответы пациентов приходят в
								переписку с ботом, её видно в разделе «{viewLabels.communications}
								».
							</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
