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
	synthesize1ClickSoapDiary,
	getToothAnatomicalDescription,
	formatStatutoryUnifiedSoapText,
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

/**
 * Мандат 8e (п. 3): Физиологическая норма по умолчанию в 1 клик.
 * Заполняет анамнез и клинический статус эталонной физиологической нормой.
 * Врач правит только локально выявленные патологии!
 */
export const PHYSIOLOGICAL_NORM_PRESET: Clinical1ClickTemplate = {
	id: "somatic_healthy_norm",
	title: "Соматически здоров / Физиологическая норма",
	shortTitle: "Физиологическая норма",
	category: "preventive",
	icd10Code: "Z01.2",
	icd10Title: "Стоматологическое обследование / Соматически сохранен",
	badge: "Мандат 8e",
	icon: "shield",
	isCore1Click: true,
	toothTargetRequired: false,
	defaultSubjectiveComplaints:
		"Жалоб на момент осмотра активно не предъявляет. Обратился с целью планового профилактического осмотра и санации полости рта.",
	defaultAnamnesisMorbi:
		"Соматический анамнез не отягощен. Соматически сохранен, аллергологический статус без особенностей. Перенесенные и сопутствующие соматические заболевания отрицает. Вирусные гепатиты B/C, ВИЧ-инфекцию, туберкулез отрицает. Ранее проходил регулярные профилактические осмотры.",
	defaultObjectiveStatus:
		"Общее состояние удовлетворительное, сознание ясное. Конфигурация лица не изменена, лицо симметрично, открывание рта свободное, безболезненное, в полном объеме. Регионарные лимфатические узлы (подчелюстные, шейные) не пальпируются, безболезненные, лимфоузлы не увеличены. Слизистая оболочка полости рта, десен, щек, твердого и мягкого неба бледно-розовая, умеренно увлажнена, чистая, без патологических элементов и высыпаний. Прикус физиологический (ортогнатический, норма прикуса). Зубные ряды интактные / санированные, патологической подвижности зубов нет. Десна интактна, кровоточивости при зондировании зубодесневой борозды нет (индекс гигиены OHI-S = 0). Врач правит только патологию!",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 2,
	defaultProcedureProtocol:
		"1. Полный клинический осмотр стоматологического пациента по форме 043/у (внешний осмотр, пальпация лимфатических узлов, осмотр преддверия и собственно полости рта).\n" +
		"2. Оценка окклюзии, состояния височно-нижнечелюстных суставов и физиологической нормы прикуса.\n" +
		"3. Онкоскрининг слизистой оболочки полости рта (визуальный осмотр, пальпация). Патологических изменений слизистой оболочки, пародонта и твердых тканей зубов не выявлено.\n" +
		"4. Проведена беседа по гигиене полости рта, индивидуальный подбор средств ухода.",
	defaultAnesthesia: "Без анестезии",
	defaultMaterials: [
		"Индивидуальный стерильный смотровой лоток",
		"Стоматологическое зеркало и зонд диагностический",
	],
	defaultRecommendations:
		"Соблюдение правил индивидуальной гигиены полости рта (чистка зубов 2 раза в день фторсодержащей пастой, использование флосса). Профилактический осмотр у врача-стоматолога через 6 месяцев.",
	order804nServices: [
		{
			code: "B01.065.001",
			nameRu: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			isMandatory: true,
			defaultQuantity: 1,
		},
	],
};

function renderTemplateIcon(iconName: string, className = "w-4 h-4 shrink-0") {
	switch (iconName) {
		case "tooth":
			return <FileText className={className} aria-hidden="true" />;
		case "zap":
			return <Zap className={className} aria-hidden="true" />;
		case "shield":
			return <ShieldCheck className={className} aria-hidden="true" />;
		case "sparkles":
			return <Sparkles className={className} aria-hidden="true" />;
		case "scissors":
		case "surgery":
			return <Stethoscope className={className} aria-hidden="true" />;
		default:
			return <FileText className={className} aria-hidden="true" />;
	}
}

