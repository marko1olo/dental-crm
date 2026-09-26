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
import React, { useState } from "react";
import { money } from "../../AppHelpers";
import {
	type SettingsAccessHeaders,
	staffMutationHeaders,
} from "./staffMutationRequest";

export interface SettingsPricesAiImportSectionProps {
	readonly pricelistSourceKindLabels: Record<string, string>;
	readonly pricelistSourceKind: string;
	readonly setPricelistSourceKind: (val: string) => void;
	readonly clearPricelistImage: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: analysis payload
	readonly setPricelistAnalysis: (analysis: any) => void;
	readonly pricelistRecognitionServiceGroups: Array<{
		title: string;
		items: string[];
	}>;
	readonly pricelistRecognitionBrandGroups: Array<{
		title: string;
		items: string[];
	}>;
	readonly pricelistText: string;
	readonly setPricelistText: (val: string) => void;
	readonly pricelistImageName: string | null;
	readonly attachPricelistImage: (file: File) => void;
	readonly usePricelistAi: boolean;
	readonly setUsePricelistAi: (val: boolean) => void;
	readonly analyzePricelist: () => void;
	readonly isPricelistAnalyzing: boolean;
	readonly pricelistImageBase64: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: analysis result
	readonly pricelistAnalysis: any;
	readonly pricelistParserModeLabels: Record<string, string>;
	readonly serviceCategoryLabels: Record<string, string>;
	readonly specialtyLabels: Record<string, string>;
	readonly accessHeaders?: SettingsAccessHeaders | undefined;
	readonly isImporting?: boolean | undefined;
	readonly importResult?: { count?: number | undefined; error?: string | undefined } | null | undefined;
	readonly onImportCatalog?: (() => void) | undefined;
}

export const SettingsPricesAiImportSection: React.FC<
	SettingsPricesAiImportSectionProps
