import type {
	DentalMaterialKind,
	DentalRestorationType,
	PricelistSourceKind,
} from "@dental/shared";
import {
	Bot,
	Database,
	ImageIcon,
	ReceiptText,
	Sparkles,
	UploadCloud,
} from "lucide-react";
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
		<section
			className="pricelist-studio"
			aria-label="Разбор прайс-листа клиники"
		>
			<div className="import-copy">
				<ReceiptText aria-hidden="true" />
				<div>
					<p className="eyebrow">Прайс и материалы</p>
					<h2>
						Прайс клиники разбирается в услуги, материалы, бренды и типы
						реставраций
					</h2>
					<p>
						Это админский инструмент, не экран врача на приеме. Он превращает
						текст, OCR или фото прайса в черновик услуг, ничего не записывает
						без предпросмотра и не придумывает цены.
					</p>
				</div>
			</div>

			<div className="pricelist-controls" aria-label="Источник прайса">
				{(Object.keys(pricelistSourceKindLabels) as PricelistSourceKind[]).map(
					(kind) => (
						<button
							className={`source-card ${pricelistSourceKind === kind ? "active" : ""}`}
							key={kind}
							type="button"
							aria-pressed={pricelistSourceKind === kind}
							onClick={() => {
								setPricelistSourceKind(kind);
								if (kind !== "photo_ocr") clearPricelistImage();
								setPricelistAnalysis(null);
							}}
						>
							<strong>{pricelistSourceKindLabels[kind]}</strong>
							<span>
								{kind === "photo_ocr"
									? "текст с фото или ИИ-проверка"
									: "локальный разбор + проверка"}
							</span>
						</button>
					),
				)}
			</div>

			<details className="pricelist-taxonomy">
				<summary>
					<span>Каталог распознавания</span>
					<small>
						Справочник для администратора. Врач на приеме это не видит.
					</small>
				</summary>
				<div className="taxonomy-grid">
					<article>
						<strong>Виды лечения</strong>
						{typedPricelistRecognitionServiceGroups.map((group) => (
							<div className="taxonomy-chip-row" key={group.title}>
								<span>{group.title}</span>
								{group.items.map((item) => (
									<small key={item}>{item}</small>
								))}
							</div>
						))}
					</article>
					<article>
						<strong>Материалы</strong>
						<div className="taxonomy-chip-row taxonomy-chip-row-flat">
							{(Object.keys(dentalMaterialKindLabels) as DentalMaterialKind[])
								.filter((kind) => kind !== "unknown")
								.map((kind) => (
									<small key={kind}>{dentalMaterialKindLabels[kind]}</small>
								))}
						</div>
					</article>
					<article>
						<strong>Реставрации</strong>
						<div className="taxonomy-chip-row taxonomy-chip-row-flat">
							{(
								Object.keys(
									dentalRestorationTypeLabels,
								) as DentalRestorationType[]
							)
								.filter((kind) => kind !== "unknown")
								.map((kind) => (
									<small key={kind}>{dentalRestorationTypeLabels[kind]}</small>
								))}
						</div>
					</article>
					<article>
						<strong>Бренды и линейки</strong>
						{typedPricelistRecognitionBrandGroups.map((group) => (
							<div className="taxonomy-chip-row" key={group.title}>
								<span>{group.title}</span>
								{group.items.map((item) => (
									<small key={item}>{item}</small>
								))}
							</div>
						))}
					</article>
				</div>
			</details>

			<div className="pricelist-workbench">
				<PriceDictationBar
					onPriceParsed={(service, price, category) => {
						const newEntry = `${category ? `${category} ` : ""}${service} ${price} руб`;
						setPricelistText((prev) =>
							prev ? `${prev}\n${newEntry}` : newEntry,
						);
						setPricelistAnalysis(null);
					}}
				/>
				<textarea
					aria-label="Прайс-лист клиники"
					value={pricelistText}
					onChange={(event: TextInputChangeEvent) => {
						setPricelistText(event.target.value);
						setPricelistAnalysis(null);
					}}
				/>
				<div className="pricelist-image-row">
					<label className="pricelist-image-upload">
						<ImageIcon aria-hidden="true" />
						<span>{pricelistImageName ?? "Фото прайса"}</span>
						<small>
							{pricelistImageNote ??
								"JPEG, PNG или WebP. Сжимается в браузере перед отправкой."}
						</small>
						<input
							accept="image/jpeg,image/png,image/webp"
							type="file"
							onChange={(event: InputChangeEvent) =>
								void attachPricelistImage(event.currentTarget.files?.[0])
							}
						/>
					</label>
					{pricelistImageName ? (
						<button
							className="secondary-button"
							type="button"
							onClick={clearPricelistImage}
						>
							Убрать фото
						</button>
					) : null}
				</div>
				<div className="import-tool-row">
					<button
						className={`secondary-button ${usePricelistAi ? "active" : ""}`}
						type="button"
						aria-pressed={usePricelistAi}
						onClick={() => setUsePricelistAi((value: boolean) => !value)}
					>
						<Bot aria-hidden="true" />{" "}
						{usePricelistAi ? "ИИ-разбор включен" : "Только локально"}
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
						<Sparkles aria-hidden="true" /> Демо
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
						<UploadCloud aria-hidden="true" />{" "}
						{isPricelistAnalyzing ? "Разбираю" : "Разобрать прайс"}
					</button>
				</div>
			</div>

			{typedPricelistAnalysis ? (
				<div className="pricelist-result">
					<div className="pricelist-status">
						<strong>{typedPricelistAnalysis.items.length} позиций</strong>
						<span>
							{pricelistParserModeLabels[typedPricelistAnalysis.parserMode] ??
								typedPricelistAnalysis.parserMode}
						</span>
						<span>
							Нейро-проверка{" "}
							{typedPricelistAnalysis.aiVision.used
								? "использована"
								: typedPricelistAnalysis.aiVision.configured
									? "готова"
									: "не настроена"}
						</span>
						<small>{typedPricelistAnalysis.aiVision.reason}</small>
					</div>
					<div className="pricelist-summary">
						{typedPricelistAnalysis.summary.slice(0, 6).map((item) => (
							<article key={`${item.category}-${item.specialty}`}>
								<strong>{serviceCategoryLabels[item.category]}</strong>
								<span>{specialtyLabels[item.specialty]}</span>
								<p>
									{item.count} поз. · {item.minPriceRub ?? "?"}-
									{item.maxPriceRub ?? "?"} ₽
								</p>
								<small>{pricelistMaterialSummaryText(item)}</small>
							</article>
						))}
					</div>
					<div className="pricelist-rows">
						{typedPricelistAnalysis.items.slice(0, 12).map((item) => (
							<article className="pricelist-row" key={item.id}>
								<div>
									<strong>{item.title}</strong>
									<span>
										{serviceCategoryLabels[item.category]} ·{" "}
										{specialtyLabels[item.specialty]} ·{" "}
										{Math.round(item.confidence * 100)}%
									</span>
								</div>
								<div>
									<span>
										{item.priceRub !== null
											? `${item.priceRub.toLocaleString("ru-RU")} ₽`
											: "цена ?"}
									</span>
									<small>{pricelistItemMaterialText(item)}</small>
								</div>
								<p>
									{item.warnings.length
										? pricelistWarningsText(item.warnings)
										: "готово к маппингу"}
								</p>
							</article>
						))}
					</div>
					{typedPricelistAnalysis.warnings.length ? (
						<div className="recognition-notes">
							{typedPricelistAnalysis.warnings.map((warning) => (
								<span key={warning}>{pricelistWarningsText([warning])}</span>
							))}
						</div>
					) : null}
					<div
						className="pricelist-import-actions"
						style={{
							marginTop: 24,
							display: "flex",
							alignItems: "center",
							gap: 16,
						}}
					>
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
							<Database
								aria-hidden="true"
								size={16}
								style={{ marginRight: 8 }}
							/>
							{isImporting ? "Сохранение..." : "Сохранить в каталог клиники"}
						</button>
						{importResult?.count !== undefined && (
							<span style={{ color: "var(--success-color)", fontWeight: 500 }}>
								Успешно импортировано: {importResult.count} позиций. Обновление
								страницы...
							</span>
						)}
						{importResult?.error && (
							<span style={{ color: "var(--danger-color)", fontWeight: 500 }}>
								Ошибка: {importResult.error}
							</span>
						)}
					</div>
				</div>
			) : null}
		</section>
	);
}