export const ClinicalDiaryTemplatesModal: React.FC<ClinicalDiaryTemplatesModalProps> = React.memo(
	function ClinicalDiaryTemplatesModal({
		isOpen,
		onClose,
		initialToothNumber,
		doctorFullName = "",
		doctorSpecialty = "Врач-стоматолог-терапевт",
		patientFullName,
		onApplyDiary,
		onApplySoapText,
		onApplyServices,
	}) {
		const coreTemplates = useMemo(() => {
			return [PHYSIOLOGICAL_NORM_PRESET, ...getCore1ClickTemplates()];
		}, []);

		const allCatalogWithNorm = useMemo(() => {
			return [PHYSIOLOGICAL_NORM_PRESET, ...CLINICAL_1CLICK_TEMPLATES_CATALOG];
		}, []);

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

		// Список отфильтрованных шаблонов (включая физиологическую норму)
		const filteredTemplates = useMemo(() => {
			const query = searchQuery.trim().toLowerCase().replace(/ё/g, "е");
			let list = allCatalogWithNorm;

			if (selectedCategory !== "all") {
				list = list.filter((t) => t.category === selectedCategory);
			}

			if (!query) {
				return list;
			}

			const tokens = query.split(/\s+/).filter(Boolean);
			return list.filter((t) => {
				const targetStr = `${t.title} ${t.shortTitle} ${t.icd10Code} ${t.icd10Title} ${t.defaultProcedureProtocol} ${CLINICAL_CATEGORY_LABELS[t.category] || ""}`
					.toLowerCase()
					.replace(/ё/g, "е");
				return tokens.every((tok) => targetStr.includes(tok));
			});
		}, [allCatalogWithNorm, searchQuery, selectedCategory]);

		// Текущий выбранный объект шаблона
		const activeTemplate = useMemo(() => {
			if (selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id) {
				return PHYSIOLOGICAL_NORM_PRESET;
			}
			return (
				CLINICAL_1CLICK_TEMPLATES_CATALOG.find((t) => t.id === selectedTemplateId) ||
				PHYSIOLOGICAL_NORM_PRESET
			);
		}, [selectedTemplateId]);

		// Автогенерация синтезированного дневника
		const synthesized = useMemo(() => {
			if (selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id) {
				const toothDesc = toothNumberInput ? getToothAnatomicalDescription(toothNumberInput) : "зубных рядов";
				const toothNumStr = toothNumberInput ? `зуба ${toothNumberInput}` : "";
				const unifiedSoapText = formatStatutoryUnifiedSoapText({
					template: PHYSIOLOGICAL_NORM_PRESET,
					toothDesc,
					toothNumStr,
					subjective: PHYSIOLOGICAL_NORM_PRESET.defaultSubjectiveComplaints,
					anamnesis: PHYSIOLOGICAL_NORM_PRESET.defaultAnamnesisMorbi,
					statusLocalis: PHYSIOLOGICAL_NORM_PRESET.defaultObjectiveStatus,
					diagnosisText: `${PHYSIOLOGICAL_NORM_PRESET.icd10Code} ${PHYSIOLOGICAL_NORM_PRESET.icd10Title}`,
					procedureProtocol: PHYSIOLOGICAL_NORM_PRESET.defaultProcedureProtocol,
					anesthesia: PHYSIOLOGICAL_NORM_PRESET.defaultAnesthesia,
					materialsStr: PHYSIOLOGICAL_NORM_PRESET.defaultMaterials.join(", "),
					recommendations: PHYSIOLOGICAL_NORM_PRESET.defaultRecommendations,
					order804nServices: PHYSIOLOGICAL_NORM_PRESET.order804nServices,
					doctorFullName: doctorFullName ?? null,
					doctorSpecialty: doctorSpecialty ?? null,
				});

				return {
					templateId: PHYSIOLOGICAL_NORM_PRESET.id,
					title: PHYSIOLOGICAL_NORM_PRESET.title,
					icd10Code: PHYSIOLOGICAL_NORM_PRESET.icd10Code,
					icd10Title: PHYSIOLOGICAL_NORM_PRESET.icd10Title,
					toothNumber: toothNumberInput ? parseInt(toothNumberInput, 10) || null : null,
					toothNameRu: toothNumberInput ? toothDesc : null,
					subjectiveComplaints: PHYSIOLOGICAL_NORM_PRESET.defaultSubjectiveComplaints,
					anamnesisMorbi: PHYSIOLOGICAL_NORM_PRESET.defaultAnamnesisMorbi,
					objectiveStatusLocalis: PHYSIOLOGICAL_NORM_PRESET.defaultObjectiveStatus,
					assessmentDiagnosisText: `${PHYSIOLOGICAL_NORM_PRESET.icd10Code} ${PHYSIOLOGICAL_NORM_PRESET.icd10Title}`,
					assessmentIcd10Code: PHYSIOLOGICAL_NORM_PRESET.icd10Code,
					procedureProtocol: PHYSIOLOGICAL_NORM_PRESET.defaultProcedureProtocol,
					anesthesiaDetails: PHYSIOLOGICAL_NORM_PRESET.defaultAnesthesia,
					appliedMaterials: PHYSIOLOGICAL_NORM_PRESET.defaultMaterials.join(", "),
					homeCareRecommendations: PHYSIOLOGICAL_NORM_PRESET.defaultRecommendations,
					unifiedSoapText,
					order804nServices: PHYSIOLOGICAL_NORM_PRESET.order804nServices,
				};
			}

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
						<div className="cd-templates-title-group min-w-0 flex-1">
							<div className="cd-templates-icon-badge shrink-0">
								<Sparkles className="w-6 h-6" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h2 className="cd-templates-title truncate">
										1-Click Клинические протоколы и дневники приёма (043/у)
									</h2>
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#15803d)] border border-[var(--ok-fg,#15803d)]/30 shrink-0 whitespace-nowrap">
										<ShieldCheck className="w-3.5 h-3.5" />
										Минздрав РФ № 834н / 804н
									</span>
								</div>
								<p className="cd-templates-subtitle truncate">
									{patientFullName ? `Пациент: ${patientFullName} · ` : ""}
									{toothNumberInput ? `${getToothAnatomicalDescription(toothNumberInput)} · ` : ""}
									Мгновенная вставка канонического протокола без лишних кликов
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="cd-templates-close-btn shrink-0"
							aria-label="Закрыть модальное окно"
							data-testid="cd-templates-close-btn"
						>
							<X className="w-4 h-4" />
						</button>
					</header>

					{/* ── Mandate 8e Item 3: Dominant 1-Click Physiological Norm Preset ── */}
					<div className="cd-templates-dominant-norm-bar">
						<div className="flex items-center gap-2 min-w-0">
							<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#15803d)] shrink-0" />
							<span className="text-xs font-bold text-[var(--ok-fg,#15803d)] truncate">
								Мандат 8e (п. 3): Физиологическая норма в 1 клик · Врач правит только патологию
							</span>
						</div>
						<button
							type="button"
							onClick={() => handleSelectTemplate(PHYSIOLOGICAL_NORM_PRESET.id)}
							className={`cd-dominant-norm-btn ${selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id ? "active" : ""}`}
							data-testid="cd-dominant-norm-btn"
							aria-label="Заполнить физиологической нормой по умолчанию"
						>
							<Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
							<span>Соматически здоров / Физиологическая норма</span>
							<span className="cd-dominant-norm-badge">
								043/у 1-Click
							</span>
							{selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id && (
								<Check className="w-3.5 h-3.5 shrink-0" />
							)}
						</button>
					</div>

					{/* ── 1-Click Fast Presets Ribbon (TOP Presets with Norm) ── */}
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
										{renderTemplateIcon(item.icon, "w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0")}
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
											className="absolute right-2.5 text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center h-6 w-6 rounded"
											aria-label="Очистить поиск"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</div>

								{/* Category Filter Tabs */}
								<div className="cd-category-scroll">
									<button
										type="button"
										onClick={() => setSelectedCategory("all")}
										className={`cd-category-chip shrink-0 flex-shrink-0 whitespace-nowrap ${selectedCategory === "all" ? "active" : ""}`}
									>
										Все ({allCatalogWithNorm.length})
									</button>
									{(Object.keys(CLINICAL_CATEGORY_LABELS) as ClinicalProtocolCategory[]).map((cat) => (
										<button
											key={cat}
											type="button"
											onClick={() => setSelectedCategory(cat)}
											className={`cd-category-chip shrink-0 flex-shrink-0 whitespace-nowrap ${selectedCategory === cat ? "active" : ""}`}
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
												<span className="cd-card-title flex items-center gap-1.5 min-w-0 flex-1">
													{renderTemplateIcon(tmpl.icon, "w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0")}
													<span className="truncate">{tmpl.title}</span>
												</span>
												<span className="cd-card-icd-tag shrink-0">{tmpl.icd10Code}</span>
											</div>
											<div className="cd-card-category-tag truncate">
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

						{/* ── Right Main Pane (Editor & Live Protocol 043/u Preview) ── */}
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

								<div className="flex items-center gap-2 min-w-0">
									<span className="text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-1 min-w-0">
										<Tag className="w-3.5 h-3.5 shrink-0" />
										<span className="truncate">{activeTemplate.icd10Code} {activeTemplate.shortTitle}</span>
									</span>
								</div>
							</div>

							{/* Scrollable Editor Body */}
							<div className="cd-editor-scroll-body">
								{/* Statutory Info Banner */}
								<div className="cd-statutory-summary-card">
									<div className="flex items-center gap-2 font-medium min-w-0 flex-1">
										<CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--ok-fg,#15803d)]" />
										<span className="truncate">
											{selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id ? (
												<>
													Сформирован канонический протокол СтАР / Мандат 8e: <strong>{PHYSIOLOGICAL_NORM_PRESET.title}</strong>
												</>
											) : (
												<>
													Сформирован канонический протокол СтАР: <strong>{activeTemplate.title}</strong>
												</>
											)}
										</span>
									</div>
									<span className="font-mono text-xs opacity-90 shrink-0 ml-2">
										{selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id
											? "Физиологическая норма · Врач правит только патологию"
											: toothNumberInput
												? getToothAnatomicalDescription(toothNumberInput)
												: "Общий"}
									</span>
								</div>

								{/* Unified Protocol Textarea */}
								<div className="cd-soap-textarea-wrap">
									<div className="cd-soap-textarea-label">
										<span>
											{selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id
												? "Единый протокол приема (Редактируемый дневник 043/у) — Врач правит только патологию:"
												: "Единый протокол приема (Редактируемый дневник 043/у):"}
										</span>
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
										aria-label="Текст дневниковой записи 043/у"
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
									<span>Готов к автоматической вставке в ЭМК и печать Формы 043/у (Мандат 8e)</span>
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
										title="Мгновенная вставка регламентного протокола в карту 043/у (Мандат 8e)"
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
