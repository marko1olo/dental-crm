import type {
	DentalMaterialKind,
	DentalRestorationType,
	PricelistSourceKind,
} from "@dental/shared";
import { Bot, Database, ImageIcon, ReceiptText, Sparkles, UploadCloud, ChevronDown, ChevronUp, CheckCircle2, FileJson, X } from "lucide-react";
import "./SettingsPricesTab.css";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { PriceDictationBar } from "../../PriceDictationBar";
import { useSettingsDerivations } from "../../useSettingsDerivations";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export function SettingsPricesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		pricelistRecognitionServiceGroups,
		dentalMaterialKindLabels,
		dentalRestorationTypeLabels,
		pricelistRecognitionBrandGroups,
		pricelistText,
		setPricelistText,
		pricelistImageName,
		pricelistImageNote,
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
		pricelistMaterialSummaryText,
		pricelistItemMaterialText,
		pricelistWarningsText,
	} = mergedProps;

	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<{
		count?: number;
		error?: string;
	} | null>(null);

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

		try {
			const token =
				localStorage.getItem("dente_admin_secret") ||
				localStorage.getItem("dente_clinic_token") ||
				"";
			const res = await fetch("/api/settings/catalog-import", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-admin-secret": token,
				},
				body: JSON.stringify(validItems),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Ошибка импорта");
			setImportResult({ count: data.count });
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (err: any) {
			setImportResult({ error: err.message });
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<div className="pricelist-studio-container animate-fade-in">
			{/* Ввод прайса */}
			<section className="pricelist-section-card">
				<div className="pricelist-section-header">
					<div className="pricelist-section-icon">
						<ReceiptText size={24} />
					</div>
					<div className="pricelist-section-title">
						<h3>Импорт Прайс-листа</h3>
						<p>Инструмент для загрузки прайса клиники через текст, фото или ИИ</p>
					</div>
				</div>

				<div className="pricelist-source-grid">
					{(Object.keys(pricelistSourceKindLabels) as PricelistSourceKind[]).map((kind) => (
						<button
							className={`pricelist-source-card ${pricelistSourceKind === kind ? "active" : ""}`}
							key={kind}
							type="button"
							aria-pressed={pricelistSourceKind === kind}
							onClick={() => {
								setPricelistSourceKind(kind);
								if (kind !== "photo_ocr") clearPricelistImage();
								setPricelistAnalysis(null);
							}}
						>
							<h4>{pricelistSourceKindLabels[kind]}</h4>
							<p>
								{kind === "photo_ocr"
									? "Загрузить фото или скан (JPEG, PNG)"
									: "Вставить текст из буфера обмена"}
							</p>
						</button>
					))}
				</div>

				<div className="pricelist-upload-area">
					<PriceDictationBar
						onPriceParsed={(service, price, category) => {
							const newEntry = `${category ? `${category} ` : ""}${service} ${price} руб`;
							setPricelistText((prev: string) => prev ? `${prev}\n${newEntry}` : newEntry);
							setPricelistAnalysis(null);
						}}
					/>
					<textarea
						className="pricelist-textarea"
						placeholder="Вставьте текст прайс-листа сюда. Например: Коронка циркониевая 35 000 руб"
						value={pricelistText}
						onChange={(event: TextInputChangeEvent) => {
							setPricelistText(event.target.value);
							setPricelistAnalysis(null);
						}}
					/>
					
					<label className="pricelist-file-drop">
						<div className="pricelist-file-icon">
							<ImageIcon size={20} />
						</div>
						<div className="pricelist-file-text">
							<span>{pricelistImageName ?? "Прикрепить фото прайса"}</span>
							<small>{pricelistImageNote ?? "JPEG, PNG или WebP (до 5 МБ)"}</small>
						</div>
						<input
							accept="image/jpeg,image/png,image/webp"
							type="file"
							onChange={(event: InputChangeEvent) => void attachPricelistImage(event.currentTarget.files?.[0])}
						/>
						{pricelistImageName && (
							<button
								className="icon-button"
								type="button"
								onClick={(e) => { e.preventDefault(); clearPricelistImage(); }}
								style={{ color: 'var(--danger-color)', padding: '8px' }}
							>
								<X size={18} />
							</button>
						)}
					</label>

					<div className="pricelist-action-bar">
						<div className="pricelist-action-toggles">
							<button
								className={`secondary-button ${usePricelistAi ? "active" : ""}`}
								type="button"
								aria-pressed={usePricelistAi}
								onClick={() => setUsePricelistAi((value: boolean) => !value)}
							>
								<Bot size={16} /> {usePricelistAi ? "ИИ-разбор включен" : "Локальный парсер"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setPricelistSourceKind("spreadsheet_copy");
									clearPricelistImage();
									setPricelistText(
										"Коронка циркониевая MultiLayer 35 000 руб\nКоронка IPS e.max 32 000 руб\nВинир керамический E.max 38 000 руб\nРеставрация композитная Filtek 9 500 руб\nЛечение канала 1 канал 6 800 руб\nИмплантация Straumann BLX 85 000 руб\nАбатмент индивидуальный циркониевый 28 000 руб\nСинус-лифтинг открытый 55 000 руб\nПрофессиональная гигиена Air Flow EMS 6 000 руб\nЭлайнеры Star Smile 160 000 руб",
									);
									setPricelistAnalysis(null);
								}}
							>
								<Sparkles size={16} /> Демо-данные
							</button>
						</div>
						<button
							className="primary-button"
							type="button"
							onClick={analyzePricelist}
							disabled={isPricelistAnalyzing || (!(pricelistText || "").trim() && !pricelistImageBase64)}
						>
							<UploadCloud size={18} style={{ marginRight: '8px' }} />
							{isPricelistAnalyzing ? "Разбор данных..." : "Разобрать прайс"}
						</button>
					</div>
				</div>
			</section>

			{/* Справочник (Taxonomy) */}
			<section className="pricelist-taxonomy-library">
				<details>
					<summary className="pricelist-taxonomy-toggle">
						<div className="pricelist-taxonomy-toggle-text">
							<h4>Каталог распознавания (Справочник ИИ)</h4>
							<p>База знаний для автоматического маппинга услуг и брендов</p>
						</div>
						<ChevronDown size={20} className="text-muted" />
					</summary>
					<div className="pricelist-taxonomy-content">
						<div className="pricelist-taxonomy-group">
							<h5><FileJson size={16} /> Виды лечения</h5>
							<div className="pricelist-taxonomy-items">
								{typedPricelistRecognitionServiceGroups.map((group) => (
									<div className="pricelist-taxonomy-row" key={group.title}>
										<div className="pricelist-taxonomy-row-title">{group.title}</div>
										{group.items.map((item) => <span className="pricelist-taxonomy-chip" key={item}>{item}</span>)}
									</div>
								))}
							</div>
						</div>
						
						<div className="pricelist-taxonomy-group">
							<h5><Database size={16} /> Материалы и реставрации</h5>
							<div className="pricelist-taxonomy-items">
								<div className="pricelist-taxonomy-row">
									<div className="pricelist-taxonomy-row-title">Материалы</div>
									{(Object.keys(dentalMaterialKindLabels) as DentalMaterialKind[]).filter((kind) => kind !== "unknown").map((kind) => (
										<span className="pricelist-taxonomy-chip" key={kind}>{dentalMaterialKindLabels[kind]}</span>
									))}
								</div>
								<div className="pricelist-taxonomy-row">
									<div className="pricelist-taxonomy-row-title">Реставрации</div>
									{(Object.keys(dentalRestorationTypeLabels) as DentalRestorationType[]).filter((kind) => kind !== "unknown").map((kind) => (
										<span className="pricelist-taxonomy-chip" key={kind}>{dentalRestorationTypeLabels[kind]}</span>
									))}
								</div>
							</div>
						</div>

						<div className="pricelist-taxonomy-group">
							<h5><Sparkles size={16} /> Бренды и линейки</h5>
							<div className="pricelist-taxonomy-items">
								{typedPricelistRecognitionBrandGroups.map((group) => (
									<div className="pricelist-taxonomy-row" key={group.title}>
										<div className="pricelist-taxonomy-row-title">{group.title}</div>
										{group.items.map((item) => <span className="pricelist-taxonomy-chip" key={item}>{item}</span>)}
									</div>
								))}
							</div>
						</div>
					</div>
				</details>
			</section>

			{/* Результаты разбора */}
			{typedPricelistAnalysis ? (
				<section className="pricelist-section-card pricelist-results-container">
					<div className="pricelist-section-header">
						<div className="pricelist-section-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
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
							<strong>{pricelistParserModeLabels[typedPricelistAnalysis.parserMode] ?? typedPricelistAnalysis.parserMode}</strong>
						</div>
						<div className="pricelist-stat-box">
							<span>Нейросеть (AI)</span>
							<strong>
								{typedPricelistAnalysis.aiVision.used ? "Использована" : typedPricelistAnalysis.aiVision.configured ? "Готова" : "Отключена"}
							</strong>
						</div>
					</div>

					{/* Сводка по категориям */}
					<div className="pricelist-result-grid">
						{typedPricelistAnalysis.summary.slice(0, 6).map((item: any) => (
							<div className="pricelist-summary-card" key={`${item.category}-${item.specialty}`}>
								<div className="pricelist-summary-card-head">
									<strong>{serviceCategoryLabels[item.category]}</strong>
									<span>{specialtyLabels[item.specialty]}</span>
								</div>
								<p>
									{item.count} поз. · {item.minPriceRub ?? "?"}–{item.maxPriceRub ?? "?"} ₽
								</p>
								<small>{pricelistMaterialSummaryText(item)}</small>
							</div>
						))}
					</div>

					{/* Список позиций */}
					<div className="pricelist-items-list">
						<h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Предпросмотр позиций ({Math.min(typedPricelistAnalysis.items.length, 12)} из {typedPricelistAnalysis.items.length})</h4>
						{typedPricelistAnalysis.items.slice(0, 12).map((item: any) => (
							<div className="pricelist-item-row" key={item.id}>
								<div className="pricelist-item-info">
									<strong>{item.title}</strong>
									<div className="pricelist-item-badges">
										<span>{serviceCategoryLabels[item.category]}</span>
										<span>{specialtyLabels[item.specialty]}</span>
										<span style={{ color: item.confidence > 0.8 ? 'var(--success-color)' : 'var(--warning-color)' }}>
											Точность: {Math.round(item.confidence * 100)}%
										</span>
									</div>
								</div>
								<div className="pricelist-item-price">
									<span>{item.priceRub !== null ? `${item.priceRub.toLocaleString("ru-RU")} ₽` : "цена ?"}</span>
									<small>{pricelistItemMaterialText(item)}</small>
								</div>
							</div>
						))}
					</div>

					{typedPricelistAnalysis.warnings.length > 0 && (
						<div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
							<h5 style={{ margin: '0 0 8px', color: 'rgb(217, 119, 6)' }}>Обратите внимание:</h5>
							{typedPricelistAnalysis.warnings.map((warning: any) => (
								<p key={warning} style={{ margin: 0, fontSize: '13px', color: 'rgb(180, 83, 9)' }}>• {pricelistWarningsText([warning])}</p>
							))}
						</div>
					)}

					<div className="pricelist-save-bar">
						<div>
							{importResult?.count !== undefined && (
								<span style={{ color: "var(--success-color)", fontWeight: 600, fontSize: '14px' }}>
									✓ Успешно импортировано: {importResult.count} позиций. Обновление...
								</span>
							)}
							{importResult?.error && (
								<span style={{ color: "var(--danger-color)", fontWeight: 600, fontSize: '14px' }}>
									✕ Ошибка: {importResult.error}
								</span>
							)}
						</div>
						<button
							className="primary-button"
							type="button"
							disabled={isImporting || typedPricelistAnalysis.items.filter((item: any) => item.priceRub !== null).length === 0}
							onClick={handleImportCatalog}
						>
							<Database size={18} style={{ marginRight: '8px' }} />
							{isImporting ? "Сохранение в базу..." : "Сохранить в каталог клиники"}
						</button>
					</div>
				</section>
			) : null}
		</div>
	);
}
