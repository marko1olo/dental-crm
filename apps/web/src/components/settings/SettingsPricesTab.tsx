import type { DentalSpecialty, ServiceCategory } from "@dental/shared";
import {
	Bot,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Database,
	Edit3,
	FileJson,
	FolderTree,
	ImageIcon,
	Plus,
	ReceiptText,
	Search,
	Sparkles,
	Trash2,
	UploadCloud,
	X,
} from "lucide-react";
import "./SettingsPricesTab.css";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { PriceDictationBar } from "../../PriceDictationBar";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import {
	staffMutationHeaders,
	type SettingsAccessHeaders,
} from "./staffMutationRequest";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

const NEW_SERVICE_TEMPLATE = {
	title: "",
	code: "",
	category: "therapy" as ServiceCategory,
	specialty: "therapist" as DentalSpecialty,
	/*
	   Значение по умолчанию нужно только для формы запроса: настоящая цена
	   набирается в priceRubInput строкой и подставляется сюда при сохранении
	   (см. handleSaveService). Читать её из этого объекта нельзя — она устарела.
	*/
	basePriceRub: 0,
	durationMinutes: 30,
	taxDeductible: true,
	active: true,
};

/**
 * Цена из каталога — в текстовое поле формы.
 *
 * Возвращает ровно ту запись, которую потом принимает normalizeRubAmountInput:
 * круглая сумма без дробной части, копейки — через запятую («1500», «1500,50»).
 * Округление считается целыми копейками: у части значений умножение на сто на
 * двоичной плавающей точке даёт хвост (1500.505 * 100 = 150050.49999999999).
 *
 * Строка на входе допущена намеренно: колонка base_price_rub имеет тип numeric
 * и у драйвера базы такие значения умеют приходить строками.
 */
function rubToPriceInput(value: number | string | null | undefined): string {
	const amountRub = typeof value === "string" ? Number(value) : value;
	if (
		typeof amountRub !== "number" ||
		!Number.isFinite(amountRub) ||
		amountRub < 0
	) {
		return "";
	}
	const kopecks = Math.round(amountRub * 100);
	return kopecks % 100 === 0
		? String(kopecks / 100)
		: (kopecks / 100).toFixed(2).replace(".", ",");
}

