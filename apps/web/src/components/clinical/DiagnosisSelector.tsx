/**
 * DiagnosisSelector.tsx — Селектор клинического диагноза (МКБ-10) с интеграцией услуг по Номенклатуре 804н.
 *
 * СООТВЕТСТВИЕ КОНСТИТУЦИИ И МАНДАТАМ:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Friction-Killer Law (Мандат 8k):
 *   Интеграция 1-клик экспресс-пресетов «Диагноз МКБ-10 + Услуга 804н» прямо над строкой поиска.
 * - Автономия врача (Мандат 8e):
 *   0 заблокированных (disabled) кнопок. Врач свободно переключает и выбирает диагнозы.
 * - Суверенитет стоматологического контекста (Мандат 8i):
 *   Исключительно амбулаторная стоматологическая номенклатура (K02-K08), никакого стационарного блоата.
 * - Святость официальных документов (Мандат 8d п. 7):
 *   Ноль мультяшных эмодзи (строго векторные иконки Lucide).
 */

import {
	Check,
	CheckCircle2,
	FileText,
	Layers,
	Search,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import type React from "react";
import { useId, useMemo, useState } from "react";
import {
	ClinicalProtocolPresets,
	FAST_CLINICAL_BUNDLES,
	type FastClinicalBundle,
	findBundleByIcd10,
} from "./ClinicalProtocolPresets";

export interface DentalDiagnosisItem {
	readonly icd10Code: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly category: "caries" | "pulp" | "perio" | "gingiva" | "surgery" | "other";
	readonly recommended804nCode?: string | undefined;
	readonly recommended804nName?: string | undefined;
}

export const DENTAL_ICD10_CATALOG: readonly DentalDiagnosisItem[] = [
	{
		icd10Code: "K02.0",
		titleRu: "Кариес эмали (стадия белого пятна)",
		descriptionRu: "Начальный кариес, деминерализация эмали без образования дефекта",
		category: "caries",
		recommended804nCode: "A11.07.012",
		recommended804nName: "Глубокое фторирование эмали зуба",
	},
	{
		icd10Code: "K02.1",
		titleRu: "Кариес дентина (средний / глубокий)",
		descriptionRu: "Кариозная полость в пределах средних/глубоких слоев околопульпарного дентина",
		category: "caries",
		recommended804nCode: "A16.07.002.010",
		recommended804nName:
			"Восстановление зуба пломбой с использованием материалов из фотополимеров (пломбирование зуба фотокомпозитом)",
	},
	{
		icd10Code: "K02.2",
		titleRu: "Кариес цемента корня зуба",
		descriptionRu: "Пришеечный кариозный дефект корня зуба",
		category: "caries",
		recommended804nCode: "A16.07.002.001",
		recommended804nName: "Восстановление зуба пломбой V класс по Блэку",
	},
	{
		icd10Code: "K03.0",
		titleRu: "Повышенное стирание твердых тканей зубов",
		descriptionRu: "Патологическая стираемость эмали и дентина",
		category: "other",
		recommended804nCode: "A16.07.025",
		recommended804nName: "Избирательное пришлифовывание и полирование твердых тканей зуба",
	},
	{
		icd10Code: "K03.1",
		titleRu: "Сошлифовывание зубов (клиновидный дефект)",
		descriptionRu: "Некариозное пришеечное поражение твердых тканей вестибулярной поверхности",
		category: "other",
		recommended804nCode: "A16.07.002.001",
		recommended804nName: "Восстановление зуба пломбой V класс по Блэку",
	},
	{
		icd10Code: "K04.0",
		titleRu: "Острый пульпит (пульпит зуба)",
		descriptionRu: "Острое воспаление пульпы (очаговый / диффузный пульпит)",
		category: "pulp",
		recommended804nCode: "A16.07.010",
		recommended804nName: "Эндодонтическое лечение (пульпотомия, экстирпация пульпы)",
	},
	{
		icd10Code: "K04.1",
		titleRu: "Некроз пульпы зуба",
		descriptionRu: "Гангрена / девитализация пульпы с распадом тканей",
		category: "pulp",
		recommended804nCode: "A16.07.030",
		recommended804nName: "Инструментальная и медикаментозная обработка корневого канала",
	},
	{
		icd10Code: "K04.4",
		titleRu: "Острый апикальный периодонтит",
		descriptionRu: "Воспаление периодонта в области верхушки корня пульпарного происхождения",
		category: "perio",
		recommended804nCode: "A16.07.030",
		recommended804nName: "Инструментальная и медикаментозная обработка корневого канала",
	},
	{
		icd10Code: "K04.5",
		titleRu: "Хронический апикальный периодонтит",
		descriptionRu: "Хронический деструктивный верхушечный периодонтит (гранулема)",
		category: "perio",
		recommended804nCode: "A16.07.030",
		recommended804nName: "Инструментальная и медикаментозная обработка корневого канала",
	},
	{
		icd10Code: "K05.0",
		titleRu: "Острый гингивит",
		descriptionRu: "Катаральное воспаление десны без нарушения зубодесневого прикрепления",
		category: "gingiva",
		recommended804nCode: "A16.07.051",
		recommended804nName: "Профессиональная гигиена полости рта и зубов",
	},
	{
		icd10Code: "K05.1",
		titleRu: "Хронический гингивит",
		descriptionRu: "Хроническое катаральное / гипертрофическое воспаление десны",
		category: "gingiva",
		recommended804nCode: "A16.07.051",
		recommended804nName: "Профессиональная гигиена полости рта и зубов",
	},
	{
		icd10Code: "K05.3",
		titleRu: "Хронический пародонтит",
		descriptionRu: "Воспалительно-деструктивное поражение пародонта с резорбцией кости",
		category: "perio",
		recommended804nCode: "A16.07.050",
		recommended804nName: "Профессиональная гигиена и закрытый кюретаж пародонтальных карманов",
	},
	{
		icd10Code: "K08.1",
		titleRu: "Потеря зубов вследствие удаления / травмы",
		descriptionRu: "Вторичная адентия, дефект зубного ряда",
		category: "other",
		recommended804nCode: "A16.07.006",
		recommended804nName: "Протезирование зубного ряда",
	},
	{
		icd10Code: "K08.8",
		titleRu: "Другие уточненные изменения зубов (подготовка к удалению)",
		descriptionRu: "Полное разрушение коронки зуба, показания к экстракции",
		category: "surgery",
		recommended804nCode: "A16.07.001",
		recommended804nName: "Удаление постоянного зуба (простое)",
	},
	{
		icd10Code: "Z01.2",
		titleRu: "Стоматологическое обследование (Здоров / Полость рта санирована)",
		descriptionRu: "Профилактический осмотр, отсутствие кариозных полостей, физиологическая норма",
		category: "other",
		recommended804nCode: "A01.07.001",
		recommended804nName: "Прием (осмотр, консультация) врача-стоматолога первичный",
	},
];

export interface DiagnosisSelectorProps {
	readonly selectedIcd10?: string | null | undefined;
	readonly selected804nCode?: string | null | undefined;
	readonly onSelectDiagnosis?: ((icd10: string, icd10Title: string) => void) | undefined;
	readonly onSelectService804n?: ((code: string, name: string) => void) | undefined;
	readonly onSelectBundle?: ((bundle: FastClinicalBundle) => void) | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly className?: string | undefined;
}

export const DiagnosisSelector: React.FC<DiagnosisSelectorProps> = ({
	selectedIcd10,
	selected804nCode,
	onSelectDiagnosis,
	onSelectService804n,
	onSelectBundle,
	toothNumber,
	className = "",
}) => {
	const searchInputId = useId();
	const [searchQuery, setSearchQuery] = useState("");

	const filteredDiagnoses = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return DENTAL_ICD10_CATALOG;
		return DENTAL_ICD10_CATALOG.filter(
			(d) =>
				d.icd10Code.toLowerCase().includes(q) ||
				d.titleRu.toLowerCase().includes(q) ||
				d.descriptionRu.toLowerCase().includes(q) ||
				(d.recommended804nCode && d.recommended804nCode.toLowerCase().includes(q)),
		);
	}, [searchQuery]);

	const currentDiagnosis = useMemo(() => {
		if (!selectedIcd10) return null;
		return DENTAL_ICD10_CATALOG.find((d) => d.icd10Code === selectedIcd10) ?? null;
	}, [selectedIcd10]);

	const handleBundleSelect = (bundle: FastClinicalBundle) => {
		if (onSelectBundle) {
			onSelectBundle(bundle);
		}
		if (onSelectDiagnosis) {
			onSelectDiagnosis(bundle.icd10Code, bundle.title);
		}
		if (onSelectService804n) {
			onSelectService804n(bundle.order804nCode, bundle.order804nName);
		}
	};

	const handleDiagnosisItemClick = (item: DentalDiagnosisItem) => {
		if (onSelectDiagnosis) {
			onSelectDiagnosis(item.icd10Code, item.titleRu);
		}
		if (item.recommended804nCode && item.recommended804nName && onSelectService804n) {
			onSelectService804n(item.recommended804nCode, item.recommended804nName);
		}
		const matchingBundle = findBundleByIcd10(item.icd10Code);
		if (matchingBundle && onSelectBundle) {
			onSelectBundle(matchingBundle);
		}
	};

	return (
		<div
			className={`diagnosis-selector flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm ${className}`}
			data-testid="diagnosis-selector"
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-3 flex-wrap">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--teal-surface,#e6fffa)] text-[var(--teal,#0d9488)] border border-[var(--line,#e2e8f0)] dark:border-slate-700">
						<Stethoscope className="w-4 h-4" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
							Клинический диагноз (МКБ-10) и услуги (Приказ 804н)
						</h4>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Выбор в 1 клик через экспресс-пресеты или поиск по номенклатуре
						</p>
					</div>
				</div>

				{toothNumber ? (
					<span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
						{`Зуб #${toothNumber}`}
					</span>
				) : null}
			</div>

			{/* Section 1: 1-Click Fast Express Presets (Friction-Killer Law) */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-700/60">
				<ClinicalProtocolPresets
					onSelectBundle={handleBundleSelect}
					selectedIcd10={selectedIcd10}
					toothNumber={toothNumber}
					isCompact={true}
				/>
			</div>

			{/* Section 2: Active Selected State Banner */}
			{selectedIcd10 && (
				<div
					className="flex items-center justify-between gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100 flex-wrap"
					data-testid="selected-diagnosis-banner"
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
						<div className="min-w-0">
							<div className="text-xs font-bold flex items-center gap-2 flex-wrap">
								<span className="px-2 py-0.5 rounded bg-teal-600 text-white font-mono text-[11px]">
									{selectedIcd10}
								</span>
								<span className="truncate">
									{currentDiagnosis?.titleRu || "Диагноз выбран"}
								</span>
							</div>
							{selected804nCode && (
								<div className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5 flex items-center gap-1.5 font-mono">
									<span>Услуга 804н:</span>
									<span className="font-bold">{selected804nCode}</span>
								</div>
							)}
						</div>
					</div>

					<button
						type="button"
						onClick={() => {
							if (onSelectDiagnosis) onSelectDiagnosis("", "");
							if (onSelectService804n) onSelectService804n("", "");
						}}
						className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
						data-testid="clear-diagnosis-btn"
						title="Сбросить выбранный диагноз"
					>
						<X className="w-3.5 h-3.5" />
						<span>Сбросить</span>
					</button>
				</div>
			)}

			{/* Section 3: Search Bar */}
			<div className="relative w-full">
				<label htmlFor={searchInputId} className="sr-only">
					Поиск диагноза МКБ-10
				</label>
				<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#64748b)]" />
				<input
					id={searchInputId}
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по коду МКБ-10 (K02, K04) или названию (кариес, пульпит)..."
					className="w-full pl-10 pr-9 py-2 min-h-[40px] text-xs sm:text-sm rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white placeholder:text-[var(--muted,#64748b)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-all"
					data-testid="diagnosis-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						title="Очистить поиск"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Section 4: Diagnoses List */}
			<div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
				{filteredDiagnoses.length === 0 ? (
					<div className="p-4 text-center text-xs text-[var(--muted,#64748b)]">
						По запросу «{searchQuery}» стоматологических диагнозов не найдено.
					</div>
				) : (
					filteredDiagnoses.map((item) => {
						const isSelected = selectedIcd10 === item.icd10Code;
						return (
							<button
								key={item.icd10Code}
								type="button"
								data-testid={`diagnosis-item-${item.icd10Code}`}
								onClick={() => handleDiagnosisItemClick(item)}
								className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-950 dark:text-teal-100 font-medium"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800/60"
								}`}
							>
								<div className="flex flex-col min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
											{item.icd10Code}
										</span>
										<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-white truncate">
											{item.titleRu}
										</span>
									</div>
									<span className="text-[11px] text-[var(--muted,#64748b)] line-clamp-1 mt-0.5">
										{item.descriptionRu}
									</span>
									{item.recommended804nCode && (
										<span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 mt-0.5">
											Приказ 804н: {item.recommended804nCode} — {item.recommended804nName}
										</span>
									)}
								</div>

								{isSelected && (
									<div className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white shrink-0 mt-1">
										<Check className="w-3 h-3" />
									</div>
								)}
							</button>
						);
					})
				)}
			</div>
		</div>
	);
};
