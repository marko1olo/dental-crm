import { showToast } from "./components/GlobalToast";
import { actionFailureToast } from "./lib/panelStateText";
import { logger } from "./utils/logger";
import "./styles/marketing.css";
import {
	CheckCircle2,
	Copy,
	Globe,
	MapPin,
	MessageSquare,
	MinusCircle,
	Search,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { buildReviewReplyDraft } from "./components/marketing/reviewReplyDraft";
import { RecallListPanel } from "./components/patients/RecallListPanel";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "./lib/safeLocalStorage";

type MarketingStats = {
	yandex: { rating: number; reviews: number };
	gis2: { rating: number; reviews: number };
	google: { rating: number; reviews: number };
};

const DEFAULT_STATS: MarketingStats = {
	yandex: { rating: 0, reviews: 0 },
	gis2: { rating: 0, reviews: 0 },
	google: { rating: 0, reviews: 0 },
};

type ReviewTone = "positive" | "negative" | "neutral";

/*
  ПОЧЕМУ ПОЯВИЛИСЬ ЭТИ ДВЕ ОБЁРТКИ. Всё, что вводят на этом экране (телефон
  главврача, рейтинги площадок, SEO-ключи), лежит только в localStorage браузера,
  и обращались к нему напрямую. Если браузер запретил хранилище — заблокированы
  cookie, жёсткий приватный режим, переполнена квота, — то бросает САМ вызов
  localStorage.getItem. А стоял он в инициализаторе useState, то есть исключение
  летело при первой отрисовке и уносило весь раздел: владелец видел «Раздел
  временно не открылся» вместо маркетинга, и починить это из интерфейса было
  нечем. Запись бросала так же, но уже на каждое нажатие клавиши в поле.
  Теперь отказ хранилища означает только «не запомнится до перезагрузки», а не
  потерю раздела и не потерю набранного текста. Чтение/запись идут через
  safeLocalStorage — единая точка try/catch для всего web-клиента.
*/
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
	const [customSeoKeys, setCustomSeoKeys] = useState(() => {
		try {
			const saved = readStored("dental_crm_mkt_seo_keys");
			const parsed = saved ? JSON.parse(saved) : null;
			// Читаем чужой JSON из браузера: массивом он быть не обязан. Если там
			// объект или строка, дальше .map/.filter уронили бы весь раздел.
			if (Array.isArray(parsed) && parsed.every((k) => typeof k === "string"))
				return parsed as string[];
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.warn(
				"[Marketing] Failed to parse saved SEO keys from localStorage:",
				e,
			);
		}
		return [
			"лечение кариеса",
			"безболезненное удаление",
			"стоматология",
			"профессиональная гигиена",
			"имплантация зубов",
		];
	});

	const handleAddSeoKey = (val: string) => {
		if (!val.trim()) return;
		const updated = [...customSeoKeys, val.trim()];
		setCustomSeoKeys(updated);
		writeStored("dental_crm_mkt_seo_keys", JSON.stringify(updated));
	};

	const handleRemoveSeoKey = (val: string) => {
		const updated = customSeoKeys.filter((k: string) => k !== val);
		setCustomSeoKeys(updated);
		writeStored("dental_crm_mkt_seo_keys", JSON.stringify(updated));
	};

	const [reviewText, setReviewText] = useState("");
	const [tone, setTone] = useState<ReviewTone>("positive");
	const [generatedReply, setGeneratedReply] = useState("");
	/*
    БЫЛО: если ни в браузере, ни в профиле клиники телефона нет, в поле
    подставлялось «+7 (800) 000-00-00». Это выдуманный номер, и поле с ним
    выглядело в точности как заполненное человеком — рамка, чёрный текст, не
    подсказка. Такой номер попадал в ответ на негативный отзыв («позвоните
    главврачу»), то есть публично на карточку клиники уходил телефон, по
    которому никто не ответит. Теперь пусто — это пусто, а как выглядит номер,
    показывает placeholder ниже.
  */
	const [phone, setPhone] = useState(() => {
		return readStored("dental_crm_mkt_phone") || clinicPhone || "";
	});

	const [stats, setStats] = useState<MarketingStats>(() => {
		try {
			const saved = readStored("dental_crm_mkt_stats");
			const parsed = saved ? JSON.parse(saved) : null;
			// Достраиваем каждую площадку поверх нулей: сохранённый объект мог
			// прийти из версии, где Google ещё не было, и stats.google.rating
			// уронило бы раздел на чтении undefined.
			if (parsed && typeof parsed === "object") {
				return {
					yandex: {
						...DEFAULT_STATS.yandex,
						...(parsed as MarketingStats).yandex,
					},
					gis2: { ...DEFAULT_STATS.gis2, ...(parsed as MarketingStats).gis2 },
					google: {
						...DEFAULT_STATS.google,
						...(parsed as MarketingStats).google,
					},
				};
			}
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.warn(
				"[Marketing] Failed to parse saved stats from localStorage:",
				e,
			);
		}
		return DEFAULT_STATS;
	});

	const [copied, setCopied] = useState(false);
	const [activeTab, setActiveTab] = useState<"reviews" | "stats" | "keys">(
		"reviews",
	);

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setPhone(val);
		writeStored("dental_crm_mkt_phone", val);
	};

	const updateStat = (
		platform: keyof MarketingStats,
		field: "rating" | "reviews",
		value: string,
	) => {
		const num = parseFloat(value) || 0;
		const newStats = {
			...stats,
			[platform]: { ...stats[platform], [field]: num },
		};
		setStats(newStats);
		writeStored("dental_crm_mkt_stats", JSON.stringify(newStats));
	};

	/*
    ВЫДУМАННАЯ ЦИФРА, КОТОРУЮ ВИДЕЛИ ВСЕ. В карточке «Позиция в поиске» стояло
    жёстко вписанное в вёрстку «Топ-3 по "стоматология"» — одинаковое у каждой
    клиники, ни откуда не взятое и ничем не проверяемое. Рядом честная подпись
    «Укажите актуальные данные вручную», при этом указать было негде: поля ввода
    в карточке не существовало. То есть владельцу показывали приятную неправду о
    его собственном продвижении и предлагали её обновить нечем. Позицию в поиске
    не отдаёт ни одна площадка, её действительно считают руками, поэтому карточку
    не убрал, а сделал тем, чем она притворялась: два поля, которые владелец
    заполняет сам, и явная пометка «вы записали», чтобы цифру нельзя было принять
    за измеренную системой. Хранится там же, где рейтинги — в браузере;
    ДОЛГ: общего на клинику хранилища для этих цифр нет, нужна таблица и маршрут
    в apps/api (чужая зона), пока цифры видны только на том компьютере, где их
    ввели.
  */
	const [rankQuery, setRankQuery] = useState(
		() => readStored("dental_crm_mkt_rank_query") || "",
	);
	const [rankPlace, setRankPlace] = useState(
		() => readStored("dental_crm_mkt_rank_place") || "",
	);

	const handleRankQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRankQuery(e.target.value);
		writeStored("dental_crm_mkt_rank_query", e.target.value);
	};

	const handleRankPlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRankPlace(e.target.value);
		writeStored("dental_crm_mkt_rank_place", e.target.value);
	};

	const [newKeyInput, setNewKeyInput] = useState("");
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
		const draft = buildReviewReplyDraft({
			reviewText,
			tone,
			clinicName,
			chiefDoctorPhone: phone,
			seoKeys: customSeoKeys,
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

			{/* STATS STRIP */}
			<section className="marketing-stats-strip" aria-label="Рейтинги клиники">
				<article className="marketing-stat-card">
					<MapPin aria-hidden="true" className="text-[var(--danger,#e63946)]" />
					<div>
						<p className="eyebrow">Яндекс.Карты</p>
						<div className="marketing-rating flex gap-2 mt-1">
							<input
								type="number"
								step="0.1"
								value={stats.yandex.rating || ""}
								onChange={(e) => updateStat("yandex", "rating", e.target.value)}
								placeholder="Оценка"
								className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
							<input
								type="number"
								value={stats.yandex.reviews || ""}
								onChange={(e) =>
									updateStat("yandex", "reviews", e.target.value)
								}
								placeholder="Отзывов"
								className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
						</div>
					</div>
				</article>
				<article className="marketing-stat-card">
					<Globe
						aria-hidden="true"
						className="text-[var(--brand-500,#2196f3)]"
					/>
					<div>
						<p className="eyebrow">2ГИС</p>
						<div className="marketing-rating flex gap-2 mt-1">
							<input
								type="number"
								step="0.1"
								value={stats.gis2.rating || ""}
								onChange={(e) => updateStat("gis2", "rating", e.target.value)}
								placeholder="Оценка"
								className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
							<input
								type="number"
								value={stats.gis2.reviews || ""}
								onChange={(e) => updateStat("gis2", "reviews", e.target.value)}
								placeholder="Отзывов"
								className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
						</div>
					</div>
				</article>
				<article className="marketing-stat-card">
					<Search
						aria-hidden="true"
						className="text-[var(--teal-500,#0f766e)]"
					/>
					<div>
						<p className="eyebrow">Google</p>
						<div className="marketing-rating flex gap-2 mt-1">
							<input
								type="number"
								step="0.1"
								value={stats.google.rating || ""}
								onChange={(e) => updateStat("google", "rating", e.target.value)}
								placeholder="Оценка"
								className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
							<input
								type="number"
								value={stats.google.reviews || ""}
								onChange={(e) =>
									updateStat("google", "reviews", e.target.value)
								}
								placeholder="Отзывов"
								className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
						</div>
					</div>
				</article>
				<article className="marketing-stat-card col-span-full">
					<TrendingUp
						aria-hidden="true"
						className="text-[var(--teal-500,#0f766e)]"
					/>
					<div>
						<p className="eyebrow">Позиция в поиске</p>
						<div className="marketing-rating flex gap-2 mt-1 flex-wrap">
							<input
								type="text"
								value={rankQuery}
								onChange={handleRankQueryChange}
								placeholder="Запрос, например: стоматология Химки"
								aria-label="Запрос, по которому проверяли позицию клиники"
								className="flex-1 min-w-[12rem] px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
							<input
								type="number"
								min="1"
								step="1"
								value={rankPlace}
								onChange={handleRankPlaceChange}
								placeholder="Место"
								aria-label="Какое по счёту место занимает клиника"
								className="w-20 px-1.5 py-0.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
							/>
						</div>
						<p className="text-xs text-[var(--muted,#94a3b8)] mt-1">
							{rankQuery.trim() && rankPlace.trim()
								? `Вы записали: ${rankPlace} место по запросу «${rankQuery.trim()}». Проверьте заново через месяц — тогда будет видно, растёте вы или падаете.`
								: "Пока не заполнено. Наберите свой запрос в Яндексе, посчитайте, какой по счёту в списке идёт ваша клиника, и впишите запрос и место. Сама система эту цифру узнать не может — её нигде не отдают."}
						</p>
					</div>
				</article>
			</section>

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
					className={`marketing-tab ${activeTab === "keys" ? "active" : ""}`}
					onClick={() => setActiveTab("keys")}
					role="tab"
					aria-selected={activeTab === "keys"}
					type="button"
				>
					<Search aria-hidden="true" />
					SEO-ключи
				</button>
				<button
					className={`marketing-tab ${activeTab === "stats" ? "active" : ""}`}
					onClick={() => setActiveTab("stats")}
					role="tab"
					aria-selected={activeTab === "stats"}
					type="button"
				>
					<TrendingUp aria-hidden="true" />
					Инструкции
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
								>
									<ThumbsUp aria-hidden="true" /> Позитив
								</button>
								<button
									type="button"
									className={`tone-btn ${tone === "neutral" ? "active" : ""}`}
									onClick={() => setTone("neutral")}
									aria-pressed={tone === "neutral"}
								>
									<MinusCircle aria-hidden="true" /> Нейтральный
								</button>
								<button
									type="button"
									className={`tone-btn tone-btn-negative ${tone === "negative" ? "active" : ""}`}
									onClick={() => setTone("negative")}
									aria-pressed={tone === "negative"}
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
							>
								👍 Удаление зуба (Позитив)
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
							>
								👎 Очередь (Негатив)
							</button>
							<button
								type="button"
								className="quick-chip"
								onClick={() => {
									setReviewText("Обычная клиника, цены средние.");
									setTone("neutral");
								}}
							>
								😐 Обычный отзыв (Нейтраль)
							</button>
						</div>
					</div>

					<div className="marketing-actions">
						<button
							className="primary-button"
							type="button"
							onClick={handleGenerate}
							disabled={!reviewText.trim()}
						>
							<MessageSquare aria-hidden="true" />
							Составить черновик ответа
						</button>
						{generatedReply ? (
							<button
								className="secondary-button"
								type="button"
								onClick={clearAll}
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

			{/* SEO KEYS TAB */}
			{activeTab === "keys" ? (
				<div
					className="marketing-panel"
					style={{
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						borderRadius: "12px",
						padding: "16px",
					}}
				>
					<p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
						Эти ключи автоматически передаются ИИ для вставки в ответы на
						отзывы. Они помогают продвижению клиники в поиске.
					</p>
					<div className="flex gap-2 mb-4">
						<input
							type="text"
							className="text-input"
							value={newKeyInput}
							onChange={(e) => setNewKeyInput(e.target.value)}
							placeholder="Новый SEO-ключ (напр. 'детский ортодонт')"
						/>
						<button
							type="button"
							className="secondary-button"
							onClick={() => {
								handleAddSeoKey(newKeyInput);
								setNewKeyInput("");
							}}
						>
							Добавить
						</button>
					</div>
					<div className="seo-keys-grid">
						{customSeoKeys.map((key: string) => (
							<span
								className="seo-key-chip"
								key={key}
								style={{ display: "flex", alignItems: "center", gap: "6px" }}
							>
								{key}
								<button
									type="button"
									onClick={() => handleRemoveSeoKey(key)}
									className="bg-transparent border-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0"
								>
									×
								</button>
							</span>
						))}
					</div>

					<p className="eyebrow mt-5">Правило вставки ключей</p>
					<ul className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-5 mt-2 space-y-1">
						<li>
							<strong>Позитив/нейтральный:</strong> 1-2 ключа естественно в
							тексте
						</li>
						<li>
							<strong>Негатив:</strong> 0-1 ключ, минимально, чтобы не выглядело
							цинично
						</li>
					</ul>
				</div>
			) : null}

			{/* INSTRUCTIONS TAB */}
			{activeTab === "stats" ? (
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
        Возврат пациентов. Во всю ширину и последним в разделе: это единственный
        блок здесь, по которому в клинике действительно работают руками — звонят и
        приглашают. Про «стоит перед мелкими виджетами» в прежней редакции этого
        комментария больше не верно: сетки виджетов под ним нет, см. ниже почему.
      */}
			<div className="mt-8">
				<RecallListPanel />
			</div>

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