export function SettingsPricesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		pricelistRecognitionServiceGroups,
		pricelistRecognitionBrandGroups,
		pricelistText,
		setPricelistText,
		pricelistImageName,
		attachPricelistImage,
		usePricelistAi,
		setUsePricelistAi,
		analyzePricelist,
		isPricelistAnalyzing,
		pricelistImageBase64,
		pricelistAnalysis,
		pricelistParserModeLabels,
		serviceCategoryLabels,
		specialtyLabels,
		/*
		   ШЕСТИ ИМЁН ЗДЕСЬ БОЛЬШЕ НЕТ, И ЭТО НЕ ПОТЕРЯ ПОВЕРХНОСТИ.

		   Вкладка вынимала из общего мешка подпись к фото прайса, сводку
		   материалов по категориям, материал отдельной строки, разбор кодов
		   предупреждений и две таблицы подписей к материалам и типам реставраций —
		   и не читала ни одно из шести нигде ниже. Строка деструктуризации была
		   ЕДИНСТВЕННЫМ вхождением каждого имени в файле, то есть значение
		   доезжало до вкладки и обрывалось на ней.

		   Рисует их родитель — SettingsView.tsx, четырьмя блоками прямо над
		   <SettingsPricesTab />, в той же вкладке «Цены» (замечания ко всему
		   файлу, «Фото прайса: …», «Материалы, распознанные в прайсе», «Проверьте
		   руками: строк с предупреждениями — N из M»); таблицы подписей читает
		   pricelistUiMeta внутри этих же вызовов. Нарисовать их здесь ещё раз
		   значило бы показать клинике один и тот же текст дважды на одном экране,
		   поэтому имена сняты, а не включены. Возвращать их сюда можно только
		   вместе с переносом блоков из родителя, а не рядом с ними.
		*/
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
	} = mergedProps;

	const [activeTab, setActiveTab] = useState<"catalog" | "ai_import">(
		"catalog",
	);
	const [searchQuery, setSearchQuery] = useState("");

	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState(NEW_SERVICE_TEMPLATE);
	/*
	   Цена живёт строкой, пока её набирают, и превращается в число один раз —
	   при сохранении. Число в состоянии означало разбор на каждом нажатии
	   клавиши, а разбор на каждом нажатии означал, что незаконченный ввод
	   («1500,» на пути к «1500,50») обязан во что-то превратиться немедленно.
	   Превращался он в ноль.
	*/
	const [priceRubInput, setPriceRubInput] = useState("");
	const [priceProblem, setPriceProblem] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<{
		count?: number;
		error?: string;
	} | null>(null);

	const typedServiceCatalog = dashboard?.serviceCatalog || [];

	const typedPricelistRecognitionServiceGroups =
		pricelistRecognitionServiceGroups as Array<{
			title: string;
			items: string[];
		}>;
	const typedPricelistRecognitionBrandGroups =
		pricelistRecognitionBrandGroups as Array<{
			title: string;
			items: string[];
		}>;
	const typedPricelistAnalysis = pricelistAnalysis as any;

	/*
	 * Сессионный секрет домена настроек + токены кабинета/сотрудника.
	 * Раньше импорт читал dente_clinic_token из localStorage и клал его в
	 * x-dente-admin-secret — в клинике с DENTE_SETTINGS_ADMIN_SECRET это 403,
	 * а маршрут /api/settings/catalog-import на сервере не существует.
	 */
	const accessHeaders = (mergedProps as { auth?: { settingsAccessHeaders?: SettingsAccessHeaders } })
		.auth?.settingsAccessHeaders;

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			items = items.filter(
				(s) =>
					s.title.toLowerCase().includes(q) ||
					s.code?.toLowerCase().includes(q),
			);
		}
		return items.sort((a, b) => a.title.localeCompare(b.title));
	}, [typedServiceCatalog, searchQuery]);

	const groupedCatalog = useMemo(() => {
		const groups: Record<string, any[]> = {};
		filteredCatalog.forEach((item) => {
			const cat = item.category || "other";
			if (!groups[cat]) groups[cat] = [];
			groups[cat].push(item);
		});
		return groups;
	}, [filteredCatalog]);

	const handleImportCatalog = async () => {
		if (!typedPricelistAnalysis?.items) return;
		setIsImporting(true);
		setImportResult(null);

		const validItems = typedPricelistAnalysis.items.filter(
			(item: any) => item.priceRub !== null,
		);
		if (validItems.length === 0) {
			setImportResult({ error: "Нет позиций с ценой для импорта" });
			setIsImporting(false);
			return;
		}

		/*
		 * Bulk-маршрута нет: на сервере только POST /api/settings/catalog
		 * (одна услуга). Импорт идёт по одной позиции с теми же заголовками,
		 * что createServiceCatalogItem — settingsAccessHeaders / staffMutationHeaders,
		 * без ручного localStorage.getItem("dente_clinic_token").
		 */
		const headers = staffMutationHeaders(accessHeaders);
		let imported = 0;
		const failures: string[] = [];

		try {
			for (const item of validItems) {
				const payload = {
					title: String(item.title || "").trim(),
					code: item.code ? String(item.code) : undefined,
					category: item.category || "other",
					specialty: item.specialty || "therapist",
					basePriceRub: item.priceRub,
					durationMinutes:
						typeof item.durationMinutes === "number"
							? item.durationMinutes
							: 30,
					taxDeductible: item.taxDeductible !== false,
					active: true,
				};
				if (!payload.title) {
					failures.push("(без названия)");
					continue;
				}
				try {
					const res = await fetch("/api/settings/catalog", {
						method: "POST",
						headers,
						body: JSON.stringify(payload),
					});
					const raw = await res.text();
					if (!res.ok) {
						let message = `HTTP ${res.status}`;
						try {
							const parsed = JSON.parse(raw) as { message?: string };
							if (parsed.message) message = parsed.message;
						} catch {
							/* тело не JSON — оставляем код */
						}
						failures.push(`${payload.title}: ${message}`);
						continue;
					}
					imported += 1;
				} catch (err: unknown) {
					const message =
						err instanceof Error ? err.message : "сеть недоступна";
					failures.push(`${payload.title}: ${message}`);
				}
			}

			if (imported === 0) {
				setImportResult({
					error:
						failures[0] ||
						"Ни одна позиция не сохранена. Проверьте секрет настроек.",
				});
				return;
			}

			if (failures.length > 0) {
				setImportResult({
					count: imported,
					error: `Сохранено ${imported}, с ошибкой ${failures.length}: ${failures[0]}`,
				});
			} else {
				setImportResult({ count: imported });
			}
			if (failures.length === 0) {
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			}
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Ошибка импорта";
			setImportResult({ error: message });
		} finally {
			setIsImporting(false);
		}
	};

	const handleSaveService = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!createServiceCatalogItem || !updateServiceCatalogItem) {
			mergedProps.setError?.("API недоступно");
			return;
		}
		/*
		   Разбор цены — общей normalizeRubAmountInput, той же, что в кассе, в
		   заказах ЗТЛ и в плане лечения. Она понимает запятую и разделители
		   разрядов и отказывает на трёх знаках после запятой, а не округляет за
		   пользователя. Непонятная цена больше не превращается в ноль молча:
		   услуга не сохраняется, а поле говорит, что поправить.

		   Ноль допущен: серверная схема basePriceRub — nonNegativeMoneyRubSchema,
		   бесплатная позиция в каталоге законна. Запрещено другое — НЕЯВНЫЙ ноль,
		   которого никто не вводил.
		*/
		const basePriceRub = normalizeRubAmountInput(priceRubInput);
		if (basePriceRub === null) {
			setPriceProblem(
				priceRubInput.trim()
					? "Цена непонятна. Впишите сумму цифрами, копейки после запятой: 1500 или 1500,50."
					: "Укажите цену услуги: например 1500 или 1500,50.",
			);
			return;
		}
		setPriceProblem(null);
		setIsSaving(true);
		try {
			const servicePayload = { ...editServiceForm, basePriceRub };
			if (editServiceId === "new") {
				await createServiceCatalogItem(servicePayload);
			} else {
				await updateServiceCatalogItem(editServiceId, servicePayload);
			}
			setEditServiceId(null);
		} catch (error: any) {
			mergedProps.setError?.(error.message || "Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteService = async (id: string) => {
		if (
			!window.confirm(
				"Удалить услугу из каталога? (Связанные счета сохранятся, но услуга уйдет в архив)",
			)
		)
			return;
		if (!deleteServiceCatalogItem) return;
		try {
			await deleteServiceCatalogItem(id);
		} catch (error: any) {
			mergedProps.setError?.(error.message || "Ошибка удаления");
		}
	};

	return (
		<div className="pricelist-studio-container animate-fade-in">
			<div className="pricelist-tabs-header">
				<button
					className={`pricelist-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
					onClick={() => setActiveTab("catalog")}
				>
					<FolderTree size={18} />
					<span>Каталог клиники</span>
				</button>
				<button
					className={`pricelist-tab-btn ${activeTab === "ai_import" ? "active" : ""}`}
					onClick={() => setActiveTab("ai_import")}
				>
					<Bot size={18} />
					<span>ИИ-Распознавание (Импорт)</span>
				</button>
			</div>

			{activeTab === "catalog" && (
				<section className="pricelist-section-card">
					<div className="pricelist-section-header">
						<div
							className="pricelist-section-icon"
							style={{
								background: "rgba(59, 130, 246, 0.1)",
								color: "var(--blue)",
							}}
						>
							<ReceiptText size={24} />
						</div>
						<div className="pricelist-section-title">
							<h3>Управление Прайс-листом</h3>
							<p>Ручное добавление, удаление и редактирование услуг клиники</p>
						</div>
						<div className="pricelist-header-actions">
							<div className="pricelist-search-wrapper">
								<Search size={16} />
								<input
									type="text"
									placeholder="Поиск по названию или коду..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<button
								className="primary-button"
								onClick={() => {
									setEditServiceForm(NEW_SERVICE_TEMPLATE);
									// Пустое поле, а не подставленный «0»: цену вводит человек.
									setPriceRubInput("");
									setPriceProblem(null);
									setEditServiceId("new");
								}}
							>
								<Plus size={18} /> Добавить услугу
							</button>
						</div>
					</div>

					<div className="catalog-groups">
						{Object.entries(groupedCatalog).map(([category, items]) => (
							<div key={category} className="catalog-group">
								<h4 className="catalog-group-title">
									{serviceCategoryLabels[category] || category}
									<span className="catalog-group-count">{items.length}</span>
								</h4>
								<div className="catalog-items-grid">
									{items.map((item) => (
										<div className="catalog-item-card" key={item.id}>
											<div className="catalog-item-info">
												<div className="catalog-item-code">
													{item.code || "Без кода"}
												</div>
												<div className="catalog-item-title">{item.title}</div>
												<div className="catalog-item-badges">
													<span>{specialtyLabels[item.specialty]}</span>
													{item.taxDeductible && (
														<span className="badge-tax">Вычет</span>
													)}
													{!item.isActive && (
														<span className="badge-inactive">Архив</span>
													)}
												</div>
											</div>
											<div className="catalog-item-actions">
												<div className="catalog-item-price">
													{/* Было `(...).toLocaleString("ru-RU")} ₽`: у русской
													    локали по умолчанию до трёх знаков после запятой,
													    поэтому 1500,50 печаталось как «1 500,5» — полтинник
													    читается как пять копеек. Формат денег в приложении
													    один, `money` из AppHelpers: копейки либо двумя
													    знаками, либо не показаны вовсе. */}
													{money(item.basePriceRub ?? item.priceRub ?? 0)}
													<small>{item.durationMinutes} мин.</small>
												</div>
												<button
													className="icon-button"
													onClick={() => {
														setEditServiceForm({
															title: item.title,
															code: item.code || "",
															category: item.category,
															specialty: item.specialty,
															basePriceRub:
																item.basePriceRub || item.priceRub || 0,
															durationMinutes: item.durationMinutes || 30,
															taxDeductible: item.taxDeductible,
															active: item.isActive,
														});
														/* Копейки сохранённой цены попадают в поле как
														   «1500,50», а не теряются при открытии формы:
														   проекция прайса читает base_price_rub, её и
														   показываем первой. */
														setPriceRubInput(
															rubToPriceInput(
																item.basePriceRub ?? item.priceRub ?? 0,
															),
														);
														setPriceProblem(null);
														setEditServiceId(item.id);
													}}
												>
													<Edit3 size={16} />
												</button>
												<button
													className="icon-button danger"
													onClick={() => handleDeleteService(item.id)}
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
						{Object.keys(groupedCatalog).length === 0 && (
							<div className="empty-catalog-state">
								{/* БЫЛО: color="var(--border)". Имени --border нет ни в одном файле
								    стилей — есть --line, --line-strong и псевдонимы
								    --border-default/--border-subtle (styles/token-aliases.css).
								    Недействительное значение у наследуемого свойства color
								    означает «наследовать», поэтому значок брал цвет текста
								    родителя (--muted) и в пустом состоянии весил больше самой
								    надписи. Проверка scripts/check-css-tokens.mjs читает только
								    .css и инлайновые стили в TSX не видит — отсюда и жило. */}
								<FolderTree size={48} color="var(--line-strong)" />
								{/* Пустота без подсказки — тупик: непонятно, каталог пуст или
								    поиск ничего не нашёл, и что делать дальше. */}
								<p>
									{searchQuery.trim()
										? `По запросу «${searchQuery.trim()}» ничего не найдено`
										: "В каталоге клиники пока нет услуг"}
								</p>
								<small style={{ color: "var(--muted)", marginTop: "4px" }}>
									{searchQuery.trim()
										? "Проверьте написание или очистите поиск — возможно, услуга названа иначе."
										: "Добавьте услугу кнопкой «Добавить услугу» или перенесите прайс целиком на вкладке «ИИ-Распознавание»."}
								</small>
							</div>
						)}
					</div>
				</section>
			)}

			{activeTab === "ai_import" && (
				<>
					{/* AI Upload Section */}
					<section className="pricelist-section-card">
						<div className="pricelist-section-header">
							<div className="pricelist-section-icon">
								<Bot size={24} />
							</div>
							<div className="pricelist-section-title">
								<h3>Умный ИИ-Парсер</h3>
								<p>
									Автоматическое распознавание прайс-листа из текста, фото или
									сканов
								</p>
							</div>
						</div>

						<div className="pricelist-upload-area">
							<div className="pricelist-mode-selector">
								{Object.entries(pricelistSourceKindLabels).map(
									([key, label]) => (
										<label key={key} className="radio-label">
											<input
												type="radio"
												name="sourceKind"
												value={key}
												checked={pricelistSourceKind === key}
												onChange={(e) => setPricelistSourceKind(e.target.value)}
											/>
											{label as string}
										</label>
									),
								)}
							</div>

							{pricelistSourceKind === "scan_photo" && (
								<div className="pricelist-image-uploader">
									<label className="pricelist-file-dropzone">
										<input
											type="file"
											accept="image/png, image/jpeg, image/webp"
											onChange={(e) => {
												if (e.target.files && e.target.files[0]) {
													attachPricelistImage(e.target.files[0]);
												}
											}}
										/>
										<ImageIcon size={32} color="var(--border)" />
										<span>Загрузить фото прайса (PNG, JPG)</span>
									</label>
									{pricelistImageName && (
										<div className="pricelist-selected-file">
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
												}}
											>
												<CheckCircle2 size={18} color="var(--teal)" />
												<span>{pricelistImageName}</span>
											</div>
											<button
												className="icon-button"
												type="button"
												onClick={clearPricelistImage}
											>
												<X size={16} />
											</button>
										</div>
									)}
								</div>
							)}

							{pricelistSourceKind === "spreadsheet_copy" && (
								<div className="pricelist-text-input">
									<textarea
										/* Поле стало пустым: раньше в нём лежал выдуманный прайс
										   из десяти позиций, и его можно было занести в базу
										   настоящей клиники одним нажатием. */
										placeholder={"Вставьте прайс из Excel или Word — по строке на услугу.\nНапример: Лечение кариеса 6 800 руб"}
										value={pricelistText}
										onChange={(e) => setPricelistText(e.target.value)}
										rows={6}
									/>
									<PriceDictationBar
										onPriceParsed={(srv, pr) =>
											setPricelistText(
												(prev: string) => prev + "\n" + srv + " " + pr + " руб",
											)
										}
									/>
								</div>
							)}

							<div className="pricelist-actions-row">
								<div className="pricelist-ai-toggle">
									<label className="checkbox-label">
										<input
											type="checkbox"
											checked={usePricelistAi}
											onChange={(e) => setUsePricelistAi(e.target.checked)}
										/>
										<strong>
											Использовать DeepSeek / ChatGPT для маппинга услуг
										</strong>
									</label>
									<p>
										ИИ распределит услуги по категориям и привяжет материалы
									</p>
								</div>
								<div className="pricelist-run-buttons">
									<button
										className="secondary-button"
										type="button"
										onClick={() => {
											setPricelistSourceKind("spreadsheet_copy");
											clearPricelistImage();
											setPricelistText(
												"Коронка циркониевая MultiLayer 35 000 руб\nЛечение канала 1 канал 6 800 руб",
											);
											setPricelistAnalysis(null);
										}}
									>
										<Sparkles size={16} /> Демо
									</button>
									<button
										className="primary-button"
										type="button"
										onClick={analyzePricelist}
										disabled={
											isPricelistAnalyzing ||
											(!(pricelistText || "").trim() && !pricelistImageBase64)
										}
									>
										<UploadCloud size={18} style={{ marginRight: "8px" }} />
										{isPricelistAnalyzing
											? "Разбор данных..."
											: "Разобрать прайс"}
									</button>
								</div>
							</div>
						</div>
					</section>

					{/* Taxonomy Dictionary */}
					<section className="pricelist-taxonomy-library">
						<details>
							<summary className="pricelist-taxonomy-toggle">
								<div className="pricelist-taxonomy-toggle-text">
									<h4>Каталог распознавания (Справочник ИИ)</h4>
									<p>
										База знаний для автоматического маппинга услуг и брендов
									</p>
								</div>
								<ChevronDown size={20} className="text-muted" />
							</summary>
							<div className="pricelist-taxonomy-content">
								<div className="pricelist-taxonomy-group">
									<h5>
										<FileJson size={16} /> Виды лечения
									</h5>
									<div className="pricelist-taxonomy-items">
										{typedPricelistRecognitionServiceGroups.map((group) => (
											<div className="pricelist-taxonomy-row" key={group.title}>
												<div className="pricelist-taxonomy-row-title">
													{group.title}
												</div>
												{group.items.map((item) => (
													<span className="pricelist-taxonomy-chip" key={item}>
														{item}
													</span>
												))}
											</div>
										))}
									</div>
								</div>
								<div className="pricelist-taxonomy-group">
									<h5>
										<Database size={16} /> Материалы и реставрации
									</h5>
									<div className="pricelist-taxonomy-items">
										{typedPricelistRecognitionBrandGroups.map((group) => (
											<div className="pricelist-taxonomy-row" key={group.title}>
												<div className="pricelist-taxonomy-row-title">
													{group.title}
												</div>
												{group.items.map((item) => (
													<span className="pricelist-taxonomy-chip" key={item}>
														{item}
													</span>
												))}
											</div>
										))}
									</div>
								</div>
							</div>
						</details>
					</section>

					{typedPricelistAnalysis ? (
						<section className="pricelist-section-card">
							<div
								className="pricelist-section-header"
								style={{ borderColor: "var(--success-color)" }}
							>
								<div
									className="pricelist-section-icon"
									style={{ background: "var(--success-color)", color: "#fff" }}
								>
									<CheckCircle2 size={24} />
								</div>
								<div className="pricelist-section-title">
									<h3>Результаты разбора прайса</h3>
									<p>Проверьте корректность распознавания перед сохранением</p>
								</div>
							</div>

							<div className="pricelist-stats-header">
								<div className="pricelist-stat-box">
									<span>Всего позиций</span>
									<strong>{typedPricelistAnalysis.items.length}</strong>
								</div>
								<div className="pricelist-stat-box">
									<span>Режим парсера</span>
									<strong>
										{pricelistParserModeLabels[
											typedPricelistAnalysis.parserMode
										] ?? typedPricelistAnalysis.parserMode}
									</strong>
								</div>
							</div>

							<div className="pricelist-items-list">
								<h4 style={{ margin: "0 0 12px", fontSize: "15px" }}>
									Предпросмотр позиций (
									{Math.min(typedPricelistAnalysis.items.length, 12)} из{" "}
									{typedPricelistAnalysis.items.length})
								</h4>
								{typedPricelistAnalysis.items.slice(0, 12).map((item: any) => (
									<div className="pricelist-item-row" key={item.id}>
										<div className="pricelist-item-info">
											<strong>{item.title}</strong>
											<div className="pricelist-item-badges">
												<span>{serviceCategoryLabels[item.category]}</span>
												<span>{specialtyLabels[item.specialty]}</span>
											</div>
										</div>
										<div className="pricelist-item-price">
											<span>
												{item.priceRub !== null
													? money(item.priceRub)
													: "цена ?"}
											</span>
										</div>
									</div>
								))}
							</div>

							<div className="pricelist-save-bar">
								<div>
									{importResult?.count !== undefined && (
										<span
											style={{
												color: "var(--success-color)",
												fontWeight: 600,
												fontSize: "14px",
											}}
										>
											✓ Успешно импортировано: {importResult.count} позиций.
											Обновление...
										</span>
									)}
									{importResult?.error && (
										<span
											style={{
												color: "var(--danger-color)",
												fontWeight: 600,
												fontSize: "14px",
											}}
										>
											✕ Ошибка: {importResult.error}
										</span>
									)}
								</div>
								<button
									className="primary-button"
									type="button"
									disabled={
										isImporting ||
										typedPricelistAnalysis.items.filter(
											(item: any) => item.priceRub !== null,
										).length === 0
									}
									onClick={handleImportCatalog}
								>
									<Database size={18} style={{ marginRight: "8px" }} />
									{isImporting
										? "Сохранение в базу..."
										: "Сохранить в каталог клиники"}
								</button>
							</div>
						</section>
					) : null}
				</>
			)}

			{/* Modal for Edit/Create */}
			{editServiceId && (
				<div
					className="premium-modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setEditServiceId(null);
					}}
				>
					<div className="premium-modal-content" style={{ maxWidth: "500px" }}>
						<div className="premium-modal-header">
							<div
								style={{ display: "flex", alignItems: "center", gap: "12px" }}
							>
								<ReceiptText size={24} color="var(--teal)" />
								<h3>
									{editServiceId === "new"
										? "Новая услуга"
										: "Редактировать услугу"}
								</h3>
							</div>
							<button
								className="premium-modal-close"
								onClick={() => setEditServiceId(null)}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleSaveService} className="premium-modal-body">
							<div className="staff-form-group full-width">
								<label>Название услуги</label>
								<input
									type="text"
									value={editServiceForm.title}
									onChange={(e) =>
										setEditServiceForm({
											...editServiceForm,
											title: e.target.value,
										})
									}
									required
									placeholder="Например: Первичная консультация врача-терапевта"
								/>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Код (внутренний)</label>
									<input
										type="text"
										value={editServiceForm.code}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												code: e.target.value,
											})
										}
										placeholder="A01.07.001"
									/>
								</div>
								<div className="staff-form-group">
									<label>Цена (₽)</label>
									{/*
										ЦЕНА УНИЧТОЖАЛАСЬ ЗДЕСЬ ТРЕМЯ СПОСОБАМИ СРАЗУ.

										Стояло: <input type="number" min="0" step="100"
										onChange={... parseInt(e.target.value) || 0}>.

										1. `parseInt` читает до первого нецифрового знака: «1500,50»
										   сохранялось как 1500, «1500.50» — тоже как 1500. Копейки
										   ради которых починены разборщик прайса, схема
										   nonNegativeMoneyRubSchema и колонка numeric(12,2),
										   срезались в последней точке — при вводе руками.

										2. `|| 0`: NaN, пустая строка и любой мусор превращались в
										   ноль. Услуга сохранялась бесплатной, окно закрывалось,
										   ничего не сообщив. Ноль здесь законен как решение
										   человека, но не как результат непонятого ввода.

										3. `type="number" step="100"` — двойная западня. Русский
										   браузер в числовом поле не считает «1500,50» числом и
										   отдаёт в e.target.value пустую строку: запятая исчезала
										   прямо под рукой, а `|| 0` дописывал ноль. Плюс step
										   делал недействительным ЛЮБОЕ значение, не кратное сотне:
										   форма без noValidate не отправляется вовсе, и цену 6850 ₽
										   или сохранённую 1500,50 нельзя было записать — нажатие
										   «Сохранить» просто ничего не делало.

										Стало как в кассе и в заказах ЗТЛ: обычное текстовое поле с
										цифровой клавиатурой на телефоне, разбор общей
										normalizeRubAmountInput при сохранении.
									*/}
									<input
										type="text"
										inputMode="decimal"
										value={priceRubInput}
										onChange={(e) => {
											setPriceRubInput(e.target.value);
											setPriceProblem(null);
										}}
										placeholder="например 1500 или 1500,50"
										required
									/>
									{priceProblem && (
										<small
											style={{ color: "var(--danger-color)", marginTop: "4px" }}
										>
											{priceProblem}
										</small>
									)}
								</div>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Категория</label>
									<select
										value={editServiceForm.category}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												category: e.target.value as any,
											})
										}
									>
										{Object.entries(serviceCategoryLabels).map(
											([key, label]) => (
												<option key={key} value={key}>
													{label as string}
												</option>
											),
										)}
									</select>
								</div>
								<div className="staff-form-group">
									<label>Специализация врача</label>
									<select
										value={editServiceForm.specialty}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												specialty: e.target.value as any,
											})
										}
									>
										{Object.entries(specialtyLabels).map(([key, label]) => (
											<option key={key} value={key}>
												{label as string}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Длительность (мин)</label>
									<select
										value={editServiceForm.durationMinutes}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												durationMinutes: parseInt(e.target.value),
											})
										}
									>
										<option value={15}>15 минут</option>
										<option value={30}>30 минут</option>
										<option value={45}>45 минут</option>
										<option value={60}>1 час</option>
										<option value={90}>1.5 часа</option>
										<option value={120}>2 часа</option>
										<option value={180}>3 часа</option>
									</select>
								</div>
							</div>

							<div className="permissions-box" style={{ marginTop: "8px" }}>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editServiceForm.taxDeductible}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												taxDeductible: e.target.checked,
											})
										}
									/>
									<span>🧾 Учитывать в справках на налоговый вычет</span>
								</label>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editServiceForm.active}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												active: e.target.checked,
											})
										}
									/>
									<span>🟢 Услуга активна (доступна для записи)</span>
								</label>
							</div>

							<div className="premium-modal-footer">
								<button
									type="button"
									className="secondary-button"
									onClick={() => setEditServiceId(null)}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="primary-button"
									disabled={isSaving}
								>
									{isSaving ? "Сохранение..." : "Сохранить"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