> = ({
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
	accessHeaders,
	isImporting: externalIsImporting,
	importResult: externalImportResult,
	onImportCatalog,
}) => {
	const [internalIsImporting, setInternalIsImporting] = useState(false);
	const [internalImportResult, setInternalImportResult] = useState<{
		count?: number;
		error?: string;
	} | null>(null);

	const isImporting = externalIsImporting ?? internalIsImporting;
	const importResult = externalImportResult ?? internalImportResult;

	const typedServiceGroups = pricelistRecognitionServiceGroups || [];
	const typedBrandGroups = pricelistRecognitionBrandGroups || [];
	const typedAnalysis = pricelistAnalysis;

	const handleExecuteImport = async () => {
		if (onImportCatalog) {
			onImportCatalog();
			return;
		}
		if (!typedAnalysis?.items) return;
		setInternalIsImporting(true);
		setInternalImportResult(null);

		const validItems = typedAnalysis.items.filter(
			// biome-ignore lint/suspicious/noExplicitAny: item price check
			(item: any) => item.priceRub !== null,
		);
		if (validItems.length === 0) {
			setInternalImportResult({ error: "Нет позиций с ценой для импорта" });
			setInternalIsImporting(false);
			return;
		}

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
							/* non-json body */
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
				setInternalImportResult({
					error:
						failures[0] ||
						"Ни одна позиция не сохранена. Проверьте секрет настроек.",
				});
				return;
			}

			if (failures.length > 0) {
				setInternalImportResult({
					count: imported,
					error: `Сохранено ${imported}, с ошибкой ${failures.length}: ${failures[0]}`,
				});
			} else {
				setInternalImportResult({ count: imported });
			}
			if (failures.length === 0) {
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка импорта";
			setInternalImportResult({ error: message });
		} finally {
			setInternalIsImporting(false);
		}
	};

	return (
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
							Автоматическое распознавание прайс-листа из текста, фото или сканов
						</p>
					</div>
				</div>

				<div className="pricelist-upload-area">
					<div className="pricelist-mode-selector">
						{Object.entries(pricelistSourceKindLabels || {}).map(
							([key, label]) => (
								<label key={key} className="radio-label">
									<input
										type="radio"
										name="pricelistMode"
										value={key}
										checked={pricelistSourceKind === key}
										onChange={() => {
											setPricelistSourceKind(key);
											clearPricelistImage();
											setPricelistAnalysis(null);
										}}
									/>
									<span>{label}</span>
								</label>
							),
						)}
					</div>

					{pricelistSourceKind === "text" && (
						<div className="pricelist-input-group">
							<textarea
								placeholder="Вставьте сюда текст прейскуранта..."
								rows={8}
								value={pricelistText}
								onChange={(e) => setPricelistText(e.target.value)}
							/>
						</div>
					)}

					{(pricelistSourceKind === "photo" ||
						pricelistSourceKind === "scan") && (
						<div className="pricelist-dropzone">
							<input
								type="file"
								id="pricelist-file"
								accept="image/*"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) attachPricelistImage(file);
								}}
								style={{ display: "none" }}
							/>
							<label
								htmlFor="pricelist-file"
								className="dropzone-label"
							>
								{pricelistImageName ? (
									<div className="file-attached">
										<ImageIcon size={32} />
										<span>{pricelistImageName}</span>
										<button
											type="button"
											className="icon-button danger"
											onClick={(e) => {
												e.preventDefault();
												clearPricelistImage();
											}}
										>
											<X size={16} />
										</button>
									</div>
								) : (
									<div className="dropzone-placeholder">
										<UploadCloud size={36} />
										<p>Нажмите для загрузки файла</p>
										<span>PNG, JPG до 10MB</span>
									</div>
								)}
							</label>
						</div>
					)}

					{pricelistSourceKind === "pdf" && (
						<div className="pricelist-dropzone">
							<div className="dropzone-placeholder">
								<FileJson size={36} />
								<p>Загрузка PDF-файлов прейскуранта</p>
								<span>Поддерживаются векторные и сканированные PDF</span>
							</div>
						</div>
					)}

					<div className="pricelist-actions-row">
						<label className="checkbox-label">
							<input
								type="checkbox"
								checked={usePricelistAi}
								onChange={(e) => setUsePricelistAi(e.target.checked)}
							/>
							<span>
								Использовать расширенное ИИ-распознавание (Gemini Pro)
							</span>
						</label>

						<button
							className="primary-button"
							type="button"
							disabled={
								isPricelistAnalyzing ||
								(pricelistSourceKind === "text" &&
									!pricelistText.trim()) ||
								((pricelistSourceKind === "photo" ||
									pricelistSourceKind === "scan") &&
									!pricelistImageBase64)
							}
							onClick={analyzePricelist}
						>
							<Sparkles size={18} style={{ marginRight: "8px" }} />
							{isPricelistAnalyzing
								? "Анализ и структурирование..."
								: "Распознать прейскурант"}
						</button>
					</div>
				</div>
			</section>

			{/* Recognition taxonomy dictionaries */}
			{(typedServiceGroups.length > 0 || typedBrandGroups.length > 0) && (
				<section className="pricelist-section-card">
					<div className="pricelist-section-header">
						<div className="pricelist-section-icon">
							<ChevronDown size={24} />
						</div>
						<div className="pricelist-section-title">
							<h3>Распознанные категории и материалы</h3>
							<p>Справочные группы, выявленные в исходном документе</p>
						</div>
					</div>

					<div className="taxonomy-grid">
						{typedServiceGroups.length > 0 && (
							<div className="taxonomy-card">
								<h4>Категории услуг ({typedServiceGroups.length})</h4>
								<ul className="taxonomy-list">
									{typedServiceGroups.map((group) => (
										<li key={group.title} className="taxonomy-item">
											<span className="taxonomy-item-title">
												{group.title}
											</span>
											<span className="taxonomy-item-count">
												{group.items.length} поз.
											</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{typedBrandGroups.length > 0 && (
							<div className="taxonomy-card">
								<h4>Материалы и бренды ({typedBrandGroups.length})</h4>
								<ul className="taxonomy-list">
									{typedBrandGroups.map((group) => (
										<li key={group.title} className="taxonomy-item">
											<span className="taxonomy-item-title">
												{group.title}
											</span>
											<span className="taxonomy-item-count">
												{group.items.length} поз.
											</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</section>
			)}

			{/* Analysis Preview & Import Section */}
			{typedAnalysis?.items?.length ? (
				<section className="pricelist-section-card">
					<div className="pricelist-section-header">
						<div className="pricelist-section-icon">
							<CheckCircle2 size={24} />
						</div>
						<div className="pricelist-section-title">
							<h3>Результаты анализа прейскуранта</h3>
							<p>
								Распознано позиций:{" "}
								<strong>{typedAnalysis.items.length}</strong>. Режим парсера:{" "}
								<strong>
									{pricelistParserModeLabels[typedAnalysis.parserMode] ??
										typedAnalysis.parserMode}
								</strong>
							</p>
						</div>
					</div>

					<div className="pricelist-items-list">
						<h4 style={{ margin: "0 0 12px", fontSize: "15px" }}>
							Предпросмотр позиций (
							{Math.min(typedAnalysis.items.length, 12)} из{" "}
							{typedAnalysis.items.length})
						</h4>
						{/* biome-ignore lint/suspicious/noExplicitAny: preview item */}
						{typedAnalysis.items.slice(0, 12).map((item: any) => (
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
										display: "inline-flex",
										alignItems: "center",
									}}
								>
									<CheckCircle2 size={14} className="inline mr-1 shrink-0" />
									Успешно импортировано: {importResult.count} позиций.
									Обновление...
								</span>
							)}
							{importResult?.error && (
								<span
									style={{
										color: "var(--danger-color)",
										fontWeight: 600,
										fontSize: "14px",
										display: "inline-flex",
										alignItems: "center",
									}}
								>
									<X size={14} className="inline mr-1 shrink-0" />
									Ошибка: {importResult.error}
								</span>
							)}
						</div>
						<button
							className="primary-button"
							type="button"
							disabled={
								isImporting ||
								typedAnalysis.items.filter(
									// biome-ignore lint/suspicious/noExplicitAny: automated suppression
									(item: any) => item.priceRub !== null,
								).length === 0
							}
							onClick={handleExecuteImport}
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
};
