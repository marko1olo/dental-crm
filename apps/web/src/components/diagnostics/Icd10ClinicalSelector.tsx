/**
 * Icd10ClinicalSelector.tsx — Клинический селектор диагнозов МКБ-10 (Классификатор МКБ-10 Стоматология)
 * с мгновенным поиском, авто-извлечением номеров зубов FDI и 1-click быстрыми пресетами.
 *
 * СООТВЕТСТВИЕ ИНВАРИАНТАМ КЛИНИЧЕСКОГО UX DENTE:
 * - Все интерактивные элементы (кнопки, чипы, плашки) имеют Touch Target >= 44x44px.
 * - Отсутствие микрошрифтов (минимальный интерактивный размер шрифта >= 13–14px).
 * - Полная поддержка 10 цветовых тем без зашитых hex-цветов.
 * - Доступность: ARIA-роли (listbox, option, search), управление с клавиатуры (стрелки, Enter, Escape).
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
	Search,
	X,
	Check,
	AlertCircle,
	Sparkles,
	Activity,
	Copy,
	CheckCheck,
	ChevronRight,
} from "lucide-react";
import {
	POPULAR_CLINICAL_PRESETS,
	DENTAL_ICD10_MAP,
	type DentalIcd10Item,
	type DentalSpecialty,
	type ClinicalSeverity,
} from "./icd10DentalCatalog";
import {
	Icd10MatchingEngine,
	type Icd10SearchResult,
	type Icd10SearchOptions,
} from "./icd10MatchingEngine";
import "./icd10Selector.css";

export interface Icd10ClinicalSelectorProps {
	readonly selectedCode?: string | null | undefined;
	readonly selectedTooth?: number | string | null | undefined;
	readonly onSelect: (item: DentalIcd10Item, toothNumber?: number | null) => void;
	readonly onClear?: (() => void) | undefined;
	readonly filterSpecialty?: DentalSpecialty | undefined;
	readonly initialRubric?: string | undefined;
	readonly className?: string | undefined;
	readonly autoFocus?: boolean | undefined;
}

const RUBRIC_FILTER_TABS = [
	{ id: "ALL", label: "Все диагнозы" },
	{ id: "K02", label: "Кариес (K02)" },
	{ id: "K04", label: "Пульпит / Периодонтит (K04)" },
	{ id: "K05", label: "Пародонт (K05)" },
	{ id: "K08", label: "Адентия / Корни (K08)" },
	{ id: "K07", label: "Прикус / ВНЧС (K07)" },
	{ id: "K03", label: "Некариозные (K03)" },
	{ id: "K01", label: "Ретенция / Дистопия (K01)" },
	{ id: "K10", label: "Челюсти (K10)" },
	{ id: "K12", label: "Стоматиты (K12)" },
] as const;

// Популярные зубы для быстрого выбора
const COMMON_FDI_TEETH = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
];

export const Icd10ClinicalSelector: React.FC<Icd10ClinicalSelectorProps> = ({
	selectedCode,
	selectedTooth,
	onSelect,
	onClear,
	filterSpecialty,
	initialRubric = "ALL",
	className = "",
	autoFocus = false,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeRubricTab, setActiveRubricTab] = useState<string>(initialRubric);
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const [copied, setCopied] = useState(false);

	// Текущий выбранный номер зуба (локальное состояние синхронизировано с пропсом)
	const [localTooth, setLocalTooth] = useState<number | null>(() => {
		if (selectedTooth != null) {
			const num = Number(selectedTooth);
			if (Icd10MatchingEngine.isValidFdiTooth(num)) return num;
		}
		return null;
	});

	const searchInputRef = useRef<HTMLInputElement>(null);
	const resultsListRef = useRef<HTMLDivElement>(null);

	// Анализ поискового запроса
	const parsedQuery = useMemo(() => {
		return Icd10MatchingEngine.parseQuery(searchQuery);
	}, [searchQuery]);

	// Если при поиске обнаружен номер зуба в запросе, обновляем localTooth
	useEffect(() => {
		if (parsedQuery.extractedToothNumber !== null) {
			setLocalTooth(parsedQuery.extractedToothNumber);
		}
	}, [parsedQuery.extractedToothNumber]);

	// Поиск результатов
	const searchResults: Icd10SearchResult[] = useMemo(() => {
		const rubricParam = activeRubricTab === "ALL" ? undefined : activeRubricTab;
		const searchOpts: Icd10SearchOptions = {
			specialty: filterSpecialty,
			rubric: rubricParam,
			selectedToothNumber: localTooth,
			limit: 30,
		};
		return Icd10MatchingEngine.search(searchQuery, searchOpts);
	}, [searchQuery, activeRubricTab, filterSpecialty, localTooth]);

	// Текущий выбранный элемент каталога
	const currentSelectedItem: DentalIcd10Item | null = useMemo(() => {
		if (!selectedCode) return null;
		const norm = Icd10MatchingEngine.normalizeCode(selectedCode);
		return DENTAL_ICD10_MAP.get(norm) ?? null;
	}, [selectedCode]);

	// Обработчик выбора диагноза
	const handleSelectDiagnosis = useCallback(
		(item: DentalIcd10Item) => {
			const toothToPass = item.requiresTooth ? localTooth : null;
			onSelect(item, toothToPass);
		},
		[localTooth, onSelect],
	);

	// Обработчик выбора зуба
	const handleSelectTooth = useCallback(
		(tooth: number) => {
			const nextTooth = localTooth === tooth ? null : tooth;
			setLocalTooth(nextTooth);
			if (currentSelectedItem) {
				onSelect(currentSelectedItem, nextTooth);
			}
		},
		[localTooth, currentSelectedItem, onSelect],
	);

	// Очистка поиска
	const handleClearSearch = useCallback(() => {
		setSearchQuery("");
		setFocusedIndex(-1);
		if (searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, []);

	// Очистка всего выбора
	const handleResetAll = useCallback(() => {
		setSearchQuery("");
		setLocalTooth(null);
		setFocusedIndex(-1);
		onClear?.();
	}, [onClear]);

	// Копирование кода МКБ-10 в буфер обмена
	const handleCopyCode = useCallback(async (code: string) => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback
		}
	}, []);

	// Навигация с клавиатуры
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (searchResults.length === 0) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setFocusedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
					const target = searchResults[focusedIndex];
					if (target) {
						handleSelectDiagnosis(target.item);
					}
				} else if (searchResults.length > 0) {
					const first = searchResults[0];
					if (first) {
						handleSelectDiagnosis(first.item);
					}
				}
			} else if (e.key === "Escape") {
				e.preventDefault();
				handleClearSearch();
			}
		},
		[searchResults, focusedIndex, handleSelectDiagnosis, handleClearSearch],
	);

	// Прокрутка активного элемента клавиатуры в видимую область
	useEffect(() => {
		if (focusedIndex >= 0 && resultsListRef.current) {
			const container = resultsListRef.current;
			const targetChild = container.children[focusedIndex] as HTMLElement | undefined;
			if (targetChild) {
				targetChild.scrollIntoView({ block: "nearest" });
			}
		}
	}, [focusedIndex]);

	// Рендер бейджа тяжести
	const renderSeverityBadge = (severity: ClinicalSeverity) => {
		const labels: Record<ClinicalSeverity, string> = {
			critical: "Острое / Неотложное",
			high: "Высокая тяжесть",
			medium: "Стандартная",
			low: "Начальная / Профилактика",
		};
		return (
			<span className={`icd10-severity-badge ${severity}`} title={`Категория тяжести: ${labels[severity]}`}>
				{labels[severity]}
			</span>
		);
	};

	return (
		<div className={`icd10-selector-container ${className}`} role="region" aria-label="Классификатор диагнозов МКБ-10">
			{/* 1. Поисковая строка с автоопределением зуба */}
			<div className="icd10-search-wrapper">
				<Search className="icd10-search-icon" size={20} aria-hidden="true" />

				{parsedQuery.extractedToothNumber !== null && (
					<div className="icd10-detected-tooth-badge" title="Автоматически распознан номер зуба">
						<Sparkles size={14} />
						Зуб {parsedQuery.extractedToothNumber}
					</div>
				)}

				<input
					ref={searchInputRef}
					type="text"
					className="icd10-search-input"
					placeholder="Поиск по МКБ-10 (например: «пульпит 26», «кариес дентина», «K04.0», «адентия»)..."
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value);
						setFocusedIndex(-1);
					}}
					onKeyDown={handleKeyDown}
					autoFocus={autoFocus}
					role="searchbox"
					aria-autocomplete="list"
					aria-controls="icd10-search-results-list"
				/>

				{searchQuery && (
					<button
						type="button"
						className="icd10-search-clear-btn"
						onClick={handleClearSearch}
						title="Очистить поиск"
						aria-label="Очистить поиск"
					>
						<X size={18} />
					</button>
				)}
			</div>

			{/* 2. Вкладки рубрик МКБ-10 */}
			<div className="icd10-rubric-tabs" role="tablist" aria-label="Рубрики МКБ-10">
				{RUBRIC_FILTER_TABS.map((tab) => {
					const isActive = activeRubricTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`icd10-rubric-tab ${isActive ? "is-active" : ""}`}
							onClick={() => {
								setActiveRubricTab(tab.id);
								setFocusedIndex(-1);
							}}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* 3. 1-Click быстрые популярные пресеты диагнозов (если нет поискового запроса) */}
			{!searchQuery && activeRubricTab === "ALL" && (
				<div className="icd10-quick-presets-section">
					<div className="icd10-section-label">
						<Activity size={16} />
						Частые клинические диагнозы (1 клик):
					</div>
					<div className="icd10-chips-grid">
						{POPULAR_CLINICAL_PRESETS.slice(0, 8).map((preset) => {
							const isSelected = selectedCode === preset.code;
							return (
								<button
									key={preset.code}
									type="button"
									className={`icd10-preset-chip ${isSelected ? "is-selected" : ""}`}
									onClick={() => handleSelectDiagnosis(preset)}
								>
									<span className="icd10-chip-code">{preset.code}</span>
									<span className="icd10-chip-title">{preset.shortTitleRu}</span>
									{isSelected && <Check size={16} color="var(--teal)" />}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* 4. Список найденных диагнозов */}
			<div
				id="icd10-search-results-list"
				ref={resultsListRef}
				className="icd10-results-list"
				role="listbox"
				aria-label="Результаты поиска диагнозов"
			>
				{searchResults.length > 0 ? (
					searchResults.map((res, idx) => {
						const item = res.item;
						const isSelected = selectedCode === item.code;
						const isFocused = idx === focusedIndex;

						return (
							<div
								key={item.code}
								role="option"
								aria-selected={isSelected}
								className={`icd10-result-item ${isSelected ? "is-selected" : ""} ${isFocused ? "is-focused" : ""}`}
								onClick={() => handleSelectDiagnosis(item)}
								onMouseEnter={() => setFocusedIndex(idx)}
							>
								<div className="icd10-result-main">
									<div className="icd10-result-header">
										<span className="icd10-result-code">{item.code}</span>
										<span className="icd10-result-title">{item.titleRu}</span>
										{renderSeverityBadge(item.severity)}
									</div>
									<div className="icd10-result-desc">{item.description}</div>
								</div>
								{isSelected ? (
									<Check size={20} color="var(--teal)" />
								) : (
									<ChevronRight size={18} color="var(--muted)" />
								)}
							</div>
						);
					})
				) : (
					<div className="icd10-empty-state">
						<AlertCircle className="icd10-empty-icon" size={32} />
						<div className="icd10-empty-text">
							По запросу «{searchQuery}» стоматологических диагнозов не найдено.
						</div>
					</div>
				)}
			</div>

			{/* 5. Карточка активного выбранного диагноза с привязкой к зубу */}
			{currentSelectedItem && (
				<div className="icd10-selected-preview-card">
					<div className="icd10-preview-header">
						<div className="icd10-preview-code-block">
							<span className="icd10-preview-code">{currentSelectedItem.code}</span>
							<div>
								<div className="icd10-preview-title">{currentSelectedItem.titleRu}</div>
								{renderSeverityBadge(currentSelectedItem.severity)}
							</div>
						</div>
						<div className="icd10-preview-actions">
							<button
								type="button"
								className="icd10-preview-btn"
								onClick={() => handleCopyCode(currentSelectedItem.code)}
								title="Скопировать код МКБ-10"
							>
								{copied ? <CheckCheck size={16} color="var(--ok-fg)" /> : <Copy size={16} />}
								{copied ? "Скопировано" : "Код"}
							</button>
							{onClear && (
								<button
									type="button"
									className="icd10-preview-btn"
									onClick={handleResetAll}
									title="Сбросить выбор"
								>
									<X size={16} />
									Сброс
								</button>
							)}
						</div>
					</div>

					{/* Привязка к номеру зуба FDI (если диагноз зубоспецифичен) */}
					<div className="icd10-tooth-binding-section">
						<div className="icd10-tooth-binding-label">
							Привязка к зубу по формуле FDI (ISO 3950):
							{currentSelectedItem.requiresTooth && (
								<span className="icd10-tooth-required-star" title="Обязательно для данного диагноза">
									* (обязательно)
								</span>
							)}
						</div>

						<div className="icd10-teeth-quick-bar">
							{COMMON_FDI_TEETH.map((tooth) => {
								const isToothSelected = localTooth === tooth;
								return (
									<button
										key={tooth}
										type="button"
										className={`icd10-tooth-quick-btn ${isToothSelected ? "is-selected" : ""}`}
										onClick={() => handleSelectTooth(tooth)}
										title={`Выбрать зуб ${tooth}`}
									>
										{tooth}
									</button>
								);
							})}
						</div>
					</div>

					{/* Клинические рекомендации */}
					{currentSelectedItem.recommendations.length > 0 && (
						<div className="icd10-recommendations-box">
							<div className="icd10-recommendations-title">Клинические рекомендации СтАР:</div>
							<ul className="icd10-recommendations-list">
								{currentSelectedItem.recommendations.map((rec, i) => (
									<li key={i}>{rec}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
