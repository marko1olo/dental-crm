import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	Sparkles,
	FileText,
	Check,
	Copy,
	X,
	ShieldCheck,
	Zap,
	Search,
	CheckCircle2,
	Stethoscope,
	Tag,
} from "lucide-react";
import {
	type Clinical1ClickTemplate,
	type ClinicalProtocolCategory,
	type SynthesizedDiaryResult,
	type Order804nServiceItem,
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	CLINICAL_CATEGORY_LABELS,
	getCore1ClickTemplates,
	filterClinicalTemplates,
	synthesize1ClickSoapDiary,
	getToothAnatomicalDescription,
} from "./clinicalDiaryTemplatesEngine";
import "./clinicalDiaryTemplates.css";

export interface ClinicalDiaryTemplatesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothNumber?: number | string | null;
	readonly doctorFullName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly patientFullName?: string | null;
	readonly onApplyDiary?: (result: SynthesizedDiaryResult) => void;
	readonly onApplySoapText?: (text: string, icd10Code: string) => void;
	readonly onApplyServices?: (services: readonly Order804nServiceItem[]) => void;
}

const COMMON_TEETH_PRESETS = [16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44];

export const ClinicalDiaryTemplatesModal: React.FC<ClinicalDiaryTemplatesModalProps> = React.memo(
	function ClinicalDiaryTemplatesModal({
		isOpen,
		onClose,
		initialToothNumber,
		doctorFullName = "Волкова Екатерина Сергеевна",
		doctorSpecialty = "Врач-стоматолог-терапевт",
		patientFullName,
		onApplyDiary,
		onApplySoapText,
		onApplyServices,
	}) {
		const coreTemplates = useMemo(() => getCore1ClickTemplates(), []);

		// Выбранный шаблон (по умолчанию: средний кариес К02.1)
		const [selectedTemplateId, setSelectedTemplateId] = useState<string>("caries_medium_k02_1");
		const [toothNumberInput, setToothNumberInput] = useState<string>(() =>
			initialToothNumber ? String(initialToothNumber) : "16",
		);
		const [searchQuery, setSearchQuery] = useState<string>("");
		const [selectedCategory, setSelectedCategory] = useState<ClinicalProtocolCategory | "all">("all");
		const [editedSoapText, setEditedSoapText] = useState<string>("");
		const [isCustomEdited, setIsCustomEdited] = useState<boolean>(false);
		const [isCopied, setIsCopied] = useState<boolean>(false);

		// Синхронизация initialToothNumber при открытии
		useEffect(() => {
			if (initialToothNumber) {
				setToothNumberInput(String(initialToothNumber));
			}
		}, [initialToothNumber]);

		// Список отфильтрованных шаблонов
		const filteredTemplates = useMemo(() => {
			return filterClinicalTemplates(searchQuery, selectedCategory);
		}, [searchQuery, selectedCategory]);

		// Текущий выбранный объект шаблона
		const activeTemplate = useMemo(() => {
			return (
				CLINICAL_1CLICK_TEMPLATES_CATALOG.find((t) => t.id === selectedTemplateId) ||
				CLINICAL_1CLICK_TEMPLATES_CATALOG[0]!
			);
		}, [selectedTemplateId]);

		// Автогенерация синтезированного дневника
		const synthesized = useMemo(() => {
			return synthesize1ClickSoapDiary(selectedTemplateId, {
				toothNumber: toothNumberInput,
				doctorFullName: doctorFullName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				patientFullName: patientFullName ?? null,
			});
		}, [selectedTemplateId, toothNumberInput, doctorFullName, doctorSpecialty, patientFullName]);

		// Обновление текста при смене шаблона или зуба (если врач не вносил ручных правок)
		useEffect(() => {
			if (!isCustomEdited) {
				setEditedSoapText(synthesized.unifiedSoapText);
			}
		}, [synthesized, isCustomEdited]);

		// 1-Click выбор шаблона из верхнего ряда или списка
		const handleSelectTemplate = useCallback((templateId: string) => {
			setSelectedTemplateId(templateId);
			setIsCustomEdited(false);
		}, []);

		// Смена зуба
		const handleToothChange = useCallback((toothVal: string) => {
			setToothNumberInput(toothVal);
			setIsCustomEdited(false);
		}, []);

		// Копирование в буфер обмена
		const handleCopy = useCallback(() => {
			const textToCopy = editedSoapText || synthesized.unifiedSoapText;
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(textToCopy).then(() => {
					setIsCopied(true);
					setTimeout(() => setIsCopied(false), 2000);
				});
			}
		}, [editedSoapText, synthesized.unifiedSoapText]);

		// Применение в карту 043/у
		const handleApply = useCallback(() => {
			const finalSoapText = editedSoapText || synthesized.unifiedSoapText;
			const finalResult: SynthesizedDiaryResult = {
				...synthesized,
				unifiedSoapText: finalSoapText,
			};

			if (onApplySoapText) {
				onApplySoapText(finalSoapText, synthesized.assessmentIcd10Code);
			}
			if (onApplyDiary) {
				onApplyDiary(finalResult);
			}
			if (onApplyServices && synthesized.order804nServices.length > 0) {
				onApplyServices(synthesized.order804nServices);
			}

			onClose();
		}, [editedSoapText, synthesized, onApplySoapText, onApplyDiary, onApplyServices, onClose]);

		if (!isOpen || typeof document === "undefined") return null;

		return createPortal(
			<div
				className="cd-templates-backdrop"
				role="dialog"
				aria-modal="true"
				aria-label="1-Click Клинические протоколы и шаблоны Формы 043/у"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div className="cd-templates-modal">
					{/* ── Header ── */}
					<header className="cd-templates-header">
						<div className="cd-templates-title-group">
							<div className="cd-templates-icon-badge">
								<Sparkles className="w-6 h-6" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 className="cd-templates-title">
										1-Click Клинические протоколы и дневники SOAP
									</h2>
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#15803d)] border border-[var(--ok-fg,#15803d)]/30">
										<ShieldCheck className="w-3.5 h-3.5" />
										Минздрав РФ № 834н / 804н
									</span>
								</div>
								<p className="cd-templates-subtitle">
									{patientFullName ? `Пациент: ${patientFullName} · ` : ""}
									{toothNumberInput ? `${getToothAnatomicalDescription(toothNumberInput)} · ` : ""}
									Мгновенная вставка канонического протокола без лишних кликов
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="cd-templates-close-btn"
							aria-label="Закрыть модальное окно"
							data-testid="cd-templates-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</header>

					{/* ── 1-Click Fast Presets Ribbon (TOP 7) ── */}
					<div className="cd-templates-fast-ribbon" data-testid="cd-core-fast-ribbon">
						<div className="cd-fast-ribbon-label">
							<Zap className="w-3.5 h-3.5 text-amber-500" />
							<span>Быстрый 1-Click доступ:</span>
						</div>
						<div className="cd-fast-buttons-grid">
							{coreTemplates.map((item) => {
								const isSelected = selectedTemplateId === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => handleSelectTemplate(item.id)}
										className={`cd-fast-preset-btn ${isSelected ? "active" : ""}`}
										data-testid={`core-preset-${item.id}`}
									>
										<span>{item.icon}</span>
										<span>{item.shortTitle}</span>
										<span className="cd-fast-badge">{item.badge}</span>
										{isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
									</button>
								);
							})}
						</div>
					</div>

					{/* ── Body Split Pane ── */}
					<div className="cd-templates-body">
						{/* ── Left Sidebar (Catalog & Filters) ── */}
						<aside className="cd-templates-sidebar">
							<div className="cd-sidebar-controls">
								{/* Search Bar */}
								<div className="cd-search-wrap">
									<Search className="cd-search-icon" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск протокола, МКБ-10, услуги..."
										className="cd-search-input"
										data-testid="cd-template-search-input"
									/>
									{searchQuery && (
										<button
											type="button"
											onClick={() => setSearchQuery("")}
											className="absolute right-2.5 text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										>
											<X className="w-4 h-4" />
										</button>
									)}
								</div>

								{/* Category Filter Tabs */}
								<div className="cd-category-scroll">
									<button
										type="button"
										onClick={() => setSelectedCategory("all")}
										className={`cd-category-chip ${selectedCategory === "all" ? "active" : ""}`}
									>
										Все ({CLINICAL_1CLICK_TEMPLATES_CATALOG.length})
									</button>
									{(Object.keys(CLINICAL_CATEGORY_LABELS) as ClinicalProtocolCategory[]).map((cat) => (
										<button
											key={cat}
											type="button"
											onClick={() => setSelectedCategory(cat)}
											className={`cd-category-chip ${selectedCategory === cat ? "active" : ""}`}
										>
											{CLINICAL_CATEGORY_LABELS[cat].split(" ")[0]}
										</button>
									))}
								</div>
							</div>

							{/* Template Cards List */}
							<div className="cd-template-list" data-testid="cd-templates-catalog-list">
								{filteredTemplates.map((tmpl) => {
									const isSelected = selectedTemplateId === tmpl.id;
									return (
										<button
											key={tmpl.id}
											type="button"
											onClick={() => handleSelectTemplate(tmpl.id)}
											className={`cd-template-item-card ${isSelected ? "active" : ""}`}
											data-testid={`catalog-item-${tmpl.id}`}
										>
											<div className="cd-card-top-row">
												<span className="cd-card-title flex items-center gap-1.5">
													<span>{tmpl.icon}</span>
													<span>{tmpl.title}</span>
												</span>
												<span className="cd-card-icd-tag">{tmpl.icd10Code}</span>
											</div>
											<div className="cd-card-category-tag">
												{CLINICAL_CATEGORY_LABELS[tmpl.category]} · {tmpl.order804nServices.length} услуг 804н
											</div>
										</button>
									);
								})}
								{filteredTemplates.length === 0 && (
									<div className="p-4 text-center text-xs text-[var(--muted,#64748b)]">
										Протоколы по запросу «{searchQuery}» не найдены.
									</div>
								)}
							</div>
						</aside>

						{/* ── Right Main Pane (Editor & Live SOAP Preview) ── */}
						<main className="cd-templates-editor-pane">
							{/* Top Controls: Tooth Selector & Quick Chips */}
							<div className="cd-editor-top-toolbar">
								<div className="cd-tooth-selector-row">
									<label htmlFor="cd-tooth-input" className="cd-tooth-input-label">
										Зуб FDI (11–48):
									</label>
									<input
										id="cd-tooth-input"
										type="number"
										min={11}
										max={85}
										value={toothNumberInput}
										onChange={(e) => handleToothChange(e.target.value)}
										className="cd-tooth-input"
										placeholder="16"
										data-testid="cd-tooth-input"
									/>
									<div className="cd-tooth-quick-chips">
										{COMMON_TEETH_PRESETS.slice(0, 6).map((num) => (
											<button
												key={num}
												type="button"
												onClick={() => handleToothChange(String(num))}
												className={`cd-tooth-chip ${toothNumberInput === String(num) ? "active" : ""}`}
											>
												{num}
											</button>
										))}
									</div>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-1">
										<Tag className="w-3.5 h-3.5" />
										{activeTemplate.icd10Code} {activeTemplate.shortTitle}
									</span>
								</div>
							</div>

							{/* Scrollable Editor Body */}
							<div className="cd-editor-scroll-body">
								{/* Statutory Info Banner */}
								<div className="cd-statutory-summary-card">
									<div className="flex items-center gap-2 font-medium">
										<CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--ok-fg,#15803d)]" />
										<span>
											Сформирован канонический протокол СтАР: <strong>{activeTemplate.title}</strong>
										</span>
									</div>
									<span className="font-mono text-xs opacity-90">
										{toothNumberInput ? getToothAnatomicalDescription(toothNumberInput) : "Общий"}
									</span>
								</div>

								{/* Unified SOAP Textarea */}
								<div className="cd-soap-textarea-wrap">
									<div className="cd-soap-textarea-label">
										<span>Единый протокол приема (Редактируемый текст SOAP):</span>
										{isCustomEdited && (
											<span className="text-amber-600 font-normal">
												(внесены ручные правки)
											</span>
										)}
									</div>
									<textarea
										value={editedSoapText}
										onChange={(e) => {
											setEditedSoapText(e.target.value);
											setIsCustomEdited(true);
										}}
										className="cd-soap-textarea"
										rows={14}
										data-testid="cd-soap-textarea"
										aria-label="Текст дневниковой записи SOAP"
									/>
								</div>

								{/* Nomenclature 804n Services Attached */}
								{synthesized.order804nServices.length > 0 && (
									<div className="cd-services-804n-box">
										<div className="cd-services-title">
											<Stethoscope className="w-4 h-4 text-[var(--teal,#0d9488)]" />
											<span>Прикрепленные услуги по Номенклатуре 804н ({synthesized.order804nServices.length}):</span>
										</div>
										<div className="cd-service-chips-row">
											{synthesized.order804nServices.map((svc) => (
												<div key={svc.code} className="cd-service-chip">
													<span className="cd-service-code">{svc.code}</span>
													<span>{svc.nameRu}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* ── Footer ── */}
							<footer className="cd-templates-footer">
								<div className="cd-footer-meta">
									<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#15803d)]" />
									<span>Готов к автоматической вставке в ЭМК и печать Формы 043/у</span>
								</div>

								<div className="cd-footer-actions">
									<button
										type="button"
										onClick={handleCopy}
										className="cd-btn cd-btn-secondary"
										data-testid="cd-copy-btn"
									>
										{isCopied ? (
											<>
												<Check className="w-4 h-4 text-emerald-600" />
												<span>Скопировано!</span>
											</>
										) : (
											<>
												<Copy className="w-4 h-4" />
												<span>Скопировать</span>
											</>
										)}
									</button>

									<button
										type="button"
										onClick={onClose}
										className="cd-btn cd-btn-secondary"
										data-testid="cd-cancel-btn"
									>
										Отмена
									</button>

									<button
										type="button"
										onClick={handleApply}
										className="cd-btn cd-btn-primary"
										data-testid="cd-apply-btn"
									>
										<Sparkles className="w-4 h-4" />
										<span>Вставить в дневник (1-Click)</span>
									</button>
								</div>
							</footer>
						</main>
					</div>
				</div>
			</div>,
			document.body,
		);
	},
);
