import {
	Bot,
	CheckCircle2,
	ChevronDown,
	Database,
	FileJson,
	ImageIcon,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import { PriceDictationBar } from "../../../PriceDictationBar";

export function PricesImportSection({
	pricelistSourceKindLabels,
	pricelistSourceKind,
	setPricelistSourceKind,
	attachPricelistImage,
	pricelistImageName,
	clearPricelistImage,
	pricelistText,
	setPricelistText,
	usePricelistAi,
	setUsePricelistAi,
	analyzePricelist,
	isPricelistAnalyzing,
	pricelistImageBase64,
	setPricelistAnalysis,
	typedPricelistRecognitionServiceGroups,
	typedPricelistRecognitionBrandGroups,
	typedPricelistAnalysis,
	pricelistParserModeLabels,
	serviceCategoryLabels,
	specialtyLabels,
	importResult,
	isImporting,
	handleImportCatalog,
}: {
	pricelistSourceKindLabels: Record<string, string>;
	pricelistSourceKind: string;
	setPricelistSourceKind: (k: string) => void;
	attachPricelistImage: (f: File) => void;
	pricelistImageName: string | null;
	clearPricelistImage: () => void;
	pricelistText: string;
	setPricelistText: any;
	usePricelistAi: boolean;
	setUsePricelistAi: (v: boolean) => void;
	analyzePricelist: () => void;
	isPricelistAnalyzing: boolean;
	pricelistImageBase64: string | null;
	setPricelistAnalysis: (v: any) => void;
	typedPricelistRecognitionServiceGroups: any[];
	typedPricelistRecognitionBrandGroups: any[];
	typedPricelistAnalysis: any;
	pricelistParserModeLabels: Record<string, string>;
	serviceCategoryLabels: Record<string, string>;
	specialtyLabels: Record<string, string>;
	importResult: any;
	isImporting: boolean;
	handleImportCatalog: () => void;
}) {
	return (
		<>
			<section className="pricelist-section-card">
				<div className="pricelist-section-header">
					<div className="pricelist-section-icon">
						<Bot size={24} />
					</div>
					<div className="pricelist-section-title">
						<h3>Умный ИИ-Парсер</h3>
						<p>Автоматическое распознавание прайс-листа из текста, фото или сканов</p>
					</div>
				</div>

				<div className="pricelist-upload-area">
					<div className="pricelist-mode-selector">
						{Object.entries(pricelistSourceKindLabels).map(([key, label]) => (
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
						))}
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
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
								placeholder="Вставьте скопированный текст из Excel или Word..."
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
								<strong>Использовать DeepSeek / ChatGPT для маппинга услуг</strong>
							</label>
							<p>ИИ распределит услуги по категориям и привяжет материалы</p>
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
								{isPricelistAnalyzing ? "Разбор данных..." : "Разобрать прайс"}
							</button>
						</div>
					</div>
				</div>
			</section>

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
							<h5>
								<FileJson size={16} /> Виды лечения
							</h5>
							<div className="pricelist-taxonomy-items">
								{typedPricelistRecognitionServiceGroups.map((group) => (
									<div className="pricelist-taxonomy-row" key={group.title}>
										<div className="pricelist-taxonomy-row-title">{group.title}</div>
										{group.items.map((item: string) => (
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
										<div className="pricelist-taxonomy-row-title">{group.title}</div>
										{group.items.map((item: string) => (
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
								{pricelistParserModeLabels[typedPricelistAnalysis.parserMode] ??
									typedPricelistAnalysis.parserMode}
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
							<div className="pricelist-item-row" key={item.id || item.title}>
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
											? `${item.priceRub.toLocaleString("ru-RU")} ₽`
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
	);
}
