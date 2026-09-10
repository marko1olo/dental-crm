import { showToast } from "./components/GlobalToast";
import { logger } from "./utils/logger";
import "./styles/marketing.css";
import {
	BookOpen,
	CheckCircle2,
	Copy,
	MessageSquare,
	Minus,
	MinusCircle,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { MarketingRomiTable } from "./components/marketing/MarketingRomiTable";
import { buildReviewReplyDraft } from "./components/marketing/reviewReplyDraft";
import { RecallListPanel } from "./components/patients/RecallListPanel";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";

type ReviewTone = "positive" | "negative" | "neutral";

function readStored(key: string): string | null {
	return safeLocalStorageGetItem(key);
}

function writeStored(key: string, value: string): void {
	safeLocalStorageSetItem(key, value);
}

export function MarketingView({
	clinicName,
	clinicPhone,
}: {
	clinicName: string;
	clinicPhone: string;
}) {
	const [reviewText, setReviewText] = useState("");
	const [tone, setTone] = useState<ReviewTone>("positive");
	const [generatedReply, setGeneratedReply] = useState("");

	const [phone, setPhone] = useState(() => {
		return readStored("dental_crm_mkt_phone") || clinicPhone || "";
	});

	const [copied, setCopied] = useState(false);
	const [activeTab, setActiveTab] = useState<"reviews" | "instructions">(
		"reviews",
	);

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setPhone(val);
		writeStored("dental_crm_mkt_phone", val);
	};

	const [draftWarnings, setDraftWarnings] = useState<string[]>([]);
	const [copyError, setCopyError] = useState<string | null>(null);

	/*
    БЫЛО: кнопка звала AiOrchestrator.processMarketingReview, тот всегда отвечает
    «нужна языковая модель», модели в продукте нет — и на экран под заголовком
    «Готовый ответ (с SEO-ключами)» выводился служебный промпт для нейросети,
    вместе со строкой «Верни JSON: { "replyText": "твой ответ" }». Ниже стояла
    кнопка «Скопировать» и подпись «вставьте в Яндекс.Карты или 2ГИС», то есть
    владельца прямо звали опубликовать это под отзывом пациента. Плюс фальшивая
    задержка 600 мс изображала обращение к серверу, которого не было.
    СТАЛО: черновик собирается здесь же, мгновенно и без сети, из тональности,
    названия клиники, телефона главврача и SEO-ключей — разбор в
    components/marketing/reviewReplyDraft.ts. Ничего про сам приём не выдумывает.
  */
	const handleGenerate = () => {
		let text = reviewText;
		let effectiveTone = tone;
		if (!text.trim()) {
			text =
				"Отличный доктор, внимательный персонал, качественное и безболезненное лечение!";
			effectiveTone = "positive";
			setReviewText(text);
			setTone("positive");
			showToast(
				"Подставлен типовой положительный отзыв для быстрого ответа",
				"info",
			);
		}
		const draft = buildReviewReplyDraft({
			reviewText: text,
			tone: effectiveTone,
			clinicName,
			chiefDoctorPhone: phone,
		});
		if (!draft) {
			setGeneratedReply("");
			setDraftWarnings([]);
			return;
		}
		setCopied(false);
		setCopyError(null);
		setGeneratedReply(draft.text);
		setDraftWarnings(draft.warnings);
	};

	/*
    БЫЛО: navigator.clipboard.writeText(...).then(...) без проверки и без .catch.
    Клиники часто открывают CRM по локальному адресу вида http://192.168.1.10 —
    это не защищённый контекст, и там navigator.clipboard просто НЕ СУЩЕСТВУЕТ.
    Обращение к .writeText у undefined бросало исключение прямо из обработчика
    нажатия, его ловила граница ошибок раздела, и вместо маркетинга появлялось
    «Раздел временно не открылся»: человек нажал «скопировать» и потерял экран
    вместе с набранным отзывом. Если же буфер есть, но браузер отказал в доступе,
    обещание отклонялось молча — кнопка выглядела мёртвой.
    СТАЛО: отказ буфера — это подсказка «выделите текст и скопируйте вручную»,
    а текст ответа теперь лежит в редактируемом поле, откуда это возможно.
  */
	const handleCopy = () => {
		if (!generatedReply) return;
		const clipboard = navigator.clipboard;
		if (!clipboard || typeof clipboard.writeText !== "function") {
			setCopyError(
				"Браузер не разрешает копировать в буфер по этому адресу. Выделите текст ответа мышкой и скопируйте сами: Ctrl+C.",
			);
			return;
		}
		clipboard
			.writeText(generatedReply)
			.then(() => {
				setCopyError(null);
				setCopied(true);
				setTimeout(() => setCopied(false), 2500);
			})
			.catch((copyFailure) => {
				logger.warn("[Маркетинг] Буфер обмена отказал:", copyFailure);
				setCopyError(
					"Скопировать не получилось. Выделите текст ответа мышкой и скопируйте сами: Ctrl+C.",
				);
			});
	};

	const clearAll = () => {
		setReviewText("");
		setGeneratedReply("");
		setDraftWarnings([]);
		setCopyError(null);
		setCopied(false);
	};

	return (
		<section
			className="settings-zone marketing-zone panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
			id="marketing"
			aria-label="Маркетинг/SEO"
			data-testid="marketing-view"
		>
			<div className="panel-heading settings-heading mb-4">
				<h2 title="Маркетинг и привлечение: работа с отзывами на геосервисах, продвижение и воронка сарафанного радио">
					Маркетинг / SEO
				</h2>
				<span className="status-pill status-confirmed">активен</span>
			</div>

			{/* OWNER ROMI MARKETING TABLE */}
			<MarketingRomiTable />

			{/* RECALL LIST: ВОЗВРАТ ПАЦИЕНТОВ */}
			<div className="mt-6 mb-6">
				<RecallListPanel />
			</div>

			{/* TAB NAV */}
			<div className="marketing-tab-nav" role="tablist">
				<button
					className={`marketing-tab ${activeTab === "reviews" ? "active" : ""}`}
					onClick={() => setActiveTab("reviews")}
					role="tab"
					aria-selected={activeTab === "reviews"}
					type="button"
				>
					<MessageSquare aria-hidden="true" />
					Ответ на отзыв
				</button>
				<button
					className={`marketing-tab ${activeTab === "instructions" ? "active" : ""}`}
					onClick={() => setActiveTab("instructions")}
					role="tab"
					aria-selected={activeTab === "instructions"}
					type="button"
				>
					<BookOpen aria-hidden="true" />
					Инструкция по отзывам
				</button>
			</div>

			{/* REVIEW REPLY TAB */}
			{activeTab === "reviews" ? (
				<div className="marketing-panel">
					<div className="marketing-form-grid">
						<div>
							<label className="field-label" htmlFor="mkt-phone">
								Телефон главного врача (для негатива)
							</label>
							<input
								className="text-input"
								id="mkt-phone"
								type="tel"
								value={phone}
								onChange={handlePhoneChange}
								placeholder="+7 (000) 000-00-00"
							/>
						</div>

						<div>
							<span className="field-label">Тональность отзыва</span>
							<fieldset
								className="marketing-tone-group"
								aria-label="Тональность"
							>
								<button
									type="button"
									className={`tone-btn ${tone === "positive" ? "active" : ""}`}
									onClick={() => setTone("positive")}
									aria-pressed={tone === "positive"}
									style={{ minHeight: "44px" }}
								>
									<ThumbsUp aria-hidden="true" /> Позитив
								</button>
								<button
									type="button"
									className={`tone-btn ${tone === "neutral" ? "active" : ""}`}
									onClick={() => setTone("neutral")}
									aria-pressed={tone === "neutral"}
									style={{ minHeight: "44px" }}
								>
									<MinusCircle aria-hidden="true" /> Нейтральный
								</button>
								<button
									type="button"
									className={`tone-btn tone-btn-negative ${tone === "negative" ? "active" : ""}`}
									onClick={() => setTone("negative")}
									aria-pressed={tone === "negative"}
									style={{ minHeight: "44px" }}
								>
									<ThumbsDown aria-hidden="true" /> Негатив
								</button>
							</fieldset>
						</div>
					</div>

					<div>
						<label className="field-label" htmlFor="mkt-review">
							Текст отзыва (скопируйте с Яндекса / 2ГИС)
						</label>
						<textarea
							className="text-input"
							id="mkt-review"
							rows={5}
							value={reviewText}
							onChange={(e) => setReviewText(e.target.value)}
							placeholder="Вставьте текст отзыва сюда..."
							style={{ resize: "vertical", fontFamily: "inherit" }}
						/>
						<div
							className="quick-chips-row"
							style={{ marginTop: "8px", marginBottom: "16px" }}
						>
							<button
								type="button"
								className="quick-chip"
								onClick={() => {
									setReviewText(
										"Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли!",
									);
									setTone("positive");
								}}
								style={{ minHeight: "44px" }}
							>
								<ThumbsUp size={14} className="inline mr-1 text-emerald-500" /> Удаление зуба (Позитив)
							</button>
							<button
								type="button"
								className="quick-chip"
								onClick={() => {
									setReviewText(
										"Долго ждал приема, администратор даже не поздоровалась.",
									);
									setTone("negative");
								}}
								style={{ minHeight: "44px" }}
							>
								<ThumbsDown size={14} className="inline mr-1 text-rose-500" /> Очередь (Негатив)
							</button>
							<button
								type="button"
								className="quick-chip"
								onClick={() => {
									setReviewText("Обычная клиника, цены средние.");
									setTone("neutral");
								}}
								style={{ minHeight: "44px" }}
							>
								<Minus size={14} className="inline mr-1 text-slate-500" /> Обычный отзыв (Нейтраль)
							</button>
						</div>
					</div>

					<div className="marketing-actions">
						<button
							className="primary-button"
							type="button"
							onClick={handleGenerate}
							disabled={false}
							style={{ minHeight: "44px" }}
						>
							<MessageSquare aria-hidden="true" />
							Составить черновик ответа
						</button>
						{generatedReply ? (
							<button
								className="secondary-button"
								type="button"
								onClick={clearAll}
								style={{ minHeight: "44px" }}
							>
								Очистить
							</button>
						) : null}
					</div>

					{generatedReply ? (
						<div className="marketing-result">
							<div className="marketing-result-header">
								{/*
                  Заголовок был «Готовый ответ (с SEO-ключами)» — и это была
                  неправда дважды: ответ был не готовый (служебный промпт) и без
                  ключей. Теперь честно: это заготовка, её надо прочитать и
                  дописать под свой случай, поле для этого редактируемое.
                */}
								<p className="eyebrow">
									Черновик ответа — прочитайте и поправьте под свой случай
								</p>
								<button
									type="button"
									className={`icon-button ${copied ? "copied" : ""}`}
									onClick={handleCopy}
									aria-label="Скопировать ответ"
									title="Скопировать"
								>
									{copied ? (
										<CheckCircle2
											aria-hidden="true"
											className="text-emerald-600 dark:text-emerald-400"
										/>
									) : (
										<Copy aria-hidden="true" />
									)}
								</button>
							</div>
							<textarea
								className="text-input marketing-reply-text"
								aria-label="Черновик ответа на отзыв, его можно править"
								rows={7}
								value={generatedReply}
								onChange={(e) => {
									setGeneratedReply(e.target.value);
									setCopied(false);
								}}
								style={{
									resize: "vertical",
									fontFamily: "inherit",
									width: "100%",
								}}
							/>
							{draftWarnings.length > 0 ? (
								<ul className="text-xs text-[var(--muted,#94a3b8)] mt-2 pl-5 space-y-1">
									{draftWarnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							) : null}
							{copyError ? (
								<p
									className="text-xs text-[var(--danger,#e63946)] mt-2 font-bold"
									role="alert"
								>
									{copyError}
								</p>
							) : null}
							{copied ? (
								<p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold">
									✓ Скопировано в буфер — перечитайте перед отправкой и вставьте
									в Яндекс.Карты или 2ГИС
								</p>
							) : null}
						</div>
					) : null}
				</div>
			) : null}

			{/* INSTRUCTIONS TAB */}
			{activeTab === "instructions" ? (
				<div
					className="marketing-panel"
					style={{
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						borderRadius: "12px",
						padding: "16px",
					}}
				>
					<h3 style={{ marginTop: 0 }}>Инструкция по работе с отзывами</h3>
					<ol className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-5 space-y-1">
						<li>
							Откройте страницу клиники на <strong>Яндекс.Картах</strong> или{" "}
							<strong>2ГИС</strong>
						</li>
						<li>Скопируйте текст нового отзыва</li>
						<li>Вставьте в поле на вкладке «Ответ на отзыв»</li>
						<li>Выберите тональность (позитив / нейтральный / негатив)</li>
						<li>Нажмите «Сгенерировать ответ»</li>
						<li>Скопируйте готовый текст и вставьте в ответ на карте</li>
					</ol>

					<div className="marketing-warning" role="note">
						<strong>⚠ Важно:</strong> Никогда не используйте боты и
						автоматический сбор отзывов — это ведёт к бану аккаунта и штрафам от
						площадок. Только ручной copy-paste + умная генерация ответа.
					</div>

					<h3 style={{ marginTop: 24 }}>Формула ответа на негативный отзыв</h3>
					<div className="marketing-formula">
						<span className="formula-step">1. Искреннее извинение</span>
						<span className="formula-arrow">→</span>
						<span className="formula-step">
							2. Признание важности обратной связи
						</span>
						<span className="formula-arrow">→</span>
						<span className="formula-step">
							3. Призыв позвонить главврачу для решения
						</span>
					</div>
				</div>
			) : null}

			{/*
        Здесь была сетка мелких виджетов раздела. Снята целиком вместе с
        контейнером: после того как из неё убрали последние три панели, живых
        карточек в ней не осталось, а пустой grid с mt-8 давал бы только полосу
        воздуха под списком возвратов. Раздел теперь заканчивается блоком
        «Возврат пациентов» — единственным, по которому в клинике работают руками.

        Ниже — почему каждая панель не могла заполниться. Не возвращайте их, не
        прочитав это: у всех трёх были и таблица, и маршрут, и виджет, и ни у
        одной — писателя. Проверено 2026-07-28 на живой PostgreSQL: во всех трёх
        таблицах 0 строк, и это не «клиника ещё не заполнила», а некому заполнить.

        1. «Сопоставления полей лендингов» (LandingFieldMappingsWidget, таблица
           landing_field_mappings). Обещала работающую интеграцию с
           конструкторами лендингов, которой в коде нет ни для одного из них:
           маршрут /api/integrations/landing-field-mappings только читает (один
           select в getLandingFieldMappingsFromDb), insert в эту таблицу
           отсутствует во всём apps/api, а экрана, где сопоставление настраивают,
           не существует. Надпись «Сопоставления полей лендингов не настроены»
           читалась как «настрой меня», хотя настраивать негде и читать настройку
           некому. Стояла рядом с настоящими цифрами маркетинга и подрывала
           доверие именно к ним. Мелкой клинике заявку с сайта проще получить
           звонком или сообщением — этот путь в продукте уже работает.

        2. «Источники семейных рекомендаций» (FamilyRecommendationSourcesWidget,
           таблица family_recommendation_sources). Показывала 404 под видом
           «данных пока нет»: маршрута /api/marketing/family-recommendation-sources
           в apps/api нет вообще, существуют только таблица и миграция. Владелец
           делал из этого вывод, что рекомендаций у него не бывает. Кабинет на два
           кресла и так помнит, кто кого привёл, а чтобы цифра стала настоящей,
           нужны колонка источника у пациента, справочник источников и место в
           приёме, где источник указывают.

        3. «Конструктор типов задач» (CustomCrmTaskTypesWidget, таблица
           custom_crm_task_types). Та же пустая панель была повторена в трёх
           разделах сразу; маршрут /api/crm/custom-crm-task-types только читает,
           создать тип задачи нечем. В маркетинге она была вдобавок не по теме.
           Сам файл виджета не удалён: его монтируют и другие разделы.

        Раньше отсюда убрали ещё две панели, их разбор сохраняю здесь же.

        LostPatientsFiltersWidget: читал таблицу lost_patients_filters, в которую
        в проекте никто не пишет — список был снимком, сделанным неизвестно когда,
        и обновиться не мог. Живой расчёт стоит выше.

        Второй экземпляр блока «Кому засчитана повторная запись» (тот же самый,
        что и в разделе «Аналитика») удалён вместе с маршрутом
        /api/hr/rebooking-conversion-rules. Сервер всегда отвечал HTTP 200 и
        пустым массивом, на обоих экранах сразу: в таблице
        rebooking_conversion_rules 0 строк и ноль писателей. На живой расчёт не
        переведено потому, что у appointments нет ни created_at, ни
        created_by_user_id — то есть ни «когда записали», ни «кто записал», а
        doctor_user_id это лечащий врач, а не автор записи. Подробный разбор и
        формулировка долга — в комментарии на том же месте в
        apps/web/src/pages/AnalyticsDashboardView.tsx.
      */}
		</section>
	);
}
