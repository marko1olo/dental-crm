import type {
	DentalMaterialKind,
	DentalRestorationType,
	PricelistSourceKind,
	ServiceCategory,
	DentalSpecialty,
} from "@dental/shared";
import {
	Bot,
	Database,
	ImageIcon,
	ReceiptText,
	Sparkles,
	UploadCloud,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	FileJson,
	X,
	Plus,
	Edit3,
	Trash2,
	FolderTree,
	Search
} from "lucide-react";
import "./SettingsPricesTab.css";
import type { ChangeEvent } from "react";
import { useState, useMemo } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { PriceDictationBar } from "../../PriceDictationBar";
import { useSettingsDerivations } from "../../useSettingsDerivations";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

const NEW_SERVICE_TEMPLATE = {
	title: "",
	code: "",
	category: "therapy" as ServiceCategory,
	specialty: "therapist" as DentalSpecialty,
	basePriceRub: 0,
	durationMinutes: 30,
	taxDeductible: true,
	active: true,
};

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
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
	} = mergedProps;

	const [activeTab, setActiveTab] = useState<"catalog" | "ai_import">("catalog");
	const [searchQuery, setSearchQuery] = useState("");
	
	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState(NEW_SERVICE_TEMPLATE);
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

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			items = items.filter(s => s.title.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
		}
		return items.sort((a, b) => a.title.localeCompare(b.title));
	}, [typedServiceCatalog, searchQuery]);

	const groupedCatalog = useMemo(() => {
		const groups: Record<string, any[]> = {};
		filteredCatalog.forEach(item => {
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

	const handleSaveService = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!createServiceCatalogItem || !updateServiceCatalogItem) {
			mergedProps.setError?.("API недоступно");
			return;
		}
		setIsSaving(true);
		try {
			if (editServiceId === "new") {
				await createServiceCatalogItem(editServiceForm);
			} else {
				await updateServiceCatalogItem(editServiceId, editServiceForm);
			}
			setEditServiceId(null);
		} catch (error: any) {
			mergedProps.setError?.(error.message || "Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteService = async (id: string) => {
		if (!window.confirm("Удалить услугу из каталога? (Связанные счета сохранятся, но услуга уйдет в архив)")) return;
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
						<div className="pricelist-section-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue)' }}>
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
									{items.map(item => (
										<div className="catalog-item-card" key={item.id}>
											<div className="catalog-item-info">
												<div className="catalog-item-code">{item.code || "Без кода"}</div>
												<div className="catalog-item-title">{item.title}</div>
												<div className="catalog-item-badges">
													<span>{specialtyLabels[item.specialty]}</span>
													{item.taxDeductible && <span className="badge-tax">Вычет</span>}
													{!item.isActive && <span className="badge-inactive">Архив</span>}
												</div>
											</div>
											<div className="catalog-item-actions">
												<div className="catalog-item-price">
													{(item.priceRub || item.basePriceRub || 0).toLocaleString("ru-RU")} ₽
													<small>{item.durationMinutes} мин.</small>
												</div>
												<button className="icon-button" onClick={() => {
													setEditServiceForm({
														title: item.title,
														code: item.code || "",
														category: item.category,
														specialty: item.specialty,
														basePriceRub: item.basePriceRub || item.priceRub || 0,
														durationMinutes: item.durationMinutes || 30,
														taxDeductible: item.taxDeductible,
														active: item.isActive,
													});
													setEditServiceId(item.id);
												}}>
													<Edit3 size={16} />
												</button>
												<button className="icon-button danger" onClick={() => handleDeleteService(item.id)}>
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
								<FolderTree size={48} color="var(--border)" />
								<p>Ничего не найдено</p>
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
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
												<CheckCircle2 size={18} color="var(--teal)" />
												<span>{pricelistImageName}</span>
											</div>
											<button className="icon-button" type="button" onClick={clearPricelistImage}>
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
									<PriceDictationBar onPriceParsed={(srv, pr) => setPricelistText((prev: string) => prev + "\n" + srv + " " + pr + " руб")} />
								</div>
							)}

							<div className="pricelist-actions-row">
								<div className="pricelist-ai-toggle">
									<label className="checkbox-label">
										<input type="checkbox" checked={usePricelistAi} onChange={(e) => setUsePricelistAi(e.target.checked)} />
										<strong>Использовать DeepSeek / ChatGPT для маппинга услуг</strong>
									</label>
									<p>ИИ распределит услуги по категориям и привяжет материалы</p>
								</div>
								<div className="pricelist-run-buttons">
									<button className="secondary-button" type="button" onClick={() => {
										setPricelistSourceKind("spreadsheet_copy");
										clearPricelistImage();
										setPricelistText("Коронка циркониевая MultiLayer 35 000 руб\nЛечение канала 1 канал 6 800 руб");
										setPricelistAnalysis(null);
									}}>
										<Sparkles size={16} /> Демо
									</button>
									<button className="primary-button" type="button" onClick={analyzePricelist} disabled={isPricelistAnalyzing || (!(pricelistText || "").trim() && !pricelistImageBase64)}>
										<UploadCloud size={18} style={{ marginRight: '8px' }} />
										{isPricelistAnalyzing ? "Разбор данных..." : "Разобрать прайс"}
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

					{typedPricelistAnalysis ? (
						<section className="pricelist-section-card">
							<div className="pricelist-section-header" style={{ borderColor: 'var(--success-color)' }}>
								<div className="pricelist-section-icon" style={{ background: 'var(--success-color)', color: '#fff' }}>
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
							</div>

							<div className="pricelist-items-list">
								<h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Предпросмотр позиций ({Math.min(typedPricelistAnalysis.items.length, 12)} из {typedPricelistAnalysis.items.length})</h4>
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
											<span>{item.priceRub !== null ? `${item.priceRub.toLocaleString("ru-RU")} ₽` : "цена ?"}</span>
										</div>
									</div>
								))}
							</div>

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
				</>
			)}

			{/* Modal for Edit/Create */}
			{editServiceId && (
				<div className="premium-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditServiceId(null); }}>
					<div className="premium-modal-content" style={{ maxWidth: '500px' }}>
						<div className="premium-modal-header">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<ReceiptText size={24} color="var(--teal)" />
								<h3>{editServiceId === "new" ? "Новая услуга" : "Редактировать услугу"}</h3>
							</div>
							<button className="premium-modal-close" onClick={() => setEditServiceId(null)}>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleSaveService} className="premium-modal-body">
							<div className="staff-form-group full-width">
								<label>Название услуги</label>
								<input
									type="text"
									value={editServiceForm.title}
									onChange={(e) => setEditServiceForm({ ...editServiceForm, title: e.target.value })}
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
										onChange={(e) => setEditServiceForm({ ...editServiceForm, code: e.target.value })}
										placeholder="A01.07.001"
									/>
								</div>
								<div className="staff-form-group">
									<label>Цена (₽)</label>
									<input
										type="number"
										min="0"
										step="100"
										value={editServiceForm.basePriceRub}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, basePriceRub: parseInt(e.target.value) || 0 })}
										required
									/>
								</div>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Категория</label>
									<select
										value={editServiceForm.category}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, category: e.target.value as any })}
									>
										{Object.entries(serviceCategoryLabels).map(([key, label]) => (
											<option key={key} value={key}>{label as string}</option>
										))}
									</select>
								</div>
								<div className="staff-form-group">
									<label>Специализация врача</label>
									<select
										value={editServiceForm.specialty}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, specialty: e.target.value as any })}
									>
										{Object.entries(specialtyLabels).map(([key, label]) => (
											<option key={key} value={key}>{label as string}</option>
										))}
									</select>
								</div>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Длительность (мин)</label>
									<select
										value={editServiceForm.durationMinutes}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, durationMinutes: parseInt(e.target.value) })}
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

							<div className="permissions-box" style={{ marginTop: '8px' }}>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editServiceForm.taxDeductible}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, taxDeductible: e.target.checked })}
									/>
									<span>🧾 Учитывать в справках на налоговый вычет</span>
								</label>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editServiceForm.active}
										onChange={(e) => setEditServiceForm({ ...editServiceForm, active: e.target.checked })}
									/>
									<span>🟢 Услуга активна (доступна для записи)</span>
								</label>
							</div>

							<div className="premium-modal-footer">
								<button type="button" className="secondary-button" onClick={() => setEditServiceId(null)}>Отмена</button>
								<button type="submit" className="primary-button" disabled={isSaving}>
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
